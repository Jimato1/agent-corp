"""THE ORCHESTRATOR — the four-check SoD chain in binding order (PLAN §3).

Runtime order (cheap/reversible before expensive/irreversible so a failure NEVER burns a
credential or half-executes; contract vault-gateway-redemption §5 puts the mutex before
redemption; D-S2 consumes at Board before Vault redeems):

  0. Check 0/D — caller holder scope + §8 validation        (handler; cheapest; no side effect)
  1. Kill gate — refuse dispatch at ≥ G1                     (chokepoint; before Check 1)
  2. Check A/1a — Board facts: approved ticket + host match  (no side effect)
     Check 1b — Notes plan bytes re-hash + parse            (no side effect)
     Check 2a — action_class from catalog + non-auto floor  (no side effect)
     Check B-pre — advisory CMDB verdict; a clear deny rejects WITHOUT consuming (no burn)
  3. Check A/1c — consume_approval (single-use CAS)          (FIRST irreversible; D-S2)
     Check 1d — binding: plan_hash/allowlist/catalog/params (post-consume)
  4. Check D/4b — fencing stale-reject                       (split-brain detector)
     Check D/4c — local advisory lock (per-host mutex)       (BEFORE redemption, contract §5)
  5. Check B — authoritative signed CMDB verdict (TOCTOU)    (post-hold, pre-redemption)
  6. Check C/3 — Vault redeem over mTLS; D-4 handled         (the credential; LAST)
  7. dispatch (ansible-runner, playbook-only) → health → spec-conformant terminal

ANY check raising ``HardReject`` → the run is rejected/failed, a first-class hash-chained
rejection record is written, the mutex/lease are released, an escalation is filed, and the
agent gets a structured business error. **No branch reaches dispatch early; the agent cannot
talk its way past a check** (§15-1: skip-a-check is impossible by construction).
"""
from __future__ import annotations

import secrets

from ..checks import HALTED, HardReject
from ..checks.board import check_ticket_facts
from ..checks.catalog import derive_action_class, enforce_floor, validate_extravars
from ..checks.cmdb import validate_verdict
from ..checks.mutex import HostMutex, check_fencing
from ..checks.plan import parse_invocations, recompute_plan_hash
from ..checks.vault import interpret_redeem
from ..authn.livecheck import drift_ok, live_check_destructive
from ..clock import now_iso
from ..engine.health import HealthOutcome, decide_terminal
from ..engine.runner import DispatchSpec
from ..ids import mint_run_id
import json


