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
| cmdb → gateway (+ board triage): policy verdict | `cmdb-gateway-policy.md` | FROZEN (§6 host-facts ratified D-6, 2026-07-02); producer side designed at CMDB Stage-2 (`apps/cmdb/planning/PLAN.md` §3); one additive countersign package open (verdict JWS + field semantics — CMDB PLAN §11-A5 ⇄ Gateway A4) |
| vault → gateway: handle redemption + SSH-CA | `vault-gateway-redemption.md` | FROZEN core; §3 check-placement awaits ratification (D-4). **Supersedes Gateway research's response-wrapping assumptions** |
| auth → every app: RS baseline + scope→tool countersign index | `auth-apps-tokens-scopes.md` | FROZEN by reference to auth PLAN; per-app countersigns tracked there |
| agent-runtime → library/all: `generate()`/`embed()` inference facade | `agent-runtime-library-inference.md` | FROZEN in shape; pins finalize with gap-1.2 |
| cmdb → library: host inventory facts | `cmdb-library-hostfacts.md` | FROZEN in shape (NEW seam from Library Stage-1) |
| board ↔ wazuh-connector: kickoff + verification evidence | `board-wazuh-connector-kickoff.md` | FROZEN in shape; webhook-auth open item |
| gateway+cmdb → library: tier-0 sandbox execution | `gateway-cmdb-library-sandbox.md` | **FROZEN — both halves** (Gateway §G 2026-07-03; CMDB §C 2026-07-03, CMDB Stage-2). Library curation go-live design unblocked |
| gateway → mc: signed audit-chain HEAD anchoring | `gateway-mc-audit-anchor.md` | **FROZEN** (Gateway Stage-2, 2026-07-03; MC consumer half pre-committed in MC PLAN §6.3) |
| cmdb → gateway (+ svc:tier-approver): signed policy-verdict JWS envelope | `cmdb-gateway-verdict-token.md` | **FROZEN — S1, root REVIEW #2, 2026-07-03.** The token format + validation both CMDB (§3.4) and Gateway (check-2b) designed toward, made one doc. EdDSA/Ed25519, `typ: cmdb-verdict+jws`, `aud`-by-caller anti-relay, CMDB-local signing key at `GET /v1/verdict-jwks`, zero-leeway `exp`, optional `req_nonce`, additive `host_class`/`verdict_basis`. Adds the SoD-critical Gateway obligation to verify `aud == "gateway"` (COUNTERSIGN-1). Read together with `cmdb-gateway-policy.md` (decision semantics). |
| mc → chat (+ all deep-linkers): review-item URL scheme + resolve-event feed | `mc-chat-review-resolve.md` | FROZEN (MC Stage-2, 2026-07-02; seams #23/#24 — no new ID minted, review items keyed by `ticket_id`); Chat countersigns at its next session |

**Still to write (producer side not yet researched/reached):**
> **Root REVIEW #2 (2026-07-03) status on this list:** the three Board contracts below (`board-consumers-facts-read.md`, `board → mc`, `board ↔ notes`) have their **producer side already specified in `apps/board/planning/PLAN.md` §7/§8/§14** — they freeze at Board's Stage-2 **exit** (spike-gated). The pdf seams remain genuinely blocked (no pdf Stage-1). C7/C8/C12 freeze at agent-runtime Stage-2 (which has **not started**). The Drive→agent-runtime upload step is **consumer-invented — agent-runtime never agreed** (see `context/REVIEW_2_GOTOBUILD.md` §3.2). Full seam matrix + GO/NO-GO + build order: **`context/REVIEW_2_GOTOBUILD.md`**.
- board → consumers: PIP/facts-read surface (`/facts/ticket`, `/facts/approval`, `/facts/host-lock`) consumed by auth PDP, Vault (D-4), Drive, Notes, Gateway, MC — **producer side specified (Board PLAN §7)**; freeze as `board-consumers-facts-read.md` at Board Stage-2 exit (add `ticket_status` to `/facts/approval` for Vault's B-4 single-call check, REVIEW #2 §S2)
- board ↔ everyone: ticket/ceremony state machine — **already extracted**: `context/specs/TICKET_STATE_MACHINE.md`
- all apps: shared identifiers — **already extracted**: `context/specs/IDENTIFIERS.md`
- drive ↔ pdf: render-call input contract + viewer byte-fetch (Range/ETag) expectations — pdf has no Stage-1 research yet
- notes → pdf: md→PDF/docx render call (frontmatter strip/remap rule) — same blocker
- ~~gateway → mc: signed audit-chain HEAD anchoring~~ — **DONE: frozen as `gateway-mc-audit-anchor.md` (Gateway Stage-2, 2026-07-03).** Producer re-push-above-last-`(chain_id, seq)` duty accepted; retention ≥180d; anchor-push failure alarms-not-halts
- board → mc: ticket/queue/lineage read surface (list + since-cursor or SSE) + the WIP-cap write surface + CORS-allowlisting the `mc` origin for browser-direct operator decisions — **raised at MC Stage-2** (`apps/mission-control/planning/PLAN.md` §9-R1); freeze at Board Stage-2; MC runs degraded until then
- board ↔ notes: ceremony convergence signaling (Board API is the signal; Notes frontmatter is display-only per TICKET_STATE_MACHINE.md §3) + note-visibility semantics if mechanical independent-draft enforcement is chosen
- agent-runtime ↔ auth: key-provisioning (C7/C8 — enrollment payload, TPM2_Certify attestation, EK allow-list ownership, rotation/revocation) — freeze at runtime Stage-2 jointly with auth
- agent-runtime → notes: resumable-checkpoint note contract (C12)
- agent-runtime → drive: deterministic file-upload step (workspace path + Drive-minted `upload_ref` + agent token → authenticated HTTP PUT), so local models never hand-roll HTTP — raised by Drive Stage-2 (`apps/drive/planning/PLAN.md` §2.2/§15.6); freeze at runtime Stage-2
- board → drive: ticket-exists read (consumed by Drive's `ticket_id` existence check, `apps/drive/planning/PLAN.md` §2.1; same class as the PIP facts endpoint Board already owes auth) — freeze at Board Stage-2; Drive runs degraded (flag-always) until it exists

## The three shared registries — OWNER ASSIGNMENTS

These load-bearing registries existed only in consumers' research prose with no owning app. Owners are now assigned; each owner defines the registry's schema and mutation rules in its own Stage-2, then freezes the consumer contract here.

| Registry | Owner | Rationale | Mutation rule |
|---|---|---|---|
| **Task-type registry** (task types + destructiveness/reversibility classification + external-verifier binding) | **CMDB** | it is policy — the same "auto-vs-ask" brain that holds tier and window; Board triage and the auth PDP consume it | operator-only; gate-weakening edits (e.g. reclassifying a type as reversible) fall under policy-plane change control (ARCHITECTURE.md §12) |
| **Runbook / playbook catalog** (the vetted, parameterized playbooks the Gateway can run) | **Gateway** owns the implementations; **CMDB** owns each entry's policy attributes (risk class, reversibility, applicable tiers) | the only executor should own what is executable; what each playbook *is allowed to touch* is policy and lives with policy | new/changed playbooks are operator-vetted code review; policy attributes operator-only via CMDB |
| **Plan→playbook allowlist** (which playbook invocations an approved plan authorizes) | **Board** — minted per-approval as part of the approval record, bound by `plan_hash` | the allowlist *is* the approval's content; single-use consumption already lives on the Board | immutable once approved; Gateway validates the run against it at execute time and refuses anything outside it |
