"""Test helpers: a deterministic fake embedder + an in-temp-dir service factory."""
from __future__ import annotations

import contextlib
import hashlib
import os
import shutil
import tempfile

from library.config import Config
from library.corpus.store import CorpusStore
from library.index.db import IndexDB
from library.ops.opsdb import OpsDB
from library.service import LibraryService


class FakeEmbedder:
    """Deterministic hash-based pseudo-embeddings — no runtime needed. Same text ⇒ same
    vector, so retrieval is meaningful and rebuild is statistically stable."""

    def __init__(self, dim: int = 64, model_id: str = "fake-emb-v1"):
        self.dim = dim
        self.model_id = model_id

    def embed(self, texts, input_type):
        vecs = []
        for t in texts:
            h = hashlib.sha256(t.encode()).digest()
            # expand to dim floats deterministically
            raw = (h * ((self.dim // len(h)) + 1))[: self.dim]
            vecs.append([(b - 128) / 128.0 for b in raw])
        return vecs, self.model_id, self.dim


class FixedClock:
    def __init__(self, t0: float = 1_751_000_000.0):
        self.t = t0

    def __call__(self):
        self.t += 1.0
        return self.t


def make_service(tmp: str, *, auto_admit=False, embedder=None, gateway=None,
                 cmdb=None) -> LibraryService:
    os.environ["LIBRARY_ALLOW_DEBUG_PRINCIPAL"] = "1"
    cfg = Config.from_env()
    cfg.data_dir = tmp
    cfg.embed_dim = (embedder or FakeEmbedder()).dim
    cfg.auto_admit_enabled = auto_admit
    cfg.crossref_min_distinct = 3
    store = CorpusStore(tmp, clock=lambda: 1_751_000_000.0)
    index = IndexDB(os.path.join(tmp, "index.db"), cfg.embed_dim)
    ops = OpsDB(os.path.join(tmp, "ops.db"))
    from library.clients.budget_client import BudgetClient
    svc = LibraryService(
        cfg, store=store, index=index, ops=ops,
        embed_client=embedder or FakeEmbedder(), cmdb_client=cmdb, gateway_client=gateway,
        budget_client=BudgetClient("", propose_quota_per_day=50), clock=FixedClock())
    svc.bootstrap(build_index=True)
    return svc


@contextlib.contextmanager
def temp_service(**kw):
    """A service on a fresh temp dir that CLOSES its SQLite handles before the dir is
    removed (Windows holds file locks otherwise)."""
    tmp = tempfile.mkdtemp()
    svc = None
    try:
        svc = make_service(tmp, **kw)
        yield svc
    finally:
        if svc is not None:
            try:
                svc.index.close()
            except Exception:
                pass
            try:
                svc.ops.close()
            except Exception:
                pass
        shutil.rmtree(tmp, ignore_errors=True)


def opener_for(markdown_by_url: dict):
    """Build a Fetcher opener that returns canned markdown (bypasses network/SSRF)."""
    from library.ingest.fetcher import Fetched

    def opener(url: str) -> Fetched:
        body = markdown_by_url.get(url, "# Untitled\n\nbody\n").encode("utf-8")
        return Fetched(url=url, final_url=url, content_type="text/markdown", body=body,
                       sha256=hashlib.sha256(body).hexdigest())

    return opener
