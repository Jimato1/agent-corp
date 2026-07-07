"""Policy-plane change control (§6) — the propose→confirm gate-weakening ceremony.

Two-phase, CMDB-local (v1):

* ``propose`` → compute the typed diff + weakening classification (fail-closed) + a
  blast-radius preview; return a single-use ``confirm_token`` (TTL 5m) bound to the sha256
  of the exact rendered diff.
* ``confirm`` → re-present the same holder identity (``sub`` + ``cnf``), the token, and
  re-typed intent; the §8 live-check re-runs at the commit instant (D=1s drift bound). Any
  drift ⇒ start over.

Durability / tamper-evidence (§6.3, AR cluster E): for a gate-weakening edit, push success
to the remote is a PRECONDITION — commit → push → only then snapshot swap; push failure ⇒
the swap does not happen and the edit is refused. A hash-chained ``policy_change_log`` row
is written on every accepted edit; git commits carry the operator ``sub`` + session id.
"""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from .. import chainlog
from ..authn.livecheck import live_check_sod_critical
from ..authn.principal import HolderContext, drift_ok
from ..clock import now_dt, now_iso
from ..ids import new_confirm_token
from ..policy.classifier import classify
from ..policy.gitrepo import GitError
from ..policy.schema import SchemaError
from . import edits, escalations

_UTC = timezone.utc


