"""Push outbox worker (PLAN §1.4/§8/§11.2) — at-least-once ntfy delivery.

Delivery is **at-least-once with the SSE feed + UI as the durable fallback**: a
failed push never loses a notification. ``gave_up`` (after capped exponential
backoff, ~1h) surfaces in the Health strip. Un-acked ``escalation`` rows re-push at
most every ``escalation_repush_seconds`` (<=15 min) — a bounded nag, not silence
(PLAN §11.2); acking stops it.

This worker never touches identity: it reads Chat's own tables and asks
:mod:`app.services.ntfy` to format+POST a push. ntfy holds no auth logic.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta

from ..clock import now_dt, now_iso, to_iso
from ..config import Settings
from ..db import Database
from ..services import ntfy
from ..services.deep_links import derive as derive_deep_link
from ..services.repo import Repository

log = logging.getLogger("chat.outbox")


class OutboxWorker:
    def __init__(self, db: Database, settings: Settings, repo: Repository) -> None:
        self.db = db
        self.settings = settings
        self.repo = repo
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    def start(self) -> None:
        self._task = asyncio.ensure_future(self._run())

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                await asyncio.to_thread(self._rearm_escalations)
                await self._drain_once()
            except Exception:  # noqa: BLE001 — a worker must never die on one bad row
                log.exception("outbox tick failed")
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass

    def _rearm_escalations(self) -> None:
        """Re-queue un-acked escalations whose last push is older than the cadence."""
        if not self.settings.ntfy_enabled:
            return
        cutoff = to_iso(now_dt() - timedelta(seconds=self.settings.escalation_repush_seconds))
        with self.db.write_lock:
            conn = self.db.writer
            with conn:
                conn.execute(
                    "UPDATE push_outbox SET status='pending', next_attempt_at=? "
                    "WHERE notification_id IN ("
                    "  SELECT n.notification_id FROM notifications n JOIN push_outbox o "
                    "  ON n.notification_id=o.notification_id "
                    "  WHERE n.kind='escalation' AND n.acked_at IS NULL "
                    "    AND (n.last_pushed_at IS NULL OR n.last_pushed_at < ?) "
                    "    AND o.status='delivered')",
                    (now_iso(), cutoff),
                )

    async def _drain_once(self) -> None:
        if not self.settings.ntfy_enabled:
            return
        rows = await asyncio.to_thread(self._claim_due)
        for nid, kind, title, priority, ss, sk, sid in rows:
            deep = derive_deep_link(ss, sk, sid, suite_domain=self.settings.suite_domain)
            click = deep.url if deep else None
            try:
                await asyncio.to_thread(
                    ntfy.publish, self.settings.ntfy_url, self.settings.ntfy_topic,
                    self.settings.ntfy_token, title=title, kind=kind,
                    priority=priority, click_url=click,
                )
                await asyncio.to_thread(self._mark_delivered, nid)
            except Exception as exc:  # noqa: BLE001
                await asyncio.to_thread(self._mark_failed, nid, str(exc))

    def _claim_due(self) -> list[tuple]:
        now = now_iso()
        conn = self.db.reader()
        try:
            rows = conn.execute(
                "SELECT n.notification_id, n.kind, n.title, n.priority, "
                "       n.source_system, n.source_kind, n.source_id "
                "FROM push_outbox o JOIN notifications n ON o.notification_id=n.notification_id "
                "WHERE o.status='pending' AND (o.next_attempt_at IS NULL OR o.next_attempt_at<=?) "
                "  AND o.attempts < ? "
                "ORDER BY n.priority DESC, o.notification_id ASC LIMIT 20",
                (now, self.settings.ntfy_max_attempts),
            ).fetchall()
        finally:
            conn.close()
        return [tuple(r) for r in rows]

    def _mark_delivered(self, nid: str) -> None:
        ts = now_iso()
        with self.db.write_lock:
            conn = self.db.writer
            with conn:
                # attempts is RESET to 0 on success: the ntfy_max_attempts cap bounds only
                # CONSECUTIVE FAILURES (→ gave_up), never lifetime re-pushes. An un-acked
                # escalation therefore keeps re-pushing on cadence forever until acked —
                # "silence requires ack" (PLAN §11.2), not "silence after N nags".
                conn.execute(
                    "UPDATE push_outbox SET status='delivered', attempts=0, "
                    "last_attempt_at=?, delivered_at=? WHERE notification_id=?",
                    (ts, ts, nid),
                )
                conn.execute("UPDATE notifications SET last_pushed_at=? WHERE notification_id=?", (ts, nid))
            self.repo._audit(conn, "svc:chat", "push_delivered", nid, None)

    def _mark_failed(self, nid: str, detail: str) -> None:
        ts = now_dt()
        with self.db.write_lock:
            conn = self.db.writer
            row = conn.execute("SELECT attempts FROM push_outbox WHERE notification_id=?", (nid,)).fetchone()
            attempts = (row["attempts"] if row else 0) + 1
            backoff = min(3600, 5 * (2 ** min(attempts, 10)))  # capped exponential, ~1h ceiling
            next_at = to_iso(ts + timedelta(seconds=backoff))
            gave_up = attempts >= self.settings.ntfy_max_attempts
            with conn:
                conn.execute(
                    "UPDATE push_outbox SET status=?, attempts=?, last_attempt_at=?, next_attempt_at=? "
                    "WHERE notification_id=?",
                    ("gave_up" if gave_up else "pending", attempts, now_iso(), next_at, nid),
                )
            if gave_up:
                self.repo._audit(conn, "svc:chat", "push_failed", nid, detail)
