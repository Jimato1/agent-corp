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
| `edge_req_id` | **proxy** | `{http.request.uuid}` per request | edge log correlation | **Opaque**; joined to `traceparent` at Stage-7, not at the edge |
| `traceparent` | **auth** (authoritative mint, bound to `sub` inside the signed identity header; proxy strips any client-supplied value) | W3C traceparent | cross-app audit correlation | **Opaque**; never client-trusted |
| fencing token / counter | **Board** (it owns the claim/lease; the counter increments per lease grant on a resource) | monotonic integer per locked resource, issued with the lease | Gateway (presents it; stale token = refuse), auth PDP (checks presence, not value) | **Validated by comparison** at the Gateway per-host mutex |

> **Fencing-counter ownership note:** auth's PLAN §5.3 and Board research were found drifting on who owns this counter. This spec assigns it to the **Board** (the lease issuer — a fencing token is meaningless except relative to the lease sequence). auth's PDP treats it as an opaque presence/freshness check. Reconciliation item recorded in `context/GAP_REMEDIATION.md`.

## Rules for new identifiers

1. A new cross-app ID does not exist until a row is added here (one PR, one row, minting app stated).
2. Formats are prefix-typed where practical (`T-`, `A-`, `R-`) so a misfiled ID is visually and mechanically detectable.
3. No composite IDs that embed another app's ID with parsing expectations (join on columns, not string-splitting).
4. IDs are never reused, never re-minted after deletion, and never carry semantics beyond the format column (no encoding tier or status into an ID).
