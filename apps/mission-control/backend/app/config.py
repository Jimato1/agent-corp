"""Application settings — the single reader of the environment (mirrors chat/config).

Every MC-owned knob is namespaced ``MC_`` (pydantic-settings). The cross-cutting
values minted once in ``context/specs/DEPLOYMENT.md`` §5 (``SUITE_DOMAIN``,
``AUTH_VERIFY_PORT``) are consumed **by name**, never re-derived, so they carry no
``MC_`` prefix. Nothing else in the app should read ``os.environ`` directly.

D-12 parameterization contract (PLAN §4.3/§8): NO liveness threshold is compiled in.
The values below are labelled **PRE-SIZING bootstrap defaults**, live in
``guardrail_params``, and are re-confirmable by the operator. No component *enforces*
on them — they gate *display/triage* only.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MC_", env_file=".env", extra="ignore")

    # ---- Serve model (matches apps/chat, apps/pdf) ----
    static_dir: Path = Field(default=Path("static"), description="Built SPA directory (image: /app/static).")
    api_version: str = Field(default="1", description="Advertised on X-API-Version.")
    port: int = Field(default=8080, description="Internal listen port (DEPLOYMENT §2: mc == 8080).")
    expose_docs: bool = Field(default=False, description="Serve /api/docs + openapi.json (dev only).")

    # ---- MC-owned durable store (ARCH §10: audit_anchor + mc_audit are CANONICAL) ----
    db_path: Path = Field(default=Path("data/mc.sqlite3"), description="SQLite file (image: /app/data, a named volume).")
    backup_dir: Path = Field(default=Path("data/backups"), description="VACUUM INTO target for the canonical stores.")

    # ---- auth RS baseline (auth-apps-tokens-scopes.md §1) ----
    auth_issuer: str = Field(default="https://auth.suite.local/", description="The single auth issuer (iss); RS verifies equality.")
    auth_jwks_url: str = Field(default="http://auth:8089/jwks", description="JWKS document; polled <=30s + on signature failure.")
    auth_audience: str = Field(default="mc", description="This RS's RFC 8707 audience (== subdomain == service name; D-3).")
    auth_jwks_poll_seconds: int = Field(default=30, description="Max JWKS staleness before refresh (contract §2).")
    auth_clock_skew_seconds: int = Field(default=60, description="Allowed exp/iat skew (contract §2).")
    auth_test_hs256_secret: str = Field(default="", description="HS256 shared secret for isolated tests ONLY; empty in prod.")

    # ---- auth control-plane URLs (relays + reads; MC calls auth's APIs, never its Redis) ----
    auth_base_url: str = Field(default="http://auth:8089", description="auth service base (posture/epoch reads, budget-check API).")
    auth_killswitch_path: str = Field(default="/admin/killswitch", description="auth's level-addressed trigger (R8 CLOSED); MC relays, never mints an epoch.")
    auth_posture_path: str = Field(default="/killswitch/status", description="auth's kill epoch/level + L2 (auth-direct Gateway) read.")
    auth_budget_api_path: str = Field(default="/budget/status", description="auth's budget-check API (S5 Option B) — per-sub budget dimensions; MC never opens auth's Redis.")

    # ---- Board composition reads (queue / fleet lineage / WIP-cap surface) ----
    board_base_url: str = Field(default="http://board:8080", description="Board API base for ticket/queue/lineage/WIP reads.")
    board_wip_path: str = Field(default="/api/wip", description="Board WIP-cap write surface (operator relay target).")

    # ---- The DEDICATED mc budget/WIP store — SEPARATE from auth's private Redis (S5) ----
    # Load-bearing SoD invariant: MC NEVER connects to auth's private Redis (which also
    # holds the sod-critical revocation denylist). This URL is an MC-owned store on the
    # mc-private `data_mc` network. Per-sub budget POLICY still reads via auth's
    # budget-check API above (Option B); this store holds only the global WIP counters
    # MC owns (UI_SPEC §3.7 "shared WIP state MC owns"). Empty => in-process fallback.
    budget_redis_url: str = Field(default="redis://mc_redis:6379/0", description="MC-owned WIP store. MUST NOT be auth's Redis (data_auth).")

    # ---- Edge observability sidecars (D-10; OBSERVABILITY.md) ----
    prometheus_url: str = Field(default="http://mc_prometheus:9090", description="mc_prometheus query layer (scrapes proxy:9100).")
    blackbox_url: str = Field(default="http://mc_blackbox:9115", description="mc_blackbox TLS/cert-expiry probe.")
    logstore_url: str = Field(default="http://mc_logstore:3100", description="mc_logstore the BFF tails (proxy access logs).")

    # ---- Composition cache + freshness discipline (PLAN §2 honesty) ----
    source_ttl_seconds: float = Field(default=5.0, description="Short-TTL per-source composition cache (5-30s per source).")
    posture_freshness_bound_seconds: float = Field(default=15.0, description="CONFIRMED -> STALE-UNKNOWN degrade bound (PLAN §5.2).")

    # ---- Resolve-event feed (FROZEN contract §3) ----
    resolve_retention_days: int = Field(default=7, description="Resolve replay buffer retention (PLAN §8).")
    resolve_retention_events: int = Field(default=10000, description="Resolve replay buffer cap (PLAN §8).")

    # ---- D-12 DEFERRED — parameterized bootstrap defaults (PLAN §4.3/§8). NOT compiled-in
    # enforcement: these gate display/triage only and the UI nags until the operator sets them.
    suppress_fraction: float = Field(default=0.40, description="PRE-SIZING: correlated-loss population gate (guidance 30-50%).")
    suppress_window_seconds: float = Field(default=60.0, description="PRE-SIZING: correlated-loss window.")
    phi_threshold: float = Field(default=8.0, description="phi-accrual crash suspicion (contract guidance).")
    noisy_net_phi: float = Field(default=12.0, description="phi-accrual on noisy nets (contract guidance).")
    params_presizing: bool = Field(default=True, description="True => guardrail_params carry the PRE-SIZING label until the operator confirms post gap-1.2.")

    # ---- Heartbeat ingest (agent-runtime-mc-heartbeat.md) ----
    runtime_sse_url: str = Field(default="", description="agent-runtime heartbeat SSE producer URL (empty => passive; runtime connects/pushes).")
    heartbeat_stale_seconds: float = Field(default=30.0, description="process_alive_ts staleness bound for display (cadence ~10s, contract §5).")

    # ---- Cross-cutting values (DEPLOYMENT §5 — consumed by name, NOT MC_-prefixed) ----
    suite_domain: str = Field(
        default="suite.local",
        validation_alias=AliasChoices("SUITE_DOMAIN", "MC_SUITE_DOMAIN"),
        description="Root suite domain for review-item URL templates (contract §2).",
    )
    auth_verify_port: int = Field(
        default=8089,
        validation_alias=AliasChoices("AUTH_VERIFY_PORT", "MC_AUTH_VERIFY_PORT"),
        description="auth forward-auth port (DEPLOYMENT §4: the ONE correct value is 8089).",
    )

    @property
    def review_url_base(self) -> str:
        """The FROZEN review-item URL host (mc-chat-review-resolve.md §2)."""
        return f"https://mc.{self.suite_domain}"

    def review_url(self, ticket_id: str) -> str:
        from urllib.parse import quote
        return f"{self.review_url_base}/review/{quote(ticket_id, safe='')}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
