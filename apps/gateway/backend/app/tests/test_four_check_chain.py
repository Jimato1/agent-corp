"""THE mandatory tests: each of the four checks HARD-REJECTS when its condition fails, and the
FULL CHAIN rejects (no dispatch) if ANY single check fails. The agent cannot proceed past a
failed gate (PLAN §3/§15-1).

These run against the FROZEN contract fakes (SOLO). The equivalent assertions against LIVE
Board/CMDB/Vault are CANNOT-VERIFY-IN-SANDBOX (operator tests — CHECKLIST.md).
"""
from __future__ import annotations

from .conftest import call_execute, exec_headers


def _dispatched(app) -> int:
    return len(app.state.dispatcher.dispatched)


# ---- happy path: all four checks pass → dispatch happens, terminal is spec-conformant ----
def test_happy_path_dispatches_and_reports_terminal(make_app, executor):
    app, client, clients = make_app()
    out = call_execute(client, executor)
    assert out["isError"] is False, out
    assert out["state"] in ("verifying", "needs_review")
    assert _dispatched(app) == 1                      # exactly one playbook dispatch
    assert clients.board.consumed is True             # the approval was consumed


# ---- Check D (holder scope / Check 0) — missing gateway:execute → reject, NO dispatch ----
def test_check_d_missing_holder_scope_rejects(make_app, executor):
    app, client, clients = make_app()
    # A token WITHOUT gateway:execute (only a read scope).
    headers = exec_headers(executor, scope="gateway:read")
    out = client.post("/mcp/tools/execute_approved_plan", headers=headers,
                      json={"ticket_id": "T-000482", "host_id": "nas-01", "op_id": "op-1"}).json()
    assert out["isError"] is True
    assert out["structuredContent"]["code"] in ("insufficient_scope", "holder_rejected")
    assert _dispatched(app) == 0
    assert clients.board.consumed is False            # never even reached Board


def test_check_d_no_dpop_proof_rejects(make_app, executor):
    app, client, _ = make_app()
    # A holder scope but NO DPoP proof header → cnf mandatory → reject.
    token = executor.token("gateway:execute")
    out = client.post("/mcp/tools/execute_approved_plan",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"ticket_id": "T-000482", "host_id": "nas-01", "op_id": "op-1"}).json()
    assert out["isError"] is True
    assert _dispatched(app) == 0


# ---- Check A (Board approval) — bad / consumed / revoked approval → reject ----
def test_check_a_no_approved_ticket_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.board.ticket = {"exists": True, "status": "in_progress", "approval_id": None, "host_id": "nas-01"}
    out = call_execute(client, executor)
    assert out["reason"] == "NO_APPROVED_TICKET"
    assert _dispatched(app) == 0
    assert clients.board.consumed is False


def test_check_a_consumed_approval_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.board.consume_error = "APPROVAL_CONSUMED"   # the single-use loser / replay
    out = call_execute(client, executor)
    assert out["reason"] == "APPROVAL_CONSUMED"
    assert _dispatched(app) == 0


def test_check_a_host_locked_does_not_burn(make_app, executor):
    app, client, clients = make_app()
    clients.board.consume_error = "HOST_LOCKED"
    out = call_execute(client, executor)
    assert out["reason"] == "HOST_LOCKED"               # approval NOT burned; retry later
    assert _dispatched(app) == 0


# ---- Check B (CMDB verdict) — deny / stale / wrong-audience → reject ----
def test_check_b_deny_rejects_without_consuming(make_app, executor):
    app, client, clients = make_app()
    clients.cmdb.verdict = "deny"
    out = call_execute(client, executor)
    assert out["reason"] == "CMDB_DENY"
    assert _dispatched(app) == 0
    # deny is caught by the pre-consume advisory check → the approval is NOT burned.
    assert clients.board.consumed is False


def test_check_b_expired_verdict_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.cmdb.valid_for_s = -5                       # valid_until already passed
    out = call_execute(client, executor)
    assert out["reason"] == "VERDICT_EXPIRED"
    assert _dispatched(app) == 0


