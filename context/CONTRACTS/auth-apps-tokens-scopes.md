# CONTRACT — auth → every app: RS/token validation baseline + the scope→tool map countersign index

> **Status: FROZEN by reference** (MERGE-RESEARCH-1, 2026-07-02). auth is BUILT — the authority is `platform/auth/planning/PLAN.md` (cited by section below; consume verbatim, never paraphrase a parallel contract). This doc (a) pins which PLAN sections bind every app, (b) tracks the per-app **countersign** each Stage-2 owes, (c) records the numbers apps will otherwise hard-code divergently.
>
> **Updated 2026-07-02, AUTH COUNTERSIGN + scope-registration session (docs/contract only — no enforcement code touched):** §3 rows countersigned for notes/chat/library (drive already was); **§7** = the `library` audience + slice (closes R7); **§8** = the **holder-scope claim shape, PINNED** — the item Vault and CMDB Stage-2 were blocked on; **§9** = Wave-1 service principals (`svc:notes`, `svc:drive`, `svc:tier-approver` identity); **§10** = kill-epoch semantics confirmed (R8) + single-enforcement-point alignment (R9); **§11** = open items recorded (Redis-sharing → root-review-#2).

## 1. Binding on every RS (all 11 components) — PLAN §4, §5.1, §5.6, §6, §8.6-Rule-3

- Validate locally against auth's JWKS; reject any `kid` not in the currently-served JWKS (poll ≤30s + on signature failure — this is the Redis-independent kill channel); verify `iss` (RFC 9207) and `aud == self` (exactly one resource, no wildcard); enforce coarse scope; verify DPoP/`cnf` where bound.
- Publish RFC 9728 protected-resource metadata; on 401 return `WWW-Authenticate: Bearer resource_metadata=…` so a fresh agent bootstraps (401 → discover → mint audience-bound token → retry).
- Error semantics verbatim from PLAN §5.6 (401 re-mint; 403 `insufficient_scope`+hint vs 403 PDP-deny machine-reason never-retry; 409 `in_progress`; 429 budget; 503 fail-closed).
- Run the shared per-tool-call **budget middleware** (PLAN §6): four dimensions keyed by `sub` in the one shared Redis + a Redis-independent in-process concurrency ceiling; Redis-down = benign allow-but-locally-bounded, sod/destructive 503 fail-closed.
- Subscribe to `auth:revocations` with snapshot resync; past the staleness bound, fail destructive paths closed. Never authorize off any advisory/forwarded header; derive principal only from the validated token / verified `X-Auth-Identity` signature.
- Deliver at Stage-2: the per-app **risk manifest + action-class manifest** (read / write-benign / propose / sod-critical / destructive-exec per tool). Unclassified ⇒ live-check fail-closed.

## 2. Numbers every app inherits (never re-derive) — PLAN §4.2, §7

Agent token TTL **2 min** (band 1–5, per-audience overridable); human 5 min; revocation SLO p99 <500 ms / <1 s suite-wide; JWKS poll ≤30 s; live-check timeout ~250 ms; drift bound **D = 1 s**; clock skew ≤60 s; no refresh tokens for agents; destructive-exec concurrency "very low (often 1)".

## 3. The scope→tool map (PLAN §3.3/§5.5) — countersign ledger

The map is auth's **offered half**; it binds an app only when that app's Stage-2 consumes and countersigns its slice. Status after this merge:

| App | Slice status |
|---|---|
| board | Offered (`board:read/claim/propose/update/approve/run-ceremony`); Board research consistent; countersign at Board Stage-2 (incl. `ceremony_transition` granularity decision) |
| cmdb | Offered (`cmdb:read-policy`, `cmdb:write-policy` HOLDER); CMDB research consistent (incl. the SSD "no agent ever mintable write-policy" guarantee + principal-class defense-in-depth); countersign at CMDB Stage-2 |
| vault | Offered (`vault:reference` agent-reachable; `vault:read-credential` = svc:gateway-only HOLDER; `vault:manage` disjoint operator); Vault research consistent — but needs auth to pin the **claim shape** carrying the holder scope (blocking Vault Stage-2, see MERGE_REVIEW_1 §gates) |
| gateway | Offered (`gateway:execute` HOLDER held by executor agents; svc:gateway holds reads + vault:read-credential, explicitly NOT gateway:execute); Gateway research consistent; countersign at Gateway Stage-2 |
| notes | **COUNTERSIGNED at Notes Stage-2 (2026-07-02, `apps/notes/planning/PLAN.md` §8) — 4-scope slice:** `notes:read` / `notes:search` / `notes:append` (create/append/link — the default agent grant) / `notes:write` (overwrite, rename/archive, reindex, taint-downgrade — operator UI session + narrowly-scoped maintenance principals **only; no standard agent role, ever**). Append-bias adopted as recommended. Registered alongside: **`svc:notes`** (§9) |
| chat | **COUNTERSIGNED at Chat Stage-2 (2026-07-02, `apps/chat/planning/PLAN.md` §5):** `chat:post` (agents + operator — the ONLY agent-reachable capability) / `chat:read` (operator-only: feed, history, SSE, broadcast list) / `chat:manage` (operator-only: ack, broadcast create/revoke). Flat `<app>:<verb>` naming kept; research's `chat:notify:write`/`chat:broadcast:write`/`chat:feed:read` variants dead; auth's offered `chat:broadcast` is **superseded by `chat:manage`** (constant retirement noted §11). Agents never get read/manage |
| drive | **COUNTERSIGNED at Drive Stage-2 (2026-07-02, `apps/drive/planning/PLAN.md` §5.3):** `drive:read` ⇄ {get_artifact, list_artifacts, content GET/HEAD}; `drive:write` ⇄ {put_artifact, upload PUT/DELETE}. **No delete tool exposed ⇒ no delete scope requested** (delete-marker/GC are human-principal-only routes). **`svc:drive` REGISTERED this session (§9)**; Drive stays degraded (flag-always) until the grant activates (Stage-5 store migration) AND the Board ticket-exists endpoint exists (Board Stage-2) |
| mc | Offered (`mc:report/escalate/kill-switch/admin`); MC research consistent (kill-switch = operator-only Tier-2) |
| pdf | Offered (`pdf:render`); countersign at pdf Stage-2 |
| **library** | **COUNTERSIGNED (2026-07-02, this session — closes R7):** `library` audience added; slice `library:read` / `library:propose` / `library:curate` / `library:admin` per §7 below, countersigned against `apps/library/planning/PLAN.md` §5.5. `team` label accepted as an additive auth-schema principal attribute (§7) |
| agent-runtime | No RS scopes (it hosts agents); its seam is key-provisioning/token-minting — PLAN §3.6/§4.5/§5.4 + runtime RESEARCH §4.8 (C7/C8) freeze jointly at runtime Stage-2 (enrollment payload, TPM2_Certify attestation, EK allow-list ownership, rotation/revocation handshake) |

## 4. SoD constants (PLAN, settled #5/#6 — restated because every app cites them)

Holder conflict-set is immutable/compiled-in; TPM-sealed non-exportable keys mandatory for any principal whose closure contains a holder/destructive scope; holder-scope keys never provisioned on a host running executor-agent code; RFC 8693 token exchange off by default and never emits holder scopes.

## 5. Deployment naming — **RESOLVED (ratified D-3, 2026-07-02)**

Mission Control's service/subdomain/audience are all **`mc`** — DEPLOYMENT.md §2 amended; built auth's `mc` audience segment stands unchanged; Chat's assumed `mc.<SUITE_DOMAIN>` deep links are now correct. The directory remains `apps/mission-control/`.

## 6. svc:tier-approver runner — **RATIFIED D-15 (2026-07-02)**

The **Board hosts `svc:tier-approver` as an internal service process**: approval state is the Board's; the process queries the CMDB verdict and applies the auto-tier clearing of `awaiting_approval → approved`; auth kind-gates it structurally away from destructive-exec/high-tier work (it holds `board:approve` + reads only, per PLAN §3.4). Board Stage-2 designs it; auth's registration of the principal is unchanged. **Identity/claim shape pinned in §9 (countersign session, 2026-07-02) — including a load-bearing kind-gating carry-forward.**

## 7. Library audience + scope slice — COUNTERSIGNED (closes R7, 2026-07-02)

The **`library`** RS audience joins the suite audience set (subdomain == audience == service name, DEPLOYMENT §1; the `app` segment of a scope IS the RFC 8707 audience discriminator, PLAN §3.2). The slice, countersigned against `apps/library/planning/PLAN.md` §5.5:

| Scope | MCP tools / operations | Grantable to | Action class | Tier |
|---|---|---|---|---|
| `library:read` | `library_search`, `library_get_doc` | all agent roles + operator | read | 1 |
| `library:propose` | `library_propose` | all agent roles + operator — ingestion is **propose-only**; no principal writes the trusted tier directly (ARCH §12) | propose | 1 |
| `library:curate` | `library_attach_sources`, `library_attach_sandbox_evidence`, `library_request_admission` | **curation-team personas only** (gated on the `team` label) | write-benign | 1 |
| `library:admin` | admission decision, reject, retire, supersede, collections, reindex | **operator only — human-kind-gated; never minted to any agent principal** (mirrors the `vault:manage`/`mc:admin` pattern) | write-benign (operator-only) | 1 |

- **None is a holder scope.** The ConflictSet, HOLDER_SCOPES, and kind-gating tables are untouched. Budget middleware applies per §1 with the classes above.
- **`team` label:** accepted as an **additive principal attribute in the auth schema** (MERGE_REVIEW_1 §6; ARCH §6 "Teams"). It gates which principals may be granted curation roles; it is never a scope and never appears in access tokens. Lands with the Stage-5 store migration.
- **Registration note** (applies to the §7 scopes plus `notes:append` and `chat:manage`): these are contract-registered NOW; the corresponding additive constants in `auth.core.scopes` land as a mechanical Stage-5 edit. Adding non-holder scope ids touches neither the ConflictSet, HOLDER_SCOPES, `HOLDER_ALLOWED_KINDS`, nor any PDP/PEP decision path — and the built `action_class_for_scope` already classifies them correctly by capability suffix (`read`→read, `propose`→propose, everything else→write-benign).

## 8. THE PIN — holder-scope claim shape (FROZEN 2026-07-02; Vault and CMDB Stage-2 build against this VERBATIM)

Applies to any access token whose `scope` contains one of the four holder scopes (`board:approve`, `cmdb:write-policy`, `vault:read-credential`, `gateway:execute`). This is auth PLAN §4.1/§4.3–§4.5 rendered as one consumable shape; nothing here is new semantics.

**Format:** RFC 9068 **`at+jwt`** (JWS). Header `{alg, typ: "at+jwt", kid}`; `alg` = EdDSA in production (ES256 acceptable; the HMAC test-signer exists only in isolated build). **No refresh tokens exist for machine principals — a holder token is always freshly minted** via client-credentials + per-principal asymmetric client assertion.

**Claims (exhaustive normative set — a consumer may rely on exactly these and nothing else):**

| Claim | Rule |
|---|---|
| `iss` | the single auth issuer URL; consumer MUST verify equality (RFC 9207) |
| `sub` | stable principal id (`agent:*` / `svc:*` / `op:*`) — the audit-canonical "who"; opaque (IDENTIFIERS.md) |
| `client_id` | present for client-credentials principals; MAY equal `sub` |
| `aud` | **exactly ONE resource, single-valued** (`board` \| `cmdb` \| `vault` \| `gateway` \| …). Consumer MUST verify `aud == self` and MUST reject a multi-valued `aud` |
| `scope` | space-delimited; the holder scope appears here. **Audience↔holder binding is mechanical:** `vault:read-credential` is honored ONLY when `aud == vault`; `cmdb:write-policy` ONLY `aud == cmdb`; `board:approve` ONLY `aud == board`; `gateway:execute` ONLY `aud == gateway`. Wrong-audience carriage = reject |
| `exp` / `iat` | agent/service TTL **2 min** default (band 1–5, §2); skew ≤ 60 s; `iat` is compared against `revoked_before[sub]` |
| `jti` | unique; surgical-revocation and audit key |
| `cnf` | **REQUIRED on every holder-scope token** (G5, settled #7): DPoP `jkt` (default) or mTLS `x5t#S256` (verified fallback). A holder-scope token without a verifiable proof is INVALID — reject, never downgrade |
| header `kid` | MUST be present in auth's **currently-served** JWKS (poll ≤ 30 s + on any signature failure — the Redis-independent kill channel) |

**Holder→subject pinning (where the holder set is static, the consumer additionally pins `sub`):**

| Holder scope | Legitimate holders | Consumer-side subject check |
|---|---|---|
| `vault:read-credential` | **`svc:gateway` ONLY** | Vault MUST pin `sub == svc:gateway` (`bound_subject`) — audience alone is insufficient, agents may also carry `aud=vault` with `vault:reference` |
| `cmdb:write-policy` | human operator principals only | CMDB checks scope; kind-gating (human-only, compiled-in) guarantees no machine principal can ever mint it |
| `board:approve` | operator principals + `svc:tier-approver` (§9, AUTO-tier-bounded) | Board checks scope + the instance-level `proposer_id != approver_id` (Board owns; PDP backstops — both must permit) |
| `gateway:execute` | executor agents (dynamic set) | no static `sub` pin; scope + the full PDP gate (§5.3 obligations) govern |

**Validation algorithm for a consuming/redeeming app (verbatim; = PLAN §5.1 steps + the holder extras):**
1. Parse JWS; **reject any `kid` not in the currently-served JWKS**; verify signature.
2. `iss` == the single auth issuer (RFC 9207).
3. `exp`/`nbf` within ≤ 60 s skew.
4. `aud` == self, single-valued.
5. `scope` contains the required holder scope (and the audience↔holder binding above holds).
6. Verify the `cnf` sender-constraining proof (DPoP proof for this method+URI, or TLS client-cert thumbprint match). **Mandatory — no proof, no validity.**
7. **LIVE check by action class (never skipped, never cached):**
   - `sod-critical` (`board:approve`, `cmdb:write-policy`) → **authoritative Redis denylist read** (`jti` + `sub` + `kid` + kill level), fail-closed.
   - `destructive-exec` (`gateway:execute`, Vault redeem) → pushed denylist **AND** uncached `POST /introspect` (RFC 7662; auth answers `active:false` on any doubt, including its own Redis loss — §4.6). ~250 ms timeout → DENY.
8. **Drift bound:** at the irreversible instant, if `(now − revocation_check_ts) > D = 1 s`, re-run the authoritative live check or DENY (PLAN §5.3).
9. Authorize **only** off this validated token (+ the PDP verdict where gated). Never off `X-Auth-Identity` alone, never off any advisory/forwarded header (§8.6 Rule 3).

**What is deliberately NOT in the token (consumers MUST NOT expect or parse for it):** no `kind`/`principal_type` claim (kind-gating is enforced at grant time inside auth — a holder scope inside a valid token IS the proof the kind gate passed); no roles; no live budget counters; no ticket/approval facts — `approval_id`, `plan_hash`, fencing token, `proposer_id` are Board/PIP facts checked at the PDP and at the consuming holder, never claims. No multi-audience tokens; RFC 8693 exchange never emits or delegates a holder scope (PLAN §5.4) — a holder token can only originate from a direct §3.5-checked mint.

**Vault rendering (what Vault Stage-2 configures verbatim, `vault-gateway-redemption.md` §1):** JWT-auth role with `bound_issuer` = auth issuer; audience = `vault` (exact, single); **`bound_subject` = `svc:gateway`**; bound claim: `scope` contains `vault:read-credential`; agent tokens minted `no_default_policy=true`; plus steps 7–8 above at the redeem endpoint and the D-4 independent `approval_id` verification. Standing regression: **agent token → redeem → 403, always** (and logged + escalated as an exfiltration signal).

**CMDB rendering:** the pinned shape governs the **inbound `cmdb:write-policy` call** (sod-critical: steps 1–7 with the authoritative-Redis live check, fail-closed, plus §12 policy-plane change control on gate-weakening edits). CMDB's outbound **verdict token is a different artifact** — CMDB-signed per `cmdb-gateway-policy.md` §3, its format frozen at CMDB Stage-2 with the Gateway; it does not use this claim shape.

## 9. Service principals — REGISTERED this session (identity pinned; grants activate at the Stage-5 store migration)

All three are **`kind=service`**, client-credentials + per-service asymmetric key (PLAN §3.1), no refresh tokens, standard §8-table claim shape (holder extras apply only where a holder scope is held). None is an agent; none may ever be assigned an agent role (kind-gate). Structural bars as built: `kind=service` is inadmissible for `gateway:execute` (agent-only) and `cmdb:write-policy` (human-only) by the compiled `HOLDER_ALLOWED_KINDS`; every widening mutation re-runs the §3.5 SSD fan-out + kind check atomically. **The immutable ConflictSet is untouched by all three registrations.**

| Principal | Grants (aud → scope) | Purpose | Constraints |
|---|---|---|---|
| **`svc:notes`** | `board` → `board:read` (+ `auth:authenticate`) | Notes' fail-closed Board fence/provenance reads (`apps/notes/planning/PLAN.md` §9.3) | read-only; NOT a holder; sender-constraining optional (G5 deferral permitted — no holder/destructive scope in its closure) |
| **`svc:drive`** | `board` → `board:read` (+ `auth:authenticate`) | Drive's ticket-exists check (`apps/drive/planning/PLAN.md` §2.1) | same as `svc:notes`; Drive stays degraded (flag-always) until BOTH this grant activates AND the Board ticket-exists endpoint exists |
| **`svc:tier-approver`** | `board` → **`board:approve` (HOLDER)** + `board:read`; `cmdb` → `cmdb:read-policy` | CMDB-tier auto-approval of **AUTO-tier (low-risk, reversible) work ONLY** — hosted by the Board as an internal service process (D-15); identity defined here | holder ⇒ **non-exportable TPM/HSM signing key REQUIRED** (PLAN §3.6) + **trust-domain isolation** (its key never provisioned on a host running executor-agent code, PLAN §3.4) + **sender-constraining MANDATORY** (G5) + every `board:approve` call live-checked per §8. Auto-approval is structurally impossible for destructive-exec/high-tier tickets (PLAN §3.4 bound + the Board/Gateway non-auto floor, `cmdb-gateway-policy.md` §4) |

**Kind-gating carry-forward (LOAD-BEARING — the Stage-5 opener item):** the built compiled-in table has `HOLDER_ALLOWED_KINDS[board:approve] = {human, agent}` (`platform/auth/src/auth/core/scopes.py`), which does **NOT admit `kind=service`** — as built, the `svc:tier-approver` grant is (correctly) rejected at grant time. Reconciling it to the ratified D-15 identity is a **compiled-constant code change + redeploy** — exactly the settled-#5 channel, deliberately NOT performed in this docs-only session. That change must: add `service`; **review whether `agent` should be REMOVED** (no PLAN §3.4 role grants an agent-kind principal `board:approve`); and review `kind=break_glass` admissibility in the same pass. Until it lands, `svc:tier-approver` is registered but **non-activatable — the safe direction** (tier auto-approval simply does not exist yet; every approval stays human).

## 10. Kill-epoch semantics (R8) + single-enforcement-point alignment (R9) — killswitch-chain §6 CLOSED

**R8 — CONFIRMED against the built write path (`auth.killswitch.KillSwitchController`); semantics registered:**
- **auth is the SOLE writer of the epoch** (IDENTIFIERS.md row). One append-only revocation ledger, two monotonic projections: the **revocation fan-out epoch** (bumped on EVERY ledger change; what each RS's `last_epoch`/heartbeat-freshness tracks) and the **kill-switch epoch** (bumped on every kill-level change; signed into JWKS/AS-metadata/`X-Auth-Identity`; the runtime drain/kill command's `epoch` IS this counter, `killswitch-chain.md` §2). Both strictly monotonic; a lower/stale value never un-does a higher one.
- **The trigger endpoint is LEVEL-addressed:** `POST /admin/killswitch {level, issued_by, reason}`. Callers — the MC button included — request a **level** and never supply an epoch; auth mints `epoch := current + 1` (asserted strictly monotonic). "Raise-to-at-least-N" therefore holds **by construction**: every accepted arm yields an epoch strictly greater than all prior ones, and a replayed/stale command can never lower the level or the epoch anywhere downstream (consumers compare monotonically).
- **Write-before-ack:** durable ledger append → authoritative hot SET + publish → only then the operator ack (the H4 ordering concern; PLAN §4.6 finding 3d).
- **Automated callers move only toward MORE restriction** (`arm(automated=True)` refuses any loosening); only the operator lifts a kill.
- **Idempotency-Key:** a replayed arm is already effect-idempotent (same level; the extra epoch bump is harmless and monotonic). **Pinned addition:** the trigger request also carries the caller-minted **`op_id`** (IDENTIFIERS.md row) and auth collapses a same-`op_id` replay to the prior ack instead of appending a duplicate ledger line. This is an additive request-handling item for Stage-5 wiring — it changes no deny semantics, and the endpoint is safe (monotonic) without it.
- **RFC 7009 `/revoke`** (per-`jti`) remains a separate, surgical call; it bumps the fan-out epoch and never touches the kill level.

**R9 — RESOLVED (merge H5).** "Gateway/MC mirror" is **REMOVED as an L2-CONFIRMED source** on auth's halt board (`ui/UI_SPEC.md` §5.2 + Lens-C3 record, `ui/build/halt_status_board.html`, `ui/build/MANIFEST.md` — all amended this session). Per `killswitch-chain.md` §4: **the Gateway's own confirmation, read DIRECTLY by auth, is the sole legitimate source of L2-CONFIRMED** (`source: Gateway direct`); an MC-relayed value may render only as STALE-UNKNOWN auxiliary context with mirror-age, never as CONFIRMED. auth remains the single L1 enforcement point; MC is trigger + read-mirror only (MC-btn ratification).

## 11. Open items recorded here (visible, deliberately NOT resolved in this session)

1. **Redis-sharing tension → root-review-#2.** The §1 budget middleware requires every RS to key budgets in "the one shared Redis," while DEPLOYMENT §3 declares that Redis auth-private (raised by Library's Stage-2 critic, finding F14; Notes/Chat/Drive inherit the identical contradiction). This is a **suite-topology decision** (which network reaches which Redis, or whether auth instead exposes a budget-check API so RSes never touch Redis directly) — not an auth-scope decision. **Parked for root-review-#2.** Until resolved, Wave-1 apps implement the budget middleware behind a seam that can bind to either transport.
2. **`HOLDER_ALLOWED_KINDS[board:approve]` reconciliation** (§9 carry-forward) — compiled-constant code change + redeploy; the Stage-5 opener item.
3. **Scope-constant additions** — `library:read/propose/curate/admin`, `notes:append`, `chat:manage` added; `chat:broadcast` retired in favor of `chat:manage`. Mechanical additive Stage-5 edit; non-enforcement (see §7 registration note).
4. **`op_id` replay-collapse on the kill-switch trigger** (§10) — additive Stage-5 wiring; safe without it.
