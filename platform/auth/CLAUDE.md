# CLAUDE.md — Identity Gateway (`auth`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to Auth. Run the 7-stage pipeline; this app is **Critical-infra**, so Stages 5 and 7 have teeth.

## Identity

Auth is **the identity layer for the whole suite** — the platform service where every principal, human operator and agent alike, is authenticated and authorized. Its defining decision: **agents are first-class users** with real identities, roles, scoped permissions, and budgets. Every other app's MCP-surface authz and every audit trail's "who did this" resolves back to here.

## Risk class: Critical-infra

## Its place in the segregation-of-duties chain

Auth is not one of the four action-holders (Board / CMDB / Vault / Gateway), but it is the substrate that makes segregation of duties *enforceable*: it is what lets those components know an agent is a scoped user who **cannot approve its own work** and **holds no credentials**. If identity is forgeable here, the whole four-holder property collapses — so it is Critical-infra.

## Agent surface (MCP)

- Authenticate and authorize.
- Agents present identity; scopes/roles/budgets constrain what each may request across the suite.

## Human surface (UI)

- Manage identities, roles, and budgets for both humans and agents.

## Key mechanics to build

- **Agents as first-class users** (§4): identity, roles, scoped permissions, budgets — not shared service accounts.
- **Scopes enforce least privilege** so each app's MCP authz (the Standard-tier requirement everywhere) resolves against one identity source.
- **Budgets** expressed as compute/time/concurrency (**not dollars**, §2), aligned with Mission Control's guardrails.
- Authoritative "who did this" for every app's audit log.

## Definition of done (Stage 7)

- Written proof identity cannot be forged or escalated: an agent cannot assume another principal or widen its own scope.
- Demonstrated: scoped permissions and budgets enforced across app MCP surfaces; agents cannot self-approve.
- Both surfaces manage the same principals over one shared state.
- Critical-infra security stage cannot exit on a light checklist (§8).

## SETTLED DECISIONS — do NOT reopen; design and build within these

> Durable record of the Stage-1/Stage-2 decisions. Full rationale + adversarial proof: `platform/auth/research/RESEARCH.md` and `platform/auth/planning/PLAN.md`. Treat 1–8 as fixed constraints, not open questions.

**Originally settled (Stage 2 inputs):**
1. **Adopt an existing self-hosted IdP** (OAuth 2.1 / OIDC); do **NOT** build bespoke. Finalist: **Keycloak ≥ 26.4 on Postgres**; fallback **Zitadel**. The finalist is **PROVISIONAL until the G1–G10 Build-spike passes against a real instance** — it could still promote Zitadel.
2. **Hybrid tokens:** short-TTL audience-bound JWTs validated **locally** on benign calls; a **LIVE revocation check** on the kill switch and **ALL** SoD-critical / destructive-execution paths.
3. **Fail-CLOSED on high-stakes paths;** operator **break-glass** exists; `auth` has an **HA target**.
4. **Per-resource audience-bound tokens** (Board / CMDB / Vault / Gateway); **`approve` and `execute` scopes are statically separable and NEVER co-issued to one principal.**

**Build sign-offs (operator-confirmed; robust option chosen):**
5. **SoD conflict-set is IMMUTABLE / compiled-in — NO runtime relax path.** Changing the four approve/execute conflict pairs is a **code change + redeploy**, never a runtime/break-glass operation. (Resolves the single-operator "two-person control" contradiction.)
6. **Non-exportable signing keys (TPM-sealed / HSM) are REQUIRED for any agent holding `gateway:execute`.** A soft-key executor is a **build NO-GO**. Do **not** lower this bar to admit more agents — instead **SCOPE the executor set to qualifying hardware**; if the intended host can't provide sealed keys in-container, change the **DEPLOYMENT, not the requirement**. Hardware capability is a Build-spike gate (**G1 / G5**), not an assumption.
7. **DPoP-first sender-constraining** (gate **G5** verifies Keycloak 26.4 DPoP GA); **mTLS is the verified fallback.**
8. **`auth` HA = active-active behind the proxy + replicated Postgres ledger BEFORE the security stage can clear.** SQLite is acceptable **only** during isolated early Build.