class Orchestrator:
    def __init__(self, state) -> None:
        self.st = state  # app.state: db, chain, runs, catalog, kill, clients, dispatcher, settings, verdict_keyring, health

    # ---- replay detection for CMDB decision_id (verdict §4 step 5) ----------
    def _seen_decision_id(self, decision_id: str) -> bool:
        with self.st.db.tx() as c:
            c.execute("SELECT decision_id FROM decision_log WHERE decision_id = ?", (decision_id,))
            if c.fetchone() is not None:
                return True
            c.execute("INSERT INTO decision_log(decision_id, seen_at) VALUES (?, ?)", (decision_id, now_iso()))
        return False

    def _dedup_hit(self, sub: str, op_id: str | None, scope: str):
        if not op_id:
            return None
        c = self.st.db.reader()
        try:
            c.execute("SELECT result FROM op_dedup WHERE sub = ? AND op_id = ? AND scope = ?", (sub, op_id, scope))
            row = c.fetchone()
            return json.loads(row["result"]) if row else None
        finally:
            c.close()

    def _dedup_store(self, sub: str, op_id: str | None, scope: str, result: dict) -> None:
        if not op_id:
            return
        with self.st.db.tx() as c:
            c.execute("INSERT OR IGNORE INTO op_dedup(sub, op_id, scope, result, created_at) VALUES (?,?,?,?,?)"
                      if self.st.db.backend == "sqlite" else
                      "INSERT INTO op_dedup(sub, op_id, scope, result, created_at) VALUES (?,?,?,?,?) "
                      "ON CONFLICT DO NOTHING",
                      (sub, op_id, scope, json.dumps(result, separators=(",", ":")), now_iso()))

    def _audit(self, **kw) -> None:
        self.st.chain.append(**kw)

    # ---- Check C helper: run the live drift re-check at the irreversible instant ----
    def _drift_recheck(self, principal, live) -> None:
        s = self.st.settings
        if not drift_ok(live, bound_ms=s.drift_bound_ms):
            fresh = live_check_destructive(s, jti=str(principal.jti or ""), sub=principal.sub, kid=str(principal.kid or ""))
            if not fresh.ok:
                raise HardReject(HALTED if fresh.reason.startswith("kill") else "REVOKED",
                                 f"drift re-check failed: {fresh.reason}", burned_approval=True)

    # ---- the write tool: execute_approved_plan ------------------------------
    def execute_approved_plan(self, *, principal, live, ticket_id: str, host_id: str, op_id: str | None) -> dict:
        prior = self._dedup_hit(principal.sub, op_id, "execute")
        if prior is not None:
            return prior

        run_id = mint_run_id()
        self.st.runs.create(run_id=run_id, host_id=host_id, caller_sub=principal.sub, op_id=op_id,
                            surface="execute", ticket_id=ticket_id)
        self._audit(record_type="dispatch_request", run_id=run_id, actor_sub=principal.sub,
                    action="execute_approved_plan", target=host_id,
                    payload={"ticket_id": ticket_id, "host_id": host_id, "op_id": op_id})

        fencing = None
        mutex: HostMutex | None = None
        consumed = False
        redeemed_lease: str | None = None
        try:
            # 1. Kill gate (chokepoint — before Check 1).
            self.st.kill.gate()

            # 2a. Board facts (no side effect).
            facts = self.st.clients.board.facts_ticket(ticket_id)
            binding = check_ticket_facts(facts, ticket_id, host_id)
            approval_id = binding["approval_id"]
            appr = self.st.clients.board.facts_approval(approval_id)
            approver_kind = appr.get("approver_kind", "operator")

            # 2b. Notes plan bytes → re-hash → parse (no side effect).
            plan_bytes = self.st.clients.notes.plan_bytes(binding["plan_note_id"], binding["plan_note_rev"])
            recomputed = recompute_plan_hash(plan_bytes)
            invocations = parse_invocations(plan_bytes)

            # 2c. Resolve catalog + validate extravars + derive action_class + floor (no side effect).
            resolved = []
            for inv in invocations:
                entry = self.st.catalog.lookup(inv["playbook_key"], inv["version"])
                if entry is None:
                    from ..checks import UNKNOWN_PLAYBOOK
                    raise HardReject(UNKNOWN_PLAYBOOK, f"no catalog entry {inv['playbook_key']}@{inv['version']}")
                schema = entry["extravars_schema"]
                validate_extravars(json.loads(schema) if isinstance(schema, str) else schema, inv["extravars"])
                resolved.append(entry)
            action_class = derive_action_class(resolved)
            worst_rollback = _worst_rollback(resolved)
            est_duration = sum(int(e["est_duration_s"]) for e in resolved)
            enforce_floor(action_class, approver_kind, worst_rollback)  # independent non-auto floor

            # Check B-pre: advisory CMDB verdict — a clear deny rejects WITHOUT consuming (no burn).
            jws_pre = self.st.clients.cmdb.decision(host_id, action_class, ticket_id)
            validate_verdict(jws_pre, self.st.verdict_keyring, expected_aud="gateway",
                             require_host_class="managed", require_verdict_basis=None,
                             seen_decision_id=lambda _d: False,  # pre-check does not consume the replay slot
                             est_duration_s=est_duration, has_consumed_approval=True)

            # 3. consume_approval — THE single-use CAS (FIRST irreversible; D-S2).
            consume = self.st.clients.board.consume_approval(approval_id, ticket_id, host_id, op_id)
            consumed = True
            fencing = consume.get("fencing_token")
            self.st.runs.set_fields(run_id, approval_id=approval_id, plan_hash=consume.get("plan_hash"),
                                    action_class=action_class, fencing_token=fencing)
            self._audit(record_type="consume_approval", run_id=run_id, actor_sub="svc:gateway",
                        action="consume_approval", target=f"approval:{approval_id}", outcome="executing",
                        payload={"approval_id": approval_id, "fencing_token": fencing})

            # Check 1d — binding verification (post-consume).
            from ..checks.catalog import verify_binding
            action_class = verify_binding(consume, recomputed, invocations, self.st.catalog)

            # 4b/4c — fencing stale-reject + local advisory lock (BEFORE redemption).
            check_fencing(fencing, self.st.runs.current_fence(host_id))
            mutex = HostMutex(self.st.db, host_id, run_id)
            mutex.acquire()
            self._audit(record_type="mutex", run_id=run_id, action="acquire", target=host_id,
                        payload={"fencing_token": fencing})

            # 5. Authoritative signed CMDB verdict at the TOCTOU instant (post-hold, pre-redemption).
            jws = self.st.clients.cmdb.decision(host_id, action_class, ticket_id)
            verdict = validate_verdict(jws, self.st.verdict_keyring, expected_aud="gateway",
                                       require_host_class="managed", require_verdict_basis=None,
                                       seen_decision_id=self._seen_decision_id,
                                       est_duration_s=est_duration, has_consumed_approval=True)
            decision_id = verdict.get("jti") or verdict.get("decision_id")
            self.st.runs.set_fields(run_id, decision_id=decision_id)
            self._audit(record_type="cmdb_verdict", run_id=run_id, action="verdict", target=host_id,
                        outcome=verdict.get("verdict"),
                        payload={"decision_id": decision_id, "policy_version": verdict.get("policy_version")})

            # 6. Vault redeem — the credential, LAST (contract §5; D-4 handled by interpret_redeem).
            # Kill re-check IMMEDIATELY before beginning the redemption (§8 (2): "refuse to BEGIN
            # Vault redemptions" at ≥ G1). The initial gate (step 1) can be stale by hundreds of ms
            # of holder round-trips; this closes that window so no NEW credential is issued post-kill.
            self.st.kill.gate()
            self._drift_recheck(principal, live)
            release_id = binding.get("release_id") or appr.get("release_id")
            pub = _ephemeral_pubkey()
            status, body = self.st.clients.vault.redeem(ticket_id, release_id or "", approval_id, run_id, pub)
            vres = interpret_redeem(status, body)
            redeemed_lease = vres.lease_id
            self.st.runs.set_fields(run_id, cred_handle=vres.handle, release_id=release_id)
            self._audit(record_type="cred_redeem", run_id=run_id, action="redeem",
                        target=vres.handle, outcome="ok",
                        payload={"lease_id": vres.lease_id, "handle": vres.handle})  # handle only, NEVER plaintext

            # 7. Dispatch (executing) → health → terminal. Final kill gate before the irreversible
            # dispatch; a run halted here reports failed(halted) and its just-issued lease is revoked.
            self.st.kill.gate()
            self.st.runs.transition(run_id, "executing", started_at=now_iso())
            self.st.runs.bump_fence(host_id, int(fencing))
            spec = _spec_for(run_id, resolved, self.st.settings, est_duration)
            self._audit(record_type="dispatch", run_id=run_id, action="run_playbook", target=host_id,
                        payload={"playbooks": [e["playbook_key"] for e in resolved],
                                 "wall_clock_cap_s": spec.wall_clock_cap_s})
            result = self.st.dispatcher.run_playbook(
                spec,
                event_handler=lambda ev: self._audit(record_type="task_event", run_id=run_id,
                                                      action=str(ev.get("task")), outcome=str(ev.get("rc")),
                                                      payload={"stdout": str(ev.get("stdout", ""))[:2048]}),
                cancel_callback=self.st.kill.is_frozen,   # kill at the next safe task boundary
            )

            self.st.runs.transition(run_id, "health_check")
            health = self.st.health.run(run_id, host_id)
            if result.status != "successful":
                health = HealthOutcome(healthy=False, reachable=True, reason=result.status)
            to_state, reason = decide_terminal(health, has_external_verifier=self.st.settings.wazuh_enabled,
                                               rollback_capability=worst_rollback)
            if reason in ("rolled_back", "unrecoverable", "host_unreachable"):
                self.st.runs.transition(run_id, "rolling_back")
                self._audit(record_type="rollback", run_id=run_id, action="rollback", target=host_id, outcome=reason)
            self.st.runs.transition(run_id, "reporting")
            terminal = to_state if to_state in ("verifying", "needs_review") else f"failed:{reason}"
            final_state = "done_reported" if to_state in ("verifying", "needs_review") else "failed_reported"
            self.st.runs.transition(run_id, final_state, terminal=terminal, finished_at=now_iso())
            self._audit(record_type="terminal", run_id=run_id, action="report", target=host_id,
                        outcome=terminal, payload={"fencing_token": fencing})
            self.st.clients.board.report_run_outcome(ticket_id, run_id, to_state, reason, fencing)

            out = {"run_id": run_id, "state": to_state, "reason": reason, "isError": False}
            self._dedup_store(principal.sub, op_id, "execute", out)
            return out

        except HardReject as hr:
            return self._handle_reject(run_id, hr, ticket_id, host_id, fencing, consumed, principal.sub,
                                       op_id, redeemed_lease)
        finally:
            if mutex is not None:
                mutex.release()

    def _handle_reject(self, run_id, hr, ticket_id, host_id, fencing, consumed, sub, op_id,
                       redeemed_lease=None) -> dict:
        # If a credential was already redeemed before this reject (e.g. a kill thrown between
        # redeem and dispatch), revoke the outstanding lease (§8 (4): "revoke outstanding Vault
        # leases"). Best-effort; the short cert TTL is the residual bound the demos state honestly.
        if redeemed_lease:
            try:
                self.st.clients.vault.revoke(redeemed_lease)
            except Exception:
                pass
            self._audit(record_type="cred_revoke", run_id=run_id, actor_sub="svc:gateway",
                        action="revoke_lease", target=f"lease:{redeemed_lease}", outcome=hr.reason)
        # First-class hash-chained rejection record (hostile-model telemetry).
        self._audit(record_type="reject", run_id=run_id, actor_sub=sub, action="hard_reject",
                    target=host_id, outcome=hr.reason,
                    payload={"reason": hr.reason, "burned_approval": hr.burned_approval, "ticket_id": ticket_id})
        if consumed:
            # The approval was actually consumed before this reject → report executing → failed
            # (fail-safe direction). Whether a check *would* burn (hr.burned_approval) is recorded
            # in the audit payload above but never invents a burn that did not happen: a pre-consume
            # refusal (floor, extravars, advisory CMDB deny) is a plain 'rejected', not a 'failed'.
            try:
                self.st.runs.transition(run_id, "failed_reported",
                                        terminal=f"failed:{hr.reason}", reject_reason=hr.reason,
                                        finished_at=now_iso())
            except Exception:
                self.st.runs.set_fields(run_id, state="failed_reported", terminal=f"failed:{hr.reason}",
                                        reject_reason=hr.reason, finished_at=now_iso())
            self.st.clients.board.report_run_outcome(ticket_id, run_id, "failed", hr.reason, fencing)
        else:
            self.st.runs.reject(run_id, hr.reason)
        return {"run_id": run_id, "isError": True, "reason": hr.reason, "message": hr.message}


