"""library.config — the LIBRARY_* env surface (DEPLOYMENT.md §2/§4).

Every knob is read once at construction and threaded through explicitly (no ambient
globals) so the whole app is unit-testable with an in-memory temp corpus.

DEPLOYMENT authorities encoded here (never re-derive):
  * service name `library`, internal port 8080, `edge` network only, volume
    `library_data`, env prefix `LIBRARY_*`, auth at `auth:8089`, aud == `library`.

Cross-app client endpoints (embed / CMDB / Gateway / budget) are NOT pinned by any
frozen contract — the contracts fix only the *tool signatures* (agent-runtime and
CMDB Stage-2 own transport). So they are config here, defaulting to the conventional
compose DNS names, and every client degrades loudly when its endpoint is unset/down.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _b(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _i(name: str, default: int) -> int:
    v = os.environ.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


@dataclass
class Config:
    # ── service ──────────────────────────────────────────────────────────────
    port: int = field(default_factory=lambda: _i("LIBRARY_PORT", 8080))
    data_dir: str = field(default_factory=lambda: os.environ.get("LIBRARY_DATA_DIR", "/data"))
    ui_dir: str = field(default_factory=lambda: os.environ.get("LIBRARY_UI_DIR", "/app/ui/build"))
    corpus_git_remote: str = field(default_factory=lambda: os.environ.get("LIBRARY_CORPUS_REMOTE", ""))
    suite_domain: str = field(default_factory=lambda: os.environ.get("SUITE_DOMAIN", "suite.local"))

    # ── identity / RS (auth-apps-tokens-scopes.md §1-2) ──────────────────────
    audience: str = field(default_factory=lambda: os.environ.get("LIBRARY_AUDIENCE", "library"))
    issuer: str = field(default_factory=lambda: os.environ.get("AUTH_ISSUER", "https://auth.suite.local"))
    auth_base: str = field(default_factory=lambda: os.environ.get("LIBRARY_AUTH_BASE", "http://auth:8089"))
    jwks_poll_s: int = field(default_factory=lambda: _i("LIBRARY_JWKS_POLL_S", 30))  # ≤30s (§2)
    clock_skew_s: int = field(default_factory=lambda: _i("LIBRARY_CLOCK_SKEW_S", 60))  # ≤60s (§2)
    # HS256 test-signer (sandbox default, matching auth): shared secret verify with
    # NO external crypto. Production sets LIBRARY_SIGNER_ALG!=HS256 → JWKS asym verify.
    signer_alg: str = field(default_factory=lambda: os.environ.get("LIBRARY_SIGNER_ALG", "HS256"))
    at_secret: str = field(default_factory=lambda: os.environ.get("LIBRARY_AT_SECRET", "dev-at-secret"))
    id_secret: str = field(default_factory=lambda: os.environ.get("LIBRARY_ID_SECRET", "dev-id-secret"))
    require_dpop: bool = field(default_factory=lambda: _b("LIBRARY_REQUIRE_DPOP", False))
    # test-mode: accept a plain X-Debug-Sub / X-Debug-Scopes for in-proc dispatch tests.
    allow_debug_principal: bool = field(default_factory=lambda: _b("LIBRARY_ALLOW_DEBUG_PRINCIPAL", False))

    # ── agent-runtime embed() facade (D-13 hard dep of indexing) ─────────────
    embed_url: str = field(default_factory=lambda: os.environ.get("LIBRARY_EMBED_URL", "http://agent-runtime:8080/v1/embeddings"))
    embed_role: str = field(default_factory=lambda: os.environ.get("LIBRARY_EMBED_ROLE", "library-embedder"))
    # dim is CONFIG not a constant (PENDING-SIZING); default Qwen3-Embedding-0.6B 1024.
    embed_dim: int = field(default_factory=lambda: _i("LIBRARY_EMBED_DIM", 1024))
    embed_batch_max: int = field(default_factory=lambda: _i("LIBRARY_EMBED_BATCH_MAX", 256))
    embed_timeout_s: float = field(default_factory=lambda: float(os.environ.get("LIBRARY_EMBED_TIMEOUT_S", "20")))

    # ── CMDB resolve_host_facts (version-scoped retrieval) ───────────────────
    cmdb_url: str = field(default_factory=lambda: os.environ.get("LIBRARY_CMDB_URL", "http://cmdb:8080"))
    hostfacts_ttl_s: int = field(default_factory=lambda: _i("LIBRARY_HOSTFACTS_TTL_S", 60))  # short-TTL (contract §)

    # ── Gateway get_sandbox_evidence (auto-admit evidence validation) ────────
    gateway_url: str = field(default_factory=lambda: os.environ.get("LIBRARY_GATEWAY_URL", "http://gateway:8080"))
    #
    # THE AUTO-ADMIT LANE KILL-KNOB. The sandbox seam froze both halves 2026-07-03
    # (gateway-cmdb-library-sandbox.md), so the evidence-validation code path is
    # BUILT — but per the Stage-4 operator instruction it stays code-path DISABLED
    # until D-7 evidence actually flows and the operator flips this on at go-live.
    # DEFAULT FALSE. While false, request_admission on a sandbox-evidence doc ALWAYS
    # routes to the operator review queue and NEVER auto-admits (admission.py enforces).
    auto_admit_enabled: bool = field(default_factory=lambda: _b("LIBRARY_AUTO_ADMIT_ENABLED", False))
    gateway_read_timeout_s: float = field(default_factory=lambda: float(os.environ.get("LIBRARY_GATEWAY_TIMEOUT_S", "10")))

    # ── budget middleware (auth-exposed budget-check API; F14 resolution) ────
    budget_api: str = field(default_factory=lambda: os.environ.get("LIBRARY_BUDGET_API", ""))  # empty ⇒ local ceiling only
    concurrency_ceiling: int = field(default_factory=lambda: _i("LIBRARY_CONCURRENCY_CEILING", 32))
    propose_quota_per_day: int = field(default_factory=lambda: _i("LIBRARY_PROPOSE_QUOTA", 50))  # §4 per-sub

    # ── retrieval / ingest knobs ─────────────────────────────────────────────
    default_k: int = field(default_factory=lambda: _i("LIBRARY_DEFAULT_K", 8))
    max_k: int = field(default_factory=lambda: _i("LIBRARY_MAX_K", 25))
    rrf_k: int = field(default_factory=lambda: _i("LIBRARY_RRF_K", 60))
    candidate_pool: int = field(default_factory=lambda: _i("LIBRARY_CANDIDATE_POOL", 50))  # top-50 each half
    reranker_enabled: bool = field(default_factory=lambda: _b("LIBRARY_RERANKER_ENABLED", False))  # OFF at MVP
    crossref_min_distinct: int = field(default_factory=lambda: _i("LIBRARY_CROSSREF_MIN_DISTINCT", 3))  # N≥3
    bulk_admit_cap: int = field(default_factory=lambda: _i("LIBRARY_BULK_ADMIT_CAP", 10))
    fetch_max_bytes: int = field(default_factory=lambda: _i("LIBRARY_FETCH_MAX_BYTES", 2 * 1024 * 1024))  # 2MB
    fetch_timeout_s: float = field(default_factory=lambda: float(os.environ.get("LIBRARY_FETCH_TIMEOUT_S", "10")))
    allow_private_fetch: bool = field(default_factory=lambda: _b("LIBRARY_ALLOW_PRIVATE_FETCH", False))  # SSRF: off

    @property
    def resource_metadata_url(self) -> str:
        return f"https://library.{self.suite_domain}/.well-known/oauth-protected-resource"

    @classmethod
    def from_env(cls) -> "Config":
        return cls()
