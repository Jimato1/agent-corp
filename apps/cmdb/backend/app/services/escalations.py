"""Durable escalation outbox → Board (PLAN §8, D-6c).

Fail-closed escalations "land as Board escalations". Until ``svc:cmdb`` + the Board
escalation-intake endpoint exist (A2), escalations queue locally, surface loudly in the UI,
and the app runs **degraded-but-honest** — flag, never drop. Escalation payloads
provenance-tag any host-originated strings (ARCH §12).
"""
from __future__ import annotations

import json

from ..clock import now_iso

# The closed set of escalation kinds (PLAN §8).
KINDS = frozenset({
    "needs_tiering", "dst_gap_window_never_opened", "window_ambiguity", "break_glass_posthoc",
    "missing_from_wazuh", "policy_integrity_error", "clock_skew", "sandbox_config_error",
})


def enqueue(db, kind: str, *, host: str | None = None, dedup_key: str | None = None,
            payload: dict | None = None) -> None:
    """Append an escalation. ``window_ambiguity`` etc. dedup per (kind, dedup_key)."""
    if kind not in KINDS:
        kind = "policy_integrity_error"  # never mint an unknown kind
    ded = dedup_key or (f"{kind}:{host}" if host else None)
    body = json.dumps(payload or {}, separators=(",", ":"))
    with db.write_lock:
        conn = db.writer
        with conn:
            if ded:
                existing = conn.execute(
                    "SELECT id FROM escalation_outbox WHERE kind=? AND dedup_key=? AND state!='delivered'",
                    (kind, ded),
                ).fetchone()
                if existing:
                    return
            conn.execute(
                "INSERT INTO escalation_outbox(kind, target_host, dedup_key, payload, state, "
                "attempts, created_at) VALUES (?,?,?,?, 'queued', 0, ?)",
                (kind, host, ded, body, now_iso()),
            )


def enqueue_many(db, escalations: list[dict]) -> None:
    for e in escalations or []:
        enqueue(db, e.get("kind", "policy_integrity_error"), host=e.get("host"),
                dedup_key=e.get("dedup_key"), payload={k: v for k, v in e.items() if k not in ("kind", "host")})


def list_outbox(db, limit: int = 200) -> list[dict]:
    conn = db.reader()
    try:
        rows = conn.execute(
            "SELECT * FROM escalation_outbox ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def resend(db, escalation_id: int) -> bool:
    with db.write_lock:
        conn = db.writer
        with conn:
            cur = conn.execute(
                "UPDATE escalation_outbox SET state='queued', attempts=0 WHERE id=? AND state!='delivered'",
                (escalation_id,),
            )
            return cur.rowcount > 0