def test_check_b_wrong_host_class_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.cmdb.host_class = "disposable"              # execute requires managed
    out = call_execute(client, executor)
    assert out["reason"] == "WRONG_TARGET_CLASS"
    assert _dispatched(app) == 0


# ---- Check C (Vault redemption) — 403 / 503 → reject, credential never issued ----
def test_check_c_vault_403_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.vault.status = 403                          # Vault's D-4 independent re-verify failed
    clients.vault.body = None
    out = call_execute(client, executor)
    assert out["reason"] == "CREDENTIAL_DENIED"
    assert _dispatched(app) == 0                        # no dispatch on a denied credential


def test_check_c_vault_503_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.vault.status = 503                          # Vault sealed / unreachable — fail closed
    clients.vault.body = None
    out = call_execute(client, executor)
    assert out["reason"] == "CREDENTIAL_DENIED"
    assert _dispatched(app) == 0


# ---- The plan-binding sub-checks (Check 1d) ----
def test_plan_hash_mismatch_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.board.consume_response["plan_hash"] = "sha256:" + "0" * 64   # Board/Notes disagree
    out = call_execute(client, executor)
    assert out["reason"] == "PLAN_HASH_MISMATCH"
    assert _dispatched(app) == 0


def test_allowlist_mismatch_rejects(make_app, executor):
    app, client, clients = make_app()
    clients.board.consume_response["allowlist"] = [{"seq": 0, "playbook_key": "patch_debian", "params_hash": "ph:deadbeef"}]
    out = call_execute(client, executor)
    assert out["reason"] == "ALLOWLIST_MISMATCH"
    assert _dispatched(app) == 0


# ---- The floor (Check 2a) — a destructive class auto-approved by tier policy is refused ----
def test_floor_blocks_destructive_auto(make_app, executor):
    # A plan naming reboot_host (class reboot, rollback none) with an AUTO (tier_policy) approval.
    import json as _json
    inv = {"playbook_key": "reboot_host", "version": "v1", "extravars": {}}
    plan = ("# Plan\n```gateway-invocations\n" + _json.dumps([inv]) + "\n```\n").encode()
    app, client, clients = make_app(plan_bytes=plan)
    from .conftest import happy_consume_response, params_hash
    from app.checks.plan import recompute_plan_hash
    clients.board.approval = {"approver_kind": "tier_policy"}     # AUTO
    clients.board.consume_response = {
        "approval_id": "A-1", "ticket_id": "T-000482", "host_id": "nas-01",
        "plan_hash": recompute_plan_hash(plan), "plan_note_id": "N-plan", "plan_note_rev": 3,
        "action_class": "reboot",
        "allowlist": [{"seq": 0, "playbook_key": "reboot_host", "params_hash": params_hash(inv)}],
        "fencing_token": 1}
    out = call_execute(client, executor)
    assert out["reason"] == "FLOOR_VIOLATION"
    assert _dispatched(app) == 0


# ---- The whole-chain property: ANY single failed check ⇒ no dispatch ----
def test_full_chain_no_dispatch_on_any_single_failure(make_app, executor):
    scenarios = [
        ("scope", lambda c: None),          # handled separately (needs header change)
        ("ticket", lambda c: c.board.__setattr__("ticket", {"exists": False})),
        ("consume", lambda c: c.board.__setattr__("consume_error", "APPROVAL_REVOKED")),
        ("cmdb", lambda c: c.cmdb.__setattr__("verdict", "deny")),
        ("vault", lambda c: (c.vault.__setattr__("status", 403), c.vault.__setattr__("body", None))),
    ]
    for name, mutate in scenarios:
        app, client, clients = make_app()
        if name == "scope":
            continue
        mutate(clients)
        out = call_execute(client, executor)
        assert out["isError"] is True, f"{name} should reject"
        assert _dispatched(app) == 0, f"{name} must not dispatch"
