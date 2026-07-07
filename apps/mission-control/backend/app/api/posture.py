"""Kill mirror — GET /api/posture (PLAN §5.2; killswitch-chain §4, R9 CLOSED).

Read-only, honest. Halt posture derives EXCLUSIVELY from auth's epoch/halt-status.
**L2-CONFIRMED = auth's DIRECT Gateway read ONLY.** Any value whose provenance is an MC
relay renders at most STALE-UNKNOWN with mirror-age, never CONFIRMED — regardless of
freshness. CONFIRMED additionally degrades to STALE-UNKNOWN past
``posture_freshness_bound``. MC never mints, stores, or caches an authoritative "halted"
boolean, and this endpoint is display-advisory — no consumer may condition behavior on
it (epoch truth reaches every RS from auth directly).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_read
from . import get_auth, get_repo

router = APIRouter(tags=["posture"])


@router.get("/posture")
async def posture(request: Request, _: Principal = Depends(require_read)):
    auth = get_auth(request)
    repo = get_repo(request)
    bound = repo.s.posture_freshness_bound_seconds
    src = await auth.get_posture()

    if src.data is None:
        # STALE-UNKNOWN, maximally loud; auth-console deep-link is the primary next action (H7).
        return {
            "source": "auth", "stale": True, "error": src.error,
            "level": "UNKNOWN", "epoch": None,
            "l1": {"status": "STALE-UNKNOWN"},
            "l2": {"status": "STALE-UNKNOWN", "provenance": None},
            "readout": "STALE-UNKNOWN",
            "safe_stopped_url": f"{auth.base_url}/safe_stopped",
        }

    d = src.data if isinstance(src.data, dict) else {}
    l1 = d.get("l1", {})
    l2 = d.get("l2", {})
    age = src.as_of
    fresh = age <= bound and not src.stale

    # L1 = auth's own enforced state (epoch/level). Degrades past the freshness bound.
    l1_status = l1.get("status", "enforced") if fresh else "STALE-UNKNOWN"

    # L2 CONFIRMED only when the mirrored auth readout itself carries direct-Gateway
    # provenance AND is fresh; ANY MC-relayed provenance is capped STALE-UNKNOWN.
    l2_prov = l2.get("provenance")
    if l2_prov == "auth-direct" and l2.get("status") == "confirmed" and fresh:
        l2_status = "CONFIRMED"
    else:
        l2_status = "STALE-UNKNOWN"

    return {
        "source": "auth",
        "stale": src.stale,
        "as_of_seconds": round(age, 3),
        "freshness_bound_seconds": bound,
        "level": d.get("level", "G0"),
        "epoch": d.get("epoch"),
        "l1": {"status": l1_status, "epoch": d.get("epoch"), "age": round(age, 3)},
        "l2": {"status": l2_status, "provenance": l2_prov, "age": round(age, 3)},
        "readout": "CONFIRMED" if (l1_status == "enforced" and fresh) else "STALE-UNKNOWN",
        "safe_stopped_url": f"{auth.base_url}/safe_stopped",
    }
