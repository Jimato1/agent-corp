"""Verdict issuance — the one path that turns ``evaluate()`` into a logged (and, for the
binding caller, signed) verdict. Shared by ``POST /v1/decision``, the MCP tools, and the
operator dry-run so the answer is byte-identical (two views, one state)."""
from __future__ import annotations

import json

from ..clock import check_clock, now_dt
from ..ids import new_decision_id
from ..policy.evaluate import evaluate
from . import escalations


def issue_verdict(state, *, host_id: str, action_class: str, caller_sub: str | None,
                  binding: bool, req_nonce: str | None = None, aud: str | None = None,
                  ticket_ref: str | None = None) -> tuple[dict, str | None]:
    """Evaluate + log + (binding) sign. Returns (claims_dict, signed_jws_or_None)."""
    snapshot, integ = state.store.current()
    clock = check_clock(state.settings)
    now = now_dt()
    decision_id = new_decision_id()
    verdict = evaluate(
        snapshot, integ.ok, host_id=host_id, action_class=action_class, now=now,
        decision_id=decision_id, clock=clock, ttl_s=state.settings.verdict_ttl_seconds,
    )
    claims = verdict.to_claims()

    # Sign ONLY for a caller mapped to a concrete audience (verdict-token §3 anti-relay).
    signed: str | None = None
    if binding and aud:
        signed = state.signer.sign_verdict(claims, aud=aud, req_nonce=req_nonce)

    # Append EVERY issued verdict (binding + advisory) to the canonical decision_log.
    with state.db.write_lock:
        conn = state.db.writer
        with conn:
            conn.execute(
                "INSERT INTO decision_log(decision_id, evaluated_at, host_id, action_class, verdict, "
                "approval_mode, aud, binding, host_class, verdict_basis, policy_version, caller_sub, "
                "ticket_ref, reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (decision_id, claims["evaluated_at"], host_id, action_class, claims["verdict"],
                 claims["approval_mode"], aud, int(binding), claims["host_class"],
                 claims["verdict_basis"], claims["policy_version"], caller_sub, ticket_ref,
                 json.dumps(claims["reason"])),
            )

    if verdict.escalations:
        escalations.enqueue_many(state.db, verdict.escalations)

    return claims, signed


def decision_log(db, *, host_id: str | None = None, action_class: str | None = None,
                 verdict: str | None = None, limit: int = 200) -> list[dict]:
    q = "SELECT * FROM decision_log WHERE 1=1"
    args: list = []
    if host_id:
        q += " AND host_id=?"; args.append(host_id)
    if action_class:
        q += " AND action_class=?"; args.append(action_class)
    if verdict:
        q += " AND verdict=?"; args.append(verdict)
    q += " ORDER BY seq DESC LIMIT ?"; args.append(limit)
    conn = db.reader()
    try:
        rows = conn.execute(q, args).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["reason"] = json.loads(d.get("reason") or "[]")
            out.append(d)
        return out
    finally:
        conn.close()
