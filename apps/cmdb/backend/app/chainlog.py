"""The hash-chained ``policy_change_log`` (§6.3) — CANONICAL, append-only, tamper-evident.

Each row's ``hash`` covers the row content AND the previous row's hash, so any edit to a
past row breaks every subsequent hash. The chain is verifiable OUT-OF-BAND (the operator
reads ``git log`` on the REMOTE, never through the possibly-lying CMDB) — this module only
proves LOCAL integrity; the History UI carries the out-of-band verify banner.

The chain tip's ``git_commit`` is cross-checked against the repo HEAD on every boot (§1
boot-integrity): a mismatch means one store was rolled back independently ⇒ deny-all.
"""
from __future__ import annotations

import hashlib
import json

from .clock import now_iso

GENESIS_PREV = "0" * 64


def _row_hash(seq: int, prev_hash: str, ts: str, sub: str, jti: str | None,
             edit_kind: str, weakening: bool, diff_hash: str | None, git_commit: str) -> str:
    payload = json.dumps(
        {
            "seq": seq, "prev_hash": prev_hash, "ts": ts, "sub": sub, "jti": jti,
            "edit_kind": edit_kind, "weakening": bool(weakening),
            "diff_hash": diff_hash, "git_commit": git_commit,
        },
        separators=(",", ":"), sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def chain_tip(db) -> dict | None:
    conn = db.reader()
    try:
        row = conn.execute("SELECT * FROM policy_change_log ORDER BY seq DESC LIMIT 1").fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def append_chain(db, *, sub: str, jti: str | None, session: str | None, edit_kind: str,
                 weakening: bool, diff_hash: str | None, git_commit: str,
                 confirm_token_id: str | None) -> dict:
    """Append one row under the process write lock. Returns the new row."""
    with db.write_lock:
        conn = db.writer
        with conn:
            tip = conn.execute("SELECT seq, hash FROM policy_change_log ORDER BY seq DESC LIMIT 1").fetchone()
            seq = 0 if tip is None else int(tip["seq"]) + 1
            prev_hash = GENESIS_PREV if tip is None else str(tip["hash"])
            ts = now_iso()
            h = _row_hash(seq, prev_hash, ts, sub, jti, edit_kind, weakening, diff_hash, git_commit)
            conn.execute(
                "INSERT INTO policy_change_log(seq, prev_hash, hash, ts, sub, jti, session, "
                "edit_kind, weakening, diff_hash, git_commit, confirm_token_id) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (seq, prev_hash, h, ts, sub, jti, session, edit_kind, int(weakening),
                 diff_hash, git_commit, confirm_token_id),
            )
        return {"seq": seq, "prev_hash": prev_hash, "hash": h, "ts": ts, "sub": sub,
                "edit_kind": edit_kind, "weakening": weakening, "diff_hash": diff_hash,
                "git_commit": git_commit}


def verify_chain(db) -> tuple[bool, str]:
    """Recompute every hash in sequence. Returns (intact, reason)."""
    conn = db.reader()
    try:
        rows = conn.execute("SELECT * FROM policy_change_log ORDER BY seq ASC").fetchall()
    finally:
        conn.close()
    prev = GENESIS_PREV
    for i, r in enumerate(rows):
        if int(r["seq"]) != i:
            return False, f"seq gap at {i}"
        if str(r["prev_hash"]) != prev:
            return False, f"prev_hash break at seq {i}"
        expect = _row_hash(int(r["seq"]), str(r["prev_hash"]), str(r["ts"]), str(r["sub"]),
                           r["jti"], str(r["edit_kind"]), bool(r["weakening"]),
                           r["diff_hash"], str(r["git_commit"]))
        if expect != str(r["hash"]):
            return False, f"hash mismatch at seq {i}"
        prev = str(r["hash"])
    return True, "intact"
