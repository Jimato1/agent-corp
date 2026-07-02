"""auth.store.redis_hot — the replicated HotStore on Redis (redis-py).

Stage-5 migration (settled decision #8): the PRODUCTION hot store. Same
auth.core.interfaces.HotStore surface as the in-process MemoryHotStore, but on a
Redis every auth replica shares — which is what makes the kill switch CROSS-REPLICA:

  * CORRECTNESS FAN-OUT IS THE SHARED STORE, not the pub/sub. When auth replica A
    does deny_jti/set_revoked_before/set_killswitch it SETs the authoritative key in
    the ONE Redis both replicas point at; replica B's next is_jti_denied/killswitch
    read hits the SAME key and sees the revocation immediately. So a revoke on A is
    honoured by a verify on B with no propagation delay beyond one Redis round-trip.
  * PUB/SUB (`auth:revocations`) IS THE PUSH CHANNEL FOR DOWNSTREAM RS CACHES
    (Gateway/Vault/Board keep an in-memory denylist cache): each revoke PUBLISHes the
    delta carrying the NEW monotonic epoch so a subscriber applies it sub-second and,
    on reconnect, re-SCANs a full snapshot before serving a destructive decision
    (deltas published during a disconnect are lost — Redis pub/sub is fire-and-forget).
  * ATOMICITY: {SET denylist key (+TTL), INCR epoch, HSET heartbeat, PUBLISH the real
    epoch, log the delta} run in ONE server-side Lua execution (register_script). A
    MULTI/EXEC pipeline can't do this — queued commands return nothing until EXEC, so
    the epoch from INCR can't be embedded in the PUBLISH payload.
  * WRITE-BEFORE-ACK (§4.6 finding 3d): with a replica, deny_* optionally WAITs for
    replica receipt and FAILS CLOSED (raises) if the revoke did not replicate within
    the budget; AOF everysec bounds single-node loss to <=1s. True fsync-before-ack is
    WAITAOF (Redis 7.2+); durable multi-node failover (Sentinel) is the G9 laptop-
    impossible gate — see security/THREAT_MODEL.md.
  * REDIS-INDEPENDENT KILL (§7.3): retire_kid also drives the JWKS-kid-prune + signed
    kill-epoch channel (owned by the server/JWKS), so the operator can STOP even with
    Redis down — that path does not live here, but retire_kid is its Redis half.

The redis driver is imported LAZILY so this module loads for the Protocol conformance
test without redis installed (it CANNOT run without it — raises loudly).
"""
from __future__ import annotations

import json
import threading
import time
from typing import Callable, Dict, List, Optional, Tuple

KILL_G0 = "G0"
KILL_G1 = "G1"
KILL_G2 = "G2"
_VALID_KILL_LEVELS = frozenset({KILL_G0, KILL_G1, KILL_G2})

_CHANNEL = "auth:revocations"
_K_EPOCH = "denylist:epoch"
_K_HEARTBEAT = "denylist:heartbeat"
_K_KILL = "killswitch:global"
_K_LOG = "auth:revocations:log"
_LOG_MAX = 1000

# Atomic {SET key(+TTL), INCR epoch, HSET heartbeat, PUBLISH real-epoch delta, log}.
_DENY_LUA = """
if tonumber(ARGV[2]) > 0 then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
else
  redis.call('SET', KEYS[1], ARGV[1])
end
local epoch = redis.call('INCR', KEYS[2])
redis.call('HSET', KEYS[3], 'epoch', epoch, 'ts', ARGV[5])
local msg = ARGV[3] .. '|' .. ARGV[4] .. '|' .. epoch
redis.call('PUBLISH', KEYS[4], msg)
redis.call('LPUSH', KEYS[5], msg)
redis.call('LTRIM', KEYS[5], 0, tonumber(ARGV[6]) - 1)
return epoch
"""

