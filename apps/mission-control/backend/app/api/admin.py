"""MC-local operator state — /api/params, /api/silences, /api/filters, /api/audit
(PLAN §6.2; §3.10 settings). Scope ``mc:admin`` on writes; audited to ``mc_audit``.

``guardrail_params`` carry NO compiled-in enforcement value (D-12, PLAN §4.3): each row
reports ``is_unset`` / ``presizing`` / ``restored`` so the UI can nag until the operator
sets them. Param saves are diff-hash-bound (policy-plane change control, ARCH §12) and
tamper-evident (mc_audit).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_admin, require_read
from ..schemas import FilterIn, ParamSaveIn, SilenceIn
from . import get_repo

router = APIRouter(tags=["admin"])


@router.get("/params")
async def get_params(request: Request, _: Principal = Depends(require_read)):
    repo = get_repo(request)
    rows = repo.get_params_raw()
    return {
        "params": [{
            "key": r["key"], "value": r["value"],
            "unset": bool(r["is_unset"]), "presizing": bool(r["presizing"]),
            "restored": bool(r["restored"]),
        } for r in rows],
        "note": ("no component enforces on a PRE-SIZING/UNSET value — display/triage only "
                 "until the operator confirms post gap-1.2 (D-12)."),
    }


@router.post("/params")
async def save_param(body: ParamSaveIn, request: Request, principal: Principal = Depends(require_admin)):
    repo = get_repo(request)
    repo.set_param(body.key, body.value, principal.sub)
    # diff-hash binding is recorded for the tamper-evident audit (policy-plane change control).
    if body.diff_hash:
        repo.audit(principal.sub, "param_diff_hash", body.key, "bound", body.diff_hash)
    return {"saved": True, "key": body.key, "value": body.value, "presizing": False, "unset": False}


@router.get("/silences")
async def list_silences(request: Request, _: Principal = Depends(require_read)):
    return {"silences": get_repo(request).list_silences()}


@router.post("/silences")
async def add_silence(body: SilenceIn, request: Request, principal: Principal = Depends(require_admin)):
    get_repo(request).add_silence(body.scope_key, principal.sub, body.ttl_seconds)
    return {"added": True, "scope_key": body.scope_key}


@router.get("/filters")
async def list_filters(request: Request, _: Principal = Depends(require_read)):
    return {"filters": get_repo(request).list_filters()}


@router.post("/filters")
async def save_filter(body: FilterIn, request: Request, principal: Principal = Depends(require_admin)):
    get_repo(request).save_filter(body.name, body.spec, principal.sub)
    return {"saved": True, "name": body.name}


@router.get("/audit")
async def audit_tail(request: Request, _: Principal = Depends(require_read)):
    return {"audit": get_repo(request).audit_tail()}
