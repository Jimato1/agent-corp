"""Tier-0 sandbox surface (D-7; gateway-cmdb-library-sandbox.md §G). Library blocks on this.

``run_sandbox_test(ticket_id, profile_key, input_ref, op_id)`` — flat, 4 args, no host
parameter. The four-holder chain **degenerates honestly** (§G3):

* **Board** — ticket exists + the caller holds the live ``in_progress`` claim; validated via
  Board facts (fencing + claim). NO ``consume_approval``, NO execution hold.
* **CMDB** — a signed verdict for ``{host_id=<sandbox pool id>, action_class=sandbox_exec}``
  must return ``permit`` with ``host_class == disposable`` AND ``verdict_basis ==
  sandbox_carve_out`` (the operator's kill knob: set the class to deny → all sandbox exec stops).
* **Vault** — **structurally absent.** There is NO Vault client on this branch; sandboxes hold
  nothing worth stealing. (This module imports no vault client — a grep-able non-leak barrier.)
* **Gateway** — per-sandbox-slot concurrency mutex + the **global kill switch** (same
  dispatcher, same ``cancel_callback``, same refusal at ≥ G1).

**Non-leak barriers (§G5):** (1) separate tool + separate scope (``gateway:sandbox`` never
grants ``execute_approved_plan``); (2) **no host parameter** — a real ``host_id`` is
unrepresentable; (3) no Vault client, no SSH inventory here; (4) ``sandbox_exec`` is a 7th
class valid ONLY on this branch; (5) a poisoned CMDB row marking a real host ``disposable``
still cannot reach it — the sandbox path executes only into containers the Gateway itself
just spawned from the pinned harness image.
"""
from __future__ import annotations

from ..checks import HardReject
from ..checks.cmdb import validate_verdict
from ..clock import now_iso
from ..engine.runner import DispatchSpec
from ..ids import harness_version, mint_run_id
import json

# profile_key enum (the Gateway sandbox-profile catalog; matches sandbox_profile=1 entries).
SANDBOX_PROFILES = {"sbx_pytest", "sbx_lint"}

# input_ref is host/externally-originated (adversarial) — it is DATA, never a command, but we
# still bound it to a doc/note-ref shape (defense-in-depth; §17-4). Anything else is refused.
import re as _re
_INPUT_REF_RE = _re.compile(r"^[A-Za-z0-9:/@._\-#]{1,256}$")


