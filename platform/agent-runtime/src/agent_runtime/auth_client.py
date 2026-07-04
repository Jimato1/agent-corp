"""The auth key-provisioning + token client (PRODUCES C7/C8 client half; PLAN §5).

Built against ``context/CONTRACTS/agent-runtime-auth-key-provisioning.md`` (frozen
runtime side; awaiting auth countersign). Everything here is the CLIENT half of a
guarantee whose server half is auth's — the runtime never re-implements auth's
checks; it obeys them (auth is fail-closed on high-stakes paths, and the correct
runtime behavior during an outage is to be DENIED and quiesce, not to work around).

Three responsibilities:
  * enroll (generate-in-TPM → attest → send public material) — §5.3;
  * mint short-TTL DPoP-bound tokens against the sealed key, no refresh token;
  * degraded mode on an auth outage: jittered backoff + circuit breaker + local
    quiesce (QUIESCED_BY_OUTAGE), and — M2/M3 — reconcile the kill epoch before
    the pre-claim gate reopens.

HTTP + randomness are injected so the degraded-mode + reconcile LOGIC is unit-tested
without a live IdP. A live auth round-trip is INTEGRATION.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Callable, Optional, Protocol

from .custody import KeyCustody
from .drain import DrainMachine, Level
from .errors import AuthOutage

# injected transport: (path, json_body) -> (status_code, json_response)
HttpPost = Callable[[str, dict], tuple[int, dict]]
HttpGet = Callable[[str], tuple[int, dict]]


@dataclass
class Token:
    access_token: str
    expires_in: int          # short TTL (1–5 min band; default 2 min)
    cnf_jkt: str             # DPoP thumbprint binding


class CircuitBreaker:
    """Opens after ``fail_threshold`` consecutive failures; half-open probes on ask;
    closes on success. Bounds the re-mint probe rate during an auth blackout."""

    def __init__(self, fail_threshold: int = 5):
        self._threshold = fail_threshold
        self._fails = 0
        self._open = False

    def on_success(self) -> None:
        self._fails = 0
        self._open = False

    def on_failure(self) -> None:
        self._fails += 1
        if self._fails >= self._threshold:
            self._open = True

    @property
    def is_open(self) -> bool:
        return self._open

    def allow_probe(self) -> bool:
        # half-open: always allow a single probe when asked (caller spaces via backoff)
        return True


class AuthClient:
    def __init__(
        self,
        custody: KeyCustody,
        drain: DrainMachine,
        *,
        http_post: Optional[HttpPost] = None,
        http_get: Optional[HttpGet] = None,
        backoff_base: float = 1.0,
        backoff_cap: float = 60.0,
        fail_threshold: int = 5,
        rand: Callable[[], float] = random.random,
    ):
        self._custody = custody
        self._drain = drain
        self._post = http_post
        self._get = http_get
        self._base = backoff_base
        self._cap = backoff_cap
        self._breaker = CircuitBreaker(fail_threshold)
        self._rand = rand
        self._attempt = 0

    # ---- enrollment (C7 §1) ------------------------------------------------

    def enroll(self, sub: str, *, is_executor: bool) -> dict:
        """Generate a sealed key and send public material + attestation to auth.

        The private key never leaves the TPM; only {sub, jwk, attestation, ek chain}
        crosses. Executor personas are refused on a non-attested node (custody), and
        auth independently refuses at mint (the authority)."""
        res = self._custody.enroll(sub, is_executor=is_executor)  # raises for non-attested executor
        payload = {"sub": sub, "jwk": res.jwk, "attestation": res.attestation, "ek_cert_chain": []}
        if self._post is None:
            return {"enrolled": False, "reason": "auth transport not wired (integration)", **payload}
        status, resp = self._post("/enroll", payload)
        if status >= 500:
            raise AuthOutage(f"auth enroll {status}")
        return {"enrolled": status == 200, "sub": sub, "sealed": res.sealed, "attest": res.attest_result}

    # ---- token minting (C8) ------------------------------------------------

    def mint_token(self, sub: str) -> Token:
        """Mint a short-TTL DPoP-bound token. On IdP 5xx/unreachable raises AuthOutage
        (inferred absence, NOT a kill). No refresh token — re-mint each time."""
        if self._post is None:
            raise AuthOutage("auth transport not wired (integration)")
        # DPoP proof would be signed by the sealed key (custody.sign) — integration.
        status, resp = self._post("/token", {"grant_type": "client_credentials", "sub": sub})
        if status >= 500:
            raise AuthOutage(f"auth token {status}")
        if status != 200:
            raise AuthOutage(f"auth token non-200 {status}")
        return Token(access_token=resp["access_token"], expires_in=int(resp.get("expires_in", 120)),
                     cnf_jkt=resp.get("cnf", {}).get("jkt", ""))

    # ---- degraded mode: backoff + breaker + quiesce ------------------------

    def next_backoff_sleep(self) -> float:
        """Full jitter: sleep ∈ [0, min(cap, base·2^attempt)] — no correlated re-mint
        stampede on the recovering IdP (RESEARCH §8.B)."""
        ceiling = min(self._cap, self._base * (2 ** self._attempt))
        self._attempt += 1
        return self._rand() * ceiling

    def on_mint_failure(self) -> None:
        """Record a failure; open the breaker + enter QUIESCED_BY_OUTAGE at threshold."""
        self._breaker.on_failure()
        if self._breaker.is_open:
            self._drain.enter_outage()  # forces the pre-claim gate shut + re-arms reconcile (M2)

    def on_mint_success(self) -> None:
        self._breaker.on_success()
        self._attempt = 0

    # ---- kill-epoch reconcile (M2/M3 — fail-closed) ------------------------

    def reconcile_kill_epoch(self) -> bool:
        """Poll auth's current kill epoch+level and adopt max(epoch). Opens the
        pre-claim gate ONLY after a successful reconcile. Called at boot (M3) and on
        outage-recovery BEFORE resuming/claiming (M2). Returns True on success.

        If the reconciled level is KILL, the drain machine transitions to KILL
        (abandon) and the gate stays effectively shut for claims."""
        if self._get is None:
            # No auth transport (integration). Fail-closed: do NOT open the gate.
            return False
        try:
            status, resp = self._get("/killswitch/epoch")
        except Exception:
            return False
        if status != 200:
            return False
        epoch = int(resp.get("epoch", 0))
        level_name = str(resp.get("level", "run")).lower()
        level = {"run": Level.RUN, "g0": Level.RUN, "drain": Level.DRAIN,
                 "g1": Level.DRAIN, "kill": Level.KILL, "g2": Level.KILL}.get(level_name, Level.RUN)
        self._drain.poll_level(epoch, level)
        self._drain.exit_outage()
        self._drain.mark_reconciled()  # opens the gate (subject to posture)
        return True
