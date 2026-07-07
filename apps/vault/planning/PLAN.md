# Stage 2 — PLAN — `vault` (Critical-infra)

> **Status: DRAFT pending adversarial review** (Stage-2 requirement). Date: 2026-07-03.
> **What this plans:** the deployment/config/integration of **adopted OpenBao 2.5.x (≥ 2.5.5, never the 2.6.0 beta — ratified D-14)** plus the **thin wrapper app** that owns the SoD inversion. This is NOT a plan to build a secrets store.
> **Binding inputs consumed verbatim (never re-derived):** `context/CONTRACTS/vault-gateway-redemption.md` (FROZEN; §3 ratified D-4), `context/CONTRACTS/auth-apps-tokens-scopes.md` **§8 THE PIN** (holder-scope claim shape; Vault Stage-2 unblocked on it), `context/specs/IDENTIFIERS.md`, `context/specs/TICKET_STATE_MACHINE.md`, `context/specs/DEPLOYMENT.md` (§1 `creds`, §3a sidecars), `context/RATIFICATIONS_2026-07-02.md` (D-4/D-14/D-16/D-17), `apps/board/planning/PLAN.md` §7/§8 (approval record, `consume_approval`, `GET /facts/approval/{id}` + its stated D-4 predicate), `killswitch-chain.md` §5, ARCHITECTURE §10–§12.
> **Design principle (engineering discipline):** the redeeming caller may be driven by a weak or hostile model. Every control below REJECTS invalid redemptions **in code, server-side, deterministically**. Nothing assumes caller self-policing.

---

## 0. Stage-2 obligation discharged: RESEARCH.md re-checked against frozen contracts + tier-1 specs

The `/_context/` path bug meant Stage-1 may have run without the tier-1 specs deliberately loaded (RATIFICATIONS defect note). Re-check results — deltas between RESEARCH.md and the now-frozen context, all resolved in this plan:

| RESEARCH.md item | Frozen-context resolution |
|---|---|
| Open Q1 "Planning BLOCKED on auth's token model" | **UNBLOCKED** — §8 pin: `at+jwt`, `aud == vault` exact/single, `scope ∋ vault:read-credential`, `bound_subject = svc:gateway`, mandatory `cnf`, 9-step validation, live-check by class, drift bound D=1s. Consumed verbatim in §4 |
| Open Q5 "where the four-holder check lives" | **D-4 ratified**: Gateway-side baseline PLUS Vault's redeem endpoint independently verifies the approval, naming `approval_id`. Mechanism choice (Board API call vs signed offline evidence) is this plan's §4.3 — **live Board facts call chosen** |
| Open Q8 (WORM home) / Q9 (fail-closed-on-audit) | **D-16 ratified** (posture-tagged): hardened log host; fail-closed-on-audit accepted. Encoded §6 |
| Open Q4 (seal model) | **D-16 ratified**: on-prem Transit auto-unseal via minimal `vault_unsealer` + 3-of-5 offline recovery shares. Encoded §7. **Both halves of contract §4 encoded** — the seal model (§7.1) AND the required out-of-container host-access break-glass for a sealed Vault (§7.5); the draft dropped the second half, restored after adversarial review (M-3) |
| Open Q2 (SSH-CA vs OTP default) | Contract §2 froze SSH-CA canonical, OTP reserved. Encoded §3.3 |
| Open Q6 (response wrapping on Gateway leg) | Contract §1 leaves it optional Gateway-leg-only. **Decision here: NOT used in v1** (§4.6, reasoned) |
| Open Q7 (release staging semantics) | Decided §5.2: stage-any-time-after-claim, per-handle releases (no bundles), powerless until redemption preconditions pass |
| RESEARCH §5 RAR upgrade path | Not needed for the invariant — D-4 mechanism supersedes; kept as a Stage-5+ optional hardening note |
| RESEARCH §3 six ACL caveats | All six carried as build-failing invariants (§3.5) |
| Gap found by this re-check | RESEARCH assumed OpenBao reaches auth's JWKS but no spec placed the engine on any network. Resolved §2.2 (new topology decision + DEPLOYMENT amendment) — adversarially reviewed (§11) |

No contradiction between RESEARCH recommendations and the frozen contracts was found; the contracts encode the research's own model (they were cut from it at MERGE-RESEARCH-1).

---

## 1. Component architecture (adopt + wrap)

**Four runtime pieces, one app.** Sidecar naming per DEPLOYMENT §3a (owner: vault).

| Piece | What it is | Networks | Port |
|---|---|---|---|
| `vault` | **The thin wrapper** — the only surface anything else ever talks to: HTTP API + MCP RS + operator UI over one shared state | `edge` (UI/MCP), `creds` (redeem endpoint ONLY), `data_vault` | 8080 |
| `vault_openbao` | OpenBao **2.5.x pinned ≥ 2.5.5** — crypto/storage/leasing/audit engine. Minimum surface: **KV v2 + SSH engine + exactly one auth method (JWT) + one wrapper AppRole** (see §3.1); every other engine/method disabled | **`data_vault` ONLY** — its mTLS listener binds the `data_vault` interface; **no reachable listener on `edge`** (B-3/M-8). JWKS is fetched via the proxy origin (§2.2), so no engine `edge` membership is needed | 8200 (TLS) |
| `vault_unsealer` | Second, minimal OpenBao: Transit engine only, one wrapped unseal key — D-16(c). Approved in principle D-10; DEPLOYMENT §3a row already exists | `data_vault` only | 8200 (TLS) |
| off-box WORM sink | **Hardened log host** (D-16(b)) — physically off the suite host; receives the redemption audit stream. Not a compose service; reached via `VAULT_WORM_SINK_URL` | (egress) | n/a |

**Store classification (ARCHITECTURE §10):** OpenBao storage = **CANONICAL, special regime** (secret material — seal/recovery-key custody per §7). Wrapper SQLite (`vault_data` volume): `audit_local` = **CANONICAL append-only**; `releases` = canonical-operational (restore rule §7.4); `handles` = rebuildable projection of OpenBao KV metadata + SSH roles.

**Env prefix collision note:** DEPLOYMENT §5 mandates the `VAULT_` prefix, which collides with HashiCorp-client conventions (`VAULT_ADDR`). Pinned names avoid ambiguity: `VAULT_OPENBAO_ADDR`, `VAULT_UNSEALER_ADDR`, `VAULT_WORM_SINK_URL`, `VAULT_BOARD_FACTS_URL`, `VAULT_AUTH_ISSUER`, `VAULT_REDEEM_BIND` (creds-interface bind address). The literal `VAULT_ADDR` is never used.

---

## 2. OpenBao deployment + policy model — "gateway-principal may redeem; agents structurally cannot"

### 2.1 Two independent enforcement layers (the load-bearing design decision)

The no-plaintext-to-agents inversion — the property that **an agent never reaches plaintext**, and a compromised *wrapper* cannot read credentials **at rest / absent an in-flight Gateway redemption** (the honest bound; a wrapper is a plaintext MITM *during* a redemption by design — §10 axis 2) — is enforced **twice, by two different trust domains**:

1. **The wrapper's redeem endpoint** (§4) — the D-4 seam: §8-pin token validation + independent Board-approval verification + fail-closed audit, all in wrapper code.
2. **OpenBao's own deny-by-default ACL + JWT auth method** — the engine independently validates the *Gateway's own JWT* against auth's JWKS before any credential path is readable.

To make layer 2 real, **the wrapper performs the credential read/sign using the Gateway's presented JWT, not a wrapper-owned credential**: at redemption it POSTs the Gateway's `at+jwt` to OpenBao `auth/jwt/login` (role `gateway-redeemer`) and executes the KV read / SSH sign with the resulting short-lived OpenBao token. The wrapper's own AppRole (§3.1) is metadata/write-only with an explicit `deny` on `kv/data/*` **read** and no `ssh/sign` capability.

**Honest scope of layer 2 (B-1 resolution — the load-bearing correction from adversarial review):** the §8 pin forbids any host/ticket claim in the Gateway JWT, so OpenBao *cannot* bind a login to the approved host from the token alone. Engine-side *host* scoping is therefore unattainable from the token; the real independent layer-2 bound is **per-host templated authority + single-use + short TTL**, minted by the wrapper from the D-4-verified `host_id`:

OpenBao JWT role `gateway-redeemer` (renders §8 pin + contract §1 verbatim):

