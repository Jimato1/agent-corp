"""The durable-store repository + heartbeat projection (PLAN §3).

Encapsulates every write to MC's own state: the CANONICAL append-only stores
(``audit_anchor``, ``mc_audit``), the durable operational buffer (``resolve_log``), the
durable config (``guardrail_params``), and durable convenience (``operator_state``). Also
projects the runtime heartbeat SSE into ``agent_view`` / ``fleet_view`` (the liveness
engine's server-side state). Single-writer discipline via ``db.write_lock``.
"""
from __future__ import annotations

import json
import time
from typing import Any

from ..clock import Clock
from ..config import Settings
from ..db import Database
from ..liveness.engine import LivenessParams

# The D-12 parameter keys (PLAN §8). Seeded UNSET / PRE-SIZING — no compiled enforcement value.
_PARAM_KEYS = ("suppress_fraction", "suppress_window", "phi_threshold", "noisy_net_phi",
               "posture_freshness_bound", "resolve_retention")
_PROGRESS_PREFIX = "progress_budget:"


class Repository:
    def __init__(self, db: Database, settings: Settings, broker, clock: Clock | None = None) -> None:
        self.db = db
        self.s = settings
        self.broker = broker
        self.clock = clock or Clock()
        self._seed_params()

    # ---- helpers ----------------------------------------------------------------
    def _write(self, sql: str, params: tuple = ()) -> Any:
        with self.db.write_lock, self.db.writer as conn:
            return conn.execute(sql, params)

    def _read_all(self, sql: str, params: tuple = ()) -> list[dict]:
        conn = self.db.reader()
        try:
            return [dict(r) for r in conn.execute(sql, params).fetchall()]
        finally:
            conn.close()

    def _read_one(self, sql: str, params: tuple = ()) -> dict | None:
        conn = self.db.reader()
        try:
            row = conn.execute(sql, params).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    # ---- mc_audit (CANONICAL, append-only) --------------------------------------
    def audit(self, actor_sub: str, action: str, object_id: str | None = None,
              outcome: str | None = None, detail: str | None = None) -> None:
        self._write(
            "INSERT INTO mc_audit(at, actor_sub, action, object_id, outcome, detail) VALUES (?,?,?,?,?,?)",
            (self.clock.iso(), actor_sub, action, object_id, outcome, detail),
        )

    def audit_tail(self, limit: int = 200) -> list[dict]:
        return self._read_all("SELECT * FROM mc_audit ORDER BY seq DESC LIMIT ?", (limit,))

    # ---- audit_anchor (seam #25, receive-and-retain, idempotent) ----------------
    def retain_head(self, chain_id: str, seq_num: int, head_hash: str,
                    signed_at: str | None, sig: str | None, prev_seq: int | None) -> str:
        """Append-only retain, idempotent by (chain_id, seq_num). Returns a status:
        'retained' | 'duplicate' | 'regression'. Never validates chain internals — the
        Gateway's chain is canonical; MC anchors the hash, not the contents (contract §5)."""
        existing = self._read_one(
            "SELECT head_hash FROM audit_anchor WHERE chain_id=? AND seq_num=?", (chain_id, seq_num))
        if existing is not None:
            if existing["head_hash"] != head_hash:
                # same (chain_id, seq) different hash => tamper-class fork alarm (§3.3)
                self.audit("svc:gateway", "anchor_fork", chain_id, "alarm",
                           f"seq {seq_num} hash conflict")
                return "regression"
            return "duplicate"
        self._write(
            "INSERT INTO audit_anchor(chain_id, seq_num, head_hash, signed_at, sig, prev_seq, received_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (chain_id, seq_num, head_hash, signed_at, sig, prev_seq, time.time()),
        )
        return "retained"

    def last_retained(self, chain_id: str) -> dict | None:
        return self._read_one(
            "SELECT chain_id, seq_num, head_hash FROM audit_anchor WHERE chain_id=? "
            "ORDER BY seq_num DESC LIMIT 1", (chain_id,))

    def anchor_series(self, chain_id: str | None = None, limit: int = 200) -> list[dict]:
        if chain_id:
            return self._read_all(
                "SELECT * FROM audit_anchor WHERE chain_id=? ORDER BY seq_num DESC LIMIT ?", (chain_id, limit))
        return self._read_all("SELECT * FROM audit_anchor ORDER BY received_seq DESC LIMIT ?", (limit,))

    def anchor_chains(self) -> list[str]:
        return [r["chain_id"] for r in self._read_all("SELECT DISTINCT chain_id FROM audit_anchor")]

    def continuity_status(self, chain_id: str) -> dict:
        """Continuity per PLAN §3.3: CONTINUOUS / RESYNC-PENDING (benign gap) / etc.
        A gap (missing seq between retained rows or below the tip) is RESYNC-PENDING —
        the guaranteed-common case that clears via Gateway backfill, NOT a tamper alarm."""
        rows = self._read_all(
            "SELECT seq_num FROM audit_anchor WHERE chain_id=? ORDER BY seq_num ASC", (chain_id,))
        seqs = [r["seq_num"] for r in rows]
        if not seqs:
            return {"chain_id": chain_id, "status": "empty", "tip": None, "gaps": []}
        gaps = []
        for a, b in zip(seqs, seqs[1:]):
            if b > a + 1:
                gaps.extend(range(a + 1, b))
        status = "continuous" if not gaps else "resync_pending"
        return {"chain_id": chain_id, "status": status, "tip": seqs[-1], "gaps": gaps}

    # ---- resolve_log (FROZEN feed §3) -------------------------------------------
    def record_resolution(self, ticket_id: str, gate: str, outcome: str, actor_kind: str,
                          resolved_at: str) -> int:
        """Append one resolution; returns resolve_seq (the FROZEN Last-Event-ID cursor).
        `resolved_at` is held STABLE across re-emissions so the dedup key survives rebuilds."""
        # de-dup: don't re-append an identical (ticket, gate, outcome, resolved_at)
        existing = self._read_one(
            "SELECT resolve_seq FROM resolve_log WHERE ticket_id=? AND gate=? AND outcome=? AND resolved_at=?",
            (ticket_id, gate, outcome, resolved_at))
        if existing:
            return existing["resolve_seq"]
        cur = self._write(
            "INSERT INTO resolve_log(ticket_id, gate, outcome, actor_kind, resolved_at, review_url, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (ticket_id, gate, outcome, actor_kind, resolved_at, self.s.review_url(ticket_id), time.time()),
        )
        seq = int(cur.lastrowid)
        self.broker.publish("resolve", "resolve", str(seq), self._resolve_event(seq))
        return seq

    def _resolve_event(self, seq: int) -> dict:
        r = self._read_one("SELECT * FROM resolve_log WHERE resolve_seq=?", (seq,))
        if not r:
            return {}
        return {
            "schema_version": 1, "ticket_id": r["ticket_id"], "gate": r["gate"],
            "outcome": r["outcome"], "actor_kind": r["actor_kind"],
            "resolved_at": r["resolved_at"], "review_url": r["review_url"],
        }

    def seq_of(self, cursor: str | None) -> int | None:
        if cursor is None:
            return None
        try:
            n = int(cursor)
        except (TypeError, ValueError):
            return None
        r = self._read_one("SELECT resolve_seq FROM resolve_log WHERE resolve_seq=?", (n,))
        return r["resolve_seq"] if r else None

    def resolve_replay_after(self, cursor: str | None, limit: int = 200) -> list[dict]:
        after = 0
        if cursor is not None:
            try:
                after = int(cursor)
            except (TypeError, ValueError):
                after = 0
        rows = self._read_all(
            "SELECT resolve_seq FROM resolve_log WHERE resolve_seq > ? ORDER BY resolve_seq ASC LIMIT ?",
            (after, limit))
        return [{"seq": r["resolve_seq"], "event": self._resolve_event(r["resolve_seq"])} for r in rows]

    # ---- guardrail_params (durable config; D-12 parameterized, no compiled numbers) --
    def _seed_params(self) -> None:
        # Seed suppress_*/phi/freshness/retention as labelled PRE-SIZING bootstrap values
        # (is_unset=0, presizing=1) so nothing enforces on them until an operator ratifies real
        # sizing. Per-role progress budgets are DELIBERATELY NOT seeded here — they stay absent, so
        # an agent with no progress budget classifies "wedged DARK" (never silently healthy).
        seed = {
            "suppress_fraction": (str(self.s.suppress_fraction), 0, 1),   # bootstrap value, PRE-SIZING
            "suppress_window": (str(self.s.suppress_window_seconds), 0, 1),
            "phi_threshold": (str(self.s.phi_threshold), 0, 1),
            "noisy_net_phi": (str(self.s.noisy_net_phi), 0, 1),
            "posture_freshness_bound": (str(self.s.posture_freshness_bound_seconds), 0, 0),
            "resolve_retention": (str(self.s.resolve_retention_days), 0, 0),
        }
        for k, (v, unset, presizing) in seed.items():
            self._write(
                "INSERT OR IGNORE INTO guardrail_params(key, value, is_unset, presizing, updated_at) "
                "VALUES (?,?,?,?,?)", (k, v, unset, presizing, time.time()))

    def get_params_raw(self) -> list[dict]:
        return self._read_all("SELECT * FROM guardrail_params ORDER BY key")

    def set_param(self, key: str, value: str, by: str) -> None:
        self._write(
            "INSERT INTO guardrail_params(key, value, is_unset, presizing, restored, updated_at, updated_by) "
            "VALUES (?,?,0,0,0,?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, is_unset=0, presizing=0, "
            "restored=0, updated_at=excluded.updated_at, updated_by=excluded.updated_by",
            (key, value, time.time(), by))
        self.audit(by, "param_save", key, "confirmed", f"{key}={value}")

    def liveness_params(self) -> LivenessParams:
        """Build the engine params from operator config. A param that is UNSET keeps the
        engine's DARK behaviour (progress budgets absent => wedged not classified)."""
        rows = {r["key"]: r for r in self.get_params_raw()}

        def num(key: str, default: float) -> float:
            r = rows.get(key)
            if not r or r["is_unset"] or r["value"] in (None, ""):
                return default
            try:
                v = float(r["value"])
                return v / 100.0 if (key == "suppress_fraction" and v > 1) else v
            except ValueError:
                return default

        budgets: dict[str, float] = {}
        for r in self._read_all(
                "SELECT key, value FROM guardrail_params WHERE key LIKE ? AND is_unset=0",
                (_PROGRESS_PREFIX + "%",)):
            try:
                budgets[r["key"][len(_PROGRESS_PREFIX):]] = float(r["value"])
            except (TypeError, ValueError):
                pass
        return LivenessParams(
            phi_threshold=num("phi_threshold", self.s.phi_threshold),
            noisy_net_phi=num("noisy_net_phi", self.s.noisy_net_phi),
            suppress_fraction=num("suppress_fraction", self.s.suppress_fraction),
            suppress_window_seconds=num("suppress_window", self.s.suppress_window_seconds),
            heartbeat_stale_seconds=self.s.heartbeat_stale_seconds,
            progress_budget=budgets,
            presizing=self.s.params_presizing,
        )

    # ---- operator_state (silences / filters / ack marks) ------------------------
    def add_silence(self, scope_key: str, by: str, ttl_seconds: float | None) -> None:
        exp = (time.time() + ttl_seconds) if ttl_seconds else None
        self._write(
            "INSERT INTO operator_state(category, scope_key, value_json, created_by, created_at, expires_at) "
            "VALUES ('silence', ?, '{}', ?, ?, ?)", (scope_key, by, time.time(), exp))
        self.audit(by, "silence", scope_key, "confirmed")

    def list_silences(self) -> list[dict]:
        now = time.time()
        return [r for r in self._read_all(
            "SELECT * FROM operator_state WHERE category='silence' ORDER BY created_at DESC")
            if not r["expires_at"] or r["expires_at"] > now]

    def ack(self, ticket_id: str, gate: str, entry: int, by: str) -> None:
        """Ack keyed on (ticket_id, gate, entry) — a durable ack NEVER mutes a fresh
        re-entry (gate-entry freshness, A10)."""
        key = f"{ticket_id}|{gate}|{entry}"
        self._write(
            "INSERT INTO operator_state(category, scope_key, value_json, created_by, created_at) "
            "VALUES ('ack', ?, '{}', ?, ?)", (key, by, time.time()))

    def is_acked(self, ticket_id: str, gate: str, entry: int) -> bool:
        key = f"{ticket_id}|{gate}|{entry}"
        return self._read_one(
            "SELECT 1 FROM operator_state WHERE category='ack' AND scope_key=?", (key,)) is not None

    def clear_stale_acks(self, active_keys: set[str]) -> None:
        """Clear ack marks whose (ticket_id,gate,entry) is no longer an active gate entry
        (Board polling observed the ticket leave and re-enter) — A10."""
        for r in self._read_all("SELECT id, scope_key FROM operator_state WHERE category='ack'"):
            if r["scope_key"] not in active_keys:
                self._write("DELETE FROM operator_state WHERE id=?", (r["id"],))

    def save_filter(self, name: str, spec: dict, by: str) -> None:
        self._write(
            "INSERT INTO operator_state(category, scope_key, value_json, created_by, created_at) "
            "VALUES ('filter', ?, ?, ?, ?)", (name, json.dumps(spec), by, time.time()))

    def list_filters(self) -> list[dict]:
        return self._read_all("SELECT * FROM operator_state WHERE category='filter' ORDER BY scope_key")

    # ---- heartbeat projection (agent_view / fleet_view) -------------------------
    def upsert_agent_frame(self, frame: dict[str, Any]) -> None:
        """Project a per-agent heartbeat frame; maintain the phi-accrual rolling mean."""
        sub = frame.get("sub") or frame.get("agent_id")
        if not sub:
            return
        now = time.time()
        prev = self._read_one("SELECT last_arrival_ts, mean_interval FROM agent_view WHERE sub=?", (sub,))
        mean = self.s.heartbeat_stale_seconds / 3.0
        if prev and prev["last_arrival_ts"]:
            interval = max(0.001, now - float(prev["last_arrival_ts"]))
            prev_mean = float(prev["mean_interval"] or mean)
            mean = 0.7 * prev_mean + 0.3 * interval   # EWMA
        self._write(
            "INSERT INTO agent_view(sub, runtime_instance_id, session_id, claimed_ticket_id, fencing_token, "
            "process_alive_ts, work_progress_ts, step_seq, model_version, persona_version, drain_state, "
            "last_arrival_ts, mean_interval, updated_at, frame_json) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) "
            "ON CONFLICT(sub) DO UPDATE SET runtime_instance_id=excluded.runtime_instance_id, "
            "session_id=excluded.session_id, claimed_ticket_id=excluded.claimed_ticket_id, "
            "fencing_token=excluded.fencing_token, process_alive_ts=excluded.process_alive_ts, "
            "work_progress_ts=excluded.work_progress_ts, step_seq=excluded.step_seq, "
            "model_version=excluded.model_version, persona_version=excluded.persona_version, "
            "drain_state=excluded.drain_state, last_arrival_ts=excluded.last_arrival_ts, "
            "mean_interval=excluded.mean_interval, updated_at=excluded.updated_at, frame_json=excluded.frame_json",
            (sub, frame.get("runtime_instance_id"), frame.get("session_id"), frame.get("claimed_ticket_id"),
             frame.get("fencing_token"), frame.get("process_alive_ts"), frame.get("work_progress_ts"),
             frame.get("step_seq"), frame.get("model_version"), frame.get("persona_version"),
             frame.get("drain_state", "active"), now, mean, now, json.dumps(frame)),
        )
        self.broker.publish("ui", "liveness", None, {"sub": sub})

    def upsert_fleet_frame(self, frame: dict[str, Any]) -> None:
        rid = frame.get("runtime_instance_id")
        if not rid:
            return
        self._write(
            "INSERT INTO fleet_view(runtime_instance_id, roster, supervisor_ts, runtime_drain_state, "
            "updated_at, frame_json) VALUES (?,?,?,?,?,?) "
            "ON CONFLICT(runtime_instance_id) DO UPDATE SET roster=excluded.roster, "
            "supervisor_ts=excluded.supervisor_ts, runtime_drain_state=excluded.runtime_drain_state, "
            "updated_at=excluded.updated_at, frame_json=excluded.frame_json",
            (rid, int(frame.get("roster", 0)), frame.get("supervisor_ts"),
             frame.get("runtime_drain_state"), time.time(), json.dumps(frame)))

    def agent_frames(self) -> list[dict]:
        return self._read_all("SELECT * FROM agent_view ORDER BY sub")

    def agent_frame(self, sub: str) -> dict | None:
        return self._read_one("SELECT * FROM agent_view WHERE sub=?", (sub,))

    def roster_denominator(self) -> int:
        rows = self._read_all("SELECT roster FROM fleet_view")
        return sum(int(r["roster"] or 0) for r in rows)

    def fleet_frames(self) -> list[dict]:
        return self._read_all("SELECT * FROM fleet_view")
