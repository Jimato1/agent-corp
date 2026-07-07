"""Local SQLite state (PLAN §9). The canonical durable spine is Board + Notes —
NEVER here. Most runtime state is operational/rebuildable; exactly two tables are
append-only audit and get a stated backup:

  * ``provenance_ledger`` — every model-load attempt (verified|refused). CANONICAL,
    append-only; MC mirrors it (C11), so restore-consistency = "ledger ⊇ display".
  * ``kill_epoch_log``    — every applied drain/kill command. CANONICAL, append-only,
    monotonic; a restore never lowers the persisted max epoch (§9 restore rule).

``custody_index`` stores sub→label/sealed/attest metadata ONLY — never key material
(the sealed blobs live in the tpm2-pkcs11 token store, ciphertext under the TPM).
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

from .provenance import ProvenanceRecord

SCHEMA = """
CREATE TABLE IF NOT EXISTS provenance_ledger (
    load_seq      INTEGER PRIMARY KEY AUTOINCREMENT,
    role          TEXT NOT NULL,
    model_id      TEXT NOT NULL,
    commit_digest TEXT NOT NULL,
    sha256        TEXT NOT NULL,
    sig_ref       TEXT NOT NULL,
    model_bom     TEXT NOT NULL,
    outcome       TEXT NOT NULL CHECK (outcome IN ('verified','refused')),
    quant         TEXT NOT NULL,
    ts            REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS kill_epoch_log (
    row_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch         INTEGER NOT NULL,
    mode          TEXT NOT NULL CHECK (mode IN ('drain','kill')),
    grace_deadline REAL,
    issued_by     TEXT NOT NULL,
    received_ts   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id    TEXT PRIMARY KEY,
    sub           TEXT,
    persona       TEXT,
    state         TEXT,
    started_ts    REAL
);

-- NEVER key material — only custody health metadata (UI §8 TPMSealStatus).
CREATE TABLE IF NOT EXISTS custody_index (
    sub           TEXT PRIMARY KEY,
    pkcs11_label  TEXT NOT NULL,
    sealed        INTEGER NOT NULL,     -- 1 = fixedTPM-sealed, 0 = soft-key
    attest_result TEXT NOT NULL,        -- 'certified' | 'unverified' | 'failed'
    is_executor   INTEGER NOT NULL,
    enrolled_ts   REAL
);
"""


class RuntimeDB:
    def __init__(self, path: str = ":memory:"):
        self.path = path
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    # ---- append-only ledgers ----------------------------------------------

    def append_provenance(self, rec: ProvenanceRecord) -> None:
        self._conn.execute(
            "INSERT INTO provenance_ledger "
            "(role,model_id,commit_digest,sha256,sig_ref,model_bom,outcome,quant,ts) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (rec.role, rec.model_id, rec.commit_digest, rec.sha256, rec.sig_ref,
             rec.model_bom, rec.outcome, rec.quant, rec.ts),
        )
        self._conn.commit()

    def provenance_ledger(self) -> list[dict]:
        cur = self._conn.execute("SELECT * FROM provenance_ledger ORDER BY load_seq")
        return [dict(r) for r in cur.fetchall()]

    def append_kill_epoch(self, event: dict) -> None:
        self._conn.execute(
            "INSERT INTO kill_epoch_log (epoch,mode,grace_deadline,issued_by,received_ts) "
            "VALUES (?,?,?,?,?)",
            (int(event["epoch"]), event["mode"], event.get("grace_deadline"),
             event["issued_by"], event["received_ts"]),
        )
        self._conn.commit()

    def max_kill_epoch(self) -> int:
        cur = self._conn.execute("SELECT COALESCE(MAX(epoch),0) AS m FROM kill_epoch_log")
        return int(cur.fetchone()["m"])

    # ---- operational tables ------------------------------------------------

    def upsert_custody(self, *, sub: str, label: str, sealed: bool, attest: str,
                       is_executor: bool, ts: float) -> None:
        self._conn.execute(
            "INSERT INTO custody_index (sub,pkcs11_label,sealed,attest_result,is_executor,enrolled_ts) "
            "VALUES (?,?,?,?,?,?) ON CONFLICT(sub) DO UPDATE SET "
            "pkcs11_label=excluded.pkcs11_label, sealed=excluded.sealed, "
            "attest_result=excluded.attest_result, is_executor=excluded.is_executor",
            (sub, label, int(sealed), attest, int(is_executor), ts),
        )
        self._conn.commit()

    def custody_counts(self) -> dict:
        cur = self._conn.execute(
            "SELECT SUM(sealed) AS sealed, SUM(1-sealed) AS soft, COUNT(*) AS total FROM custody_index"
        )
        r = cur.fetchone()
        return {"sealed": int(r["sealed"] or 0), "soft": int(r["soft"] or 0), "total": int(r["total"] or 0)}

    def close(self) -> None:
        self._conn.close()
