# MERGE_REVIEW_1 — Root research-merge session #1 (2026-07-02)

> **Charter:** reconcile all 12 completed Stage-1 artifacts (10 apps + built auth/proxy) into one coherent whole and freeze the cross-app contracts BEFORE any Stage-2 planning. No app was planned or built here. Method: 12 parallel extraction agents (one per artifact, each diffed against the tier-1 specs) → central reconciliation → contracts frozen in `context/CONTRACTS/` → this review. Docs-only; committed on a branch for operator review.

---

## 1. Seam inventory (the reconciliation agenda — every cross-app contract any research named)

Status legend: **FROZEN** = contract written this session · **RATIFY** = conflict, resolution recommended, operator decides (→ §4) · **SKETCH** = consumer specified, producer missing · **SPEC** = already governed by a tier-1 spec · **PENDING** = producer side not researched/reached yet.

| # | Seam (producer → consumer) | What flows | Status |
|---|---|---|---|
| 1 | Board → agent-runtime + all agents | atomic claim / lease / fencing / heartbeat / transition protocol, CLAIM_CONFLICT convention, WIP-at-claim | **FROZEN** `board-agents-claim.md` |
| 2 | Board ↔ agent-runtime ↔ MC | outage-aware reaper + clean-quiesce compact (gap 4.4) | **FROZEN** (inside #1 §2 + #3 §4); threshold = D-12 |
| 3 | agent-runtime → MC | heartbeat/liveness SSE (dual timestamps, roster dead-man, zombie flag) + DRAINED / QUIESCED_BY_OUTAGE report | **FROZEN** `agent-runtime-mc-heartbeat.md` |
| 4 | MC → auth → Gateway → runtime | kill-switch chain: trigger/relay, L1 epoch enforcement, L2 physical stop, client drain, confirmation provenance | **FROZEN** `killswitch-chain.md`; H4/H5 auth verify items |
| 5 | CMDB → Gateway (+ Board triage) | tri-state policy verdict, signed verdict token, fail-closed matrix, action_class derivation, must-fit rule | **FROZEN** `cmdb-gateway-policy.md` |
| 6 | CMDB → Gateway | snapshot capability, per-tier health timeouts, scan-interval fact, mid-run window-close semantics | **RATIFY** D-6 (Gateway assumed; CMDB never offered) |
| 7 | Vault → Gateway | handle redemption (ACL model, `release_id`), SSH-CA certs, kill-switch carve-out, creds/mTLS hop | **FROZEN** `vault-gateway-redemption.md`; supersedes Gateway's wrapping assumptions |
| 8 | Vault redemption ← Board/CMDB checks | WHERE approval+policy preconditions are verified at release time | **RATIFY** D-4 |
| 9 | Board → Gateway | approval binding: `approval_id` + `plan_hash` + host + per-approval plan→playbook allowlist; single-use `consume_approval` | **SPEC** (IDENTIFIERS + TICKET_STATE_MACHINE + CONTRACTS registry rows); both researches drifted by omission — Stage-2 obligations §6 |
| 10 | Board → Gateway | per-host fencing token (`lock_generation`) enforcement at the Gateway mutex | **SPEC**; Gateway research designed a no-fencing mutex — defect, Stage-2 constraint |
| 11 | Board ← Gateway | run outcomes, `run_id` evidence, `executing → verifying/needs_review/failed` transitions | **SPEC** (state machine) |
| 12 | auth → every app | RS/token/PEP baseline, budget middleware, revocation subscription, error semantics, TTL/SLO constants | **FROZEN** `auth-apps-tokens-scopes.md` §1–2 |
| 13 | auth → each app | scope→tool map slice (countersign at each Stage-2) | **FROZEN** as countersign ledger (§3 of same doc); library slice MISSING → R7 |
| 14 | auth ↔ agent-runtime | key provisioning (TPM attestation, EK allow-list, rotation/revocation), DPoP token binding | **PENDING** — freeze at runtime Stage-2 jointly with auth (C7/C8) |
| 15 | agent-runtime → Library + all roles | `generate()`/`embed()` inference facade, role-based model selection, pinned-digest responses | **FROZEN** `agent-runtime-library-inference.md` |
| 16 | agent-runtime → Board/Notes ceremony design | measured concurrency → ceremony parameters (huddle size, round caps, draft isolation) | gated on **gap-1.2 sizing session** (§7) |
| 17 | CMDB → Library | host inventory facts (`resolve_host_facts`) for version-scoped retrieval | **FROZEN** `cmdb-library-hostfacts.md` (NEW seam) |
| 18 | Gateway + CMDB → Library | tier-0 sandbox execution (`disposable` class, evidence capture, harness attestation) | **SKETCH** `gateway-cmdb-library-sandbox.md` — both producers missed it; mandatory Stage-2 input |
| 19 | Board ↔ Wazuh connector (+ CMDB mapping) | kickoff webhook, spawn dedup, disappearance-semantics verification evidence | **FROZEN** `board-wazuh-connector-kickoff.md` |
| 20 | Board ↔ Notes | ceremony convergence signaling + huddle-transcript conventions | **SPEC** resolves the conflict (Notes frontmatter is display-only); contract at Board/Notes Stage-2 — see §4 CF-N |
| 21 | Notes → pdf → Drive | render call + artifact routing by ticket | **PENDING** (pdf has no Stage-1 research) |
| 22 | Drive ↔ pdf | render input contract + Range/ETag byte-fetch expectations for the viewer | **PENDING** (same blocker) |
| 23 | Chat → MC/Board/Notes | `source_ref {system,kind,id}` deep-link templates; MC review-item URL scheme | **PENDING** — MC Stage-2 freezes its URL scheme before Chat planning exits |
| 24 | MC → Chat | resolve events (clear/approve/close) over MC's SSE feed | **PENDING** — optional, non-breaking to add later |
| 25 | Gateway → MC | signed audit-chain HEAD anchoring (receive-and-retain duty) | **PENDING** — new duty MC's docs don't know; Gateway Stage-2 |
| 26 | proxy → MC | :9100 edge observability | already **FROZEN** pre-merge (`platform/proxy/docs/OBSERVABILITY.md`); one erratum → R8 |
| 27 | auth → proxy | forward-auth verify | already **FROZEN** pre-merge (auth PLAN §8) |
| 28 | proxy → every app | edge onboarding rules (subdomain==audience==service name, edge network, no host ports, 8080, header trust) | **SPEC** (DEPLOYMENT.md §1–2) — confirmed consistent |
| 29 | Board/auth lane-eligibility ← Library/provenance | provenance taint → auto-approve lane ineligibility (ARCH §12) | design input → Board Stage-2 (lane computation) + CMDB task-type registry; recorded §6 |
| 30 | Vault → Drive-or-SIEM | off-box WORM audit sink | **RATIFY** D-16 (home undecided) |
| 31 | Chat → operator devices | ntfy push sink (new container) | **RATIFY** D-10 (deployment amendment batch) |
| 32 | agent-runtime → Notes | resumable-checkpoint note contract (C12) | **PENDING** — runtime Stage-2 |

## 2. Contracts created/updated this session

Created: `board-agents-claim.md`, `agent-runtime-mc-heartbeat.md`, `killswitch-chain.md`, `cmdb-gateway-policy.md`, `vault-gateway-redemption.md`, `auth-apps-tokens-scopes.md`, `agent-runtime-library-inference.md`, `cmdb-library-hostfacts.md`, `board-wazuh-connector-kickoff.md`, `gateway-cmdb-library-sandbox.md` (sketch).
Updated: `context/CONTRACTS/README.md` (ledger), `context/specs/IDENTIFIERS.md` (9 new rows + not-registered note).

## 3. Conflicts found and resolved WITHOUT ratification (spec or producer authority already decides)

| # | Conflict | Resolution |
|---|---|---|
| CF-A | Gateway assumed HashiCorp response-wrapping with the **agent transporting the wrapping token**; Vault (producer) chose ACL-based gateway-only redeem and bans wrap tokens from agent-readable surfaces | Producer wins (also strictly safer): `release_id` flow frozen in `vault-gateway-redemption.md` §1. Gateway Stage-2 rewrites its brokering step |
| CF-B | Gateway open Q9: kill-switch-halted run → `cancelled`? | Spec: only `executing → failed` exists for the Gateway; `cancelled` is operator-only and asserts the world was untouched |
| CF-C | Gateway open Q7: verification timeout → `needs_review`? | Spec: `verifying → failed` (Board-automatic or operator). No `verifying → needs_review` exists |
| CF-D | **Notes** made huddle-note frontmatter (`status: converged`) a Board-read trigger for backlog decomposition | TICKET_STATE_MACHINE.md §3 already rules: Board `ceremony_events` is sole authority; frontmatter is a never-read-back display copy. Convergence is signaled by an agent calling the Board API (`board.ceremony_transition`). Notes Stage-2 defect; also replace its invented ceremony vocabulary (`drafting/cross-talk/converged/escalated`) with the spec phases |
| CF-E | MC wanted spawn-depth in the runtime heartbeat | One authority per fact: heartbeat carries `step_seq`; spawn depth derives from Board ticket lineage via MC composition (`agent-runtime-mc-heartbeat.md` §2) |
| CF-F | Board webhook consumed raw Wazuh `agent.id` with no CMDB translation | Contract: dedup may hash raw fields; ticket creation MUST resolve `host_id` via CMDB's mapping; unmapped agents quarantine (`board-wazuh-connector-kickoff.md` §1) |
| CF-G | Board `op_id` vs auth "idempotency key" — same concept minted twice | Unified as one registry row (`op_id`, caller-minted) in IDENTIFIERS.md |
| CF-H | Wazuh "Solved" polling ambiguity (Board left closure path open) | Gateway/CMDB agree: confirmation = document **disappearance** from the states index; Solved alerts are transient corroboration. Closure runs through the connector poll (frozen in #19) — noted for sign-off as D-9 but the semantics are producer-fact, not preference |
| CF-I | Gateway "plan id" invented | Killed: plans are identified by `plan_hash`; playbooks by catalog key inside the Board-minted allowlist |

## 4. Conflicts / decisions REQUIRING OPERATOR RATIFICATION (recommendations attached)

> **RATIFIED 2026-07-02.** Every decision below was ruled on — all as recommended, except **D-12 (deferred** pending gap-1.2 measured data). Rulings + encoding locations: **`context/RATIFICATIONS_2026-07-02.md`**. The text below stands as the decision record; the ledger and the amended authoritative docs govern.

**D-1 — Board punted decision 1: huddle tie-break authority.** Board research resolved it: DACI-shaped split — Scrum Master owns process only (server-side Board watchdog enforces timebox/round-cap regardless of any agent); Product Owner is single Recommender-of-record (never autonomous final say); Adversarial Reviewer holds a scoped veto + mechanically-forced grounded dissent (≥1 premise-attack cited to a recon note or the huddle is invalid); reversibility always derived, never reasoned; automatic escalation on round-cap/timebox/unresolved-veto; the huddle is never the last signature. Defaults: 3 rounds, 2–4 role agents. **Recommend: ratify as written.**

**D-2 — Board punted decision 2: ceremony scaling.** Deterministic three-lane triage decision table (straight-to-execute / lightweight / full), computed from five signals (derived reversibility, blast radius, CMDB tier, catalog novelty, external-verifier presence) — never an LLM score. Straight-to-execute requires reversible AND known-runbook AND low-tier AND verifier — all four hard-coded; children inherit the parent's lane as a floor; any missing/stale signal → full ceremony; lane governs planning rigor only, never execution gates. **Recommend: ratify as written.**

**D-3 — `mc` vs `mission-control` naming.** auth (BUILT) uses audience segment `mc`; DEPLOYMENT §1 requires subdomain == audience == compose name; DEPLOYMENT §2 says `mission-control`; Chat's research also assumed `mc.<SUITE_DOMAIN>`. **Recommend: rename the (unbuilt) MC service/subdomain to `mc` and amend DEPLOYMENT §2** — cheaper than changing built auth, and two artifacts already lean `mc`.

**D-4 — Where Vault verifies Board/CMDB preconditions at redemption** (Vault research internally split; determines whether a compromised Gateway token alone reaches plaintext). **Recommend: Gateway-side enforcement as baseline PLUS Vault independently verifying the approval (`approval_id` named explicitly) at its redeem endpoint** — via one Board API call at release time or Board-signed offline evidence; RAR later if auth supports it.

**D-5 — State-machine amendments (Board-owned spec, so your sign-off then Board Stage-2 encodes):** (a) a **Board-automatic escalation transition into `needs_review`** (stuck-huddle watchdog; max-renewal force-escalate) — currently only agents may cause it; (b) **tickets born in `needs_review`** (auth's mandatory post-break-glass review ticket). **Recommend: accept both as narrow, named amendments.**

**D-6 — CMDB accepts the host-facts duties Gateway assumed:** snapshot capability, per-tier health/SSH timeout policy, Syscollector scan interval, mid-run window-close semantics (`cmdb-gateway-policy.md` §6). Also (c): fail-closed escalations (DST-gap, needs-tiering) land as **Board escalations** (not CMDB-UI-only). **Recommend: accept — they are inventory facts/policy attributes, squarely CMDB's charter.**

**D-7 — Sandbox `disposable` class.** Confirm Gateway + CMDB Stage-2 MUST design the tier-0 surface (it is absent from both researches; Library is blocked on it for curation go-live) with an explicit carve-out from the destructive-never-auto floor. **Recommend: confirm as mandatory Stage-2 exit items for both.**

**D-8 — Gateway private Postgres** (advisory-lock mutex + append-only audit chain) vs DEPLOYMENT §3 SQLite-per-app. **Recommend: grant the exception at Gateway Stage-2 (a `data_gateway` network row in DEPLOYMENT), justified by the audit chain + advisory locks; alternative is a SQLite redesign of both.**

**D-9 — Wazuh webhook authentication:** static HMAC shared secret (researched) vs a scoped auth-minted identity for the integrator script. **Recommend: HMAC now (simple, raw-body-signed), revisit when auth's machine-principal enrollment is routine.** Also ratifies CF-H closure-path placement.

**D-10 — Deployment amendments batch (new containers the researches introduced):** Chat's self-hosted **ntfy** push sink; MC's **Prometheus scraper** + **blackbox_exporter** sidecars; the **log shipper + log store** (currently UNOWNED — recommend assigning to MC as operator infra); Vault's possible **unsealer** OpenBao + off-box WORM sink. **Recommend: approve in principle; each lands as a DEPLOYMENT.md §2 amendment at the owning app's Stage-2, with a named sidecar convention.**

**D-11 — Loop-guard / spawn-depth enforcement owner** (MC research: explicitly NOT auth — not one of its four budget dimensions; spawn depth is Board-lineage data). **Recommend: Board enforces lineage caps at claim time (it already enforces WIP there); MC surfaces and auto-triages; auth keeps token/identity budgets only.**

**D-12 — Correlated-loss suppression thresholds** (what fleet-quiet fraction in what window flips MC to FLEET_LIVENESS_ANOMALY, and whether the Board reaper adopts the same gate — recommended yes). Operator risk call; numbers after gap-1.2.

**D-13 — Library embeds via the runtime's TEI facade** (one guarded provenance surface; makes agent-runtime a hard dependency of Library indexing). Runtime recommends, Library assumes. **Recommend: ratify.**

**D-14 — Adopt-vs-build ratifications with cross-app impact:** Vault = **OpenBao 2.5.x (≥2.5.5)**, BUSL Vault only as break-glass fallback · CMDB = **bespoke thin fail-closed policy registry** (NetBox/iTop/Ralph rejected on canonicality+SoD grounds) · Chat = **build thin bespoke service; adopt ntfy only as push sink** (never core, never a second identity system) · Drive = **filesystem CAS + SQLite build** (MinIO rejected — upstream archived Apr 2026; Versity Gateway named as the zero-migration S3 swap-path) · Gateway = **embedded ansible-runner, playbook-only** (Rundeck/salt-ssh rejected) · agent-runtime = **vLLM primary / SGLang alternate / llama.cpp quiesce lane / TEI embeddings + Sigstore provenance gate** · Board = **hand-built SQLite CAS claim + node-cron kickoffs + MCP 2025-11-25** (suite-wide MCP pin). **Recommend: ratify all; they are mutually consistent.**

**D-15 — svc:tier-approver runner.** auth realizes "CMDB tier policy auto-approval" as a service principal holding `board:approve`+reads, but no component is assigned to RUN it. **Recommend: the Board hosts it as an internal service process** (approval state is Board's; it queries the CMDB verdict; auth kind-gates it away from destructive/high tiers structurally).

**D-16 — Vault operational sign-offs:** fail-closed-on-audit (redemption refused if unloggable — trade patching availability for non-repudiation; **recommend: accept**); off-box WORM sink home (log host vs Drive-with-object-lock vs external SIEM — **recommend: hardened log host; Drive's own research rejected compliance-WORM**); seal/unseal model (**recommend: on-prem Transit auto-unseal via a second minimal unsealer + 3-of-5 offline recovery shares**).

**D-17 — Spike gate hardness (gap-1.3).** Is the spike a HARD gate (Board/Notes Stage 2 cannot begin) or SOFT (may draft, cannot freeze tool schemas)? **Recommend: SOFT-start / HARD-freeze — drafting may proceed, no schema freezes or Stage-2 exits until PASS.** Also ratify the proposed thresholds (§7).

## 5. Identifier-consistency check

**Consistent everywhere:** `ticket_id`, `host_id`, `agent_id`/`sub` (opaque posture held by every app), `note_id`, `doc_id`, `run_id`, `edge_req_id`, `traceparent`, Wazuh `agent.id` mapping posture (CMDB-owned, operator-confirmed binds).

**Defects found (recorded as Stage-2 constraints, §6):**
- Gateway: no Board-minted fencing token in its mutex design (would have violated the one-minter rule with a future Gateway-minted sequence); never names `approval_id`/`consume_approval`.
- Board: never designs the approval record it is contracted to mint (`approval_id`, `plan_hash`, plan→playbook allowlist) — the Gateway seam has no producer until Stage-2 fixes this.
- Vault: redemption precondition stated as prose ("Board approved") without `approval_id`; fixed in the frozen contract.
- Notes: git author identity (synthetic role emails) not bound to auth `sub` — audit joins on `sub` need a defined mapping.
- auth: `plan_hash` absent from its PDP obligations — confirmed as intended (plan-hash recomputation is Gateway-side; PDP checks state, mutex, fence, revocation).
- Chat: `source_ref.kind: review` presumes an unregistered MC review-item id (pending-mint note added to IDENTIFIERS.md).

**Registry updated:** 9 new rows (`op_id`, kill/revocation `epoch`, `release_id`, credential `handle`, `decision_id`, `artifact_id`, `version_id`, `notification_id`, `model_id`) + an explicit deliberately-NOT-registered list + "plan id" killed.

## 6. Per-app Stage-2 reconciliation register (unfulfilled obligations + defects — carry into each app's next session)

- **Board:** design the approval record (`approval_id`, `plan_hash`, per-approval allowlist) + `consume_approval` API + PIP facts endpoint (proposer_id, ticket state) for auth's PDP; record proposer/approver and enforce four-eyes; adopt T- id format + full state superset **including amendments A1 (`board_escalation`) and A2 (`breakglass_review_ticket`)**; encode the **ratified D-1 DACI tie-break** and **D-2 three-lane triage table** (TICKET_STATE_MACHINE.md "Ceremony governance"); outage-aware reaper; `team` label; WIP-cap write surface for MC; **lineage/spawn-depth caps at claim time (ratified D-11)**; **host `svc:tier-approver` as an internal service process (ratified D-15)**; ARCH §12 lane-eligibility computation honoring provenance taint (incl. Library's curation-agent taint); backup mechanism for its CANONICAL DB.
- **Gateway:** adopt `vault-gateway-redemption.md` (drop wrapping), Board fencing token, `consume_approval`, allowlist validation, `creds`+mTLS, sandbox surface (D-7), orphaned-run rule (gap 2.3), audit-HEAD→MC contract, Postgres exception (D-8), spec-conformant terminal states (CF-B/C).
- **CMDB:** task-type registry ownership incl. external-verifier binding; one canonical verdict shape (already frozen); host-facts additions (**D-6 ratified — now duties**); `disposable` class (**D-7 ratified — mandatory Stage-2 EXIT item**); host onboarding lifecycle (gap 7.3); `/_context/` path bug FIXED 2026-07-02 — **re-check RESEARCH.md against the frozen contracts + tier-1 specs at Stage-2** (Stage-1 may have run without them loaded).
- **Vault:** blocked on auth pinning the holder-scope claim shape — sequence auth's countersign FIRST; then Stage-2 per the frozen contract (**D-4 ratified**: redeem endpoint independently verifies `approval_id`); unsealer + WORM sink deployment amendments (**D-16 ratified, operator-posture-tagged** in apps/vault/CLAUDE.md); `/_context/` path bug FIXED 2026-07-02 — **re-check RESEARCH.md against the frozen contracts + tier-1 specs at Stage-2**.
- **auth (next session):** R1/R2 (existing) + **R7:** add `library` audience/scopes + `team` label; **R8:** verify raise-kill-epoch is monotonic raise-to-at-least-N with Idempotency-Key (H4); **R9:** remove "Gateway/MC mirror" as an L2-CONFIRMED source (H5); register the revocation `epoch` semantics as now specced.
- **MC:** implement correlated-loss suppression + population gate (heartbeat contract §4); freeze its review-item URL scheme + resolve-event feed for Chat; receive Gateway audit HEADs; rename to `mc` (if D-3); Prometheus/blackbox/log-shipper deployment amendments (D-10); render the full ticket-state superset.
- **Notes:** CF-D (frontmatter display-only; spec ceremony vocabulary); bind git authorship to `sub`; **configured git remote** (ARCH §10 — its research is silent; a local-only .git is a build failure); countersign `notes:append` split; note-visibility semantics if mechanical draft isolation is chosen.
- **Chat:** reconcile scope names; confirm MC URL scheme before planning exits; unify its two envelope variants; retention policy for its CANONICAL feed; ntfy deployment amendment.
- **Drive:** ticket_id existence-validation posture; byte-handoff mechanism (forward-auth-covered endpoint vs signed URLs) with auth/proxy; backup cadence for CANONICAL blobs; pdf contract when pdf researches.
- **Library:** all four blocking contracts now exist (embed ✅, hostfacts ✅, sandbox SKETCH — blocked on D-7, auth slice — blocked on R7); index schema waits on gap-1.2 (dimension + re-embed throughput).
- **agent-runtime:** freeze C7/C8 key-provisioning with auth; C12 Notes checkpoint contract; drain-command schema (epoch = auth kill epoch); run the two gated sessions (§7).
- **proxy:** R3/R5 (existing) + **R10:** OBSERVABILITY.md erratum — §5 cites `caddy_http_responses_total{code}`, not in current Caddy docs; source status distribution from the {code}-labelled duration/size series (additive fix).

## 7. The spike + sizing gate (Task 4) — CONFIRMED SPECIFIED, both deferred to their OWN sessions

**Gap-1.3 feasibility spike (runtime RESEARCH §7) — fully specified as a runnable session:** mock Board+Notes MCP servers with strict `additionalProperties:false` schemas; deterministic plumbing NOT under test, model-side loop IS; the loop = list → claim (capture lease+fencing) → read/search → write_note → heartbeat → transition with correct fencing token; SoD-adjacent surface hard-rejects unauthorized terminal states; one satisfiable + one unsatisfiable seed ticket. Failure taxonomy of 7 buckets. **PASS/FAIL (proposed; you ratify via D-17):** N ≥ 50 runs/model; **zero-tolerance hard gate** on the SoD surface (any unauthorized terminal write or accepted fencing/ticket mismatch = automatic FAIL); zero schema violations on transition calls; ≥95% clean success on the trivial ticket; 100% termination within ≤2× optimal steps; ≥95% graceful `blocked` + 0% spin on the unsatisfiable variant. **A FAIL invalidates rich nested tool schemas suite-wide** — remediation order: flatten/split schemas → move fencing/terminal-legality into deterministic wrappers → stronger executor model.
**Gap-1.2 sizing artifact (runtime RESEARCH §6) — fully specified as a measurement method:** contents (server choice, per-role model matrix incl. the embedding row and don't-under-quantize-the-AR rule, quantization table, VRAM budget method) + method (GuideLLM/`vllm bench serve` + GenAI-Perf cross-check; P99 TTFT/ITL; "max concurrency" = the SLO knee, not peak throughput; per-role sweeps) + the explicit rule that **ceremony parameters (huddle size, round caps, draft-isolation policy) are derived from the measured knee, not assumed**. Requires 6 operator inputs before it can run: GPU model(s)+VRAM+count, host RAM, target fleet size, per-session SLO, per-role quality bar, FP8/FP4 hardware confirmation.

**Sequencing (binding):** these two run as their own sessions **after this merge and before ANY Stage-2 planning**. The spike gates Board + Notes Stage 2 (per D-17's hardness). **Everything betting on local models driving strict-schema tool loops is exposed if the spike fails** — i.e. every MCP tool surface in the suite (Board and Notes most directly; Chat/Drive/CMDB/Vault/Gateway/Library tool complexity should also stay within whatever schema-complexity budget the spike validates). The sizing artifact additionally gates ceremony-parameter hardening and the Library's index schema (embedding dim + re-embed throughput are its line items).

---

*Session boundary honored: no app planned, no src touched, docs-only on a review branch.*
