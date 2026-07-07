"""Fleet + host detail + host-facts (Library seam) + the operator dry-run/explain."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from ..authn.principal import Principal, require_read
from ..core.errors import ValidationFailed
from ..policy.windows import evaluate_windows
from ..clock import now_dt
from ..services.decision import issue_verdict
from ..services.inventory import get_host_detail, resolve_host_facts

router = APIRouter()


def _window_state(host) -> str:
    if host.host_class == "disposable":
        return "n/a"
    if host.tier is None:
        return "deny(no_policy)"
    wr = evaluate_windows(host.windows, now_dt())
    if wr.active_freeze:
        return "FREEZE-ACTIVE"
    if wr.in_window:
        return "IN-WINDOW"
    return "CLOSED"


@router.get("/hosts")
def list_hosts(request: Request, tier: str | None = None, host_class: str | None = None,
               window: str | None = None, principal: Principal = Depends(require_read)) -> dict:
    snap, integ = request.app.state.store.current()
    if snap is None:
        return {"hosts": [], "integrity": integ.reason, "gate_degraded": True}
    out = []
    for h in snap.hosts.values():
        if tier and h.tier != tier:
            continue
        if host_class and h.host_class != host_class:
            continue
        ws = _window_state(h)
        if window and ws != window:
            continue
        out.append({
            "host_id": h.host_id, "criticality": h.tier or "unpolicied",
            "class": h.host_class, "window_state": ws, "lifecycle": h.lifecycle,
            "wazuh_bound": bool(h.wazuh_agent_id),
        })
    # Disposable rows are always flagged + excluded from managed queries by default (§C6.3).
    return {"hosts": out, "gate_degraded": not integ.ok, "policy_version": snap.git_commit}


@router.get("/hosts/{host_id}")
def get_host(host_id: str, request: Request, principal: Principal = Depends(require_read)) -> dict:
    snap, _ = request.app.state.store.current()
    detail = get_host_detail(request.app.state.db, snap, host_id)
    if detail is None:
        return JSONResponse({"error": {"code": "not_found", "message": "no such host", "status": 404}},
                            status_code=404)
    return detail


@router.get("/hosts/{host_id}/facts")
def host_facts(host_id: str, request: Request, principal: Principal = Depends(require_read)):
    """cmdb-library-hostfacts.md §1: inventory facts ONLY — never policy. Honest 404."""
    snap, _ = request.app.state.store.current()
    facts = resolve_host_facts(request.app.state.db, snap, host_id)
    if facts is None:
        return JSONResponse({"error": {"code": "not_found", "message": "no such host", "status": 404}},
                            status_code=404)
    return JSONResponse(facts, headers={"Cache-Control": "max-age=300"})


@router.get("/explain")
def explain(request: Request, host_id: str, action_class: str, at: str | None = None,
            principal: Principal = Depends(require_read)) -> dict:
    """The operator dry-run — the SAME evaluate() as the binding endpoint, UNSIGNED/advisory
    (no aud, no JWS — mechanically unusable at the Gateway). Two views, one state."""
    if not host_id or not action_class:
        raise ValidationFailed("host_id and action_class are required")
    claims, _ = issue_verdict(
        request.app.state, host_id=host_id, action_class=action_class,
        caller_sub=principal.sub, binding=False, aud=None,
    )
    return {"verdict": claims, "signed": False, "advisory": True}
