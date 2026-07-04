"""The inference facade — the suite's `generate()` + `embed()` hub (C9; PLAN §6.4).

FROZEN in shape by ``context/CONTRACTS/agent-runtime-library-inference.md``. One
facade, two operations, over any OpenAI-compatible `/v1` backend (vLLM primary /
SGLang / llama.cpp / TEI), so the backend is swappable — the FACADE is the seam,
never a hardcoded model.

Two load-bearing properties enforced here IN CODE:

  * **Model selection by LOGICAL ROLE, never raw model name.** A caller asks for a
    role (`adversarial-reviewer`, `library-embedder`); the runtime resolves
    role → pinned digest from versioned config. A caller can never request an
    unvetted model.

  * **The `provenance_verified` flag is a RUNTIME-COMPUTED fact (M1).** It comes
    from the runtime's own admission record (the provenance gate ran at load over
    the local artifact), NEVER from the serving backend's self-report. The facade
    also pins the backend to the admitted `model_id`/digest and rejects any
    response whose served model differs — a compromised/misconfigured backend
    serving an unsigned or other model cannot pass provenance silently.

The HTTP call is injected (``http_post``) so the facade LOGIC — role resolution,
provenance stamping, typed errors, the quiesce signal, embed shape/normalization —
is fully unit-tested without a live model. A real backend call is INTEGRATION.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Callable, Optional

from .config import Config
from .drain import DrainMachine, Level
from .errors import FacadeError, FacadeErrorCode, ProvenanceFailure, QuiesceSignal
from .provenance import ProvenanceGate, ProvenanceRecord

# injected transport: (path, json_body) -> (status_code, json_response)
HttpPost = Callable[[str, dict], tuple[int, dict]]


@dataclass
class AdmittedModel:
    """A role the runtime has admitted through the provenance gate at load."""
    role: str
    model_id: str
    digest: str
    record: ProvenanceRecord  # the runtime-computed provenance fact
    dim: int = 1024           # embedding dim (PENDING-SIZING per model)


class InferenceFacade:
    def __init__(
        self,
        config: Config,
        gate: ProvenanceGate,
        drain: DrainMachine,
        http_post: Optional[HttpPost] = None,
        *,
        embed_max_input_tokens: int = 512,  # m9 (PENDING-SIZING per final model)
    ):
        self._cfg = config
        self._gate = gate
        self._drain = drain
        self._http = http_post
        self._admitted: dict[str, AdmittedModel] = {}
        self._embed_max_tokens = embed_max_input_tokens

    # ---- admission (runs the fail-closed gate at load) ---------------------

    def admit(self, role: str) -> AdmittedModel:
        """Verify a role's pinned artifact and admit it. FAIL-CLOSED: a gate
        failure raises ProvenanceFailure and the role is NOT admitted (no serve)."""
        pin = self._cfg.model_pins.get(role)
        if pin is None:
            raise ProvenanceFailure(f"no pinned model for role '{role}'")
        rec = self._gate.verify(pin)  # raises on any mismatch/unsigned/pickle
        admitted = AdmittedModel(role=role, model_id=pin.model_id, digest=pin.commit_digest, record=rec)
        self._admitted[role] = admitted
        return admitted

    def admit_all(self) -> list[tuple[str, Optional[Exception]]]:
        """Admit every configured role; return per-role outcome (fail-closed each)."""
        out: list[tuple[str, Optional[Exception]]] = []
        for role in self._cfg.model_pins:
            try:
                self.admit(role)
                out.append((role, None))
            except ProvenanceFailure as exc:
                out.append((role, exc))
        return out

    def is_provenance_verified(self, role: str) -> bool:
        m = self._admitted.get(role)
        return bool(m and m.record.outcome == "verified")

    # ---- the quiesce guard (never hang during kill/drain/outage) -----------

    def _quiesce_guard(self) -> None:
        if not self._drain.reconciled or self._drain.in_outage or self._drain.level is not Level.RUN:
            raise QuiesceSignal()

    def _require_admitted(self, role: str) -> AdmittedModel:
        m = self._admitted.get(role)
        if m is None:
            # never serve a role the runtime has not admitted through the gate.
            raise ProvenanceFailure(f"role '{role}' not admitted (provenance gate has not passed)")
        return m

    # ---- generate() --------------------------------------------------------

    def generate(self, role: str, messages: list[dict], schema: Optional[dict] = None) -> dict:
        """Structured-output-capable generation for a hosted role.

        Returns {text|tool_call, model_id, digest, provenance_verified, role}.
        `provenance_verified` is the runtime-computed fact (M1)."""
        self._quiesce_guard()
        m = self._require_admitted(role)
        if self._http is None:
            raise FacadeError(FacadeErrorCode.BACKEND_UNAVAILABLE, "no inference backend wired", retryable=True)

        body: dict[str, Any] = {"model": m.model_id, "messages": messages}
        if schema is not None:
            # structured-output mode: XGrammar default / Outlines fallback / GBNF on
            # the llama.cpp lane — role schemas validated at config-load (§6.3). The
            # wire hint is OpenAI-compatible response_format; the constraint backend
            # is the server's, behind the facade.
            body["response_format"] = {"type": "json_schema", "json_schema": {"schema": schema, "strict": True}}

        status, resp = self._http("/chat/completions", body)
        self._raise_for_status(status, resp)

        served = resp.get("model")
        # M1: the backend is pinned to the admitted model; a mismatch fails closed.
        if served is not None and served != m.model_id:
            raise ProvenanceFailure(
                f"backend served '{served}' but role '{role}' is admitted for '{m.model_id}' — "
                "provenance is runtime-computed, not backend-reported; refusing"
            )
        choice = (resp.get("choices") or [{}])[0]
        msg = choice.get("message", {})
        out = {
            "role": role,
            "model_id": m.model_id,
            "digest": m.digest,
            # runtime-computed at admission (M1); True ONLY when the gate fully
            # verified (hash + signature) — a soft-posture skip stamps False, never
            # a fabricated green.
            "provenance_verified": self.is_provenance_verified(role),
        }
        if msg.get("tool_calls"):
            out["tool_call"] = msg["tool_calls"][0]
        else:
            out["text"] = msg.get("content", "")
        return out

    # ---- embed() (the Library-binding slice; frozen shape) -----------------

    def embed(self, texts: list[str], input_type: str = "document") -> dict:
        """embed(texts[], input_type: query|document) -> {vectors, model_id, dim}.

        L2-normalized, cosine; dimension fixed per model; ≤256 texts/call; a per-text
        max-input-token ceiling is stated (m9). `model_id` on every call so Library
        detects a swap and re-embeds. Cross-app over `edge`; Library is a hard dep."""
        self._quiesce_guard()
        if input_type not in ("query", "document"):
            raise FacadeError(FacadeErrorCode.SCHEMA_UNSATISFIABLE, f"input_type must be query|document, got '{input_type}'")
        if len(texts) > 256:
            raise FacadeError(FacadeErrorCode.SCHEMA_UNSATISFIABLE, "batch exceeds 256 texts/call")

        m = self._admitted.get("library-embedder") or self._admitted.get("embed")
        if m is None:
            raise ProvenanceFailure("embedding model not admitted (provenance gate has not passed)")
        if self._http is None:
            raise FacadeError(FacadeErrorCode.BACKEND_UNAVAILABLE, "no inference backend wired", retryable=True)

        status, resp = self._http("/embeddings", {"model": m.model_id, "input": texts})
        self._raise_for_status(status, resp)
        served = resp.get("model")
        if served is not None and served != m.model_id:
            raise ProvenanceFailure(f"embed backend served '{served}', admitted '{m.model_id}' — refusing")

        vectors = [self._l2_normalize(item["embedding"]) for item in resp.get("data", [])]
        dim = len(vectors[0]) if vectors else m.dim
        return {"vectors": vectors, "model_id": m.model_id, "dim": dim, "max_input_tokens": self._embed_max_tokens}

    # ---- helpers -----------------------------------------------------------

    @staticmethod
    def _l2_normalize(vec: list[float]) -> list[float]:
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    @staticmethod
    def _raise_for_status(status: int, resp: dict) -> None:
        if status == 200:
            return
        if status == 429:
            raise FacadeError(FacadeErrorCode.QUOTA_EXHAUSTED, "backend busy; retry-after", retryable=True)
        if status in (503, 502, 500):
            raise FacadeError(FacadeErrorCode.BACKEND_UNAVAILABLE, f"backend {status}", retryable=True)
        if status == 422:
            raise FacadeError(FacadeErrorCode.SCHEMA_UNSATISFIABLE, "schema not satisfiable by backend")
        raise FacadeError(FacadeErrorCode.BACKEND_UNAVAILABLE, f"unexpected backend status {status}", retryable=True)
