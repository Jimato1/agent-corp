"""The policy write path (human-only) — the §6 change-control ceremony + benign ops.

Writes split by direction and channel:

* **Gate-weakening / holder** (``cmdb:write-policy``, §8 holder token + DPoP + live check):
  ``/policy/propose`` → ``/policy/confirm``; ``/break-glass``; ``/re-arm`` (step-up ack).
* **Tightening / benign** (``cmdb:manage``, operator human): ``/sandbox/pool/disable``,
  ``/sync/trigger``, ``/drift/ack``, ``/escalations/{id}/resend``.

Zero mutation verbs exist on the agent MCP server (structural absence, §7.2); the ONLY
policy writer in the suite is this operator surface.
"""
from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from fastapi import Depends

from ..authn.principal import HolderRejected, Principal, require_manage, validate_holder_write
from ..core.errors import AppError
from ..services import escalations as escal
from ..services import wazuh
from ..services.change_control import ChangeError

router = APIRouter()


def _holder(request: Request):
    try:
        return validate_holder_write(request)
    except HolderRejected as exc:
        raise AppError(exc.message, code=exc.code,
                       status=401 if exc.code == "unauthenticated" else 403) from exc


def _change_err(exc: ChangeError) -> AppError:
    return AppError(exc.message, code=exc.code, status=exc.status)


class ProposeIn(BaseModel):
    model_config = {"extra": "forbid"}
    target_kind: str
    key: str
    action: str = "upsert"
    frontmatter: dict | None = None


@router.post("/policy/propose")
def policy_propose(body: ProposeIn, request: Request) -> dict:
    hc = _holder(request)
    cc = request.app.state.change_control
    try:
        r = cc.propose(hc.principal, body.target_kind, body.key, body.action, body.frontmatter)
    except ChangeError as exc:
        raise _change_err(exc) from exc
    return {
        "confirm_token": r.confirm_token, "diff_hash": r.diff_hash,
        "classification": {"weakening": r.weakening, "reasons": r.typed_diff.get("reasons", [])},
        "friction": r.friction, "typed_diff": r.typed_diff, "blast_radius": r.blast_radius,
        "expected_intent": r.expected_intent, "edit_kind": r.edit_kind,
    }


class ConfirmIn(BaseModel):
    model_config = {"extra": "forbid"}
    confirm_token: str
    typed_intent: str = ""
    diff_hash: str


@router.post("/policy/confirm")
def policy_confirm(body: ConfirmIn, request: Request) -> dict:
    hc = _holder(request)
    cc = request.app.state.change_control
    try:
        return cc.confirm(hc, body.confirm_token, body.typed_intent, body.diff_hash)
    except ChangeError as exc:
        raise _change_err(exc) from exc


class BreakGlassIn(BaseModel):
    model_config = {"extra": "forbid"}
    host_id: str
    minutes: int
    overrides_freeze: bool = False
    tzid: str = "Etc/UTC"


@router.post("/break-glass")
def break_glass(body: BreakGlassIn, request: Request) -> dict:
    """Propose a bounded (≤4h) emergency window; the operator then confirms via
    /policy/confirm with the louder typed intent (§6.4)."""
    hc = _holder(request)
    cc = request.app.state.change_control
    try:
        r = cc.propose_break_glass(hc.principal, body.host_id, body.minutes,
                                   overrides_freeze=body.overrides_freeze, tzid=body.tzid)
    except ChangeError as exc:
        raise _change_err(exc) from exc
    return {
        "confirm_token": r.confirm_token, "diff_hash": r.diff_hash,
        "classification": {"weakening": True}, "friction": "full",
        "typed_diff": r.typed_diff, "blast_radius": r.blast_radius,
        "expected_intent": r.expected_intent, "edit_kind": "break_glass",
    }


@router.post("/re-arm")
def re_arm(request: Request) -> dict:
    """Step-up-confirmed re-arm after a detected restore / boot-integrity failure (§5.11)."""
    _holder(request)  # holder step-up required to re-arm the gate
    integ = request.app.state.store.re_arm()
    return {"integrity_ok": integ.ok, "reason": integ.reason, "head": integ.head}


# ---- Benign (cmdb:manage) ---------------------------------------------------------

@router.post("/sandbox/pool/disable")
def sandbox_disable(request: Request, p: Principal = Depends(require_manage)) -> dict:
    """The operator's sandbox KILL KNOB — an instant, ceremony-free TIGHTENING (§5.7)."""
    snap, _ = request.app.state.store.current()
    fm = {"enabled": False, "slots": [{"host_id": h.host_id}
                                      for h in (snap.hosts.values() if snap else []) if h.host_class == "disposable"]}
    cc = request.app.state.change_control
    try:
        return cc.apply_direct_tightening(p.sub, "sandbox_pool", "pool", "upsert", fm, "sandbox_disable")
    except ChangeError as exc:
        raise _change_err(exc) from exc


@router.post("/sync/trigger")
def sync_trigger(request: Request, p: Principal = Depends(require_manage)) -> dict:
    snap, _ = request.app.state.store.current()
    status = wazuh.poll_once(request.app.state.db, request.app.state.settings, snap)
    request.app.state.wazuh_last_status = status
    return {"ok": status.ok, "reason": status.reason, "last_poll": status.last_poll}


@router.post("/escalations/{escalation_id}/resend")
def escalation_resend(escalation_id: int, request: Request, p: Principal = Depends(require_manage)) -> dict:
    ok = escal.resend(request.app.state.db, escalation_id)
    return {"ok": ok}
