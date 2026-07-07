"""Kill-switch = RELAY, not enforcer (killswitch-chain §1, MC-btn; PLAN §5.1).

auth stays the single enforcement point. MC: mints no epoch, holds no standing kill
credential, stores no authoritative halted boolean, forwards the operator's sender-bound
proof UNTOUCHED, and fails LOUD (HALT NOT CONFIRMED + hand-off) on any non-2xx.
"""
from __future__ import annotations

from app.tests.conftest import bearer, op_headers


class _FakeAuth:
    base_url = "http://auth:8089"

    def __init__(self, status=200, error=None):
        self._status = status
        self._error = error
        self.captured = None

    async def relay_killswitch(self, level, reason, issued_by, forward_headers):
        self.captured = {"level": level, "reason": reason, "issued_by": issued_by,
                         "headers": forward_headers}
        if self._error or self._status >= 300:
            return (0 if self._error else self._status, None, self._error)
        return (200, {"epoch": 4472, "level": level}, None)


def _audit_actions(client):
    return [(r["action"], r["outcome"]) for r in client.app.state.repo.audit_tail()]


def test_relay_success_is_not_local_enforcement(client):
    fake = _FakeAuth(status=200)
    client.app.state.auth = fake
    r = client.post("/api/killswitch/raise", headers=op_headers(), json={"level": "G1", "reason": "rogue agent"})
    assert r.status_code == 200
    body = r.json()
    assert body["relayed"] is True
    # MC asserts nothing authoritative about halted state — it relays; auth mints the epoch.
    assert "epoch" not in body                       # MC never mints/returns its own epoch
    assert body["note"].startswith("auth minted the epoch")
    # request-side THEN confirmed rows exist (ARCH §10 test — the request record exists even if auth never answered).
    assert ("killswitch_relay", "requested") in _audit_actions(client)
    assert ("killswitch_relay", "confirmed") in _audit_actions(client)


def test_relay_forwards_operator_proof_untouched(client):
    fake = _FakeAuth(status=200)
    client.app.state.auth = fake
    client.post("/api/killswitch/raise", headers=op_headers(), json={"level": "G1", "reason": "x"})
    # The operator's sender-bound proof is forwarded; MC re-signs nothing.
    assert "x-auth-identity" in fake.captured["headers"]
    assert fake.captured["issued_by"] == "op:ada"


def test_fail_loud_halt_not_confirmed(client):
    client.app.state.auth = _FakeAuth(error="connection refused")
    r = client.post("/api/killswitch/raise", headers=op_headers(), json={"level": "G2", "reason": "auth down"})
    assert r.status_code == 502
    body = r.json()
    assert body["halt_confirmed"] is False
    assert body["reason"] == "HALT NOT CONFIRMED"
    assert body["safe_stopped_url"].endswith("/safe_stopped")   # hand-off to auth's console (H1)
    assert ("killswitch_relay", "halt_not_confirmed") in _audit_actions(client)


def test_non_2xx_from_auth_is_also_halt_not_confirmed(client):
    client.app.state.auth = _FakeAuth(status=503)
    r = client.post("/api/killswitch/raise", headers=op_headers(), json={"level": "G1", "reason": "x"})
    assert r.status_code == 502
    assert r.json()["halt_confirmed"] is False


def test_mc_holds_no_standing_kill_scope_for_agents(client):
    # An agent principal can never mint mc:kill-switch reach (operator-only Tier-2).
    r = client.post("/api/killswitch/raise",
                    headers={"Authorization": f"Bearer {bearer('agent:x', 'mc:kill-switch')}"},
                    json={"level": "G1", "reason": "x"})
    assert r.status_code == 403
