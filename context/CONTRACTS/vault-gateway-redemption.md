# CONTRACT — Vault → Gateway: credential-handle redemption + SSH-CA brokering (agents: handles only, never plaintext)

> **Status: FROZEN** (MERGE-RESEARCH-1, 2026-07-02; §3 ratified D-4, engine ratified D-14 — see `context/RATIFICATIONS_2026-07-02.md`). Producer: **Vault** (thin wrapper over adopted OpenBao 2.5.x, ≥2.5.5). Consumers: **Gateway** (sole redeemer), agents (handle surface only). **This contract supersedes Gateway RESEARCH §4's HashiCorp response-wrapping/cubbyhole assumptions** — the producer decided otherwise, and the producer's model is strictly safer. Gateway Stage-2 binds to the wrapper's endpoints below, never raw OpenBao paths.

## 1. The redemption model (resolves CONFLICT CF-1)

- Enforcement primitive is a **path-scoped ACL on a deny-by-default backend**, NOT response wrapping. The Gateway entity alone holds `read` on the credential subtree; agents hold nothing plus an explicit `deny`. Response wrapping was **rejected as the access-control primitive** (a wrapping token is a bearer credential); if used at all it is Gateway-leg-only tamper evidence, **never routed through an agent**.
- Agent flow: `vault.list_handles(ticket_id)` → handles + non-secret metadata; `vault.request_release(ticket_id, handle)` → opaque, **non-redeemable** `release_id` which the agent writes onto the Board ticket; `vault.release_status(release_id)` → `pending|redeemed|expired|revoked`. Exactly four agent tools; no read/export/unwrap/rotate-that-returns-value tool is even REGISTERED on the agent audience. Handle format: `cred://hosts/<host_id>/<name>` — powerless application-level reference (registered in IDENTIFIERS.md by this merge).
- Gateway redemption: authenticates via `POST /auth/jwt/login` presenting its auth-minted JWT; Vault validates **offline against auth's JWKS** with `bound_issuer=auth`, `bound_audiences ∋ vault`, **PLUS a Gateway-unique `bound_subject`/claim** (audience alone is insufficient — agents may also carry `aud=vault`); then presents `(ticket_id, release_id)` to redeem. Agent tokens are minted `no_default_policy=true` (the default policy grants `sys/wrapping/unwrap` + `cubbyhole/*`).
- **The Gateway's direct-to-backend read path is closed**: redemption goes through the wrapper endpoint so the SoD checks (§3) cannot be sidestepped by a raw backend read.
- **Data-hygiene rule binding Board, Notes, Chat, and all logs:** no wrapping token or redeemable material ever appears in a ticket, note, chat message, or log line. `release_id` is the only Vault reference agents carry, and it must provably not be redeemable.

## 2. SSH-CA brokering (both sides' research agrees — frozen)

Canonical host access = **SSH CA signed certificates**: no stored root passwords; the Gateway alone calls `sign/<role>` with an **ephemeral per-run public key**, receiving a short-TTL cert (5–15 min, sized to one run) with **non-empty ticket-templated `valid_principals`** (never wildcard/default-root — build-failing invariant, CVE-2024-7594; pin OpenBao ≥2.0.2, `allow_empty_principals=false`) and `key_id=<ticket_id>` for host-auth-log correlation. Hard fleet preconditions: `TrustedUserCAKeys` provisioned once per host; **enforced/monitored NTP** (clock skew silently extends cert validity); a KRL-push/CA-rotation runbook exists. OTP mode reserved for hosts needing revoke-on-use. Dynamic short-lived creds by default; irreducible static secrets in KV with rotation.

## 3. Where the Board+CMDB preconditions are checked — **RATIFIED D-4 (2026-07-02), now binding**

**Gateway-side enforcement is the baseline** (the Gateway is the PEP and gathers Board approval + CMDB verdict before redeeming), **PLUS Vault's redeem endpoint independently verifies the approval — naming `approval_id` explicitly** (IDENTIFIERS.md "validated live" posture) — via one Board API call at release time or by verifying Board-signed offline approval evidence (Vault Stage-2 picks the mechanism; either satisfies this ruling). This closes Vault §3 caveat 5: a compromised Gateway token alone cannot reach plaintext, because the redeem endpoint itself checks the approval. RFC 9396 RAR (`authorization_details` naming path + ticket) remains the stronger auth-side upgrade if auth supports it. The standing regression is unchanged: **agent token → redeem → 403, always**, and a denied agent redemption is a first-class exfiltration signal (logged + escalated).

## 4. Kill-switch honesty (feeds `killswitch-chain.md` §5)

Kill switch / Vault seal / Gateway-token revocation stop **new** issuance and redemption; an already-issued SSH cert is revocable only by TTL expiry or KRL/CA rotation. Sealed Vault = zero host access (availability SPOF): an out-of-container break-glass for host access is a required operator artifact; recovery keys cannot unseal under auto-unseal.

## 5. Ordering + network (injected from the specs both researches omitted)

- The Gateway acquires the **per-host mutex (with the Board-minted fencing token — IDENTIFIERS.md) BEFORE any credential redemption** and holds it across the run including the post-action health check.
- The Vault→Gateway hop rides the **`creds` network with mutual authentication (mTLS or equivalent)** per ARCHITECTURE §11 / DEPLOYMENT §1 — absent from both researches, binding anyway. No Standard-class container ever joins `creds`.

## 6. Audit

Every redemption AND every denied attempt is written fail-closed (≥2 sinks of different types; one off-box WORM copy the Vault host root cannot rewrite — sink home is a Vault Stage-2 decision, D-16). Records carry redeemer identity, handle/path, timestamp, correlation ids (map OpenBao's internal request id to `run_id`/`traceparent` at Stage-2), outcome. `log_raw` forbidden; secret values HMAC'd. Redemption **fails closed on auditability** (operator sign-off requested — D-16).
