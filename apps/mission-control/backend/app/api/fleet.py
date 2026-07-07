"""Live agent view — /api/fleet + /api/agents/{sub} (PLAN §1.1, §6.1).

The liveness engine runs here over ``agent_view`` frames. Liveness is NEVER a bare
green dot — the response carries the phi figure, last-beat age, drain/zombie state, and
the correlated-loss suppression verdict so the UI can honor the false-green rule.
Spawn tree comes from **Board lineage** (a separate composition read), NEVER from
heartbeats (contract §2).
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_read
from ..liveness.engine import classify_agent, population_gate
from . import get_board, get_repo

router = APIRouter(tags=["fleet"])


@router.get("/fleet")
async def fleet(request: Request, _: Principal = Depends(require_read)):
    repo = get_repo(request)
    board = get_board(request)
    params = repo.liveness_params()
    now = time.time()
    frames = repo.agent_frames()

    # Board current-generation lookup for zombie detection (one composition read, cached).
    board_gens: dict[str, int] = {}
    wip = await board.get_wip()
    if wip.data and isinstance(wip.data, dict):
        board_gens = {str(k): int(v) for k, v in (wip.data.get("lock_generation") or {}).items()}

    agents = []
    classifications = []
    for f in frames:
        frame = {**f, "sub": f["sub"]}
        gen = board_gens.get(str(f.get("claimed_ticket_id")))
        cl = classify_agent(frame, params, now, board_current_gen=gen)
        classifications.append(cl)
        agents.append({
            "sub": cl.sub,
            "liveness": cl.liveness,
            "phi": cl.phi,
            "hb_age": round(cl.hb_age, 1) if cl.hb_age is not None else None,
            "progress_age": round(cl.progress_age, 1) if cl.progress_age is not None else None,
            "wedged_dark": cl.wedged_dark,
            "flags": cl.flags,
            "claimed_ticket_id": f.get("claimed_ticket_id"),
            "step_seq": f.get("step_seq"),
            "model_version": f.get("model_version"),
            "persona_version": f.get("persona_version"),
            "drain_state": f.get("drain_state"),
            "fencing_token": f.get("fencing_token"),
        })

    roster = repo.roster_denominator()
    verdict = population_gate(classifications, roster, params)
    return {
        "source": "runtime",
        "as_of_seconds": 0.0,
        "roster": roster,
        "presizing": params.presizing,
        "suppression": {
            "suppressed": verdict.suppressed,
            "anomaly": verdict.anomaly,
            "suspect_count": verdict.suspect_count,
            "reason": verdict.reason,
            "cross_checks": ["dead_man_frame", "auth_health", "edge_health"],
        },
        # Under suppression the UI hides per-agent DEATH display but the fact is loud;
        # the roster is still returned so the operator can drill in deliberately.
        "agents": agents,
        "fleet_stream_present": bool(repo.fleet_frames()),
    }


@router.get("/agents/{sub:path}")
async def agent_drill(sub: str, request: Request, _: Principal = Depends(require_read)):
    repo = get_repo(request)
    board = get_board(request)
    params = repo.liveness_params()
    now = time.time()
    f = repo.agent_frame(sub)
    lineage = await board.get_agent_lineage(sub)   # spawn tree from Board lineage, never heartbeats
    if f is None:
        return {
            "sub": sub, "present": False,
            "message": "not currently reporting to the runtime supervisor",
            "lineage": lineage.to_json(),   # Board-sourced panels stay live even when the stream is absent
        }
    gen = None
    wip = await board.get_wip()
    if wip.data and isinstance(wip.data, dict):
        gen = (wip.data.get("lock_generation") or {}).get(str(f.get("claimed_ticket_id")))
    cl = classify_agent({**f, "sub": sub}, params, now, board_current_gen=(int(gen) if gen else None))
    return {
        "sub": sub, "present": True, "source": "runtime",
        "liveness": cl.liveness, "phi": cl.phi,
        "hb_age": round(cl.hb_age, 1) if cl.hb_age is not None else None,
        "flags": cl.flags, "frame": {k: f.get(k) for k in
            ("claimed_ticket_id", "step_seq", "model_version", "persona_version",
             "drain_state", "fencing_token", "session_id")},
        "lineage": lineage.to_json(),
    }
