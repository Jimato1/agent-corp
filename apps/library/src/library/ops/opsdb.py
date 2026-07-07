"""library.ops.opsdb — ops.db (CANONICAL): idempotency + Z1.4 switching + jobs.

Restore-consistency rule (PLAN §1.4 finding F8/restore): on any restore where ops.db
is lost or older than the corpus, the sampling switch resets to TIGHTENED (100% audit)
until the operator clears it — a restore can only make auditing STRICTER, never looser.
That rule is realized by making `tightened` the DEFAULT when the row is absent.
"""
from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class IdempotentResult:
    replayed: bool
    status: int
    body: dict


class OpsDB:
    def __init__(self, path: str):
        self.path = path
        self._conn: Optional[sqlite3.Connection] = None

    def connect(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self.path)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def create_schema(self) -> None:
        conn = self.connect()
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS idempotency (
              op_id TEXT PRIMARY KEY, sub TEXT, route TEXT,
              state TEXT,            -- in_progress | done
              status INTEGER, body TEXT, created REAL);
            CREATE TABLE IF NOT EXISTS switching (
              k TEXT PRIMARY KEY, v TEXT);
            CREATE TABLE IF NOT EXISTS jobs (
              id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, state TEXT,
              detail TEXT, started REAL, finished REAL);
            """
        )
        conn.commit()

    # ── op_id idempotency (IDENTIFIERS.md: replays collapse to the prior result) ─
    def begin(self, op_id: str, sub: str, route: str) -> Optional[IdempotentResult]:
        """Claim an op_id. Returns None if newly claimed (caller proceeds); returns a
        prior result if already done; raises via a sentinel 'in_progress' if a claim
        is still running (caller returns 409)."""
        conn = self.connect()
        row = conn.execute("SELECT * FROM idempotency WHERE op_id=?", (op_id,)).fetchone()
        if row is not None:
            if row["state"] == "done":
                return IdempotentResult(True, row["status"], json.loads(row["body"]))
            return IdempotentResult(True, 409, {"error": "in_progress", "op_id": op_id})
        conn.execute(
            "INSERT INTO idempotency(op_id,sub,route,state,status,body,created) "
            "VALUES(?,?,?,'in_progress',0,'',?)", (op_id, sub, route, time.time()))
        conn.commit()
        return None

    def complete(self, op_id: str, status: int, body: dict) -> None:
        conn = self.connect()
        conn.execute(
            "UPDATE idempotency SET state='done', status=?, body=? WHERE op_id=?",
            (status, json.dumps(body), op_id))
        conn.commit()

    def abort(self, op_id: str) -> None:
        conn = self.connect()
        conn.execute("DELETE FROM idempotency WHERE op_id=?", (op_id,))
        conn.commit()

    # ── Z1.4 switching state (fail-stricter on restore) ────────────────────────
    def switching_state(self) -> str:
        conn = self.connect()
        row = conn.execute("SELECT v FROM switching WHERE k='mode'").fetchone()
        # ABSENT ⇒ tightened (restore can only make auditing stricter — PLAN §1.4)
        return row["v"] if row else "tightened"

    def set_switching(self, mode: str, reason: str = "") -> None:
        assert mode in ("normal", "tightened")
        conn = self.connect()
        conn.execute("INSERT INTO switching(k,v) VALUES('mode',?) "
                     "ON CONFLICT(k) DO UPDATE SET v=excluded.v", (mode,))
        conn.execute("INSERT INTO switching(k,v) VALUES('reason',?) "
                     "ON CONFLICT(k) DO UPDATE SET v=excluded.v", (reason,))
        conn.commit()

    def switching_reason(self) -> str:
        conn = self.connect()
        row = conn.execute("SELECT v FROM switching WHERE k='reason'").fetchone()
        return row["v"] if row else "default (post-restore fail-stricter)"

    # ── job history ─────────────────────────────────────────────────────────────
    def record_job(self, kind: str, state: str, detail: dict) -> int:
        conn = self.connect()
        cur = conn.execute(
            "INSERT INTO jobs(kind,state,detail,started,finished) VALUES(?,?,?,?,?)",
            (kind, state, json.dumps(detail), time.time(),
             time.time() if state in ("done", "failed") else None))
        conn.commit()
        return cur.lastrowid

    def last_job(self, kind: str) -> Optional[dict]:
        conn = self.connect()
        row = conn.execute(
            "SELECT * FROM jobs WHERE kind=? ORDER BY id DESC LIMIT 1", (kind,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["detail"] = json.loads(d["detail"]) if d["detail"] else {}
        return d

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None