class SandboxRunner:
    def __init__(self, state) -> None:
        self.st = state

    def _harness_version(self) -> str:
        s = self.st.settings
        profile_catalog = sorted(SANDBOX_PROFILES)
        return harness_version(s.sandbox_harness_image, profile_catalog)

    def run_sandbox_test(self, *, principal, ticket_id: str, profile_key: str, input_ref: str,
                         op_id: str | None) -> dict:
        # Enum-bound profile (schema ceiling — no free-form).
        if profile_key not in SANDBOX_PROFILES:
            return {"isError": True, "reason": "UNKNOWN_PROFILE", "message": f"no sandbox profile {profile_key!r}"}
        # Bound the untrusted input_ref to a doc/note-ref shape (§17-4).
        if not isinstance(input_ref, str) or not _INPUT_REF_RE.match(input_ref):
            return {"isError": True, "reason": "BAD_INPUT_REF", "message": "input_ref not a valid doc/note reference"}

        run_id = mint_run_id()
        self.st.runs.create(run_id=run_id, host_id=self.st.settings.sandbox_pool_host_id,
                            caller_sub=principal.sub, op_id=op_id, surface="sandbox", ticket_id=ticket_id)
        self.st.chain.append(record_type="dispatch_request", run_id=run_id, actor_sub=principal.sub,
                             action="run_sandbox_test", target="sandbox-pool",
                             payload={"ticket_id": ticket_id, "profile_key": profile_key})
        try:
            # Kill gate (same chokepoint) — refuses at ≥ G1.
            self.st.kill.gate()

            # Board — ticket exists + live in_progress claim + fencing (ordinary work lane).
            facts = self.st.clients.board.facts_ticket(ticket_id)
            if not facts or not facts.get("exists"):
                raise HardReject("NO_SUCH_TICKET", f"ticket {ticket_id} does not exist")
            if facts.get("status") != "in_progress":
                raise HardReject("NO_LIVE_CLAIM", f"ticket {ticket_id} not in_progress (no live claim)")
            if facts.get("claimed_by") != principal.sub:
                raise HardReject("NOT_CLAIMANT", "caller does not hold the live claim on this ticket")

            # CMDB — signed verdict on the disposable pool; the kill knob + surface segregation.
            jws = self.st.clients.cmdb.decision(self.st.settings.sandbox_pool_host_id, "sandbox_exec", ticket_id)
            validate_verdict(jws, self.st.verdict_keyring, expected_aud="gateway",
                             require_host_class="disposable", require_verdict_basis="sandbox_carve_out",
                             seen_decision_id=self._seen, est_duration_s=120, has_consumed_approval=False)

            # Gateway — per-slot concurrency mutex (NOT a host lock; a slot).
            slot = self._acquire_slot()
            if slot is None:
                raise HardReject("SANDBOX_BUSY", "no free sandbox slot")
            try:
                hv = self._harness_version()
                # Target — NEVER caller-named. Spawn a fresh container from the pinned harness image.
                spec = DispatchSpec(run_id=run_id, playbook=f"{profile_key}.yml",
                                    extravars={"input_ref": input_ref},
                                    wall_clock_cap_s=240, process_isolation=True)
                self.st.runs.transition(run_id, "executing", started_at=now_iso())
                transcript_lines: list[str] = []
                result = self.st.dispatcher.run_playbook(
                    spec,
                    event_handler=lambda ev: transcript_lines.append(f"{ev.get('task')}: {ev.get('stdout','')}"),
                    cancel_callback=self.st.kill.is_frozen,
                )
                transcript = "\n".join(transcript_lines)
                import hashlib
                transcript_ref = "blob:sha256:" + hashlib.sha256(transcript.encode()).hexdigest()
                env_fp = {"image": self.st.settings.sandbox_harness_image, "profile": profile_key}
                self._record_evidence(run_id, ticket_id, profile_key, hv, input_ref, transcript_ref,
                                      result.rc, env_fp)
                self.st.chain.append(record_type="sandbox", run_id=run_id, action="evidence",
                                     target="sandbox-pool", outcome=str(result.rc),
                                     payload={"transcript_ref": transcript_ref, "harness_version": hv,
                                              "transcript": transcript})
                self.st.runs.transition(run_id, "reporting")
                self.st.runs.transition(run_id, "done_reported", terminal="needs_review", finished_at=now_iso())
                return {"run_id": run_id, "isError": False, "harness_version": hv, "exit_status": result.rc,
                        "transcript_ref": transcript_ref}
            finally:
                self._release_slot(slot)
        except HardReject as hr:
            self.st.chain.append(record_type="reject", run_id=run_id, actor_sub=principal.sub,
                                 action="hard_reject", target="sandbox-pool", outcome=hr.reason,
                                 payload={"reason": hr.reason})
            self.st.runs.reject(run_id, hr.reason)
            return {"run_id": run_id, "isError": True, "reason": hr.reason, "message": hr.message}

    def _seen(self, decision_id: str) -> bool:
        with self.st.db.tx() as c:
            c.execute("SELECT decision_id FROM decision_log WHERE decision_id = ?", (decision_id,))
            if c.fetchone() is not None:
                return True
            c.execute("INSERT INTO decision_log(decision_id, seen_at) VALUES (?, ?)", (decision_id, now_iso()))
        return False

    def _acquire_slot(self):
        c = self.st.db.reader()
        try:
            c.execute("SELECT COUNT(*) AS n FROM runs WHERE surface = 'sandbox' AND state = 'executing'")
            n = int(c.fetchone()["n"])
        finally:
            c.close()
        return "slot" if n < self.st.settings.sandbox_max_concurrency else None

    def _release_slot(self, slot) -> None:
        return None  # slot occupancy is derived from run state (executing count)

    def _record_evidence(self, run_id, ticket_id, profile_key, hv, input_ref, transcript_ref, exit_status, env_fp):
        with self.st.db.tx() as c:
            c.execute(
                "INSERT INTO sandbox_runs(run_id, ticket_id, profile_key, harness_version, input_ref, "
                "transcript_ref, exit_status, env_fingerprint, started_at, finished_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?)",
                (run_id, ticket_id, profile_key, hv, input_ref, transcript_ref, exit_status,
                 json.dumps(env_fp, separators=(",", ":"), sort_keys=True), now_iso(), now_iso()),
            )

    def get_evidence(self, run_id: str) -> dict | None:
        c = self.st.db.reader()
        try:
            c.execute("SELECT * FROM sandbox_runs WHERE run_id = ?", (run_id,))
            row = c.fetchone()
            if row and isinstance(row.get("env_fingerprint"), str):
                row["env_fingerprint"] = json.loads(row["env_fingerprint"])
            return row
        finally:
            c.close()

    def list_evidence(self, limit: int = 100) -> list[dict]:
        c = self.st.db.reader()
        try:
            c.execute("SELECT * FROM sandbox_runs ORDER BY finished_at DESC LIMIT ?", (limit,))
            return c.fetchall()
        finally:
            c.close()
