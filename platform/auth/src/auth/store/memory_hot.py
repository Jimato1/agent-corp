"""auth.store.memory_hot — in-process HotStore (real, testable).

Implements auth.core.interfaces.HotStore with plain in-process dicts: the
revocation denylist (jti / sub-revoked_before / client_id / kid), a monotonic
revocation epoch, the graduated kill switch {level, epoch}, budget counters +
a leased concurrency semaphore, and a pub/sub stand-in (drain_revocations).

This impl is fully runnable HERE and lets every revocation/kill/budget code path
be unit-tested with no external server. It is the SINGLE-REPLICA substitute for
the production Redis hot store.

------------------------------------------------------------------------------
CANNOT-VERIFY-HERE — the production Redis pub/sub impl shape (§4.6, §7.3):
------------------------------------------------------------------------------
The production HotStore is replicated Redis (Sentinel/managed, AOF `everysec`):
  * deny_jti / set_revoked_before / disable_client / retire_kid ->
        MULTI: SET the authoritative denylist key(s) with TTL >= max token TTL,
               INCR the monotonic `epoch`,
               PUBLISH the delta to channel `auth:revocations`,
        EXEC (write-before-ack, §4.6 finding 3d): the operator ack is returned
        ONLY AFTER both the durable ledger append AND this Redis EXEC commit.
  * Each RS SUBSCRIBEs `auth:revocations`, keeps an in-memory denylist cache, and
    on connect/reconnect pulls a full snapshot (active entries whose exp is future)
    BEFORE serving any destructive decision, then follows deltas.
  * `denylist:heartbeat = {epoch, ts}` is SET on a ~500ms cadence; an RS that has
    not confirmed the current epoch within its staleness bound fails its
    destructive path CLOSED (or falls back to synchronous introspection).
  * killswitch:global = {level, epoch} is SET here AND signed into JWKS/AS-metadata
    /the forward-auth header so the freeze posture rides a Redis-INDEPENDENT
    channel too (§7.3).
To close this item the operator runs a real Redis and the cross-replica fan-out
integration test (CANNOT-VERIFY-HERE in this sandbox — no redis-server):
    docker run -p 6379:6379 redis:7 --appendonly yes
    cd platform/auth && python -m pytest tests/integration/test_redis_fanout.py
"""
from __future__ import annotations

import threading
import time
from typing import Dict, List, Optional, Tuple

KILL_G0 = "G0"
KILL_G1 = "G1"
KILL_G2 = "G2"
_VALID_KILL_LEVELS = frozenset({KILL_G0, KILL_G1, KILL_G2})


