"""The binding verdict endpoint (cmdb-gateway-policy.md §1) + the verdict JWKS (§2).

``POST /v1/decision`` is the ONE binding call. The query is subject-free for authorization
(who-is-asking never changes the verdict); the authenticated caller identity selects only
the verdict token's ``aud`` (verdict-token §3) and the audit row. A signed JWS is minted
ONLY for ``svc:gateway`` (→ ``gateway``) or ``svc:tier-approver`` (→ ``board``); every
other caller gets the unsigned advisory JSON.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from ..authn.principal import Principal, audience_for_caller, require_read
from ..services.decision import issue_verdict

router = APIRouter()


class DecisionIn(BaseModel):
    model_config = {"extra": "forbid"}
    host_id: str
    action_class: str
    at: str | None = None            # advisory ONLY — CMDB evaluates on its own clock
    ticket_ref: str | None = None    # audit correlation ONLY
    req_nonce: str | None = Field(default=None, description="optional per-request freshness (verdict-token §5)")


@router.post("/decision")
def post_decision(body: DecisionIn, request: Request,
                  principal: Principal = Depends(require_read)) -> dict:
    aud = audience_for_caller(principal.sub)
    claims, signed = issue_verdict(
        request.app.state, host_id=body.host_id, action_class=body.action_class,
        caller_sub=principal.sub, binding=True, req_nonce=body.req_nonce, aud=aud,
        ticket_ref=body.ticket_ref,
    )
    # Signed token for a gateway/board caller; unsigned advisory otherwise (mechanically
    # unusable at the Gateway — no signature, no/other aud).
    return {"verdict": claims, "token": signed, "signed": signed is not None}


@router.get("/verdict-jwks")
def verdict_jwks(request: Request) -> dict:
    """CMDB's verdict-signing public keys (a DIFFERENT trust root from auth's JWKS)."""
    return request.app.state.signer.jwks()
