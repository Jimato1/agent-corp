"""auth.store.factory — select the durable Store and HotStore backend by env.

The whole point of the Protocol seams (decision #8): swapping SQLite->Postgres and
MemoryHotStore->Redis is a CONFIG choice, not a rewrite. Defaults are sqlite/memory
so the 247-test suite (which sets no backend env) is unchanged; the container sets
AUTH_STORE=postgres / AUTH_HOTSTORE=redis to run the migrated substrate.
"""
from __future__ import annotations

import os

from .memory_hot import MemoryHotStore
from .sqlite_store import SQLiteStore


def make_store():
    """Durable Store from AUTH_STORE (sqlite|postgres). Schema creation is the
    one-shot migrate job's responsibility (create_schema=False here), so app
    replicas never race concurrent DDL on boot."""
    backend = os.environ.get("AUTH_STORE", "sqlite").lower()
    if backend == "postgres":
        from .postgres_store import PostgresStore
        dsn = os.environ.get("DATABASE_URL")
        if not dsn:
            raise RuntimeError("AUTH_STORE=postgres requires DATABASE_URL")
        return PostgresStore(dsn, create_schema=False)
    return SQLiteStore(os.environ.get("AUTH_SQLITE_PATH", ":memory:"))


def make_hotstore():
    """HotStore from AUTH_HOTSTORE (memory|redis).

    WRITE-BEFORE-ACK is not optional on the real substrate (§4.6 finding 3d): with
    require_replicas=0 a revoke is ack'd after only an in-memory primary write, so a
    crash/failover inside the AOF-everysec window could resurrect a revoked token.
    The redis backend therefore REQUIRES AUTH_REDIS_WAIT_REPLICAS>=1 unless single-
    node is EXPLICITLY opted into (AUTH_ALLOW_SINGLE_NODE=1 — the isolated gate boot,
    where there is no Redis replica and AOF everysec bounds loss to <=1s). This makes
    the unsafe default a loud, explicit choice, not a silent one."""
    backend = os.environ.get("AUTH_HOTSTORE", "memory").lower()
    if backend == "redis":
        from .redis_hot import RedisHotStore
        url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
        require_replicas = int(os.environ.get("AUTH_REDIS_WAIT_REPLICAS", "0"))
        single_node_ok = os.environ.get("AUTH_ALLOW_SINGLE_NODE", "0") == "1"
        if require_replicas < 1 and not single_node_ok:
            raise RuntimeError(
                "AUTH_HOTSTORE=redis without write-before-ack: set "
                "AUTH_REDIS_WAIT_REPLICAS>=1 (needs a Redis replica) so revokes are "
                "acknowledged only after replication, OR set AUTH_ALLOW_SINGLE_NODE=1 "
                "to explicitly accept single-node Redis (AOF everysec, <=1s loss "
                "window) for an isolated gate boot."
            )
        return RedisHotStore(url, require_replicas=require_replicas)
    return MemoryHotStore()
