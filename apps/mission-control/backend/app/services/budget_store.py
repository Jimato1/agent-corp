"""The DEDICATED MC budget/WIP store — SEPARATE from auth's private Redis (S5).

Load-bearing SoD invariant (ARCH §11, DEPLOYMENT §3, auth §11.1): **MC never connects
to auth's private Redis**, which also holds the sod-critical revocation denylist.
Exposing that store to a Standard-class app would leak the highest-value store onto a
Standard segment. This store is MC-owned, on the mc-private ``data_mc`` network, and
holds ONLY the global WIP counters MC owns (UI_SPEC §3.7 "shared WIP state MC owns").

Per-sub budget POLICY (rate/concurrency/cooldown/lifetime) is read via **auth's
budget-check API** (S5 Option B, :class:`app.services.upstream.AuthClient`) — never
from any Redis. This store is only the global-WIP tally MC surfaces.

* A configured ``redis://`` URL that resolves to auth's own store is REFUSED at
  construction (``AuthRedisRefused``) — a build-failing guard, not a runtime hope.
* If ``redis`` is unavailable or the URL is empty, MC keeps a Redis-independent
  in-process counter (auth §1 "always-available local bound"): benign =
  allow-but-locally-bounded; the store never becomes a hard dependency for reads.
"""
from __future__ import annotations

import threading

# Substrings that would indicate auth's private store — MC must never point here.
_FORBIDDEN_HOST_HINTS = ("auth_redis", "data_auth", "auth-redis", "authredis")


class AuthRedisRefused(RuntimeError):
    """Raised when the configured budget store URL looks like auth's private Redis."""


class BudgetStore:
    """Global-WIP counters MC owns. Redis-backed when configured; in-process otherwise."""

    def __init__(self, url: str = "") -> None:
        self._url = url or ""
        self._assert_not_auth_redis(self._url)
        self._lock = threading.Lock()
        self._mem: dict[str, int] = {}
        self._redis = None
        self._backend = "in-process"
        if self._url:
            try:
                import redis  # type: ignore

                self._redis = redis.Redis.from_url(self._url, socket_timeout=1.0, socket_connect_timeout=1.0)
                self._backend = "redis"
            except Exception:
                # redis lib absent or URL unparseable — fall back to the local bound.
                self._redis = None
                self._backend = "in-process"

    @staticmethod
    def _assert_not_auth_redis(url: str) -> None:
        low = url.lower()
        for hint in _FORBIDDEN_HOST_HINTS:
            if hint in low:
                raise AuthRedisRefused(
                    f"budget_redis_url {url!r} resolves to auth's private Redis ({hint}); "
                    "MC must never touch auth's store (SoD invariant, DEPLOYMENT §3)."
                )

    @property
    def backend(self) -> str:
        return self._backend

    @property
    def url(self) -> str:
        return self._url

    def get_wip(self, key: str = "global") -> tuple[int, bool]:
        """Return (count, live). ``live`` is False when we fell back to the local bound."""
        rk = f"mc:wip:{key}"
        if self._redis is not None:
            try:
                v = self._redis.get(rk)
                return (int(v) if v is not None else 0, True)
            except Exception:
                # Redis-independent fallback: benign = allow-but-locally-bounded.
                pass
        with self._lock:
            return self._mem.get(rk, 0), (self._redis is None)

    def set_wip(self, count: int, key: str = "global") -> None:
        rk = f"mc:wip:{key}"
        if self._redis is not None:
            try:
                self._redis.set(rk, int(count))
                return
            except Exception:
                pass
        with self._lock:
            self._mem[rk] = int(count)

    def incr_wip(self, delta: int = 1, key: str = "global") -> int:
        rk = f"mc:wip:{key}"
        if self._redis is not None:
            try:
                return int(self._redis.incrby(rk, delta))
            except Exception:
                pass
        with self._lock:
            self._mem[rk] = self._mem.get(rk, 0) + delta
            return self._mem[rk]

    def ping(self) -> bool:
        if self._redis is None:
            return False
        try:
            return bool(self._redis.ping())
        except Exception:
            return False
