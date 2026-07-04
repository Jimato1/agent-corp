"""library.service — the ONE shared state (PLAN §6). Both surfaces are clients.

The Core REST API (library.api.core_api) and the MCP surface (library.mcp.surface) are
thin adapters over THIS object; neither is downstream of the other (two views, one
state). Everything that mutates corpus/index goes through here so the single-writer
and content-bound-gate invariants hold in exactly one place.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from . import ids
from .config import Config
from .corpus import frontmatter as fm
from .corpus.store import CorpusStore
from .errors import AdmissionPreconditionFailed, BadRequest, Conflict, KindGateViolation, NotFound
from .index.db import IndexDB
from .index.retrieval import Retriever
from .ingest import admission
from .ingest.fetcher import Fetcher, to_markdown
from .ops.opsdb import OpsDB


def _now_iso(clock: Callable[[], float]) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(clock()))


def origin_cluster(url: str) -> str:
    """HEURISTIC upstream-origin key for the distinctness test (§8.3). ALWAYS rendered
    as heuristic in the UI, never as a verified fact. Registered-domain approximation."""
    host = (urlparse(url).hostname or "").lower()
    parts = host.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host or "unknown"


class LibraryService:
    def __init__(self, config: Config, *, store: CorpusStore, index: IndexDB, ops: OpsDB,
                 embed_client=None, cmdb_client=None, gateway_client=None, budget_client=None,
                 fetcher: Optional[Fetcher] = None, clock: Callable[[], float] = time.time):
        self.config = config
        self.store = store
        self.index = index
        self.ops = ops
        self.embed_client = embed_client
        self.cmdb = cmdb_client
        self.gateway = gateway_client
        self.budget = budget_client
        self.fetcher = fetcher or Fetcher(
            max_bytes=config.fetch_max_bytes, timeout_s=config.fetch_timeout_s,
            allow_private=config.allow_private_fetch)
        self.clock = clock
        self._index_valid = True

    # ── embed adapter (None ⇒ vectors queue pending; degraded, never a hang) ──
    def _embed_fn(self):
        if self.embed_client is None:
            return None
        return self.embed_client.embed

    # ── bootstrap ──────────────────────────────────────────────────────────────
    def bootstrap(self, *, build_index: bool = True) -> None:
        self.store.init()
        self.ops.create_schema()
        self.index.create_schema()
        if build_index:
            self.reindex(mode="full")
        self._check_index_consistency()

    def _check_index_consistency(self) -> None:
        """corpus↔index restore rule (PLAN §1.5 F9): if the index commit is not an
        ancestor-or-equal of corpus HEAD, the index is INVALID → suspend serving."""
        head = self.store.head()
        idx_commit = self.index.get_meta("corpus_commit") or ""
        if not head or not idx_commit:
            self._index_valid = True
            return
        self._index_valid = self.store.git.is_ancestor(idx_commit, head)

    @property
    def index_valid(self) -> bool:
        return self._index_valid

    def _retriever(self) -> Retriever:
        host_facts_fn = self.cmdb.resolve_host_facts if self.cmdb else None
        return Retriever(
            self.index, self._embed_fn() or _raise_embed_down, rrf_k=self.config.rrf_k,
            candidate_pool=self.config.candidate_pool, host_facts_fn=host_facts_fn)

    # ── search (read) ────────────────────────────────────────────────────────
    def search(self, *, query: str, k: Optional[int] = None, host_id: Optional[str] = None,
               target: Optional[dict] = None, include_unverified: bool = False) -> dict:
        if not query or not isinstance(query, str):
            raise BadRequest("query required", code="validation_error")
        k = min(int(k or self.config.default_k), self.config.max_k)
        resp = self._retriever().search(
            query=query, k=k, host_id=host_id, target=target or {},
            include_unverified=include_unverified, index_valid=self._index_valid)
        return {
            "results": resp.results,
            "retrieval_mode": resp.retrieval_mode,
            "version_scope_source": resp.version_scope_source,
            "corpus_commit": resp.corpus_commit,
            "notes": resp.notes,
            "chunk_id_note": "chunk_id is an ephemeral correlation field; the durable "
                             "citation is doc_id + heading_anchor + line-range",
        }

    def get_doc(self, doc_id: str, *, body: bool = False) -> dict:
        if not ids.is_doc_id(doc_id):
            raise BadRequest("not a valid doc reference", code="validation_error")
        rec = self.store.get(doc_id)
        if rec is None:
            raise NotFound(f"{doc_id} not found")
        out = {"doc_id": doc_id, "frontmatter": rec.meta}
        if body:
            out["body"] = rec.body
        conn = self.index.connect()
        rows = conn.execute(
            "SELECT chunk_id,heading_path,anchor,line_start,line_end,evidence_covered "
            "FROM chunks WHERE doc_id=? ORDER BY chunk_rowid", (doc_id,)).fetchall()
        out["chunks"] = [dict(r) for r in rows]
        return out

    # ── propose (ingestion) ────────────────────────────────────────────────────
    def propose(self, *, sub: str, op_id: str, source_url: str, kind: str,
                ticket_id: str, note: str = "") -> dict:
        if kind not in ("man-page", "cli-guide", "prose-guide", "advisory", "other", "cli-reference"):
            raise BadRequest("unknown kind", code="validation_error")
        if ticket_id and not ids.is_ticket_id(ticket_id):
            raise BadRequest("invalid ticket_id", code="validation_error")
        # per-sub proposal quota (volume bound on poisoning campaigns, §4)
        if self.budget:
            self.budget.check_propose_quota(sub)
        # SERVICE fetches + hashes (never the agent — PLAN §4)
        fetched = self.fetcher.fetch(source_url)
        md = to_markdown(fetched.content_type, fetched.body)
        title = self._derive_title(md, source_url)
        doc_id = ids.new_doc_id(int(self.clock() * 1000))
        now = _now_iso(self.clock)
        meta = {
            "id": doc_id,
            "title": title,
            "collection": None,
            "kind": kind,
            "tier": "single-source",            # quarantine tier at proposal
            "admission": "quarantined",
            "status": "current",
            "sources": [{
                "url": source_url, "fetched_at": now, "content_sha256": fetched.sha256,
                "origin_cluster": origin_cluster(source_url), "attached_by": "service",
            }],
            "applies_to": [{"os_family": None, "distro": None, "version": None,
                            "arch": None, "lifecycle": "current"}],
            "lineage_key": doc_id,
            "source_published": None,
            "last_verified": now,
            "valid_until": None,
            "verification": [],
            "provenance_taint": "curation-ingested",   # ARCH §12 — always on ingested docs
            "proposed_by": sub,
            "ticket_id": ticket_id or None,
            "proposed_at": now,
            "content_sha256": fm.body_sha256(md),
            "note": note or None,
        }
        rec = self.store.write_proposal(doc_id, meta, md, sub=sub)
        # quarantine is retrievable behind the flag → index it (flagged) from the start
        pending = self.index.upsert_doc(rec, self._embed_fn())
        self.store.append_audit({"event": "propose", "doc_id": doc_id, "sub": sub,
                                 "ticket_id": ticket_id, "source": source_url}, sub=sub)
        return {"doc_id": doc_id, "tier": "single-source", "admission": "quarantined",
                "pending_embed": pending}

    def _derive_title(self, md: str, url: str) -> str:
        for line in md.splitlines():
            if line.startswith("# "):
                return line[2:].strip()[:200]
        p = urlparse(url)
        seg = (p.path.rstrip("/").split("/") or [""])[-1] or p.hostname or "untitled"
        return seg[:200]

    # ── attach crossref sources (curation) ─────────────────────────────────────
    def attach_sources(self, *, sub: str, op_id: str, doc_id: str, source_urls: list[str]) -> dict:
        rec = self._require_doc(doc_id)
        if rec.meta.get("admission") == "admitted":
            raise Conflict("cannot mutate an admitted doc; mint a new lineage doc")
        meta = rec.meta
        for u in source_urls:
            meta.setdefault("sources", []).append({
                "url": u, "fetched_at": _now_iso(self.clock), "content_sha256": None,
                "origin_cluster": origin_cluster(u), "attached_by": "agent",  # rendered distinctly
            })
        distinct = len({s.get("origin_cluster") for s in meta.get("sources", []) if s.get("origin_cluster")})
        # a crossref evidence entry (NEVER admits; only raises review priority)
        meta.setdefault("verification", []).append({
            "kind": "crossref",
            "source_urls": list(source_urls),
            "distinct_origins": distinct,
            "attestation": "agent_asserted",   # heuristic; can NEVER satisfy the gate
        })
        if distinct >= self.config.crossref_min_distinct:
            meta["tier"] = "cross-referenced"
            if meta.get("admission") == "quarantined":
                meta["admission"] = "review_pending"   # auto-route to batched review
        self.store.rewrite_frontmatter(doc_id, meta, sub=sub, message=f"attach sources {doc_id}")
        self.index.update_doc_state(doc_id, admission=meta["admission"], tier=meta["tier"])
        return {"doc_id": doc_id, "distinct_origins": distinct,
                "distinctness_note": "heuristic origin-cluster count — raises review "
                                     "priority only; never confers trust",
                "admission": meta["admission"], "tier": meta["tier"]}

    # ── attach sandbox evidence (curation) — ALWAYS agent_asserted here ────────
    def attach_sandbox_evidence(self, *, sub: str, op_id: str, doc_id: str,
                                run_id: str, harness_version: str) -> dict:
        rec = self._require_doc(doc_id)
        if rec.meta.get("admission") == "admitted":
            raise Conflict("cannot mutate an admitted doc; mint a new lineage doc")
        if not ids.is_run_id(run_id):
            raise BadRequest("invalid run_id", code="validation_error")
        if not ids.is_harness_version(harness_version):
            raise BadRequest("invalid harness_version", code="validation_error")
        meta = rec.meta
        # Recorded as AGENT-ASSERTED — permanently gate-ineligible (F2). The service
        # NEVER copies an agent claim into gateway_delivered; that entry is only ever
        # minted by _validate_via_gateway during request_admission (lane enabled).
        meta.setdefault("verification", []).append({
            "kind": "sandbox",
            "attestation": "agent_asserted",
            "attested_content_sha256": meta.get("content_sha256"),
            "run_id": run_id,
            "harness_version": harness_version,
            "ticket_id": meta.get("ticket_id"),
            "verified_at": _now_iso(self.clock),
            "covered_anchors": [],   # NEVER accepted from the caller (§2.4)
        })
        self.store.rewrite_frontmatter(doc_id, meta, sub=sub, message=f"attach evidence {doc_id}")
        return {"doc_id": doc_id, "recorded": "agent_asserted",
                "gate_effect": "none — agent-asserted evidence can never satisfy the "
                               "content-bound gate; admission still requires gateway-"
                               "delivered evidence or operator review"}

    # ── request admission (run the gate) ───────────────────────────────────────
    def request_admission(self, *, sub: str, op_id: str, doc_id: str) -> dict:
        rec = self._require_doc(doc_id)
        # If the auto-admit lane is ENABLED, try to MINT gateway_delivered evidence by
        # validating agent-asserted run_ids against the Gateway record. Gated OFF by
        # default (config.auto_admit_enabled) — pre-D7 go-live this block never runs.
        if self.config.auto_admit_enabled:
            self._validate_via_gateway(rec)
            rec = self._require_doc(doc_id)  # reload after any minted evidence
        decision = admission.evaluate(
            rec.meta, auto_admit_enabled=self.config.auto_admit_enabled,
            min_distinct=self.config.crossref_min_distinct)

        if decision.outcome == admission.Outcome.AUTO_ADMIT:
            self._admit(doc_id, gate="sandbox_auto", by="svc:library-auto", tier="sandbox-verified")
            self.store.append_audit({"event": "auto_admit", "doc_id": doc_id,
                                     "gate": "sandbox_auto", "reason": decision.reason}, sub="svc:library-auto")
            return {"outcome": "admitted", "gate": "sandbox_auto", "reason": decision.reason}

        if decision.outcome == admission.Outcome.QUEUE_REVIEW:
            rec.meta["admission"] = "review_pending"
            self.store.rewrite_frontmatter(doc_id, rec.meta, sub=sub, message=f"queue review {doc_id}")
            self.index.update_doc_state(doc_id, admission="review_pending")
            return {"outcome": "queued_for_review", "reason": decision.reason,
                    "gate_satisfied": decision.gate_satisfied}

        return {"outcome": "quarantined", "reason": decision.reason}

    def _validate_via_gateway(self, rec) -> None:
        """Auto-admit lane ONLY. For each agent-asserted sandbox evidence entry with a
        run_id, validate it against the Gateway's own record and, on success, MINT a
        service-owned gateway_delivered entry (coverage derived Library-side). Never
        copies the agent's claim. No-op if the Gateway is unreachable (fails to review).
        """
        if self.gateway is None:
            return
        meta = rec.meta
        seen = self._run_id_bindings()
        content_sha = meta.get("content_sha256")
        minted = False
        for e in list(meta.get("verification", []) or []):
            if e.get("kind") != "sandbox" or e.get("attestation") != "agent_asserted":
                continue
            run_id = e.get("run_id")
            hv = e.get("harness_version")
            if not run_id or not hv:
                continue
            if not admission.run_id_binding_ok(rec.doc_id, content_sha, run_id, seen):
                continue  # run_id reuse across docs — refuse (F2)
            ev = self.gateway.get_sandbox_evidence(run_id)
            if not ev:
                continue
            if ev.get("harness_version") != hv:
                continue  # harness attestation mismatch
            if str(ev.get("exit_status")) not in ("0", "ok", "pass"):
                continue
            # The Gateway evidence must attest THIS doc, not some other benign run reused
            # against a different (poisoned) doc. `input_ref` names the doc/revision under
            # test (§G6). REQUIRE it to be present AND to bind to this doc's identity or
            # content — otherwise the "content-bound" gate would be a service self-assertion
            # defeatable by rebinding any valid passing run_id to poisoned content. A run
            # with no/foreign input_ref fails to review, never admits. D-7 GO-LIVE tightens
            # this to a Gateway-confirmed content-hash binding (§2.4/§5.4).
            input_ref = str(ev.get("input_ref") or "")
            if not input_ref or (rec.doc_id not in input_ref and content_sha not in input_ref):
                continue  # evidence does not bind to this doc — refuse (fails to review)
            covered = self._derive_covered_anchors(ev)
            meta.setdefault("verification", []).append({
                "kind": "sandbox",
                "attestation": "gateway_delivered",    # SERVICE-minted, validated
                "attested_content_sha256": content_sha,
                "run_id": run_id,
                "harness_version": hv,
                "ticket_id": ev.get("ticket_id"),
                "transcript_ref": ev.get("transcript_ref"),
                "verified_at": _now_iso(self.clock),
                "covered_anchors": sorted(covered),
            })
            minted = True
        if minted:
            self.store.rewrite_frontmatter(rec.doc_id, meta, sub="svc:library-auto",
                                           message=f"mint gateway evidence {rec.doc_id}")

    def _derive_covered_anchors(self, ev: dict) -> set:
        """Coverage is DERIVED Library-side from the Gateway payload, never agent
        testimony (§2.4). Full transcript-blob derivation is the D-7 go-live wiring;
        until then we accept ONLY a Gateway-provided validated anchor list (never an
        agent's), defaulting to empty (conservative — nothing claimed covered)."""
        anchors = ev.get("covered_anchors")
        return set(anchors) if isinstance(anchors, list) else set()

    def _run_id_bindings(self) -> dict[str, tuple[str, str]]:
        seen: dict[str, tuple[str, str]] = {}
        for rec in self.store.iter_docs():
            sha = rec.meta.get("content_sha256")
            for e in rec.meta.get("verification", []) or []:
                rid = e.get("run_id")
                if rid and e.get("attestation") == "gateway_delivered":
                    seen[rid] = (rec.doc_id, sha)
        return seen

    # ── operator review decision (library:admin, human-only) ──────────────────
    def operator_decision(self, *, sub: str, doc_id: str, decision: str, op_id: str,
                          spot_audit: bool = False, confirm_cluster_quarantine: bool = False) -> dict:
        rec = self._require_doc(doc_id)
        if decision == "admit":
            has_crossref = admission.crossref_ready(rec.meta, self.config.crossref_min_distinct)
            tier = "sandbox-verified" if admission.sandbox_gate_satisfied(rec.meta)[0] else (
                "cross-referenced" if has_crossref else rec.meta.get("tier", "single-source"))
            self._admit(doc_id, gate="operator_review", by=sub, tier=tier)
            self.store.append_audit({"event": "operator_admit", "doc_id": doc_id,
                                     "by": sub, "tier": tier}, sub=sub)
            return {"doc_id": doc_id, "admission": "admitted", "tier": tier}
        if decision == "reject":
            rec.meta["admission"] = "rejected"
            self.store.rewrite_frontmatter(doc_id, rec.meta, sub=sub, push=True,
                                           message=f"reject {doc_id}")
            # synchronous index removal — removals NEVER lag (F3); failure fails loud
            self.index.remove_doc(doc_id)
            audit = {"event": "reject", "doc_id": doc_id, "by": sub, "spot_audit": spot_audit}
            self.store.append_audit(audit, sub=sub)
            if spot_audit:
                self.ops.set_switching("tightened", reason="confirmed poison (spot-audit reject)")
                if confirm_cluster_quarantine:
                    audit2 = {"event": "cluster_quarantine", "doc_id": doc_id, "by": sub,
                              "note": "operator-confirmed (cluster held previously-admitted docs)"}
                    self.store.append_audit(audit2, sub=sub)
            return {"doc_id": doc_id, "admission": "rejected", "index_removed": True,
                    "switching": self.ops.switching_state()}
        raise BadRequest("decision must be admit|reject", code="validation_error")

    def _admit(self, doc_id: str, *, gate: str, by: str, tier: str) -> None:
        rec = self._require_doc(doc_id)
        meta = rec.meta
        meta["admission"] = "admitted"
        meta["tier"] = tier
        meta["admitted_by"] = by
        meta["admitted_at"] = _now_iso(self.clock)
        meta["admission_gate"] = gate
        meta["last_verified"] = _now_iso(self.clock)
        moved = self.store.admit_move(doc_id, meta, sub=by)  # move + stamp in ONE pushed commit
        # re-stamp index doc row + coverage from any gateway_delivered evidence
        covered: set = set()
        for e in meta.get("verification", []) or []:
            if e.get("attestation") == "gateway_delivered":
                covered |= set(e.get("covered_anchors") or [])
        self.index.update_doc_state(doc_id, admission="admitted", tier=tier, status="current",
                                    last_verified=meta["last_verified"])
        if covered:
            self.index.set_evidence_covered(doc_id, covered)

    # ── lifecycle (retire / supersede) ──────────────────────────────────────────
    def retire(self, *, sub: str, doc_id: str, op_id: str) -> dict:
        rec = self._require_doc(doc_id)
        rec.meta["status"] = "retired"
        self.store.rewrite_frontmatter(doc_id, rec.meta, sub=sub, push=True, message=f"retire {doc_id}")
        self.index.remove_doc(doc_id)   # no longer served; evidence history preserved in corpus
        self.store.append_audit({"event": "retire", "doc_id": doc_id, "by": sub}, sub=sub)
        return {"doc_id": doc_id, "status": "retired", "index_removed": True}

    def supersede(self, *, sub: str, doc_id: str, superseded_by: str, op_id: str) -> dict:
        rec = self._require_doc(doc_id)
        if not ids.is_doc_id(superseded_by):
            raise BadRequest("invalid superseded_by", code="validation_error")
        rec.meta["status"] = "superseded"
        rec.meta["superseded_by"] = superseded_by
        self.store.rewrite_frontmatter(doc_id, rec.meta, sub=sub, push=True, message=f"supersede {doc_id}")
        self.index.remove_doc(doc_id)
        self.store.append_audit({"event": "supersede", "doc_id": doc_id, "by": sub,
                                 "superseded_by": superseded_by}, sub=sub)
        return {"doc_id": doc_id, "status": "superseded", "superseded_by": superseded_by}

    # ── review queue (operator) ─────────────────────────────────────────────────
    def review_queue(self) -> dict:
        tier2, spot = [], []
        for rec in self.store.iter_docs():
            m = rec.meta
            if m.get("admission") == "review_pending":
                tier2.append(self._review_row(rec))
            elif m.get("admission") == "admitted" and m.get("admission_gate") == "sandbox_auto":
                spot.append(self._review_row(rec))
        return {
            "tier2_review": tier2,
            "spot_audit": spot,
            "switching": self.ops.switching_state(),
            "switching_reason": self.ops.switching_reason(),
            "bulk_admit_cap": self.config.bulk_admit_cap,
            "auto_admit_lane": "enabled" if self.config.auto_admit_enabled else
                               "DISABLED (pre-D7 go-live) — zero auto-admissions by construction",
        }

    def _review_row(self, rec) -> dict:
        m = rec.meta
        gate_ok, _ = admission.sandbox_gate_satisfied(m)
        agent_asserted = any(a.get("kind") == "sandbox" and a.get("attestation") == "agent_asserted"
                             for a in m.get("verification", []) or [])
        distinct = max([int(a.get("distinct_origins", 0)) for a in m.get("verification", []) or []
                        if a.get("kind") == "crossref"] + [0])
        return {
            "doc_id": rec.doc_id, "title": m.get("title"), "tier": m.get("tier"),
            "proposed_by": m.get("proposed_by"), "ticket_id": m.get("ticket_id"),
            "distinct_origins": distinct, "distinctness_heuristic": True,
            "admit_eligible_by_gate": gate_ok,
            "agent_asserted_only": agent_asserted and not gate_ok,
            "provenance_taint": m.get("provenance_taint"),
        }

    # ── collections ─────────────────────────────────────────────────────────────
    def list_collections(self) -> dict:
        conn = self.index.connect()
        rows = conn.execute("SELECT DISTINCT collection FROM docs WHERE collection IS NOT NULL").fetchall()
        return {"collections": sorted(r["collection"] for r in rows)}

    def create_collection(self, *, sub: str, name: str, op_id: str) -> dict:
        if not name or not name.replace("-", "").replace("_", "").isalnum():
            raise BadRequest("invalid collection name", code="validation_error")
        # collections are frontmatter groupings; creation is recorded in the audit stream
        self.store.append_audit({"event": "create_collection", "name": name, "by": sub}, sub=sub)
        return {"collection": name, "created": True}

    # ── reindex + status ────────────────────────────────────────────────────────
    def reindex(self, *, mode: str = "full") -> dict:
        if mode != "full":
            raise BadRequest("only full reindex supported", code="validation_error")
        docs = list(self.store.iter_docs())
        corpus_commit = self.store.head()
        result = self.index.full_rebuild(
            docs, self._embed_fn() or _noop_embed(self.config.embed_dim),
            corpus_commit=corpus_commit,
            covered_anchor_lookup=self._covered_lookup)
        self.ops.record_job("reindex", "done", {
            "doc_count": result.doc_count, "chunk_count": result.chunk_count,
            "manifest_hash": result.manifest_hash, "model_id": result.model_id})
        self._check_index_consistency()
        return {
            "mode": mode, "doc_count": result.doc_count, "chunk_count": result.chunk_count,
            "manifest_hash": result.manifest_hash, "model_id": result.model_id,
            "dim": result.dim, "chunker_config_id": result.chunker_config_id,
            "fts_backend": result.fts_backend, "vector_backend": result.vector_backend,
            "corpus_commit": corpus_commit,
        }

    def _covered_lookup(self, doc_id: str) -> set:
        rec = self.store.get(doc_id)
        if not rec:
            return set()
        covered: set = set()
        for e in rec.meta.get("verification", []) or []:
            if e.get("attestation") == "gateway_delivered":
                covered |= set(e.get("covered_anchors") or [])
        return covered

    def index_status(self) -> dict:
        head = self.store.head()
        idx_commit = self.index.get_meta("corpus_commit") or ""
        ancestor_ok = self.store.git.is_ancestor(idx_commit, head) if (head and idx_commit) else True
        push = self.store.push_state()
        degraded = []
        if self.embed_client is None:
            degraded.append({"pattern": "D", "code": "lexical_only",
                             "text": "SEMANTIC RETRIEVAL DEGRADED — embed facade unconfigured; serving lexical-only"})
        if push.remote_configured and not push.last_push_ok:
            degraded.append({"pattern": "D", "code": "durability_degraded",
                             "text": f"DURABILITY DEGRADED — corpus push behind ({push.pending_commits} commits); "
                                     "admissions record locally (canonical), retrying"})
        if not push.remote_configured:
            degraded.append({"pattern": "D", "code": "no_remote",
                             "text": "DURABILITY DEGRADED — corpus git remote not configured "
                                     "(ARCHITECTURE §10 requires one)"})
        if not ancestor_ok:
            degraded.append({"pattern": "halt", "code": "index_invalid",
                             "text": "INDEX INVALID — serving suspended until full rebuild "
                                     "(index leads corpus)"})
        return {
            "model_id": self.index.get_meta("model_id"),
            "dim": self.index.get_meta("dim"),
            "dim_note": "config, not a constant (PENDING-SIZING gap-1.2)",
            "chunker_config_id": self.index.get_meta("chunker_config_id"),
            "corpus_head": head,
            "index_corpus_commit": idx_commit,
            "corpus_index_consistent": ancestor_ok,
            "pending_embed": self.index.count_pending_embed(),
            "fts_backend": self.index.fts_backend,
            "vector_backend": self.index.vector_backend,
            "push": {"remote_configured": push.remote_configured, "last_push_ok": push.last_push_ok,
                     "pending_commits": push.pending_commits, "last_error": push.last_error},
            "switching": self.ops.switching_state(),
            "auto_admit_lane": "enabled" if self.config.auto_admit_enabled else "DISABLED",
            "degraded": degraded,
            "index_valid": ancestor_ok and self._index_valid,
        }

    # ── helpers ─────────────────────────────────────────────────────────────────
    def _require_doc(self, doc_id: str):
        if not ids.is_doc_id(doc_id):
            raise BadRequest("invalid doc_id", code="validation_error")
        rec = self.store.get(doc_id)
        if rec is None:
            raise NotFound(f"{doc_id} not found")
        return rec


def _raise_embed_down(texts, input_type):
    from .errors import DependencyDown
    raise DependencyDown("embed facade unconfigured", code="embed_unavailable")


def _noop_embed(dim: int):
    """Rebuild with no embed client configured: FTS-only index (vectors empty). Used
    only when agent-runtime is unreachable at rebuild time; retrieval serves lexical."""
    def fn(texts, input_type):
        return [[0.0] * dim for _ in texts], "", dim
    return fn
