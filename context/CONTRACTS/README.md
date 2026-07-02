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

## Contract ledger (updated by MERGE-RESEARCH-1, 2026-07-02 — see `context/MERGE_REVIEW_1.md` for the full reconciliation)

**Frozen in this directory:**

| Seam | Contract | Status |
|---|---|---|
| board → agent-runtime (+ all agents): claim/lease/fencing/transitions | `board-agents-claim.md` | FROZEN (numbers finalize post-sizing) |
| agent-runtime → MC: heartbeat/liveness + drained report | `agent-runtime-mc-heartbeat.md` | FROZEN |
| MC → auth → Gateway → agent-runtime: kill-switch chain | `killswitch-chain.md` | FROZEN in shape; 2 auth-side verify items |
| cmdb → gateway (+ board triage): policy verdict | `cmdb-gateway-policy.md` | FROZEN core; §6 host-facts additions await ratification (D-6) |
| vault → gateway: handle redemption + SSH-CA | `vault-gateway-redemption.md` | FROZEN core; §3 check-placement awaits ratification (D-4). **Supersedes Gateway research's response-wrapping assumptions** |
| auth → every app: RS baseline + scope→tool countersign index | `auth-apps-tokens-scopes.md` | FROZEN by reference to auth PLAN; per-app countersigns tracked there |
| agent-runtime → library/all: `generate()`/`embed()` inference facade | `agent-runtime-library-inference.md` | FROZEN in shape; pins finalize with gap-1.2 |
| cmdb → library: host inventory facts | `cmdb-library-hostfacts.md` | FROZEN in shape (NEW seam from Library Stage-1) |
| board ↔ wazuh-connector: kickoff + verification evidence | `board-wazuh-connector-kickoff.md` | FROZEN in shape; webhook-auth open item |
| gateway+cmdb → library: tier-0 sandbox execution | `gateway-cmdb-library-sandbox.md` | **SKETCH — NOT FROZEN** (neither producer researched it; mandatory Stage-2 design input for both) |

**Still to write (producer side not yet researched/reached):**
- board ↔ everyone: ticket/ceremony state machine — **already extracted**: `context/specs/TICKET_STATE_MACHINE.md`
- all apps: shared identifiers — **already extracted**: `context/specs/IDENTIFIERS.md`
- drive ↔ pdf: render-call input contract + viewer byte-fetch (Range/ETag) expectations — pdf has no Stage-1 research yet
- notes → pdf: md→PDF/docx render call (frontmatter strip/remap rule) — same blocker
- mc → chat: resolve-event feed + the stable review-item URL scheme (`/review/<id>` is Chat's unverified assumption); freeze at MC Stage-2 before Chat planning exits
- gateway → mc: signed audit-chain HEAD anchoring (receive-and-retain duty MC's docs don't know about yet) — freeze at Gateway Stage-2
- board ↔ notes: ceremony convergence signaling (Board API is the signal; Notes frontmatter is display-only per TICKET_STATE_MACHINE.md §3) + note-visibility semantics if mechanical independent-draft enforcement is chosen
- agent-runtime ↔ auth: key-provisioning (C7/C8 — enrollment payload, TPM2_Certify attestation, EK allow-list ownership, rotation/revocation) — freeze at runtime Stage-2 jointly with auth
- agent-runtime → notes: resumable-checkpoint note contract (C12)

## The three shared registries — OWNER ASSIGNMENTS

These load-bearing registries existed only in consumers' research prose with no owning app. Owners are now assigned; each owner defines the registry's schema and mutation rules in its own Stage-2, then freezes the consumer contract here.

| Registry | Owner | Rationale | Mutation rule |
|---|---|---|---|
| **Task-type registry** (task types + destructiveness/reversibility classification + external-verifier binding) | **CMDB** | it is policy — the same "auto-vs-ask" brain that holds tier and window; Board triage and the auth PDP consume it | operator-only; gate-weakening edits (e.g. reclassifying a type as reversible) fall under policy-plane change control (ARCHITECTURE.md §12) |
| **Runbook / playbook catalog** (the vetted, parameterized playbooks the Gateway can run) | **Gateway** owns the implementations; **CMDB** owns each entry's policy attributes (risk class, reversibility, applicable tiers) | the only executor should own what is executable; what each playbook *is allowed to touch* is policy and lives with policy | new/changed playbooks are operator-vetted code review; policy attributes operator-only via CMDB |
| **Plan→playbook allowlist** (which playbook invocations an approved plan authorizes) | **Board** — minted per-approval as part of the approval record, bound by `plan_hash` | the allowlist *is* the approval's content; single-use consumption already lives on the Board | immutable once approved; Gateway validates the run against it at execute time and refuses anything outside it |