def _worst_rollback(entries: list[dict]) -> str:
    order = {"snapshot": 0, "dnf_history": 1, "none": 2}
    worst = "snapshot"
    for e in entries:
        rb = e.get("rollback", "none")
        if order.get(rb, 2) > order.get(worst, 0):
            worst = rb
    return worst


def _spec_for(run_id: str, entries: list[dict], settings, est_duration: int) -> DispatchSpec:
    """One DispatchSpec covering the first invocation (the runner runs the vetted playbook for
    the plan; a multi-invocation plan is a playbook that includes its steps). Bounded run
    duration = est × cap multiple (the kill-switch guarantee precondition)."""
    first = entries[0]
    return DispatchSpec(
        run_id=run_id,
        playbook=f"{first['playbook_key']}.yml",   # catalog path, never agent-named
        extravars={},                              # already schema-validated; bound at build in prod
        wall_clock_cap_s=int(est_duration * settings.run_duration_cap_multiple),
        process_isolation=settings.process_isolation,
        dpkg_lock_timeout_s=settings.dpkg_lock_timeout_s,
    )


def _ephemeral_pubkey() -> str:
    """Generate an ephemeral per-run keypair; return the public half for Vault to sign.

    The private half never leaves this process (nothing credential-shaped is returned to any
    agent). In this build we return a fresh Ed25519 public blob; production uses an SSH key.
    """
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    from ..authn.jwks import b64u_encode
    k = Ed25519PrivateKey.generate()
    raw = k.public_key().public_bytes(encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw)
    return "ephemeral-" + b64u_encode(raw)