```hcl
bound_issuer     = <auth issuer URL>
bound_audiences  = ["vault"]          # required on jwt roles; checked even with bound_claims
bound_subject    = "svc:gateway"      # the Gateway-unique claim — audience alone is insufficient
bound_claims     = { scope: "vault:read-credential" }   # match on the space-delimited scope claim
user_claim       = "sub"
token_policies   = ["redeem-login"]   # NOT a broad read grant — see below
token_ttl        = "90s"
token_num_uses   = 2                  # login-response + exactly one child-token mint; never standing
token_no_default_policy = true
```

- The `gateway-redeemer` login yields only the capability to mint **one child token** scoped to the current request's host. The wrapper templates that child token's policy to exactly `read` on `kv/data/hosts/<host_id>/*` **or** `update` on `ssh/sign/gateway-<host_id>` (whichever the handle kind needs — never both), with **`num_uses = 1`** (one read or one sign, no headroom; the 90 s TTL is the outer bound). `<host_id>` is the D-4-verified request host, not anything the token carries.
- **jti/replay single-use on `auth/jwt/login`:** the wrapper records the presented JWT `jti` and refuses a second login with the same `jti` within its `exp` window — one captured Gateway JWT cannot mint multiple redeem child tokens.
- Agents get **no OpenBao identity at all** (they never authenticate to the engine; no role maps them), plus the belt-and-suspenders explicit `deny` stanza on `kv/*`, `ssh/*`, `sys/*`, `identity/*` attached to any future non-redeem role. **No wildcard (`+`) host in any effective read/sign grant** (CVE-2026-3605 reinforcement + production-hardening item); Stage-5 invariant test: a redeem child token issued for host A cannot read/sign for host B.

### 2.2 Engine network topology (revised after adversarial review — B-3/M-8/M-9)

OpenBao must fetch auth's JWKS **itself** for layer-2 independence (if the wrapper relayed the JWKS, a compromised wrapper could feed a forged key set and layer 2 collapses into layer 1). The Stage-2 draft's "put the engine on `edge` behind an mTLS-required listener" was **rejected in adversarial review**: joining the highest-value listener to the segment shared with every Standard-class/agent container — for an outbound fetch — exposes the engine's pre-auth 8200 TLS surface (threat axis 7) and ARCHITECTURE §11 makes network placement an independent requirement channel security cannot excuse. Revised decision:

- **Engine lives on `data_vault` only; its mTLS listener binds the `data_vault` interface** (`tls_require_and_verify_client_cert=true`; only the wrapper holds a client cert). Build-failing invariant: a TCP connect from an `edge`-only container gets **connection-refused, not a TLS handshake** (Stage-5/7 regression).
- **JWKS is fetched over an integrity-protected channel via the proxy origin:** `jwks_url = https://auth.<SUITE_DOMAIN>/...` with **`jwks_ca_pem` pinned to the suite/proxy CA**, resolved through an internal DNS alias so the fetch stays on-host. This is required because the built auth listens **plain HTTP on `:8089`** (TLS terminates at the proxy — DEPLOYMENT §4); `http://auth:8089` for a JWKS fetch would be an unauthenticated key-set over a shared bridge (forged-key-set → layer-2 root-of-trust collapse) and is **forbidden**. `bound_issuer` stays `https://auth.<SUITE_DOMAIN>` (the token `iss`), independent of fetch origin. The engine reaches the proxy for this fetch via a narrow egress path, not by hosting an `edge` listener.
- **Layer-2 revocation bound (MI-7 honesty):** OpenBao's JWT auth caches JWKS and refetches lazily on an unknown `kid` — it does **not** poll on the ≤30 s cadence. So layer 2's honest revocation bound is token **`exp`** (~2 min TTL + ≤60 s skew, plus the 90 s child-token TTL), not ≤30 s. The ≤30 s kid-prune kill channel applies to **layer 1** (the wrapper's §8-verbatim validator) only. Verify-at-build: confirm the pinned OpenBao 2.5.x JWKS caching/refresh knobs.

*Rejected alternatives:* engine on `edge` (above); wrapper-served JWKS relay (single-trust-domain collapse); static `jwt_validation_pubkeys` (breaks lazy-refresh key rotation). *Fallback if the proxy-origin fetch proves impractical:* a §12 ask to auth for an optional internal TLS listener/sidecar on 8089 with the CA pinned, or a dumb TCP pass-through sidecar (`vault_jwksfwd`, D-10 convention) preserving end-to-end TLS to auth — never the plain-HTTP path.

**Wrapper→engine path pinning (M-8):** `VAULT_OPENBAO_ADDR` is pinned to the engine's `data_vault` network alias so the step-11 plaintext/cert response never nondeterministically routes over any other bridge; both containers' engine-facing traffic stays on `data_vault`.

### 2.3 Config-as-code

All OpenBao mounts, policies, roles, and audit devices are declared in a versioned, idempotent bootstrap script (`src/openbao/bootstrap/`) applied via a short-lived `generate-root`-minted token (§7.1); the initial root token is revoked at first boot. Config drift = Stage-7 checklist item. Gate-weakening edits to this config (TTL raises, principal additions, audit-device changes) follow ARCHITECTURE §12 change control: operator step-up + tamper-evident audit row (§8).

**SSH sign-roles are change-controlled, never runtime-mutable by the wrapper (B-2 resolution — reconciles the §3.1↔§2.3 contradiction the review found):** a per-host `ssh/roles/gateway-<host_id>` (pinned `allowed_users`, empty `default_user`, non-empty templated `valid_principals`, no wildcards) is a gate-defining artifact over the contract §2 build-failing invariant. Creating/modifying one uses the **operator change-control path**: applied by the config-as-code bootstrap under a short-lived `generate-root`/quorum-minted token with step-up + a tamper-evident audit row — NOT the wrapper's standing AppRole. UI host-onboarding (§8.2) only *stages a proposed role record* that an operator step-up applies; the wrapper has no write to `ssh/roles`. A **continuous invariant check** (not just bootstrap + Stage-7 drift) alarms on any `ssh/roles` write in the OpenBao audit stream and on any role carrying wildcard/`root` `allowed_users` or `allow_empty_principals=true`. This puts the sign call and the role that bounds it in two different trust domains — a compromised wrapper cannot widen a sign-role before signing.

---

## 3. What the Vault stores + the credential model

### 3.1 Mounts and identities

| Mount / identity | Purpose |
|---|---|
| `kv/` (KV v2) | irreducible static secrets (`kv/data/hosts/<host_id>/<name>`) — NAS admin login, switch enable, third-party API keys, the Wazuh connector's two read-only creds (`board-wazuh-connector-kickoff.md` §3). **All values stored as strings** (only strings are HMAC'd in audit) |
| `ssh/` (SSH engine, CA mode) | the canonical broker for ~20 hosts' shell/root access. `allow_empty_principals=false` engine-wide (CVE-2024-7594; pinned fixed in ≥ 2.0.2) |
| JWT auth (`auth/jwt`) | the **one Gateway auth method** (role §2.1). No other auth method for machine principals exists |
| AppRole (`auth/approle`, wrapper only) | the wrapper's engine identity: `create`/`update` on `kv/data/hosts/*` (rotation writes), `read`/`list` on `kv/metadata/*` (handle projection), **explicit `deny` on `kv/data/*` read, `ssh/sign/*`, AND `ssh/roles/*` (write included)**. Secret-zero: `role_id` baked, `secret_id` injected at deploy, rotated on schedule. **B-2: the wrapper holds NO runtime write to `ssh/roles`** — see §2.3 (sign-role edits are change-controlled, not a standing wrapper capability) |

### 3.2 Handles (IDENTIFIERS.md rows, consumed verbatim)

- `handle` = `cred://hosts/<host_id>/<name>` — powerless app-level URI; consumers never parse it. Wrapper maps handle → {kind: `ssh-ca` | `kv`, OpenBao path or sign-role, host_id, non-secret metadata}.
- `release_id` — **format pinned by this plan (discharges the IDENTIFIERS.md "prefix-typing decided at Vault Stage-2" note): `rel-` + ULID.** It is a wrapper-DB primary key, provably not an OpenBao token of any kind (Stage-5 invariant test: `release_id` presented to any OpenBao endpoint as a token fails; format disjoint from wrapping-token format).

### 3.3 SSH-CA brokering (contract §2, encoded)

