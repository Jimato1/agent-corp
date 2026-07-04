"""library.migrate — one-shot bootstrap: init the corpus repo, ops.db, index.db, and
build the index from the (possibly empty) corpus. Idempotent. Mirrors auth.migrate.

Usage: `python -m library.migrate`  (compose runs this before the server, like auth).
"""
from __future__ import annotations

import os

from .config import Config
from .corpus.store import CorpusStore
from .index.db import IndexDB
from .ops.opsdb import OpsDB
from .service import LibraryService


def main() -> None:
    c = Config.from_env()
    os.makedirs(c.data_dir, exist_ok=True)
    store = CorpusStore(c.data_dir, remote=c.corpus_git_remote)
    index = IndexDB(os.path.join(c.data_dir, "index.db"), c.embed_dim)
    ops = OpsDB(os.path.join(c.data_dir, "ops.db"))
    svc = LibraryService(c, store=store, index=index, ops=ops, embed_client=None,
                         cmdb_client=None, gateway_client=None, budget_client=None)
    svc.bootstrap(build_index=True)
    if not store.push_state().remote_configured:
        print("WARNING: LIBRARY_CORPUS_REMOTE unset — the corpus git remote is MANDATORY "
              "(ARCHITECTURE §10). Configure it before production.", flush=True)
    print(f"library migrate: corpus HEAD={store.head()[:12]} index built. Done.", flush=True)


if __name__ == "__main__":
    main()
