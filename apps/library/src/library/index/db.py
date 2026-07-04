"""library.index.db — the rebuildable index.db (FTS5 + vectors), a pure projection.

PLAN §1.3 schema, faithfully. Two design notes matching the suite's substitution
discipline (auth's "SQLite-now / Postgres-later behind one Protocol"):

  * VECTOR BACKEND. The PLAN specifies a `sqlite-vec` `vec0` virtual table. sqlite-vec
    is brute-force KNN (no ANN index — RESEARCH §1). We ship the PORTABLE equivalent:
    L2-normalized float32 vectors in a BLOB column with a pure-Python brute-force
    cosine top-K — identical brute-force *semantics*, zero native-extension
    dependency, so the hybrid pipeline and the rebuild proof run on any machine. The
    `vec0` table (PLAN DDL, in `VEC0_DDL`) is the production accelerator that drops in
    behind the same `vector_search()` call; selecting it is a load-extension config
    swap, not a rewrite.
  * FTS BACKEND. FTS5 when the sqlite build has it (the norm); a LIKE-based lexical
    fallback otherwise, flagged in index_meta. Either way BM25/lexical rank feeds RRF.

Hard invariants enforced here:
  * removals/demotions propagate SYNCHRONOUSLY (rejected/retired/superseded rows are
    deleted in the same call); only ADDITIONS may lag (PLAN §1.3 finding F3).
  * `rejected` docs are excluded UNCONDITIONALLY at build AND query time (F5).
  * no column holds data not derived from corpus frontmatter/bodies (F4).
"""
from __future__ import annotations

import array
import math
import os
import sqlite3
import struct
from dataclasses import dataclass
from typing import Any, Callable, Optional

from . import chunker as ck

# The production sqlite-vec DDL (PLAN §1.3) — dropped in when the extension loads.
VEC0_DDL = """
CREATE VIRTUAL TABLE chunks_vec USING vec0(
  embedding float[{dim}],
  tier TEXT PARTITION KEY, os_family TEXT PARTITION KEY,
  distro TEXT PARTITION KEY, major_version TEXT PARTITION KEY,
  +chunk_rowid INTEGER
);
"""


def _f32_blob(vec: list[float]) -> bytes:
    return array.array("f", vec).tobytes()


def _blob_f32(blob: bytes) -> list[float]:
    a = array.array("f")
    a.frombytes(blob)
    return list(a)


def l2_normalize(vec: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in vec))
    if n == 0:
        return list(vec)
    return [x / n for x in vec]


@dataclass
class BuildResult:
    corpus_commit: str
    model_id: str
    dim: int
    chunker_config_id: str
    doc_count: int
    chunk_count: int
    fts_backend: str
    vector_backend: str
    manifest_hash: str  # byte-identity anchor for the rebuild proof (PLAN §5.3 part 1)


# embed_fn(texts, input_type) -> (vectors, model_id, dim)
EmbedFn = Callable[[list[str], str], tuple[list[list[float]], str, int]]


