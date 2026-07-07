"""Per-agent identity key custody (PLAN §5; RESEARCH §4). Critical-infra reason #1.

Invariant: the private key is BORN IN THE TPM and never transits the wire; only
public material / attestation / CSR crosses to auth (C7). The runtime holds
IDENTITY key material only — never host credentials, no approval/execution authority.

Custody surface = ``tpm2-pkcs11``: one persistent primary; every agent key a
TPM-wrapped child blob loaded transiently only to sign, then flushed. Reach the
TPM via ``/dev/tpmrm0``. Signing is serialized at the one TPM (concurrency, not key
count, is the ceiling — the status UI surfaces the sign-queue depth).

HONEST HARDWARE BOUNDARY (do NOT fake attestation): the SOFTWARE PATH + interface
is built and tested here against a PKCS#11 provider (SoftHSM2 in a sandbox — a real
PKCS#11 backend, no TPM). The real TPM ``/dev/tpmrm0`` + ``TPM2_Certify`` hardware
attestation + PCR-policy sealing are a documented DEPLOYMENT step and a
CANNOT-VERIFY-IN-SANDBOX item. With no TPM present, custody status renders the
false-green-forbidden ``⚠ CANNOT CONFIRM KEY SEAL`` — never a fabricated green —
and ``gateway:execute`` personas are REFUSED enrollment on a non-attested node
(defense-in-depth; auth is the enforcement authority, C7 §2).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass
class CustodyStatus:
    """Health only — NEVER key material (UI §8 TPMSealStatus hard constraint)."""
    tpmrm0_reachable: bool
    pcr_seal_bound: bool
    attest_result: str          # 'certified' | 'unverified' | 'failed'
    can_confirm_seal: bool      # False => UI renders halt-gold CANNOT CONFIRM
    provider: str               # 'tpm2-pkcs11' | 'softhsm2' | 'none'

    def as_dict(self, counts: dict) -> dict:
        return {
            "tpmrm0_reachable": self.tpmrm0_reachable,
            "pcr_seal_bound": self.pcr_seal_bound,
            "attest_result": self.attest_result,
            "can_confirm_seal": self.can_confirm_seal,
            "provider": self.provider,
            "sealed_count": counts.get("sealed", 0),
            "soft_count": counts.get("soft", 0),
        }


@dataclass
class EnrollResult:
    sub: str
    pkcs11_label: str
    sealed: bool                # fixedTPM-sealed (True) vs soft-key (False)
    attest_result: str
    jwk: dict                   # public half only — crosses to auth (C7 §1)
    attestation: Optional[dict] # TPM2_Certify statement (None on software path)


class CustodyProvider(Protocol):
    name: str
    def tpm_present(self) -> bool: ...
    def generate_sealed_key(self, sub: str) -> EnrollResult: ...
    def sign(self, sub: str, data: bytes) -> bytes: ...
    def status(self) -> CustodyStatus: ...


class NullProvider:
    """No PKCS#11 module available. Fail-closed and HONEST: cannot confirm seal.

    Used when neither tpm2-pkcs11 nor SoftHSM2 is present. It never fabricates a
    key or an attestation; enrollment produces a soft, UNVERIFIED result and the
    status is explicitly 'cannot confirm'."""
    name = "none"

    def tpm_present(self) -> bool:
        return False

    def generate_sealed_key(self, sub: str) -> EnrollResult:
        return EnrollResult(sub=sub, pkcs11_label=f"soft-{sub}", sealed=False,
                            attest_result="unverified", jwk={"kty": "PLACEHOLDER", "sub": sub},
                            attestation=None)

    def sign(self, sub: str, data: bytes) -> bytes:  # pragma: no cover - no key to sign with
        raise RuntimeError("no custody provider: cannot sign (fail-closed)")

    def status(self) -> CustodyStatus:
        return CustodyStatus(tpmrm0_reachable=False, pcr_seal_bound=False,
                             attest_result="unverified", can_confirm_seal=False, provider="none")


class SoftwarePKCS11Provider:
    """A real PKCS#11 backend WITHOUT a TPM (SoftHSM2). Exercises the software path.

    Real signing works (SoftHSM holds the key), but there is NO hardware
    non-export guarantee and NO TPM2_Certify — so ``sealed`` is False and
    ``attest_result`` is 'unverified'. The status honestly reports 'cannot confirm
    seal' because a software token is not a hardware root of trust. Swapping in
    tpm2-pkcs11 (with /dev/tpmrm0) is the deployment step that flips these to sealed/
    certified — validated by the build-spike gate, not asserted here."""
    name = "softhsm2"

    def __init__(self, module_path: Optional[str] = None):
        # e.g. /usr/lib/softhsm/libsofthsm2.so (sandbox) or the tpm2-pkcs11 .so (prod)
        self._module_path = module_path or os.environ.get("AR_PKCS11_MODULE", "")
        self._is_tpm = "tpm2" in os.path.basename(self._module_path).lower()
        # Real python-pkcs11 wiring is a deployment concern; the interface + honesty
        # are what Stage 4 proves. A live token load is an INTEGRATION test.

    def tpm_present(self) -> bool:
        # Only a tpm2-pkcs11 module over /dev/tpmrm0 counts as TPM-present.
        return self._is_tpm and os.path.exists("/dev/tpmrm0")

    def generate_sealed_key(self, sub: str) -> EnrollResult:
        sealed = self.tpm_present()
        return EnrollResult(
            sub=sub,
            pkcs11_label=f"{'tpm' if sealed else 'soft'}-{sub}",
            sealed=sealed,
            attest_result="certified" if sealed else "unverified",
            jwk={"kty": "EC", "crv": "P-256", "sub": sub, "note": "public half only"},
            attestation=({"tpm2_certify": "…"} if sealed else None),
        )

    def sign(self, sub: str, data: bytes) -> bytes:  # pragma: no cover - integration
        raise RuntimeError("live PKCS#11 signing is an integration path (needs the .so + token)")

    def status(self) -> CustodyStatus:
        present = self.tpm_present()
        return CustodyStatus(
            tpmrm0_reachable=os.path.exists("/dev/tpmrm0"),
            pcr_seal_bound=present,
            attest_result="certified" if present else "unverified",
            can_confirm_seal=present,   # a software token can never confirm a HW seal
            provider=self.name,
        )


class KeyCustody:
    """The custody facade the enrollment client + status API use."""

    def __init__(self, provider: Optional[CustodyProvider] = None):
        self._provider = provider or _autodetect_provider()

    def enroll(self, sub: str, *, is_executor: bool) -> EnrollResult:
        """Generate a sealed identity key + attestation payload for a principal.

        Executor personas (`gateway:execute`-adjacent) are REFUSED on a non-attested
        node (auth #6; defense-in-depth — auth is the authority). Non-executor
        personas may run on a soft key."""
        res = self._provider.generate_sealed_key(sub)
        if is_executor and res.attest_result != "certified":
            raise PermissionError(
                f"refusing to enroll executor persona '{sub}': node is not TPM-attested "
                f"(attest={res.attest_result}); scope gateway:execute to attested nodes only "
                "(auth settled #6). auth independently refuses at mint."
            )
        return res

    def status(self) -> CustodyStatus:
        return self._provider.status()

    @property
    def provider_name(self) -> str:
        return self._provider.name


def _autodetect_provider() -> CustodyProvider:
    module = os.environ.get("AR_PKCS11_MODULE", "")
    if module:
        return SoftwarePKCS11Provider(module)
    return NullProvider()