class MemoryHotStore:
    """Thread-safe in-process HotStore. Single-replica substitute for Redis."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._epoch = 0
        self._denied_jti: Dict[str, int] = {}          # jti -> exp (for GC)
        self._revoked_before: Dict[str, int] = {}       # sub -> epoch_ts watermark
        self._disabled_clients: set[str] = set()
        self._retired_kids: set[str] = set()
        self._kill_level = KILL_G0
        self._kill_epoch = 0
        self._counters: Dict[str, Tuple[int, Optional[float]]] = {}  # key -> (value, expiry_ts)
        self._concurrency: Dict[str, int] = {}
        self._revocation_log: List[Dict[str, object]] = []
        self._heartbeat: Tuple[int, float] = (0, time.time())

    # -- internal ----------------------------------------------------------
    def _bump_epoch(self) -> int:
        self._epoch += 1
        self._heartbeat = (self._epoch, time.time())
        return self._epoch

    # -- revocation denylist ----------------------------------------------
    def deny_jti(self, jti: str, exp: int) -> int:
        with self._lock:
            self._denied_jti[jti] = exp
            epoch = self._bump_epoch()
            self.publish_revocation({"type": "jti", "target": jti, "exp": exp, "epoch": epoch})
            return epoch

    def is_jti_denied(self, jti: str) -> bool:
        with self._lock:
            exp = self._denied_jti.get(jti)
            if exp is None:
                return False
            if exp <= int(time.time()):
                # GC expired surgical entry.
                del self._denied_jti[jti]
                return False
            return True

    def set_revoked_before(self, sub: str, epoch_ts: int) -> int:
        with self._lock:
            prev = self._revoked_before.get(sub, 0)
            # Monotonic: never move the watermark backwards.
            self._revoked_before[sub] = max(prev, epoch_ts)
            epoch = self._bump_epoch()
            self.publish_revocation(
                {"type": "sub", "target": sub, "revoked_before": self._revoked_before[sub], "epoch": epoch}
            )
            return epoch

    def revoked_before(self, sub: str) -> Optional[int]:
        with self._lock:
            return self._revoked_before.get(sub)

    def disable_client(self, client_id: str) -> int:
        with self._lock:
            self._disabled_clients.add(client_id)
            epoch = self._bump_epoch()
            self.publish_revocation({"type": "client_id", "target": client_id, "epoch": epoch})
            return epoch

    def is_client_disabled(self, client_id: str) -> bool:
        with self._lock:
            return client_id in self._disabled_clients

    def retire_kid(self, kid: str) -> int:
        with self._lock:
            self._retired_kids.add(kid)
            epoch = self._bump_epoch()
            self.publish_revocation({"type": "kid", "target": kid, "epoch": epoch})
            return epoch

    def is_kid_retired(self, kid: str) -> bool:
        with self._lock:
            return kid in self._retired_kids

    # -- kill switch -------------------------------------------------------
    def set_killswitch(self, level: str, epoch: int) -> None:
        if level not in _VALID_KILL_LEVELS:
            raise ValueError(f"invalid kill level {level!r}; must be one of {sorted(_VALID_KILL_LEVELS)}")
        with self._lock:
            self._kill_level = level
            self._kill_epoch = epoch
            self._bump_epoch()
            self.publish_revocation({"type": "killswitch", "level": level, "epoch": epoch})

    def killswitch(self) -> Tuple[str, int]:
        with self._lock:
            return (self._kill_level, self._kill_epoch)

    def consult_snapshot(self, *, jti, sub, kid=None, client_id=None):
        """Batched read parity with RedisHotStore. In-process (no round-trips), so
        this just takes the lock ONCE and reads each dict — identical values the
        individual reads would return, under one consistent snapshot."""
        from ..core.interfaces import RevocationSnapshot
        with self._lock:
            level, epoch = self._kill_level, self._kill_epoch
            jti_denied = self.is_jti_denied(jti)          # re-enters RLock (ok)
            rb = self._revoked_before.get(sub)
            kid_retired = (kid in self._retired_kids) if kid is not None else False
            client_disabled = (
                client_id in self._disabled_clients if client_id is not None else False
            )
        return RevocationSnapshot(
            kill_level=level, kill_epoch=epoch,
            jti_denied=jti_denied, revoked_before=rb,
            kid_retired=kid_retired, client_disabled=client_disabled,
        )

    # -- epoch / freshness -------------------------------------------------
    def current_epoch(self) -> int:
        with self._lock:
            return self._epoch

    def heartbeat(self) -> Tuple[int, float]:
        with self._lock:
            # Refresh the heartbeat timestamp on read (the Redis impl SETs on a timer).
            self._heartbeat = (self._epoch, time.time())
            return self._heartbeat

    # -- budget counters ---------------------------------------------------
    def _conc_key(self, sub: str, cls: Optional[str]) -> str:
        return f"budget:conc:{sub}" + (f":{cls}" if cls else "")

    def incr_concurrency(self, sub: str, cls: Optional[str] = None) -> int:
        with self._lock:
            key = self._conc_key(sub, cls)
            self._concurrency[key] = self._concurrency.get(key, 0) + 1
            return self._concurrency[key]

    def decr_concurrency(self, sub: str, cls: Optional[str] = None) -> int:
        with self._lock:
            key = self._conc_key(sub, cls)
            new = max(0, self._concurrency.get(key, 0) - 1)
            self._concurrency[key] = new
            return new

    def get_counter(self, key: str) -> int:
        with self._lock:
            entry = self._counters.get(key)
            if entry is None:
                return 0
            value, expiry = entry
            if expiry is not None and expiry <= time.time():
                del self._counters[key]
                return 0
            return value

    def set_counter(self, key: str, value: int, ttl_ms: Optional[int] = None) -> None:
        with self._lock:
            expiry = (time.time() + ttl_ms / 1000.0) if ttl_ms else None
            self._counters[key] = (value, expiry)

    # -- pub/sub stand-in --------------------------------------------------
    def publish_revocation(self, event: Dict[str, object]) -> None:
        # In-process: record so a test (or a subscribing RS stub) can drain it.
        self._revocation_log.append(dict(event))

    def drain_revocations(self) -> List[Dict[str, object]]:
        with self._lock:
            out = list(self._revocation_log)
            self._revocation_log.clear()
            return out