**UI/UX resolved calls (Stage 3; detail in `platform/auth/ui/UI_SPEC.md` §10.1):**
9. **G2 escalation color — APPROVED intensified-gold** (gold = the system's safe posture, red = the operator's finger). Build **MUST add a non-hue escalation cue** (motion / shape / size) so "more severe than G1" survives distance and reduced color discrimination — **do not rely on shade delta alone**. (UI_SPEC §10.1 #3)
10. **Audit export — BOTH formats:** Markdown-diffable-first (satisfies the markdown-is-truth invariant) **AND** signed JSONL in Build (tamper-evidence over the append-only safety-control log). (UI_SPEC §10.1 #9)
11. **`Shift+Esc` global halt-focus shortcut — APPROVED as Build default, but NOT validated.** Flagged for physical test on the actual target browsers/OSes in **Stage 7** (Chromium may capture `Shift+Esc`). Build must implement a **documented fallback chord that is not browser-captured**, selectable if the test fails. (UI_SPEC §10.1 #2)
12. **Halt dwell times (~600ms G1 / ~1000ms G2) — APPROVED as tunable Build defaults,** to be validated by touch under simulated stress at ~375px in **Stage 7** — not locked now. (UI_SPEC §10.1 #4)

**Cross-component:**
- The **forward-auth contract** lives in `platform/auth/planning/PLAN.md` **§8** (esp. **§8.10**). The **`proxy`** component consumes **§8 VERBATIM** — same header names, verify-endpoint shape, `2xx/401/302/403/5xx` semantics, and the **unconditional inbound header-scrub**. `proxy` must **not** paraphrase a parallel contract.
- **`auth` Build opens with the G1–G10 IdP bake-off spike;** the finalist is not locked until it passes.

**Stage 7 (Verification) — auth-specific:**
- **auth Stage 7 includes a HUMAN-IN-THE-LOOP step** — the operator personally attempts to halt the system under simulated pressure and confirms the controls (the `Shift+Esc` shortcut / fallback chord, the halt dwell times, and the honest post-action state) hold up. **This live operator drill is unique to `auth`** among the components; the kill-switch/halt UX cannot clear Stage 7 on an automated checklist alone.

**Build outcome (Stage 4; full report `platform/auth/BUILD.md`, IdP gates `platform/auth/build/PHASE0_IDP_BAKEOFF.md`):** built in Python (stdlib-first) — core API (sole writer) + thin MCP + static operator UI, **247 unit tests green** (1 EdDSA skip pending `cryptography`). IdP: **Keycloak provisional-CONFIRMED by docs**, Zitadel not promoted. The build is SQLite/in-process/HMAC-signer; the following carry forward.

**COUNTERSIGN + SCOPE-REGISTRATION SESSION (2026-07-02; docs/contract only — zero enforcement-code change; authority: `context/CONTRACTS/auth-apps-tokens-scopes.md` §7–§11):**
- **R7 closed:** `library` audience + slice (`library:read/propose/curate/admin`; admin human-kind-gated operator-only; `team` label = additive schema attribute) countersigned. Notes (4-scope, append-bias), Chat (`chat:post/read/manage`; `chat:broadcast` superseded), Drive rows all COUNTERSIGNED in the §3 ledger.
- **THE PIN:** holder-scope claim shape FROZEN in §8 — Vault + CMDB Stage-2 are UNBLOCKED and build against it verbatim.
- **Service principals registered (§9):** `svc:notes` + `svc:drive` (client-credentials, `board:read` only, non-holders) and `svc:tier-approver` (D-15 identity: `board:approve` HOLDER + reads, AUTO-tier-bounded, TPM-key + isolation + G5 mandatory).
- **R8 CONFIRMED / R9 RESOLVED (§10):** kill-epoch = auth-sole-writer, level-addressed trigger, strictly monotonic, write-before-ack; `op_id` replay-collapse pinned for Stage-5 wiring. Halt board's L2-CONFIRMED source is now `Gateway direct` (UI_SPEC/MANIFEST/halt_status_board amended); MC relay never CONFIRMED.
- **NEW Stage-5 items (add to the migration opener below):** (a) **`HOLDER_ALLOWED_KINDS[board:approve]` must add `service`** (and review dropping `agent` + break-glass admissibility) — compiled-constant change + redeploy per settled #5; until it lands `svc:tier-approver` is registered but non-activatable (safe direction); (b) additive scope constants (`library:*`, `notes:append`, `chat:manage`; retire `chat:broadcast`); (c) `op_id` collapse on the kill trigger. **Open item parked for root-review-#2:** the budget-middleware "one shared Redis" vs DEPLOYMENT §3 auth-private-Redis contradiction (§11) — suite-topology, not auth-scope.

**Stage 5 OPENS WITH THIS (precondition, NOT optional — decision #8):**
- **Migrate BEFORE any hardening:** `sqlite_store` → **Postgres**; in-process `memory_hot` → **replicated Redis** (pub/sub fan-out); single-node → **active-active HA**; **HMAC test-signer → EdDSA-prod**. All behind existing `Protocol` seams (config swap, not rewrite). **Harden the thing you will actually run, not the SQLite/in-process build.**

**MUST CLOSE ON A REAL HOST before "Keycloak confirmed" is unconditional** (commands in `PHASE0_IDP_BAKEOFF.md`):
- **G3 audience-mapper non-overlap** (Keycloak has **NO native RFC 8707**) — **HIGHEST RISK; run FIRST.** An un-mitigable NO-GO here **promotes Zitadel even post-build**.
- **G1** TPM non-exportable executor keys (hardware-dependent) and **G4** sub-second revoke + read-your-writes. `pip install cryptography` converts the EdDSA skip into a real test.

**STAGE-7 JOINT CHECKPOINTS (6; cross-ref `platform/proxy/BUILD.md`):** JC-1 real `/api/verify` vs `regression_headers.sh` · JC-2 traceparent-bound-to-`sub` · JC-3 DPoP/mTLS + proxy→auth mTLS · JC-4 kill-switch 403 + break-glass verify mode · JC-5 passkey on `auth.<SUITE_DOMAIN>` · JC-6 Board/CMDB PIP live fan-out.
- **JC-1 HARNESS ADAPTATION (spans BOTH runbooks — critical):** proxy's `regression_headers.sh` is **STUB-SPECIFIC** (asserts the literal `STUB.` token). Against real `auth` it MUST be adapted to **mint a real agent token** and assert a **structurally-valid JWT** (three base64url segments), not a string match — else the joint gate **fails spuriously or passes vacuously**. This adaptation belongs in the joint runbook.
