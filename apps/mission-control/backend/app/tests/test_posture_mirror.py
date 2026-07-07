"""Kill mirror honesty (PLAN §5.2; killswitch-chain §4, R9). L2-CONFIRMED = auth's DIRECT
Gateway read ONLY; an MC-relayed L2 renders at most STALE-UNKNOWN regardless of freshness;
a dead source is never a false green.
"""
from __future__ import annotations

from app.services.upstream import Sourced
from app.tests.conftest import op_headers


class _FakeAuth:
    base_url = "http://auth:8089"

    def __init__(self, data, as_of=0.2, stale=False):
        self._s = Sourced(data, "auth", as_of, stale=stale, provenance=(data or {}).get("l2", {}).get("provenance"))

    async def get_posture(self):
        return self._s


def test_l2_confirmed_only_when_auth_direct(client):
    client.app.state.auth = _FakeAuth({
        "level": "G0", "epoch": 4471,
        "l1": {"status": "enforced"},
        "l2": {"status": "confirmed", "provenance": "auth-direct"},
    })
    body = client.get("/api/posture", headers=op_headers()).json()
    assert body["l2"]["status"] == "CONFIRMED"          # auth-direct + fresh => the one legitimate CONFIRMED


def test_mc_relayed_l2_never_confirmed_even_if_fresh(client):
    client.app.state.auth = _FakeAuth({
        "level": "G0", "epoch": 4471,
        "l1": {"status": "enforced"},
        "l2": {"status": "confirmed", "provenance": "mc-relay"},   # NOT auth-direct
    }, as_of=0.05)                                                  # very fresh
    body = client.get("/api/posture", headers=op_headers()).json()
    assert body["l2"]["status"] == "STALE-UNKNOWN"      # capped, regardless of freshness


def test_stale_source_is_not_false_green(client):
    client.app.state.auth = _FakeAuth(None, stale=True)
    body = client.get("/api/posture", headers=op_headers()).json()
    assert body["readout"] == "STALE-UNKNOWN"
    assert body["l1"]["status"] == "STALE-UNKNOWN"
    assert body["safe_stopped_url"].endswith("/safe_stopped")   # auth console = primary next action (H7)


def test_confirmed_degrades_past_freshness_bound(client):
    # auth-direct but the mirror age exceeds posture_freshness_bound => degrade to STALE-UNKNOWN.
    client.app.state.settings.posture_freshness_bound_seconds = 1.0
    client.app.state.auth = _FakeAuth({
        "level": "G0", "epoch": 4471, "l1": {"status": "enforced"},
        "l2": {"status": "confirmed", "provenance": "auth-direct"},
    }, as_of=99.0)
    body = client.get("/api/posture", headers=op_headers()).json()
    assert body["l2"]["status"] == "STALE-UNKNOWN"
    assert body["readout"] == "STALE-UNKNOWN"
