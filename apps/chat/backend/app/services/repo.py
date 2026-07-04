"""Repository — the one data-access layer over the canonical SQLite (PLAN §1/§3/§11).

All writes go through :meth:`Repository` under the DB write lock (single-writer
discipline). The envelope + broadcast OUTPUT shapes are assembled here so the exact
JSON the UI and MCP consume is defined in one place. No DELETE/UPDATE of envelope
content exists — the only mutations are ack/revoke state + dedup collapse counters.
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from typing import Any

from ..clock import now_iso
from ..config import Settings
from ..db import Database
from ..ids import new_broadcast_id, new_notification_id
from ..schemas import clamp_priority
from ..security.hygiene import scan_for_secrets, validate_utf8
from ..security.sanitize import render_markdown
from .deep_links import derive as derive_deep_link
from .feed import FeedBroker

_SYSTEM_SUB = "svc:chat"


@dataclass(frozen=True)
class PostResult:
    notification_id: str
    status: str  # created | existing | deduped


def _agent_kind(sub: str) -> str:
    if sub.startswith("agent:"):
        return "agent"
    if sub.startswith("svc:"):
        return "service"
    return "operator"


class Repository:
    def __init__(self, db: Database, settings: Settings, broker: FeedBroker) -> None:
        self.db = db
        self.settings = settings
        self.broker = broker

    # -- serialization -------------------------------------------------------------
    def envelope(self, row: sqlite3.Row) -> dict[str, Any]:
        deep = derive_deep_link(
            row["source_system"], row["source_kind"], row["source_id"],
            suite_domain=self.settings.suite_domain,
        )
        return {
            "notification_id": row["notification_id"],
            "seq": row["seq"],
            "created_at": row["created_at"],
            "agent_id": row["agent_id"],
            "agent_kind": _agent_kind(row["agent_id"]),
            "kind": row["kind"],
            "priority": row["priority"],
            "title": row["title"],
            "body": row["body"],
            "body_html": render_markdown(row["body"]),
            "tags": json.loads(row["tags"] or "[]"),
            "ticket_id": row["ticket_id"],
            "fencing_token": row["fencing_token"],
            "source_system": row["source_system"],
            "source_kind": row["source_kind"],
            "source_id": row["source_id"],
            "deep_link": deep.as_dict() if deep else None,
            "repeat_count": row["repeat_count"],
            "last_seen_at": row["last_seen_at"],
            "system_authored": bool(row["system_authored"]),
            "acked_at": row["acked_at"],
            "acked_by": row["acked_by"],
            "resolved_at": row["resolved_at"],
            "resolved_source": row["resolved_source"],
        }

    def broadcast_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        now = now_iso()
        if row["revoked_at"]:
            state = "revoked"
        elif row["expires_at"] <= now:
            state = "expired"
        else:
            state = "active"
        return {
            "broadcast_id": row["broadcast_id"],
            "created_at": row["created_at"],
            "created_by": row["created_by"],
            "body": row["body"],
            "body_html": render_markdown(row["body"]),
            "priority": row["priority"],
            "expires_at": row["expires_at"],
            "revoked_at": row["revoked_at"],
            "revoked_by": row["revoked_by"],
            "state": state,
        }

    # -- notifications: write ------------------------------------------------------
    def post_notification(self, agent_id: str, data: dict[str, Any], *, system_authored: bool = False) -> PostResult:
        """Insert a notification, honoring op_id idempotency + dedup collapse.

        ``agent_id`` is stamped from the authenticated subject by the caller — it is
        NEVER read from ``data`` (spoofing closed by construction, PLAN §12).
        """
        title = data["title"]
        body = data["body"]
        tags = list(data.get("tags") or [])
        # Ingest hygiene (PLAN §11.4) — applies to system-authored rows too.
        for chunk in (title, body, " ".join(tags)):
            validate_utf8(chunk)
            scan_for_secrets(chunk)

        kind = data["kind"]
        priority = clamp_priority(kind, data.get("priority"))
        op_id = data["op_id"]
        dedup_key = data.get("dedup_key")
        ts = now_iso()

        with self.db.write_lock:
            conn = self.db.writer
            # (a) op_id idempotency (PLAN §11.1): a retry returns the existing id.
            existing = conn.execute(
                "SELECT notification_id FROM notifications WHERE agent_id=? AND op_id=?",
                (agent_id, op_id),
            ).fetchone()
            if existing:
                return PostResult(existing["notification_id"], "existing")

            # (b) dedup collapse (PLAN §11.2): same un-acked (agent_id, dedup_key)
            # bumps repeat_count + last_seen_at and returns the existing id.
            if dedup_key:
                dup = conn.execute(
                    "SELECT notification_id FROM notifications "
                    "WHERE agent_id=? AND dedup_key=? AND acked_at IS NULL",
                    (agent_id, dedup_key),
                ).fetchone()
                if dup:
                    with conn:
                        conn.execute(
                            "UPDATE notifications SET repeat_count=repeat_count+1, last_seen_at=? "
                            "WHERE notification_id=?",
                            (ts, dup["notification_id"]),
                        )
                    self._audit(conn, agent_id, "post", dup["notification_id"], "dedup_collapse")
                    self._publish_row(conn, dup["notification_id"])
                    return PostResult(dup["notification_id"], "deduped")

            nid = new_notification_id()
            try:
                with conn:
                    conn.execute(
                        "INSERT INTO notifications "
                        "(notification_id, created_at, agent_id, kind, priority, title, body, tags, "
                        " ticket_id, fencing_token, source_system, source_kind, source_id, dedup_key, "
                        " op_id, repeat_count, last_seen_at, system_authored) "
                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)",
                        (
                            nid, ts, agent_id, kind, priority, title, body, json.dumps(tags),
                            data.get("ticket_id"), data.get("fencing_token"),
                            data.get("source_system"), data.get("source_kind"), data.get("source_id"),
                            dedup_key, op_id, ts, 1 if system_authored else 0,
                        ),
                    )
                    conn.execute(
                        "INSERT INTO push_outbox (notification_id, status, next_attempt_at) VALUES (?, 'pending', ?)",
                        (nid, ts),
                    )
                self._audit(conn, agent_id, "post", nid, kind)
                self._publish_row(conn, nid)
                return PostResult(nid, "created")
            except sqlite3.IntegrityError:
                # Lost an op_id/dedup race under the lock (belt): return the winner.
                again = conn.execute(
                    "SELECT notification_id FROM notifications WHERE agent_id=? AND op_id=?",
                    (agent_id, op_id),
                ).fetchone()
                if again:
                    return PostResult(again["notification_id"], "existing")
                raise

    def post_system_notification(self, data: dict[str, Any]) -> PostResult:
        """A Chat-authored meta-notification (rate-limit notice, size-guard). Not
        attributed to any agent; capped at priority 3 (PLAN §11.3/§15.8)."""
        payload = dict(data)
        payload.setdefault("op_id", f"sys-{new_notification_id()}")
        payload["priority"] = min(3, clamp_priority(payload["kind"], payload.get("priority")))
        return self.post_notification(_SYSTEM_SUB, payload, system_authored=True)

    # -- notifications: read -------------------------------------------------------
    def list_notifications(
        self, *, kind: str | None = None, min_priority: int | None = None,
        agent_id: str | None = None, ticket_id: str | None = None,
        acked: bool | None = None, since: str | None = None, limit: int = 50,
    ) -> tuple[list[dict[str, Any]], str | None]:
        limit = max(1, min(200, limit))
        clauses: list[str] = []
        params: list[Any] = []
        if kind:
            clauses.append("kind = ?"); params.append(kind)
        if min_priority is not None:
            clauses.append("priority >= ?"); params.append(min_priority)
        if agent_id:
            clauses.append("agent_id = ?"); params.append(agent_id)
        if ticket_id:
            clauses.append("ticket_id = ?"); params.append(ticket_id)
        if acked is True:
            clauses.append("acked_at IS NOT NULL")
        elif acked is False:
            clauses.append("acked_at IS NULL")
        if since:
            row = self._seq_of(since)
            if row is not None:
                clauses.append("seq < ?"); params.append(row)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        conn = self.db.reader()
        try:
            rows = conn.execute(
                f"SELECT * FROM notifications{where} ORDER BY seq DESC LIMIT ?",
                (*params, limit + 1),
            ).fetchall()
        finally:
            conn.close()
        has_more = len(rows) > limit
        rows = rows[:limit]
        envelopes = [self.envelope(r) for r in rows]
        next_cursor = rows[-1]["notification_id"] if has_more and rows else None
        return envelopes, next_cursor

    def get_notification(self, notification_id: str) -> dict[str, Any] | None:
        conn = self.db.reader()
        try:
            row = conn.execute(
                "SELECT * FROM notifications WHERE notification_id = ?", (notification_id,)
            ).fetchone()
        finally:
            conn.close()
        return self.envelope(row) if row else None

    def replay_after(self, cursor: str | None, limit: int = 200) -> list[dict[str, Any]]:
        """History rows AFTER a cursor, oldest→newest (the SSE reconnect replay)."""
        conn = self.db.reader()
        try:
            if cursor:
                seq = self._seq_of(cursor)
                if seq is None:
                    return []  # too-old / unknown cursor → caller sends event: reset
                rows = conn.execute(
                    "SELECT * FROM notifications WHERE seq > ? ORDER BY seq ASC LIMIT ?", (seq, limit)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM notifications ORDER BY seq DESC LIMIT ?", (limit,)
                ).fetchall()
                rows = list(reversed(rows))
        finally:
            conn.close()
        return [self.envelope(r) for r in rows]

    def _seq_of(self, notification_id: str) -> int | None:
        conn = self.db.reader()
        try:
            row = conn.execute(
                "SELECT seq FROM notifications WHERE notification_id = ?", (notification_id,)
            ).fetchone()
        finally:
            conn.close()
        return row["seq"] if row else None

    # -- notifications: ack --------------------------------------------------------
    def ack(self, notification_id: str, actor_sub: str) -> dict[str, Any] | None:
        ts = now_iso()
        with self.db.write_lock:
            conn = self.db.writer
            row = conn.execute(
                "SELECT acked_at FROM notifications WHERE notification_id = ?", (notification_id,)
            ).fetchone()
            if row is None:
                return None
            if row["acked_at"] is None:
                with conn:
                    conn.execute(
                        "UPDATE notifications SET acked_at=?, acked_by=? WHERE notification_id=? AND acked_at IS NULL",
                        (ts, actor_sub, notification_id),
                    )
                self._audit(conn, actor_sub, "ack", notification_id, None)
            fresh = conn.execute(
                "SELECT notification_id, acked_at, acked_by FROM notifications WHERE notification_id = ?",
                (notification_id,),
            ).fetchone()
        result = {"notification_id": fresh["notification_id"], "acked_at": fresh["acked_at"], "acked_by": fresh["acked_by"]}
        self.broker.publish("ack", notification_id, result)
        return result

    def batch_ack(self, up_to_seq: int, kind: str | None, actor_sub: str) -> int:
        ts = now_iso()
        with self.db.write_lock:
            conn = self.db.writer
            params: list[Any] = [ts, actor_sub, up_to_seq]
            extra = ""
            if kind:
                extra = " AND kind = ?"; params.append(kind)
            with conn:
                cur = conn.execute(
                    f"UPDATE notifications SET acked_at=?, acked_by=? "
                    f"WHERE acked_at IS NULL AND seq <= ?{extra}",
                    params,
                )
                count = cur.rowcount
            self._audit(conn, actor_sub, "ack", None, f"batch up_to_seq={up_to_seq} kind={kind} n={count}")
        if count:
            self.broker.publish("ack", f"batch-{up_to_seq}", {"batch": True, "up_to_seq": up_to_seq, "acked_count": count})
        return count

    # -- broadcasts ----------------------------------------------------------------
    def create_broadcast(self, created_by: str, body: str, priority: int, expires_at: str) -> dict[str, Any]:
        validate_utf8(body)
        scan_for_secrets(body)
        ts = now_iso()
        bid = new_broadcast_id()
        with self.db.write_lock:
            conn = self.db.writer
            with conn:
                conn.execute(
                    "INSERT INTO broadcasts (broadcast_id, created_at, created_by, body, priority, expires_at) "
                    "VALUES (?,?,?,?,?,?)",
                    (bid, ts, created_by, body, priority, expires_at),
                )
            self._audit(conn, created_by, "broadcast", bid, None)
            row = conn.execute("SELECT * FROM broadcasts WHERE broadcast_id = ?", (bid,)).fetchone()
        result = self.broadcast_dict(row)
        self.broker.publish("broadcast", bid, result)
        return result

    def revoke_broadcast(self, broadcast_id: str, actor_sub: str) -> dict[str, Any] | None:
        ts = now_iso()
        with self.db.write_lock:
            conn = self.db.writer
            row = conn.execute("SELECT revoked_at FROM broadcasts WHERE broadcast_id = ?", (broadcast_id,)).fetchone()
            if row is None:
                return None
            if row["revoked_at"] is None:
                with conn:
                    conn.execute(
                        "UPDATE broadcasts SET revoked_at=?, revoked_by=? WHERE broadcast_id=? AND revoked_at IS NULL",
                        (ts, actor_sub, broadcast_id),
                    )
                self._audit(conn, actor_sub, "broadcast_revoke", broadcast_id, None)
            fresh = conn.execute("SELECT * FROM broadcasts WHERE broadcast_id = ?", (broadcast_id,)).fetchone()
        result = self.broadcast_dict(fresh)
        self.broker.publish("broadcast", broadcast_id, result)
        return result

    def list_broadcasts(self, *, active_only: bool = False, limit: int = 100) -> list[dict[str, Any]]:
        conn = self.db.reader()
        try:
            rows = conn.execute("SELECT * FROM broadcasts ORDER BY seq DESC LIMIT ?", (limit,)).fetchall()
        finally:
            conn.close()
        out = [self.broadcast_dict(r) for r in rows]
        if active_only:
            out = [b for b in out if b["state"] == "active"]
        return out

    # -- audit ---------------------------------------------------------------------
    def _audit(self, conn: sqlite3.Connection, actor_sub: str, action: str,
               object_id: str | None, detail: str | None) -> None:
        with conn:
            conn.execute(
                "INSERT INTO audit_log (at, actor_sub, action, object_id, detail) VALUES (?,?,?,?,?)",
                (now_iso(), actor_sub, action, object_id, detail),
            )

    def audit(self, actor_sub: str, action: str, object_id: str | None = None, detail: str | None = None) -> None:
        with self.db.write_lock:
            self._audit(self.db.writer, actor_sub, action, object_id, detail)

    def audit_trail(self, notification_id: str) -> list[dict[str, Any]]:
        conn = self.db.reader()
        try:
            rows = conn.execute(
                "SELECT at, actor_sub, action, detail FROM audit_log WHERE object_id = ? ORDER BY seq ASC",
                (notification_id,),
            ).fetchall()
        finally:
            conn.close()
        return [dict(r) for r in rows]

    # -- feed publish helper -------------------------------------------------------
    def _publish_row(self, conn: sqlite3.Connection, notification_id: str) -> None:
        row = conn.execute("SELECT * FROM notifications WHERE notification_id = ?", (notification_id,)).fetchone()
        if row is not None:
            self.broker.publish("notification", notification_id, self.envelope(row))

    # -- counts (health / rate limiting) -------------------------------------------
    def count_posts_since(self, agent_id: str, since_iso: str, kind: str | None = None) -> int:
        conn = self.db.reader()
        try:
            if kind:
                row = conn.execute(
                    "SELECT COUNT(*) c FROM notifications WHERE agent_id=? AND created_at>=? AND kind=?",
                    (agent_id, since_iso, kind),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT COUNT(*) c FROM notifications WHERE agent_id=? AND created_at>=?",
                    (agent_id, since_iso),
                ).fetchone()
        finally:
            conn.close()
        return int(row["c"])

    def feed_counts(self) -> dict[str, int]:
        conn = self.db.reader()
        try:
            total = conn.execute("SELECT COUNT(*) c FROM notifications").fetchone()["c"]
            unacked = conn.execute("SELECT COUNT(*) c FROM notifications WHERE acked_at IS NULL").fetchone()["c"]
        finally:
            conn.close()
        return {"total": int(total), "unacked": int(unacked)}