class IndexDB:
    def __init__(self, path: str, dim: int):
        self.path = path
        self.dim = dim
        self._conn: Optional[sqlite3.Connection] = None
        self.fts_backend = "none"
        self.vector_backend = "blob-bruteforce"

    # ── connection / schema ────────────────────────────────────────────────────
    def connect(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self.path)
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA journal_mode=WAL")
        return self._conn

    def _has_fts5(self, conn: sqlite3.Connection) -> bool:
        try:
            conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS _fts_probe USING fts5(x)")
            conn.execute("DROP TABLE IF EXISTS _fts_probe")
            return True
        except sqlite3.OperationalError:
            return False

    def create_schema(self) -> None:
        conn = self.connect()
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS index_meta (
              k TEXT PRIMARY KEY, v TEXT);
            CREATE TABLE IF NOT EXISTS docs (
              doc_id TEXT PRIMARY KEY, title TEXT, collection TEXT, kind TEXT,
              tier TEXT, admission TEXT, status TEXT,
              lineage_key TEXT, last_verified TEXT, valid_until TEXT,
              primary_partition TEXT, pending_embed INTEGER DEFAULT 0,
              provenance_taint TEXT, content_sha256 TEXT);
            CREATE TABLE IF NOT EXISTS doc_targets (
              doc_id TEXT, os_family TEXT, distro TEXT, major_version TEXT, arch TEXT,
              lifecycle TEXT,
              PRIMARY KEY (doc_id, os_family, distro, major_version, arch));
            CREATE TABLE IF NOT EXISTS chunks (
              chunk_rowid INTEGER PRIMARY KEY,
              chunk_id TEXT UNIQUE, doc_id TEXT,
              heading_path TEXT, anchor TEXT,
              char_start INTEGER, char_end INTEGER, line_start INTEGER, line_end INTEGER,
              evidence_covered INTEGER DEFAULT 0, content_hash TEXT, text TEXT);
            CREATE TABLE IF NOT EXISTS chunk_vectors (
              chunk_rowid INTEGER PRIMARY KEY, doc_id TEXT,
              tier TEXT, os_family TEXT, distro TEXT, major_version TEXT,
              embedding BLOB);
            CREATE INDEX IF NOT EXISTS ix_chunks_doc ON chunks(doc_id);
            CREATE INDEX IF NOT EXISTS ix_targets_key
              ON doc_targets(os_family, distro, major_version, arch);
            """
        )
        if self._has_fts5(conn):
            cur.execute(
                "CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5("
                "text, heading_path, content='chunks', content_rowid='chunk_rowid')"
            )
            self.fts_backend = "fts5"
        else:
            self.fts_backend = "like"
        conn.commit()

    # ── meta ───────────────────────────────────────────────────────────────────
    def set_meta(self, **kv: Any) -> None:
        conn = self.connect()
        conn.executemany(
            "INSERT INTO index_meta(k,v) VALUES(?,?) "
            "ON CONFLICT(k) DO UPDATE SET v=excluded.v",
            [(k, str(v)) for k, v in kv.items()],
        )
        conn.commit()

    def get_meta(self, k: str) -> Optional[str]:
        conn = self.connect()
        row = conn.execute("SELECT v FROM index_meta WHERE k=?", (k,)).fetchone()
        return row["v"] if row else None

    # ── build / rebuild (the pure projection) ──────────────────────────────────
    def full_rebuild(self, docs: list, embed_fn: EmbedFn, *, corpus_commit: str,
                     covered_anchor_lookup: Optional[Callable[[str], set]] = None) -> BuildResult:
        """Destroy every projection table and rebuild from `docs` (corpus records).

        `docs` are corpus DocRecords. `embed_fn` is the agent-runtime facade client
        (or a deterministic fake in tests). `covered_anchor_lookup(doc_id)` returns
        the set of gateway-attested covered anchors for chunk-level coverage (§2.4);
        None ⇒ no coverage (all chunks evidence_covered=0).
        """
        conn = self.connect()
        conn.executescript(
            "DELETE FROM docs; DELETE FROM doc_targets; DELETE FROM chunks; "
            "DELETE FROM chunk_vectors;"
        )
        if self.fts_backend == "fts5":
            conn.execute("DELETE FROM chunks_fts")

        model_id = ""
        dim = self.dim
        rowid = 0
        all_embed_texts: list[tuple[int, str]] = []  # (rowid, embed_text)
        manifest_parts: list[str] = []
        chunk_count = 0
        indexed_docs = 0

        for rec in docs:
            meta = rec.meta
            admission = meta.get("admission")
            status = meta.get("status", "current")
            # rejected docs are excluded UNCONDITIONALLY (F5); retired/superseded not served
            if admission == "rejected":
                continue
            if status in ("retired", "superseded"):
                # keep evidence in corpus; do not project into the served index
                continue
            indexed_docs += 1
            title = meta.get("title", rec.doc_id)
            kind = meta.get("kind", "prose-guide")
            primary = self.primary_partition(meta)
            conn.execute(
                "INSERT INTO docs(doc_id,title,collection,kind,tier,admission,status,"
                "lineage_key,last_verified,valid_until,primary_partition,pending_embed,"
                "provenance_taint,content_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (rec.doc_id, title, meta.get("collection"), kind, meta.get("tier"),
                 admission, status, meta.get("lineage_key"), meta.get("last_verified"),
                 meta.get("valid_until"), primary, 0, meta.get("provenance_taint"),
                 meta.get("content_sha256")),
            )
            for a in (meta.get("applies_to") or []):
                conn.execute(
                    "INSERT OR IGNORE INTO doc_targets("
                    "doc_id,os_family,distro,major_version,arch,lifecycle) VALUES(?,?,?,?,?,?)",
                    (rec.doc_id, a.get("os_family"), a.get("distro"), a.get("version"),
                     a.get("arch"), a.get("lifecycle")),
                )
            covered = covered_anchor_lookup(rec.doc_id) if covered_anchor_lookup else set()
            vscope = self._version_scope_label(meta)
            chunks = ck.chunk_document(title=title, version_scope=vscope, kind=kind, body=rec.body)
            first_target = (meta.get("applies_to") or [{}])[0]
            for c in chunks:
                rowid += 1
                cid = f"{rec.doc_id}#{c.n}"
                ev = 1 if c.anchor in covered else 0
                conn.execute(
                    "INSERT INTO chunks(chunk_rowid,chunk_id,doc_id,heading_path,anchor,"
                    "char_start,char_end,line_start,line_end,evidence_covered,content_hash,text) "
                    "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                    (rowid, cid, rec.doc_id, c.heading_path, c.anchor, c.char_start,
                     c.char_end, c.line_start, c.line_end, ev, c.content_hash, c.text),
                )
                if self.fts_backend == "fts5":
                    conn.execute(
                        "INSERT INTO chunks_fts(rowid,text,heading_path) VALUES(?,?,?)",
                        (rowid, c.text, c.heading_path),
                    )
                all_embed_texts.append((rowid, c.embed_text))
                # deterministic manifest anchor: boundaries + hash + flags (NOT the vector)
                manifest_parts.append(
                    f"{cid}|{c.content_hash}|{c.char_start}:{c.char_end}|{ev}|{primary}"
                )
                # pre-store partition keys for the vector row (embedding filled below)
                conn.execute(
                    "INSERT INTO chunk_vectors(chunk_rowid,doc_id,tier,os_family,distro,major_version,embedding) "
                    "VALUES(?,?,?,?,?,?,?)",
                    (rowid, rec.doc_id, meta.get("tier"), first_target.get("os_family"),
                     first_target.get("distro"), first_target.get("version"), b""),
                )
                chunk_count += 1

        # ── embed (agent-runtime facade; D-13 hard dep of INDEXING) ────────────
        # Batched ≤ batch_max; the caller's embed_fn honors 429/retry-after.
        if all_embed_texts:
            texts = [t for _r, t in all_embed_texts]
            vectors, model_id, dim = embed_fn(texts, "document")
            if len(vectors) != len(texts):
                raise RuntimeError("embed() returned wrong vector count")
            for (rid, _t), vec in zip(all_embed_texts, vectors):
                conn.execute(
                    "UPDATE chunk_vectors SET embedding=? WHERE chunk_rowid=?",
                    (_f32_blob(l2_normalize(vec)), rid),
                )
        conn.commit()

        manifest_hash = __import__("hashlib").sha256(
            "\n".join(manifest_parts).encode("utf-8")
        ).hexdigest()
        self.set_meta(
            model_id=model_id, dim=dim, chunker_config_id=ck.chunker_config_id(),
            corpus_commit=corpus_commit, fts_backend=self.fts_backend,
            vector_backend=self.vector_backend, manifest_hash=manifest_hash,
        )
        return BuildResult(
            corpus_commit=corpus_commit, model_id=model_id, dim=dim,
            chunker_config_id=ck.chunker_config_id(), doc_count=indexed_docs,
            chunk_count=chunk_count, fts_backend=self.fts_backend,
            vector_backend=self.vector_backend, manifest_hash=manifest_hash,
        )

    # ── incremental single-doc upsert (propose / admission) ───────────────────
    def upsert_doc(self, rec, embed_fn: Optional[EmbedFn], *,
                   covered_anchors: Optional[set] = None) -> bool:
        """Index ONE corpus doc (quarantine-flagged from proposal, or re-stamp on
        admission). Returns True if the vector half is PENDING (runtime was down at
        index time → FTS insert proceeded, vectors queued, PLAN §4/§3 finding F17).

        rejected docs are removed instead of indexed (F5); retired/superseded are not
        served.
        """
        conn = self.connect()
        meta = rec.meta
        admission = meta.get("admission")
        status = meta.get("status", "current")
        self.remove_doc(rec.doc_id)  # idempotent replace (removes stale rows first)
        if admission == "rejected" or status in ("retired", "superseded"):
            return False
        title = meta.get("title", rec.doc_id)
        kind = meta.get("kind", "prose-guide")
        primary = self.primary_partition(meta)
        conn.execute(
            "INSERT INTO docs(doc_id,title,collection,kind,tier,admission,status,"
            "lineage_key,last_verified,valid_until,primary_partition,pending_embed,"
            "provenance_taint,content_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (rec.doc_id, title, meta.get("collection"), kind, meta.get("tier"),
             admission, status, meta.get("lineage_key"), meta.get("last_verified"),
             meta.get("valid_until"), primary, 0, meta.get("provenance_taint"),
             meta.get("content_sha256")),
        )
        for a in (meta.get("applies_to") or []):
            conn.execute(
                "INSERT OR IGNORE INTO doc_targets("
                "doc_id,os_family,distro,major_version,arch,lifecycle) VALUES(?,?,?,?,?,?)",
                (rec.doc_id, a.get("os_family"), a.get("distro"), a.get("version"),
                 a.get("arch"), a.get("lifecycle")))
        covered = covered_anchors or set()
        vscope = self._version_scope_label(meta)
        chunks = ck.chunk_document(title=title, version_scope=vscope, kind=kind, body=rec.body)
        first_target = (meta.get("applies_to") or [{}])[0]
        cur_max = conn.execute("SELECT COALESCE(MAX(chunk_rowid),0) AS m FROM chunks").fetchone()["m"]
        embed_texts: list[tuple[int, str]] = []
        for c in chunks:
            cur_max += 1
            cid = f"{rec.doc_id}#{c.n}"
            ev = 1 if c.anchor in covered else 0
            conn.execute(
                "INSERT INTO chunks(chunk_rowid,chunk_id,doc_id,heading_path,anchor,"
                "char_start,char_end,line_start,line_end,evidence_covered,content_hash,text) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (cur_max, cid, rec.doc_id, c.heading_path, c.anchor, c.char_start,
                 c.char_end, c.line_start, c.line_end, ev, c.content_hash, c.text))
            if self.fts_backend == "fts5":
                conn.execute("INSERT INTO chunks_fts(rowid,text,heading_path) VALUES(?,?,?)",
                             (cur_max, c.text, c.heading_path))
            conn.execute(
                "INSERT INTO chunk_vectors(chunk_rowid,doc_id,tier,os_family,distro,major_version,embedding) "
                "VALUES(?,?,?,?,?,?,?)",
                (cur_max, rec.doc_id, meta.get("tier"), first_target.get("os_family"),
                 first_target.get("distro"), first_target.get("version"), b""))
            embed_texts.append((cur_max, c.embed_text))
        pending = False
        if embed_texts and embed_fn is not None:
            try:
                vectors, model_id, _dim = embed_fn([t for _r, t in embed_texts], "document")
                for (rid, _t), vec in zip(embed_texts, vectors):
                    conn.execute("UPDATE chunk_vectors SET embedding=? WHERE chunk_rowid=?",
                                 (_f32_blob(l2_normalize(vec)), rid))
                if model_id and not self.get_meta("model_id"):
                    self.set_meta(model_id=model_id)
            except Exception:
                # runtime down at index time — FTS served now, vectors queued (F17)
                pending = True
                conn.execute("UPDATE docs SET pending_embed=1 WHERE doc_id=?", (rec.doc_id,))
        elif embed_texts and embed_fn is None:
            pending = True
            conn.execute("UPDATE docs SET pending_embed=1 WHERE doc_id=?", (rec.doc_id,))
        conn.commit()
        return pending

    def update_doc_state(self, doc_id: str, *, admission: Optional[str] = None,
                         tier: Optional[str] = None, status: Optional[str] = None,
                         last_verified: Optional[str] = None) -> None:
        """Light state re-stamp on the index doc row (admission/tier/status), used on
        admission of an already-indexed quarantined doc — body/chunks unchanged."""
        conn = self.connect()
        sets, vals = [], []
        for col, v in (("admission", admission), ("tier", tier), ("status", status),
                       ("last_verified", last_verified)):
            if v is not None:
                sets.append(f"{col}=?")
                vals.append(v)
        if not sets:
            return
        vals.append(doc_id)
        conn.execute(f"UPDATE docs SET {', '.join(sets)} WHERE doc_id=?", vals)
        conn.commit()

    def set_evidence_covered(self, doc_id: str, covered_anchors: set) -> None:
        conn = self.connect()
        conn.execute("UPDATE chunks SET evidence_covered=0 WHERE doc_id=?", (doc_id,))
        for anchor in covered_anchors:
            conn.execute("UPDATE chunks SET evidence_covered=1 WHERE doc_id=? AND anchor=?",
                         (doc_id, anchor))
        conn.commit()

    def count_pending_embed(self) -> int:
        conn = self.connect()
        return conn.execute("SELECT COUNT(*) AS n FROM docs WHERE pending_embed=1").fetchone()["n"]

    # ── synchronous removal (F3) ────────────────────────────────────────────────
    def remove_doc(self, doc_id: str) -> None:
        """Remove a doc's rows from the SERVED index NOW (rejection/retire/supersede).
        Removals never lag; a failed removal must raise (caller fails the op loud)."""
        conn = self.connect()
        rows = [r["chunk_rowid"] for r in conn.execute(
            "SELECT chunk_rowid FROM chunks WHERE doc_id=?", (doc_id,))]
        conn.execute("DELETE FROM chunks WHERE doc_id=?", (doc_id,))
        conn.execute("DELETE FROM chunk_vectors WHERE doc_id=?", (doc_id,))
        conn.execute("DELETE FROM doc_targets WHERE doc_id=?", (doc_id,))
        conn.execute("DELETE FROM docs WHERE doc_id=?", (doc_id,))
        if self.fts_backend == "fts5":
            for rid in rows:
                conn.execute("INSERT INTO chunks_fts(chunks_fts,rowid,text,heading_path) "
                             "VALUES('delete',?, '', '')", (rid,))
        conn.commit()

    # ── helpers ─────────────────────────────────────────────────────────────────
    @staticmethod
    def primary_partition(meta: dict) -> str:
        applies = meta.get("applies_to") or []
        if applies:
            a = applies[0]
            if a.get("os_family") and a.get("distro") and a.get("version"):
                return f"{a['os_family']}/{a['distro']}/{a['version']}"
        return "any"

    @staticmethod
    def _version_scope_label(meta: dict) -> str:
        applies = meta.get("applies_to") or []
        if applies:
            a = applies[0]
            parts = [a.get("title") or "", a.get("distro") or "", a.get("version") or ""]
            return ", ".join(p for p in parts if p) or "any"
        return "any"

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None
