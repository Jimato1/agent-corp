"""auth.migrate — one-shot DB migration entrypoint (the compose `auth-migrate` job).

Runs to completion BEFORE the auth app replicas start (compose depends_on
condition: service_completed_successfully), so:
  * schema DDL runs ONCE (not raced by N booting replicas), and
  * the demo principals are seeded ONCE into the shared Postgres (AUTH_SEED_DEMO=1),
    so the two active-active replicas start against already-seeded shared state.

Exit 0 = ready; any non-zero exit leaves the app services gated (fail-closed).
"""
from __future__ import annotations

import os
import sys

from .store.factory import make_hotstore, make_store


def main() -> int:
    store = make_store()
    if not hasattr(store, "init_schema"):
        print("[migrate] backend has no schema step (sqlite?); nothing to do", file=sys.stderr)
        return 0
    store.init_schema()
    print("[migrate] Postgres schema ready", file=sys.stderr)

    if os.environ.get("AUTH_SEED_DEMO", "0") == "1":
        # Reuse AuthApp._seed_demo over the SAME shared store so the demo principals
        # (operator, executor agent, disabled agent) exist for the cross-replica
        # kill-switch demonstration and the JC-1 harness.
        from .server import AuthApp
        hot = make_hotstore()
        AuthApp(store=store, hot=hot, seed_demo=True)
        if hasattr(hot, "close"):
            hot.close()
        print("[migrate] demo seed applied", file=sys.stderr)

    if hasattr(store, "close"):
        store.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
