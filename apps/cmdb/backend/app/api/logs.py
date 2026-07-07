"""Read APIs for the two canonical logs + escalation outbox + discovery + sync status +
the system posture the operator shell renders."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_read
from ..chainlog import verify_chain
from ..clock import check_clock
from ..services.decision import decision_log
from ..services.escalations import list_outbox
from ..services.inventory import list_discovered

router = APIRouter()


@router.get("/decision-log")
def decisions(request: Request, host_id: str | None = None, action_class: str | None = None,
              verdict: str | None = None, principal: Principal = Depends(require_read)) -> dict:
    return {"decisions": decision_log(request.app.state.db, host_id=host_id,
                                      action_class=action_class, verdict=verdict)}


@router.get("/policy-change-log")
def change_log(request: Request, principal: Principal = Depends(require_read)) -> dict:
    conn = request.app.state.db.reader()
    try:
        rows = conn.execute("SELECT * FROM policy_change_log ORDER BY seq DESC LIMIT 500").fetchall()
        entries = [dict(r) for r in rows]
    finally:
        conn.close()
    intact, reason = verify_chain(request.app.state.db)
    _, integ = request.app.state.store.current()
    return {
        "entries": entries,
        "chain_verify": {"intact": intact, "reason": reason},
        # The out-of-band verify banner (§5.11): the console can lie; trust the remote.
        "remote_ok": integ.remote_ok,
        "remote_configured": request.app.state.settings.require_remote,
    }


@router.get("/escalations")
def escalations_list(request: Request, principal: Principal = Depends(require_read)) -> dict:
    st = request.app.state.settings
    return {
        "escalations": list_outbox(request.app.state.db),
        "svc_cmdb_present": bool(st.board_escalation_url),
        "board_intake_up": bool(st.board_escalation_url),
        "degraded_but_honest": not bool(st.board_escalation_url),
    }


@router.get("/discovered")
def discovered(request: Request, principal: Principal = Depends(require_read)) -> dict:
    return {"discovered": list_discovered(request.app.state.db)}


@router.get("/wazuh/sync-status")
def sync_status(request: Request, principal: Principal = Depends(require_read)) -> dict:
    st = request.app.state
    last = getattr(st, "wazuh_last_status", None)
    return {
        "enabled": st.settings.wazuh_enabled,
        "last_poll": getattr(last, "last_poll", None),
        "ok": getattr(last, "ok", False),
        "reason": getattr(last, "reason", "never_polled"),
        "account_scopes": ["agent:read", "syscollector:read", "group:read"],
    }


@router.get("/posture")
def posture(request: Request, principal: Principal = Depends(require_read)) -> dict:
    """The SYSTEM STATE the shell renders (read-only HaltBand mirror + gate health)."""
    snap, integ = request.app.state.store.current()
    clock = check_clock(request.app.state.settings)
    return {
        "policy_version": snap.git_commit if snap else None,
        "head": integ.head,
        "integrity_ok": integ.ok,
        "integrity_reason": integ.reason,
        "gate_degraded": not integ.ok,  # SAFE-STOPPED band drives off this
        "clock_ok": clock.ok,
        "clock_reason": clock.reason,
        "sandbox_enabled": snap.sandbox_enabled if snap else False,
        "remote_ok": integ.remote_ok,
    }
