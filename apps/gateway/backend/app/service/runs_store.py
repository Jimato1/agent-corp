"""The ``runs`` table: one row per run_id (R-ULID), INSERT + state-CAS UPDATE only (§2).

Legal state transitions (PLAN §2 state set) are guarded here (a trigger enforces them at the
DB level in production; the app is the belt). Terminal outcomes are spec-conformant (§6.5):
the Gateway reports only ``executing → verifying`` (external verifier), ``→ needs_review``
(no verifier), ``→ failed`` (failure/halt/rollback — **a killed run is failed, never
cancelled**). ``rejected`` is a preflight that never dispatched.
"""
from __future__ import annotations

from ..clock import now_iso

# state ∈ preflight|executing|health_check|rolling_back|reporting|done_reported|
#         failed_reported|halted|orphaned|rejected
_LEGAL = {
    "preflight": {"executing", "rejected", "failed_reported", "halted"},
    "executing": {"health_check", "rolling_back", "reporting", "failed_reported", "halted", "orphaned"},
    "health_check": {"reporting", "rolling_back", "failed_reported"},
    "rolling_back": {"reporting", "failed_reported"},
    "reporting": {"done_reported", "failed_reported"},
    "halted": {"failed_reported"},
    "orphaned": {"reporting", "failed_reported"},
}


class RunsStore:
    def __init__(self, db) -> None:
        self.db = db

    def create(self, *, run_id: str, host_id: str, caller_sub: str, op_id: str | None,
               surface: str, ticket_id: str | None = None) -> None:
        with self.db.tx() as c:
            c.execute(
                "INSERT INTO runs(run_id, ticket_id, host_id, caller_sub, op_id, surface, state, updated_at) "
                "VALUES (?,?,?,?,?,?, 'preflight', ?)",
                (run_id, ticket_id, host_id, caller_sub, op_id, surface, now_iso()),
            )

    def get(self, run_id: str) -> dict | None:
        c = self.db.reader()
        try:
            c.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,))
            return c.fetchone()
        finally:
            c.close()

    def list(self, *, state: str | None = None, host_id: str | None = None, limit: int = 200) -> list[dict]:
        c = self.db.reader()
        try:
            sql = "SELECT * FROM runs"
            params: list = []
            clauses = []
            if state == "active":
                clauses.append("state IN ('preflight','executing','health_check','rolling_back','reporting')")
            elif state:
                clauses.append("state = ?")
                params.append(state)
            if host_id:
                clauses.append("host_id = ?")
                params.append(host_id)
            if clauses:
                sql += " WHERE " + " AND ".join(clauses)
            sql += " ORDER BY updated_at DESC LIMIT ?"
            params.append(limit)
            c.execute(sql, tuple(params))
            return c.fetchall()
        finally:
            c.close()

    def set_fields(self, run_id: str, **fields) -> None:
        if not fields:
            return
        fields["updated_at"] = now_iso()
        cols = ", ".join(f"{k} = ?" for k in fields)
        with self.db.tx() as c:
            c.execute(f"UPDATE runs SET {cols} WHERE run_id = ?", (*fields.values(), run_id))

    def transition(self, run_id: str, to_state: str, **fields) -> None:
        """State-CAS UPDATE guarded by the legal-transition table (belt over the DB trigger)."""
        cur = self.get(run_id)
        if cur is None:
            raise ValueError(f"no such run {run_id}")
        frm = cur["state"]
        if to_state != frm and to_state not in _LEGAL.get(frm, set()):
            raise ValueError(f"illegal run transition {frm} -> {to_state}")
        self.set_fields(run_id, state=to_state, **fields)

    def reject(self, run_id: str, reason: str) -> None:
        self.transition(run_id, "rejected", reject_reason=reason, finished_at=now_iso())

    def bump_fence(self, host_id: str, fence: int) -> None:
        """Record the highest generation executed per host (monotonic; a decrease is refused)."""
        with self.db.tx() as c:
            c.execute("SELECT fence FROM host_fence WHERE host_id = ?", (host_id,))
            row = c.fetchone()
            if row is None:
                c.execute("INSERT INTO host_fence(host_id, fence, updated_at) VALUES (?,?,?)",
                          (host_id, fence, now_iso()))
            elif fence > int(row["fence"]):
                c.execute("UPDATE host_fence SET fence = ?, updated_at = ? WHERE host_id = ?",
                          (fence, now_iso(), host_id))

    def current_fence(self, host_id: str) -> int:
        c = self.db.reader()
        try:
            c.execute("SELECT fence FROM host_fence WHERE host_id = ?", (host_id,))
            row = c.fetchone()
            return int(row["fence"]) if row else 0
        finally:
            c.close()
