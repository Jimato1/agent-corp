"""The fail-closed model-provenance gate (D-14; RESEARCH §5.3; PLAN §6.2).

One poisoned/swapped model compromises EVERY role at once — including the
Adversarial Reviewer, whose forced dissent is the deliberation layer's structural
quality defense. Provenance is therefore a Critical-infra SECURITY control, not an
ops concern, and it FAILS CLOSED: on any mismatch the model is NOT admitted, no
unsigned model ever runs, and the failure surfaces as Pattern-R
``✕ PROVENANCE FAILED`` (UI §8).

The gate runs, in order (all must pass):
  1. safetensors-only, pickle DENIED (pickle deserializes arbitrary code on load);
  2. pin by immutable COMMIT DIGEST, not tag;
  3. recompute SHA-256 over the weight files and match the pinned value;
  4. verify the Sigstore ``model-signing`` signature (DSSE/in-toto manifest);
  5. record a Model-BOM entry in the append-only provenance ledger (C11).

Steps 3 and 4 need the real artifact + a trust root — INTEGRATION / CANNOT-VERIFY
in a sandbox. They are injected (``hash_fn``, ``sig_verify_fn``) so the fail-closed
LOGIC is fully unit-tested here (a mismatch/unsigned/pickle input raises), while
the real hashing + Sigstore verification are wired at deploy against the Hub.
The gate NEVER fabricates a pass: with no verifier configured it fails closed.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Optional

from .errors import ProvenanceFailure


@dataclass(frozen=True)
class ModelPin:
    """A versioned, git-tracked pin (config/models.yaml). role -> exact signed model."""
    role: str
    model_id: str          # served id, e.g. "Qwen/Qwen3-Embedding-0.6B"
    repo: str              # source repo/path
    commit_digest: str     # immutable commit digest, NOT a tag
    quant: str             # Q4_K_M / Q6_K / FP16 / ...
    sha256: str            # expected SHA-256 over the weight files
    sig_ref: str           # Sigstore model-signing manifest reference
    fmt: str = "safetensors"  # format; anything but safetensors is denied


@dataclass(frozen=True)
class ProvenanceRecord:
    """One append-only ledger row (C11) — also what MC's Stage-7 display mirrors."""
    role: str
    model_id: str
    commit_digest: str
    sha256: str
    sig_ref: str
    model_bom: str
    outcome: str           # "verified" | "refused"
    quant: str
    ts: float

    def as_dict(self) -> dict:
        return {
            "role": self.role, "model_id": self.model_id, "commit_digest": self.commit_digest,
            "sha256": self.sha256, "sig_ref": self.sig_ref, "model_bom": self.model_bom,
            "outcome": self.outcome, "quant": self.quant, "ts": self.ts,
        }


# Injected verifier signatures.
HashFn = Callable[[ModelPin], str]              # recompute SHA-256 over the artifact
SigVerifyFn = Callable[[ModelPin], bool]        # verify the Sigstore signature