At redemption of an `ssh-ca` handle, the wrapper (with the Gateway's OpenBao token, §2.1) calls `ssh/sign/gateway-<host_id>`:

- `public_key` = the **ephemeral per-run public key** from the Gateway's redeem request (never stored),
- `valid_principals` = **non-empty, derived server-side** from the handle's registered principal (e.g. `root` or the playbook service user) — **never from free request input**; per-host sign-roles pin `allowed_users`, `default_user` empty, no wildcards (build-failing invariant),
- `ttl` = release-scoped, default **10 min** (band 5–15, sized to one run; `VAULT_SSH_CERT_TTL`),
- `key_id` = `<ticket_id>` (contract §2 — host auth-log correlation); the audit record additionally carries `run_id` + `traceparent` (§6.2).

Fleet preconditions (operator artifacts, surfaced in UI §8): `TrustedUserCAKeys` provisioned per host; **enforced/monitored NTP** (skew silently extends certs); KRL-push/CA-rotation runbook. OTP mode: deferred until a host demonstrably needs revoke-on-use (none currently; revisit note).

**Kill-switch honesty (contract §4 / killswitch-chain §5, restated where it binds):** seal, kill switch, and token revocation stop **new** issuance/redemption only. An issued cert dies only by TTL or KRL/CA rotation. Every Stage-5/7 claim this app makes uses that phrasing.

### 3.4 Short-lived by default

SSH-CA signed certs (no stored fleet root passwords) are the default; KV statics carry per-handle rotation policy metadata (schedule + post-redemption-rotate flag) surfaced in the UI; rotation writes are new KV v2 versions (write-only path — §3.1). **Rotation-durability rule (M-5):** a rotation is **not complete until the new KV version is durably off-box** — the wrapper either triggers a rotation-scoped `bao operator raft snapshot save` + ship (reuses §7.3 machinery; rotations are rare) or does two-phase rotation (set+verify new, keep old valid until the off-box snapshot is acked, then revoke old). This closes the backup-RPO hole where a credential rotated between nightly snapshots is unrecoverable after a host loss.

### 3.5 The six RESEARCH §3 conditions → build-failing invariants (Stage-5 proves each)

1. Redeem role binds `bound_subject=svc:gateway` + scope claim, never `aud` alone (§2.1). 2. No agent identity exists on the engine; `identity/*` writes denied to all non-root; engine pinned to a patched line (monthly patch = Stage-5 requirement). 3. Agent auth tokens: agents never log in to the engine — and auth mints agent JWTs `no_default_policy=true` per contract §1. 4. No CIDR-as-identity anywhere. 5. Gateway direct-to-backend closed: the Gateway has **no route** to `vault_openbao` (not on `data_vault`; no client cert for the engine listener — §2.2) — its JWT is only usable *through* the wrapper's redeem endpoint, so D-4 checks cannot be sidestepped. 6. No agent container shares volumes/networks with the seal/unsealer/root-token material.

---

## 4. THE REDEMPTION CHECK — the SoD seam (producer side; Gateway consumes this)

**Endpoint:** `POST /redeem` — served **only on the `creds` interface** (`VAULT_REDEEM_BIND`), mTLS-mutual per ARCHITECTURE §11 / DEPLOYMENT §1. It is not an MCP tool, it is not registered on any agent-visible surface, and it cannot be *routed to* from `edge` (enforced by the boot-time bind check) nor authenticated to (step 0). **Bind mechanism (MI-8):** the creds-interface address is pinned via compose IPAM `ipv4_address` (or resolved at boot by matching the interface IP to the `creds` subnet); the wrapper **refuses to boot** if `VAULT_REDEEM_BIND` is unset, `0.0.0.0`, or equal to the `edge`/`data_vault` interface address. Stage-5 regression: a TCP connect from an `edge`-only container to the redeem listener fails at the network layer.

**Check ordering (M-11):** cheap local checks (step 0, local JWT validation steps 1–6, step-8 release existence) run **before** the step-7 uncached introspect and step-9 Board facts call, so a malformed/replayed flood is rejected without amplifying against auth/Board. The §8-pin live check remains satisfied because step 12's D=1 s drift bound re-runs it at the release instant. Terminal denials before step 10 do not burn fail-closed audit acks (caps WORM amplification).

**Request** (schema frozen for Gateway Stage-2 consumption):

```json
{
  "release_id":  "rel-…",
  "ticket_id":   "T-000123",
  "approval_id": "A-000045",
  "host_id":     "nas-01",
  "plan_hash":   "sha256:…",
  "run_id":      "R-…",
  "op_id":       "…",
  "ssh_public_key": "ssh-ed25519 … (ssh-ca handles only; ephemeral per-run)",
  "traceparent": "…"
}
```

plus the Gateway's `at+jwt` (Authorization) and its `cnf` proof.

### 4.1 The check pipeline — deterministic, ordered, every step fail-closed in code

| # | Check | Rejects (all logged; agent-shaped denials escalate §6.3) |
|---|---|---|
| 0 | **Channel**: request arrived on the `creds` mTLS listener; client cert chains to the suite-internal CA and is the Gateway's | `403 not_gateway_channel` |
| 1–6 | **§8-pin steps 1–6 verbatim**: `kid` ∈ currently-served JWKS (poll ≤30 s + on sig failure) → signature → `iss` equality → `exp`/`nbf` ≤60 s skew → **`aud == "vault"`, single-valued (multi-valued = reject)** → `scope ∋ vault:read-credential` → **`sub == svc:gateway`** → **`cnf` proof verified (mTLS `x5t#S256` on this hop — §4.5); no proof, no validity, never downgrade** | `401 invalid_token`, `403 insufficient_scope`, `403 not_gateway` |
| 7 | **§8-pin step 7, destructive-exec class**: pushed denylist **AND** uncached `POST /introspect` to auth (~250 ms timeout → **DENY**). Kill level ≥ G1 arrives via this channel and via the JWKS-epoch — either denies | `403 revoked`, `503 auth_unreachable` (fail-closed) |
| 8 | **Release record**: `release_id` exists, `status = pending` (or the §4.4 idempotent-repeat case: `status=redeemed` AND matching `(op_id, sub)`), bound `ticket_id` matches, not expired | `404 unknown_release`, **`403 release_not_pending`** (terminal — recoded off `409` per M-10; `409` is reserved for auth §5.6 `in_progress` only), `410 release_expired` (terminal) |
| 9 | **D-4 independent approval verification** (§4.3): live `GET /facts/approval/{approval_id}` at the Board as `svc:vault`. Predicate (Board PLAN §7, producer-stated): `status == 'consumed'` ∧ `consumed_by == <the presented token's sub>` (cross-check on Board authority + multi-gateway forward-compat — MI-1) ∧ facts `ticket_id == request.ticket_id` ∧ facts `host_id == request.host_id` ∧ facts `host_id == handle.host_id` ∧ facts `plan_hash == request.plan_hash` **∧ the credential-class bind (M-2): `handle.requires_approval_class ≤ facts.action_class`** under the pinned class ordering — a reversible-class approval cannot redeem a root-class handle. **Freshness (B-4): W = 15 min binds the FIRST redemption only** (run-start latency); a mid-run re-release (§4.4) derives freshness from **live authority** instead: `ticket.status == 'executing'` (via `GET /facts/ticket`) ∧ the execution hold on `GET /facts/host-lock/{host_id}` still held by this ticket (`hold_kind='execution'`) — the never-reaped execution hold IS the "run still legitimately in flight" signal, so revocation/cancel still bites without a duration ceiling. Board unreachable/timeout → **DENY** | `403 approval_not_consumed`, `403 approval_mismatch` (host/ticket/plan/class), `403 approval_stale` (first-redeem past W), `503 board_unreachable` (fail-closed) |
| 10 | **Fail-closed audit gate — D-16(a)**: the redemption **attempt** record is durably acked by **≥2 sinks** (§6.1) *before* any engine call | `503 audit_unavailable` (availability traded for non-repudiation — posture-tagged) |
| 11 | **Engine op with the Gateway's own JWT** (§2.1): `auth/jwt/login` → mint per-host child token (§2.1) → KV read or SSH sign — OpenBao independently re-verifies iss/aud/sub/scope/exp against auth's JWKS | **terminal `403 engine_denied`** + escalation (the two layers disagreed — always anomalous; never-retry) vs **retryable `503 engine_unavailable`/`engine_sealed`** (covers unsealer-restart; M-10 — the old `502` is dropped) |
| 12 | **§8-pin step 8 drift bound**: at the release instant, if `now − revocation_check_ts > D = 1 s`, re-run step 7 or DENY | as step 7 |
| 13 | **Outcome record** acked by ≥2 sinks; release CAS `pending → redeemed` (single-use); **only then** the response leaves the box. If the outcome write fails after an SSH cert was signed, the cert is **not returned** (it expires by TTL, never having left the host), the failure is logged locally + escalated | `503 audit_unavailable` |

**Response:** `{plaintext | signed_cert, metadata (ttl, valid_principals, key_id), release_id, audit_ref}` over the mTLS creds channel. Wrapper never persists the value; memory zeroized after send; `log_raw` forbidden engine-side, and the wrapper's own logs never contain response bodies (Stage-5 egress-scan invariant).

**The standing regression (contract §3, unchanged): agent token → `POST /redeem` → 403, always** — and it can't even get that far from `edge` (§4 header). A denied redemption bearing an agent-class `sub` is a first-class exfiltration signal (§6.3).

### 4.2 Why `status == 'consumed'`, not `'granted'`

Ordering is fixed by the frozen contracts: the Gateway acquires the per-host mutex + fencing token, then `consume_approval` (single-use, `approved → executing`, Board PLAN §8.3), **then** redeems (contract §5). So at redemption time a legitimate approval is always already consumed *by the same Gateway principal now presenting the token* — Board PLAN §7 states exactly this predicate for Vault's D-4 check. `granted` at redeem time would mean the Gateway skipped `consume_approval`: deny. This also makes a **compromised-Gateway-token** attack need all of: a live sender-constrained `svc:gateway` JWT (fresh-minted, cnf-bound), a Board-recorded consumed approval bound to that exact `(host_id, plan_hash)` within W, a pending release staged for that ticket, and passing auth's live introspect — no one of which the Vault trusts the Gateway to assert.

### 4.3 D-4 mechanism choice (the ruling lets Stage-2 pick): **live Board facts call**

Chosen over Board-signed offline evidence because: (a) the producer half already exists, designed for `svc:vault` (Board PLAN §7 — `board-consumers-facts-read.md` freeze at Board's exit); (b) "validated live" is the IDENTIFIERS.md posture for `approval_id` — offline evidence re-introduces a staleness window exactly where revocation must bite (`approved → cancelled` sets the approval `revoked` and must deny redemption *now*); (c) no new Board signing key / verification code path. Cost accepted: Board-down ⇒ no redemptions (fail-closed is the ruled direction; same posture as D-16(a)). The RFC 9396 RAR variant stays a possible future auth-side *addition*, never a replacement for this check.

### 4.4 Idempotency & liveness for a weak caller (no-spin, no-double-release)

- `op_id` (IDENTIFIERS row) on every redeem. **Repeat call with the same `(release_id, op_id)` from the same validated `sub`, while the full pipeline (steps 0–12) still passes** (step 9 now via the B-4 live execution-hold authority, not W), is honored as a *re-release*: KV → same value re-read; SSH → a **fresh** cert signed (old one ages out by TTL). On this path **step 13 is replaced** (MI-4): append a `re_release` outcome record, dual-sink acked per §6.1, with **no release-state transition** — the row stays `redeemed`; `redeemed_at`/`redeemed_by` retain first-redemption values as authoritative — then the response leaves the box. This heals a dropped response without the wrapper ever storing plaintext.
- **Re-release cap (M-11):** at most `N=3` re-releases per `(release_id, op_id)`; over-cap routes to the §6.3 escalation as a compromised-Gateway anomaly, not another cert.
- Different `op_id` against a `redeemed` release → **terminal `403 release_not_pending`** (M-10 — recoded off `409`). Error taxonomy conforms to auth contract §1 / PLAN §5.6 **verbatim**: `401` re-mint; `403` never-retry (machine deny-reason, no scope hint); `409` = `in_progress` **only**; `429` budget (§4/§9); `503` fail-closed retry-later with a bounded backoff + hard attempt/time cap (published in the G-1 legend so a weak model cannot spin). The exhaustive code→retryability legend is frozen in seam G-1.

### 4.5 Sender-constraint choice on this hop

§8 pin: DPoP `jkt` default, mTLS `x5t#S256` verified fallback. The creds hop is already mutually-authenticated TLS (ARCHITECTURE §11), so **`cnf: x5t#S256` bound to the Gateway's creds-client cert** is the natural rendering — one key distribution, channel and token binding collapse to the same secret. **Ask raised** (§12): auth + Gateway Stage-2 confirm minting `svc:gateway` vault-audience tokens with mTLS-`cnf`; if auth ships DPoP-only first, the wrapper verifies DPoP instead (both paths implemented behind one verifier seam).

### 4.6 Response wrapping: not used in v1 (research Q6 closed)

The contract permits Gateway-leg-only wrapping as optional tamper evidence. Declined: the hop already has mTLS confidentiality/integrity + single-use releases + fail-closed audit; a wrap token is one more bearer artifact to keep out of logs. Revisit only if the creds hop ever gains an intermediary. (Consequently `sys/wrapping/*` is unused and denied to every role.)

---

## 5. Agent surface (MCP) + release lifecycle

### 5.1 Exactly four tools (contract §1 — the whitelist IS the surface)

MCP Streamable HTTP, spec pinned **2025-11-25** suite-wide (D-14). RS validation per auth contract §1 (JWKS local, `aud == vault`, RFC 9728 metadata, 401/403 semantics). Scope: **`vault:reference`**. Schemas are flat, low-arity, string/enum-typed — inside the D-17 schema-complexity ceiling (Vault is not gated by the spike, but inherits the ceiling):

| Tool | Params | Returns | Class |
|---|---|---|---|
| `vault_list_handles` | `ticket_id` | handles + non-secret metadata for credentials that ticket's host legitimately needs (host-scoped via Board facts `host_id`) | read |
| `vault_describe_handle` | `handle` | `{handle, host_id, kind, description, requires_approval_class}` — **no rotation/version markers, no timestamps** (recon minimization; research Q7 closed) | read |
| `vault_request_release` | `ticket_id`, `handle`, `op_id` | `{release_id, status: "pending", expires_at}` — opaque, non-redeemable | propose |
| `vault_release_status` | `release_id` | `{status: pending\|redeemed\|expired\|revoked}` — no redeemer identity, no timestamps beyond status | read |

**Not registered on the agent audience, by construction:** any read/export/reveal/unwrap/rotate/sign tool, the redeem endpoint (different network), the manage API. Tool annotations are decoration; enforcement is the per-call scope check + the physically absent registration (RESEARCH §7).

### 5.2 Release lifecycle (research Q7 decisions)

- `vault_request_release` preconditions (M-12 — the draft under-constrained this): valid agent token (`aud=vault`, `vault:reference`); Board `GET /facts/ticket/{ticket_id}` confirms **`exists`** ∧ **`claimed_by == caller's sub`** ∧ **`status` in a live pre-terminal set** ∧ **`host_id` matches the handle's** (non-claimant / terminal / mismatch → typed `403`, logged; Board down → retryable `503 board_unreachable` — MI-10). Staging is allowed from claim time (pre-approval): the release is **powerless** until §4.1 passes.
- **Releases are per-ticket shared objects, per-handle, never bundled** (a leaked reference names one credential's shadow, not a ticket's worth). A conflicting request from the (now necessarily same) claimant with a new `op_id` **returns the existing pending release** (`200 {release_id, status, expires_at}`) — this one rule collapses both the slot-squat and the dropped-response re-heal; `requested_by_sub` is audit-only. A release is **auto-revoked on the ticket's terminal transition** so a stale singleton never outlives its ticket. Residual TOCTOU (claimant changes post-staging) is accepted — releases are powerless and redemption (§4.1) re-verifies everything live.
- TTL: `pending` expires after `VAULT_RELEASE_TTL` (default 24 h — covers ceremony + approval latency; expiry is a lazy CAS + sweep).
- Revocation: operator (UI) or **Gateway** (`POST /releases/revoke {ticket_id}` on the creds interface — the killswitch-chain §1 "revokes outstanding Vault leases" duty rendered against this model: what is revocable is *pending releases*; issued certs are TTL-bound, stated honestly).
- Agent writes `release_id` onto the Board ticket (contract §1 data-hygiene rule: `release_id` is the only Vault reference agents ever carry; no wrapping token or redeemable material may appear in tickets/notes/chat/logs — and none exists in this design).

### 5.3 Wrapper data model (SQLite, `vault_data`)

```
handles(handle PK, host_id, kind, openbao_ref, description, requires_approval_class,
        rotation_policy, recovery, created_at, retired_at NULL)  -- rebuildable projection
        -- requires_approval_class: min action_class an approval must carry to redeem (M-2, pinned ordering)
        -- recovery ∈ {ssh-ca-resettable, provider-console, console-only} (M-5 restore recovery path)
releases(release_id PK 'rel-'+ULID, handle FK, ticket_id, requested_by_sub, op_id,
         status CHECK(pending|redeemed|expired|revoked), created_at, expires_at,
         redeemed_at NULL, redeemed_by NULL, approval_id NULL, run_id NULL)
         -- status transitions are CAS single-statement; INSERT-only otherwise
audit_local(seq INTEGER PK AUTOINCREMENT, ts, event_type, actor_sub, handle, release_id,
            ticket_id, approval_id, run_id, traceparent, outcome, detail_json,
            prev_hash, row_hash)                                -- append-only, hash-chained (§6.1)
```

Triggers forbid UPDATE/DELETE on `audit_local` and non-CAS updates on `releases` (Board PLAN §2.4 pattern).

---

## 6. Audit — D-16(a)/(b) encoded

### 6.1 Two sinks, fail-closed, at the wrapper

Every redemption **attempt**, **outcome**, **denial**, release event, and manage-surface change is written to:
1. `audit_local` (hash-chained rows; chain HEAD exposed on the status surface for external anchoring), and
2. the **off-box WORM sink — hardened log host** (D-16(b)): HTTPS POST with required 2xx ack, mTLS client cert, append-only storage on a host whose credentials the suite host does not hold (Vault-host root cannot rewrite it). Transport is ack-based by design — plain TCP syslog has no application ack and UDP drops silently (RESEARCH §6). Impl target: the log host runs a minimal append-only receiver; **verify-at-build**.

**The D-16(a) rule in code (MI-5 — frozen contract §6 conformance):** the frozen contract says "every redemption AND every denied attempt is written fail-closed (≥2 sinks)." The plan honors that verbatim via **Option A**: on the creds interface, a denial response is gated behind the same dual-sink ack as step 10 — if <2 sinks ack, the wrapper returns `503 audit_unavailable` instead of the typed 403/409/410. This costs nothing operationally (redemptions are already halted whenever that condition holds, D-16(a)) and requires no reinterpretation of the frozen text. Release-staging and UI-change events keep a mandatory dual-sink write with durable local queue + continuous WORM ship + gap alarm. *A frozen contract is only reinterpreted by amendment* — if the operator later prefers a "never block recording a refusal" posture, that is a §12 contract-amendment ask (operator-signed, revisit-before-prod), not borrowed prose here.

### 6.2 Record content + correlation (contract §6)

`{redeemer sub, handle, release_id, ticket_id, approval_id, run_id, traceparent, op_id, outcome, ts, openbao_request_id}` — the OpenBao internal request id is captured from the engine response and mapped to `run_id`/`traceparent` here (the Stage-2 obligation contract §6 names). Secret values never appear (strings HMAC'd engine-side; wrapper records carry references only).

### 6.3 Denied-attempt escalation (the exfiltration signal)

A denial whose validated-or-parsed `sub` is agent-class (`agent:*`), or any request reaching `/redeem` without a Gateway channel cert, raises an **active escalation**, not just a log line. Route: **Chat notification** (`chat:post`, aud=`chat`) from `svc:vault` — **ask raised** (§12) since Chat's countersigned slice lists `chat:post` for agents+operator; if the grant is declined, fallback is a `violations` feed on the status surface that MC polls (MC ask). Denials are always in both audit sinks regardless.

### 6.4 Engine-side audit devices (backstop layer)

OpenBao runs **two audit devices of different types**, and — the M-6 correction — the **socket-to-WORM device is a mandatory engine audit device**, so OpenBao's own at-least-one fail-closed rule halts the *engine* on loss of off-box auditability, independent of wrapper honesty (the availability cost is exactly the ratified D-16(a) posture, so no new trade). File device on its private volume is the second. `log_raw` never enabled; `hmac_accessor` default kept; CVE-surface-patched (the 2025 audit-device RCE cluster — pin ≥ 2.5.5).

**The independent witness against a lying wrapper (M-6):** a compromised wrapper that omits an event breaks no hash chain and re-publishes its own HEAD, so wrapper-chain gap-monitoring cannot detect wrapper censorship. The real detector is **WORM-host cross-correlation**: because the engine's audit stream does **not** transit the wrapper, the WORM host matches every engine-stream KV-read / SSH-sign against a corresponding wrapper redemption record within a time bound — an engine event with no matching wrapper record alarms as a censorship/exfiltration signal — plus stream-liveness alarms on both streams. §6.1/§10.2 name this engine-stream cross-correlation (not wrapper-chain gap-monitoring) as the independent evidence. Stage-5 specifies the correlation window + alarm.

---

## 7. Seal, secret-zero, DR — D-16(c) encoded

### 7.1 Seal chain

- `vault_openbao` seal stanza: **Transit auto-unseal** against `vault_unsealer` (`data_vault`, TLS): unattended container restarts for the credential store. The seal-stanza **Transit token is orphan + periodic (non-expiring or explicitly renewed), scoped to encrypt/decrypt on the one key** (M-7) — its TTL/renewal is stated, it gets a §7.2 custody line, and §8.5 surfaces its remaining TTL (silent expiry would otherwise surface only at the next restart).
- `vault_unsealer`: minimal OpenBao (Transit engine + one key + the seal token above; file storage; its own **Shamir** seal). It holds no suite secrets — only the wrapped unseal key. Its backup is a **quiesced** file copy (it changes only on key rotation), and the Stage-7 drill includes an **unsealer-restore leg** (restore unsealer → demonstrate the engine auto-unseals against it; seal-migration/rewrap as fallback) — a torn unsealer backup is otherwise permanent, fleet-wide credential loss.
- **Suite-internal CA custody (M-7):** the CA that issues the engine mTLS / unsealer / wrapper / creds-hop certs is named explicitly — an out-of-band offline CA (consistent with the no-PKI-engine D-14 decision): stated issuer, offline key custody/escrow, and cert lifetimes/rotation for all four seal-chain certs. Raised as a §12 ask because the Gateway's creds-client cert doubles as the token `cnf` binding (§4.5).
- **Cold-start honesty:** a full-host restart requires an operator to Shamir-unseal the unsealer first (3-of-5); then the main engine auto-unseals. Unattended recovery covers the common case (container/engine restart), not host loss — documented as the boot runbook, surfaced on the UI status panel.
- **Recovery keys** for the main engine (auto-unseal mode): 3-of-5, **escrowed offline** with separate holders (D-16(c)); they are authorization material, *not* unseal keys (cannot unseal if the unsealer is gone — stated in the runbook). The unsealer's Shamir shares: same 3-of-5 offline escrow, distinct envelopes.
- **Never Static-Key seal** anywhere. No standing root token: initial root revoked at bootstrap; `operator generate-root` under recovery-key quorum mints per-ceremony admin tokens (§2.3), each revoked after use.

### 7.2 Crown jewels register

1. SSH CA signing key (non-exportable, inside the barrier) — compromise = fleet-wide; response = KRL push + CA rotation via the SSH engine's multi-issuer support + re-trust runbook. 2. The unseal path (unsealer storage + its Shamir set + the seal-stanza Transit token). 3. Recovery-key set. 4. **Raft-snapshot set** (MI-6) — contains jewel #1 + all KV history; custody line below. 5. **Per-host break-glass credentials** (§7.5, fleet-root-equivalent). 6. Suite-internal CA key (M-7). Each has a custody line in the runbook; none ever exists on an agent-reachable surface.

### 7.3 Backups (canonical stores, ARCHITECTURE §10 — existence non-optional)

| Store | Mechanism | Cadence |
|---|---|---|
| OpenBao storage (integrated raft, single node — chosen for `operator raft snapshot`) | `bao operator raft snapshot save` → snapshot shipped to `VAULT_SNAPSHOT_DEST` (MI-6): **physically off-box, NOT the WORM log host, unreachable from any suite network, credentials not held by the suite host**; wrapped in an **outer encryption layer to an offline escrow key** independent of the seal chain (a Transit-auto-unseal snapshot is decryptable by whoever holds the unsealer) | nightly + before any engine upgrade + on rotation (§3.4) |
| Unsealer storage | file-level copy (tiny, changes only on key rotation) | on change |
| Wrapper SQLite | SQLite `.backup` → off-box | nightly |
| `audit_local` + WORM stream | WORM host IS the off-box copy; local file ships continuously | continuous |

### 7.4 Restore-consistency rule (stated, drilled at Stage-7)

Restoring the Vault to T−1 while the Board/audit/world are current must not resurrect stale authority. **Restore detection is in code, not a runbook step (M-4):** on wrapper startup, before serving `/redeem`, the wrapper compares its local `audit_local` chain HEAD (`seq` + `row_hash`) against the WORM sink's last-acked HEAD; **any divergence/regression is treated as a restore** — it auto-writes the `restore_marker` row (linking the last WORM HEAD), **mass-revokes all `pending` releases in code**, and raises the §6.3-class escalation. If the WORM HEAD is unfetchable at boot, `/redeem` stays closed (D-16(a) posture). Strictly-safe simplification also adopted: **`pending` releases are unconditionally revoked on every cold start** (agents re-request cheaply, §5.2). The audit chain is **never restored backward** (the WORM sink retains the gap). Engine snapshot restore is followed by a **canary redemption drill** against a disposable target + a handle-projection rebuild.

**KV rotation-gap recovery (M-5):** a KV secret rotated after the last off-box snapshot exists only inside the engine; a restore to T−1 loses the working value, and §6.2 keeps secret values out of audit, so the WORM diff identifies *which* handle is stale but cannot recover it. Each handle carries `recovery` metadata (§5.3: `ssh-ca-resettable | provider-console | console-only`); on restore the rotation queue re-derives the stale set from the WORM-audit diff and recovers **via the handle's recovery path** (re-rotate where a surviving access path exists; otherwise flag for out-of-band recovery per the tag). The Stage-7 drill exercises one handle rotated inside the simulated backup gap. See §3.4 for the rotation-durability rule that shrinks this gap.

### 7.5 Out-of-container host-access break-glass (frozen contract §4 — M-3)

Contract §4 requires, verbatim, "an out-of-container break-glass for host access… recovery keys cannot unseal under auto-unseal." The `generate-root` quorum (§7.1) needs an *unsealed* engine, so it does **not** satisfy this in the contract-named sealed scenario. Therefore: a **per-host emergency access path that lives entirely outside the Vault/OpenBao** — a per-host local emergency account whose static SSH key/password is **offline-escrowed in physical custody distinct from the 3-of-5 recovery shares**, never in KV; opening the envelope triggers mandatory rotation of that credential. It is a fleet-root-equivalent crown jewel: §7.2 carries its custody line, §8.5 surfaces its last-verified date, and the **Stage-7 drill demonstrates host access with the Vault deliberately sealed** (not just asserted).

---

## 8. Human surface (UI) — the rich half of the inverted two-view

Operator-only, behind proxy forward-auth **plus** wrapper-side token validation on every action (never header-trust — auth contract §1 Rule 3). Scope **`vault:manage`** (disjoint from redeem; human-kind; mirrors `library:admin` pattern).

1. **Secrets manager:** create/import KV secrets (write-only — **the UI never displays a stored plaintext back**; break-glass read is the out-of-band quorum ceremony §7.1, deliberately not a web path), version/rotation view from KV metadata, per-handle rotation policy.
2. **Host onboarding:** register host (from CMDB `host_id`); **stage a proposed per-host SSH sign-role** (principals pinned) that an operator step-up applies via the change-control path — the wrapper never writes `ssh/roles` directly (B-2); emit the `TrustedUserCAKeys` provisioning snippet, NTP-check reminder; set per-handle `recovery` tag (M-5).
3. **Access audit:** the full redemption/denial ledger (both-sink status per record), filterable by host/ticket/sub/outcome; **exfiltration-signal view** (agent-shaped denials) pinned at top; chain-HEAD display.
4. **Releases:** live release table; operator revoke.
5. **Status/DR panel:** seal state, unsealer health + seal-token remaining TTL (M-7), audit-sink health (green requires both sinks) + engine-stream cross-correlation liveness (M-6), kill-switch level as read from auth, backup age (incl. `VAULT_SNAPSHOT_DEST` reachability), cert-TTL config, CA fingerprint + rotation runbook link, **per-host break-glass last-verified date (M-3)**.
6. **Change control (ARCH §12):** any gate-weakening edit (TTL raise, principal widening, sink change, release-TTL raise) demands step-up re-auth and writes a tamper-evident audit row; the UI renders the diff before confirm.

UI and MCP are siblings over the same wrapper API/state (invariant); the UI's extra powers come from scope, not from a second data path.

---

## 9. auth scope slice — countersign (this section discharges the §3 ledger row)

Countersigned against `auth-apps-tokens-scopes.md` §3 (offered slice) + §8 (pin):

| Scope | Surface | Grantable to | Action class (risk manifest) |
|---|---|---|---|
| `vault:reference` | the four §5.1 MCP tools | agent roles whose work touches credentials (executor/recon personas) + operator | `list/describe/status` = **read**; `request_release` = **propose** |
| `vault:read-credential` | `POST /redeem`, `POST /releases/revoke` (creds interface) | **HOLDER — `svc:gateway` ONLY** (§8 pin, `bound_subject` pinned; `cnf` mandatory; live-check class **destructive-exec**: denylist + uncached introspect + D=1s) | **destructive-exec-adjacent** (it is the named live-check class in §8 step 7) |
| `vault:manage` | operator UI/API | **operator only, human-kind-gated; never any machine principal** | write-benign (operator-only); gate-weakening subset step-up-confirmed (§8 item 6) |

Unclassified-tool rule honored: every endpoint above is classified; anything unlisted fails closed. Budget middleware per auth contract §1 runs on the MCP/UI surfaces **and on the creds surface** (M-11): `POST /redeem` and `/releases/revoke` carry at minimum the Redis-independent in-process **concurrency ceiling** auth §1 mandates on every RS (destructive-exec "often 1"; here 1–2 in-flight per `sub`), returning typed `429 + Retry-After` per §5.6. This stops a looping/compromised Gateway from amplifying against auth's suite-critical introspect, the Board, and the fail-closed WORM chain. Denial-event WORM writes get a dedicated queue/rate class so a denial flood cannot starve the two acks a legitimate redemption needs. (The Redis-sharing question is parked at root-review-#2 and does not block this plan.)

---

## 10. Threat-model outline (Stage-5 seed — the full model is Stage-5's artifact)

Highest-value target in the suite; assume the container is attacked from inside the suite and out. Primary axes, each with its §-anchored mitigation:

1. **Compromised Gateway (token or process).** Cannot reach plaintext alone: needs a *consumed* Board approval bound to `(host_id, plan_hash, credential-class)` (§4.1-9, D-4 — the check the Vault runs itself), the live execution hold / `executing` status (B-4), a pending release, live introspect pass, and the creds channel cert. Blast radius of full Gateway compromise = credentials for hosts with a currently-live approved+executing run, not the fleet. Residuals, named: (a) within a run it can redeem *those* creds — accepted (the Gateway's charter; four-holder SoD held); (b) `consumed` is sticky, so absent the B-4 live-status conjunct exposure would extend for W after the run reports — narrowed by the `executing` check, with the honest limit that a live compromised Gateway can withhold its own outcome transition; (c) the §4.4 re-release path multiplies live certs up to the re-release cap — bounded by M-11's cap + the credential-class bind (M-2) preventing within-host escalation past the approved class.
2. **Compromised wrapper (honest blast radius — M-1/M-6).** The wrapper is a **structural plaintext MITM on every redemption by design**: since the Gateway has no route to the engine (§3.5 caveat 5), the wrapper performs the read/sign and forwards plaintext, so a compromised wrapper **captures the plaintext of every credential redeemed during the compromise window** — a blast radius on the order of a compromised Gateway. This is **accepted**: some component must broker plaintext when the Gateway cannot reach the engine, and the *at-rest* SoD property still holds (§2.1 headline is qualified to "at rest / absent an in-flight Gateway redemption"). Minimizations: per-host `num_uses=1` child tokens so the wrapper cannot read *beyond* the current redemption's host (B-1); `ssh/roles` removed from the wrapper so it cannot widen cert scope (B-2); the engine's mandatory off-box audit device + WORM-host **engine-stream cross-correlation** as the independent witness against a wrapper that drops/omits audit (M-6 — wrapper-chain gap-monitoring alone cannot catch a lying wrapper).
3. **Agent attempting redemption / exfiltration.** No route (`edge` cannot reach the creds listener), no scope, no `sub`, no `cnf`, no engine identity; four powerless tools; `release_id`/`handle` provably non-redeemable. Standing regression + first-class escalation (§6.3). Prompt-injection axis (mandatory, ARCH §12): every agent-facing output field is operator-authored or enum/ID-typed — no host-originated text transits this app's agent surface; denial messages are static strings + IDs, never echoed request content.
4. **Stolen `release_id` (leaked via ticket/note).** Powerless by design — redemption additionally needs everything in axis 1. Data-hygiene rule (contract §1) still enforced Vault-side: no redeemable material ever appears in agent-readable surfaces, so there is nothing better to steal there.
5. **Audit-sink loss.** Redemption halts (D-16(a), posture-accepted DoS); denials still record locally; status panel + escalation alarm. Deliberate availability trade — revisit-before-prod tag carried.
6. **Seal-key / unsealer compromise.** Unsealer alone yields the unseal key only with engine-storage access too; both containers share a host (homelab reality) — **named residual risk**: host-root compromise defeats the seal chain; mitigations are disk encryption + the offline recovery/rotation path + WORM audit off-box. Posture-tagged with D-16(c).
7. **Engine CVE surface.** Minimum mounts, one auth method, monthly patch requirement (Stage-5), version pin ≥ 2.5.5, no wildcard policies, `sys/audit` writes root-only, advisory re-pin at build (RESEARCH verify-at-build list carried forward wholesale).
8. **Clock attacks.** Cert TTL depends on host clocks — enforced NTP precondition (§3.3); wrapper compares `consumed_at`/W on its own clock with skew bound; `at` never trusted from callers.

---

## 11. Adversarial review — resolutions (Stage-2 requirement)

The multi-agent adversarial pass (5 dimensions → per-finding refutation verify → synthesis) produced 27 findings (4 blocker, 12 major, 11 minor; duplicates merged). **Overall verdict: HOLDS_WITH_CHANGES** — the plan's core (four-holder SoD, agent-never-holds-plaintext, fail-closed audit, D-4 independent verification) survives attack; all four blockers have concrete in-plan resolutions requiring no redesign, and every one is **resolved, not accepted**. All resolutions below are **already folded into the body sections cited** (§§0–10, §12–13). The recurring root cause the review flagged — "two independent enforcement layers" is only true if layer 2's authority is host/credential/off-box-scoped *independent of the wrapper's own checks* — drove the B-1/B-2/M-6 fixes (per-request-scoped engine authority + off-box audit in the engine trust domain).

### Blockers (all RESOLVED)

- **B-1 — Layer-2 redeem policy host-wildcarded `kv/data/hosts/+/*` + `token_num_uses=4`; the "independent" engine layer imposed no host constraint.** Because the §8 pin forbids any host claim in the Gateway JWT, a compromised wrapper holding one legitimate multi-use redeem token could read/sign for hosts with no consumed approval (fleet-wide KV disclosure; worse, fleet-wide root via `ssh/sign`). **Resolved (§2.1, §10.2, §3.5):** the login yields only the right to mint **one per-host child token** templated to `kv/data/hosts/<host_id>/*` **or** `ssh/sign/gateway-<host_id>` with `num_uses=1`; `jti` single-use on `auth/jwt/login`; honest "engine host-scoping is unattainable from the token, so per-host num_uses=1 + short TTL is the real layer-2 bound"; Stage-5 host-A-cannot-touch-host-B test.
- **B-2 — Wrapper's standing AppRole held `CRUD ssh/roles/*`; the sign-request AND the role bounding its principals lived in one trust domain** (contradicts §2.3; partial frozen-contract §2 impact). A compromised wrapper rewrites a sign-role (`+root`, `allow_empty_principals`) then signs a root cert on the next redemption. **Resolved (§3.1, §2.3, §3.5):** `ssh/roles` write removed from the wrapper; role edits go through the operator change-control path (bootstrap under generate-root/quorum + step-up + tamper-evident row); UI only stages a proposed role; continuous no-wildcard/no-root invariant + audit-stream alarm on any `ssh/roles` write.
- **B-3 — `vault_openbao` on `edge` (even mTLS-required) was unsound** — exposes the highest-value listener's pre-auth surface on the agent-shared segment for a mere JWKS fetch; ARCH §11 makes placement independent of channel security. **Resolved (§1, §2.2, §12):** engine on `data_vault` only with its listener bound to that interface (edge-unreachable, build-failing invariant); JWKS fetched via the proxy origin with `jwks_ca_pem` pinned; rejected-alternatives completed; folds in **M-8** (path pinning) and **M-9** (the built auth is plain-HTTP :8089, so `http://auth:8089` JWKS was a forged-key-set hole — now forbidden).
- **B-4 — W=15 min was a hard wall with no mid-run renewal and no consumed-but-unredeemed recovery** — a routine patch+reboot+health-check on a slow host (the ARCH §7 canonical case) could strand credential-less with the mutex held, and a >W outage flipped retryable 503 → terminal 403. **Resolved (§4.1-9, §4.4, §12 open-2, G-1/G-3):** W binds the **first** redemption only; mid-run re-release freshness derives from **live authority** (`ticket.status=='executing'` ∧ execution hold held), preserving D-4 revocation-bite without a duration ceiling; total span capped by the Board watchdog; consumed-never-redeemed recovery route named. Folds in **MI-2** (sticky-`consumed`) and **MI-4** (re-release CAS).

### Major (resolved; two carry an explicitly-accepted residual)

- **M-1 — Threat axis 2 understated the wrapper's blast radius: it is a structural plaintext MITM on every redemption by design.** **Resolved (honesty, §10 axis 2, §2.1 headline) + ACCEPTED residual:** a compromised wrapper captures the plaintext of everything redeemed in the window (≈ a compromised Gateway); some component must broker plaintext when the Gateway can't reach the engine; the at-rest SoD property still holds; minimizations recorded (B-1/B-2/M-6).
- **M-2 — Redemption was host-scoped, not credential/plan-scoped** — a reversible-plan approval could redeem a root handle. **Resolved (§4.1-9):** step 9 adds `handle.requires_approval_class ≤ facts.action_class` under a pinned ordering.
- **M-3 — Missing out-of-container host-access break-glass** (frozen contract §4 — the `generate-root` path needs an unsealed engine). **Resolved (new §7.5, §7.2, §8.5, §0, Stage-7 drill):** per-host offline-escrowed emergency account, opened-envelope-triggers-rotation; drill demonstrates host access with the Vault sealed.
- **M-4 — Restore mass-revoke depended on a human runbook step.** **Resolved (§7.4):** code-level restore detector (local HEAD vs WORM HEAD at boot → auto restore_marker + mass-revoke + escalation; `/redeem` closed if WORM HEAD unfetchable); plus unconditional cold-start pending-revoke.
- **M-5 — Rotation-vs-backup RPO hole: a credential rotated between snapshots is unrecoverable after host loss.** **Resolved (§3.4, §7.3, §7.4, §5.3, §8.2):** rotation not complete until the new KV version is durably off-box; per-handle `recovery` metadata; restore recovers via the handle's recovery path.
- **M-6 — The ≥2-sinks gate + "WORM gap monitoring" lived only in the wrapper trust domain; a lying wrapper defeats both.** **Resolved (§6.4, §6.1, §10.2):** the socket-to-WORM device is a **mandatory engine audit device** (engine fail-closes on off-box-audit loss independent of the wrapper); the real detector is **WORM-host engine-stream cross-correlation** (engine stream doesn't transit the wrapper).
- **M-7 — Unaccounted seal-chain cold-start deps** (unsealer Transit token, torn unsealer backup, unnamed CA). **Resolved (§7.1, §7.2, §7.3, §7.4, §8.5, §12):** token orphan+periodic with custody + TTL surfaced; unsealer-restore leg in the drill; suite-internal offline CA named with custody/rotation.
- **M-8 / M-9 —** folded into **B-3** (engine-path pinning to `data_vault`; integrity-protected JWKS via proxy origin with pinned CA, never `http://`).
- **M-10 — Redeem error taxonomy collided with frozen auth §5.6** (`409` reused for a terminal condition; `502` read retryable). **Resolved (§4.1-8/11, §4.4, G-1):** `409` reserved for `in_progress` only; `release_not_pending`→terminal `403`; step 11 split into terminal `403 engine_denied` vs retryable `503 engine_unavailable/engine_sealed`; `502` dropped; `410` registered terminal; exhaustive legend in G-1.
- **M-11 — No rate/WIP ceiling on the creds surface; unbounded same-op_id re-release.** **Resolved (§9, §4 header, §4.4):** auth-§1 in-process concurrency ceiling on `/redeem` + `/releases/revoke` (429+Retry-After); re-release cap N=3; cheap-checks-before-expensive-calls reordering; denial-WORM-write rate class.
- **M-12 — `vault_request_release` under-constrained (no claimant/state check); singleton conflict undefined → 24h squat.** **Resolved (§5.2):** preconditions `claimed_by==sub` ∧ live status; conflict returns the existing pending release; auto-revoke on terminal transition; TOCTOU accepted (releases powerless).

### Minor (resolved — wording/precision, folded into the same body edits)

- **MI-1** (§4.2 — `consumed_by==sub` is a forward-compat cross-check, not the load-bearing barrier); **MI-2/MI-4** folded into B-4; **MI-3** (§4.1 — irreversible instant = response egress; step-12 D=1s runs immediately before the socket write); **MI-5** (§6.1 — denial records fail-closed dual-sink via Option A `503` gate, satisfying frozen §6 without reinterpretation); **MI-6** (§7.2/§7.3/§10 — snapshot custody + named off-box `VAULT_SNAPSHOT_DEST` + outer-encryption); **MI-7** (§2.2 — layer-2 revocation bound is token `exp`, not ≤30s; kid-prune is layer-1 only); **MI-8** (§4 — creds bind via IPAM + boot-refusal + edge-unreachable regression); **MI-9** (G-7 — `503` removed from never-retry; kill obedience from the Gateway's own channel); **MI-10** (§5.2 — typed Board-down `503`; `release_status` keeps the frozen bare enum).

### Accepted residuals (explicit, per Stage-2 exit criterion)

1. The wrapper as in-flight plaintext MITM (M-1) — structural; at-rest SoD holds. 2. A live compromised Gateway can withhold its outcome transition, extending exposure within its own run (§10 axis 1b). 3. Host-root compromise of the suite host defeats the seal chain (§10 axis 6) — mitigated by disk encryption + offline recovery/rotation + off-box WORM, posture-tagged with D-16(c). 4. Fail-closed-on-audit is a deliberate availability-for-non-repudiation trade (D-16(a), revisit-before-prod). 5. Board/auth-down ⇒ no redemptions (D-4 live-check, fail-closed direction).

---

## 12. Seams, asks, and open decisions

### Seams the GATEWAY consumes from this app (flagged, per the Stage-2 obligation)

| # | Seam | Where defined |
|---|---|---|
| G-1 | `POST /redeem` request/response schema + the full §4.1 rejection matrix with an **exhaustive code→retryability legend conforming to auth §5.6** (`401` re-mint; `403` terminal never-retry — incl. `release_not_pending`, `engine_denied`; `409` = `in_progress` only; `410` terminal; `429` budget; `503` fail-closed retry-later with a hard attempt/time cap) — M-10 | §4/§4.4 — freeze as an amendment/appendix to `vault-gateway-redemption.md` at Gateway Stage-2 countersign |
| G-2 | SSH-CA semantics inside redeem: ephemeral `ssh_public_key` in, cert out; `key_id=<ticket_id>`; server-derived non-empty `valid_principals`; TTL default 10 min | §3.3 |
| G-3 | Idempotent re-release rule (`same release_id + op_id + sub` ⇒ fresh cert / re-read while the **live execution-hold authority** holds, capped at N=3) — the Gateway's retry contract (B-4/M-11/MI-4) | §4.4 |
| G-4 | `POST /releases/revoke {ticket_id}` — the kill-chain "revoke outstanding leases" duty rendered as pending-release revocation; honesty carve-out restated (issued certs = TTL/KRL only) | §5.2 |
| G-5 | creds-hop mTLS: suite-internal offline CA (M-7), client certs both directions; Gateway's cert doubles as the token `cnf` binding (`x5t#S256`) pending the §4.5 ask | §4.0/§4.5 |
| G-6 | Redeem request must carry `run_id` + `traceparent` for audit correlation (contract §6 mapping) | §4.1/§6.2 |
| G-7 | Kill behavior: Vault denies all redemption at level ≥ G1 as **terminal `403 revoked`** (via introspect/denylist/epoch — never retry); fail-closed outage denials are **`503` retry-later with bounded backoff + hard cap** (MI-9 — `503` is NOT in the never-retry set). The Gateway's kill obedience derives from its **own** kill channel (killswitch-chain §1/§2 L2 local flag + live auth check), **never inferred from Vault response codes** | §4.1-7 |

### Asks raised to other apps (blocked dependencies, per the seam rule — none block drafting; two block Stage-4)

| To | Ask | Blocks |
|---|---|---|
| auth | Register **`svc:vault`** (`kind=service`, `board` → `board:read`) — anticipated by Board PLAN §7/§10 ask #5; needed for §4.3 + §5.2 facts reads | Stage-4 (redeem path) |
| auth + Gateway | Confirm `cnf` method on vault-audience `svc:gateway` tokens: mTLS `x5t#S256` (preferred, §4.5) vs DPoP | Stage-4 config detail only (both verifier paths planned) |
| auth (+ Chat) | `svc:vault` → `chat` → `chat:post` for the §6.3 exfiltration escalation; fallback documented (MC-polled violations feed) | nothing (fallback exists) |
| Board | Freeze `board-consumers-facts-read.md` incl. `GET /facts/approval/{id}` with the §7-stated predicate fields (+ ideally `action_class` and `ticket_status` on that response so step 9 stays one Board call — M-2/MI-2) + `svc:vault` in the consumer list | Stage-4 |
| Gateway Stage-2 | Countersign G-1…G-7 (its half of the frozen contract's Stage-2 binding) | Gateway Stage-2 |
| auth (+ Gateway) | Name/agree the **suite-internal offline CA** for the seal-chain + creds-hop certs (M-7), since the Gateway's cert doubles as the token `cnf` binding | Stage-4 |
| DEPLOYMENT.md amendment (this app's Stage-2 right, §3a) | Add rows: `vault_openbao` (sidecar, owner vault, **`data_vault` only — mTLS listener bound to the `data_vault` interface, NOT reachable from `edge`**, 8200) and activate the existing `vault_unsealer` row (`data_vault`, 8200); pin env `VAULT_WORM_SINK_URL` (egress), `VAULT_SNAPSHOT_DEST` (off-box, non-suite), `VAULT_OPENBAO_ADDR` (`data_vault` alias), JWKS-via-proxy-origin + `jwks_ca_pem` (B-3/M-8/M-9/MI-6) | Stage-4 |
| IDENTIFIERS.md amendment | `release_id` format pinned: `rel-` + ULID (fills the "decided at Vault Stage-2" note) | none (recorded here) |

### Open decisions deliberately left (with owner + due stage)

1. WORM log-host receiver implementation (minimal append-only HTTPS acker vs RELP) — **verify-at-build**, Stage-4.
2. Redemption window **W** default 15 min — this binds the **first** redemption's run-start latency only (B-4); mid-run re-release freshness is the live execution-hold authority, and total run duration is capped by the Board watchdog, not W. Confirm the first-redeem W against Gateway run-start latency at Gateway Stage-2 (config, not schema). Also name the recovery route for a consumed-never-redeemed approval after a fail-closed outage (Gateway reports `executing→failed`; re-propose, or a narrow Board amendment akin to A-RR).
3. OTP mode enablement per host — deferred until a host needs revoke-on-use (operator, any time).
4. Budget-middleware transport (shared-Redis vs auth API) — parked suite-wide at root-review-#2; implemented behind a seam either way.

---

## 13. Sequencing (API-first, PROCESS Stage-4 order) + exit criteria mapping

**Build order:** (1) compose topology + OpenBao/unsealer bootstrap config-as-code (§2, §7) → (2) wrapper core API: release lifecycle + **the §4 redeem pipeline** + dual-sink audit (§6) → (3) MCP surface (4 tools, §5) → (4) operator UI (§8) → (5) DEPLOYMENT §6 conformance check (networks/ports/names/auth:8089).

**Stage-2 exit criteria (PROCESS.md) — how each is met:**
- *Data model specified over one shared state:* §5.3 + §3.1 (engine mounts) — MCP, redeem API, and UI all read/write the same wrapper store + engine.
- *Both surfaces specified:* agent MCP §5.1 (near-empty, whitelist); human UI §8; the redeem surface §4 is neither — it is the Gateway-only SoD seam, deliberately off both.
- *MCP tool list:* §5.1 (flat/low-arity — D-17 ceiling honored; Vault is not spike-gated).
- *API surface:* §4 (redeem + revoke, creds), §5 (MCP), §8 (manage), status surface §6.3/§8.5.
- *Sequencing:* this section.
- *Adversarial review + residual risks:* §11 (findings + resolutions), §10 (named residuals: W-window Gateway latitude, host-root seal defeat, audit-DoS trade — each accepted with reason or posture-tagged).
