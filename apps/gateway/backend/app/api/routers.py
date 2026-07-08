"""Operator console + contract-surface routers (UI_SPEC §12). All reads gate on ``gateway:read``
(operator forward-auth or a read token); the two operator writes gate on operator identity +
step-up confirm and are audit-chained. Every response is ``Cache-Control: no-store`` (middleware).
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse

from ..authn.principal import Principal, current_principal, require_read
from ..core.errors import Forbidden, ValidationFailed
from ..clock import now_iso

router = APIRouter(tags=["console"])


def _require_operator(request: Request) -> Principal:
    p = current_principal(request)
    if p.kind != "operator":
        raise Forbidden("this write is operator-only (human forward-auth session).", code="insufficient_scope")
    return p


# ---- S1 live monitor / S2 run detail ---------------------------------------
@router.get("/runs")
def list_runs(request: Request, state: str | None = Query(None), host_id: str | None = Query(None),
              _: Principal = Depends(require_read)) -> dict:
    return {"runs": request.app.state.runs.list(state=state, host_id=host_id)}


@router.get("/runs/{run_id}")
def get_run(run_id: str, request: Request, _: Principal = Depends(require_read)) -> JSONResponse:
    st = request.app.state
    row = st.runs.get(run_id)
    if row is None:
        return JSONResponse({"error": {"code": "not_found", "message": "no such run", "status": 404}}, status_code=404)
    # Reconstruct the SoD proof from the chain alone (PLAN §3 — the S2 job).
    c = st.db.reader()
    try:
        c.execute("SELECT seq, record_type, action, target, outcome, ts, payload FROM audit_chain "
                  "WHERE run_id = ? ORDER BY seq ASC", (run_id,))
        chain = c.fetchall()
    finally:
        c.close()
    return JSONResponse({"run": row, "sod_chain": _sod_from_chain(chain), "events": chain})


def _sod_from_chain(chain: list[dict]) -> dict:
    """Distil the four checks (+ Check-0 caller) evidence from the run's audit records."""
    by_type = {r["record_type"]: r for r in chain}
    return {
        "check1_board": _ev(by_type.get("consume_approval"), "approval"),
        "check2_cmdb": _ev(by_type.get("cmdb_verdict"), "policy"),
        "check3_vault": _ev(by_type.get("cred_redeem"), "credential"),
        "check4_mutex": _ev(by_type.get("mutex"), "mutex"),
        "reject": _ev(by_type.get("reject"), "reject"),
        "note": "SoD is enforced in Gateway code, not here. This displays the evidence; no control "
                "on this page can skip, relax, or re-order a check.",
    }