class ProvenanceGate:
    def __init__(
        self,
        *,
        hash_fn: Optional[HashFn] = None,
        sig_verify_fn: Optional[SigVerifyFn] = None,
        on_ledger: Optional[Callable[[ProvenanceRecord], None]] = None,
        now: Callable[[], float] = time.time,
        allow_unverified_in_sandbox: bool = False,
    ):
        # If verifiers are missing we FAIL CLOSED (unless the operator has
        # explicitly opted a NON-executor sandbox into a soft posture — which the
        # status UI then renders as an honest unknown, never a green "verified").
        self._hash_fn = hash_fn
        self._sig_verify_fn = sig_verify_fn
        self._on_ledger = on_ledger
        self._now = now
        self._allow_unverified = allow_unverified_in_sandbox

    def verify(self, pin: ModelPin) -> ProvenanceRecord:
        """Run the gate. Returns a record and raises ProvenanceFailure on any HARD
        failure (bad format/tag/hash/signature). If verification was only skipped by
        the explicit sandbox soft-posture, the record outcome is 'unverified'
        (NOT 'verified') — the hatch can NEVER fabricate a green (fix: align code with
        docstring). Every refusal is also recorded so the ledger is a complete audit."""
        try:
            fully_verified = self._check(pin)
        except ProvenanceFailure as exc:
            self._record(pin, outcome="refused", model_bom=f"REFUSED: {exc}")
            raise

        outcome = "verified" if fully_verified else "unverified"
        bom = self._model_bom(pin) if fully_verified else f"UNVERIFIED (sandbox soft-posture): {self._model_bom(pin)}"
        return self._record(pin, outcome=outcome, model_bom=bom)

    # ---- the checks (all fail-closed) --------------------------------------

    def _check(self, pin: ModelPin) -> bool:
        """Returns True iff the artifact was FULLY verified (hash + signature both
        checked). Returns False only when the explicit sandbox soft-posture skipped a
        verifier that was absent — never a hard pass. Raises on any real mismatch."""
        fully_verified = True
        # 1. safetensors-only, pickle denied.
        if pin.fmt.lower() != "safetensors":
            raise ProvenanceFailure(
                f"format '{pin.fmt}' denied for role '{pin.role}': safetensors-only "
                "(pickle deserializes arbitrary code on load)"
            )

        # 2. an immutable commit digest must be pinned (never a mutable tag).
        if not pin.commit_digest or _looks_like_tag(pin.commit_digest):
            raise ProvenanceFailure(
                f"role '{pin.role}' must pin an immutable commit digest, got "
                f"'{pin.commit_digest or '<empty>'}'"
            )

        # 3. recompute SHA-256 and match. No hasher configured => fail closed
        #    (unless an explicit sandbox soft-posture is set for a non-executor, in
        #    which case this is a SKIP that downgrades the outcome to 'unverified' —
        #    never a fabricated 'verified').
        if self._hash_fn is None:
            if not self._allow_unverified:
                raise ProvenanceFailure(
                    f"no hash verifier configured for role '{pin.role}' — fail-closed "
                    "(cannot confirm SHA-256; a real model load requires the Hub)"
                )
            fully_verified = False  # soft-posture skip — honest unknown, not a green
        else:
            computed = self._hash_fn(pin)
            if computed != pin.sha256:
                raise ProvenanceFailure(
                    f"SHA-256 mismatch for role '{pin.role}': pinned {pin.sha256[:16]}… "
                    f"!= computed {computed[:16]}… — model NOT admitted"
                )

        # 4. verify the Sigstore signature. No verifier => fail closed (or soft-skip).
        if self._sig_verify_fn is None:
            if not self._allow_unverified:
                raise ProvenanceFailure(
                    f"no Sigstore verifier configured for role '{pin.role}' — fail-closed"
                )
            fully_verified = False
        else:
            if not self._sig_verify_fn(pin):
                raise ProvenanceFailure(
                    f"Sigstore signature verification FAILED for role '{pin.role}' "
                    f"(sig_ref={pin.sig_ref}) — model NOT admitted"
                )

        return fully_verified

    def _model_bom(self, pin: ModelPin) -> str:
        return (
            f"model-bom:{pin.model_id}@{pin.commit_digest};sha256={pin.sha256};"
            f"sig={pin.sig_ref};quant={pin.quant}"
        )

    def _record(self, pin: ModelPin, *, outcome: str, model_bom: str) -> ProvenanceRecord:
        rec = ProvenanceRecord(
            role=pin.role, model_id=pin.model_id, commit_digest=pin.commit_digest,
            sha256=pin.sha256, sig_ref=pin.sig_ref, model_bom=model_bom,
            outcome=outcome, quant=pin.quant, ts=self._now(),
        )
        if self._on_ledger is not None:
            self._on_ledger(rec)
        return rec

    @property
    def fully_armed(self) -> bool:
        """True only when BOTH real verifiers are wired — drives the UI's Sigstore
        load-gate 'ARMED' vs an honest 'CANNOT CONFIRM' rendering."""
        return self._hash_fn is not None and self._sig_verify_fn is not None


def _looks_like_tag(ref: str) -> bool:
    """A crude 'this is a mutable tag, not a digest' heuristic. A commit digest is
    a long hex string; 'main'/'latest'/'v1.2' are tags and are refused."""
    r = ref.strip().lower()
    if r in {"main", "master", "latest", "head"}:
        return True
    if r.startswith("v") and any(ch.isdigit() for ch in r):
        return True
    # a real digest is long hex (>=32 hex chars, optionally 'sha256:'-prefixed)
    hexpart = r.split(":", 1)[-1]
    return not (len(hexpart) >= 32 and all(c in "0123456789abcdef" for c in hexpart))
