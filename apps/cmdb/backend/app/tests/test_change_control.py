"""The propose→confirm gate-weakening ceremony (§6): holder+DPoP, typed intent, diff-hash
binding, drift, tightening-benign, break-glass cap + post-hoc filing."""
from __future__ import annotations

from app.tests.conftest import holder_headers, mint_access, read_headers, seed

WEAKEN_HOST_FM = {
    "host_id": "web-04", "class": "managed", "tier": "tier2",
    "windows": [{"id": "w-new", "kind": "allow", "tzid": "Etc/UTC", "rrule": "FREQ=DAILY",
                 "start_local": "00:00", "end_local": "23:59"}],
}


def _seed_host(app):
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})


def test_weakening_ceremony_full_flow(app_client, operator):
    app, client = app_client
    _seed_host(app)
    # Phase 1: propose (holder + DPoP).
    r = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert",
                          "frontmatter": WEAKEN_HOST_FM},
                    headers=holder_headers(operator, "POST", "/v1/policy/propose"))
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["classification"]["weakening"] is True
    assert p["friction"] == "full" and p["expected_intent"] == "WEAKEN web-04"
    # Phase 2: confirm with the exact typed intent + diff_hash.
    c = client.post("/v1/policy/confirm",
                    json={"confirm_token": p["confirm_token"], "typed_intent": "WEAKEN web-04",
                          "diff_hash": p["diff_hash"]},
                    headers=holder_headers(operator, "POST", "/v1/policy/confirm"))
    assert c.status_code == 200, c.text
    assert c.json()["weakening"] is True and c.json()["chain_seq"] >= 1
    # The window is now live (snapshot swapped).
    v = client.post("/v1/decision", json={"host_id": "web-04", "action_class": "config_change"},
                    headers=read_headers()).json()["verdict"]
    assert v["in_window"] is True  # a window now covers 'now'


def test_confirm_wrong_typed_intent_rejected(app_client, operator):
    app, client = app_client
    _seed_host(app)
    p = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_HOST_FM},
                    headers=holder_headers(operator, "POST", "/v1/policy/propose")).json()
    c = client.post("/v1/policy/confirm",
                    json={"confirm_token": p["confirm_token"], "typed_intent": "wrong", "diff_hash": p["diff_hash"]},
                    headers=holder_headers(operator, "POST", "/v1/policy/confirm"))
    assert c.status_code == 400


def test_confirm_wrong_diff_hash_rejected(app_client, operator):
    app, client = app_client
    _seed_host(app)
    p = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_HOST_FM},
                    headers=holder_headers(operator, "POST", "/v1/policy/propose")).json()
    c = client.post("/v1/policy/confirm",
                    json={"confirm_token": p["confirm_token"], "typed_intent": "WEAKEN web-04",
                          "diff_hash": "deadbeef"},
                    headers=holder_headers(operator, "POST", "/v1/policy/confirm"))
    assert c.status_code == 409


def test_agent_cannot_propose_policy(app_client):
    app, client = app_client
    _seed_host(app)
    # An agent bearer token (no holder scope, not op:*) is rejected at the holder gate.
    r = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_HOST_FM},
                    headers={"Authorization": f"Bearer {mint_access('agent:worker-1', 'cmdb:read-policy')}"})
    assert r.status_code in (401, 403)


def test_holder_scope_from_agent_still_rejected_by_principal_class(app_client):
    app, client = app_client
    _seed_host(app)
    # Even if a machine somehow carried cmdb:write-policy, the principal-class check refuses
    # any non-op:* sub by construction (defense-in-depth #3). No cnf/DPoP needed to reach it.
    r = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_HOST_FM},
                    headers={"Authorization": f"Bearer {mint_access('svc:gateway', 'cmdb:write-policy')}"})
    assert r.status_code == 403


def test_holder_without_dpop_rejected(app_client, operator):
    app, client = app_client
    _seed_host(app)
    # cnf.jkt present in token but NO DPoP proof header => invalid (mandatory cnf, §8 step 6).
    r = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_HOST_FM},
                    headers={"Authorization": f"Bearer {operator.token()}"})
    assert r.status_code in (401, 403)


def test_sandbox_disable_is_benign_tightening(app_client):
    app, client = app_client
    seed(app, {"sandbox/pool.md": {"enabled": True, "slots": [{"host_id": "sbx-01"}]}})
    r = client.post("/v1/sandbox/pool/disable", headers=read_headers("cmdb:manage"))
    assert r.status_code == 200, r.text
    assert r.json()["weakening"] is False
    # The knob is now off — sandbox verdicts deny.
    v = client.post("/v1/decision", json={"host_id": "sbx-01", "action_class": "sandbox_exec"},
                    headers={"Authorization": f"Bearer {mint_access('svc:gateway', 'cmdb:read-policy')}"}).json()["verdict"]
    assert v["reason"] == ["sandbox_disabled"]


def test_break_glass_cap_enforced_and_files_posthoc(app_client, operator):
    app, client = app_client
    seed(app, {"hosts/db-02.md": {"host_id": "db-02", "class": "managed", "tier": "tier1"}})
    # Over the 4h cap => rejected.
    over = client.post("/v1/break-glass", json={"host_id": "db-02", "minutes": 999},
                       headers=holder_headers(operator, "POST", "/v1/break-glass"))
    assert over.status_code == 400
    # Valid 90m break-glass => propose, then confirm with the louder intent.
    p = client.post("/v1/break-glass", json={"host_id": "db-02", "minutes": 90},
                    headers=holder_headers(operator, "POST", "/v1/break-glass")).json()
    assert p["edit_kind"] == "break_glass" and p["expected_intent"] == "BREAK GLASS db-02"
    c = client.post("/v1/policy/confirm",
                    json={"confirm_token": p["confirm_token"], "typed_intent": "BREAK GLASS db-02",
                          "diff_hash": p["diff_hash"]},
                    headers=holder_headers(operator, "POST", "/v1/policy/confirm"))
    assert c.status_code == 200, c.text
    esc = client.get("/v1/escalations", headers=read_headers()).json()["escalations"]
    assert any(e["kind"] == "break_glass_posthoc" for e in esc)
