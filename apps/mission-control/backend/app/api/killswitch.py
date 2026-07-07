"""Kill-switch relay — POST /api/killswitch/raise (PLAN §5.1; killswitch-chain §1, MC-btn).

MC keeps the cockpit kill button, wired to **CALL auth's** level-addressed trigger. MC
is **NOT a second enforcer**: it mints no epoch, holds no standing kill credential, and
stores no authoritative "halted" boolean. The request is sender-constrained to the
operator's live session — MC forwards the operator's Authorization + DPoP proof
UNTOUCHED (never re-signs; §5.1). Any non-2xx/timeout => **HALT NOT CONFIRMED** + a
hard hand-off to auth's outage-surviving ``safe_stopped`` console (H1). Every press
writes an ``mc_audit`` request-side row (the record of a kill that never reached auth
exists nowhere else — ARCH §10 test); MC never writes auth's ledger.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from ..authn.principal import Principal, require_kill
from ..schemas import KillswitchRaiseIn
from . import get_auth, get_repo

router = APIRouter(tags=["killswitch"])

# Headers forwarded UNTOUCHED so auth resolves the operator's sender-bound proof itself
# (MC preserves sender-constraint end-to-end; it never re-signs — JC-4).
_FORWARD = ("authorization", "dpop", "x-auth-identity")


@router.post("/killswitch/raise")
async def raise_kill(body: KillswitchRaiseIn, request: Request,
                     principal: Principal = Depends(require_kill)):
    auth = get_auth(request)
    repo = get_repo(request)

    forward = {k: v for k, v in request.headers.items() if k.lower() in _FORWARD}
    # Request-side record FIRST — so a call that never returns is still auditable.
    repo.audit(principal.sub, "killswitch_relay", body.level, "requested", body.reason[:200])

    status, resp_body, error = await auth.relay_killswitch(
        level=body.level, reason=body.reason, issued_by=principal.sub, forward_headers=forward)

    if error is not None or status == 0 or status >= 300:
        # FAIL-LOUD: HALT NOT CONFIRMED — hand off to auth's console (H1). NOT a red error;
        # the UI renders this gold and terminal. MC asserts nothing about the actual state.
        repo.audit(principal.sub, "killswitch_relay", body.level, "halt_not_confirmed",
                   error or f"auth {status}")
        return JSONResponse(
            status_code=502,
            content={
                "halt_confirmed": False,
                "reason": "HALT NOT CONFIRMED",
                "detail": ("The kill-switch call to auth did not confirm. auth's console is the "
                           "canonical outage-surviving control; MC's button is trustworthy only "
                           "while auth is healthy."),
                "safe_stopped_url": f"{auth.base_url}/safe_stopped",
                "upstream_status": status, "error": error,
            },
        )

    # auth confirmed — MC still stores NO authoritative halted boolean. The UI reads the
    # halt posture back from /api/posture (auth-sourced), never from this response.
    repo.audit(principal.sub, "killswitch_relay", body.level, "confirmed",
               f"auth {status}")
    return {"halt_confirmed": True, "relayed": True, "level": body.level,
            "note": "auth minted the epoch and propagates it; MC is a relay, not an enforcer.",
            "auth_response": resp_body}
