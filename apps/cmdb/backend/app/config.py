"""Application settings — the single reader of the environment (PLAN §9).

Every CMDB-owned knob is namespaced ``CMDB_`` (pydantic-settings). The cross-cutting
values minted once in ``context/specs/DEPLOYMENT.md`` §5 (``SUITE_DOMAIN``,
``AUTH_VERIFY_PORT``) are consumed **by name**, never re-derived, so they carry no
``CMDB_`` prefix. Nothing else in the app should read ``os.environ`` directly.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CMDB_", env_file=".env", extra="ignore")

    # ---- Serve model (matches apps/chat, apps/pdf) ----
    static_dir: Path = Field(default=Path("static"), description="Built SPA directory (image: /app/static).")
    api_version: str = Field(default="1", description="Advertised on X-API-Version.")
    port: int = Field(default=8080, description="Internal listen port (DEPLOYMENT §2: cmdb == 8080).")
    expose_docs: bool = Field(default=False, description="Serve /api/docs + openapi.json (dev only).")

    # ---- Stores (ARCH §10) ----
    # cmdb_data: SQLite — decision_log + policy_change_log are CANONICAL append-only; the
    # inventory mirror + policy projection are rebuildable.
    db_path: Path = Field(default=Path("data/cmdb.sqlite3"), description="SQLite file (image: /app/data volume).")
    # cmdb_policy: the CANONICAL git-backed markdown policy repo (its own git repo w/ remote).
    policy_repo_path: Path = Field(default=Path("data/policy"), description="Policy markdown repo (image: /app/policy volume).")
    policy_repo_remote: str = Field(default="origin", description="Configured git remote name for the policy repo.")
    require_remote: bool = Field(
        default=True,
        description="ARCH §10: a canonical store's local-only .git is a build failure. When true, "
        "boot-integrity refuses to serve unless local HEAD is present on the configured remote, and "
        "gate-weakening edits require push success before taking effect. Tests may set false.",
    )

    # ---- Verdict signing (cmdb-gateway-verdict-token.md §1/§2) ----
    # A CMDB-LOCAL Ed25519 key, deliberately NOT auth's key. If unset, one is generated at
    # boot into the data volume (a real deployment provisions/rotates it under change control).
    verdict_key_path: Path = Field(default=Path("data/verdict_ed25519.key"), description="PEM-encoded Ed25519 private key (CMDB-local).")
    verdict_kid: str = Field(default="cmdb-verdict-1", description="kid served at /v1/verdict-jwks and set in the JWS header.")
    verdict_ttl_seconds: int = Field(default=60, description="valid_until = min(evaluated_at + this, effective_close - grace).")

    # ---- Clock integrity (§3.5) ----
    clock_max_offset_ms: int = Field(default=2000, description="±bound on NTP offset; beyond it every verdict denies clock_unsafe.")
    clock_ntp_synced: bool = Field(
        default=True,
        description="Whether the host asserts NTP sync. In a real deployment this is probed from the "
        "system clock daemon; exposed as config so a test/degraded env can force clock_unsafe.",
    )

    # ---- auth RS baseline (auth-apps-tokens-scopes.md §1) ----
    auth_issuer: str = Field(default="https://auth.suite.local/", description="The single auth issuer (iss); RS verifies equality.")
    auth_jwks_url: str = Field(default="http://auth:8089/jwks", description="JWKS document; polled <=30s + on signature failure.")
    auth_audience: str = Field(default="cmdb", description="This RS's RFC 8707 audience (== subdomain == service name).")
    auth_jwks_poll_seconds: int = Field(default=30, description="Max JWKS staleness before refresh (contract §2).")
    auth_clock_skew_seconds: int = Field(default=60, description="Allowed exp/iat skew (contract §2).")
    auth_test_hs256_secret: str = Field(default="", description="HS256 shared secret for isolated tests ONLY; empty in prod.")

    # ---- Policy-plane change control (§6) ----
    confirm_token_ttl_seconds: int = Field(default=300, description="propose→confirm window; single-use, diff-hash-bound (§6.3).")
    break_glass_max_hours: int = Field(default=4, description="Hard cap on any break-glass emergency window (§6.4).")
    # The authoritative live-check for sod-critical holder tokens (§6.1). In v1 this is
    # implemented behind the root-review-#2 transport seam (A11); when no check URL is set
    # the sod-critical path fails CLOSED unless explicitly allowed for an isolated build.
    revocation_check_url: str = Field(default="", description="auth-exposed live denylist check API (A11 seam); empty => fail-closed.")
    allow_uncheckable_sodcritical: bool = Field(
        default=False,
        description="Isolated-build ONLY: permit sod-critical writes when no live-check transport is "
        "configured. NEVER true in production — a missing live check must fail closed (§6.1).",
    )

    # ---- Wazuh sync (§8, read-only discovery feed) ----
    wazuh_enabled: bool = Field(default=False, description="Master switch for the Wazuh discovery poller.")
    wazuh_url: str = Field(default="https://wazuh:55000", description="Wazuh API base URL.")
    wazuh_user: str = Field(default="", description="Read-only RBAC account (agent:read/syscollector:read/group:read).")
    wazuh_password: str = Field(default="", description="Interim env secret (Vault svc:cmdb static-secret path is A8).")
    wazuh_poll_seconds: int = Field(default=600, description="Discovery poll cadence (10-15 min).")
    wazuh_stale_threshold_seconds: int = Field(default=3600, description="A host gone this long flags stale + escalates.")

    # ---- Escalation outbox → Board (§8, D-6c) ----
    board_escalation_url: str = Field(default="", description="Board escalation-intake endpoint; empty => degraded-but-honest (queue locally).")

    # ---- Cross-cutting values (DEPLOYMENT §5 — consumed by name, NOT CMDB_-prefixed) ----
    suite_domain: str = Field(
        default="suite.local",
        validation_alias=AliasChoices("SUITE_DOMAIN", "CMDB_SUITE_DOMAIN"),
        description="Root suite domain for deep-link host templates.",
    )
    auth_verify_port: int = Field(
        default=8089,
        validation_alias=AliasChoices("AUTH_VERIFY_PORT", "CMDB_AUTH_VERIFY_PORT"),
        description="auth forward-auth port (DEPLOYMENT §4: the ONE correct value is 8089).",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
