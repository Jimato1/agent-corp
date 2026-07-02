# SPEC — Shared Identifiers (authoritative)

> **Status:** AUTHORITATIVE. Every app session reads this before designing any schema that stores or transmits a cross-app ID. Closes gap 6.2 (`context/GAP_ANALYSIS_2026-07-01.md`). Referenced from ARCHITECTURE.md §13.
>
> **The rule:** every identifier that crosses an app boundary has exactly ONE minting app, ONE format, and a stated validation posture. An app that stores a foreign ID stores it verbatim (opaque string, never parsed for meaning beyond the stated format) and never mints values in another app's namespace. This is what keeps 11 independently-built apps joinable — and what keeps the SoD binding of approval → (host_id, plan_hash) intact.

## The registry

| ID | Minted by | Format | Referenced by | Validation posture |
|---|---|---|---|---|
| `ticket_id` | **Board** | `T-` + zero-padded integer (`T-000123`); Board's row PK | everyone (Notes frontmatter, Drive object keys, Gateway runs, Chat notifications, auth PDP calls) | **Validated** — consumers may check existence via Board API; must never fabricate |
| `approval_id` | **Board** | `A-` + zero-padded integer; one per granted approval, single-use (consumed by `consume_approval`) | Gateway (redeems), auth PDP (checks state), audit trails | **Validated live** — Gateway/PDP must confirm state at execute time, never trust a stored copy |
| `plan_hash` | **Board**, at approval time | `sha256:` + 64 lowercase hex over the canonical plan-slice content (the exact note revision the approval covers) | approval record, Gateway (re-hashes and compares before execution), audit | **Validated by recomputation** — Gateway re-hashes the plan content it is about to execute; mismatch = refuse + escalate |
| `host_id` | **CMDB** | lowercase DNS-safe slug (`nas-01`, `web-prod-02`); CMDB's inventory PK | Board (per-server tickets, resource locks), Gateway (mutex + execution target), Vault (credential handles scoped per host), Wazuh connector | **Validated** — Gateway refuses a `host_id` CMDB does not list as eligible |
| ↳ Wazuh `agent.id` mapping | **CMDB** owns the mapping table | Wazuh's own numeric string, stored as an attribute of the CMDB host record — **never used as `host_id` itself** | Wazuh connector (translates alerts → `host_id`), retro/verification evidence | **Validated at enrollment** — mapping is set when a host is onboarded, not inferred at alert time |
| `agent_id` / `sub` | **auth** | the OIDC `sub` claim of the agent principal; stable for the principal's lifetime | every audit log's "who", Board `claimed_by`, MC liveness, Notes authorship | **Opaque** — consumers store and compare verbatim; only auth resolves it to a principal |
| `run_id` | **Gateway** | `R-` + ULID; one per execution run on one host | Gateway audit chain, Board (attached to the ticket as evidence), Wazuh verification join | **Opaque** to everyone but the Gateway |
| `note_id` | **Notes** | immutable `id` field in YAML frontmatter, set at creation, survives renames (Dendron pattern per Notes research) | wikilink resolution, Board ticket↔note links, ceremony transcripts | **Opaque**; path is the human handle, `id` is the machine handle |
| `doc_id` | **library** | immutable `id` field in the corpus doc's YAML frontmatter (same Dendron pattern); chunk IDs are `doc_id#<n>`, derived, never stored cross-app | retrieval citations, ingestion tickets, verification-evidence links | **Opaque**; citations carry `doc_id` + tier so any consumer can audit what an agent leaned on |
| `edge_req_id` | **proxy** | `{http.request.uuid}` per request | edge log correlation | **Opaque**; joined to `traceparent` at Stage-7, not at the edge |
| `traceparent` | **auth** (authoritative mint, bound to `sub` inside the signed identity header; proxy strips any client-supplied value) | W3C traceparent | cross-app audit correlation | **Opaque**; never client-trusted |
| fencing token / counter | **Board** (it owns the claim/lease; the counter increments per lease grant on a resource) | monotonic integer per locked resource, issued with the lease | Gateway (presents it; stale token = refuse), auth PDP (checks presence, not value) | **Validated by comparison** at the Gateway per-host mutex |

