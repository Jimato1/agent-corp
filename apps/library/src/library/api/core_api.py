"""library.api.core_api — REST+JSON over the one shared state (PLAN §6).

Every mutating endpoint takes a caller-minted `op_id` (IDENTIFIERS.md) — replays
collapse to the prior result via the ops.db idempotency ledger. Authorization runs on
EVERY endpoint (auth §1): authenticate → require(scope) → (idempotent) execute.

Audit logging: every state change is logged with sub/op_id/outcome; admission
decisions + denials additionally append to the git-backed `_audit/` stream (in the
service). Scope denials are first-class log events.
"""
from __future__ import annotations

import json
from typing import Optional
from urllib.parse import parse_qs, urlparse

from ..errors import BadRequest, InProgress, LibraryError
from ..authz import scopes as S
from ..authz.rs import Principal, RSMiddleware


class CoreAPI:
    def __init__(self, service, rs: RSMiddleware, ops):
        self.svc = service
        self.rs = rs
        self.ops = ops

    # ── entrypoint: returns (status, body_dict, extra_headers) ────────────────
    def handle(self, method: str, path: str, headers: dict, body: bytes):
        u = urlparse(path)
        p = u.path
        q = parse_qs(u.query)
        try:
            # public endpoints (no auth)
            if p == "/healthz" and method == "GET":
                return 200, {"status": "ok", "index_valid": self.svc.index_valid}, {}
            if p == "/.well-known/oauth-protected-resource" and method == "GET":
                return 200, {
                    "resource": f"https://library.{self.svc.config.suite_domain}",
                    "authorization_servers": [self.svc.config.issuer],
                    "scopes_supported": list(S.ALL_SCOPES),
                    "bearer_methods_supported": ["header"],
                }, {}

            data = self._json(body) if body else {}

            # ── reads (library:read) ──────────────────────────────────────────
            if p == "/api/search" and method == "POST":
                pr = self._auth(headers, "library_search")
                return 200, self._search(data), {}
            if p.startswith("/api/docs/") and p.endswith("/chunks") and method == "GET":
                pr = self._auth(headers, "library_get_doc")
                doc_id = p[len("/api/docs/"):-len("/chunks")]
                return 200, self.svc.get_doc(doc_id), {}
            if p.startswith("/api/docs/") and method == "GET" and p.count("/") == 3:
                pr = self._auth(headers, "library_get_doc")
                doc_id = p[len("/api/docs/"):]
                want_body = q.get("body", ["false"])[0] in ("1", "true")
                return 200, self.svc.get_doc(doc_id, body=want_body), {}

            # ── propose (library:propose) ─────────────────────────────────────
            if p == "/api/proposals" and method == "POST":
                pr = self._auth(headers, "library_propose")
                return self._idem(pr, "propose", data, lambda: self.svc.propose(
                    sub=pr.sub, op_id=data.get("op_id", ""), source_url=data["source_url"],
                    kind=data["kind"], ticket_id=data.get("ticket_id", ""), note=data.get("note", "")))

            # ── curate (library:curate) ───────────────────────────────────────
            if p.startswith("/api/proposals/") and p.endswith("/sources") and method == "POST":
                pr = self._auth(headers, "library_attach_sources")
                doc_id = p[len("/api/proposals/"):-len("/sources")]
                return self._idem(pr, "sources", data, lambda: self.svc.attach_sources(
                    sub=pr.sub, op_id=data.get("op_id", ""), doc_id=doc_id,
                    source_urls=data.get("source_urls", [])))
            if p.startswith("/api/proposals/") and p.endswith("/evidence") and method == "POST":
                pr = self._auth(headers, "library_attach_sandbox_evidence")
                doc_id = p[len("/api/proposals/"):-len("/evidence")]
                return self._idem(pr, "evidence", data, lambda: self.svc.attach_sandbox_evidence(
                    sub=pr.sub, op_id=data.get("op_id", ""), doc_id=doc_id,
                    run_id=data.get("run_id", ""), harness_version=data.get("harness_version", "")))
            if p.startswith("/api/proposals/") and p.endswith("/request-admission") and method == "POST":
                pr = self._auth(headers, "library_request_admission")
                doc_id = p[len("/api/proposals/"):-len("/request-admission")]
                return self._idem(pr, "request_admission", data, lambda: self.svc.request_admission(
                    sub=pr.sub, op_id=data.get("op_id", ""), doc_id=doc_id))

            # ── admin (library:admin, human-kind-gated) ───────────────────────
            if p == "/api/review-queue" and method == "GET":
                pr = self._auth(headers, "review_decision")
                return 200, self.svc.review_queue(), {}
            if p.startswith("/api/review-queue/") and p.endswith("/decision") and method == "POST":
                pr = self._auth(headers, "review_decision")
                doc_id = p[len("/api/review-queue/"):-len("/decision")]
                return self._idem(pr, "decision", data, lambda: self.svc.operator_decision(
                    sub=pr.sub, doc_id=doc_id, decision=data.get("decision", ""),
                    op_id=data.get("op_id", ""), spot_audit=bool(data.get("spot_audit")),
                    confirm_cluster_quarantine=bool(data.get("confirm_cluster_quarantine"))))
            if p.startswith("/api/docs/") and p.endswith("/retire") and method == "POST":
                pr = self._auth(headers, "retire")
                doc_id = p[len("/api/docs/"):-len("/retire")]
                return self._idem(pr, "retire", data, lambda: self.svc.retire(
                    sub=pr.sub, doc_id=doc_id, op_id=data.get("op_id", "")))
            if p.startswith("/api/docs/") and p.endswith("/supersede") and method == "POST":
                pr = self._auth(headers, "supersede")
                doc_id = p[len("/api/docs/"):-len("/supersede")]
                return self._idem(pr, "supersede", data, lambda: self.svc.supersede(
                    sub=pr.sub, doc_id=doc_id, superseded_by=data.get("superseded_by", ""),
                    op_id=data.get("op_id", "")))
            if p == "/api/collections" and method == "GET":
                pr = self._auth(headers, "collections_write")
                return 200, self.svc.list_collections(), {}
            if p == "/api/collections" and method in ("POST", "PATCH"):
                pr = self._auth(headers, "collections_write")
                return self._idem(pr, "collections", data, lambda: self.svc.create_collection(
                    sub=pr.sub, name=data.get("name", ""), op_id=data.get("op_id", "")))
            if p == "/api/admin/reindex" and method == "POST":
                pr = self._auth(headers, "reindex")
                return self._idem(pr, "reindex", data, lambda: self.svc.reindex(
                    mode=data.get("mode", "full")))
            if p == "/api/admin/index-status" and method == "GET":
                pr = self._auth(headers, "reindex")
                return 200, self.svc.index_status(), {}

            return 404, {"error": "not_found", "message": f"no route {method} {p}"}, {}
        except LibraryError as e:
            extra = {}
            if e.status == 401:
                extra["WWW-Authenticate"] = self.rs.www_authenticate()
            return e.status, e.to_body(), extra

    # ── helpers ──────────────────────────────────────────────────────────────
    def _auth(self, headers: dict, op: str) -> Principal:
        pr = self.rs.authenticate(headers)
        self.rs.require(pr, op)
        return pr

    def _search(self, data: dict) -> dict:
        # accept the schema-published `target_version` (mapped to the internal
        # major_version scope field) as well as the explicit `target_major_version`.
        target = {
            "os_family": data.get("target_os_family"),
            "distro": data.get("target_distro"),
            "major_version": data.get("target_version") or data.get("target_major_version"),
            "arch": data.get("target_arch"),
        }
        target = {k: v for k, v in target.items() if v}
        return self.svc.search(
            query=data.get("query", ""), k=data.get("k"), host_id=data.get("host_id"),
            target=target or None, include_unverified=bool(data.get("include_unverified")))

    def _idem(self, pr: Principal, route: str, data: dict, fn):
        op_id = data.get("op_id", "")
        if not op_id:
            raise BadRequest("op_id required for mutating requests", code="validation_error")
        from .. import ids
        if not ids.is_op_id(op_id):
            raise BadRequest("op_id must be ≤128 chars", code="validation_error")
        prior = self.ops.begin(op_id, pr.sub, route)
        if prior is not None:
            return prior.status, prior.body, {}
        try:
            result = fn()
        except LibraryError as e:
            self.ops.abort(op_id)
            raise
        except Exception as e:
            self.ops.abort(op_id)
            raise
        self.ops.complete(op_id, 200, result)
        return 200, result, {}

    @staticmethod
    def _json(body: bytes) -> dict:
        try:
            obj = json.loads(body)
            if not isinstance(obj, dict):
                raise ValueError
            return obj
        except (ValueError, TypeError):
            raise BadRequest("invalid JSON body", code="validation_error")
