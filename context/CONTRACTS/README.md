# context/CONTRACTS/ — Frozen cross-app seam contracts

> **Status:** AUTHORITATIVE index. Closes gap 6.1 (`context/GAP_ANALYSIS_2026-07-01.md`). Referenced from ARCHITECTURE.md §13.

## The rule

Every app is built in its own Claude Code session that loads only the shared context plus its own subtree. Therefore: **assumptions written in one app's research/planning prose do NOT bind any other app.** The only thing that binds both sides of a cross-app seam is a **frozen contract doc in this directory**, read by both sides' sessions. If app A needs behavior from app B and no contract exists here, that is a *blocked dependency to raise*, not a fact to assume.

Two contracts already exist and prove the pattern (they stay where they are; this index points at them):

| Seam | Contract | Status |
|---|---|---|
| proxy → MC ("Edge" panel observability) | `platform/proxy/docs/OBSERVABILITY.md` | frozen; MC consumes verbatim |
| auth → proxy (forward-auth) | `platform/auth/planning/PLAN.md` §8 (esp. §8.10) | frozen; proxy consumes **verbatim**, no paraphrase |

New contracts are written **here** (one file per seam, named `<producer>-<consumer>-<topic>.md`) when the earlier-built side reaches the seam — at latest, before the later side's Stage-2 exit.

## Known seams requiring contracts (from the gap review; write when the producing side reaches Stage 2)

- board ↔ everyone: ticket/ceremony state machine — **already extracted**: `context/specs/TICKET_STATE_MACHINE.md`
- all apps: shared identifiers — **already extracted**: `context/specs/IDENTIFIERS.md`
- gateway ↔ cmdb: policy-query surface (tier, window, in-window?, snapshot-capability, health timeouts) — Gateway research currently *assumes* CMDB duties CMDB's docs never mention; none of it binds until contracted here
- gateway ↔ vault: handle-redemption protocol — Gateway research currently bakes in HashiCorp-specific semantics while Vault has zero research; **flagged, not binding**
- auth ↔ each app: scope→tool map for MCP surfaces — currently defined unilaterally in auth's PLAN; each app's Stage-2 must consume and countersign its slice
- board ↔ wazuh-connector: kickoff webhook + verification-evidence shape
- mission-control ↔ agent-runtime: heartbeat/liveness + drain/kill compliance protocol
- library ↔ agent-runtime: embedding-model serving (embeddings are inference — the load belongs in the gap-1.2 GPU sizing artifact)
- library ↔ gateway/cmdb: tier-0 sandbox execution surface for documentation verification (disposable class, auto-approve policy, kill-switch-covered — ARCHITECTURE.md §5)

## The three shared registries — OWNER ASSIGNMENTS

These load-bearing registries existed only in consumers' research prose with no owning app. Owners are now assigned; each owner defines the registry's schema and mutation rules in its own Stage-2, then freezes the consumer contract here.

| Registry | Owner | Rationale | Mutation rule |
|---|---|---|---|
| **Task-type registry** (task types + destructiveness/reversibility classification + external-verifier binding) | **CMDB** | it is policy — the same "auto-vs-ask" brain that holds tier and window; Board triage and the auth PDP consume it | operator-only; gate-weakening edits (e.g. reclassifying a type as reversible) fall under policy-plane change control (ARCHITECTURE.md §12) |
| **Runbook / playbook catalog** (the vetted, parameterized playbooks the Gateway can run) | **Gateway** owns the implementations; **CMDB** owns each entry's policy attributes (risk class, reversibility, applicable tiers) | the only executor should own what is executable; what each playbook *is allowed to touch* is policy and lives with policy | new/changed playbooks are operator-vetted code review; policy attributes operator-only via CMDB |
| **Plan→playbook allowlist** (which playbook invocations an approved plan authorizes) | **Board** — minted per-approval as part of the approval record, bound by `plan_hash` | the allowlist *is* the approval's content; single-use consumption already lives on the Board | immutable once approved; Gateway validates the run against it at execute time and refuses anything outside it |