> **Fencing-counter ownership note:** auth's PLAN §5.3 and Board research were found drifting on who owns this counter. This spec assigns it to the **Board** (the lease issuer — a fencing token is meaningless except relative to the lease sequence). auth's PDP treats it as an opaque presence/freshness check. Reconciliation item recorded in `context/GAP_REMEDIATION.md`.

## Rows added by MERGE-RESEARCH-1 (2026-07-02) — IDs the Stage-1 artifacts minted that crossed app boundaries unregistered

| ID | Minted by | Format | Referenced by | Validation posture |
|---|---|---|---|---|
| `op_id` (idempotency key) | **the calling agent/client**, one per logical operation | opaque string (UUID recommended), ≤128 chars | every mutating MCP tool (Board `op_id`), auth's `admission_claim` / `budget:idem:{sub}:{key}`, the Gateway double-execution guard — **one concept, one name**: Board's `op_id` and auth's "idempotency key" are unified here | **Validated by uniqueness** — server collapses replays and returns the prior result / `409 in_progress` |
| kill/revocation **`epoch`** | **auth** (sole writer) | monotonic integer | every RS (`last_epoch` tracking), proxy, Gateway L2, MC read-mirror, agent-runtime drain/kill commands (the command's `epoch` IS this counter) | **Validated by comparison** — monotonic; a lower/stale epoch never un-does a higher one |
| `release_id` | **Vault** | opaque, non-redeemable (must provably NOT be a wrapping token); prefix-typing decided at Vault Stage-2 | Board tickets (agent writes it as a reference), Gateway (presents at redemption), `vault.release_status` | **Validated live** by Vault at redemption; powerless everywhere else |
| credential `handle` | **Vault** | `cred://hosts/<host_id>/<name>` — a powerless application-level URI; consumers never parse it (the embedded `host_id` is display/routing inside Vault only) | agents (list/describe/request_release), Board tickets | **Opaque** — never redeemable by any holder |
| `decision_id` | **CMDB**, one per issued policy verdict | opaque nonce inside the signed verdict token | Gateway (validates + audit-logs), CMDB decision log | **Validated** as part of verdict-token signature verification |
| `artifact_id` | **Drive** | UUIDv7 (time-ordered) | agents (MCP put/get results), audit rows, pdf preview keying | **Opaque** |
| `version_id` | **Drive** | opaque PK of the append-only version chain | agents, audit rows | **Opaque** |
| `notification_id` | **Chat** | opaque envelope PK; doubles as the SSE `Last-Event-ID` replay cursor | posting agents (returned by `post_notification`), operator feed clients | **Opaque** |
| `model_id` (+ resolved digest) | **agent-runtime** (inference facade) | served model id + pinned commit digest + provenance-verified flag | Library (compares on every `embed()` to detect swaps → full re-embed), audit attribution of any generated output | **Validated by comparison** — a change is a breaking, versioned contract event, never silent |

**Deliberately NOT registered** (app-internal or contract-scoped; do not promote without a new row): Board `spawn_key` (internal dedup), Board `expected_version`/`ticket_version` (Board-scoped opaque concurrency token), runtime `session_id` (heartbeat-contract-scoped), Gateway MCP task handles (hidden behind `get_execution_status(run_id)`), CMDB `window_id`/`policy_version` (verdict-evidence fields, contract-scoped), Drive `upload_ref`/`download_ref` (ephemeral bearer references), Chat `dedup_key` (opaque, never parsed), auth `claimed_parent` (audit field). **Killed:** the Gateway research's "plan id" — a plan is identified by `plan_hash`; playbooks by their catalog key inside the Board-minted allowlist. **Pending mint:** the sandbox harness/config version identifier (Gateway, when `gateway-cmdb-library-sandbox.md` freezes); an MC review-item id if MC Stage-2 mints one (Chat's `source_ref.kind: review` currently has no registered referent — reuse `ticket_id` if possible).

## Rules for new identifiers

1. A new cross-app ID does not exist until a row is added here (one PR, one row, minting app stated).
2. Formats are prefix-typed where practical (`T-`, `A-`, `R-`) so a misfiled ID is visually and mechanically detectable.
3. No composite IDs that embed another app's ID with parsing expectations (join on columns, not string-splitting).
4. IDs are never reused, never re-minted after deletion, and never carry semantics beyond the format column (no encoding tier or status into an ID).
