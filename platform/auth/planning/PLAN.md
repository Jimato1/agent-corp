# Stage 2 — Planning: `auth` (Identity Gateway, Critical-infra)

> **Status:** Stage-2 PLAN. This is a *plan*, not code — data model, surfaces, contracts, decision tables, sequencing. Every other app in the suite builds its MCP-surface authorization against this document. It is the single coherent design that weaves eight subsystem designs into one internally-consistent whole; where earlier Stage-1 research (`research/RESEARCH.md`) flagged "verify at build," those items are carried forward here as explicit build-spike / go-no-go gates (§10, and each section's carry-forwards), never silently resolved.
>
> **Primary source:** `research/RESEARCH.md` (cited by section, e.g. "R§5"). Shared context: `context/ARCHITECTURE.md` (SoD four holders, invariants) and `context/PROCESS.md` (Critical-infra rigor). Consumer spec: `platform/proxy/CLAUDE.md` (the forward-auth client — see §8).

---

## 1. Title, scope, and the four settled decisions that frame this plan

`auth` is **the identity layer for the whole suite** — the platform service where every principal (the single human operator and the ~dozens of local AI agents) is authenticated and authorized. Its defining decision (auth CLAUDE.md): **agents are first-class users** with real identities, roles, scoped permissions, and budgets — never shared service accounts. Every other app's MCP-surface authz and every audit trail's "who did this" resolves back here. `auth` is not one of the four SoD action-holders, but it is the **substrate that makes segregation of duties enforceable**: it is what lets Board/CMDB/Vault/Gateway know that an agent is a scoped user who cannot approve its own work and holds no downstream credentials. If identity is forgeable here, the four-holder property collapses — hence **Critical-infra**.

**Four settled decisions. This plan designs *within* them and does not reopen them:**

1. **Adopt an existing self-hosted IdP** (OAuth 2.1 / OIDC Authorization Server). No bespoke AS. Finalist is chosen among Keycloak / Zitadel / Authelia-shaped / Ory / Authentik via a build-spike go/no-go (§10). The chosen product is the **AS + principal store only** — it is *not* the PDP (Cedar), *not* the budget counter store (Redis), *not* the forward-auth verify endpoint (we write that). Those are separate `auth`-owned components the IdP merely *feeds*.
2. **Hybrid token model.** Short-TTL, audience-bound JWTs validated **locally** by each resource server (RS) on benign calls; a **live revocation check** (introspection *or* sub-second pushed denylist) on the kill switch and **all SoD-critical / destructive-execution paths**.
3. **Fail-closed on high-stakes paths; operator break-glass exists; `auth` has an HA target.**
4. **Per-resource audience-bound tokens** (Board / CMDB / Vault / Gateway are distinct audiences). **`approve` and `execute` scopes are statically separable and never co-issued to one principal.**

**Cross-cutting seams this plan resolves so the eight subsystems are one design, not eight essays:**
- **One scope taxonomy** (`app:capability`, §3–§5) used identically everywhere.
- **One token TTL band and claim set** (§4) referenced by every section.
- **One revocation mechanism** — a Redis pub/sub denylist on channel `auth:revocations` with a monotonic `epoch` heartbeat — shared identically by the revocation store, kill switch, PDP, and forward-auth (§4, §7, §8), **backed by a Redis-independent kill channel** (JWKS-`kid`-prune + kill epoch signed into JWKS/AS-metadata/forward-auth header) so the operator can STOP even with Redis down (§7.3).
- **One shared state** with the two sibling surfaces (MCP + UI) over a single Core API (§9) — the Stage-2 exit criterion.

---

## 2. Overview / architecture at a glance

```
                    ┌──────────── HUMAN OPERATOR (browser) ────────────┐
                    │                                                  │
   AGENTS (dozens, local) ──Bearer JWT──┐                    passkey/OIDC login
                    │                    │                             │
                    ▼                    ▼                             ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │  PROXY (Caddy/Traefik)  — forward-auth front door (§8)             │
        │  • unconditionally strips all client identity/trust headers        │
        │  • GET /api/verify → auth ; on 200 copies auth-set signed identity │
        └───────────────┬───────────────────────────────────┬───────────────┘
                        │ (per request)                      │ (upstream)
                        ▼                                     ▼
             ┌─────────────────────┐            ┌──────────────────────────────┐
             │   auth  (single AS) │            │  Every app = OAuth 2.1 RS     │
             │  Core API (§9):     │            │  • local PEP (Tier-1, §5)     │
             │  token/jwks/introspect│  ◄──PDP──│  • calls auth PDP (Tier-2)    │
             │  revoke/verify/PDP  │   decide   │  • enforces budgets per call  │
             └─────────┬───────────┘            └──────────────┬───────────────┘
                       │                                       │
     ┌─────────────────┼───────────────────────────────┐      │
     ▼                 ▼                                ▼      ▼
 DURABLE STORE     REDIS (hot, rebuildable index)   Cedar PDP + PIP
 principals/roles  • denylist + kill-switch flag     (stateless eval,
 scopes/SSD policy • budget counters (GCRA/semaphore) live facts from PIP)
 budget policy     • human sessions
 signing keys(pub) • pub/sub channel: auth:revocations (epoch heartbeat)
 audit log
```

- **`auth` is the single Authorization Server (AS).** Every other app (Board, CMDB, Vault, Gateway, and the Standard/Safe apps) is an OAuth 2.1 **Resource Server (RS)** that validates tokens locally against `auth`'s published JWKS and its own audience (R§Exec, R§2, MCP `2025-11-25`).
- **PEP + PDP two-tier authz** (§5): a fast, offline **local PEP** in every RS, and a central **PDP** `auth` owns for destructive / SoD-critical / budget-dependent decisions.
- **Redis** is the hot store for the denylist, the global kill-switch flag, budget counters, and human sessions — a **rebuildable index**, never the canonical store (root invariant). The durable `auth` store (SQLite-behind-interface, Postgres path) is authoritative; Redis is reconstructable from it.
- **Proxy forward-auth** is the coarse front door (§8); it is defense-in-depth, never the authorization boundary — each RS independently validates `aud`=self.

---

## 3. Identity data model — principals, scopes, roles

All identity state is **owned by `auth`** and lives in the one shared durable store (§9.0). There is exactly one principal per real actor; **agents are never pooled** (R§1: a shared secret collapses the "who did this" audit chain).

### 3.1 Principal types (`Principal`)

| Type | `kind` | Auth mechanism | Interactive? | Holds a signing key? | Example `sub` |
|---|---|---|---|---|---|
| Human operator | `human` | Auth Code + PKCE (S256); passkey/WebAuthn 1st factor, TOTP recovery (R§6) | Yes (SSO cookie) | No (uses IdP session) | `op:eide` |
| Agent service account | `agent` | client-credentials + per-agent **asymmetric** client auth; **no refresh token** (R§1, R§6) | No | **Yes** (its root credential) | `agent:patcher-07` |
| System/service principal | `service` | client-credentials, per-service key | No | Yes | `svc:gateway`, `svc:tier-approver`, `svc:rs-<app>` |
| Break-glass | `break_glass` | offline-held credential, HA/manual path (decision #3) | Operator-only | Yes, stored offline | `bg:operator-root` |

- **`agent_class`** (immutable, agents only): `executor` (the uniform "hands" pool) or `planner` (huddle roles — Scrum Master, Product Owner, specialists, Adversarial Reviewer). Maps ARCHITECTURE §6 onto identity; gates which roles are assignable (§3.4).
- **Stable `sub` namespace.** Every principal has one immutable `sub` identical across **all** per-audience tokens it ever receives (R Open-Q §12) — the authoritative "who did this." `client_id` may equal `sub` for client-credentials principals; both are recorded, disambiguated by `kind` (R§7 / Verify-at-build).

### 3.2 Scope naming convention — `app:capability`

Every scope is `"<app>:<capability>"`, lowercase, hyphenated. `app` is one of the eleven components (`board`, `notes`, `mc`, `drive`, `chat`, `pdf`, `gateway`, `vault`, `cmdb`, `auth`; `mc` = mission-control). **The `app` segment IS the RFC 8707 audience discriminator:** a scope is only honored in a token whose `aud` = that app's RS. This makes scope→audience mechanical and stops a Board scope ever being honored at the Gateway (R§2, R§5, R§6).

### 3.3 One scope taxonomy (canonical — used by every section)

`Tier` = 1 (coarse capability carried **in-token**, validated locally by the PEP) or 2 (call additionally hits the central PDP — destructive / budget / SoD-sensitive). **HOLDER** marks the four SoD holder scopes.

| Scope | App | Meaning (MCP tool surface) | Tier | Notes |
|---|---|---|---|---|
| `auth:authenticate` | auth | obtain a token | 1 | implicit floor for every principal |
| `auth:read-identity` | auth | read own (operator: others') identity | 1 | |
| `auth:manage-identity` | auth | create principals, assign roles, set budgets, manage keys | 2 | **operator-only; most sensitive scope in the suite** |
| `auth:introspect` | auth | RS/PDP token-validate / decision query | 2 | service principals only |
| `board:read` | board | read tickets/board | 1 | |
| `board:create` | board | file tickets | 1 | |
| `board:propose` | board | submit plan → `awaiting_approval` (records `proposer_id`) | 1 | maker side of maker-checker |
| `board:claim` | board | atomic claim (locks the real-world resource) | 2 | concurrency/WIP + host-lock at PDP |
| `board:update` | board | update ticket status/content | 1 | PDP only if a guarded transition (→ `awaiting_approval`) |
| `board:run-ceremony` | board | drive scrum/agentic-agile ceremony | 1 | planner agents |
| **`board:approve`** | board | approve an `awaiting_approval` ticket (records `approver_id`) | 2 | **HOLDER — approval authority** |
| `board:admin` | board | management console | 2 | human |
| `notes:read` / `notes:write` / `notes:search` | notes | external-memory read/write/FTS | 1 | `write` covers wikilinks/backlinks |
| `mc:report` | mc | status/heartbeat | 1 | agents |
| `mc:read` | mc | live agent view | 1 | |
| `mc:escalate` | mc | file escalation | 1 | agents |
| `mc:admin` | mc | WIP/budget controls | 2 | human |
| `mc:kill-switch` | mc | arm/trip the global kill switch | 2 | **human; bites physically at Gateway; never bundled by default** |
| `drive:read` / `drive:write` | drive | get/list / put artifacts | 1 | |
| `chat:read` / `chat:post` | chat | read feed / post notifications+escalations | 1 | |
| `chat:broadcast` | chat | operator broadcast | 2 | human |
| `pdf:render` / `pdf:view` | pdf | render note→PDF / view | 1 | Safe-class app |
| `cmdb:read` | cmdb | inventory read | 1 | |
| `cmdb:read-policy` | cmdb | query tier/window/in-window? | 1 | agents + Gateway |
| **`cmdb:write-policy`** | cmdb | manage fleet + policy (tier, window, auto-vs-ask) | 2 | **HOLDER — policy authority; operator only** |
| `vault:reference` | vault | reference a credential **by handle only, never plaintext** | 1 | the *only* Vault scope an agent may hold (ARCHITECTURE §4) |
| **`vault:read-credential`** | vault | redeem handle → **plaintext** (tool `vault.redeem_handle`) | 2 | **HOLDER — credential authority; machine scope for `svc:gateway` ONLY** |
| `vault:manage` | vault | manage secrets, rotation, access audit | 2 | human; disjoint from `read-credential` |
| `gateway:read` | gateway | execution monitor / per-command audit | 1 | |
| **`gateway:execute`** | gateway | `execute_approved_plan(ticket, host)` | 2 | **HOLDER — execution authority** |

> **Canonical naming note (seam resolved):** the credential-redemption holder scope is **`vault:read-credential`** everywhere in this plan; the MCP tool it gates is `vault.redeem_handle`. Handle-only reference (`vault:reference`) and operator administration (`vault:manage`) are three deliberately-disjoint scopes — this is what lets the operator administer Vault without ever holding the machine credential-redemption capability.

### 3.4 Role catalog (`Role`, with hierarchy)

Principals get **roles**, not raw scopes (RBAC, INCITS 359). Roles nest (`RoleHierarchy`); the SSD check (§3.5) always runs over the **inherited/effective** closure.

**Agent roles** (assignable only to `kind=agent`):

| Role | Inherits | Adds | Holder scopes | `agent_class` gate |
|---|---|---|---|---|
| `role:agent-base` | — | `auth:authenticate`, `board:read/create/propose/claim/update`, `notes:*`, `drive:read/write`, `chat:read/post`, `mc:report/escalate`, `cmdb:read`, `cmdb:read-policy`, `pdf:render/view`, `vault:reference` | **none** | any |
| `role:agent-planner` | `role:agent-base` | `board:run-ceremony` | **none** | `planner` |
| `role:agent-executor` | `role:agent-base` | `gateway:execute` | `gateway:execute` | `executor` |

**Human roles** (`kind=human`):

| Role | Scopes (highlights) | Holder scopes held |
|---|---|---|
| `role:operator` | `auth:manage-identity`, `mc:admin`, `mc:kill-switch`, `board:approve`, `board:admin`, `cmdb:write-policy`, `cmdb:read-policy`, `vault:manage`, `chat:broadcast`, `gateway:read`, all Tier-1 reads | `board:approve` + `cmdb:write-policy` |
| `role:operator-approver` (optional split) | `board:approve`, `board:read` | `board:approve` |

**System/service roles** (`kind=service` / `break_glass`):

| Role | Scopes | Holder scopes |
|---|---|---|
| `role:svc-gateway` | `vault:read-credential`, `board:read`, `cmdb:read-policy`, `gateway:read` | `vault:read-credential` — **and nothing else** (notably **not** `gateway:execute`: the Gateway responds to calls, it does not originate them) |
| `role:svc-tier-approver` | `board:approve`, `board:read`, `cmdb:read-policy` | `board:approve` — **auto-approval bounded to AUTO-tier (low-risk, reversible) work ONLY** (see below) |
| `role:svc-rs-<app>` (per app) | `auth:introspect` | none |
| `role:break-glass` | operator **control-plane superset for the STOP + RESTORE directions ONLY** — `auth:manage-identity`, `mc:kill-switch`, `board:approve`, `cmdb:write-policy` (the allowed governance ○ pair), revoke / disable / re-enable / restore-approver-seat — **explicitly and permanently NEVER `gateway:execute` or `vault:read-credential`** | `board:approve` + `cmdb:write-policy` (allowed ○ pair only) — **holds NO action-side holder scope**; grantable only to a `kind=break_glass` principal (§3.5) |

The operator legitimately holds `board:approve` **and** `cmdb:write-policy` (both governance) but **never** `gateway:execute` or `vault:read-credential`.

> **Break-glass holds no execution authority (red-team finding 5a/A, corrected).** `role:break-glass` is restricted to the **stop** and **restore** control-plane directions; it can never itself execute or redeem a credential. Emergency real-world remediation is therefore **not** a break-glass superpower: break-glass restores a normal approver seat and/or re-enables an executor agent, and execution still traverses a **distinct** approver (Board `proposer_id != approver_id`) plus the independent Gateway (Board + CMDB + Vault) chain. This deletes the earlier claim that break-glass "cannot approve-plus-execute as one act" was merely *procedurally* guaranteed — it is now **structurally** guaranteed, because break-glass holds no action-side holder scope at all (§3.5, §7.7).

> **`svc:tier-approver` is bounded (red-team finding 4d).** Auto-approval by `svc:tier-approver` is **impossible for any `destructive-exec` / high-tier ticket** — those tiers are structurally never auto-approvable and always require a human four-eyes approval. `svc:tier-approver` provably holds `board:approve` + reads only, with **no path to widen** (SSD + kind-gating). Because an executor agent legitimately holds both `board:propose` and `gateway:execute`, without this bound an executor could propose auto-tier work, have the bot rubber-stamp it, and execute — a full propose→approve→execute cycle with no human; confining auto-approval to low-risk reversible tiers closes that.

> **Holder-credential trust-domain invariant (red-team finding 4d).** Any principal holding *any* holder scope (`operator`, `svc:tier-approver`, `svc:gateway`, `kind=break_glass`) **MUST run in an isolated trust domain with no executor-agent code execution, and its signing key MUST be unreachable by any agent process.** It is a deployment-time invariant (paired with "exactly one Principal per real actor", §3.7) that `svc:tier-approver`'s or the operator's `board:approve`-holding signing key is **never** provisioned on a host that also runs executor-agent code — otherwise one host would hold two identities that together span approve+execute, defeating SoD at the trust-boundary level even though no single *principal* spans it.

### 3.5 Static Separation of Duty — the load-bearing SSD mechanism

This is **SSD, not DSD** (R§5): an autonomous agent controls its own session activation, so "not simultaneously active" (DSD) is insufficient — the conflicting capability must be **impossible to hold**.

**The four holder ConflictPairs are an IMMUTABLE, hardcoded invariant of `auth` — NOT an editable policy row (red-team finding 4a/A).** In a single-operator homelab, "operator-only" == "single-actor", so if the approve-XOR-execute pairs were an ordinary operator-editable policy row a single operator (or one compromised operator credential) could delete the `{board:approve, gateway:execute}` pair and self-grant both — unilaterally collapsing SoD and violating ARCHITECTURE's "no single component can unilaterally cause a real-world destructive action." Therefore: the four holder pairings (every ● below) and their mirrored Cedar `forbid` are **compiled-in constants**. The normal admin/Core API **cannot delete, weaken, widen the cardinality of, or disable** any holder ConflictPair or its Cedar `forbid`; such a change is impossible online. If it must ever change at all, it is gated behind the **offline break-glass factor AND a two-person control**, audited and broadcast exactly like break-glass. (The single ○ governance pair is a hardcoded *allowance*, likewise not silently editable into a ●-relaxation.) **Stage-7 conformance:** the admin API provably refuses to delete/weaken any holder ConflictPair, and the Cedar `forbid` for the four holders cannot be removed by any online operator action.

**Conflict definition** — the four holder scopes split into an authorization side `A = {board:approve, cmdb:write-policy}` and an action side `X = {gateway:execute, vault:read-credential}`. Modeled as one named `ConflictSet` (`sod-holders`) of five `ConflictPair` relations, each cardinality `n=1` (at most one of the pair per principal). These five relations are **immutable code**, not mutable rows:

| ● = mutually exclusive | `board:approve` | `cmdb:write-policy` | `vault:read-credential` | `gateway:execute` |
|---|:---:|:---:|:---:|:---:|
| **`board:approve`** | — | ○ | ● | ● **(decision #4)** |
| **`cmdb:write-policy`** | ○ | — | ● | ● |
| **`vault:read-credential`** | ● | ● | — | ● |
| **`gateway:execute`** | ● | ● | ● | — |

The single ○ (`board:approve` + `cmdb:write-policy`) is deliberately allowed — both are human governance and the operator must set auto-approve tier policy *and* approve. Every other pairing breaks the chain.

**Enforcement point & algorithm** — enforced **at grant/assignment time** inside `auth`, on any mutation that could widen authority (`PrincipalRoleAssignment` insert, `RoleScopeGrant` insert, `RoleHierarchy` edge insert):

```
On proposed mutation M:
  0. AFFECTED(M) = the COMPLETE set of principals whose EFFECTIVE set M could change:
        - PrincipalRoleAssignment insert  → { the named principal }
        - RoleScopeGrant insert (on role R)→ downward transitive closure of R:
                                             EVERY principal transitively assigned R
        - RoleHierarchy edge insert (R→R') → downward transitive closure of the CHILD
                                             side: every principal that now inherits R'
     (An empty-role staged today + a hierarchy edge tomorrow MUST re-trigger this fan-out;
      evaluating only the mutation's immediate endpoints or a single named principal is a bug.)
  For EACH principal P in AFFECTED(M):
    1. EFFECTIVE(P) = union over P's roles of the TRANSITIVE closure of
       RoleScopeGrant through RoleHierarchy   (computed POST-M).
    2. HOLDERS(P)  = EFFECTIVE(P) ∩ { the 4 holder scopes }.
    3. For each immutable ConflictPair (s_i, s_j) in 'sod-holders':
          if {s_i, s_j} ⊆ HOLDERS(P)  →  REJECT M atomically (whole mutation, all principals).
  4. If NO affected principal would hold any ConflictPair → COMMIT. Else REJECT atomically.
```

Key properties: computed over the **inherited/effective** set (a conflict two levels down a role tree is caught); the affected set is the **full downward transitive closure** of the mutated role, not the mutation's immediate target — the "create an empty role that inherits `board:approve`, then add a hierarchy edge from `role:agent-executor`" staging attack is caught at the *edge insert*, because that edge's affected set is every executor (finding 4e/A). Rejection is atomic at write time so **no token minter ever sees a principal holding a conflicting pair** — the conflict cannot exist at issuance because it cannot exist at rest.

**Grant-time decision table:**

| Principal already effectively holds | Proposed grant adds | Result |
|---|---|---|
| `gateway:execute` (executor agent) | `board:approve` | **REJECT** (approve ⊕ execute) |
| `gateway:execute` | `vault:read-credential` | **REJECT** |
| `board:approve` + `cmdb:write-policy` (operator) | `gateway:execute` | **REJECT** |
| `board:approve` + `cmdb:write-policy` (operator) | `vault:read-credential` | **REJECT** |
| `vault:read-credential` (`svc:gateway`) | `gateway:execute` | **REJECT** |
| `board:approve` (operator) | `cmdb:write-policy` | **ALLOW** (both governance) |
| `role:agent-base` agent | `role:agent-executor` | **ALLOW** (adds only `gateway:execute`) |
| `kind=agent` | any role containing `vault:read-credential` | **REJECT** (also blocked by kind-gating) |

**Five layered guarantees that make approve+execute structurally unco-issuable** (defense in depth — no single one is load-bearing alone):
1. **Assignment invariant (primary):** no single principal can *hold* both at rest → can mint neither one bundled token nor two separate single-audience tokens (it never holds the second scope either). This is the correction from R§5 that audience-binding alone is *not* the SoD control. Enforced over the **full affected-set fan-out** above.
2. **Kind-gating (secondary):** holder scopes are reachable only through kind-restricted roles (`gateway:execute` via `executor` agent roles; `vault:read-credential` via `service` roles only).
3. **Cedar `forbid` guardrail (tertiary, mirrored at each PDP):** the same immutable conflict set as a store-wide Cedar `forbid` (`forbid` overrides `permit`), denying a hypothetical mis-issued dual-scoped token at use. It also **continuously reconciles any IdP drift**: even if a holder scope reached a token through some uninterposed path, the PDP `forbid` denies it at every use. **Must be unit-tested** — Cedar ships no first-party SoD example (R§5, R§7).
4. **Core API is the SOLE holder-scope grant authority (red-team finding 4c/A):** the four holder scopes reach a token **only** through a §3.5-checked Core API grant. Direct role / client-scope assignment for any holder scope in the chosen IdP's own admin console + admin REST API is **locked down / disabled** (service-account credentials restricted; that admin surface not exposed to operators for these mutations). This closes the second, uninterposed grant path — a holder scope assigned directly in the IdP is either prevented at the IdP or denied at every PDP by guarantee 3, and a reconciliation guardrail continuously detects IdP drift. Gate **G7** is elevated to prove there is **NO** alternative uninterposed grant path, not merely that one interposition point exists.
5. **Token-exchange interposition (red-team findings 4b/A, 5d):** RFC 8693 token exchange is **disabled by default**. If ever enabled, the exchange endpoint MUST run the *resulting effective holder-scope set* (subject scopes ∪ actor scopes ∪ requested scopes) through this same §3.5 ConflictSet check and reject any exchange that would produce — or delegate to an actor that would produce — a token spanning any holder ConflictPair, widen scope beyond the subject's effective grant, or target a holder audience the subject may not itself reach. Simplest safe default (adopted): **RFC 8693 may never emit or delegate ANY of the four holder scopes at all**, and `act`/`may_act` depth is bounded to 1. See §5.4, §10 (G7).

**Break-glass is NOT a carve-out from this invariant (corrected, red-team findings 5a/A, 4f/A).** Because `role:break-glass` now holds only the allowed governance ○ pair plus stop/restore control-plane scopes and **no action-side holder scope** (§3.4), it does **not** hold a conflicting pair — so the SSD invariant has **no exception** and `role:break-glass` passes §3.5 like any governance role. `kind=break_glass` remains special only for *provenance*, and is hardened:
- **`Principal.kind` is immutable after creation** (like `agent_class` and `sub`). An operator cannot flip an existing agent/service principal to `kind=break_glass`.
- **A `kind=break_glass` principal can NEVER be issued a normal online access token** — it obtains authority *only* via the offline break-glass factor (§7.7). This closes the finding-4f path where a break_glass principal authenticates online and wields its powers through the ordinary token/PDP path, dodging the offline/one-time/broadcast controls.
- **Creating or assigning any `kind=break_glass` principal is itself gated behind the break-glass / two-person control**, with mandatory append-only out-of-band audit + Chat broadcast.

**Per-ticket four-eyes — Board is the enforcing owner, PDP is a tested backstop (red-team finding 5c/A).** `auth` owns *static* holder separation. For the *instance-level* `proposer_id != approver_id` check, the **Board is the authoritative enforcing owner** against `auth`'s canonical `sub`; the **`auth` PDP independently re-evaluates `sub != proposer_id` as defense-in-depth**, using the Board-supplied `proposer_id` via the PIP. **A permit from one is not sufficient if the other denies** — both must permit. This deliberately replaces "single owner avoids ambiguity" with "two independent enforcers, neither sufficient alone," so the check can never fall into a no-owner gap between the Board team and the PDP team. **Stage-7:** both the Board and the PDP independently reject `sub == proposer_id`, and disabling either still yields a deny.

### 3.6 Per-agent signing-key lifecycle (`AgentKey`)

R§1's load-bearing correction: the per-agent **private signing key is the true root credential**; short token TTL does **not** mitigate a stolen key. `auth` stores **only the public half** (published via JWKS for client-assertion validation); the private key **never transits `auth`**.

- **Issuance:** the agent **generates its keypair locally**; the private key is written to its chosen storage and never leaves the host; the public JWK is registered under a new `kid`. Grant/assertion shape is **pinned per chosen IdP** (Keycloak = `private_key_jwt` client-auth *with* `client_credentials`; Zitadel = `jwt-bearer` grant — not portable, §10).
- **Storage options** (declared per key, weakest→strongest): file (0600) → OS keystore (DPAPI/Keychain/keyring) → **TPM/HSM non-exportable** → SPIFFE/SPIRE SVID (**deferred**, over-scaled for one operator).
- **MANDATORY hardware-bound storage for any holder/destructive principal (red-team finding 1a/A).** For **any principal whose effective scope closure contains a holder or destructive scope** — `gateway:execute` (executor agents) and `svc:gateway`'s `vault:read-credential` — the signing key **MUST** be **hardware-bound / non-exportable (TPM-sealed or HSM, key marked non-exportable)**. A soft-key (file, or exportable OS-keystore) executor/holder is a **build-spike NO-GO, not a permitted configuration** — because R§1's own correction is that short TTL does *not* mitigate a stolen key, and a non-exportable key that *cannot leave the host at all* is the one control that does. This is an **assignment-time invariant** (§3.7): `auth` refuses to activate a holder/destructive role on a principal whose registered `AgentKey` is not attested non-exportable. (Weaker storage tiers remain permitted only for pure read/planner agents that hold no holder scope.)
- **DPoP / mTLS proof key co-location (red-team finding 1c/A).** The DPoP proof key (`cnf.jkt`) or mTLS client-cert private key of a holder/destructive principal **MUST reside in the SAME non-exportable store** as its client-assertion key, so it too cannot be exfiltrated by a host-rooting attacker. Sender-constraining stops network interception/replay, **not** a rogue holder of the host — so the proof key is worthless as containment unless it is itself unexfiltratable (§4.5).
- **Mint-origin binding (red-team finding 1b/A).** Every token mint at `/token` is **bound to an expected origin** where feasible — an mTLS client cert from the agent host, or a DPoP key attested to the host TPM — so an **off-host mint** (the attacker replaying a stolen key from their own machine) is *detectable and refusable*, not silently valid.
- **Mint-anomaly auto-freeze (red-team finding 1b/A).** `auth`'s `/token` endpoint runs an automated **mint-abuse detector**: a per-agent baseline of mint rate + expected source/host, plus a hard cap on mints-per-interval. On anomaly (mint-rate spike, new origin, off-host mint) it **trips `freeze-destructive` (G1) and/or auto-revokes the client key — in the SAFE (stopping) direction only** (reusing the §7.8 "automated guardrails may trigger only toward less real-world action" mechanism). This is the missing *detection* lever: without it, a stolen key can quietly re-mint fresh 2-min tokens indefinitely until a human happens to notice. Owner + Redis keys + Stage-7 test specified in §7.8 / §11.
- **Rotation:** overlapping-validity — register new `kid` (`active`), old `kid` → `rotating`, agent switches, old `kid` → `revoked` after the overlap window (≥ max token TTL).
- **Revocation (rogue-agent kill at the key layer, §7):** (1) `AgentKey.status → revoked` + remove JWK → cannot authenticate to mint new tokens; (2) `Principal.status → disabled` → immediate authn revocation (R§6); (3) for already-minted live tokens, push `sub`/`jti` to the denylist (§4). Steps 1+3 are mandatory — short TTL alone does not cover a stolen key. **Read-your-writes at the mint path (red-team finding 1d/A):** the `/token` endpoint's client-enabled / `AgentKey.status` / JWK-present check MUST be **strongly consistent** — either a read-your-writes read against the authoritative writer, or a pushed sub-second key-revocation denylist on the same `auth:revocations` epoch mechanism the RSes consult — with an explicit staleness bound and **fail-closed if the mint path cannot confirm the current epoch**. This guarantees that "disable the agent" blocks new mints **sub-second across ALL `auth` replicas, including under writer failover / read-replica lag** (Gate **G4**), so a compromised key cannot keep minting during replication lag.

### 3.7 Persisted entities (conceptual — no DDL)

`Principal`, `Scope`, `Role`, `RoleScopeGrant`, `RoleHierarchy` (DAG), `PrincipalRoleAssignment` (every insert triggers the §3.5 SSD check), `ConflictSet`/`ConflictPair`, `BudgetPolicy` (§6), `AgentKey` (public key only). Storage = `auth`-owned SQLite-behind-an-interface with a documented Postgres migration path, **load-tested for single-writer throughput under agent fan-out** before commit (R§7, R§8, Verify-at-build). Model invariants (all Stage-7 testable): exactly the four holder scopes have `is_holder=true`; the four holder ConflictPairs and their Cedar `forbid` are **immutable/hardcoded** (§3.5, finding 4a); no agent-assignable role's effective closure contains a holder scope other than (never) `gateway:execute` for executors; every widening mutation passes §3.5 (over the **full downward-transitive affected set**) or is rejected atomically; `AgentKey` stores no private material; **any principal whose effective closure contains a holder/destructive scope has a `AgentKey` attested non-exportable (hardware-bound)** (finding 1a); `Principal.kind` and `agent_class` and `sub` are immutable after creation (finding 4f); a `kind=break_glass` principal is never issuable a normal online token (finding 4f); exactly one `Principal` per real actor **and** one holder-credential per isolated trust boundary (finding 4d).

---

## 4. Token model + revocation store

### 4.1 Token artifacts

| # | Token | Principal | Origin | Format | Sender-constrained |
|---|---|---|---|---|---|
| T1 | **Agent access token** | one agent | `client_credentials` + per-agent asymmetric client auth; **no refresh token** — re-mint on expiry | RFC 9068 `at+jwt`, asymmetric-signed (ES256/EdDSA) | **Yes** — DPoP (`cnf.jkt`) default; mTLS (`cnf.x5t#S256`) optional |
| T2 | **Human access token** | operator | Auth Code + PKCE (S256), silently renewed from SSO session | RFC 9068 `at+jwt` | not required v1 (browser-origin bound) |
| T3 | **Human SSO session cookie** | operator | IdP login; apex-domain scoped for cross-subdomain SSO | opaque → server-side session record (stateful, Redis-backed) | inherently live (server-side lookup) |
| T4 | **Client-auth assertion** | agent → `auth` only | per-agent private-key JWT (RFC 7523), grant shape pinned per IdP | short-lived one-time JWT | n/a |

The **real long-lived root credential is T4's private signing key**, not any access token (R§1) — see §3.6.

### 4.2 One TTL band (canonical — referenced everywhere)

| Token | Default | Band | Rationale |
|---|---|---|---|
| **T1 agent access** | **2 min** | 1–5 min, per-audience overridable | bounds the fast-path staleness window; short enough that a *network-intercepted* leak (without the key) is near-useless; long enough to avoid re-mint storms. **NB (finding 1c/A): short TTL does NOT contain a host/key compromise** — a rooted host yields the signing key, which re-mints fresh 2-min tokens at will; only the non-exportable key + key-revocation + mint-anomaly freeze contain that (§3.6). |
| **T2 human access** | **5 min** | 5–10 min | Keycloak reference default; silently renewed |
| **T3 SSO idle** | **30 min** | 15–60 min | primary human-session revocation lever |
| **T3 SSO max** | **8 h** | 8–10 h | daily re-auth cap |
| **Introspection cache (destructive paths)** | **0 — no cache** | — | RFC 7662; destructive paths never cache |
| **Denylist entry retention** | until `token.exp` + skew | — | `jti` GC'd once expired; `sub`-`revoked_before` retained until re-provision |

**Accepted risk:** on benign fast-path reads a revoked agent can still act for ≤ T1 TTL (≤ 2 min). Accepted because benign reads are reversible, all SoD-critical/destructive paths are live-checked regardless of TTL, and break-glass AS-key rotation kills even fast-path tokens suite-wide — **provided every RS rejects any token whose `kid` is not in the currently-served JWKS and polls JWKS on a bounded cadence (≤ 30 s) + on any signature failure** (§5.1, §7.5), so the retire-a-`kid` kill is Redis-independent (finding 2a/A).

### 4.3 One claim set (RFC 9068 `at+jwt`)

`iss` (RS **MUST** verify == the single `auth` issuer; **RFC 9207** issuer-identification adopted **now** per the MCP `2026-07-28` RC), `sub` (stable, audit-canonical, MAY == `client_id`), `client_id` (agent; key for client/key-level revocation), `aud` (**exactly one** resource; RS MUST verify == self), `scope` (coarse capability only — the tool *surface*; no fine-grained/SoD/budget facts), `exp`/`iat` (`iat` compared vs `sub` `revoked_before`), `jti` (surgical single-token revocation key), `cnf` (agent: DPoP `jkt` / mTLS `x5t#S256`), `auth_time` (human: step-up), header `kid` (AS signing key — enables mass/global revocation via rotation). A W3C `traceparent` is propagated alongside (not a JWT claim) for audit correlation — but the **authoritative** `traceparent` is **server-generated by the proxy/`auth` and bound to the validated `sub`**; any client-supplied `traceparent` is untrusted and recorded only as `claimed_parent` (§8.7, finding 5f). Static budget limits **MAY** ride as custom claims for coarse pre-checks, but **live counters are never in the token** (§6).

### 4.4 Audience binding

One token, one `aud` (decision #4, RFC 8707). An agent orchestrating a destructive action across the four holders acquires **separately-audienced tokens** (§5.4) — never one token valid at multiple holders. Per-app audience is the on-the-wire anti-replay boundary (a Board token is rejected at the Gateway), but audience alone is **not** the SoD control (§3.5). **IdP reality (build-spike, §10):** Keycloak has **no native RFC 8707** as of v26 — correct `aud` is injected via **audience protocol-mappers + client scopes**, scoped so audiences **never overlap**; this becomes the actual per-app SoD enforcement plumbing.

### 4.5 Sender-constraining

**DPoP (RFC 9449) for agents (T1) as the v1 default** — `cnf.jkt`, GA in Keycloak 26.4, no proxy cert-forwarding coupling. mTLS cert-bound (RFC 8705, `cnf.x5t#S256`) optional; if chosen, the **proxy MUST forward the verified client-cert thumbprint** to both `auth` and the RS (§8.2), else the binding silently breaks.

**What sender-constraining does and does NOT do (corrected, finding 1c/A).** DPoP/mTLS stops **network interception and replay** of a leaked token — it is **not** a revocation-freshness substitute and, critically, **does NOT contain a host/key compromise**: a rooted host yields both the token *and* the proof key, so the attacker presents perfectly valid DPoP/mTLS-bound tokens from their own machine. Only the **non-exportable key** (proof key co-located in the same TPM/HSM store, §3.6) + **key-revocation** + **mint-origin binding** contain a rogue host holder. Consequently:

- **Sender-constraining is MANDATORY end-to-end for executor / destructive principals** — it is a **NO-GO gate (G5), not deferred hardening**, for any principal holding a holder/destructive scope. G5 deferral (short-TTL + pushed `jti` denylist as v1 anti-theft) is permissible **only** for read-only / planner agents that hold **no** holder scope.

### 4.6 Revocation store — the live denylist (shared mechanism)

The revocation store is `auth`'s authoritative record of which unexpired tokens/principals/keys must be denied, plus the push machinery that makes a revoke visible suite-wide sub-second. **This is the single mechanism the kill switch (§7), PDP (§5), and forward-auth (§8) all consult — described once here.**

**Three granularities:**

| Granularity | Key | Revokes | RS check |
|---|---|---|---|
| Surgical | `jti` | one specific token | `jti ∈ denylist` → deny |
| Principal (agent kill) | `sub` + `revoked_before` epoch | all of a principal's tokens issued before T | `token.iat < revoked_before[sub]` → deny |
| Client/key | `client_id` (and `kid` for AS-key compromise) | ability to mint new tokens; all tokens under a rotated-out `kid` | disabled `client_id` blocks re-mint; retired `kid` fails signature/kid-current check |

**Propagation — pushed denylist (primary) + introspection (highest-assurance fallback):**
- **Primary = Redis pub/sub.** `auth` publishes every revocation to channel **`auth:revocations`** and updates a Redis snapshot; each RS subscribes and maintains an **in-memory denylist cache**. Every message and authoritative key carries a monotonic **`epoch`**. Freshness SLO: **p99 < 500 ms, < 1 s suite-wide** from operator action to all-RS denial on live-check paths.
- **Cold-start/resync:** on startup or after a dropped subscription an RS pulls a full snapshot (active entries whose `exp` is still future) before serving any destructive decision, then follows deltas. No revocation is missed across an RS restart.
- **Staleness guard (fail-closed):** `auth` bumps a `denylist:heartbeat = {epoch, ts}` on a fixed cadence (~500 ms). If an RS has not confirmed the current epoch within its staleness bound, its **destructive path fails closed** (deny) or falls back to synchronous introspection; benign paths are unaffected.
- **Synchronous introspection (RFC 7662, uncached)** is retained as an *additional* consult on the two most destructive paths (**Gateway execute**, **Vault redeem**) — a per-call `auth` dependency exactly where blast radius is maximal (fail-closed, decision #3; and `auth` is never the sole physical stop — §7).
- **Introspection is fail-CLOSED against its own dependency loss (red-team finding 2c/A — SoD/escalation break).** The `/introspect` (and forward-auth verify) endpoint **MUST NOT** ever return `active:true` from **signature-and-`exp` validity alone** when it cannot consult authoritative revocation state. Whenever `auth` cannot successfully read authoritative revocation state it MUST return **`active:false`** (or 5xx). To turn "Redis down ⇒ destructive bricks" into "Redis down ⇒ destructive **degraded-but-correct**," the **durable revocation mirror (§9.0) is wired as `auth`'s authoritative fallback read source** for introspection, so a *revoked* token still introspects as `active:false` even with Redis unreachable. The SQLite/durable read load this adds **must be load-tested** (§10, G4). Stage-7: revoked token + `auth`'s Redis unreachable ⇒ introspect denies.

**Write-before-ack ordering for revoke/kill (red-team finding 3d/A).** A `revoke`/kill mutation is **acknowledged to the operator ONLY AFTER** both the durable ledger append **and** the authoritative Redis SET have committed. This guarantees every subsequent authoritative-read live check (Gateway execute, Vault redeem, and — see §4.7 — `board:approve`/`cmdb:write-policy`) observes the revocation; there is no window where an ack precedes commit.

**Persistence:** canonical record = `auth`'s durable store (append-only audit line is the truth) — this same durable store is the **fallback read source for introspection under Redis loss** (above). Redis is the rebuildable hot index (AOF `everysec` so the denylist survives a restart, but correctness never *depends* on Redis persistence — an RS resyncs from `auth`). GC: `jti` on `exp`; `revoked_before[sub]`/disabled `client_id` until operator re-enable.

### 4.7 DECISION TABLE — call-path class → enforcement (fast path vs live check)

Each app declares, in a per-app **risk manifest** (contract deliverable, §8/§5), which tools are *benign-read* / *standard-write* / *SoD-critical-destructive*. Default for anything unclassified = **live-check, fail-closed**.

| Call-path class | Canonical example | `aud` | Scope | Enforcement | Revocation consult | Fail mode |
|---|---|---|---|---|---|---|
| **Generic benign read** | list tickets; read note; CMDB policy-read/in-window | that app | `*:read`, `cmdb:read-policy` | **LOCAL JWT fast path** (sig/`iss`/`aud`/`exp`/scope/`cnf`) | **None** (staleness ≤ TTL, accepted) | fail-closed on invalid token |
| **Standard write (reversible)** | Board `propose`; note write | app | `board:propose`, `notes:write` | LOCAL fast path + audit `sub`/`jti` | None (downstream-gated) | fail-closed on invalid token |
| **Board — `approve`** | approve a ticket (four-eyes) | `board` | `board:approve` | **LIVE revocation check** | **authoritative Redis read** (`jti`+`sub`+`kid`), not the RS cache — closes the sub-second approver-revocation window (finding 3d) | **Fail-closed;** Board enforces `proposer_id != approver_id`, PDP re-checks as backstop (§3.5) |
| **CMDB — `write-policy`** | change tier/window/auto-vs-ask | `cmdb` | `cmdb:write-policy` | **LIVE revocation check** | **authoritative Redis read** (no downstream authoritative catch exists for policy writes, so it reads authoritative directly, finding 3d) | **Fail-closed** |
| **Gateway — `execute`** | `execute_approved_plan(ticket, host)` | `gateway` | `gateway:execute` | **LIVE + synchronous introspection**; **approval is SINGLE-USE** (obligation `consume_approval`, §5.3) | pushed denylist **AND** uncached `/introspect` (fail-closed on its own Redis loss, §4.6) | **Fail-closed;** physical kill-switch bites here (§7) |
| **Vault — `redeem`** | `vault.redeem_handle` → plaintext (**Gateway only**) | `vault` | `vault:read-credential` | **LIVE + synchronous introspection** | pushed denylist **AND** uncached `/introspect` | **Fail-closed** (maximal blast radius) |
| **Kill-switch actuation** | operator disables agent / global / break-glass | `auth`/`mc` (step-up) | `mc:kill-switch` / operator | **LIVE at `auth`** — writes `revoked_before[sub]` / disables `client_id` / rotates AS `kid`; publishes to `auth:revocations` | write path (source of truth) | fail-closed; break-glass = AS-key rotation nukes all tokens |
| **Human UI — benign read** | operator views a board | cookie T3 | session | **Live** (server-side session lookup) | session store | fail-closed on absent/expired session |
| **Human UI — high-stakes** | operator approves in MC; edits budgets; break-glass | T3 + T2 | session + operator | **Live** session + **step-up** (fresh `auth_time`) | session store + denylist | fail-closed; CSRF-protected |

The fast path exists *only* for reversible, non-destructive reads/writes where max exposure is one TTL; the moment a call is a holder's authority or the kill switch, it is live-checked and fail-closed. The two paths that release real-world power (`execute`, `redeem`) additionally take the per-call introspection dependency.

---

## 5. Authorization model — local PEP + central PDP

Two tiers, one identity source (R§2):

| Tier | Where | Decides | Cost | Freshness |
|---|---|---|---|---|
| **Tier 1 — PEP (fast)** | inline in every RS's MCP/API layer | valid, unexpired, audience-correct token carrying the coarse scope for this tool *surface*? | µs, offline (JWKS cached) | ≤ token TTL |
| **Tier 2 — PDP (gated)** | `auth`-owned central decision API | for a concrete `(principal, action, resource, context)`: permitted right now? (destructive / SoD / budget) | one call + live revocation | live |

**Invariant:** scopes answer only "which tool *surface*"; every fine-grained/SoD/budget fact is *out* of the token and resolved at the PDP against one live source. The PDP is `auth`'s **Cedar** evaluator (Apache-2.0, embeddable, stateless, `forbid` overrides `permit`) fronted by a decision API, backed by a **PIP** supplying live entities Cedar is stateless about — budget/cooldown counters (Redis), cross-app facts (ticket `proposer_id`, CMDB tier/window), revocation state.

### 5.1 PEP decision sequence (every RS, per call; fail at first failure)

1. Bearer present & well-formed (`at+jwt` — SHOULD not MUST). 2. Signature vs `auth` JWKS (respect `kid`, refresh unknown-`kid` with backoff) — **AND reject any token whose `kid` is NOT present in the currently-served JWKS** (Redis-independent global kill, finding 2a): the RS **polls JWKS on a bounded cadence (≤ 30 s) and on any signature failure**, so removing a `kid` from `auth`'s JWKS (served over HTTP, not Redis) invalidates all old-`kid` tokens within the poll window even with Redis down. 3. `iss` == the single `auth` issuer (RFC 9207). 4. `exp`/`nbf` within ≤60 s skew. 5. `aud` == this resource (no wildcard). 6. Coarse scope for the invoked tool present (§5.5) — the only place a **valid** token is rejected for *permission* → **403**. 7. DPoP/`cnf` proof matches. 8. Route to Tier-2 if the tool is PDP-gated (§5.2); else execute on the fast path.

Every RS **MUST** publish `/.well-known/oauth-protected-resource` (RFC 9728) advertising `resource` (its audience), `authorization_servers: [auth]`, `scopes_supported`, `bearer_methods_supported: header`. On any `401`, return `WWW-Authenticate: Bearer resource_metadata="…"` so a freshly-spawned agent can bootstrap (401 → discover `auth` → mint audience-bound token → retry).

### 5.2 What routes to the PDP (Tier-2 gating)

A tool is PDP-gated if it is **SoD-critical** (compares acting principal vs a work item / another holder — `board.approve_ticket`), **destructive/irreversible** (`gateway.execute_approved_plan`, `vault.redeem_handle`), **resource-specific policy** (`cmdb.write_policy`, host-scoped), or **budget/cooldown-dependent** (`board.claim_ticket`, any cooldown'd tool). Everything else is fast-path.

### 5.3 PDP request/response + obligations

**Request:** `principal` (`sub`, `client_id`, `kind`, effective roles/scopes, `jti`), `action` (canonical id, e.g. `Gateway::execute_approved_plan`), `resource` (typed ref), `context` (`traceparent`, timestamp, `aud`, cert thumbprint, idempotency key, DPoP `jkt`). The PDP materializes Cedar entities from the PIP at decision time: budget/cooldown (Redis), SoD facts (Board `proposer_id`, CMDB `tier`/`in_window`), revocation state (checked on **every** gated call, **never cached** on destructive paths).

**Response:** `decision` (permit/deny), `reason` (machine code: `permit | self_approval_forbidden | budget_exhausted | cooldown_active | revoked | out_of_window | dual_holder_forbidden | approval_consumed | in_progress`), `obligations` (MUST be satisfied by the PEP for a permit to be valid), `advice`, `drift_bound` D (see below; replaces the ambiguous `decision_ttl=0`), `trace_id`.

**Freshness is a concrete numeric drift bound D, not `decision_ttl=0` (red-team finding 3c/A).** `decision_ttl=0` was ambiguous (literally, a permit is stale the instant it is issued). Replace it with a **concrete small drift bound `D`** tied to the ~250 ms live-check timeout and the < 1 s propagation SLO (default **D = 1 s**). The obligation `revocation_fresh_at(ts)` becomes **numeric and testable**: at the instant of the **irreversible action** (Vault redeem, first host mutation), if `(now − revocation_check_ts) > D` the PEP **MUST re-run the authoritative live check or DENY** — it must NOT merely re-poll a cached local kill flag. This closes the TOCTOU where a *slow* PDP returns a permit that has already aged past a just-committed revocation. Stage-7: a slow-PDP permit that ages past D is rejected at the redeem/execute instant.

**Obligations** (PEP must satisfy or treat permit as deny — fail-closed):
- `admission_claim(idempotency_key)` — **admission-time** mutual exclusion (red-team finding 3a/A): atomically `SET NX` a **PENDING** record keyed by the idempotency key **BEFORE** the PDP/execute. A concurrent or retried same-key request that sees PENDING returns **`409 in_progress`** and **never proceeds**. This replaces completion-time result-caching as the double-execution guard: the prior design only returned a cached result *after* completion, so a retry during a still-running first call found no record and proceeded.
- `fencing_token(host_id)` — the host-mutex/lease issues a **monotonic fence** (Kleppmann). The Gateway's actual privileged host action **rejects any action whose fence is older than the current holder's**, so a call whose lease expired and was reaped can never complete its irreversible action after a retry took over the slot. **The concurrency semaphore is explicitly NOT the double-execution guard for irreversible actions** — `acquire_host_mutex(host_id)` + admission claim must be held for the FULL duration, and their release must never be driven by a bare TTL reaper without a fence.
- `consume_approval(ticket)` — **approval is SINGLE-USE** (red-team finding 1e/A): on first (attempted) execution the Board transitions the ticket out of the approved/executable state (`approved → executing → done/failed`); the PDP returns `permit` for `gateway:execute` **only while the ticket is in the executable state**. A second execute of the same ticket (even with a *fresh* idempotency key) is denied with a **terminal `approval_consumed`** reason (NOT `insufficient_scope`). This shuts the "one approval authorizes unlimited executions" hole.
- `acquire_host_mutex(host_id)` (Gateway per-host lock, ARCHITECTURE §5), `release_semaphore_on_completion` (§6), `record_audit(fields)`, `enforce_idempotency(key)` (now completion-time result cache *in addition to* the admission claim above), `revocation_fresh_at(ts, D)` (numeric drift bound, above).

### 5.4 Multi-audience token acquisition across the SoD chain

The orchestrating agent does **not** touch all four holders. The chain distributes scopes across *different* principals — that is the SoD property:

| Holder | Who calls it | `aud` | Scope | Note |
|---|---|---|---|---|
| Board | orchestrating agent | `board` | `board:read/propose/claim` | **never** `board:approve` |
| CMDB | orchestrating agent | `cmdb` | `cmdb:read`, `cmdb:read-policy` | decision input |
| Board (approve) | a **different** principal (operator / `svc:tier-approver`) | `board` | `board:approve` | self-approval blocked at PDP if `sub==proposer_id` |
| Gateway | orchestrating agent | `gateway` | `gateway:execute` | triggers execution of an *already-approved* ticket |
| Vault | **Gateway only** | `vault` | `vault:read-credential` | agent never holds this scope |

So the orchestrating agent manages **at most three** audience-bound tokens (Board, CMDB, Gateway); the Gateway independently holds its own `aud=vault` token; approval is a fourth, *foreign* token held by a distinct approver. **No principal ever holds a token — or a pair — spanning `board:approve` and `gateway:execute`**, and the agent's identity structurally cannot mint a `board:approve` token at all (§3.5). **Acquisition:** discover audience via RFC 9728 on first 401 → mint with `resource=<target>` (Keycloak: via audience mapper) requesting only that audience's scope subset → cache in-process per `(audience)` → re-mint independently per audience on expiry (no refresh token).

**No token passthrough / confused-deputy rules:** when app A calls app B it MUST NOT forward the agent's A-audience token (rejected at B on step 5 anyway); the PEP derives principal *only* from the validated token, never from `X-User`/`Remote-User`/proxy headers (§8.6). No PEP honors `vault:read-credential` for an agent principal — structurally unassignable.

**RFC 8693 token exchange — DISABLED by default; a hard no-widening / no-SoD-crossing invariant if ever enabled (red-team findings 4b/A, 5d).** Exchange mints authority *dynamically at token-request time* and would otherwise flow **around** the assignment-time §3.5 interposition entirely (depth bounds chain length, not scope conflict). Therefore token exchange ships **OFF**. If bounded delegation is ever enabled (a hard G7 go/no-go, §10):
1. An exchanged / actor token can **never** contain a scope outside the **subject principal's effective grant**, nor target a **holder audience the subject may not itself reach**.
2. The **§3.5 ConflictSet check MUST run over the resulting effective holder-scope set** (subject ∪ actor ∪ requested) of every exchanged token, and reject any exchange that would produce — or delegate to an actor that would produce — a token spanning any holder ConflictPair.
3. **Simplest safe default (adopted):** RFC 8693 may **never emit or delegate ANY of the four holder scopes** (`board:approve`, `cmdb:write-policy`, `gateway:execute`, `vault:read-credential`) at all; `act`/`may_act` depth is bounded to **1**.
Stage-7: an agent cannot exchange a benign token into any holder scope or holder audience.

**Core API is the sole holder-scope grant authority (red-team finding 4c/A):** holder scopes reach a token only through a §3.5-checked Core API grant; the IdP's native admin role/client-scope assignment for holder scopes is locked down, with continuous drift reconciliation and the PDP `forbid` catching any drift at use (§3.5 guarantees 3–4).

### 5.5 Scope → MCP-tool mapping (the contract every app builds against)

| App | Representative tool | Required scope | Path | Why gated (PDP checks) |
|---|---|---|---|---|
| board | `board.list_tickets`/`get_ticket` | `board:read` | fast | — |
| board | `board.claim_ticket` | `board:claim` | **PDP** | concurrency/WIP + per-host lock + cooldown |
| board | `board.propose_plan` | `board:propose` | fast | proposal not destructive |
| board | `board.update_ticket` | `board:update` | fast\* | PDP only if guarded transition (→ `awaiting_approval`) |
| board | `board.approve_ticket` | `board:approve` | **PDP** | **SoD `sub != proposer_id` enforced by the Board (owner) AND re-checked by the PDP (backstop) — both must permit** (§3.5, finding 5c); revocation-fresh (authoritative read); approver holds no execute |
| board | `board.run_ceremony` | `board:run-ceremony` | fast | — |
| cmdb | `cmdb.query_policy` | `cmdb:read-policy` | fast | read-only SoD *input* |
| cmdb | `cmdb.write_policy` | `cmdb:write-policy` | **PDP** | holder; SSD-excluded; revocation-fresh |
| vault | `vault.reference_handle` | `vault:reference` | fast | handle only, never plaintext |
| vault | `vault.redeem_handle` | `vault:read-credential` | **PDP** | **Gateway principal only**; approved ticket exists; revocation-fresh; never cached |
| gateway | `gateway.execute_approved_plan` | `gateway:execute` | **PDP** | approved ticket (Board) in **executable state** AND CMDB permits now AND host mutex + **fencing token** AND **admission claim** AND live revocation (fresh within drift bound D) AND budget; **`consume_approval` makes the approval single-use**; kill-switch honored |
| notes | `notes.read/search` | `notes:read`/`notes:search` | fast | — |
| notes | `notes.write` | `notes:write` | fast\* | PDP if write-rate/cooldown budget applies |
| mc | `mc.report_status`/`heartbeat` | `mc:report` | fast | — |
| mc | `mc.request_escalation` | `mc:escalate` | fast | — |
| mc | `mc.set_kill_switch` | `mc:kill-switch` | **PDP** | operator identity only; break-glass audited |
| drive | `drive.get/list` | `drive:read` | fast | — |
| drive | `drive.put` | `drive:write` | fast\* | PDP if storage/rate budget applies |
| chat | `chat.post_notification` | `chat:post` | fast | — |
| pdf | `pdf.render` | `pdf:render` | fast | — |

\* fast by default; flip to PDP only if a live budget/cooldown or guarded transition attaches (decided per app at its Stage-2).

### 5.6 401 / 403 / 400 / 429 semantics

`401 Bearer` (+ `resource_metadata`) = unauthenticated/invalid/revoked token — re-mint. `403 insufficient_scope, scope="<required>"` = valid token, missing capability — step-up (a token carrying `<required>` would help). **`403` with a machine deny-reason and NO scope hint** = PDP denied on policy (`self_approval_forbidden`, `budget_exhausted`, `revoked`, `out_of_window`, `dual_holder_forbidden`, **`approval_consumed`** — ticket already executed, single-use) — do **not** retry blindly; a wider scope will not help; surface as an escalation. `400` = malformed request. `409 in_progress` = an admission claim for this idempotency key is already PENDING (§5.3) — do not proceed. `429` = budget admission control (§6), orthogonal to authz — never conflate.

**Key rule:** a PDP deny on an SoD violation (self-approval) MUST NOT be signaled as `insufficient_scope`, which would invite the agent to acquire a wider scope — exactly the escalation we forbid. It is a terminal `403` + reason code.

---

## 6. Budget enforcement — per tool-call, Redis, concurrency/cooldown

Budgets are a **safety guardrail against runaway loops / host exhaustion, not a cost control** — agents are local, no dollar meter (ARCHITECTURE §2, R§3). The failure mode is *never terminating / confident garbage at machine speed*, so the compute guardrail **fails closed** on the paths that matter.

**Invariants:** (1) **four** dimensions `(rate/compute, concurrency, cooldown, lifetime/liveness)`, all keyed by the authoritative `sub` in **one shared Redis** so all of an agent's processes share one budget; (2) **`auth` owns POLICY, Redis holds LIVE STATE**; (3) enforcement lives at the **MCP-server/API layer per tool-call — NOT the proxy** (MCP multiplexes many calls over one connection; ForwardAuth has no completion callback so it can `INCR` but cannot reliably `DECR`); (4) the Redis concurrency semaphore is the **precise/shared** anti-runaway lever, **backed by a Redis-INDEPENDENT in-process ceiling** (§6.1 dim 2, finding 2b) that is always on so the lever cannot evaporate with its own dependency; (5) fail-closed for destructive/SoD classes on Redis/`auth` loss; benign reads/writes on Redis loss are **allow-but-locally-bounded (NOT allow-unbounded)** — the local in-process ceiling + a coarse local rate clamp still apply (finding 2b); (6) a **fourth, first-class lifetime/liveness guardrail** bounds *total* work regardless of instantaneous rate/concurrency (finding 5b), because a patient sequential benign-read/plan loop trips none of rate/concurrency/cooldown — the architecture's named failure mode. **Reads are not a free unbounded lane.**

### 6.1 Three dimensions

| Dimension | Caps | Mechanism |
|---|---|---|
| **Rate/compute** | sustained throughput + burst | **GCRA** (one TAT per key; emission interval `T`, burst `tau`; uses Redis `TIME` for one authoritative clock) or token-bucket via atomic Lua `EVAL` |
| **Concurrency/WIP** | simultaneous in-flight calls per agent (and per `(agent, class)`) | **leased Redis `INCR`/`DECR` semaphore** (precise/shared): `INCR` on start (reject if over cap), `DECR` in `finally`; a **TTL lease** is a crash-recovery backstop only, never the primary release. **PLUS a Redis-INDEPENDENT in-process ceiling** at every RS/MCP server (finding 2b): a static per-agent (keyed by `sub`) and per-process global in-flight cap enforced **locally, always on, never consulting Redis** — the fail-safe floor. In `X-Budget-Degraded` mode (Redis down) the RS falls back to this conservative local cap (allow-but-bounded) rather than fully fail-open. |
| **Cooldown** | min interval per `(agent, action-class)` | **GCRA `tau=0`** or `SET NX EX`, combined with **idempotency keys** so a retry within the window (same key) returns the prior result and a different key is rejected |
| **Lifetime / liveness** (finding 5b) | total work per agent regardless of instantaneous rate/concurrency — bounds the never-terminating benign loop | **per-agent lifetime/wall-clock compute budget** + an **MC-owned no-progress/liveness detector** with a CONCRETE trigger (e.g. **N tool-calls without a state-advancing/side-effecting action**, or **T minutes without task progress**) that auto-arms `sub`-scoped `freeze-destructive`/quiesce for that `sub` in the safe direction. Redis keys `budget:life:{sub}`, `budget:progress:{sub}`; owner = Mission Control (§6.7, §7.8). Even under degraded-mode read fail-open, the loop is caught here and auto-escalated. |

### 6.2 Action-class taxonomy (the enforcement key)

Budgets are enforced per **action-class**, not raw tool name. Each app declares each tool's class in its manifest.

| Class | Examples | Concurrency | Cooldown | PDP? | Redis-down |
|---|---|---|---|---|---|
| `read` | notes.search, board.list, cmdb.query | high (but **local in-process cap always on**) | none | no | **allow-but-locally-bounded** (local ceiling + coarse rate clamp; NOT unbounded, finding 2b) + alert |
| `write-benign` | notes.write, board.update | medium | short | no | allow-but-locally-bounded + alert |
| `propose` | board.propose | medium | per-class | no | allow-but-locally-bounded + alert |
| `sod-critical` | board.**approve**, cmdb.write-policy | low | per-class | **yes** | **fail-closed** |
| `destructive-exec` | gateway.execute, vault.redeem | **very low (often 1)** | per-class + idempotency | **yes** | **fail-closed** |

`sod-critical`/`destructive-exec` are exactly the paths the hybrid token model already flags for a live revocation check — the budget gate and the live revocation/introspection check are **co-located** so one "expensive" round trip covers both (§4.7, §5.3).

### 6.3 Policy model + counter store

`BudgetPolicy` (owned by `auth`, operator-managed, audited, versioned) attaches to a principal or role (effective = most-restrictive of role default + principal override): `rate {T, tau}`, `concurrency {global_max, per_class_max}`, `cooldowns[class]`, `class_overrides`, `fail_mode_overrides`. Static caps **may** ride as convenience claims; **live counters never in the token**. Redis key families: `budget:rate:{sub}`, `budget:conc:{sub}[:{class}]`, `budget:cool:{sub}:{class}`, `budget:idem:{sub}:{key}`, `budget:lease:{sub}:{acq_id}`.

> **Settles R Open-Q §6 (token-mint vs RS re-evaluation):** budgets are evaluated **at the RS per tool-call** against live Redis, not at token mint. The token may *carry* static caps as a convenience, but the authoritative decision is always the per-call Redis check — no stale-claim window, and `auth` stays off the benign hot path.

### 6.4 Semaphore lifecycle

Acquire (`INCR` + write lease key with TTL above worst-case wall-clock; reject with `DECR`-back if over cap — **reject, do not queue-forever**) → hold (progress-gated lease heartbeat for long calls) → **release in `finally`** (`DECR` + delete lease, on success/error/timeout/cancel) → backstop (a reaper reconciles against outstanding lease keys on crash; never the normal path). All INCR/DECR+lease ops for one acquire are atomic (Lua).

> **The concurrency semaphore is NOT the double-execution guard for irreversible actions (red-team finding 3a/A).** A slow PDP can make a call block without progress → the progress-gated lease expires → the crash-backstop reaper (which cannot distinguish slow-but-alive from crashed) frees the cap-1 slot → the client's timeout retry re-acquires and executes a *second* time. The two competing designs each have a bug in isolation — a heartbeat that refreshes during a slow-PDP wait creates a hung-call-never-releases liveness bug, while a progress-gated one creates this double-free. **Only fencing tokens make reacquire-after-expiry safe:** the host action rejects any fence older than the current holder's (§5.3). Double-execution is prevented by **admission-time claim + `acquire_host_mutex` + fencing token held for the FULL duration**, never by the semaphore alone.

### 6.5 Over-budget response

`429 Too Many Requests` for rate (`Retry-After` = next emission), cooldown (`reason=cooldown`), concurrency (`reason=concurrency`); idempotency replay (same key) → prior result; Redis-down benign → allow + `X-Budget-Degraded: true` + alert; Redis-down destructive/SoD → **`503` fail-closed**, break-glass referenced. `429` is admission control, distinct from `403` (authz) and `401` (unauthenticated).

### 6.6 Per-call evaluation order

`0` kill-switch freeze flag — read from Redis if reachable, **else read the Redis-independent kill epoch carried in JWKS/AS-metadata / forward-auth header (§7.3); under an explicit quiesce posture this read FAILS CLOSED (`503`) on benign paths too — it never fail-opens (finding 2a)** → `1` token valid/`aud`/scope (`401`/`403`; also reject any token whose `kid` is not in current JWKS, §5.1) → `2` classify → `3` rate GCRA (`429`) → `4` cooldown (`429`) → `5` **admission_claim `SET NX` PENDING** for destructive/idempotent classes (`409 in_progress` if already PENDING; **before** the PDP so a slow-PDP retry cannot double-execute, finding 3a) → `6` **concurrency ACQUIRE** (`429`, so no slot is held on a cheaper fail) → `7` [sod/destructive] PDP+PIP (SoD + live budget + live revocation + drift bound D) → `8` execute (fencing token checked at the irreversible action) → completion-time idempotency record; **release in `finally`**. Redis unreachable at any step → §6.2 fail table (destructive = fail-closed; benign = allow-but-locally-bounded).

### 6.7 Binding to Mission Control (settles R Open-Q §6)

**Shared live state, single owner, two readers.** The Redis counters ARE the "two-views-one-state" surface; Mission Control keeps no parallel tally. Per-agent budgets: policy in `auth`, live in Redis, MC renders + edits via `auth`'s admin API. **Global WIP limit** (ARCHITECTURE §5): `auth` holds it as a global `BudgetPolicy` on a reserved principal (`*`/`org`), enforced by the same middleware (`budget:conc:org`). **Global kill switch:** Mission Control owns the switch; both the budget middleware (admission — freeze flag read on every gated call → concurrency cap 0 → all agent calls `503`) and the Gateway (execution) read it. WIP (tunable, `429`) and kill switch (binary halt, `503`, operator-only to clear) are distinct; both live as shared state.

---

## 7. Kill-switch mechanics + Failure / HA / break-glass

### 7.1 Two independent stop-layers (the non-negotiable frame)

`auth` is **not allowed to be the only thing between an agent and a destructive action** (ARCHITECTURE §3, R§8.4). The kill switch is two independent layers — either alone can stop action:

| Layer | Owner | Mechanism | Property |
|---|---|---|---|
| **L1 — Identity/PDP stop** | `auth` | revocation denylist + live PDP verdict over `auth:revocations`, consulted on SoD-critical paths | fast, suite-wide, surgical (per-`jti`/`sub`/`kid`/global) |
| **L2 — Physical execution stop** | **Gateway** | Gateway independently requires {approved ticket + CMDB-permits-now + Vault creds} and refuses on a missing piece or its own local kill flag | bites at the one component that can touch a host, even if L1 is forged/bypassed |

L2 is deliberately outside `auth`'s trust boundary: even a forged `auth` verdict reaches a host only if Board+CMDB+Vault independently agree and the Gateway's local flag is clear. The global kill-switch UI lives in Mission Control and fans out to **both** layers.

### 7.2 Revocation ledger + graduated kill switch

`auth` owns one authoritative append-only **revocation ledger** (audit line = truth; Redis = hot projection). An entry carries `scope_type` (`jti|sub|client_id|kid|global`), `target`, `mode`, `not_before`, `epoch` (monotonic, bumped every change), `issued_by`, `reason`, `ttl_hint` (≥ max token TTL so a JWT never outlives its denylist entry). Graduated global switch — one control, three bite-depths:

| Level | `mode` | Denies | Still allowed | Use |
|---|---|---|---|---|
| **G0** | normal | — | everything in-policy | steady state |
| **G1** | `freeze-destructive` | `gateway:execute`, `vault:read-credential`, `board:approve`→execute chains suite-wide | benign reads, planning, deliberation | "stop the hands, keep thinking" (default operator pull) |
| **G2** | `quiesce-all` | all agent tokens | humans + break-glass only | full stop / suspected suite compromise |

### 7.3 Propagation (same mechanism as §4.6)

Operator/guardrail → `auth` writes ledger entry → SET authoritative Redis keys (`denylist:*`, `killswitch:global={level,epoch}`) + PUBLISH `auth:revocations` → every RS's revocation-cache client applies the delta in-memory and advances `last_epoch`. Reliability: **epoch reconciliation** (snapshot read on connect/reconnect before serving any destructive decision), **heartbeat/freshness lease** (`denylist:heartbeat` ~500 ms; stale RS fails its destructive path closed), **pull fallback** (poll snapshot until re-subscribed; destructive fails closed while stale). Latency budget: **< 100 ms typical, < 1 s SLO**; worst case bounded by `staleness_bound` → fail-closed, never unbounded.

**Redis-independent global kill (red-team finding 2a/A).** The kill switch and its break-glass buy-back must NOT depend on the very Redis that may be down. Two Redis-independent channels back it up:
1. **JWKS-`kid`-prune fast-path kill.** Break-glass AS-key rotation is a *true* Redis-independent global kill: RSes reject any token whose `kid` is not in the currently-served JWKS and poll JWKS ≤ 30 s + on signature failure (§5.1). Removing a `kid` from `auth`'s JWKS (served over HTTP) invalidates all old-`kid` tokens within the poll window with **no Redis involvement**.
2. **Kill epoch/level carried Redis-independently.** The current `killswitch:{level,epoch}` is ALSO **signed into `auth`'s JWKS / AS-metadata document and into the forward-auth signed identity header (§8.7)**, so the door/PEP can fail closed on benign paths under an explicit G2 quiesce posture **even with Redis down** (finding 2a fix 2–3). The freeze-flag read (§6.6 step 0) **fails CLOSED under an explicit quiesce posture** — it never fail-opens benign paths when a quiesce is in effect.

**Kill/revoke WRITE-path resilience (red-team finding 2d/A).** The operator must be able to STOP under any single-dependency failure, so the kill/revoke write path is given HA independent of benign mutation load:
- **Only Redis down:** an **emergency "JWKS-rotation-first / Redis-first" kill** propagates immediately via channel 1–2 above and **reconciles the durable ledger asynchronously** — a durably-recorded kill never depends on a Redis SET/PUBLISH to fan out.
- **Only the SQLite writer down:** adopt the **replicated Postgres durable path for the revocation ledger before Critical-infra exit** (§7.6) so the revoke/kill ledger append does not block on one writer, OR allow the emergency kill to fan out first and record the ledger on writer recovery.
- Kill-switch behavior under each single-dependency failure is **proven by a Stage-7 test** (operator can still STOP with (a) only Redis down and (b) only the SQLite writer down).

### 7.4 Gateway destructive-path sequence (the live check at the last reversible instant)

1. Local PEP (offline): sig/`exp`/`aud=gateway`/`scope=gateway:execute`; `kid` present in current JWKS. 2. Independent L2 SoD gathers: Board (approved ticket **in executable state**, `proposer_id != approver_id`), CMDB (policy permits this host in this window now). **Admission claim** (`SET NX` PENDING on the idempotency key) + **acquire host mutex → fencing token**. 3. **LIVE revocation/PDP check** against **authoritative** Redis (not the RS cache): `jti`/`sub`/`kid`/`client_id` not denied; kill-switch == G0; budget OK; record `revocation_check_ts`. Hard timeout (~250 ms); timeout/unreachable/any-doubt → **DENY**. 4. Only on explicit PERMIT: `consume_approval` transitions the ticket `approved → executing` (single-use, finding 1e) → Vault redeems creds → Gateway executes the vetted playbook, **presenting its fence; the host action rejects any stale fence** (finding 3a). 5. **Re-check at every irreversible instant (findings 3a/3c):** before each privileged sub-action, if `(now − revocation_check_ts) > D` (drift bound, default 1 s) **re-run the authoritative live check** — not merely a local kill-flag poll — and DENY on any doubt; also re-poll the local kill epoch so a kill pulled mid-execution halts step N+1. **Vault is an independent second consumer** — it honors the denylist (fail-closed on its own Redis loss, §4.6) before releasing to the Gateway (two audiences, two checks, one revoke).

### 7.5 Fail-closed / fail-open matrix

Rule: anything that can cause/enable irreversible real-world effect fails closed on any dependency loss; pure reads may fail-open to a still-valid cached JWT, bounded by its short TTL.

| Action class | Live PDP/`auth` down | Redis (denylist/counters) down | JWKS unreachable | Live-check timeout |
|---|---|---|---|---|
| `gateway:execute` | **CLOSED** | **CLOSED** | CLOSED | **CLOSED** |
| `vault:read-credential` | **CLOSED** | **CLOSED** | CLOSED | **CLOSED** |
| `board:approve` | **CLOSED** | **CLOSED** | CLOSED | **CLOSED** |
| `cmdb:write-policy` | **CLOSED** | CLOSED | CLOSED | CLOSED |
| mutating benign writes | fail-open to cached JWT until `exp` (degraded banner) | fail-open (budget best-effort) | CLOSED | fail-open to cached JWT |
| benign reads | **OPEN** to cached JWT until `exp` | OPEN | CLOSED\* | OPEN |

\* JWKS loss forces closed unless the RS holds a still-valid cached key set (keys rotate slowly — cache generously). **The tradeoff, signed off explicitly (R Open-Q §7):** fail-closed on destructive/approve/redeem makes `auth`+Redis a suite-wide hard dependency; accepted because "a runaway/compromised agent acts while we're blind" is strictly worse than "nothing dangerous happens for a few minutes." Bought back four ways: benign/read traffic keeps flowing on cached JWTs (now **allow-but-locally-bounded**, §6.2); introspection answers **correctly without Redis** via the durable revocation mirror so Redis-down is *degraded-but-correct*, not *bricked* (§4.6, finding 2c); `auth` runs HA with the **destructive introspect/PDP plane physically isolated from the forward-auth verify plane** (§7.6, finding 3b); break-glass restores *control* even when `auth` is degraded. Redis loss **stops** action (safe direction) — it can never *release* action.

> **Accepted residual — Redis-outage & self-inflicted-outage (red-team findings 2e/A, 3b/A; see §12).** (1) During a Redis outage there is **no in-band SoD-governed destructive action at all** — including legitimate emergency remediation that itself needs the Gateway; this is the safe direction and is covered by an out-of-band operator runbook (Stage-7 deliverable). (2) A verify-flood or slow PIP that pushes the live check past its ~250 ms timeout **fail-closes execution suite-wide** ("nothing dangerous happens" is safe for SoD but a self-inflicted mission outage); mitigated by isolation + load-shedding + circuit-breaker + a global destructive-class admission cap (§7.6), and documented with a recovery runbook. Both are dispositioned in §12.

### 7.6 `auth` HA + SPOF analysis

**Verify/PDP-read layer is stateless → run active-active** (≥ 2 `auth` replicas behind the proxy; the forward-auth endpoint is on every request's hot path, so active-active beats active-passive failover latency). State is externalized so replicas stay interchangeable: **AS signing key(s)** shared/replicated, publish current **and next** `kid` in JWKS ahead of rotation (overlap ≥ max token TTL); **JWKS** RS-side cached generously; **principal/role/scope store** SQLite single-writer at homelab scale with a load-tested Postgres path for a second writer; **denylist + budget counters + sessions** in **replicated Redis** (Sentinel/managed, AOF `everysec`).

**Physical isolation of the destructive plane from the verify plane (red-team finding 3b/A).** The mandatory fail-closed live check (introspect + PDP) is **physically isolated** from the high-volume forward-auth `/api/verify` path: **separate connection pools / thread pools, and ideally separate `auth` replicas or a dedicated priority queue**, so a benign verify flood (cheap traffic hitting `/api/verify` on every request) cannot starve introspection and thereby fail-close all execution suite-wide. Add **bounded-concurrency load-shedding + a circuit-breaker** at `auth`'s introspect/PDP endpoint with an explicit, **alerted DEGRADED state** ("destructive plane is shedding") rather than silent per-call timeouts. A **global admission cap on destructive-class calls** (`budget:conc:org`, §6.7, extended to gate the introspection fan-out) stops a few compromised executors from saturating the destructive plane. The PDP's synchronous **PIP fan-out to Board + CMDB is itself capped and circuit-broken independently**, with defined behavior when a *PIP* (not `auth`) is the slow party (deny the gated call, surface PIP-degraded).

**Strongly-consistent mint path (red-team finding 1d/A).** The `/token` endpoint's client-enabled / `AgentKey.status` / JWK-present check is **read-your-writes against the authoritative writer** (or a pushed sub-second key-revocation denylist on the same `auth:revocations` epoch), staleness-bounded and **fail-closed if it cannot confirm the current epoch** — so disabling an agent blocks new mints sub-second **across all replicas, including under writer failover / read-replica lag** (Gate G4). No active-active replica may mint against a lagging read-replica or stale client cache.

**Honest active-active caveat:** active-active on read/verify/decision; **single-writer on the mutation path** (sessions, budget decrements, denylist appends funnel to Redis + one SQLite writer) until Postgres migration — **except** the revoke/kill write path, which gets its own HA (Postgres ledger before Critical-infra exit, or emergency Redis/JWKS-first kill, §7.3, finding 2d). SPOF summary: `auth` verify replica — no (N replicas); **Redis — yes, critical** (destructive fails closed suite-wide; reads survive locally-bounded on cached JWT; introspection stays correct via durable mirror) → replicate + Sentinel + AOF; signing-key store — yes (can't mint new; existing verify until `exp`); **proxy/forward-auth — yes, per-request** (proxy's own HA concern).

### 7.7 Operator break-glass

Break-glass exists so the human operator **regains and retains control when `auth` itself is degraded/compromised** — above all, the ability to **stop**. Its defining constraint: **it must never become an approve-plus-execute bypass of SoD.**

| Direction | Allowed under break-glass? | Why |
|---|---|---|
| Engage kill switch (G1/G2), revoke a principal/key, disable an agent, halt the Gateway | **Yes — unrestricted, fail-safe** | always moves toward *less* real-world action |
| Re-enable agents, lift kill, restore/edit identity, restore a normal approver seat | Yes, but logged + reviewed | restores availability; **holds no execute/redeem scope, so cannot itself act** |
| `gateway:execute` / `vault:read-credential` (cause execution or redeem a credential) | **NO — `role:break-glass` structurally does not hold either scope (§3.4)** | break-glass is confined to STOP + RESTORE; execution is never a break-glass capability |

**Corrected (red-team findings 5a/A, 4f/A): the concentration is closed structurally, not by prose.** The earlier claim that "approve-plus-execute as one act is structurally impossible" was **false** while break-glass held `gateway:execute` — proposer≠approver only stopped break-glass from approving its *own* proposal, so a single leaked/coerced offline factor could have an agent propose, then as break-glass approve, then as break-glass execute. That hole is now closed at the root: **`role:break-glass` holds NO action-side holder scope** (§3.4), so a single break-glass factor **cannot alone produce an executed destructive action** — emergency execution still requires a *distinct* approver seat plus the independent Gateway (Board+CMDB+Vault) chain. This makes the two-person control on the *acting* direction unnecessary (there is no break-glass acting direction to gate). Break-glass restores the operator's *normal* approval seat; the Board still enforces `proposer_id != approver_id` (PDP backstops it) and the Gateway still independently requires Board+CMDB+Vault.

**Invoked by the human operator only, via a separate offline factor that does not depend on `auth`'s live services** (pre-provisioned hardware key / offline credential held physically — **not** in Vault, which is itself a holder that could be down). A `kind=break_glass` principal is **never issuable a normal online token** and its `kind` is **immutable** (§3.5, finding 4f), so break-glass authority is reachable *only* through the offline factor. Constrained + audited: single-use, time-boxed, auto-revoked; **append-only out-of-band audit + broadcast to the operator Chat feed** (loud by design); **mandatory post-hoc `needs_review` ticket** auto-filed on the Board; scope-limited to control-plane STOP/RESTORE operations; **never issued to an agent**; creating/assigning any break_glass principal is itself gated behind break-glass/two-person control. The *stopping* direction is never gated behind a second person.

> **Accepted residual (finding 2e/A, §12):** while Redis is down, break-glass can STOP but there is **no in-band path to perform any approved real-world action** (approve+execute all fail closed) — even legitimate emergency remediation. This is the safe direction; emergency real-world remediation is performed **out-of-band via a manual operator runbook** shipped as a Stage-7 deliverable.

### 7.8 Invocation surfaces (two views, one state)

The revocation ledger and kill level are one shared state with two surfaces. **UI:** Mission Control hosts the global kill switch + per-agent disable; `auth`'s UI manages identities/keys/denylist and shows current level/epoch/per-RS freshness. **MCP:** an agent may quiesce *itself* or file an escalation, and may **never** revoke/re-enable/lift a kill on another principal. Both surfaces write the same ledger, bump the same `epoch`, fan out over the same `auth:revocations`.

**Automated guardrails may fire only in the SAFE (stopping) direction.** Three are specified concretely (not deferred):

1. **Loop-runaway / no-progress detector (red-team finding 5b/A)** — owner **Mission Control**. Concrete trigger: **N tool-calls without a state-advancing/side-effecting action, or T minutes without task progress** (per-`sub`), read from `budget:life:{sub}` / `budget:progress:{sub}` (§6.1 dim 4). On trip it **auto-arms `sub`-scoped `freeze-destructive`/quiesce** for that agent. This bounds the architecture's named failure mode — a patient sequential benign-read/plan loop that trips none of rate/concurrency/cooldown. It also **auto-escalates a persistent degraded-mode benign-read loop to G2** if the local-bounded fail-open (§6.2) does not quiet it. Stage-7 test with a synthetic no-progress loop.
2. **Mint-anomaly auto-freeze (red-team finding 1b/A)** — owner `auth` `/token` endpoint. Baseline per-agent mint rate + expected origin (mTLS/TPM-attested); on a mint-rate spike / new-origin / off-host mint it **trips `freeze-destructive` (G1) and/or auto-revokes the client key** in the safe direction (keys `mint:baseline:{sub}`, `mint:rate:{sub}`). This is the detection lever against a stolen signing key re-minting fresh tokens (§3.6). Stage-7 test with an off-host mint burst.
3. **Redis-independent freeze propagation** — under quiesce the freeze posture rides the JWKS/AS-metadata/forward-auth signed channel (§7.3) so it bites even with Redis down.

No automated guardrail may ever move toward *more* real-world action; only the operator (via UI) can lift a kill or re-enable.

---

## 8. FORWARD-AUTH CONTRACT FOR `proxy` (deliverable the proxy session consumes)

> **This section is the authoritative contract the `proxy` Planning session and every RS backend implement verbatim.** Owner: `auth`. Consumer: `proxy` + all app backends. Grounding: R§4 (front door), R§6 (human vs agent, mTLS termination), R§8 item 5 + Traefik CVE cluster, R§2 topology trust-boundary correction, and the 2026 forward-auth CVEs (Caddy CVE-2026-30851; Traefik CVE-2026-35051 / 39858 / GHSA-5m6w-wvh7-57vm).

### 8.1 Scope and non-goals

Governs **one HTTP verification subrequest** the proxy issues to `auth` for every inbound request across every subdomain, and the **identity headers** `auth` returns on allow. It answers only **"is this principal authenticated, and may it reach this app-surface at all?"** — *not* "may this agent call this specific destructive tool?" (that is the RS's Tier-1 + Tier-2 job, §5). It does **not** enforce budgets (§6). It is a **per-request SPOF** that adds latency suite-wide — accepted at homelab scale, drives the `auth` HA target (§7.6).

### 8.2 TLS / mTLS and the trust chain

Client→proxy: **proxy terminates public TLS** for every subdomain (public hostname/TLS finalized **before** human passkey registration — passkeys are origin-bound). Proxy→`auth`: internal network, proxy **SHOULD** authenticate to `auth` over mTLS. Proxy→upstream app: identity carried by the signed header of §8.5, not the transport. **If client mTLS / cert-bound tokens are in play**, the proxy **MUST** forward the verified leaf cert / `x5t#S256` thumbprint to both `auth` and the RS (`X-Forwarded-Tls-Client-Cert[-Thumbprint]`), set from the *verified* TLS layer and itself subject to the strip-and-reinject rule (§8.4) — terminating without forwarding silently breaks sender-constraining (R§6). **[VERIFY-AT-BUILD]** whether cert-bound tokens ship v1 or DPoP is the mechanism (§10) — the header plumbing differs.

### 8.3 Verify endpoint

**GET `/api/verify`** (stable, versionless external contract), reached only from the proxy, **idempotent / side-effect-free** (no budget decrement, no session mutation, no `INCR`). Proxy sends `X-Forwarded-Method/Proto/Host/Uri/For` (`X-Forwarded-Host` selects the target app-surface / audience) + the mTLS cert header when applicable, and forwards the original **`Authorization`** and **`Cookie`** headers unchanged — the **only** client-supplied headers `auth` reads for identity. Timeout target ≤ 250 ms; on `auth` timeout/5xx/unreachable the proxy **MUST fail closed** (deny) — break-glass is the escape hatch, not fail-open. **[VERIFY-AT-BUILD]** confirm on the pinned Traefik v3.x / Caddy ≥2.11.2 that `Authorization` + `Cookie` are forwarded on the auth subrequest.

### 8.4 Two credential types, fixed order (mirror Authelia CookieSession→HeaderAuthorization)

1st: **apex-scoped session cookie** (human; `HttpOnly; Secure; SameSite=Lax; Domain=<apex>`) → **stateful** server-side session lookup. 2nd: **`Authorization: Bearer`** (agent) → **stateless hot path** (sig via JWKS, `exp`, `iss` RFC 9207, `aud` matches the app selected by `X-Forwarded-Host`) **plus a live revocation check on SoD-critical/destructive surfaces**. Valid cookie → use it, don't fall through to Bearer. Coarse gate only — does **not** validate fine-grained scope (that is the RS's job; each RS independently validates `aud`=self). **[VERIFY-AT-BUILD]** cookie CSRF/`SameSite` posture for cross-subdomain mutating XHR (`SameSite=Lax` default; may need `None; Secure` + anti-CSRF token — resolve in proxy/UI planning, R Open-Q §10).

### 8.5 Response semantics (decision table)

The status code **is** the contract; the proxy branches on it.

| `auth` status | Meaning | Proxy action | Applies to |
|---|---|---|---|
| **200 OK** | allow — authenticated + permitted to reach this surface | copy `auth`'s identity headers (§8.5) upstream + forward | both |
| **401** | deny, unauthenticated — no/invalid credential, non-browser client; echoes `WWW-Authenticate: Bearer` | return 401 verbatim; never redirect | agents |
| **302** | redirect to login — no/invalid session, browser client (`Accept: text/html` + no `Authorization`); `Location` → login with return-to | return 302 | humans |
| **403** | deny, authenticated-but-refused-at-the-door (zero scope for this app; disabled/suspended; kill-switch/break-glass lockdown) | return 403 verbatim; never redirect | both |
| **5xx / timeout** | — | **fail closed** (deny) on high-stakes surfaces | both |

401-vs-302 is chosen by **`auth`** from client class, not the proxy. **Only `200`** is allow (pin exactly 200; a stray 204/206 is not allow). Fine-grained "insufficient scope for this specific tool" is **not** a front-door 403 — the RS emits that as `403 error="insufficient_scope"` (§5.6).

### 8.6 Trust boundary — unconditional inbound header scrub (the security core)

- **Rule 1 — unconditional strip before the subrequest.** The proxy **MUST unconditionally delete** every identity/trust/prefix header from the inbound client request *before* the `/api/verify` subrequest and *before* forwarding upstream — **not** conditional on `auth` later setting a replacement (that exact conditional-set-without-unconditional-delete gap was Caddy CVE-2026-30851). Strip list = denylist-by-prefix + explicit names, operating on the **normalized** header name (so `X_Auth_Identity` and `X-Auth-Identity` both go — CVE-2026-39858 / CVE-2026-52845 header-alias vectors): all headers `auth` sets (§8.5), plus `X-Forwarded-User/Groups/Prefix` (CVE-2026-35051) and the mTLS cert headers.
- **Rule 2 — identity reaches upstream ONLY if `auth` set it.** After 200, copy onto the upstream request *only* headers present in `auth`'s **response** (Traefik `authResponseHeaders`, Caddy `copy_headers`). Because Rule 1 already deleted any client copy, a client-injected identity header can never survive.
- **Rule 3 — each RS independently re-validates.** Per MCP `2025-11-25` / R§2, every RS **MUST** validate its own token `aud`=self (sig via JWKS, `exp`, `iss` RFC 9207) and MUST NOT authorize off a bare forwarded header. The signed identity header (§8.5) is a verifiable convenience; destructive-path authority rests on the RS's own audience-bound token validation + Tier-2 PDP.

### 8.7 Identity headers `auth` SETS on allow

**`X-Auth-Identity`** — a **signed JWT** (RFC 9068-style, asymmetric ES256/EdDSA, short TTL ≈ subrequest lifetime), signed by a **distinct** key from `auth`'s access-token AS key (separate rotation/`kid`). Backend **cryptographically verifies signature + `aud`** before trusting any claim: `sub`, `principal_type` (`human|agent`), `client_id`, `aud` (app selected by `X-Forwarded-Host`), `roles`/`groups`, `iss`, `iat`, `exp`, `jti`, the current **kill epoch/level** (§7.3), and the **authoritative `traceparent`** (see below).

**Do NOT authorize off advisory headers — carry everything in the signature (red-team finding 5e/A).** The **default is to NOT emit** the `Remote-User` / `Remote-Groups` / `Remote-Name` / `Remote-Email` convenience headers at all — everything an upstream needs is inside the signature-verified `X-Auth-Identity` JWT. "Advisory-only / must never drive authz" as *prose policy* re-creates CVE-2026-30851 semantics behind the door (one RS backend reading `Remote-Groups: approver` re-opens the four-holder collapse from a header `auth` legitimately set). If a `Remote-*` header is kept **only** for human-UI display, then **every RS MUST strip/ignore `Remote-*` at its own ingress and derive authz ONLY from the verified `X-Auth-Identity` signature + its own audience-bound token** — this is promoted from a note to a **suite-wide Stage-7 conformance test run against every app** (mirroring §8.9): no RS authorizes off any advisory/forwarded header.

**Authoritative `traceparent` is server-generated, not client-trusted (red-team finding 5f/A).** The client-propagated `traceparent` is **untrusted** — a malicious agent could craft it to misattribute its destructive-chain actions under another principal's trace id, muddying "who did this." The **proxy/`auth` GENERATES (or re-roots) the authoritative `traceparent` per authenticated request boundary and binds it to the validated `sub`**; any inbound client-supplied `traceparent` is recorded **separately as `claimed_parent`, never as the attribution key**. (The per-line `sub` was already non-forgeable; this closes the correlation-id forgery.) The proxy team implements trace-root generation (§8.2/§8.10); added to the audit-integrity Stage-7 checks.

**[VERIFY-AT-BUILD]** whether the chosen IdP emits a custom signed forward-auth header natively or `auth`'s bespoke verify service mints it (§10).

### 8.8 Kill-switch / break-glass interaction

On kill-switch, `auth`'s verify endpoint flips affected principals to a **403 posture** at the door via the live revocation check (§4.6) — the physical bite stays at the Gateway (§7.1). Break-glass puts the verify endpoint in a documented mode that **still authenticates the operator** (never blanket allow-all) but relaxes fail-closed denial so the operator regains control when a downstream dependency (Redis/PDP) is down — operator-only, agents never granted it.

### 8.9 Mandatory proxy-agnostic regression test (Stage-7 gate, owned by this contract)

A client sends injected identity/prefix/trust headers it should never control (at least `X-Auth-Identity`, `Remote-User: operator`, `Remote-Groups: approver`, `X-Forwarded-User: operator`, `X-Forwarded-Prefix: /admin`, a crafted `traceparent`, plus underscore/case variants). **Scenarios that all hold:** (1) `auth` returns 200 **without** setting that header → the injected header **does not reach upstream** (the exact CVE-2026-30851 regression); (2) `auth` returns 200 **and** sets its own value → upstream sees **only** `auth`'s value; (3) **suite-wide (every RS, finding 5e):** an RS presented with `Remote-Groups: approver` (or any advisory header) does **not** grant any authority off it — authz derives solely from the verified `X-Auth-Identity` signature + the RS's own audience-bound token; (4) **audit attribution (finding 5f):** a client-crafted `traceparent` never becomes the attribution key — the authoritative `traceparent` is server-generated and bound to the validated `sub`, the client value recorded only as `claimed_parent`. Plus: `X-Forwarded-Prefix` injection cannot alter routing/authz (CVE-2026-35051); no header smuggles via name-alias normalization (CVE-2026-39858 / 52845). **[VERIFY-AT-BUILD]** pin Caddy ≥ 2.11.2 (+ check CVE-2026-52845) or Traefik ≥ v2.11.43 / v3.6.14 (+ CVE-2026-39858, GHSA-5m6w-wvh7-57vm); do **not** use Traefik's deprecated `trustForwardHeader`; confirm exact option/header-copy syntax on the pinned version.

### 8.10 One-screen reference for the proxy team

1. Every request: strip all identity/trust/prefix headers (normalized) **unconditionally**. 2. GET `/api/verify` with `X-Forwarded-*` (+ verified mTLS cert header if client-mTLS), forwarding original `Authorization` + `Cookie` unchanged. 3. Branch: **200**=copy `auth` response identity headers upstream + forward; **302**=redirect browser; **401**=return to agent; **403**=return (posture deny); **timeout/5xx**=fail closed. 4. On 200, copy **only** headers from `auth`'s response. 5. Backends verify `X-Auth-Identity` signature + `aud` and independently validate their own audience-bound token; `Remote-*` is display-only. 6. Ship the §8.9 regression test; pin the proxy past the 2026 CVEs.

---

## 9. The three surfaces over one state

### 9.0 The one shared state (Stage-2 exit criterion)

All three surfaces (Core API, MCP, UI) read/write **one logical state** owned by `auth`. Not three stores — one store with components of differing durability. **The Core API is the only writer to the store; the MCP surface and the UI both call the Core API and never touch the store directly.** This is what keeps the two views coherent and is the enforcement seam for SSD, audit completeness, and revocation propagation.

| State component | Canonical store | Written by | Read on hot path by |
|---|---|---|---|
| Principal registry | durable (SQLite→Postgres path) | UI, Core API | forward-auth, token, PDP |
| Role/scope grants + `RoleHierarchy` | durable | UI, Core API | token mint, PDP |
| SSD conflict-set policy | **four holder pairs = immutable/hardcoded (§3.5, finding 4a); not an editable row** | **compiled-in** (any change gated behind offline break-glass + two-person) | grant-validation, PDP guardrail |
| Budget policy (static) | durable | UI | token (claims), PDP |
| Budget counters (live/PIP) | **Redis** | every app's MCP server (per call) | PDP |
| Revocation + kill-switch flag | **Redis** (hot) + **durable mirror wired as the authoritative FALLBACK read for introspection under Redis loss** (§4.6, finding 2c) | UI, Core API (**write-before-ack**, §4.6) | forward-auth, introspection, PDP |
| Signing keys (public) + JWKS | AS key store | Core API (rotation) | jwks, all validators |
| Audit log | append-only durable | all surfaces | UI audit view |

### 9.1 Surface A — Core API (the substrate; six endpoint groups)

**Group 1 — OIDC/OAuth AS endpoints** (adopted from the chosen IdP, §10; contract pinned, not the impl): `authorize` (human, Auth Code + PKCE, passkey + TOTP), `token` (agent client-credentials + per-agent assertion → short-TTL audience-bound token, **no refresh token to agents**; also human code-exchange), `jwks` (public keys; RS validates offline), `introspect` (RFC 7662 live check on kill-switch + SoD-critical/destructive; **never cached** there), `revoke` (RFC 7009 → denylist entry), AS metadata (RFC 8414 + **RFC 9207 `iss`**), protected-resource metadata (RFC 9728, per-resource audience map).

**Group 2 — Token model** (§4): RFC 9068 asymmetric JWT; hybrid validation; multi-audience acquisition; `auth` refuses to co-issue approve+execute (structurally impossible per §3.5).

**Group 3 — Forward-auth verify endpoint** (§8): one endpoint, two credential types, signed identity header, unconditional header scrub, defense-in-depth (not the authz boundary), not the budget point.

**Group 4 — PDP decision endpoint** (§5): `(principal, action, resource, context)` → `permit|deny` (+ reason); Cedar + Redis PIP; `forbid` overrides `permit`.

**Group 5 — Budget & policy admin** (§6): identity CRUD (create/disable principals; register per-agent client public JWKS; rotate/revoke the per-agent signing key); role/scope grants (**grant-validation is the SSD enforcement point, §3.5**, over the inherited set; agent roles carry zero credential scope structurally); budget policy (compute/rate/concurrency/cooldown; no dollars).

**Group 6 — Revocation, kill-switch & break-glass admin** (§7): revoke token/principal (RFC 7009 + denylist + disable flag); global kill switch (identity-layer kill; physical bite at Gateway); break-glass (operator override, heavily audited, HA-motivating).

### 9.2 Surface B — thin agent / MCP surface

Agents interact with `auth` **overwhelmingly via the OAuth `token` endpoint, not MCP tools** — they receive and present tokens; they do not manage identity. Deliberately minimal (keeps the agent attack surface tiny; no agent can widen its own scope — Stage-7 "cannot escalate"). MCP `2025-11-25` standardizes the *interactive* path; the agent client-credentials path is only acknowledged (MAY), so these tools rest on general OAuth 2.1.

| MCP tool | Does | Explicitly does NOT |
|---|---|---|
| `whoami` | own `sub`, roles, effective scopes, requestable audiences, budget headroom | see other principals |
| `authorize_check` | dry-run `(self, action, resource)` before acting (avoid burning a cooldown/slot on a would-be deny) | check on behalf of another principal; mint anything |
| `introspect_self` | freshness/validity of the agent's **own** presented token | introspect another principal's token |
| `budget.self` (read-only) | own effective caps + live usage (self-throttle) | mutate anything |

Hard constraints: read/self only; `principal` always forced to the caller; token acquisition out-of-band via `token`; these tools are themselves scoped (`auth:self`) and audience-bound to `auth`. **No agent tool creates/disables/grants/revokes/edits budgets** — an agent widening its own budget would be self-escalation, forbidden by decision #4 and §3.5.

### 9.3 Surface C — operator UI

A single operator manages **both** humans and agents as principals over the **same** store — sibling, not a separate admin DB. Every UI action is a Core API call (Groups 5–6) landing in the audit log. Areas: **Identities** (create/disable; per-agent signing-key lifecycle), **Roles & scope grants** (with live SSD prevention — see below), **Budgets** (compute/rate/concurrency/cooldown, no dollars; live headroom beside static limit), **Revocation & kill switch** (revoke; global kill with confirmation friction; live denylist), **Break-glass** (forces a reason; audited + flagged), **Audit / "who did this"** (authoritative cross-suite view, filter by `sub`/`client_id`/`aud`/action, correlate via `traceparent`).

**SSD conflict-set enforcement in the UI (must PREVENT, not just detect):** the UI makes granting a conflicting pair impossible at input time (the API rejects it, §3.5; the UI mirrors it). It blocks `gateway:execute` when `board:approve` is (effectively/inherited) held and vice-versa, any second holder-scope in 4-way mode, any `vault:*` credential scope for an agent principal, and any role whose *inherited* permissions would create a conflict (over the full downward-transitive affected set) — showing which existing grant/role conflicts and why. **The four holder ConflictPairs are immutable and cannot be edited or deleted through the UI/Core API at all (§3.5, finding 4a);** relaxing them requires the offline break-glass + two-person control. The UI also **cannot flip `Principal.kind` after creation** and cannot grant a `kind=break_glass` principal a normal online token (finding 4f). **Admin MCP** siblings the same ops (human/operator tokens only): `budget.get/set/reset`, `budget.break-glass(principal, override, ttl)`.

### 9.4 Siblings over one state (the invariant, concrete)

Neither surface is downstream of the other — both call Groups 1–6; a principal created in the UI is immediately visible to `whoami`; a budget spent via an agent's tool-call is immediately visible in the UI's live-headroom view, because both read the same store. Every *other* app is a client of Group 1 (get/validate tokens), Group 3 (forward-auth via proxy), and Group 4 (PDP on destructive paths) — which is why `auth` is Critical-infra with an HA target (fail-closed makes it a suite-wide hard dependency).

---

## 10. IdP finalist recommendation + Build-spike go/no-go

Decision #1 is settled (adopt an existing AS). The chosen product is the **AS + principal store only** (issues tokens, holds identities, exposes JWKS / `/revoke` / `/introspect`); it is *not* the PDP, budget store, or verify endpoint.

### 10.1 Scored comparison (weighted; crypto/SoD axes dominate)

| Axis (weight) | Keycloak | Zitadel | Ory (Hydra+Kratos) | Authelia | Authentik |
|---|:---:|:---:|:---:|:---:|:---:|
| asymmetric machine id (18) | 5 | 5 | 5 | 2 | 3 |
| per-resource audience (16) | 3 | 3 | 4 | 2 | 2 |
| revoke + introspect (14) | 5 | 4 | 5 | 2 | 3 |
| per-client short TTL (10) | 5 | 3 | 4 | 4 | 1 |
| DPoP / mTLS-bound (10) | 5 | 2 | 3 | 1 | 2 |
| forward-auth fit (8) | 3 | 3 | 2 | 5 | 4 |
| built-in audit (8) | 3 | 5 | 2 | 2 | 3 |
| custom budget claims (6) | 4 | 4 | 3 | 3 | 3 |
| homelab footprint (6) | 2 | 4 | 2 | 5 | 2 |
| maturity (4) | 5 | 4 | 4 | 3 | 3 |
| **Weighted total (/100)** | **82.4** | **74.4** | **74.4** | **52.4** | **51.2** |

### 10.2 Recommendation

**Finalist: Keycloak** (pinned ≥ 26.4, on Postgres). Every high-weight cryptographic requirement is a **known-present, documented capability** (asymmetric `private_key_jwt` + per-client JWKS, `/revoke` + `/introspect`, per-client TTL override, **DPoP GA + mTLS cert-bound**) — for the SoD substrate, "we already know it works" is itself a security property. Its one genuine weakness — **no native RFC 8707** — is a known, bounded, testable workaround (audience mappers + client scopes, which R§6 reframes as the *actual* per-app SoD enforcement point), converted into the **#1 go/no-go gate (G3)** and a Stage-7 conformance test. Token exchange (RFC 8693) is **disabled by default**; if ever enabled it is bounded by the no-widening / no-holder-scope invariant + §3.5 check over its output (§5.4, G7). Keycloak's native admin role/client-scope assignment for holder scopes is **locked down** so `auth`'s Core API is the sole holder-scope grant path (finding 4c). Footprint/audit losses are acceptable (our own append-only audit sink + git-backed trail satisfy "who did this" regardless).

**Fallback: Zitadel** (Go single binary + Postgres) — promoted if Keycloak fails an un-mitigable gate (most plausibly G3 audience-mapper correctness or G9 footprint/HA). Chosen over the equally-scored Ory because native **event-sourced audit** serves "audit is truth," a single Go binary better fits homelab HA, and it avoids Ory's assembly tax (no user store, hand-built consent UI). Its unknowns (native RFC 8707, DPoP/mTLS, per-client TTL, RFC 7009 exactness) become **its** gating spike items — not adopted sight-unseen. **Reference-only:** Ory (standards-pure, assembly-heavy); **Authelia** retained *only* as the reference contract for the §8 verify endpoint's dual-credential behavior; **Authentik eliminated** (single-secret-per-provider, 360-day default TTL).

### 10.3 Build-spike Go/No-Go gate

Stand up the finalist in the compose stack; each gate is a hard pass/fail. **Any un-mitigable NO-GO on G1, G3, G4, or G9 rejects Keycloak and promotes Zitadel** (which re-runs this matrix).

| Gate | Must PROVE | NO-GO condition |
|---|---|---|
| **G1** | Per-agent asymmetric identity, per-client JWKS, no shared secret; agent A's key cannot mint agent B's token; per-client key **rotation** (new JWKS, revoke old); **agent A's key cannot be exfiltrated to mint tokens off-host** — for any holder/destructive principal the key is **hardware-bound / non-exportable (TPM/HSM)** and mint is **origin-bound** (finding 1a/1b) | any forced shared-secret path, or a single global JWKS, **or a soft-key (exportable) executor/holder configuration**, or no way to bind a mint to an expected origin |
| **G2** | Per-client access-token lifespan ≤ 5 min independent of realm default | TTL only settable realm-wide |
| **G3** (headline) | `aud`=Board token rejected at a Gateway RS; **one client cannot obtain a token whose `aud` spans both Board and Gateway**; audience-mapper config makes holder audiences non-overlapping by construction | a single token carries two holder audiences, OR audience uncoercible per target |
| **G4** | Revoke via `/revoke`; `/introspect` returns `active:false` **sub-second**; disabling an agent **blocks new mints sub-second across ALL `auth` replicas, including under writer failover / replica lag** (read-your-writes mint path, finding 1d); **introspect returns `active:false` (never `active:true` from signature alone) when its own Redis is unreachable**, answering correctly from the durable mirror (finding 2c) — load-test the durable read | no working introspection; revoke misses the kill latency target; **a lagging replica keeps minting for a disabled agent**; or introspect fail-OPENs on its own Redis loss |
| **G5** | Sender-constrained token (DPoP `cnf.jkt` or mTLS `cnf.x5t#S256`); replay without key/cert rejected; **the proof key resides in the SAME non-exportable store as the client-assertion key** (finding 1c); if mTLS, proxy forwards the thumbprint (§8.2) | neither path works end-to-end. **Deferral allowed ONLY for read-only / planner agents that hold no holder scope.** For **executor / destructive principals, end-to-end sender-constraining is a hard NO-GO gate, NOT deferred hardening** (finding 1c) |
| **G6** | Custom budget claims (`max_concurrency`, `cooldown_class`) appear in the minted token for the PDP/PIP | custom claims cannot be mapped onto machine tokens |
| **G7** | `auth`'s issuance-policy layer **rejects** any grant giving one principal both `board:approve` and `gateway:execute` (§3.5) — **and there is NO alternative uninterposed grant path** (findings 4b/4c): (a) direct holder-scope role/client-scope assignment in the IdP admin console+API is **locked/disabled** and any IdP drift is denied at every PDP by the Cedar `forbid`; (b) **RFC 8693 token exchange is OFF by default**, and if enabled cannot emit/delegate any of the four holder scopes and runs its effective output through the §3.5 check | any uninterposed grant path exists (IdP-native assignment reaches a token, or token exchange yields/crosses a holder scope) |
| **G8** | Caddy (≥ 2.11.2) / Traefik (≥ v2.11.43/v3.6.14) forward-auth against our verify endpoint: bearer validates via JWKS **offline** on benign path; client-supplied identity header **unconditionally stripped** even on 200-without-header (§8.6) | cannot build a working verify endpoint, or header scrub not proven proxy-agnostically |
| **G9** | IdP + Postgres within the homelab envelope; concrete HA target + break-glass documented (decision #3) | requires clustered infra (mandatory k8s) we won't operate |
| **G10** | Benign calls validate JWT **offline via JWKS**; SoD-critical/destructive paths do a **live, uncached** introspection/denylist check (decision #2) | cannot separate offline-benign from live-checked destructive |

**Finalist-specific verify-at-build folded into the spike:** Keycloak default dev DB is `dev-file` → spike and prod run Postgres (G9); confirm DPoP GA on the exact pinned image (G5); confirm per-client TTL override exists (G2); confirm no native RFC 8707 still holds and the mapper is the only path (G3); confirm the exact grant shape (Keycloak `client_credentials`+assertion vs Zitadel `jwt-bearer`) — **not portable**, so isolate token acquisition behind one internal `auth`-client adapter from day one; confirm `typ: at+jwt` (SHOULD) and `sub` MAY == `client_id`.

---

## 11. Sequencing (API-first) + dependencies on other apps

**Build order within `auth`** — API-first per PROCESS Stage 4 (core service → MCP surface → UI):

1. **Durable store + identity data model** (§3): `Principal`/`Scope`/`Role`/`RoleScopeGrant`/`RoleHierarchy`/`PrincipalRoleAssignment`/`ConflictSet` + the SSD grant-time check. Load-test SQLite single-writer.
2. **IdP finalist bake-off + go/no-go** (§10) — must pass G1/G3/G4/G9 before locking anything downstream; the token-acquisition adapter is written against the chosen grant shape.
3. **Core API Groups 1–2** (§9.1): AS endpoints (adopted), token model, JWKS, per-agent client registration + signing-key lifecycle, multi-audience minting.
4. **Revocation store + denylist propagation** (§4.6): Redis pub/sub `auth:revocations`, epoch heartbeat, RS revocation-cache client contract, resync-on-reconnect.
5. **PDP (Cedar) + PIP** (§5) + the Cedar `forbid` SSD guardrail (unit-tested); PDP decision endpoint (Group 4).
6. **Budget policy + Redis counter primitives** (§6): GCRA rate, leased semaphore + **Redis-independent in-process concurrency floor** (finding 2b), cooldown, **admission-time idempotency claim + fencing tokens** (finding 3a), the **fourth lifetime/liveness dimension + MC no-progress detector** (finding 5b); the shared per-tool-call enforcement middleware; Mission Control binding (global WIP + kill-switch flag).
7. **Forward-auth verify endpoint** (§8) + the mandatory proxy-agnostic regression test (§8.9), incl. the advisory-header + traceparent-attribution tests (findings 5e/5f); server-generated authoritative `traceparent`.
8. **Kill-switch + HA + break-glass** (§7): graduated G0/G1/G2, two-layer stop, **Redis-independent kill (JWKS-`kid`-prune + signed kill epoch) + emergency Redis/JWKS-first kill write path** (findings 2a/2d), active-active `auth` with **the destructive introspect/PDP plane isolated from the verify plane + load-shedding/circuit-breaker + global destructive admission cap** (finding 3b), **mint-anomaly auto-freeze** (finding 1b), offline break-glass factor (STOP/RESTORE only, finding 5a).
9. **MCP surface** (§9.2, thin) and **operator UI** (§9.3) — siblings over the same Core API.
10. **Stage-5/7 conformance** (Critical-infra, cannot exit on a light checklist): (i) `auth` refuses every conflicting grant (§3.5) — including the **empty-role-then-hierarchy-edge staging attack** over the full affected-set fan-out (finding 4e), and the admin API **refuses to delete/weaken any holder ConflictPair** (finding 4a); (ii) Cedar `forbid` denies a synthetic dual-scoped principal; (iii) **both** the Board **and** the PDP independently reject `proposer_id == approver_id`, and disabling either still denies (finding 5c); (iv) forward-auth header-scrub proxy-agnostic test + **no RS authorizes off any advisory `Remote-*` header** (finding 5e) + **client `traceparent` never becomes the attribution key** (finding 5f); (v) destructive class fails closed on Redis loss **and introspect denies a revoked token with `auth`'s Redis unreachable** (finding 2c); (vi) kill-switch halts admission suite-wide while the Gateway stop stays independent, **and the operator can still STOP with (a) only Redis down and (b) only the SQLite writer down** (findings 2a/2d); (vii) an agent cannot widen its own budget or scope or assume another principal, **and a stolen executor identity cannot acquire `board:approve` or `vault:read-credential` via any mint request** (finding 1f), **and RFC 8693 cannot exchange a benign token into any holder scope/audience** (findings 4b/5d); (viii) sub-second denylist SLO under fan-out; (ix) severed-subscriber RS denies `gateway:execute` once past `fresh_until`; (x) **a soft-key executor configuration is rejected at assignment time** (finding 1a); (xi) **an off-host mint burst trips mint-anomaly auto-freeze** (finding 1b); (xii) **a second execute of an already-executed ticket (fresh idempotency key) is denied `approval_consumed`** (finding 1e); (xiii) **a slow-PDP + lease-reap + retry cannot double-execute** (admission claim + fencing, finding 3a) and **a permit aged past drift bound D is re-checked or denied at the irreversible instant** (finding 3c); (xiv) **a break_glass principal cannot obtain approve+execute via the normal online token/PDP path**, and **a single break-glass factor cannot alone produce an executed destructive action** (findings 4f/5a); (xv) **a verify-flood cannot starve the isolated destructive introspect/PDP plane** (finding 3b).

**Dependencies on / from other apps:**
- **`proxy`** consumes the §8 forward-auth contract; `auth` needs the proxy's public hostname/TLS **finalized before human passkey registration** (origin-bound). `auth` needs proxy HA + the header-scrub guarantee.
- **`board`** owns the per-ticket `proposer_id != approver_id` four-eyes check against `auth`'s authoritative `sub`; publishes its risk manifest; consumes `board:*` scopes + PDP.
- **`cmdb`** supplies tier/window facts to the PDP (PIP) on the Gateway execute path; consumes `cmdb:*` scopes.
- **`vault`** is the sole holder of `vault:read-credential` (via `svc:gateway`); honors the denylist as an independent second consumer before releasing creds.
- **`gateway`** is the L2 physical stop and the sole `vault.redeem_handle` caller; re-checks the kill flag on long playbooks.
- **`mission-control`** owns the global kill switch + WIP controls over the **shared** `auth`-owned budget policy + Redis counters (§6.7); provides the operator kill-switch UI that fans out to L1 + L2.
- **Every app** is an RS: publishes RFC 9728 metadata, validates `aud`=self, runs the shared PEP middleware, consults the revocation store on live-check paths, and declares its risk + action-class manifests.

---

## 12. Residual risks (adversarial review)

A 5-way adversarial red-team ran against this plan (stolen agent token + stolen signing key; auth/Redis unavailable; slow introspection / live-check latency; prove-approve-XOR-execute; general privilege-escalation / confused-deputy). **27 findings** were returned. Each is dispositioned below as **RESOLVED** (with where/how the plan now handles it) or **ACCEPTED** (with the explicit reason it is acceptable for homelab-scale Critical-infra). **All 13 high-severity findings are RESOLVED; none is merely accepted.** The 14 medium/low findings are RESOLVED except three explicitly-ACCEPTED availability/operability residuals of the *safe* (stopping) direction.

### 12.0 SoD PROOF — no single principal or token can hold both approve and execute (red-team verdict: HOLDS)

**Claim:** no single principal, single token, or single real-world actor can hold both an authorization-side holder scope (`board:approve` / `cmdb:write-policy`) and an action-side holder scope (`gateway:execute` / `vault:read-credential`).

**Mechanism (why it holds), post-fix:**
1. **At rest:** the approve-XOR-execute ConflictSet is enforced at grant time over the **full downward-transitive affected set** of every widening mutation (§3.5, finding 4e), so no principal can *hold* a conflicting pair — it can therefore mint neither one dual-scoped token nor two single-audience tokens (it never holds the second scope).
2. **Immutable:** the four holder ConflictPairs + their Cedar `forbid` are **hardcoded**, not operator-editable — a single operator cannot delete a pair and self-grant both (§3.5, finding 4a). Relaxing them requires offline break-glass + two-person control.
3. **No uninterposed grant path:** the IdP's native admin assignment for holder scopes is locked down (Core API is the sole holder-scope granter, finding 4c), and RFC 8693 token exchange is off-by-default and may never emit/delegate a holder scope (findings 4b/5d). Any drift is denied at every PDP by the `forbid`.
4. **At use:** per-audience tokens mean no token spans two holder audiences (G3); the Cedar `forbid` overrides `permit` for any hypothetical dual-scoped token.
5. **Break-glass no longer concentrates:** `role:break-glass` holds **no action-side holder scope** (§3.4, finding 5a), so even a leaked offline factor cannot approve-then-execute as one actor — execution still needs a distinct approver + the independent Gateway chain.
6. **Trust-boundary level:** holder-credential principals run in isolated trust domains with keys unreachable by agents (finding 4d), so one *host* cannot span approve+execute either.
7. **Per-ticket four-eyes** (`proposer_id != approver_id`) is enforced by the Board **and** independently backstopped by the PDP — neither sufficient alone (finding 5c).

**Residual (bounded, ACCEPTED):** a compromised executor, **until its key is revoked**, can execute already-approved, in-window work *on its own target host* — but **cannot approve, cannot widen scope, and cannot read Vault plaintext** (finding 1f). This residual is shrunk by mandatory non-exportable executor keys (1a), mint-anomaly auto-freeze (1b), single-use approvals (1e), and the existing CMDB in-window + per-host-mutex + destructive-concurrency=1 gates.

### 12.1 Attack: stolen agent token + stolen per-agent signing key

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1a | high | Non-exportable key storage was optional for executors — the only agents holding a destructive scope | **RESOLVED.** Hardware-bound / non-exportable (TPM/HSM) key storage is now **MANDATORY** for any principal whose effective closure contains a holder/destructive scope; a soft-key executor is a build-spike NO-GO (§3.6, §3.7 invariant, G1). |
| 1b | high | Nothing detected abusive re-minting — theft window unbounded in time | **RESOLVED.** Automated **mint-anomaly detector** at `/token` (baseline rate + expected origin; off-host/new-origin/rate-spike ⇒ trips `freeze-destructive`/auto-revokes the key in the safe direction), plus **mint-origin binding** (§3.6, §7.8, Stage-7 xi). |
| 1c | high | Containment overstated DPoP/mTLS; G5 permitted deferring sender-constraining | **RESOLVED.** §4.2/§4.5 corrected to state sender-constraining does NOT contain host/key compromise; the DPoP/mTLS proof key must live in the SAME non-exportable store; **G5 deferral forbidden for executor/destructive principals** (hard NO-GO), allowed only for read-only/planner agents. |
| 1d | medium | Under HA, mint path could read stale client status (replication lag) and keep minting for a disabled agent | **RESOLVED.** `/token` client-enabled/`AgentKey`-status check is **strongly consistent (read-your-writes)** with a staleness bound, fail-closed if it cannot confirm epoch; folded into G4 ("blocks new mints sub-second across ALL replicas, incl. under writer failover") (§3.6, §7.6). |
| 1e | medium | Approved tickets were not single-use — a fresh idempotency key re-triggered an approved plan | **RESOLVED.** New obligation **`consume_approval(ticket)`**: Board transitions `approved → executing → done/failed`; PDP permits `gateway:execute` only in the executable state; second execute denied terminal `approval_consumed` (§5.3, §5.5, §7.4, Stage-7 xii). |
| 1f | low | Confirm-and-state the boundary that holds (single compromise cannot widen/self-approve/read Vault) | **RESOLVED (documented).** Stated explicitly in §12.0 residual + Stage-7 test (vii): a stolen executor identity cannot acquire `board:approve` or `vault:read-credential` via any mint request. |

### 12.2 Attack: auth / Redis unavailable

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 2a | high | Redis-down defeated the kill switch AND its break-glass buy-back — benign+write of a compromised agent unstoppable in-band | **RESOLVED.** Break-glass AS-key rotation is now a **true Redis-independent kill** (RS rejects any `kid` not in current JWKS; polls JWKS ≤ 30 s + on sig failure); kill epoch/level also **signed into JWKS/AS-metadata/forward-auth header**; freeze-flag read **fails closed under an explicit quiesce posture** (§4.2, §5.1, §6.6 step 0, §7.3). |
| 2b | high | Concurrency semaphore (primary anti-runaway lever) was purely Redis-resident and fail-open for read/write/propose | **RESOLVED.** Added a **Redis-independent in-process concurrency floor** (per-`sub` + per-process) always on; Redis-down benign classes are **allow-but-locally-bounded, not unbounded**, + coarse local rate clamp (§6 invariant 4–5, §6.1 dim 2, §6.2). |
| 2c | high (SoD) | `/introspect` behavior under its OWN Redis loss unspecified — risked fail-OPEN on Gateway execute / Vault redeem | **RESOLVED.** Introspection **MUST return `active:false` (or 5xx), never `active:true` from signature alone**, when it cannot read authoritative revocation state; the **durable mirror is wired as the authoritative fallback read** (Redis-down ⇒ degraded-but-correct); load-tested (§4.6, §9.0, G4, Stage-7 v). |
| 2d | medium | Kill/revoke WRITE path funneled through one SQLite writer + Redis — could block the operator's STOP | **RESOLVED.** Revoke/kill write path gets its own HA: **emergency Redis/JWKS-first kill** that reconciles the durable ledger async, and the **Postgres replicated ledger before Critical-infra exit**; behavior defined + Stage-7 tested for only-Redis-down and only-writer-down (§7.3, §7.6, Stage-7 vi). |
| 2e | medium | During a Redis outage NO SoD-governed destructive action is possible in-band, incl. emergency remediation | **ACCEPTED.** This is the **safe (stopping) direction** and is structurally correct (fail-closed on all four holder actions). Reason acceptable: a runaway/compromised agent acting while blind is strictly worse than a few minutes with no in-band destructive path at homelab scale. Compensated by an **out-of-band manual operator runbook** (Stage-7 deliverable) for legitimate emergency remediation. Sub-risk: under G2 with Redis down, already-issued benign tokens keep validating for **≤ one agent TTL (≤ 2 min, §4.2)** until the JWKS-`kid`-prune (2a) bounds them — accepted and bounded (§7.5, §7.7). |

### 12.3 Attack: slow introspection / live-check latency

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 3a | high | Slow PDP + lease-TTL expiry + retry ⇒ DOUBLE EXECUTION of an irreversible action (no fencing token) | **RESOLVED.** **Admission-time idempotency claim** (`SET NX` PENDING before PDP ⇒ concurrent/retry sees PENDING ⇒ `409 in_progress`) + **fencing tokens** (host action rejects any fence older than the current holder's); the semaphore is explicitly NOT the double-exec guard (§5.3, §6.4, §6.6, §7.4, Stage-7 xiii). |
| 3b | high | Live check weaponizable as a suite-wide DoS — destructive plane co-located with the per-request verify plane, no isolation/shedding | **RESOLVED (mitigations) + ACCEPTED (residual self-inflicted outage).** Destructive introspect/PDP plane **physically isolated** from `/api/verify` (separate pools/replicas/priority queue); **bounded-concurrency load-shedding + circuit-breaker + alerted DEGRADED state**; **global destructive-class admission cap**; PIP fan-out capped/circuit-broken independently (§7.6). The remaining "a flood fail-closes execution (safe for SoD, but a self-inflicted mission outage)" is **ACCEPTED** with a recovery runbook — because fail-closed is the correct SoD direction and full DoS-proofing is out of scope at homelab scale (§7.5). |
| 3c | medium | `decision_ttl=0` / drift bound under-specified — a slow-PDP permit is stale when it returns (TOCTOU) | **RESOLVED.** `decision_ttl=0` replaced with a concrete numeric **drift bound D (default 1 s)** tied to the ~250 ms live-check + <1 s propagation; at the irreversible instant, if `(now − revocation_check_ts) > D` the PEP **re-runs the authoritative live check or DENIES** (not merely a local kill-flag poll); `revocation_fresh_at(ts, D)` is numeric/testable (§5.3, §7.4, Stage-7 xiii). |
| 3d | low | Propagation-race asymmetry (approve/cmdb read pushed cache, not authoritative) + unpinned revoke write-ordering | **RESOLVED.** `revoke` is **acknowledged only after durable ledger + authoritative Redis SET commit (write-before-ack)**; `board:approve` and `cmdb:write-policy` live checks **upgraded to authoritative-Redis reads** like Gateway/Vault, closing the sub-second approver-revocation window (§4.6, §4.7). |

### 12.4 Attack: prove-approve-XOR-execute

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 4a | high (SoD) | ConflictSet was operator-editable — a single operator could delete the pair and self-grant both | **RESOLVED.** The four holder ConflictPairs + Cedar `forbid` are **immutable/hardcoded**; the admin API cannot delete/weaken them; any relaxation is gated behind offline break-glass + two-person, audited + broadcast (§3.5, §9.0, §9.3, Stage-7 i). |
| 4b | high (SoD) | RFC 8693 token exchange was an uninterposed runtime authority-minting path | **RESOLVED.** Exchange is **OFF by default**; if enabled, its effective output runs through the §3.5 ConflictSet check and it may **never emit/delegate any of the four holder scopes**; depth bounded to 1 (§5.4, G7, Stage-7 vii). |
| 4c | high (SoD) | The IdP's native admin role-assignment was a second uninterposed grant path | **RESOLVED.** IdP-native holder-scope assignment **locked down / disabled**; Core API is the **sole** holder-scope granter; continuous drift reconciliation + PDP `forbid` catches any drift at use; **G7 elevated** to prove NO alternative uninterposed path (§3.5 guarantee 4, §5.4, §10.2). |
| 4d | medium (SoD) | `svc:tier-approver` auto-approval + unspecified key isolation let one host span propose→approve→execute | **RESOLVED.** `svc:tier-approver` auto-approval is **impossible for destructive-exec/high-tier** work (those always require human four-eyes); **holder-credential trust-domain invariant** added (holder keys unreachable by agents, no executor code on holder-credential hosts) (§3.4, §3.7, Stage-7 both). |
| 4e | medium (SoD) | §3.5 fan-out under-specified — role/hierarchy mutations must recompute the full transitive affected set | **RESOLVED.** Algorithm now defines `AFFECTED(M)` = **full downward transitive closure** of the mutated role; rejects atomically if ANY affected principal would hold a ConflictPair; empty-role-then-edge staging attack is caught at the edge insert (§3.5, Stage-7 i). |
| 4f | medium (SoD) | `break_glass` `kind` mutation / normal-online-token issuance unguarded | **RESOLVED.** `Principal.kind` is **immutable after creation**; a `kind=break_glass` principal is **never issuable a normal online token** (authority only via the offline factor); creating/assigning any break_glass principal is itself break-glass/two-person gated (§3.5, §3.7, §7.7, Stage-7 xiv). |

### 12.5 Attack: general privilege-escalation / confused-deputy

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 5a | high (SoD) | Break-glass concentrated approve+execute; "structurally impossible" was false; compensating control deferred | **RESOLVED.** `role:break-glass` now holds **NO action-side holder scope** — restricted to STOP + RESTORE (§3.4); the false "structurally impossible" wording is deleted and replaced with a structural guarantee (break-glass cannot execute at all); a single break-glass factor cannot alone produce an executed destructive action (§7.7, Stage-7 xiv). |
| 5b | high (SoD) | Never-terminating agent (named failure mode) unbounded on the benign read/plan path | **RESOLVED.** Added a **fourth budget dimension — lifetime/liveness**: per-agent wall-clock/compute budget + an **MC-owned no-progress detector** with concrete triggers (N tool-calls without a state-advancing action, or T minutes without progress) that auto-arms `sub`-scoped freeze; degraded-mode reads are locally bounded and auto-escalate to G2 (§6 invariant 6, §6.1 dim 4, §7.8, Stage-7 loop test). |
| 5c | medium (SoD) | Self-approval ownership stated two ways (Board vs PDP) — possible no-owner gap | **RESOLVED.** **Board is the enforcing owner; the PDP independently re-checks `sub != proposer_id` as a tested backstop** using Board-supplied `proposer_id` via the PIP — neither sufficient alone, both must permit; disabling either still denies (§3.5, §5.5, Stage-7 iii). |
| 5d | medium (SoD) | RFC 8693 not bounded by a no-widening / no-SoD-crossing invariant | **RESOLVED.** Same fix as 4b — exchange disabled by default; if enabled, no scope outside the subject's effective grant, no holder audience the subject can't reach, §3.5 check over the effective output, depth 1 (§5.4, G7). |
| 5e | medium (SoD) | Advisory `Remote-*` headers forwarded to every upstream, re-creating CVE-2026-30851 behind the door | **RESOLVED.** Default is to **NOT emit** `Remote-*`; everything authoritative rides the signature-verified `X-Auth-Identity` JWT; if kept for display, every RS strips/ignores them and authorizes only off the verified signature + its own audience-bound token; promoted to a **suite-wide Stage-7 conformance test** (§8.7, §8.9, Stage-7 iv). |
| 5f | low | Client-propagated `traceparent` trusted for audit correlation — forensic misattribution | **RESOLVED.** Authoritative `traceparent` is **server-generated by proxy/`auth` and bound to the validated `sub`**; inbound client value recorded only as `claimed_parent`, never the attribution key (§4.3, §8.7, §8.9, Stage-7 iv). |

### 12.6 Disposition summary

- **Total findings:** 27. **RESOLVED: 24. ACCEPTED: 3** (all three are safe-direction availability/operability residuals: 2e no-in-band-destructive-during-Redis-outage; 2e sub-risk ≤2-min benign-token window; 3b DoS-to-fail-closed self-inflicted outage). Finding 3b is counted RESOLVED for its mitigations with an explicitly accepted residual.
- **High-severity findings:** 13 — **all RESOLVED, none merely accepted** (1a, 1b, 1c, 2a, 2b, 2c, 3a, 3b, 4a, 4b, 4c, 5a, 5b).
- **SoD verdict:** approve-XOR-execute **HOLDS** (see §12.0) — no single principal, token, or actor can hold both an authorization-side and an action-side holder scope, enforced at rest (immutable ConflictSet over the full affected-set), at grant (sole Core-API path, exchange bounded), at use (per-audience + Cedar `forbid`), and at the trust-boundary (isolated holder credentials), with break-glass no longer concentrating the pair.
- **Preserved build-spike / verify-at-build items:** all §10 gates (G1–G10, now hardened), the finalist bake-off (Keycloak → Zitadel fallback), audience-mapper correctness (G3), DPoP GA + non-exportable-key attestation (G1/G5), per-client TTL (G2), read-your-writes mint + durable-mirror introspect load-test (G4), forward-auth CVE pins (G8/§8.9), grant-shape non-portability adapter, and the §8 cookie CSRF / mTLS-header VERIFY-AT-BUILD flags — none silently resolved.
