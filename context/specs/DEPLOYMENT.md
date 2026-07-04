# SPEC — Root Deployment Topology (authoritative)

> **Status:** AUTHORITATIVE. Promotes proxy PLAN §10's topology to suite level and pins the values every app's Stage-4 exit criteria cite ("runs in its own container behind the proxy, authenticates via the auth gateway" is testable only against this). Closes gap 3.1; carries the east-west network invariant of ARCHITECTURE.md §11. Referenced from ARCHITECTURE.md §13 and PROCESS.md Stage 4.

## 1. Networks (per-tier — supersedes the flat single-network reading of proxy PLAN §10)

| Network | Members | Purpose |
|---|---|---|
| `edge` | proxy + every app container that serves a subdomain | proxy → app routing; auth verify subrequests. **Only the proxy publishes host ports** (`:443`, `:80` redirect). App containers publish **no host ports**. |
| `creds` | **vault + gateway ONLY** | the credential-release hop. The Vault→Gateway plaintext handoff never traverses `edge`; mutual auth on this hop per ARCHITECTURE.md §11. No Standard-class container ever joins. |
| `data_<app>` (optional, per app) | one app + its private store (e.g. auth + its Postgres/Redis) | keeps private backing stores off `edge`; never shared across apps |
| `data_vault` | **vault wrapper + `vault_openbao` + `vault_unsealer` ONLY** (added at Vault Stage-2 / root REVIEW #2, 2026-07-03) | the OpenBao engine's mTLS listener binds this interface and is **unreachable from `edge`** (build-failing invariant, Vault PLAN §2.2); the wrapper joins `edge` (UI/MCP) + `creds` (redeem only) + `data_vault`; the engine + unsealer join `data_vault` only |

Rules: subdomain label == auth audience segment == compose service name (proxy PLAN §10 hard constraint — host→audience is mechanical). The proxy's `:9100` observability listener stays internal to `edge` (proxy OBSERVABILITY.md).

## 2. Container names and internal ports

| Service | Compose/DNS name | Internal port | Notes |
|---|---|---|---|
| proxy | `proxy` | 443/80 published; 9100 internal | only host-published service |
| auth | `auth` | **8089** | as built — `AUTH_PORT=8089` in auth's compose. **`AUTH_VERIFY_PORT=8089` is the ONE correct value** (see §4) |
| board, notes, drive, chat, pdf, library, cmdb | own name | **8080** | suite convention (Caddyfile `import app <name>:8080`) |
| mission-control | **`mc`** | 8080 | **renamed by ratified D-3 (2026-07-02):** service/subdomain/audience are all `mc`, matching built auth's audience segment (PLAN §3.2) and the §1 subdomain==audience==service rule. The directory stays `apps/mission-control/`; only the runtime name is `mc` |
| gateway, vault | own name | 8080 | also join `creds` |
| agent-runtime | `agent-runtime` | **8080** (pinned at agent-runtime Stage-2, 2026-07-04 — was "TBD in its research") | joins `edge` for outbound MCP/API calls to the suite + the SSE heartbeat producer to `mc`; **never joins `creds`**. Serves the operator **Engine-Room status UI** at `agent-runtime.<SUITE_DOMAIN>` behind the proxy **forward-auth (operator identity only)** — it exposes **no agent audience and no agent scopes** (`auth-apps-tokens-scopes.md` §3: "No RS scopes; it hosts agents"), so the subdomain==audience==service rule (§1) is satisfied trivially (no agent audience to bind); the one cross-app *inbound* surface is the Library `embed()` facade over `edge` |
| chat_ntfy *(sidecar, owner: chat)* | `chat_ntfy` | 80 | **added at Chat Stage-2 per D-10/D-14:** outbound push sink; Chat is its sole publisher; `edge` only, no host ports; proxied at `ntfy.<SUITE_DOMAIN>` (forward-auth-exempt route — ntfy device clients can't OIDC; compensated by deny-all ntfy ACL + tokens; never a suite identity system) |
| mc_prometheus *(sidecar, owner: mc)* | `mc_prometheus` | 9090 internal | **added at MC Stage-2 per D-10:** edge-metrics query layer scraping `proxy:9100`; `edge` only, no host ports |
| mc_blackbox *(sidecar, owner: mc)* | `mc_blackbox` | 9115 internal | **added at MC Stage-2 per D-10:** TLS/cert-expiry probe (`probe_ssl_earliest_cert_expiry`) for the Edge panel; `edge` only |
| mc_logship *(sidecar, owner: mc)* | `mc_logship` | n/a (collector) | **added at MC Stage-2 per D-10 (ownership ratified to MC):** collects container stdout (proxy access logs etc.) into `mc_logstore`; impl recommendation Vector — VERIFY-AT-BUILD |
| mc_logstore *(sidecar, owner: mc)* | `mc_logstore` | 3100 internal | **added at MC Stage-2 per D-10:** the log store MC's BFF tails (Loki-class single binary — VERIFY-AT-BUILD); `edge` + its own volume |

## 3. Shared vs per-app stores

- **Default: SQLite per app**, inside the app's own volume (settled, ARCHITECTURE.md §9). No app ever opens another app's database file or store — cross-app data moves over APIs only. This is load-bearing for SoD (no back-door reads around the Board/CMDB/Vault/Gateway surfaces).
- **auth graduates to its own Postgres + replicated Redis** at Stage 5 (auth settled decision #8). These are **auth-private** (`data_auth` network), not suite-shared infrastructure.
- **INVARIANT EXCEPTION #1 (ratified D-8, 2026-07-02): the Gateway gets a gateway-private Postgres** on a `data_gateway` network — justified by its append-only hash-chained/Ed25519-signed audit table and session-level advisory-lock mutex, neither of which SQLite serves. It is gateway-private like `data_auth`; nothing else ever connects. This is the first and (so far) only exception to SQLite-per-app — recorded here deliberately so it reads as a ruling, not silent drift.
- A suite-shared Postgres exists only if a future genuine shared-data need forces it (§9); it must be introduced by amending THIS spec, not by one app's compose file.
- **Budget-middleware transport — RESOLVED (S5, root REVIEW #2, 2026-07-03):** auth's Redis (which also holds the sod-critical revocation denylist) stays **auth-private on `data_auth`**. Every RS's per-`sub` budget middleware (auth PLAN §6) reaches the shared budget dimensions via an **auth-exposed budget-check / admission API** (same surface as the MC budget read/clamp, auth §6.7) — **RSes never open auth's Redis, and there is NO shared-state budget network.** This preserves the load-bearing SoD invariant above (cross-app data moves over APIs only; no app opens another app's store) and keeps the denylist off every RS's reach. Each RS keeps the Redis-independent **in-process concurrency ceiling** (auth §1) as its always-available local bound; auth/budget-API unreachable ⇒ benign = allow-but-locally-bounded, sod/destructive = 503 fail-closed (auth §6, unchanged). auth owes the budget-check API shape as a Stage-5 deliverable. This resolves `auth-apps-tokens-scopes.md` §11.1 and every app's parked "one shared Redis vs auth-private" flag (Library F14, Notes/Chat/Drive, Vault, CMDB A11, Gateway O5).

## 3a. Sidecar convention (ratified D-10, 2026-07-02)

Stage-1 research legitimately introduced auxiliary containers. Rule: a **sidecar** is owned by exactly one app, named `<owner>_<function>`, joins only the networks its owner's charter requires, publishes no host ports, and is added to the §2 table by a DEPLOYMENT.md amendment **at the owning app's Stage-2** (approved in principle now; each amendment is one row + one line of justification). Approved sidecar set and owners:

| Sidecar | Owner | Purpose |
|---|---|---|
| `chat_ntfy` | chat | self-hosted push sink (Chat is its only publisher; never a second identity system) |
| `mc_prometheus`, `mc_blackbox` | mc | edge-metrics query layer + TLS/cert-expiry probe (edge network) |
| log shipper + log store | **mc** (assignment ratified — was unowned) | collects container stdout (proxy access logs etc.) into the store MC tails |
| `vault_openbao` | vault | the OpenBao 2.5.x engine (crypto/storage/leasing/audit); **`data_vault` ONLY**, mTLS listener bound to that interface, `edge`-unreachable (added Vault Stage-2 / root REVIEW #2, 2026-07-03; internal 8200, no host ports) |
| `vault_unsealer` | vault | minimal second OpenBao for Transit auto-unseal (D-16); `data_vault` only, 8200 |
| off-box WORM audit sink | vault (posture: hardened log host, D-16) | immutable copy of the redemption audit log — physically off the suite host |

## 4. Resolved divergence (the ONE correct values)

| Conflict found | Wrong values | **Correct value** | Why |
|---|---|---|---|
| auth verify port | proxy PLAN §10 + live proxy `.env.internal`/`.env.public` say `8080`; proxy `.env.*.example` templates say `9000` (that is Keycloak's *management* port — a copy error) | **`AUTH_VERIFY_PORT=8089`** | auth's built compose binds `AUTH_PORT=8089` and labels it "proxy → auth forward-auth subrequest"; the built service is the authority |
| pdf-reader network | `proxy_internal` (invented in pdf-reader's compose) | **`edge`** | proxy PLAN §10 named the network before pdf-reader built; one edge network, one name |

Both fixes belong to those components' own next sessions — **recorded as reconciliation items in `context/GAP_REMEDIATION.md`, not edited here** (active work in flight).

## 5. Env-var and volume conventions

- Per-app env vars are prefixed `<APP>_` (e.g. `AUTH_PORT`, `BOARD_DB_PATH`). Cross-cutting values (`SUITE_DOMAIN`, `AUTH_VERIFY_PORT`, `TLS_ISSUER_FILE`, `ACME_EMAIL`) are minted once, here or in the owning app's contract, and consumed by name — never re-derived.
- Committed templates: `.env.example` / `.env.<mode>.example` per app. Real `.env*` files are gitignored (root `.gitignore` already enforces this). A template value must match the authoritative value in this spec — the `9000` template error above is the cautionary case.
- Volumes: named `<app>_data` for state, `<app>_config` where config outlives the container. The Notes markdown corpus is a named volume that is **also a git repository with a configured remote** (ARCHITECTURE.md §10 data durability — a local-only `.git` is a build failure).
- Boot order (from proxy PLAN §10 / auth §8.2): proxy (TLS up) → auth (operator passkey is origin-bound — domain must be final first) → remaining apps attach to `edge` as built.

## 6. Stage-4 exit criterion (cited by PROCESS.md)

An app passes Stage 4 only when it runs attached to the networks named here, on the port named here, under the compose/DNS name named here, resolving auth at `auth:8089` — verified against this spec, not against the app's own restatement of it.