class ChangeError(Exception):
    def __init__(self, message: str, code: str = "invalid", status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


@dataclass
class ProposeResult:
    confirm_token: str
    diff_hash: str
    weakening: bool
    friction: str            # full | light
    typed_diff: dict
    blast_radius: dict
    expected_intent: str
    edit_kind: str


class ChangeControl:
    def __init__(self, settings, db, store) -> None:
        self.settings = settings
        self.db = db
        self.store = store
        self._lock = threading.Lock()  # serialize the whole ceremony commit

    # -- propose -------------------------------------------------------------------
    def propose(self, principal, target_kind: str, key: str, action: str,
                frontmatter: dict | None, *, edit_kind: str | None = None,
                break_glass: bool = False) -> ProposeResult:
        snap, integ = self.store.current()
        if snap is None:
            raise ChangeError("policy snapshot unavailable — cannot propose", "policy_unavailable", 503)
        if target_kind not in edits.TARGET_KINDS:
            raise ChangeError(f"unknown target_kind {target_kind!r}")

        before = edits.frontmatter_from_model(snap, target_kind, key)
        try:
            candidate = edits.apply_edit_to_snapshot(snap, target_kind, key, action, frontmatter)
        except SchemaError as exc:
            raise ChangeError(f"schema validation failed: {exc.message}", "invalid") from exc

        cls = classify(snap, candidate)
        weakening = cls.weakening or break_glass
        after = None if action == "delete" else dict(frontmatter or {})
        dh = edits.diff_hash(target_kind, key, action, before, after)
        ek = edit_kind or self._infer_edit_kind(target_kind, key, action, cls.reasons, break_glass)
        friction = "full" if weakening else "light"
        expected_intent = self._expected_intent(target_kind, key, weakening, break_glass, frontmatter)

        token = new_confirm_token()
        now = now_dt()
        expires = now + timedelta(seconds=self.settings.confirm_token_ttl_seconds)
        typed_diff = {"target_kind": target_kind, "key": key, "action": action,
                      "before": before, "after": after, "reasons": cls.reasons}
        blast = {"cells_made_auto": cls.blast.cells_made_auto,
                 "hosts_gain_coverage": cls.blast.hosts_gain_coverage,
                 "full_shadow_warnings": cls.blast.full_shadow_warnings}
        with self.db.write_lock:
            conn = self.db.writer
            with conn:
                conn.execute(
                    "INSERT INTO confirm_tokens(token, sub, cnf_jkt, edit_kind, weakening, diff_hash, "
                    "diff_json, blast_json, snapshot_commit, created_at, expires_at, used) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,0)",
                    (token, principal.sub, principal.cnf_jkt, ek, int(weakening), dh,
                     json.dumps({"diff": typed_diff, "frontmatter": frontmatter, "target_kind": target_kind,
                                 "key": key, "action": action, "expected_intent": expected_intent}),
                     json.dumps(blast), snap.git_commit, now_iso(), _iso(expires)),
                )
        return ProposeResult(token, dh, weakening, friction, typed_diff, blast, expected_intent, ek)

    def propose_break_glass(self, principal, host_id: str, minutes: int, *,
                            overrides_freeze: bool, tzid: str) -> ProposeResult:
        """Break-glass mints ONLY a one-shot bounded emergency ALLOW window (≤4h cap, §6.4)."""
        cap = self.settings.break_glass_max_hours * 60
        if minutes <= 0 or minutes > cap:
            raise ChangeError(f"break-glass window must be 1..{cap} minutes (hard cap ≤{self.settings.break_glass_max_hours}h)")
        snap, _ = self.store.current()
        if snap is None:
            raise ChangeError("policy snapshot unavailable", "policy_unavailable", 503)
        host = snap.hosts.get(host_id)
        if host is None or host.host_class != "managed":
            raise ChangeError(f"break-glass target {host_id!r} is not a managed host")
        fm = edits.frontmatter_from_model(snap, "host", host_id) or {}
        start = now_dt()
        end = start + timedelta(minutes=minutes)
        bg_window = {
            "id": f"bg-{int(start.timestamp())}", "kind": "allow", "tzid": tzid,
            "start_at": start.astimezone(_UTC).strftime("%Y-%m-%dT%H:%M:%S"),
            "end_at": end.astimezone(_UTC).strftime("%Y-%m-%dT%H:%M:%S"),
            "break_glass": True, "overrides_freeze": bool(overrides_freeze),
        }
        # NOTE: start_at/end_at are stored as tz-naive local anchors resolved in `tzid`; we
        # write UTC wall-clock components under a UTC tzid so the bounded window is exact.
        bg_window["tzid"] = "Etc/UTC"
        fm.setdefault("windows", [])
        fm["windows"] = list(fm.get("windows", [])) + [bg_window]
        return self.propose(principal, "host", host_id, "upsert", fm,
                            edit_kind="break_glass", break_glass=True)

    # -- confirm -------------------------------------------------------------------
    def confirm(self, holder: HolderContext, token: str, typed_intent: str, diff_hash: str) -> dict:
        principal = holder.principal
        with self._lock:
            row = self._load_token(token)
            if row is None:
                raise ChangeError("confirm token not found", "conflict", 409)
            if row["used"]:
                raise ChangeError("confirm token already used", "conflict", 409)
            if _past(row["expires_at"]):
                raise ChangeError("confirm token expired — re-propose", "conflict", 409)
            # Same holder identity (sub + cnf-bound), §6.3.
            if row["sub"] != principal.sub:
                raise ChangeError("confirm principal != proposer", "insufficient_scope", 403)
            if row["cnf_jkt"] and principal.cnf_jkt and row["cnf_jkt"] != principal.cnf_jkt:
                raise ChangeError("confirm sender-constraining key != proposer's", "insufficient_scope", 403)
            if row["diff_hash"] != diff_hash:
                raise ChangeError("diff_hash mismatch — the rendered diff changed", "conflict", 409)

            meta = json.loads(row["diff_json"])
            weakening = bool(row["weakening"])
            expected = meta.get("expected_intent", "")
            if weakening and typed_intent.strip() != expected:
                raise ChangeError(f"typed intent must be exactly {expected!r}", "invalid", 400)

            # No drift: HEAD must equal the snapshot at propose time.
            snap, integ = self.store.current()
            if snap is None or not integ.ok:
                raise ChangeError("policy snapshot unavailable at confirm", "policy_unavailable", 503)
            if snap.git_commit != row["snapshot_commit"]:
                raise ChangeError("policy moved under you — re-propose", "conflict", 409)

            # §8 step 8 drift bound: the live check must be < D=1s old at the irreversible
            # instant — re-run it here (never cached), fail-closed.
            if not drift_ok(holder.live):
                fresh = live_check_sod_critical(self.settings, jti=principal.jti or "", sub=principal.sub,
                                                kid=principal.kid or "")
                if not fresh.ok:
                    raise ChangeError(f"sod-critical live re-check failed: {fresh.reason}", "revoked", 403)

            # Apply: write files → commit → (push if weakening) → swap → chain row.
            files, deletes = edits.render_files(meta["target_kind"], meta["key"], meta["action"], meta.get("frontmatter"))
            self.store.write_files(files, deletes)
            try:
                commit = self.store.commit(
                    f"policy: {row['edit_kind']} {meta['target_kind']}/{meta['key']} "
                    f"({'weakening' if weakening else 'tightening'})",
                    sub=principal.sub, session=None,
                )
            except GitError as exc:
                raise ChangeError(f"commit failed: {exc}", "conflict", 409) from exc

            pushed = None
            if self.settings.require_remote:
                if weakening:
                    # PUSH-BEFORE-EFFECT: a weakening edit is not live until its evidence
                    # anchor reaches the remote. Push failure ⇒ roll back, refuse (§6.3).
                    try:
                        self.store.push()
                        pushed = True
                    except GitError as exc:
                        self.store.rollback()
                        self.store.reload_snapshot()
                        raise ChangeError(
                            f"push to remote FAILED — weakening edit refused, commit rolled back: {exc}",
                            "conflict", 409,
                        ) from exc
                else:
                    try:
                        self.store.push()
                        pushed = True
                    except GitError:
                        pushed = False  # non-weakening may take effect; app enters degraded (§6.3)

            # Append the chain row BEFORE reloading — reload's integrity check compares HEAD
            # to the chain tip, so the tip must already name this commit.
            chain = chainlog.append_chain(
                self.db, sub=principal.sub, jti=principal.jti, session=None,
                edit_kind=row["edit_kind"], weakening=weakening, diff_hash=diff_hash,
                git_commit=commit, confirm_token_id=token,
            )
            self.store.reload_snapshot()
            new_commit = commit
            with self.db.write_lock:
                conn = self.db.writer
                with conn:
                    conn.execute("UPDATE confirm_tokens SET used=1 WHERE token=?", (token,))

            # Break-glass auto-files the D-6c post-hoc review Board escalation (§6.4).
            if row["edit_kind"] == "break_glass":
                escalations.enqueue(self.db, "break_glass_posthoc", host=meta.get("key"),
                                    payload={"minutes_capped": self.settings.break_glass_max_hours * 60})

            degraded = self.settings.require_remote and not weakening and pushed is False
            return {
                "committed": new_commit, "chain_seq": chain["seq"], "weakening": weakening,
                "pushed": pushed, "degraded": degraded, "edit_kind": row["edit_kind"],
            }

    # -- direct tightening (ceremony-free, still audited) --------------------------
    def apply_direct_tightening(self, sub: str, target_kind: str, key: str, action: str,
                                frontmatter: dict | None, edit_kind: str) -> dict:
        """A NON-weakening edit an operator may apply without the full ceremony (e.g. the
        sandbox kill knob disable, §5.7 — 'instant, ceremony-free tightening'). It still
        classifies (and REFUSES if it turns out weakening — that must use the ceremony),
        commits, and writes a chain row. Not a holder path; operator `cmdb:manage` suffices."""
        with self._lock:
            snap, integ = self.store.current()
            if snap is None or not integ.ok:
                raise ChangeError("policy snapshot unavailable", "policy_unavailable", 503)
            try:
                candidate = edits.apply_edit_to_snapshot(snap, target_kind, key, action, frontmatter)
            except SchemaError as exc:
                raise ChangeError(f"schema validation failed: {exc.message}", "invalid") from exc
            cls = classify(snap, candidate)
            if cls.weakening:
                raise ChangeError("this edit is gate-weakening — it requires the step-up ceremony",
                                  "insufficient_scope", 403)
            files, deletes = edits.render_files(target_kind, key, action, frontmatter)
            self.store.write_files(files, deletes)
            try:
                commit = self.store.commit(f"policy: {edit_kind} {target_kind}/{key} (tightening)",
                                           sub=sub, session=None)
            except GitError as exc:
                raise ChangeError(f"commit failed: {exc}", "conflict", 409) from exc
            pushed = None
            if self.settings.require_remote:
                try:
                    self.store.push(); pushed = True
                except GitError:
                    pushed = False
            chain = chainlog.append_chain(
                self.db, sub=sub, jti=None, session=None, edit_kind=edit_kind,
                weakening=False, diff_hash=None, git_commit=commit, confirm_token_id=None,
            )
            self.store.reload_snapshot()
            new_commit = commit
            return {"committed": new_commit, "chain_seq": chain["seq"], "weakening": False,
                    "pushed": pushed, "degraded": self.settings.require_remote and pushed is False}

    # -- helpers -------------------------------------------------------------------
    def _load_token(self, token: str) -> dict | None:
        conn = self.db.reader()
        try:
            r = conn.execute("SELECT * FROM confirm_tokens WHERE token=?", (token,)).fetchone()
            return dict(r) if r else None
        finally:
            conn.close()

    @staticmethod
    def _infer_edit_kind(target_kind: str, key: str, action: str, reasons: list[str], break_glass: bool) -> str:
        if break_glass:
            return "break_glass"
        if any(r.startswith("wazuh_bind") for r in reasons):
            return "wazuh_bind"
        if any(r.startswith("snapshot_capability_enabled") for r in reasons):
            return "snapshot_capability"
        if any(r.startswith("new_allow_window") or r.startswith("allow_window_mutated") for r in reasons):
            return "window_edit"
        return f"{target_kind}_{action}"

    @staticmethod
    def _expected_intent(target_kind: str, key: str, weakening: bool, break_glass: bool,
                         frontmatter: dict | None) -> str:
        if break_glass:
            overrides = any(w.get("overrides_freeze") for w in (frontmatter or {}).get("windows", []) if isinstance(w, dict))
            return f"OVERRIDE FREEZE {key}" if overrides else f"BREAK GLASS {key}"
        if weakening:
            return f"WEAKEN {key}"
        return ""


def _iso(dt: datetime) -> str:
    dt = dt.astimezone(_UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def _past(iso: str) -> bool:
    try:
        return datetime.now(_UTC) > datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return True
