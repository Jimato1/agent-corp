"""The verdict evaluator: fail-closed on missing/stale facts; sandbox carve-out; floor;
reads CMDB's OWN facts, never agent-supplied (§3, §5, §12)."""
from __future__ import annotations

from app.tests.conftest import mint_access, read_headers, seed

GW = {"Authorization": f"Bearer {mint_access('svc:gateway', 'cmdb:read-policy')}"}


def _decision(client, host_id, action_class, headers=None):
    return client.post("/v1/decision", json={"host_id": host_id, "action_class": action_class},
                       headers=headers or read_headers())


def test_unknown_host_denies_not_default_allow(app_client):
    app, client = app_client
    r = _decision(client, "ghost-99", "package_update")
    assert r.status_code == 200
    v = r.json()["verdict"]
    assert v["verdict"] == "deny"
    assert v["reason"] == ["no_such_host"]


def test_unpolicied_host_denies_no_policy(app_client):
    app, client = app_client
    # A host with NO tier is the unpolicied sentinel — uniformly deny (no "at most ask").
    seed(app, {"hosts/mail-03.md": {"host_id": "mail-03", "class": "managed"}})
    v = _decision(client, "mail-03", "package_update").json()["verdict"]
    assert v["verdict"] == "deny"
    assert v["reason"] == ["no_policy"]


def test_bad_action_class_denies_before_fork(app_client):
    app, client = app_client
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    v = _decision(client, "web-04", "nonsense_class").json()["verdict"]
    assert v["verdict"] == "deny"
    assert v["reason"] == ["bad_action_class"]


def test_no_window_managed_denies(app_client):
    app, client = app_client
    # tier2 host, package_update auto by tier default, but NO window on file => deny not_in_window.
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    v = _decision(client, "web-04", "package_update").json()["verdict"]
    assert v["verdict"] == "deny"
    assert "not_in_window" in v["reason"]


def test_in_window_auto_permits_for_gateway_and_signs(app_client):
    app, client = app_client
    seed(app, {
        "hosts/web-04.md": {
            "host_id": "web-04", "class": "managed", "tier": "tier2",
            "windows": [{"id": "w-always", "kind": "allow", "tzid": "Etc/UTC",
                         "rrule": "FREQ=DAILY", "start_local": "00:00", "end_local": "23:59"}],
        },
        "catalog/pkg.md": {"playbook_key": "pkg", "action_class": "package_update",
                           "rollback_declared": True, "applicable_tiers": ["tier2"]},
    })
    r = _decision(client, "web-04", "package_update", headers=GW)
    v = r.json()["verdict"]
    assert v["verdict"] == "permit"
    assert v["approval_mode"] == "auto"
    assert r.json()["signed"] is True and r.json()["token"]  # gateway caller => signed JWS
    assert v["host_class"] == "managed" and v["verdict_basis"] == "policy"


def test_non_gateway_caller_gets_unsigned_advisory(app_client):
    app, client = app_client
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2",
                                   "windows": [{"id": "w", "kind": "allow", "tzid": "Etc/UTC",
                                                "rrule": "FREQ=DAILY", "start_local": "00:00",
                                                "end_local": "23:59"}]}})
    # An ordinary operator/agent read gets NO Gateway-redeemable token (anti-relay §3).
    r = _decision(client, "web-04", "package_update", headers=read_headers("cmdb:read-policy", "op:ada"))
    assert r.json()["signed"] is False and r.json()["token"] is None


def test_floor_class_never_auto(app_client):
    app, client = app_client
    # Even with an in-window auto tier + a rollback-declared catalog entry, reboot stays ask.
    seed(app, {
        "hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier3",
                            "windows": [{"id": "w", "kind": "allow", "tzid": "Etc/UTC",
                                         "rrule": "FREQ=DAILY", "start_local": "00:00", "end_local": "23:59"}]},
        "catalog/reboot.md": {"playbook_key": "reboot", "action_class": "reboot",
                              "rollback_declared": True, "applicable_tiers": ["tier3"]},
    })
    v = _decision(client, "web-04", "reboot", headers=GW).json()["verdict"]
    assert v["verdict"] == "ask" and v["approval_mode"] == "ask"


def test_sandbox_carve_out(app_client):
    app, client = app_client
    seed(app, {"sandbox/pool.md": {"enabled": True, "slots": [{"host_id": "sbx-01"}]}})
    v = _decision(client, "sbx-01", "sandbox_exec", headers=GW).json()["verdict"]
    assert v["verdict"] == "permit"
    assert v["verdict_basis"] == "sandbox_carve_out" and v["host_class"] == "disposable"
    assert v["tier"] is None and v["in_window"] is True


def test_sandbox_wrong_target_class_both_directions(app_client):
    app, client = app_client
    seed(app, {
        "hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"},
        "sandbox/pool.md": {"enabled": True, "slots": [{"host_id": "sbx-01"}]},
    })
    # sandbox_exec on a managed host => wrong_target_class
    assert _decision(client, "web-04", "sandbox_exec").json()["verdict"]["reason"] == ["wrong_target_class"]
    # a real class on a disposable host => wrong_target_class
    assert _decision(client, "sbx-01", "package_update").json()["verdict"]["reason"] == ["wrong_target_class"]


def test_sandbox_kill_knob_disabled_denies(app_client):
    app, client = app_client
    seed(app, {"sandbox/pool.md": {"enabled": False, "slots": [{"host_id": "sbx-01"}]}})
    v = _decision(client, "sbx-01", "sandbox_exec", headers=GW).json()["verdict"]
    assert v["verdict"] == "deny" and v["reason"] == ["sandbox_disabled"]


def test_at_is_advisory_verdict_from_own_clock(app_client):
    app, client = app_client
    # Supplying a wild `at` cannot flip the verdict — CMDB evaluates on its OWN clock.
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    r = client.post("/v1/decision",
                    json={"host_id": "web-04", "action_class": "package_update",
                          "at": "1999-01-01T00:00:00Z"}, headers=read_headers())
    # No window on file => deny regardless of the agent-supplied `at`.
    assert r.json()["verdict"]["verdict"] == "deny"
