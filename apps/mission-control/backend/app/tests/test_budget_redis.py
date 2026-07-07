"""The DEDICATED mc budget/WIP store is SEPARATE from auth's private Redis (S5).

MC must NEVER connect to auth's Redis (SoD invariant, DEPLOYMENT §3). Per-sub budget
POLICY is read via auth's budget-check API (Option B), never from a Redis.
"""
from __future__ import annotations

import pytest

from app.services.budget_store import AuthRedisRefused, BudgetStore
from app.services.upstream import Sourced
from app.tests.conftest import op_headers


def test_auth_private_redis_url_is_refused():
    # A build-failing guard, not a runtime hope.
    for bad in ("redis://auth_redis:6379/0", "redis://data_auth:6379", "redis://authredis/1"):
        with pytest.raises(AuthRedisRefused):
            BudgetStore(bad)


def test_dedicated_store_is_not_auth_and_is_own_backend(client):
    store = client.app.state.budget_store
    # In tests the URL is empty => in-process local bound (Redis-independent), never auth's.
    assert store.backend == "in-process"
    assert "auth" not in (store.url or "").lower()
    store.set_wip(22, "global")
    count, _ = store.get_wip("global")
    assert count == 22


def test_budgets_read_dimensions_via_auth_api_not_redis(client):
    class _FakeAuth:
        base_url = "http://auth:8089"

        async def get_budget_status(self, sub=None):
            return Sourced({"agents": [{"sub": "agent:patcher-07", "rate": 12}]}, "auth", 0.2)

    class _FakeBoard:
        base_url = "http://board:8080"

        async def get_wip(self):
            return Sourced({"global": 22, "cap": 30}, "board", 0.2)

    client.app.state.auth = _FakeAuth()
    client.app.state.board = _FakeBoard()
    r = client.get("/api/budgets", headers=op_headers())
    assert r.status_code == 200
    body = r.json()
    # per-sub budget dimensions carry source: auth (the budget-check API), NOT redis.
    assert body["budgets"]["source"] == "auth"
    # the global WIP tally is the DEDICATED mc store (source: redis), separate from auth.
    assert body["global_wip"]["source"] == "redis"
    assert body["global_wip"]["backend"] == "in-process"


def test_config_default_budget_redis_is_mc_owned_not_auth():
    from app.config import Settings
    s = Settings()
    assert "auth" not in s.budget_redis_url.lower()
    assert s.budget_redis_url.startswith("redis://mc_redis")   # mc-owned, data_mc network
