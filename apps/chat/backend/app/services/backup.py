"""Backup + size guard (PLAN §9; ARCH §10 — the Chat DB is CANONICAL).

* **Backup:** nightly ``VACUUM INTO`` a dated snapshot (WAL-safe, a consistent copy),
  keeping 30 dailies + 12 monthlies locally; the backups dir joins the operator's
  off-box sync. ntfy tokens are env/config, not DB — restore needs no secret material.
* **Retention guard (not prune):** a weekly size check; DB over the guard posts a
  ``needs_review`` recommending a ratified archival policy. Machinery to prune is
  deliberately NOT built in v1 — the guard firing forces the decision instead of
  silent drift.
* **Restore-consistency:** Chat restores standalone. Every row is a pointer +
  stale-snapshot (target wins), so a Chat restored to T-1 breaks no cross-app
  invariant. Drilled at Stage-7, not asserted.
"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from ..config import Settings
from ..db import Database
from ..services.repo import Repository

log = logging.getLogger("chat.backup")


def run_backup(db: Database, settings: Settings, *, day: datetime) -> Path:
    """Write a consistent snapshot via ``VACUUM INTO`` and return its path."""
    backup_dir = Path(settings.backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    target = backup_dir / f"chat-{day.strftime('%Y%m%d')}.sqlite3"
    with db.write_lock:
        # VACUUM INTO produces a clean, fully-checkpointed copy regardless of WAL state.
        db.writer.execute("VACUUM INTO ?", (str(target),))
    _prune(backup_dir)
    return target


def _prune(backup_dir: Path, keep_daily: int = 30, keep_monthly: int = 12) -> None:
    snaps = sorted(backup_dir.glob("chat-*.sqlite3"), reverse=True)
    keep: set[Path] = set(snaps[:keep_daily])
    seen_months: set[str] = set()
    for p in snaps:
        month = p.stem.split("chat-")[-1][:6]
        if month not in seen_months and len(seen_months) < keep_monthly:
            seen_months.add(month)
            keep.add(p)
    for p in snaps:
        if p not in keep:
            with __import__("contextlib").suppress(OSError):
                p.unlink()


def check_size_guard(db: Database, settings: Settings, repo: Repository) -> bool:
    """If the DB exceeds the guard, post a ``needs_review`` and return True."""
    path = Path(settings.db_path)
    if not path.exists():
        return False
    size = path.stat().st_size
    if size < settings.db_size_guard_bytes:
        return False
    gb = size / (1024 ** 3)
    repo.post_system_notification({
        "kind": "needs_review",
        "title": "Chat DB exceeded its size guard",
        "body": (f"The canonical Chat store reached **{gb:.2f} GB**, over the "
                 f"`CHAT_DB_SIZE_GUARD` of {settings.db_size_guard_gb} GB. Retention is "
                 "indefinite by design; ratify an archival policy (export old rows to a "
                 "dated SQLite file in the backup set, then prune) — machinery is not "
                 "built until this fires."),
        "priority": 3,
        "dedup_key": "db-size-guard",
        "tags": ["retention"],
    })
    return True


def latest_backup_age_seconds(settings: Settings) -> float | None:
    backup_dir = Path(settings.backup_dir)
    snaps = sorted(backup_dir.glob("chat-*.sqlite3"), reverse=True)
    if not snaps:
        return None
    newest = max(p.stat().st_mtime for p in snaps)
    return max(0.0, datetime.now().timestamp() - newest)
