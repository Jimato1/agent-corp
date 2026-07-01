# SPEC — Root Deployment Topology (authoritative)

> **Status:** AUTHORITATIVE. Promotes proxy PLAN §10's topology to suite level and pins the values every app's Stage-4 exit criteria cite ("runs in its own container behind the proxy, authenticates via the auth gateway" is testable only against this). Closes gap 3.1; carries the east-west network invariant of ARCHITECTURE.md §11. Referenced from ARCHITECTURE.md §13 and PROCESS.md Stage 4.

## 1. Networks (per-tier — supersedes the flat single-network reading of proxy PLAN §10)

| Network | Members | Purpose |
|---|---|---|
| `edge` | proxy + every app container that serves a subdomain | proxy → app routing; auth verify subrequests. **Only the proxy publishes host ports** (`:443`, `:80` redirect). App containers publish **no host ports**. |
| `creds` | **vault + gateway ONLY** | the credential-release hop. The Vault→Gateway plaintext handoff never traverses `edge`; mutual auth on this hop per ARCHITECTURE.md §11. No Standard-class container ever joins. |
| `data_<app>` (optional, per app) | one app + its private store (e.g. auth + its Postgres/Redis) | keeps private backing stores off `edge`; never shared across apps |

Rules: subdomain label == auth audience segment == compose service name (proxy PLAN §10 hard constraint — host→audience is mechanical). The proxy's `:9100` observability listener stays internal to `edge` (proxy OBSERVABILITY.md).

## 2. Container names and internal ports

| Service | Compose/DNS name | Internal port | Notes |
|---|---|---|---|
| proxy | `proxy` | 443/80 published; 9100 internal | only host-published service |
| auth | `auth` | **8089** | as built — `AUTH_PORT=8089` in auth's compose. **`AUTH_VERIFY_PORT=8089` is the ONE correct value** (see §4) |
| board, notes, mission-control, drive, chat, pdf, cmdb | own name | **8080** | suite convention (Caddyfile `import app <name>:8080`) |
| gateway, vault | own name | 8080 | also join `creds` |
| agent-runtime | `agent-runtime` | TBD in its research | joins `edge` for MCP/API calls to the suite; never joins `creds` |

## 3. Shared vs per-app stores

- **Default: SQLite per app**, inside the app's own volume (settled, ARCHITECTURE.md §9). No app ever opens another app's database file or store — cross-app data moves over APIs only. This is load-bearing for SoD (no back-door reads around the Board/CMDB/Vault/Gateway surfaces).
- **auth graduates to its own Postgres + replicated Redis** at Stage 5 (auth settled decision #8). These are **auth-private** (`data_auth` network), not suite-shared infrastructure.
- A suite-shared Postgres exists only if a future genuine shared-data need forces it (§9); it must be introduced by amending THIS spec, not by one app's compose file.

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