# Monotonic sub-revoked-before watermark: never move it backwards.
_REVOKED_BEFORE_LUA = """
local prev = tonumber(redis.call('GET', KEYS[1]) or '0')
local val = math.max(prev, tonumber(ARGV[1]))
redis.call('SET', KEYS[1], val)
local epoch = redis.call('INCR', KEYS[2])
redis.call('HSET', KEYS[3], 'epoch', epoch, 'ts', ARGV[3])
local msg = 'sub|' .. ARGV[2] .. '|' .. epoch
redis.call('PUBLISH', KEYS[4], msg)
redis.call('LPUSH', KEYS[5], msg)
redis.call('LTRIM', KEYS[5], 0, tonumber(ARGV[4]) - 1)
return epoch
"""


class RedisHotStore:
    """Replicated HotStore on Redis. Thread-safe (one client, internal pool)."""

    def __init__(
        self,
        url: str = "redis://redis:6379/0",
        *,
        require_replicas: int = 0,
        wait_timeout_ms: int = 100,
        start_heartbeat: bool = True,
        heartbeat_interval_s: float = 0.5,
        socket_timeout_s: float = 0.25,
        socket_connect_timeout_s: float = 0.1,
        max_connections: int = 32,
    ) -> None:
        try:
            import redis
        except ImportError as e:  # pragma: no cover - import guard
            raise RuntimeError(
                "RedisHotStore requires 'redis>=5' (see requirements.txt). Imported "
                "lazily so the module loads for the Protocol conformance test without "
                "the driver — but it CANNOT run without it."
            ) from e
        self._redis = redis
        # Stage-6: a Redis HANG must fail CLOSED FAST, within the proxy's 250ms
        # verify budget — the old socket_timeout=5s pinned a worker thread + its
        # connection for 5s (20x over budget), turning a Redis blip into an auth-wide
        # stall. socket_timeout must still exceed the write-path WAIT budget so a
        # legitimate replica-sync is not cut short; hence the max() floor. Sub-ms LAN
        # RTT leaves a >100x margin at 0.25s, so this does not false-close healthy
        # traffic. Bound the internal pool so a burst can't exhaust file descriptors.
        effective_socket_timeout = max(socket_timeout_s, wait_timeout_ms / 1000.0 + 0.05)
        self._r = redis.Redis.from_url(
            url, decode_responses=True, health_check_interval=30,
            socket_keepalive=True,
            socket_timeout=effective_socket_timeout,
            socket_connect_timeout=socket_connect_timeout_s,
            max_connections=max_connections,
        )
        self._require_replicas = require_replicas
        self._wait_timeout_ms = wait_timeout_ms
        self._deny = self._r.register_script(_DENY_LUA)
        self._revb = self._r.register_script(_REVOKED_BEFORE_LUA)
        self._hb_stop = threading.Event()
        if start_heartbeat:
            self._hb_thread = threading.Thread(
                target=self._heartbeat_loop, args=(heartbeat_interval_s,), daemon=True
            )
            self._hb_thread.start()

    def close(self) -> None:
        self._hb_stop.set()
        try:
            self._r.close()
        except Exception:
            pass

    # -- write-before-ack replica gate (fail-closed) -----------------------
    def _ack_durable(self) -> None:
        """After a revoke write, block until `require_replicas` have acked receipt;
        fail CLOSED (raise) if the revoke did not replicate in the budget. No-op with
        a single node (require_replicas=0); AOF everysec bounds single-node loss."""
        if self._require_replicas <= 0:
            return
        acked = self._r.wait(self._require_replicas, self._wait_timeout_ms)
        if acked < self._require_replicas:
            raise RuntimeError(
                f"revocation replicated to only {acked}/{self._require_replicas} "
                f"replicas within {self._wait_timeout_ms}ms — failing CLOSED"
            )

    # -- revocation denylist ----------------------------------------------
    def deny_jti(self, jti: str, exp: int) -> int:
        ttl = max(1, exp - int(time.time()))
        epoch = int(self._deny(
            keys=[f"denylist:jti:{jti}", _K_EPOCH, _K_HEARTBEAT, _CHANNEL, _K_LOG],
            args=[str(exp), ttl, "jti", jti, str(time.time()), _LOG_MAX],
        ))
        self._ack_durable()
        return epoch

    def is_jti_denied(self, jti: str) -> bool:
        return self._r.exists(f"denylist:jti:{jti}") > 0

    def set_revoked_before(self, sub: str, epoch_ts: int) -> int:
        epoch = int(self._revb(
            keys=[f"denylist:sub:{sub}", _K_EPOCH, _K_HEARTBEAT, _CHANNEL, _K_LOG],
            args=[epoch_ts, sub, str(time.time()), _LOG_MAX],
        ))
        self._ack_durable()
        return epoch

    def revoked_before(self, sub: str) -> Optional[int]:
        v = self._r.get(f"denylist:sub:{sub}")
        return int(v) if v is not None else None

    def disable_client(self, client_id: str) -> int:
        epoch = int(self._deny(
            keys=[f"denylist:client:{client_id}", _K_EPOCH, _K_HEARTBEAT, _CHANNEL, _K_LOG],
            args=["1", 0, "client_id", client_id, str(time.time()), _LOG_MAX],
        ))
        self._ack_durable()
        return epoch

    def is_client_disabled(self, client_id: str) -> bool:
        return self._r.exists(f"denylist:client:{client_id}") > 0

    def retire_kid(self, kid: str) -> int:
        epoch = int(self._deny(
            keys=[f"denylist:kid:{kid}", _K_EPOCH, _K_HEARTBEAT, _CHANNEL, _K_LOG],
            args=["1", 0, "kid", kid, str(time.time()), _LOG_MAX],
        ))
        self._ack_durable()
        return epoch

    def is_kid_retired(self, kid: str) -> bool:
        return self._r.exists(f"denylist:kid:{kid}") > 0

    # -- kill switch -------------------------------------------------------
    def set_killswitch(self, level: str, epoch: int) -> None:
        if level not in _VALID_KILL_LEVELS:
            raise ValueError(
                f"invalid kill level {level!r}; must be one of {sorted(_VALID_KILL_LEVELS)}"
            )
        pipe = self._r.pipeline(transaction=True)
        pipe.hset(_K_KILL, mapping={"level": level, "epoch": epoch})
        pipe.incr(_K_EPOCH)
        pipe.hset(_K_HEARTBEAT, mapping={"epoch": epoch, "ts": str(time.time())})
        pipe.publish(_CHANNEL, f"killswitch|{level}|{epoch}")
        pipe.lpush(_K_LOG, f"killswitch|{level}|{epoch}")
        pipe.ltrim(_K_LOG, 0, _LOG_MAX - 1)
        pipe.execute()
        self._ack_durable()

    def killswitch(self) -> Tuple[str, int]:
        h = self._r.hgetall(_K_KILL)
        if not h:
            return (KILL_G0, 0)
        return (h.get("level", KILL_G0), int(h.get("epoch", 0)))

    def consult_snapshot(self, *, jti, sub, kid=None, client_id=None):
        """Stage-6 hot path: the up-to-5 live-revocation reads in ONE pipelined
        round-trip instead of 5 sequential ones. transaction=False (no MULTI) —
        these are independent reads and we want only the single socket round-trip,
        not atomicity. Results return IN ORDER. Any Redis error RAISES out of
        pipe.execute() so the caller (consult_denylist) fails CLOSED — this method
        never swallows and never decides; it only fetches. Each call builds its OWN
        pipeline (a Pipeline is not thread-safe to share; the client is)."""
        from ..core.interfaces import RevocationSnapshot
        pipe = self._r.pipeline(transaction=False)
        pipe.hgetall(_K_KILL)                       # res[0]
        pipe.exists(f"denylist:jti:{jti}")          # res[1]
        pipe.get(f"denylist:sub:{sub}")             # res[2]
        idx_kid = idx_client = None
        n = 3
        if kid is not None:
            pipe.exists(f"denylist:kid:{kid}")
            idx_kid = n
            n += 1
        if client_id is not None:
            pipe.exists(f"denylist:client:{client_id}")
            idx_client = n
            n += 1
        res = pipe.execute()
        h = res[0] or {}
        rb = res[2]
        return RevocationSnapshot(
            kill_level=h.get("level", KILL_G0) if h else KILL_G0,
            kill_epoch=int(h.get("epoch", 0)) if h else 0,
            jti_denied=bool(res[1]),
            revoked_before=(int(rb) if rb is not None else None),
            kid_retired=(bool(res[idx_kid]) if idx_kid is not None else False),
            client_disabled=(bool(res[idx_client]) if idx_client is not None else False),
        )

    # -- epoch / freshness -------------------------------------------------
    def current_epoch(self) -> int:
        v = self._r.get(_K_EPOCH)
        return int(v) if v is not None else 0

    def _heartbeat_loop(self, interval_s: float) -> None:
        while not self._hb_stop.wait(interval_s):
            try:
                self._r.hset(_K_HEARTBEAT, mapping={
                    "epoch": self.current_epoch(), "ts": str(time.time()),
                })
            except Exception:
                pass  # transient Redis blip; next tick retries

    def heartbeat(self) -> Tuple[int, float]:
        h = self._r.hgetall(_K_HEARTBEAT)
        if not h:
            return (self.current_epoch(), time.time())
        return (int(h.get("epoch", 0)), float(h.get("ts", time.time())))

    # -- budget counters ---------------------------------------------------
    def _conc_key(self, sub: str, cls: Optional[str]) -> str:
        return f"budget:conc:{sub}" + (f":{cls}" if cls else "")

    def incr_concurrency(self, sub: str, cls: Optional[str] = None) -> int:
        return int(self._r.incr(self._conc_key(sub, cls)))

    def decr_concurrency(self, sub: str, cls: Optional[str] = None) -> int:
        key = self._conc_key(sub, cls)
        # Atomic DECR then floor at 0 (never negative).
        new = int(self._r.decr(key))
        if new < 0:
            self._r.set(key, 0)
            new = 0
        return new

    def get_counter(self, key: str) -> int:
        v = self._r.get(key)
        return int(v) if v is not None else 0

    def set_counter(self, key: str, value: int, ttl_ms: Optional[int] = None) -> None:
        if ttl_ms:
            self._r.set(key, value, px=ttl_ms)
        else:
            self._r.set(key, value)

    # -- pub/sub -----------------------------------------------------------
    def publish_revocation(self, event: Dict[str, object]) -> None:
        # The deny_* Lua already PUBLISHes the authoritative delta; this is the
        # explicit-event surface (parity with MemoryHotStore) for callers that build
        # their own event. It records to the log list and publishes the JSON.
        payload = json.dumps(event, sort_keys=True)
        pipe = self._r.pipeline(transaction=True)
        pipe.publish(_CHANNEL, payload)
        pipe.lpush(_K_LOG, payload)
        pipe.ltrim(_K_LOG, 0, _LOG_MAX - 1)
        pipe.execute()

    def drain_revocations(self) -> List[Dict[str, object]]:
        """Best-effort recent-delta log (capped LIST), for tests/introspection.
        Unlike the in-process impl this does NOT clear on read (other replicas share
        it); it returns the recent window newest-first."""
        out: List[Dict[str, object]] = []
        for raw in self._r.lrange(_K_LOG, 0, _LOG_MAX - 1):
            try:
                out.append(json.loads(raw))
            except (ValueError, TypeError):
                # a 'type|target|epoch' delta string, not JSON — parse structurally.
                parts = str(raw).split("|")
                if len(parts) == 3:
                    out.append({"type": parts[0], "target": parts[1], "epoch": int(parts[2])})
        return out

    # -- subscriber helper (downstream-RS / cross-replica demo) ------------
    def subscribe_revocations(
        self, handler: Callable[[str], None], *, snapshot: Optional[Callable[[], None]] = None,
    ):
        """Subscribe to auth:revocations; call `snapshot()` (a full-denylist SCAN)
        BEFORE serving and on every reconnect, since deltas during a disconnect are
        lost. Returns the pubsub thread (redis-py run_in_thread)."""
        if snapshot is not None:
            snapshot()
        pubsub = self._r.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe(**{_CHANNEL: lambda m: handler(m["data"])})
        return pubsub.run_in_thread(sleep_time=0.01, daemon=True)

    def snapshot_denied_jti(self) -> set:
        """Full current jti-denylist via SCAN (never KEYS)."""
        return {k.split(":", 2)[-1] for k in self._r.scan_iter(match="denylist:jti:*", count=500)}
