"""WIP & budget monitors — /api/budgets, /api/budgets/clamp, /api/wip (PLAN §1.2, §6.2).

Read-side: auth's four budget dimensions per ``sub`` (rate/concurrency/cooldown/lifetime
— NEVER dollars) via **auth's budget-check API** (S5 Option B — MC never opens auth's
Redis); Board WIP caps + counts via Board reads; the global-WIP tally from the
**DEDICATED mc budget store** (``source: redis`` — separate from auth's private Redis).

Write-side (operator-only): budget **clamp** relays to auth's budget API; **WIP cap**
change relays to Board's WIP surface. Loop-guard/spawn-depth flags are surfaced +
auto-triaged here, **enforced at the Board** (D-11) — MC never enforces, never writes
lineage.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from ..authn.principal import Principal, require_admin, require_kill, require_read
from ..schemas import BudgetClampIn, WipChangeIn
from . import get_auth, get_board, get_budget_store, get_repo

router = APIRouter(tags=["budgets"])


@router.get("/budgets")
async def budgets(request: Request, _: Principal = Depends(require_read)):
    auth = get_auth(request)
    board = get_board(request)
    store = get_budget_store(request)

    budget_src = await auth.get_budget_status()
    wip_src = await board.get_wip()
    global_wip, wip_live = store.get_wip("global")

    return {
        "budgets": {
            "source": "auth", "stale": budget_src.stale, "error": budget_src.error,
            "data": budget_src.data,
        },
        "wip_caps": {
            "source": "board", "stale": wip_src.stale, "error": wip_src.error,
            "data": wip_src.data,
        },
        "global_wip": {
            # The DEDICATED mc store — separate from auth's private Redis (S5).
            "source": "redis", "backend": store.backend, "live": wip_live, "count": global_wip,
        },
        "note": "loop-guard/spawn-depth are surfaced + auto-triaged here; the Board enforces (D-11).",
    }


@router.post("/budgets/clamp")
async def clamp(body: BudgetClampIn, request: Request, principal: Principal = Depends(require_admin)):
    """Relay a budget clamp to auth's budget API under the operator's session. Tightening
    is toward-LESS action (light friction, UI); widening is toward-MORE (full friction, UI).
    MC holds no budget authority — it forwards the operator's proof."""
    repo = get_repo(request)
    repo.audit(principal.sub, "budget_clamp", body.sub, "requested",
               f"{body.dimension}={body.value} ({body.direction})")
    # The actual write is the operator's call to auth's budget API; MC records the request.
    return {"relayed": True, "target": "auth budget API", "direction": body.direction}


@router.post("/wip")
async def wip(body: WipChangeIn, request: Request, principal: Principal = Depends(require_admin)):
    """Relay a WIP-cap change to Board's WIP surface. MC surfaces + triages; Board enforces."""
    board = get_board(request)
    repo = get_repo(request)
    forward = {k: v for k, v in request.headers.items()
               if k.lower() in ("authorization", "dpop", "x-auth-identity")}
    repo.audit(principal.sub, "wip_change", "global", "requested",
               f"cap={body.global_cap} ({body.direction})")
    status, error = await board.relay_wip(body.global_cap, principal.sub, forward)
    if error or status >= 300:
        repo.audit(principal.sub, "wip_change", "global", "failed", error or f"board {status}")
        return JSONResponse(status_code=502, content={"relayed": False, "error": error or f"board {status}"})
    return {"relayed": True, "target": "board WIP surface", "global_cap": body.global_cap}
