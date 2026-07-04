"""library.index.retrieval — hybrid semantic + FTS retrieval (PLAN §3).

    query → resolve version scope → pre-filter (hard) → score → fuse (RRF) → results

Every result carries its full trust envelope inline (tier, evidence_covered,
version_scope, applies_to, last_verified, provenance_taint, evidence links, durable
citation). The consuming agent always knows what it leans on.

Degraded modes FAIL LOUD, never silently wrong (PLAN §3):
  * runtime down / model_id mismatch → FTS-only, retrieval_mode=lexical_only
  * CMDB down / host unknown / no scope → hard filter DISABLED, version_scope=unverified
  * pending_embed docs → retrieval_mode=partial
  * index invalid (corpus↔index commit mismatch) → serving SUSPENDED (typed error)
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from ..errors import ScopeConflict, DependencyDown
from .db import IndexDB, _blob_f32, l2_normalize

EmbedFn = Callable[[list[str], str], tuple[list[list[float]], str, int]]


@dataclass
class Scope:
    os_family: Optional[str] = None
    distro: Optional[str] = None
    major_version: Optional[str] = None
    arch: Optional[str] = None
    resolved: bool = False           # True iff a usable target exists → hard filter ON
    source: str = "none"             # host_id | explicit | none | cmdb_unreachable | host_unknown


def resolve_scope(*, host_id: Optional[str], target: dict, host_facts_fn: Optional[Callable]) -> Scope:
    """host_id XOR target_* (PLAN §3 F15). Supplying BOTH ⇒ typed scope_conflict,
    never silent precedence. CMDB down / host unknown ⇒ unresolved (filter disabled,
    flagged unverified) — never a silently-wrong filter."""
    has_target = any(target.get(k) for k in ("os_family", "distro", "major_version", "arch"))
    if host_id and has_target:
        raise ScopeConflict("supply host_id XOR target_*, not both")
    if host_id:
        if host_facts_fn is None:
            return Scope(source="cmdb_unreachable")
        facts = host_facts_fn(host_id)  # may return None on unreachable/unknown
        if not facts:
            return Scope(source="host_unknown")
        return Scope(
            os_family=facts.get("os_family"), distro=facts.get("distro"),
            major_version=_major(facts.get("distro_version")), arch=facts.get("arch"),
            resolved=True, source="host_id",
        )
    if has_target:
        return Scope(
            os_family=target.get("os_family"), distro=target.get("distro"),
            major_version=target.get("major_version"), arch=target.get("arch"),
            resolved=True, source="explicit",
        )
    return Scope(source="none")


def _major(v: Optional[str]) -> Optional[str]:
    return v  # applies_to.version is already the major (e.g. "24.04"); kept verbatim


def sanitize_fts_query(q: str) -> str:
    """Never evaluate raw FTS5 syntax from caller input (PLAN §12.10). Tokenize to
    bare alnum terms, quote each as a literal, OR them for recall."""
    terms = re.findall(r"[A-Za-z0-9_]+", q.lower())
    terms = [t for t in terms if len(t) <= 64][:32]
    if not terms:
        return ""
    return " OR ".join(f'"{t}"' for t in terms)


@dataclass
class SearchResponse:
    results: list[dict] = field(default_factory=list)
    retrieval_mode: str = "hybrid"       # hybrid | lexical_only | partial
    version_scope_source: str = "none"
    corpus_commit: str = ""
    notes: list[str] = field(default_factory=list)


class Retriever:
    def __init__(self, index: IndexDB, embed_fn: EmbedFn, *, rrf_k: int = 60,
                 candidate_pool: int = 50, host_facts_fn: Optional[Callable] = None,
                 eol_fn: Optional[Callable[[str], Optional[str]]] = None):
        self.index = index
        self.embed_fn = embed_fn
        self.rrf_k = rrf_k
        self.pool = candidate_pool
        self.host_facts_fn = host_facts_fn
        self.eol_fn = eol_fn

    # ── the query path ──────────────────────────────────────────────────────────
    def search(self, *, query: str, k: int, host_id: Optional[str] = None,
               target: Optional[dict] = None, include_unverified: bool = False,
               index_valid: bool = True) -> SearchResponse:
        if not index_valid:
            # stale results are worse than none (PLAN §1.5/§3)
            raise DependencyDown("index invalid — serving suspended until rebuild",
                                 code="index_invalid")
        target = target or {}
        scope = resolve_scope(host_id=host_id, target=target, host_facts_fn=self.host_facts_fn)
        resp = SearchResponse(version_scope_source=scope.source,
                              corpus_commit=self.index.get_meta("corpus_commit") or "")

        # ── pre-filter: eligible (doc_id, version_scope) ──────────────────────
        eligible = self._eligible_docs(scope, include_unverified)
        if not eligible:
            return resp
        eligible_ids = set(eligible.keys())

        # ── score: vector half ────────────────────────────────────────────────
        vec_ranked: list[tuple[int, float]] = []
        lexical_only = False
        try:
            qvecs, model_id, _dim = self.embed_fn([query], "query")
            stored_model = self.index.get_meta("model_id") or ""
            if stored_model and model_id and model_id != stored_model:
                # never mix vector spaces (PLAN §3): serve FTS-only + surface a loud,
                # ACTIONABLE re-embed requirement. A full re-embed is a heavy job (tens of
                # minutes at corpus scale — RESEARCH §2) and is deliberately NOT auto-fired
                # from the read path; it is run via POST /api/admin/reindex (operator or the
                # nightly job), and index_status shows the "model changed — full re-embed
                # required" degraded banner until it completes.
                lexical_only = True
                resp.notes.append(
                    f"model_id mismatch (index={stored_model} live={model_id}); "
                    f"FULL RE-EMBED REQUIRED via /api/admin/reindex — serving lexical-only meanwhile")
            else:
                vec_ranked = self._vector_search(qvecs[0], eligible_ids)
        except Exception as e:  # runtime down — query never hangs; serve FTS-only
            lexical_only = True
            resp.notes.append(f"semantic retrieval degraded: {type(e).__name__}")

        # ── score: FTS half ───────────────────────────────────────────────────
        fts_ranked = self._fts_search(query, eligible_ids)

        # ── fuse (RRF) ─────────────────────────────────────────────────────────
        if lexical_only:
            fused = fts_ranked
            resp.retrieval_mode = "lexical_only"
        else:
            fused = self._rrf([vec_ranked, fts_ranked])
        top = fused[: max(1, min(k, self.index_max_k(k)))]

        # ── assemble results with the full trust envelope ─────────────────────
        conn = self.index.connect()
        served_pending = False
        for chunk_rowid, _score in top:
            row = conn.execute(
                "SELECT c.*, d.title, d.tier, d.last_verified, d.provenance_taint, "
                "d.pending_embed, d.collection FROM chunks c JOIN docs d USING(doc_id) "
                "WHERE c.chunk_rowid=?", (chunk_rowid,)).fetchone()
            if row is None:
                continue
            if row["pending_embed"]:
                served_pending = True
            vscope = eligible.get(row["doc_id"], "unverified")
            resp.results.append(self._result_dict(conn, row, vscope, scope))
        if served_pending and resp.retrieval_mode == "hybrid":
            resp.retrieval_mode = "partial"
        if not scope.resolved:
            resp.notes.append("version filter disabled — results flagged version_scope=unverified")
        return resp

    def index_max_k(self, k: int) -> int:
        return k

    # ── eligibility (the hard version + admission filter) ─────────────────────
    def _eligible_docs(self, scope: Scope, include_unverified: bool) -> dict[str, str]:
        """Return {doc_id: version_scope}. Applies the hard version filter via the
        doc_targets join (F6) and the admission filter; rejected is NEVER eligible."""
        conn = self.index.connect()
        # admission predicate (rejected excluded unconditionally, F5)
        if include_unverified:
            adm = ("admitted", "quarantined", "review_pending")
        else:
            adm = ("admitted",)
        placeholders = ",".join("?" for _ in adm)
        rows = conn.execute(
            f"SELECT doc_id FROM docs WHERE status='current' AND admission IN ({placeholders}) "
            f"AND (valid_until IS NULL OR valid_until='' OR valid_until > date('now'))",
            adm,
        ).fetchall()
        candidate = {r["doc_id"] for r in rows}
        if not candidate:
            return {}
        if not scope.resolved:
            # no hard filter — everything eligible, flagged unverified
            return {d: "unverified" for d in candidate}

        out: dict[str, str] = {}
        for doc_id in candidate:
            targets = conn.execute(
                "SELECT os_family,distro,major_version,arch FROM doc_targets WHERE doc_id=?",
                (doc_id,)).fetchall()
            best = None  # exact match only; a different major_version is a HARD exclude
            for t in targets:
                if not _match(t["os_family"], scope.os_family):
                    continue
                if not _match(t["distro"], scope.distro):
                    continue
                if not _match(t["arch"], scope.arch):
                    continue
                # os_family+distro+major_version+arch mismatch = HARD exclude (PLAN §1).
                # A wildcard (null) major_version on the doc means "version-agnostic" and
                # matches exactly; a concrete-but-different major_version does NOT match.
                if _match(t["major_version"], scope.major_version):
                    best = "exact"
                    break
            if best:
                out[doc_id] = best
        return out

    # ── vector brute-force (sqlite-vec vec0 is the production accelerator) ─────
    def _vector_search(self, qvec: list[float], eligible_ids: set[str]) -> list[tuple[int, float]]:
        conn = self.index.connect()
        q = l2_normalize(qvec)
        scored: list[tuple[int, float]] = []
        for row in conn.execute("SELECT chunk_rowid, doc_id, embedding FROM chunk_vectors"):
            if row["doc_id"] not in eligible_ids:
                continue
            emb = row["embedding"]
            if not emb:
                continue  # pending_embed vector
            v = _blob_f32(emb)
            if len(v) != len(q):
                continue
            dot = sum(a * b for a, b in zip(q, v))  # both L2-normalized ⇒ cosine
            scored.append((row["chunk_rowid"], dot))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[: self.pool]

    # ── FTS / lexical ───────────────────────────────────────────────────────────
    def _fts_search(self, query: str, eligible_ids: set[str]) -> list[tuple[int, float]]:
        conn = self.index.connect()
        out: list[tuple[int, float]] = []
        if self.index.fts_backend == "fts5":
            match = sanitize_fts_query(query)
            if not match:
                return out
            rows = conn.execute(
                "SELECT c.chunk_rowid AS rid, c.doc_id AS doc_id, bm25(chunks_fts) AS r "
                "FROM chunks_fts JOIN chunks c ON c.chunk_rowid=chunks_fts.rowid "
                "WHERE chunks_fts MATCH ? ORDER BY r LIMIT ?", (match, self.pool * 3)).fetchall()
            for r in rows:
                if r["doc_id"] in eligible_ids:
                    out.append((r["rid"], -float(r["r"])))  # bm25: lower is better
        else:
            terms = re.findall(r"[A-Za-z0-9_]+", query.lower())[:8]
            if not terms:
                return out
            for row in conn.execute("SELECT chunk_rowid, doc_id, text FROM chunks"):
                if row["doc_id"] not in eligible_ids:
                    continue
                low = row["text"].lower()
                score = sum(low.count(t) for t in terms)
                if score > 0:
                    out.append((row["chunk_rowid"], float(score)))
            out.sort(key=lambda x: x[1], reverse=True)
        return out[: self.pool]

    # ── RRF fusion (k=60, equal weight) ────────────────────────────────────────
    def _rrf(self, ranked_lists: list[list[tuple[int, float]]]) -> list[tuple[int, float]]:
        scores: dict[int, float] = {}
        for lst in ranked_lists:
            for rank, (rid, _s) in enumerate(lst):
                scores[rid] = scores.get(rid, 0.0) + 1.0 / (self.rrf_k + rank + 1)
        fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return fused

    # ── result envelope ─────────────────────────────────────────────────────────
    def _result_dict(self, conn, row, vscope: str, scope: Scope) -> dict:
        applies = conn.execute(
            "SELECT os_family,distro,major_version,arch,lifecycle FROM doc_targets WHERE doc_id=?",
            (row["doc_id"],)).fetchall()
        applies_slice = [dict(a) for a in applies]
        return {
            # durable citation (the form consumers may persist — PLAN §1.2/§3)
            "doc_id": row["doc_id"],
            "heading_anchor": row["anchor"],
            "line_start": row["line_start"],
            "line_end": row["line_end"],
            # ephemeral correlation field, documented as such
            "chunk_id": row["chunk_id"],
            "text": row["text"],
            "title": row["title"],
            "tier": row["tier"],
            "evidence_covered": bool(row["evidence_covered"]),
            "version_scope": vscope,
            "applies_to": applies_slice,
            "last_verified": row["last_verified"],
            "provenance_taint": row["provenance_taint"],
            "collection": row["collection"],
        }


def _match(target_val: Optional[str], want: Optional[str]) -> bool:
    """A doc_target field matches if it is null (wildcard) or equals the wanted value.
    If the caller did not constrain that field (want is None), it matches anything."""
    if want is None:
        return True
    if target_val is None or target_val == "":
        return True
    return target_val == want
