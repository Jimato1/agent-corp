"""Read APIs for tiers, task-types, runbook-catalog policy attributes, sandbox pool."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from ..authn.principal import Principal, require_read

router = APIRouter()


@router.get("/tiers")
def tiers(request: Request, principal: Principal = Depends(require_read)) -> dict:
    snap, _ = request.app.state.store.current()
    if snap is None:
        return {"tiers": []}
    return {"tiers": [
        {"tier": t.name, "defaults": t.defaults,
         "health_check_timeout_s": t.health_check_timeout_s,
         "ssh_wait_timeout_s": t.ssh_wait_timeout_s}
        for t in snap.tiers.values()
    ]}


@router.get("/task-types")
def task_types(request: Request, principal: Principal = Depends(require_read)) -> dict:
    snap, _ = request.app.state.store.current()
    if snap is None:
        return {"task_types": []}
    return {"task_types": [
        {"type_key": tt.type_key, "title": tt.title, "destructive": tt.destructive,
         "reversible": tt.reversible, "action_class": tt.action_class,
         "external_verifier": tt.external_verifier, "verification_window_s": tt.verification_window_s}
        for tt in snap.task_types.values()
    ]}


@router.get("/catalog")
def catalog(request: Request, principal: Principal = Depends(require_read)) -> dict:
    snap, _ = request.app.state.store.current()
    if snap is None:
        return {"catalog": []}
    return {"catalog": [
        {"playbook_key": ce.playbook_key, "action_class": ce.action_class, "risk_class": ce.risk_class,
         "applicable_tiers": list(ce.applicable_tiers), "rollback_declared": ce.rollback_declared,
         "rollback_method": ce.rollback_method, "duration_estimate_s": ce.duration_estimate_s,
         "sandbox_eligible": ce.sandbox_eligible}
        for ce in snap.catalog.values()
    ]}


@router.get("/catalog/{playbook_key}")
def catalog_one(playbook_key: str, request: Request, principal: Principal = Depends(require_read)):
    snap, _ = request.app.state.store.current()
    ce = snap.catalog.get(playbook_key) if snap else None
    if ce is None:
        return JSONResponse({"error": {"code": "not_found", "message": "no such playbook", "status": 404}},
                            status_code=404)
    return {"playbook_key": ce.playbook_key, "action_class": ce.action_class, "risk_class": ce.risk_class,
            "applicable_tiers": list(ce.applicable_tiers), "rollback_declared": ce.rollback_declared,
            "rollback_method": ce.rollback_method, "duration_estimate_s": ce.duration_estimate_s,
            "sandbox_eligible": ce.sandbox_eligible}


@router.get("/sandbox/pool")
def sandbox_pool(request: Request, principal: Principal = Depends(require_read)) -> dict:
    snap, _ = request.app.state.store.current()
    if snap is None:
        return {"enabled": False, "slots": []}
    slots = [{"host_id": h.host_id, "class": "disposable", "vault_creds": "none",
              "verdict_basis": "sandbox_carve_out"}
             for h in snap.hosts.values() if h.host_class == "disposable"]
    return {"enabled": snap.sandbox_enabled, "slots": slots}
