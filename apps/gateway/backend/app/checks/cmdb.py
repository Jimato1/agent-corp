"""Check 2 — CMDB signed policy verdict validation (cmdb-gateway-verdict-token.md §4, verbatim).

At the instant of execution/redemption (TOCTOU — never cached, never agent-relayed), the
Gateway validates the CMDB-signed JWS verdict. The signing key is CMDB-LOCAL (served at
``GET /v1/verdict-jwks``) and **deliberately NOT auth's key** — the policy veto must not share
a trust root with the identity plane; a verdict signed by auth's identity key is rejected.

This is COUNTERSIGN-1 (Gateway confirms §4 steps 2-3 and 8 are coded): the ``aud == "gateway"``
reject (anti-relay) and the ``host_class``/``verdict_basis`` surface cross-check.
"""
from __future__ import annotations

import json

from ..authn.jwks import KeyRing, b64u_decode
from ..clock import epoch_of, now_epoch
from . import (
    CMDB_DENY,
    VERDICT_EXPIRED,
    VERDICT_INVALID,
    VERDICT_REPLAY,
    WINDOW_MUST_FIT,
    WRONG_TARGET_CLASS,
    HardReject,
)

VERDICT_TYP = "cmdb-verdict+jws"


def validate_verdict(
    jws: str,
    verdict_keyring: KeyRing,
    *,
    now: int | None = None,
    expected_aud: str = "gateway",
    require_host_class: str,          # 'managed' for execute, 'disposable' for sandbox
    require_verdict_basis: str | None,  # 'sandbox_carve_out' for sandbox, None for execute
    seen_decision_id,                  # callable(decision_id) -> bool  (True => already seen == replay)
    est_duration_s: int,
    req_nonce: str | None = None,
    has_consumed_approval: bool = True,
) -> dict:
    """Run the §4 validation steps 1-9. Return the verdict claims, or raise HardReject.

    Zero clock-skew leeway on ``exp`` (step 4): ``valid_until + ε`` must never act.
    """
    now = now_epoch() if now is None else now
    parts = jws.split(".")
    if len(parts) != 3 or not all(parts):
        raise HardReject(VERDICT_INVALID, "verdict is not a compact JWS")
    try:
        header = json.loads(b64u_decode(parts[0]).decode("utf-8"))
        claims = json.loads(b64u_decode(parts[1]).decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise HardReject(VERDICT_INVALID, f"undecodable verdict: {exc}") from exc

    # Step 1: kid in currently-served verdict-jwks; typ; Ed25519 signature.
    if header.get("typ") != VERDICT_TYP:
        raise HardReject(VERDICT_INVALID, f"typ {header.get('typ')!r} != {VERDICT_TYP}")
    kid = header.get("kid")
    verifier = verdict_keyring.verifier_for(kid) if kid else None
    if verifier is None or verifier.alg != "EdDSA":
        raise HardReject(VERDICT_INVALID, "verdict kid not in the served verdict-jwks (or not EdDSA)")
    signing_input = f"{parts[0]}.{parts[1]}".encode("ascii")
    if not verifier.verify(signing_input, b64u_decode(parts[2])):
        raise HardReject(VERDICT_INVALID, "verdict signature does not verify")

    # Step 2: iss == cmdb.
    if claims.get("iss") != "cmdb":
        raise HardReject(VERDICT_INVALID, f"iss {claims.get('iss')!r} != cmdb")

    # Step 3: aud == 'gateway', single-valued (the anti-relay check — a board-audience or
    # multi-valued verdict is refused; a tier-approver read can never be Gateway-redeemed).
    aud = claims.get("aud")
    if isinstance(aud, (list, tuple, set)) or aud != expected_aud:
        raise HardReject(VERDICT_INVALID, f"verdict aud {aud!r} != {expected_aud!r} single-valued (anti-relay)")

    # Step 4: exp (= valid_until) not passed, ZERO skew leeway.
    exp = claims.get("exp")
    if exp is None:
        exp = epoch_of(claims["valid_until"]) if claims.get("valid_until") else None
    if exp is None or now > int(exp):
        raise HardReject(VERDICT_EXPIRED, "verdict expired (valid_until passed) — TOCTOU re-query required")

    # Step 5: jti (= decision_id) replay within validity.
    decision_id = claims.get("jti") or claims.get("decision_id")
    if not decision_id:
        raise HardReject(VERDICT_INVALID, "verdict carries no decision_id/jti")
    if seen_decision_id(decision_id):
        raise HardReject(VERDICT_REPLAY, f"decision_id {decision_id} already seen within validity")

    # Step 6: nonce echo, when we supplied one.
    if req_nonce is not None and claims.get("nonce") != req_nonce:
        raise HardReject(VERDICT_INVALID, "verdict nonce != req_nonce")

    # Step 7: map verdict. permit → proceed; ask → only with the already-consumed approval; deny → reject.
    verdict = claims.get("verdict")
    if verdict == "deny":
        raise HardReject(CMDB_DENY, "CMDB verdict is deny")
    if verdict == "ask" and not has_consumed_approval:
        raise HardReject(CMDB_DENY, "CMDB 'ask' requires the consumed Board approval")
    if verdict not in ("permit", "ask"):
        raise HardReject(CMDB_DENY, f"unusable verdict {verdict!r}")

    # Step 8: surface segregation cross-check (host_class / verdict_basis).
    if claims.get("host_class") != require_host_class:
        raise HardReject(WRONG_TARGET_CLASS,
                         f"host_class {claims.get('host_class')!r} != required {require_host_class!r}")
    if require_verdict_basis is not None and claims.get("verdict_basis") != require_verdict_basis:
        raise HardReject(WRONG_TARGET_CLASS,
                         f"verdict_basis {claims.get('verdict_basis')!r} != {require_verdict_basis!r}")

    # Step 9: must-fit — summed est_duration_s + grace fits before window_closes_at.
    grace = int(claims.get("grace") or 0)
    closes = claims.get("window_closes_at")
    if closes:
        close_epoch = epoch_of(closes)
        if now + est_duration_s + grace > close_epoch:
            raise HardReject(WINDOW_MUST_FIT,
                             "est_duration + grace does not fit before window_closes_at")

    return claims
