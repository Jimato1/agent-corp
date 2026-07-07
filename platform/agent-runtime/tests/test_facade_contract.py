"""Contract conformance for the inference facade (agent-runtime-library-inference.md)
+ the M1 runtime-computed-provenance fix."""

import math

import pytest

from agent_runtime.config import load_config
from agent_runtime.drain import DrainMachine
from agent_runtime.errors import (
    FROZEN_FACADE_ERROR_CODES, FacadeError, ProvenanceFailure, QuiesceSignal,
)
from agent_runtime.facade import AdmittedModel, InferenceFacade
from agent_runtime.provenance import ModelPin, ProvenanceGate, ProvenanceRecord
from tests.conftest import ROOT


EXPECTED_ERROR_CODES = {
    "schema-unsatisfiable", "backend-unavailable", "model-provenance-failure",
    "quota-concurrency-exhausted", "quiesce-drain",
}


def test_frozen_facade_error_codes():
    assert FROZEN_FACADE_ERROR_CODES == EXPECTED_ERROR_CODES


def test_error_codes_map_to_contract_typed_errors(contract_text):
    doc = contract_text("agent-runtime-library-inference.md")
    for token in ("schema-unsatisfiable", "backend-unavailable", "model-provenance-failure", "quiesce"):
        assert token in doc


def _armed_facade(monkeypatch=None):
    cfg = load_config(ROOT / "config")
    drain = DrainMachine()
    drain.mark_reconciled()  # normal booted posture for facade tests
    # inject passing verifiers so admission succeeds (simulates a real, signed model).
    gate = ProvenanceGate(hash_fn=lambda pin: pin.sha256, sig_verify_fn=lambda pin: True)
    return cfg, drain, gate


def _fake_http_ok(model_id, embedding=None):
    def _post(path, body):
        if path == "/embeddings":
            return 200, {"model": model_id, "data": [{"embedding": embedding or [3.0, 4.0]}]}
        return 200, {"model": model_id, "choices": [{"message": {"content": "ok"}}]}
    return _post


def test_embed_shape_and_l2_normalization():
    cfg, drain, gate = _armed_facade()
    model_id = cfg.model_pins["library-embedder"].model_id
    fac = InferenceFacade(cfg, gate, drain, http_post=_fake_http_ok(model_id, embedding=[3.0, 4.0]))
    fac.admit("library-embedder")
    out = fac.embed(["hello"], input_type="document")
    assert set(out) >= {"vectors", "model_id", "dim"}
    assert out["model_id"] == model_id
    v = out["vectors"][0]
    assert math.isclose(math.sqrt(sum(x * x for x in v)), 1.0, rel_tol=1e-9)  # L2-normalized
    assert out["max_input_tokens"] == 512  # m9 — stated per contract §2.4


def test_embed_rejects_bad_input_type_and_oversize_batch():
    cfg, drain, gate = _armed_facade()
    model_id = cfg.model_pins["library-embedder"].model_id
    fac = InferenceFacade(cfg, gate, drain, http_post=_fake_http_ok(model_id))
    fac.admit("library-embedder")
    with pytest.raises(FacadeError):
        fac.embed(["x"], input_type="bogus")
    with pytest.raises(FacadeError):
        fac.embed(["x"] * 257)


def test_generate_provenance_is_runtime_computed_not_backend_reported():
    """M1: provenance_verified comes from the runtime admission record, and a backend
    serving a DIFFERENT model than admitted FAILS CLOSED — never a silent pass."""
    cfg, drain, gate = _armed_facade()
    role = "hands-pool"
    admitted_id = cfg.model_pins[role].model_id
    fac = InferenceFacade(cfg, gate, drain, http_post=_fake_http_ok(admitted_id))
    fac.admit(role)
    out = fac.generate(role, [{"role": "user", "content": "hi"}])
    assert out["provenance_verified"] is True
    assert out["model_id"] == admitted_id

    # now the backend serves a DIFFERENT model id — must be refused (M1).
    fac2 = InferenceFacade(cfg, gate, drain, http_post=_fake_http_ok("evil/other-model"))
    fac2.admit(role)
    with pytest.raises(ProvenanceFailure):
        fac2.generate(role, [{"role": "user", "content": "hi"}])


def test_generate_and_embed_quiesce_instead_of_hanging():
    """During drain/kill/outage the facade returns a QUIESCE signal, never hangs."""
    cfg, drain, gate = _armed_facade()
    fac = InferenceFacade(cfg, gate, drain, http_post=_fake_http_ok(cfg.model_pins["hands-pool"].model_id))
    fac.admit("hands-pool")
    fac.admit("library-embedder")
    # enter an outage → the guard trips.
    drain.enter_outage()
    with pytest.raises(QuiesceSignal):
        fac.generate("hands-pool", [{"role": "user", "content": "hi"}])
    with pytest.raises(QuiesceSignal):
        fac.embed(["x"])


def test_unadmitted_role_never_served():
    cfg, drain, gate = _armed_facade()
    fac = InferenceFacade(cfg, gate, drain, http_post=_fake_http_ok("x"))
    # never admitted → provenance failure, never a serve.
    with pytest.raises(ProvenanceFailure):
        fac.generate("hands-pool", [{"role": "user", "content": "hi"}])
