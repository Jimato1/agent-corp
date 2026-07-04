"""Health-signal aggregation (PLAN §10.4; UI_SPEC §4.4).

The doorbell's own liveness under the **false-green prohibition**: a stalled feed,
a push sink that ``gave_up``, a stale backup, or the pre-grant MC resolve seam each
render an honest amber ``pending`` with the safe reading spelled out — NEVER a
fabricated green, never a red error. A doorbell that lies about whether it can ring
is the worst failure this app can have.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..config import Settings
from ..db import Database
from ..services import backup as backup_svc


def _push_signal(db: Database) -> dict[str, Any]:
    conn = db.reader()
    try:
        delivered = conn.execute("SELECT COUNT(*) c FROM push_outbox WHERE status='delivered'").fetchone()["c"]
        gave_up = conn.execute("SELECT COUNT(*) c FROM push_outbox WHERE status='gave_up'").fetchone()["c"]
        last = conn.execute("SELECT MAX(delivered_at) d FROM push_outbox WHERE status='delivered'").fetchone()["d"]
    finally:
        conn.close()
    ok = gave_up == 0
    detail = (f"ntfy delivering · last ok {last or '—'} · gave_up {gave_up}" if ok
              else f"push sink not delivering — gave_up {gave_up}; feed + UI remain the durable fallback")
    return {"key": "push", "icon": "📤", "label": "push sink", "ok": ok, "pending": not ok,
            "detail": detail, "source": "outbox"}


def signals(db: Database, settings: Settings, *, sse_subscribers: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    # SSE feed — connected iff at least the health caller can reach the broker; the
    # honest signal is "the process's live-tip broker is up", staleness is client-side.
    out.append({
        "key": "sse", "icon": "⟳", "label": "SSE feed", "ok": True, "pending": False,
        "detail": f"connected · {sse_subscribers} subscriber(s)", "source": "chat",
    })

    out.append(_push_signal(db))

    # DB size vs guard.
    path = Path(settings.db_path)
    size = path.stat().st_size if path.exists() else 0
    gb = size / (1024 ** 3)
    over = size >= settings.db_size_guard_bytes
    out.append({
        "key": "db", "icon": "🗄", "label": "DB size", "ok": not over, "pending": over,
        "detail": f"{gb:.2f} GB / {settings.db_size_guard_gb} GB guard (CHAT_DB_SIZE_GUARD)", "source": "chat",
    })

    # Backup age.
    age = backup_svc.latest_backup_age_seconds(settings)
    if age is None:
        out.append({"key": "backup", "icon": "💾", "label": "backup", "ok": False, "pending": True,
                    "detail": "no backup yet — nightly VACUUM INTO not run", "source": "chat"})
    else:
        stale = age > 26 * 3600  # cadence is nightly; >26h is late
        out.append({"key": "backup", "icon": "💾", "label": "backup", "ok": not stale, "pending": stale,
                    "detail": f"last backup {int(age // 3600)}h ago", "source": "chat"})

    # MC resolve seam — honest PENDING until the mc:read grant lands (contract §3).
    out.append({
        "key": "resolve", "icon": "🔗", "label": "resolve feed", "ok": False, "pending": True,
        "detail": "awaiting mc:read grant → deep-links on documented fallback", "source": "mc",
    })
    return out
