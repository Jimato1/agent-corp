"""Application settings — the single reader of the environment (DEPLOYMENT §5).

Every Gateway-owned knob is namespaced ``GATEWAY_`` (pydantic-settings). Cross-cutting
values minted once in ``context/specs/DEPLOYMENT.md`` §5 (``SUITE_DOMAIN``,
``AUTH_VERIFY_PORT``) are consumed BY NAME, never re-derived. Nothing else in the app reads
``os.environ`` directly.

Fail-closed posture (PLAN §1): any dependency URL that is set is REQUIRED live at the
instant of action; a missing URL means that leg is UNCHECKABLE and the destructive path
fails CLOSED (never silently allows). Test/isolated builds set the escape hatches.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GATEWAY_", env_file=".env", extra="ignore")

    # ---- Serve model (matches apps/cmdb, apps/chat, apps/pdf) ----
    static_dir: Path = Field(default=Path("static"), description="Built SPA directory (image: /app/static).")
    api_version: str = Field(default="1", description="Advertised on X-API-Version.")
    port: int = Field(default=8080, description="Internal listen port (DEPLOYMENT §2: gateway == 8080).")
    expose_docs: bool = Field(default=False, description="Serve /api/docs + openapi.json (dev only).")

    # ---- Store (D-8: gateway-PRIVATE Postgres on data_gateway; invariant exception #1) ----
    # Production: a postgres:// DSN → the append-only signed audit chain + advisory-lock mutex.
    # Isolated build/tests: an sqlite path → the same portable schema with an emulated,
    # atomic table-lock in place of pg_try_advisory_lock (documented; production IS Postgres).
    db_url: str = Field(default="sqlite:///data/gateway.sqlite3",
                        description="postgres://… (prod, D-8) or sqlite:///path (isolated build).")

    # ---- Audit-chain signing key (§9; O1 custody = Stage-5 secret-material DR) ----
    signing_key_file: Path = Field(default=Path("data/audit_ed25519.key"),
                                   description="PEM Ed25519 private key; readable only by the app user, NOT in the image.")
    signing_kid: str = Field(default="gateway-audit-1", description="kid in the audit HEAD signatures + /halt-status sig.")
    chain_id: str = Field(default="gw-main", description="This chain's id; a NEW chain_id is minted on any restore that cannot prove continuity (anchor contract §4).")

    # ---- auth RS baseline (auth-apps-tokens-scopes.md §1/§8) ----
    auth_issuer: str = Field(default="https://auth.suite.local/", description="The single auth issuer (iss); RS verifies equality.")
    auth_jwks_url: str = Field(default="http://auth:8089/jwks", description="JWKS document; polled <=30s + on signature failure (Redis-independent kill channel).")
    auth_audience: str = Field(default="gateway", description="This RS's RFC 8707 audience (== subdomain == service name).")
    auth_jwks_poll_seconds: int = Field(default=30, description="Max JWKS staleness before refresh.")
    auth_clock_skew_seconds: int = Field(default=60, description="Allowed exp/iat skew.")
    auth_test_hs256_secret: str = Field(default="", description="HS256 shared secret for isolated tests ONLY; empty in prod.")

    # ---- destructive-exec LIVE check (auth §8 step 7; gateway:execute + Vault redeem) ----
    # ~250ms uncached POST /introspect (RFC 7662) AND a pushed denylist; any doubt => DENY.
    introspect_url: str = Field(default="", description="auth POST /introspect for destructive-exec live check; empty => fail-closed.")
    introspect_timeout_ms: int = Field(default=250, description="~250ms (auth §8 step 7); timeout => DENY.")
    drift_bound_ms: int = Field(default=1000, description="§8 step 8: at the irreversible instant, re-check if the live check is older than this (D=1s).")
    allow_uncheckable_destructive: bool = Field(default=False,
        description="Isolated-build ONLY: permit destructive-exec when no introspect transport is configured. NEVER true in production.")

    # ---- The four holders (fail-closed: unset => that leg is unreachable => refuse) ----
    board_url: str = Field(default="", description="Board base URL (facts PIP + consume_approval).")
    cmdb_url: str = Field(default="", description="CMDB base URL (POST /v1/decision + /v1/verdict-jwks).")
    vault_url: str = Field(default="", description="Vault wrapper base URL (redeem over the creds-mTLS hop).")
    notes_url: str = Field(default="", description="Notes base URL (revision-pinned plan-bytes read, A2).")
    mc_url: str = Field(default="", description="MC base URL (anchor push, seam #25).")

    # ---- Gateway service identity + creds-hop mTLS (svc:gateway; §13 cnf = mTLS x5t#S256) ----
    svc_token_file: Path = Field(default=Path("data/svc_gateway.token"),
                                 description="File the svc:gateway holder token is mounted at (client-credentials, freshly minted).")
    vault_mtls_cert_file: Path = Field(default=Path("data/gateway_client.crt"), description="Gateway client cert for the creds-mTLS hop (also the cnf fallback channel).")
    vault_mtls_key_file: Path = Field(default=Path("data/gateway_client.key"), description="Gateway client key for the creds-mTLS hop.")
    vault_ca_file: Path = Field(default=Path("data/vault_ca.crt"), description="CA to verify the Vault server cert on the creds hop.")

    # ---- Wazuh connector (read-only; §7) — endpoints only, creds are Vault handles ----
    wazuh_enabled: bool = Field(default=False, description="Master switch for the read-only Wazuh connector.")
    wazuh_indexer_url: str = Field(default="https://wazuh-indexer:9200", description="Indexer _search (PRIMARY posture/verification source).")
    wazuh_api_url: str = Field(default="https://wazuh:55000", description="Server API (agent liveness, Syscollector metadata).")

    # ---- Execution-engine bounds (D-14) ----
    playbook_project_dir: Path = Field(default=Path("playbooks"), description="Fixed ansible-runner private_data_dir/project; admin-authored playbooks.")
    process_isolation: bool = Field(default=True, description="D-14: ansible-runner process_isolation=True (never disabled on the agent path).")
    run_duration_cap_multiple: float = Field(default=2.0, description="Hard wall-clock cap = catalog est_duration_s × this (the kill-switch guarantee precondition).")
    dpkg_lock_timeout_s: int = Field(default=300, description="-o DPkg::Lock::Timeout on apt playbooks (belt-and-suspenders on the host).")

    # ---- Sandbox (D-7; tier-0) ----
    sandbox_pool_host_id: str = Field(default="sbx-pool-01", description="The CMDB-minted disposable pool host_id the Gateway queries verdicts for.")
    sandbox_harness_image: str = Field(default="sha256:0000000000000000000000000000000000000000000000000000000000000000",
                                       description="Pinned harness image digest (mints harness_version with the profile catalog).")
    sandbox_max_concurrency: int = Field(default=2, description="Per-sandbox-slot concurrency budget.")

    # ---- Cross-cutting values (DEPLOYMENT §5 — consumed by name, NOT GATEWAY_-prefixed) ----
    suite_domain: str = Field(default="suite.local",
                              validation_alias=AliasChoices("SUITE_DOMAIN", "GATEWAY_SUITE_DOMAIN"),
                              description="Root suite domain for deep-link host templates.")
    auth_verify_port: int = Field(default=8089,
                                  validation_alias=AliasChoices("AUTH_VERIFY_PORT", "GATEWAY_AUTH_VERIFY_PORT"),
                                  description="auth forward-auth port (DEPLOYMENT §4: the ONE correct value is 8089).")

    # ---- Test/isolated-build fakes (never true in prod) ----
    fake_runner: bool = Field(default=False, description="Isolated build: use the in-process fake dispatcher instead of embedded ansible-runner.")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
