"""The append-only, hash-chained, Ed25519-signed ``audit_chain`` (§9) — CANONICAL.

``record_hash = SHA-256(canonical(fields) || prev_hash)`` so any edit to a past row breaks
every subsequent hash; ``sig`` is the Gateway's Ed25519 signature over ``record_hash``. The
chain proves internal consistency; **freshness is proven off-box** by anchoring signed HEADs
to MC (``anchor/pusher.py``) somewhere the Gateway host cannot rewrite (contract §1).

**Every rejection is a first-class chained record** — rejections are the hostile-model
telemetry MC watches (PLAN §1). **Audit-write failure halts new dispatch** (fail-closed on
auditability, same posture as Vault D-16a) — enforced by the dispatcher, which treats an
``append()`` exception as a halt condition.
"""
from __future__ import annotations

import hashlib
import json

from ..clock import now_iso

GENESIS_PREV = "0" * 64

# A fixed advisory-lock key that serialises append/checkpoint on the Postgres backend, so the
# read-max-then-+1 seq allocation is race-free under concurrent multi-host dispatch (the
# Gateway's normal fleet-patching mode). SQLite serialises via the process write-lock instead.
_CHAIN_LOCK_KEY = 0x6757_4348_4149_4E01  # "gwCHAIN\x01"


def _serialise(db, c) -> None:
    if db.backend == "postgres":
        c.execute("SELECT pg_advisory_xact_lock(?)", (_CHAIN_LOCK_KEY,))


def _canonical(fields: dict) -> bytes:
    return json.dumps(fields, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _record_hash(seq: int, chain_id: str, prev_hash: str, rec: dict) -> str:
    payload = _canonical({
        "seq": seq, "chain_id": chain_id, "prev_hash": prev_hash,
        "run_id": rec.get("run_id"), "record_type": rec["record_type"],
        "actor_sub": rec.get("actor_sub"), "action": rec.get("action"),
        "target": rec.get("target"), "outcome": rec.get("outcome"),
        "payload": rec.get("payload", {}), "ts": rec["ts"],
    })
    return hashlib.sha256(payload).hexdigest()


class AuditChain:
    def __init__(self, db, signer, chain_id: str) -> None:
        self.db = db
        self.signer = signer
        self.chain_id = chain_id

    def append(self, *, record_type: str, run_id: str | None = None, actor_sub: str | None = None,
               action: str | None = None, target: str | None = None, outcome: str | None = None,
               payload: dict | None = None) -> dict:
        """Append one record atomically (seq allocation + hash + sign + insert). Returns the row.

        NOTE payload MUST already be free of plaintext credentials (handle + HMAC only, §9).
        """
        ts = now_iso()
        rec = {"record_type": record_type, "run_id": run_id, "actor_sub": actor_sub,
               "action": action, "target": target, "outcome": outcome, "payload": payload or {}, "ts": ts}
        with self.db.tx() as c:
            _serialise(self.db, c)   # race-free seq allocation on Postgres (no-op on SQLite)
            c.execute("SELECT seq, record_hash FROM audit_chain ORDER BY seq DESC LIMIT 1")
            tip = c.fetchone()
            seq = 0 if tip is None else int(tip["seq"]) + 1
            prev_hash = GENESIS_PREV if tip is None else str(tip["record_hash"])
            rhash = _record_hash(seq, self.chain_id, prev_hash, rec)
            sig = self.signer.sign(rhash.encode("ascii"))
            c.execute(
                "INSERT INTO audit_chain(seq, chain_id, run_id, record_type, actor_sub, action, "
                "target, outcome, payload, prev_hash, record_hash, sig, ts) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (seq, self.chain_id, run_id, record_type, actor_sub, action, target, outcome,
                 json.dumps(rec["payload"], separators=(",", ":"), sort_keys=True),
                 prev_hash, rhash, sig, ts),
            )
        return {"seq": seq, "chain_id": self.chain_id, "record_hash": rhash, "prev_hash": prev_hash,
                "sig": sig, "ts": ts, "record_type": record_type, "run_id": run_id}

    def head(self) -> dict | None:
        c = self.db.reader()
        try:
            c.execute("SELECT seq, record_hash FROM audit_chain WHERE chain_id = ? ORDER BY seq DESC LIMIT 1",
                      (self.chain_id,))
            row = c.fetchone()
            return {"head_seq": int(row["seq"]), "head_hash": str(row["record_hash"])} if row else None
        finally:
            c.close()

    def verify(self, from_seq: int = 0) -> tuple[bool, str, int, int]:
        """Recompute every hash + signature from ``from_seq``. Returns (intact, reason, lo, hi).

        A stale/failed verify NEVER renders green (UI_SPEC §6): the caller distinguishes
        ``intact`` (green) from CANNOT-CONFIRM (store error) from BROKEN (a real hash/sig break).
        """
        c = self.db.reader()
        try:
            c.execute("SELECT * FROM audit_chain WHERE chain_id = ? AND seq >= ? ORDER BY seq ASC",
                      (self.chain_id, from_seq))
            rows = c.fetchall()
        finally:
            c.close()
        if not rows:
            return True, "empty", from_seq, from_seq
        prev = GENESIS_PREV if from_seq == 0 else None
        lo = int(rows[0]["seq"])
        for r in rows:
            rec = {"record_type": r["record_type"], "run_id": r["run_id"], "actor_sub": r["actor_sub"],
                   "action": r["action"], "target": r["target"], "outcome": r["outcome"],
                   "payload": json.loads(r["payload"]) if isinstance(r["payload"], str) else r["payload"],
                   "ts": r["ts"]}
            if prev is not None and str(r["prev_hash"]) != prev:
                return False, f"prev_hash break at seq {r['seq']}", lo, int(r["seq"])
            expect = _record_hash(int(r["seq"]), self.chain_id, str(r["prev_hash"]), rec)
            if expect != str(r["record_hash"]):
                return False, f"hash mismatch at seq {r['seq']}", lo, int(r["seq"])
            if not self.signer.verify(str(r["record_hash"]).encode("ascii"), str(r["sig"])):
                return False, f"signature break at seq {r['seq']}", lo, int(r["seq"])
            prev = str(r["record_hash"])
        return True, "intact", lo, int(rows[-1]["seq"])

    def checkpoint(self) -> dict | None:
        """Sign and persist a HEAD checkpoint (the freshness proof pushed to MC). Idempotent by head_seq."""
        h = self.head()
        if h is None:
            return None
        signed_at = now_iso()
        sig = self.signer.sign(f"{self.chain_id}:{h['head_seq']}:{h['head_hash']}".encode("ascii"))
        with self.db.tx() as c:
            _serialise(self.db, c)
            c.execute("SELECT head_seq FROM chain_heads WHERE chain_id = ? ORDER BY head_seq DESC LIMIT 1",
                      (self.chain_id,))
            last = c.fetchone()
            if last is not None and int(last["head_seq"]) >= h["head_seq"]:
                return {**h, "chain_id": self.chain_id, "sig": sig, "signed_at": signed_at, "reused": True}
            c.execute("INSERT INTO chain_heads(chain_id, head_seq, head_hash, sig, signed_at) VALUES (?,?,?,?,?)",
                      (self.chain_id, h["head_seq"], h["head_hash"], sig, signed_at))
        return {**h, "chain_id": self.chain_id, "sig": sig, "signed_at": signed_at, "reused": False}
