"""auth.store — concrete Store / HotStore implementations.

  * sqlite_store.SQLiteStore — the DURABLE, canonical Store over stdlib sqlite3.
    SQLite-NOW is acceptable for THIS build (decision #8); it lives behind the
    auth.core.interfaces.Store Protocol so the Postgres + active-active path is a
    CONFIG SWAP, not a rewrite. The grant-time SSD conflict check over the FULL
    downward-transitive affected set lives here and rejects atomically.
  * memory_hot.MemoryHotStore — the in-process HotStore (real, testable): denylist,
    budget counters, kill-switch level/epoch, and an in-process pub/sub stand-in.
    The replicated-Redis impl shape is documented in its docstring (CANNOT-VERIFY-HERE).

Import these from auth.store; import the Protocols from auth.core.interfaces.
"""
