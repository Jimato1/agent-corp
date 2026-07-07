"""Audit-anchor continuity — GET /api/anchors + POST /api/anchors (seam #25).

POST is the Gateway producer endpoint (``svc:gateway``, scope ``mc:anchor``): MC retains
the signed HEAD tuples append-only, idempotent by ``(chain_id, seq)``, and NEVER validates
chain internals (the Gateway's chain is canonical; MC anchors the hash, not the contents —
contract §5). On (re)connect MC advertises its last retained ``(chain_id, seq)`` so the
Gateway backfills the benign gap (contract §3). Anchor-push failure alarms but does NOT
imply a Gateway stop (contract §4). This copy is NEVER read back into any decision path.

GET renders the HEAD series + continuity status: CONTINUOUS / RESYNC-PENDING (benign gap)
/ regression-fork (tamper alarm) — each a distinct honest status, never false-green.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_anchor, require_read
from ..schemas import AnchorPushIn
from . import get_repo

router = APIRouter(tags=["anchors"])


@router.post("/anchors")
async def push_anchor(body: AnchorPushIn, request: Request,
                      principal: Principal = Depends(require_anchor)):
    repo = get_repo(request)
    status = repo.retain_head(body.chain_id, body.seq, body.head_hash,
                              body.signed_at, body.sig, body.prev_seq)
    last = repo.last_retained(body.chain_id)
    # Advertise last retained (chain_id, seq) so the Gateway backfills any gap on reconnect.
    return {
        "status": status,   # retained | duplicate | regression
        "chain_id": body.chain_id,
        "last_retained": {"chain_id": last["chain_id"], "seq": last["seq_num"]} if last else None,
        "note": "MC anchors the hash, not the contents; this copy is never read back into a decision.",
    }


@router.get("/anchors")
async def get_anchors(request: Request, chain_id: str | None = None,
                      _: Principal = Depends(require_read)):
    repo = get_repo(request)
    chains = [chain_id] if chain_id else repo.anchor_chains()
    continuity = [repo.continuity_status(c) for c in chains]
    series = repo.anchor_series(chain_id)
    return {
        "source": "gateway push",
        "chains": continuity,
        "series": series,
        "note": ("anchor-push freshness is the witness's freshness, NOT Gateway execution "
                 "health; a stale anchor is RESYNC-PENDING (gold), not a Gateway stop."),
    }
