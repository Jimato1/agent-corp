"""library.ingest.admission — THE content-bound trusted-tier admission gate.

PLAN §2.2, encoded verbatim as the Stage-7 DoD sentence:

    admit(doc) ⇔ ∃ evidence e: e.kind = sandbox
                 ∧ e.attestation = gateway_delivered      -- agent_asserted NEVER satisfies
                 ∧ e.attested_content_sha256 = doc.content_sha256   -- content-bound
                 ∧ harness_attested(e)                     -- validates vs the Gateway record
               ∨ operator_review_approved                 -- human-only, batched UI

Constitutional invariants ENFORCED HERE (each is a test target):

  1. NO AGREEMENT COUNT satisfies the gate. `cross-referenced` distinct_origins ≥ N
     raises review PRIORITY and NEVER auto-admits (PLAN §2.1). N-agreement is
     popularity, not truth (correlated internet sources); only reality (a sandbox
     execution) or a human confirms.
  2. AGENT-ASSERTED EVIDENCE IS PERMANENTLY GATE-INELIGIBLE. Only a service-minted
     `gateway_delivered` entry — produced by validating the Gateway's own evidence
     record, never by copying an agent claim — can satisfy the sandbox lane (F2).
     The D-7 flip does NOT retroactively bless stored assertions.
  3. CONTENT-BOUND. Evidence binds to the exact body bytes it attested; admitted
     bodies are immutable, so evidence can never drift (F1).
  4. ONE run_id ⇔ ONE (doc_id, content_sha256). No run_id reuse across docs (F2).
  5. THE AUTO-ADMIT LANE IS CODE-PATH DISABLED unless explicitly enabled by operator
     config AND the sandbox gate is satisfied. Disabled ⇒ EVERY doc routes to human
     review; there is no assertion, count, or agent path to `admitted`.

This module performs NO I/O. Driving Gateway validation to MINT a gateway_delivered
entry lives in pipeline.py; this module only decides over what is already recorded.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional


class Outcome(str, Enum):
    AUTO_ADMIT = "admitted"                       # sandbox lane, ONLY if enabled + gate holds
    QUEUE_REVIEW = "queued_for_review"            # operator batched review admits
    QUARANTINE = "quarantined"                    # stays quarantined, retrievable behind flag
    REJECTED_PRECONDITION = "rejected_precondition"  # gate refused (never retryable by agent)


@dataclass
class Decision:
    outcome: Outcome
    reason: str
    gate_satisfied: bool = False   # True only when a gateway_delivered content-bound entry exists


def is_sandbox(e: dict) -> bool:
    return e.get("kind") == "sandbox"


def is_gateway_delivered(e: dict) -> bool:
    # STRICT: only this exact value; anything else (incl. agent_asserted) is ineligible.
    return e.get("attestation") == "gateway_delivered"


def is_agent_asserted(e: dict) -> bool:
    return e.get("attestation") == "agent_asserted"


def sandbox_gate_satisfied(meta: dict[str, Any]) -> tuple[bool, str]:
    """PURE predicate: does a content-bound, gateway-delivered sandbox evidence entry
    exist for the doc's CURRENT body? No I/O, no agent trust."""
    content_sha = meta.get("content_sha256")
    if not content_sha:
        return False, "no content hash"
    for e in meta.get("verification", []) or []:
        if not is_sandbox(e):
            continue
        if not is_gateway_delivered(e):
            # agent_asserted (or anything not gateway_delivered) can NEVER satisfy (rule 2)
            continue
        if e.get("attested_content_sha256") != content_sha:
            # evidence attests a different byte-state — not content-bound (rule 3)
            continue
        # harness attestation is validated when the entry is MINTED (pipeline.py drives
        # the Gateway read); a gateway_delivered entry carries a validated harness_version.
        if not e.get("harness_version"):
            continue
        return True, f"sandbox gate satisfied by run_id={e.get('run_id')}"
    return False, "no gateway-delivered content-bound sandbox evidence"


def crossref_ready(meta: dict[str, Any], min_distinct: int) -> bool:
    """True iff a crossref entry reaches N distinct origins — this only RAISES REVIEW
    PRIORITY; it NEVER admits (rule 1)."""
    for e in meta.get("verification", []) or []:
        if e.get("kind") == "crossref" and int(e.get("distinct_origins", 0)) >= min_distinct:
            return True
    return False


def has_sandbox_evidence_any(meta: dict[str, Any]) -> bool:
    return any(is_sandbox(e) for e in (meta.get("verification", []) or []))


def run_id_binding_ok(doc_id: str, content_sha: str, run_id: str,
                      seen: dict[str, tuple[str, str]]) -> bool:
    """One run_id ⇔ one (doc_id, content_sha256). `seen` maps run_id → (doc_id, sha)
    across the corpus; a reuse against a different binding is refused (rule 4)."""
    bound = seen.get(run_id)
    if bound is None:
        return True
    return bound == (doc_id, content_sha)


def evaluate(meta: dict[str, Any], *, auto_admit_enabled: bool, min_distinct: int) -> Decision:
    """Decide the admission routing for a proposal at request-admission time.

    The ONLY path to Outcome.AUTO_ADMIT is: the operator has enabled the lane AND a
    gateway-delivered, content-bound sandbox evidence entry exists. Everything else —
    crossref agreement, agent-asserted sandbox evidence, no evidence — routes to human
    review or stays quarantined. There is NO count-based or assertion-based admit.
    """
    satisfied, why = sandbox_gate_satisfied(meta)

    if satisfied:
        if auto_admit_enabled:
            return Decision(Outcome.AUTO_ADMIT, why, gate_satisfied=True)
        # lane BUILT but gated OFF (pre-D7 go-live): a satisfied gate still does NOT
        # auto-admit — it goes to the operator, who may admit via review (rule 5).
        return Decision(Outcome.QUEUE_REVIEW,
                        "sandbox gate satisfied but auto-admit lane disabled by config "
                        "(LIBRARY_AUTO_ADMIT_ENABLED=0) — routed to operator review",
                        gate_satisfied=True)

    if crossref_ready(meta, min_distinct):
        return Decision(Outcome.QUEUE_REVIEW,
                        "cross-referenced (N≥%d distinct) — priority raised, review admits; "
                        "agreement count never confers trust" % min_distinct)

    if has_sandbox_evidence_any(meta):
        # sandbox evidence present but NOT satisfying (agent_asserted, wrong hash, or
        # unvalidated harness) — route to review; never admit by assertion (rule 2).
        return Decision(Outcome.QUEUE_REVIEW,
                        "sandbox evidence present but not gateway-delivered/content-bound "
                        "(agent-asserted evidence can never satisfy the gate) — operator review")

    return Decision(Outcome.QUARANTINE,
                    "no admitting evidence — stays quarantined, retrievable only behind "
                    "include_unverified")