def _ev(rec, kind):
    if not rec:
        return None
    payload = rec.get("payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {}
    return {"kind": kind, "outcome": rec.get("outcome"), "at": rec.get("ts"), "evidence": payload}


@router.get("/runs/{run_id}/events")
async def run_events(run_id: str, request: Request, _: Principal = Depends(require_read)) -> StreamingResponse:
    """SSE tail over the audit store (LiveStream §5.5) — separate from the agent MCP task channel."""
    st = request.app.state

    async def gen():
        last = 0
        for _i in range(3):  # bounded demo tail; production keeps the stream open
            c = st.db.reader()
            try:
                c.execute("SELECT seq, record_type, action, outcome, ts FROM audit_chain "
                          "WHERE run_id = ? AND seq > ? ORDER BY seq ASC", (run_id, last))
                rows = c.fetchall()
            finally:
                c.close()
            for r in rows:
                last = int(r["seq"])
                yield f"id: {r['seq']}\ndata: {json.dumps(r)}\n\n"
            await asyncio.sleep(0.05)
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


# ---- S1 hosts --------------------------------------------------------------
@router.get("/hosts")
def list_hosts(request: Request, _: Principal = Depends(require_read)) -> dict:
    st = request.app.state
    c = st.db.reader()
    try:
        c.execute("SELECT host_id, fence FROM host_fence ORDER BY host_id")
        fences = c.fetchall()
    finally:
        c.close()
    active = {r["host_id"]: r for r in st.runs.list(state="active", limit=500)}
    hosts = []
    for f in fences:
        hid = f["host_id"]
        hosts.append({"host_id": hid, "fence": int(f["fence"]),
                      "active_run": active.get(hid, {}).get("run_id"),
                      "state": active.get(hid, {}).get("state", "idle")})
    return {"hosts": hosts}


# ---- S3 audit --------------------------------------------------------------
@router.get("/audit")
def audit(request: Request, verify_from: int | None = Query(None), limit: int = Query(200),
          _: Principal = Depends(require_read)) -> dict:
    st = request.app.state
    c = st.db.reader()
    try:
        c.execute("SELECT seq, chain_id, run_id, record_type, actor_sub, action, target, outcome, ts "
                  "FROM audit_chain ORDER BY seq DESC LIMIT ?", (limit,))
        rows = c.fetchall()
    finally:
        c.close()
    out = {"chain_id": st.settings.chain_id, "records": rows, "anchor": st.anchor.anchor_status()}
    if verify_from is not None:
        intact, reason, lo, hi = st.chain.verify(verify_from)
        # green ONLY on a completed successful walk; BROKEN is a content alarm (UI_SPEC §6).
        out["verify"] = {"result": "verified" if intact else "broken", "reason": reason, "from": lo, "to": hi}
    return out


# ---- S4 kill-switch (auth's direct L2-CONFIRMED read) ----------------------
@router.get("/halt-status")
def halt_status(request: Request) -> dict:
    """Read directly by auth as the SOLE L2-CONFIRMED source (killswitch-chain §4). Signed tuple.
    Deliberately readable without a scope gate so auth can poll it out-of-band."""
    return request.app.state.kill.halt_status()


# ---- S5 catalog (the ONE operator write) -----------------------------------
@router.get("/catalog")
def get_catalog(request: Request, _: Principal = Depends(require_read)) -> dict:
    return {"catalog": request.app.state.catalog.all()}


@router.post("/catalog")
def promote_catalog(request: Request, body: dict, principal: Principal = Depends(_require_operator)) -> dict:
    """Operator-vetted change control (policy-plane, ARCH §12): step-up + diff-hash-bound +
    audit-chained. NO MCP path exists to this write (structural absence)."""
    st = request.app.state
    diff_hash = body.get("diff_hash")
    confirm = body.get("confirm_diff_hash")
    if not diff_hash or confirm != diff_hash:
        raise ValidationFailed("catalog promote requires a matching diff_hash confirm (step-up).")
    if not body.get("step_up_fresh"):
        raise Forbidden("catalog promote requires a fresh step-up (re-authentication).", code="step_up_required")
    key, ver = body.get("playbook_key"), body.get("version")
    if not key or not ver:
        raise ValidationFailed("playbook_key + version required.")
    with st.db.tx() as c:
        c.execute("INSERT INTO playbook_catalog(playbook_key, version, content_sha256, action_class, "
                  "extravars_schema, est_duration_s, rollback, sandbox_profile, signed_by, status) "
                  "VALUES (?,?,?,?,?,?,?,?,?, 'active')",
                  (key, ver, body.get("content_sha256", ""), body.get("action_class", "config_change"),
                   json.dumps(body.get("extravars_schema", {}), separators=(",", ":"), sort_keys=True),
                   int(body.get("est_duration_s", 300)), body.get("rollback", "none"),
                   1 if body.get("sandbox_profile") else 0, principal.sub))
    st.chain.append(record_type="catalog_change", actor_sub=principal.sub, action="promote",
                    target=f"{key}@{ver}", outcome="active",
                    payload={"diff_hash": diff_hash, "content_sha256": body.get("content_sha256")})
    return {"ok": True, "playbook_key": key, "version": ver}


# ---- S6 sandbox evidence ---------------------------------------------------
@router.get("/sandbox")
def list_sandbox(request: Request, _: Principal = Depends(require_read)) -> dict:
    return {"runs": request.app.state.sandbox.list_evidence()}


@router.get("/sandbox/{run_id}")
def get_sandbox(run_id: str, request: Request, _: Principal = Depends(require_read)) -> JSONResponse:
    ev = request.app.state.sandbox.get_evidence(run_id)
    if ev is None:
        return JSONResponse({"error": {"code": "not_found", "message": "no such sandbox run", "status": 404}}, status_code=404)
    return JSONResponse({"evidence": ev})


# ---- S7 orphans ------------------------------------------------------------
@router.get("/orphans")
def list_orphans(request: Request, _: Principal = Depends(require_read)) -> dict:
    st = request.app.state
    c = st.db.reader()
    try:
        c.execute("SELECT * FROM runs WHERE state IN ('executing','health_check','rolling_back','reporting','orphaned') "
                  "ORDER BY updated_at DESC")
        rows = c.fetchall()
    finally:
        c.close()
    return {"orphans": rows}


@router.post("/orphans/{run_id}/reprobe")
def reprobe_orphan(run_id: str, request: Request, body: dict, principal: Principal = Depends(_require_operator)) -> dict:
    """Operator-gated fresh-release_id + read-only probe (§6.4). NEVER auto-resumes a half-run;
    reports only the truthful terminal (verifying/needs_review if healthy+complete, else
    failed(orphaned))."""
    st = request.app.state
    if not body.get("step_up_fresh"):
        raise Forbidden("orphan re-redemption requires a fresh step-up.", code="step_up_required")
    st.chain.append(record_type="orphan_reprobe", run_id=run_id, actor_sub=principal.sub,
                    action="request_fresh_credential", target=run_id, outcome="requested")
    return {"ok": True, "run_id": run_id, "note": "read-only probe requested; the Gateway never auto-resumes a half-run"}
