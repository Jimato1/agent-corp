"""Application settings — the single reader of the environment (PLAN §13).

Every Chat-owned knob is namespaced ``CHAT_`` (pydantic-settings). The three
cross-cutting values minted once in ``context/specs/DEPLOYMENT.md`` §5
(``SUITE_DOMAIN``, ``AUTH_VERIFY_PORT``) are consumed **by name**, never
re-derived, so they carry no ``CHAT_`` prefix. Nothing else in the app should read
``os.environ`` directly.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CHAT_", env_file=".env", extra="ignore")

    # ---- Serve model (matches apps/pdf) ----
    static_dir: Path = Field(default=Path("static"), description="Built SPA directory (image: /app/static).")
    api_version: str = Field(default="1", description="Advertised on X-API-Version.")
    port: int = Field(default=8080, description="Internal listen port (DEPLOYMENT §2: chat == 8080).")
    expose_docs: bool = Field(default=False, description="Serve /api/docs + openapi.json (dev only).")

    # ---- Canonical store (ARCH §10: the Chat DB is CANONICAL) ----
    db_path: Path = Field(default=Path("data/chat.sqlite3"), description="SQLite file (image: /app/data, a named volume).")
    backup_dir: Path = Field(default=Path("data/backups"), description="VACUUM INTO target (PLAN §9).")
    db_size_guard_gb: float = Field(default=2.0, description="Weekly size check threshold → posts a needs_review (PLAN §9).")
    presentation_window_days: int = Field(default=90, description="UI default window; the history API reaches everything (PLAN §9).")

    # ---- auth RS baseline (auth-apps-tokens-scopes.md §1) ----
    auth_issuer: str = Field(default="https://auth.suite.local/", description="The single auth issuer (iss); RS verifies equality.")
    auth_jwks_url: str = Field(default="http://auth:8089/jwks", description="JWKS document; polled <=30s + on signature failure.")
    auth_audience: str = Field(default="chat", description="This RS's RFC 8707 audience (== subdomain == service name).")
    auth_jwks_poll_seconds: int = Field(default=30, description="Max JWKS staleness before refresh (contract §2).")
    auth_clock_skew_seconds: int = Field(default=60, description="Allowed exp/iat skew (contract §2).")
    # Test-only symmetric verifier: present ONLY in an isolated build. A real deployment
    # leaves this empty and validates EdDSA/ES256 against the fetched JWKS.
    auth_test_hs256_secret: str = Field(default="", description="HS256 shared secret for isolated tests ONLY; empty in prod.")

    # ---- Push sink — ntfy (D-14, sink ONLY; no identity logic) ----
    ntfy_url: str = Field(default="http://chat_ntfy:80", description="Self-hosted chat_ntfy sidecar base URL.")
    ntfy_token: str = Field(default="", description="Chat's single ntfy write token (device plumbing, NOT a principal).")
    ntfy_topic: str = Field(default="chat", description="The one operator topic Chat publishes to.")
    ntfy_enabled: bool = Field(default=True, description="Master switch; off => SSE/UI remain the durable fallback.")
    ntfy_max_attempts: int = Field(default=10, description="Capped exponential backoff before 'gave_up' (~1h, PLAN §1.4).")

    # ---- Abuse controls (PLAN §11) ----
    rate_post_per_hour: int = Field(default=60, description="Per-sub general post ceiling → 429 (PLAN §11.3).")
    rate_escalation_per_hour: int = Field(default=10, description="Escalations allowed even when the general ceiling is hit.")
    escalation_repush_seconds: int = Field(default=900, description="Un-acked escalation re-push cadence (<=15 min, PLAN §11.2).")
    max_title_chars: int = Field(default=120)
    max_body_chars: int = Field(default=4000)
    max_broadcast_chars: int = Field(default=2000)
    max_tags: int = Field(default=8)
    broadcast_default_expiry_hours: int = Field(default=24)

    # ---- Cross-cutting values (DEPLOYMENT §5 — consumed by name, NOT CHAT_-prefixed) ----
    suite_domain: str = Field(
        default="suite.local",
        validation_alias=AliasChoices("SUITE_DOMAIN", "CHAT_SUITE_DOMAIN"),
        description="Root suite domain for deep-link host templates (PLAN §6).",
    )
    auth_verify_port: int = Field(
        default=8089,
        validation_alias=AliasChoices("AUTH_VERIFY_PORT", "CHAT_AUTH_VERIFY_PORT"),
        description="auth forward-auth port (DEPLOYMENT §4: the ONE correct value is 8089).",
    )

    @property
    def db_size_guard_bytes(self) -> int:
        return int(self.db_size_guard_gb * 1024 * 1024 * 1024)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
