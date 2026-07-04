# PLAN.md — Agent Runtime (`agent-runtime`), Stage 2

> **Status:** Stage-2 Planning artifact per `context/PROCESS.md`. Risk class **Critical-infra** (adversarial review of blast radius mandatory — §12). Authored **after** Stage 1 (`research/RESEARCH.md`) and Stage 3 (`ui/UI_SPEC.md`) — this app's pipeline ran out of the usual order (UI_SPEC was produced first, grounded directly in RESEARCH + frozen contracts). This PLAN reconciles both and is the build spec for Stage 4.
>
> **Gating honesty (ratified D-17 + RESEARCH §6/§7).** Two measurement sessions that Planning would normally consume are **deferred and un-run**: the **gap-1.2 sizing** measurement (concurrency knee C, VRAM budget, per-role model matrix) and the **gap-1.3 local-model-drives-MCP feasibility spike** (which gates *Board/Notes* Stage 2, not this build). This PLAN therefore treats every number those sessions produce as a **named configuration placeholder** with a documented default and a `PENDING-SIZING` / `PENDING-SPIKE` tag — the *code structure, interfaces, and fail-closed enforcement are fully specified and buildable now*; only the tuning constants wait. Nothing here asserts a measured concurrency number, a final model pin, or ceremony parameters. This is the correct disposition: build the seam and the enforcement, parameterize the physics.

---

## 0. What this component is (recap, one paragraph)

The agent-runtime is **the workforce** and the **client half of every guardrail**: it hosts the agent processes, runs the poll→claim→work→heartbeat→transition loop against the Board, produces the heartbeat/liveness stream Mission Control reads, hosts the local inference stack behind one swappable facade (the suite's `generate()`/`embed()` hub), physically holds the per-agent TPM-sealed signing keys, and obeys the drain/kill switch in code. It is **not** one of the four SoD action-holders and must never become one: it holds *identity* key material only, never *host* credentials, and has **no approval or execution authority**. It has **no RS/agent MCP scopes** (`auth-apps-tokens-scopes.md` §3 — "No RS scopes; it hosts agents"): the inversion is constitutional — *agents do not call the runtime; the runtime runs agents*. Its only inbound surfaces are (a) the operator/MC control + status surface, (b) the cross-app `embed()` facade for Library, (c) the inbound drain/kill command.

---

## 1. Process architecture (the two halves + the facade)

One runtime **instance** = one supervisor process + N standing worker slots + the inference stack, all in the `agent-runtime` container on `edge`.

### 1.1 Supervisor (single aggregation point, one per instance)
Owns everything that must exist **once per host**, because it is a physical property of the host:
- **TPM / PKCS#11 key custody** (§5) — one PKCS#11 session over `/dev/tpmrm0`; signing serialized at the one TPM.
- **Model stack lifecycle + the fail-closed provenance gate** (§6) — loads role→model per the pinned manifest, verifies digest + Sigstore signature at load, records the provenance ledger.
- **The inference facade** (§6.4) — the in-process `generate()`/`embed()` service the workers call and Library calls cross-app.
- **The drain/kill epoch machine** (§4) — the single `RUN→DRAIN→KILL` authority; distributes the drain flag to all workers; the unconditional pre-claim gate lives here and is read by every worker before every claim.
- **The MC heartbeat SSE producer** (§3) — the *single* connection to MC; aggregates per-agent frames from all workers + emits the fleet/roster frame (the dead-man switch).
- **The status API + operator UI** (§7, §8) — read-mostly; mints no fleet truth.
- **The auth token/key-provisioning client** (§5.4) — enrollment + short-TTL re-mint against the sealed key.

### 1.2 Worker slot (long-lived standing worker; per-ticket in-process session)
The **standing-pool** shape ratified in RESEARCH §1/§8.A: a long-lived worker per fleet slot; the model warmup and key custody amortize; each *ticket* runs in a **fresh in-process session** so one ticket's context exhaustion or prompt-poisoning cannot leak into the next. Each worker:
- polls the Board (`board.claim_next`), performs the atomic claim, captures `{lease, fencing_token}`;
- runs the inner **ReAct loop with hard termination guards** (§2.3), grounding in Notes;
- emits its per-agent heartbeat frame to the supervisor at every Board/Notes step (`work_progress_ts`+`step_seq`);
- renews the Board lease **gated on its work-progress predicate** (a wedged worker self-fences);
- files the terminal transition (only the agent-causable set) with the current fencing token echoed;
- checks the drain gate **before every claim** and mid-loop at safe points.

Worker↔supervisor is in-process (async tasks) or local IPC; **one OS process may host the supervisor + a pool of async worker tasks** (simplest, matches "one place for key custody"). Concurrency ceiling = the measured knee C (`PENDING-SIZING`); default pool size `AR_WORKER_SLOTS=4`.

### 1.3 Stack (validated against ARCHITECTURE §9 leanings + RESEARCH)
- **Language:** Python 3.12. Rationale: the MCP SDK, vLLM/TEI/llama.cpp OpenAI-compatible clients, `python-pkcs11` (TPM), `sigstore`/`model-signing`, and `huggingface_hub` digest verification are all Python-native. One language for loop + facade + custody keeps the supply-chain surface small.
- **Web:** FastAPI + uvicorn (status API, SSE producer, cross-app `embed()`, static UI). Internal port **`AR_PORT=8080`** (suite convention, DEPLOYMENT §2 — resolves the "TBD in its research" row).
- **MCP client:** the Python MCP SDK, **Streamable HTTP, spec revision 2025-11-25** (suite pin, `board-agents-claim.md` §6; re-verify at build). Board is an OAuth 2.1 RS; the runtime authenticates with its minted token.
- **Local state:** SQLite at `AR_DB_PATH` (operational state; the canonical durable spine is Board + Notes, never here — §9). Two tables are **append-only audit** and get a backup (§9): the model-provenance ledger and the drain/kill epoch log.
- **Frontend:** the **Helm design system, imported verbatim** — `_ds_bundle.js` (`window.HelmDesignSystem_f4cb26`) + `styles.css` + `tokens/*` vendored into `web/vendor/helm/`; React 18 + Babel-standalone vendored locally (no CDN — local-first). The one screen is the Helm `ar-app` reference wired to live `/api/runtime/*` data (§8).

---

## 2. The agent loop (client of `board-agents-claim.md`)

### 2.1 Data the loop threads (never conflated — RESEARCH §8.A)
A "session" = OS worker task + a live auth token + (while working) a Board lease with a fencing token — **three independently-expiring things**. Identifiers used verbatim (never minted here): `ticket_id` (Board), `fencing_token`/`lock_generation` (Board), `sub`/`agent_id` (auth), `op_id` (caller-minted idempotency key, per IDENTIFIERS.md — the runtime mints this one, UUID). Runtime-minted `session_id` is heartbeat-contract-scoped (not a cross-app ID, IDENTIFIERS.md "deliberately NOT registered").

### 2.2 Claim + fencing enforcement (echo-and-reject-stale — the load-bearing rule)
- **Claim** = one Board API call; returns atomically `{in_progress transition, lease TTL, fencing_token}` **or** a business outcome `{isError:true, code:"CLAIM_CONFLICT", ...}` (lost race — re-poll, never treat as broken; `board-agents-claim.md` §1).
- **At-least-once:** any held ticket may be simultaneously re-claimed after a reaper requeue. **Every side-effecting step is idempotent, keyed by `(ticket_id, fencing_token, op_id)`.**
- **Fencing echo:** every side-effecting call — Board transitions, Notes writes on ticket-bound notes, escalations — **echoes the current `fencing_token`**; the *receiving server* (Board/Notes) is the high-water-mark authority and **rejects stale (lower) tokens**. The runtime's obligations, all in code:
  1. **echo** the current token on every mutating call;
  2. on any restart/reconnect/wedge-recovery, **re-read lease state from the Board and compare fencing tokens *before doing anything*** — *"am I still the lease holder at the current fence?"* is the first question (RESEARCH §8.A). Stale token ⇒ the ticket is not yours ⇒ abandon, do not resume.
  3. on a stale-token rejection or `CLAIM_CONFLICT`, **abandon** (drop the step, let the lease lapse) — **never blind-retry** (MENTOR spiral, RESEARCH §7.2).
- A generated-but-unchecked token provides no safety; the runtime never *self-judges* freshness for a side effect — it echoes and lets the authority reject. (Local restart comparison is an early-out, not a substitute for server rejection.)

### 2.3 Inner ReAct loop + hard termination guards (the "never terminating" defense)
Thought→Action→Observation, but **termination is load-bearing** because "no API cost" makes the failure mode *never-terminating / confident garbage*, not spend:
- **hard iteration cap** `AR_MAX_STEPS` (per-role, `PENDING-SIZING`; default 24) — exceeded ⇒ force-escalate `blocked`;
- **explicit terminal transition** the model must call (no implicit completion);
- **stop condition tied to externally-verifiable state** (Board transition confirmed / Notes written), never model self-assertion;
- **no-progress detector** — if `step_seq` does not advance within a role-specific progress budget (`PENDING-SIZING`), trip escalation (`in_progress→blocked`, machine reason), never spin;
- **structured-output for every transition** via the facade's constrained-decoding mode (§6.4); transitions are **small and low-arity** (a two-field escalation, never a nested plan blob — RESEARCH §5.2/§7.6).

### 2.4 Agent-causable transitions ONLY (SoD as a code guard)
The loop may cause **only** `todo→in_progress` (the claim) and `in_progress→{awaiting_approval | needs_review | blocked}` (+ voluntary release to `todo`) — `TICKET_STATE_MACHINE.md` §2, `board-agents-claim.md` §4. A **client-side `TransitionGuard`** rejects any attempt to call `approved`/`executing`/`verifying`/`done`/`failed`/`cancelled` **regardless of what the driven model emits**, logs it as a violation, and escalates — this is defense-in-depth *over* the Board's own hard rejection (the Board is the authority; the runtime never trusts the model to respect the boundary). This is the exact SoD-adjacent surface the gap-1.3 spike's zero-tolerance gate probes (RESEARCH §7.5/§7.6).

### 2.5 Context-exhaustion resume (Notes is the checkpoint; the window is a cache)
Near context exhaustion the worker **checkpoints a compacted structured summary to Notes** (contract C12) and resumes by **re-reading that trail, not replaying the transcript** (RESEARCH §1.5/§8.A). **Constraint pinning is mandatory** — role prompt + active governance (scopes, provenance rules, "AR must dissent") live *outside* the compactable region (governance-decay result, RESEARCH §8.A). **Resume policy is per-risk-class:** checkpoint-and-resume for research/deliberation; **discard-partial-and-let-the-Board-requeue near any SoD-critical transition** (a half-built plan is cheaper to redo than to trust). On resume, the §2.2 fencing re-check runs first.

---

## 3. Heartbeat / liveness producer (PRODUCES `agent-runtime-mc-heartbeat.md` — FROZEN)

The supervisor is the single SSE producer to MC (never N per-agent connections; `edge` only). **Field sets are copied byte-for-byte from the frozen contract** — Stage 4 asserts this in a contract-conformance test (§10).

- **Per-agent frame:** `schema_version`, `agent_id`/`sub`, `session_id`, `claimed_ticket_id`, `fencing_token`, `process_alive_ts`, `work_progress_ts`, `step_seq`, `model_version`, `persona_version`, `drain_state ∈ {active, draining, drained, quiescing, quiesced}`. **Not in the frame:** spawn depth/lineage (MC derives from Board reads — contract §2).
- **Fleet frame (dead-man switch):** `schema_version`, `runtime_instance_id`, `roster`, `supervisor_ts`, `runtime_drain_state`. Absence of the fleet frame = the runtime itself is down (one event, not N deaths).
- **Two beats to two authorities, never collapsed:** lease renewal → Board (authoritative, progress-gated); telemetry → MC (advisory, this stream).
- **Cadence (config, `PENDING-SIZING`):** `AR_HB_PROCESS_SEC≈10` (process_alive); `work_progress_ts` on every ticket step. MC owns the *display* semantics (accrual φ, wedged/crashed/correlated-loss suppression) — the runtime only *emits the two independent signals + the roster denominator* that make those computable. The runtime **does not** implement MC's suppression; it guarantees the inputs.
- **Change rule honored:** field set additive-only; the conformance test pins the current set so drift fails the build.

---

## 4. Drain / kill compliance (PRODUCES the C4/C5 client half; consumes `killswitch-chain.md`)

### 4.1 The command (frozen verbatim, `killswitch-chain.md` §2)
Inbound schema: **`{mode: drain|kill, epoch, grace_deadline, issued_by, idempotency}`**. `epoch` **IS auth's kill epoch** (one monotonic counter suite-wide, `IDENTIFIERS.md`). Transport **push+poll** (accept a pushed command *and* poll auth/MC for the current epoch, so a missed push still converges). Drain/kill commands and auth-outage inference arrive on **separate wires** (§4.4). **`mode` is issuer-set and authoritative — the runtime NEVER derives `mode` from auth's graduated level (G0/G1/G2)** (m6): auth owns the G0/G1/G2 semantics and translates them to a `mode` on the wire; the runtime obeys the `mode` it receives and does not interpret levels. (A G1 "freeze-destructive" is largely a no-op for a runtime that already holds no destructive authority; it still stops claiming per the issued `mode`.)

### 4.2 The epoch machine (in code, fail-closed, model-independent)
A monotonic, epoch-versioned local state `RUN → DRAIN → KILL`; a stale/replayed lower epoch **can never un-drain** a higher one (`max(epoch)` wins, persisted in the append-only epoch log).
- **`RUN`** — normal loop.
- **`DRAIN` (graceful):** set the drain flag the claim loop checks **before every atomic claim** ⇒ *the runtime can never win a new claim while draining* (makes the Gateway's "nothing new arrives" true by construction on the client side). In-flight work runs to `grace_deadline`, then checkpoint-or-abandon; report `DRAINED`.
- **`KILL` (hard):** identical machine with **grace budget = now**: stop claiming, abandon in-flight immediately, report `DRAINED`. **KILL = DRAIN with zero grace — one mechanism.**
- **Fail-closed boot / restore (M3):** on boot and after any restore the **pre-claim gate stays SHUT until the current auth kill epoch is polled and reconciled** (`DrainMachine.mark_reconciled()` after the first successful epoch read). Seeding the persisted max epoch (§9) prevents *internal* regression but is **not** reconciliation — a runtime restored to `RUN` must never win a claim in the window before its first epoch poll while auth is at KILL. Same latch is re-armed on entering an auth outage (M2).
- **Grace budget** is one shared deadline (K8s model) sized to **p95/p99 of ONE supervised step** (`PENDING-SIZING`; default `AR_DRAIN_GRACE_SEC=45`), never a whole ticket. **The issuer's `grace_deadline` is CLAMPED to the local max** — effective grace = `min(command.grace_deadline, now + AR_DRAIN_GRACE_SEC)`, and `mode=kill` forces **zero** regardless of the field (m7). An inflated deadline (compromised wire or operator error) can never keep agents running far past one step.

### 4.3 Checkpoint-or-abandon (mapped to the locked transitions, `killswitch-chain.md` §3)
- **Checkpoint benign work:** flush to Notes, `in_progress→blocked(reason=drained)` / `needs_review`.
- **ABANDON anything in flight toward the Gateway / any SoD boundary:** stop the step, **let the lease lapse** (the reaper does `in_progress→todo` + fence++); a drain must **never** leave a half-approved or mid-execution action recoverable. The runtime never tries to reverse `executing`/`verifying` — not its transitions.
- Report **`DRAINED`** as a **distinct terminal signal** to MC (never inferred from silence).

### 4.4 Auth-outage degraded mode — `QUIESCED_BY_OUTAGE` (separate from drain; RESEARCH §8.B)
A fleet-wide token blackout *looks* like a drain but is **not operator-commanded**. Discriminator = **provenance of the signal**: a drain/kill is a present, authenticated, epoch-versioned command; an outage is inferred from the *absence* of a working IdP (token-mint failures / 5xx from `auth:8089`), no command, no epoch. On outage the runtime enters **`QUIESCED_BY_OUTAGE`** — a local, **credential-independent** posture:
1. **jittered exponential backoff** on token re-mint (full jitter `sleep ∈ [0, min(cap, base·2^attempt)]`) — no correlated re-mint stampede on the recovering IdP;
2. **local quiesce** — stop claiming; hold in-flight safely (keep the Notes checkpoint current; let the lease lapse cleanly; do not attempt SoD transitions that auth would deny anyway — auth is fail-closed on high-stakes paths);
3. **circuit breaker** in front of the token endpoint (open after threshold ⇒ fleet quiesced; half-open probe; close on success);
4. **ordered, jittered re-entry** after recovery — staggered re-mint, then **reconcile the kill epoch FIRST** (M2): auth is the poll target and was down, so a KILL raised *during* the blackout is unseeable; on recovery each worker re-polls and adopts `max(epoch)` **before** resuming or claiming anything, and if the reconciled epoch is a KILL it transitions to KILL (abandon), never resumes. Only then does each worker re-run the §2.2 fencing check on held tickets and resume claiming once lease state reconciles (prevents a second thundering herd on the Board). Entering the outage forces the pre-claim gate shut until this reconcile completes (the gate's `reconciled` latch, §4.2/code).

The machine **must never** treat an IdP hiccup as a kill (or a real kill as "just an outage"). `drain_state` reports `quiescing`/`quiesced`; the status UI renders (G) distinctly from (F) commanded-kill (§8).

### 4.5 SoD framing (the client drain is defense-in-depth, not the guarantee)
The Stage-7 hard guarantee is **server-side and does not depend on runtime honesty**: auth revocation fails the agent's tokens within one short TTL, and the **Gateway chokepoint independently refuses** post-kill. The client drain makes the clean case fast and honest; it is **not** the stop. **Stage-7 demo is two-sided:** (a) cooperating runtime → clean `DRAINED`; (b) a **simulated rogue worker that ignores drain** → the Gateway still confirms nothing new arrives (seam C6, external verifier). Stage 4 ships the harness hooks for both.

---

## 5. Key custody (PRODUCES C7 key-provisioning + C8 token-binding client half; joint with auth)

**Invariant that decides every detail (RESEARCH §4.8):** *the private key is born in the TPM and never transits the wire; only public material / attestation / CSR crosses to auth.* The runtime holds **identity** key material only — never host credentials, no approval/execution authority.

### 5.1 Generate-in-TPM, use-without-export
- Keys **born in-TPM** (`sensitivedataorigin | fixedtpm | fixedparent | sign`) — never generated in software and imported. `fixedTPM ⇒ fixedParent ⇒` non-exportable; `TPM2_Duplicate` refuses.
- Custody surface = **`tpm2-pkcs11`** (one persistent primary; every agent key a TPM-wrapped child blob on disk, loaded transiently only to sign, then flushed — "unlimited keys on one memory-constrained TPM"). Signing via PKCS#11 `C_Sign`; the private key never crosses the library boundary. Reach the TPM via **`/dev/tpmrm0`** (resource-manager node, ~64-consumer multiplex).
- **Concurrency, not key count, is the ceiling** — signing is serialized at the one TPM; the status UI surfaces the TPM sign-queue depth (§8). DPoP-per-request signing load is a `PENDING-SIZING` line item.

### 5.2 Software path vs hardware attestation (honest boundary — do NOT fake attestation)
Stage 4 builds the **software path + interface** end-to-end against a **PKCS#11 provider**: in a sandbox this is a **SoftHSM2 token** (a real PKCS#11 backend, no TPM hardware) so the *code path* is exercised and tested; the **real TPM (`/dev/tpmrm0`) + `TPM2_Certify` hardware attestation + PCR-policy sealing are a documented deployment step** and a **CANNOT-VERIFY-IN-SANDBOX** item (§ CHECKLIST). The code **never fabricates an attestation result** — with no TPM present, custody status renders the false-green-forbidden `⚠ CANNOT CONFIRM KEY SEAL` (UI §8), and `gateway:execute` personas are refused enrollment on a non-attested node (auth #6 escape hatch: scope executors to attested nodes only).

### 5.3 Key-provisioning handshake (C7/C8 — NOW FROZEN, runtime side)
**M4 closed:** the seam is frozen in **`context/CONTRACTS/agent-runtime-auth-key-provisioning.md`** (was missing from `CONTRACTS/`). The Stage-4 client is built against that doc — not against either app's prose (seam rule, ARCH §13) — and **hardens only when auth countersigns** (EK allow-list ownership, accepted attestation format, CSR-vs-JWK default, rotation/revocation endpoint shapes). **Authority note:** verifying attestation and refusing a `gateway:execute` token to a non-attested node is **auth-side** — the runtime's local refusal to enroll an executor persona on a non-attested node is defense-in-depth, NOT the authority (a compromised runtime that skips its own check still cannot obtain a holder-capable token because auth refuses at mint). Flow (runtime side):
1. **generate in TPM** (runtime only; auth never generates it);
2. **attest** — `TPM2_Certify` + EK-cert chain (hardware step; software path emits the *structure*, marks attestation `unverified` when no TPM);
3. **enroll** — POST to auth `{agent_id/sub (auth-minted, opaque), JWK, attestation, EK-cert chain, optional CSR}`; auth verifies against its EK allow-list, registers the JWK (DPoP `cnf.jkt`) and/or signs the CSR (mTLS);
4. **mint tokens** — Client-Credentials + **DPoP proof** (signed by the sealed key) → short-TTL (1–5 min, auth band) audience-bound JWT, **no refresh token**;
5. **rotate** = fresh TPM key + re-enroll (cheap, no key transport);
6. **revoke** = auth account-disable (kills minting within one TTL) + host de-attestation.

Stage 4 ships the runtime client for (1)–(6) against a **documented auth interface** (the auth counterpart is a separate session; the seam doc is frozen jointly — `auth-apps-tokens-scopes.md` §3 names this the runtime's only seam). Where auth is unavailable in-sandbox, enrollment/mint are **integration/CANNOT-VERIFY** with operator commands.

### 5.4 Token binding (C8): DPoP-first, mTLS fallback
Each re-mint produces a fresh DPoP proof bound to the sealed key (`cnf.jkt`); mTLS (`cnf.x5t#S256`) is the held fallback (needs an internal CA — operator/auth decision). Holder-scope tokens (none held by the runtime itself, but executor *personas* it runs may) **require** a verifiable `cnf` proof — a holder token without proof is invalid (auth §8, G5). The runtime's re-mint path is wrapped by the §4.4 backoff/breaker.

---

## 6. Model hosting + provenance + the inference facade (PRODUCES C9/C11)

### 6.1 Serving (D-14, RATIFIED)
**vLLM primary / SGLang evaluated alternate / llama.cpp CPU-quiesce lane / TEI for embeddings**, all behind **one facade** — the backend is swappable; the facade is the seam, never a hardcoded model. Final server choice + per-role matrix + quant are `PENDING-SIZING` (RESEARCH §6). Stage 4 wires the facade to any **OpenAI-compatible `/v1` endpoint** (config: `AR_INFERENCE_BASE_URL`), so vLLM/SGLang/llama.cpp/TEI/a local mock all drop in unchanged.

**Enforcement-point pin (M1 — closes the fail-open seam).** The `provenance_verified` flag on every facade response is a **runtime-computed fact, never read from the serving backend's self-report.** The runtime is the **only** actor that admits a model artifact: it verifies the *local artifact's* digest + Sigstore signature (§6.2) **before** the backend is permitted to load/serve it, records the pass in the provenance ledger, and the facade stamps responses **from that runtime-held ledger record** keyed by resolved role→digest. The facade additionally pins the backend to the exact resolved `model_id`+digit it admitted and rejects (typed `model-provenance-failure`) any response whose served `model_id`/digest does not match the runtime-admitted pin — a misconfigured or compromised backend serving an unsigned/other model cannot pass provenance silently. **A backend field is never trusted as evidence of provenance.**

### 6.2 The fail-closed provenance gate (D-14; RESEARCH §5.3 — the security core)
`load_model(role)` resolves role→pinned **commit digest** from versioned config, then **fails closed** on any mismatch, in order:
1. **safetensors-only, pickle denied** (pickle = arbitrary code on load);
2. **pin by immutable commit digest, not tag;** recompute **SHA-256** and match Hub metadata;
3. **Sigstore `model-signing` verification** (DSSE/in-toto manifest; keyless Sigstore or internal PKCS#11/HSM key — operator decision);
4. record the **Model-BOM entry** in the append-only provenance ledger;
5. **fail closed** on any mismatch — the model is **not admitted**, the row renders Pattern-R `✕ PROVENANCE FAILED` (UI §8), no unsigned model ever runs. This same gate covers the **embedding model** (poisoning it poisons Library retrieval → the recon grounding). Directly demonstrable at Stage 7 (DoD: "pinned versions, checksum verification at load").

The two key-material regimes stay distinct: **identity** keys are TPM-sealed/non-exportable; **model** weights are digest-pinned + Sigstore-verified. Neither is a host credential — SoD boundary preserved.

### 6.3 Structured-output (feeds the gap-1.3 spike; RESEARCH §5.2)
Constrained decoding: **XGrammar default, Outlines fallback for rejected schema features, GBNF on the llama.cpp lane**; **role schemas validated against the chosen backend at config-load** (schema-feature gaps like array-length/int-bounds fall back *explicitly*, never discovered at runtime). Syntax ≠ semantics — the gap-1.3 spike measures *semantic* transition correctness before Board/Notes freeze schemas; this build only guarantees the *validation-at-config-load* behavior and keeps transitions small/low-arity.

### 6.4 The facade contract `generate()` / `embed()` (C9 — FROZEN in shape)
One internal facade, two operations, **fields copied from the frozen contract** (conformance test §10):
- **`embed(texts[], input_type: query|document) → {vectors, model_id, dim}`** — dimension fixed per model (default 1024, `PENDING-SIZING`); **L2-normalized, cosine**; instruction/prefix convention pinned identically at ingest+query; ≤256 texts/call; **max input tokens per text stated by the runtime** (contract §2.4 obligation Library chunks against — config `AR_EMBED_MAX_INPUT_TOKENS`, default 512, `PENDING-SIZING` per final model) (m9); `model_id` on every call (Library compares → full re-embed on swap); explicit 429/backpressure; per-item failures reported never dropped. Cross-app over `edge` (Library is a **hard dependency** on this — D-13).
- **`generate(role, messages, schema?) → {text|tool_call, model_id, digest, provenance_verified, ...}`** — **model selection by logical role, never raw model name** (runtime resolves role→pinned digest); **pinned-model guarantee** (response carries served `model_id` + resolved digest + provenance-verified flag → every output attributable to an exact signed model in the audit trail); structured-output mode as §6.3.
- **Typed errors (both):** `schema-unsatisfiable`, `backend-unavailable`, `model-provenance-failure` (fail-closed), `quota/concurrency-exhausted`, and a defined **quiesce/drain** signal so callers get "unavailable, backoff" — **never a hang** — during a kill or auth outage (feeds §4.4).

### 6.5 `model_id` as a registered cross-app ID (IDENTIFIERS.md)
The facade mints `model_id` + resolved digest + provenance-verified flag; a change is a **breaking, versioned contract event, never silent** — Library re-embeds on any swap.

---

## 7. Persona / prompt / role↔model config (versioned artifacts; RESEARCH §8.C)

Role prompts are **load-bearing behavioral contracts** (the AR's forced dissent, independent drafting, the PO's scope guard). Config is a **git-tracked, operator-owned versioned artifact** (same required-remote discipline as Notes):
- `config/personas/<role>.yaml` — role prompt(s), model + pinned digest/quant/checksum, and the auth **scope set** the persona may hold; a change is a **reviewed commit, never a runtime mutation**.
- `config/models.yaml` — role → pinned commit digest + quant + Sigstore ref (the provenance gate reads this).
- `config/runtime.yaml` — the `PENDING-SIZING`/`PENDING-SPIKE` tunables (pool size, cadences, grace budget, max steps) with documented defaults.
- **Persona→scope binding (C13):** a persona commit referencing a scope must validate against **auth's scope registry** (a seam — Stage 4 validates *shape* locally + documents the auth cross-check; the live check is an integration item).
- **Behavioral regression gate (design; CI):** every prompt/model change passes a per-role golden-set eval as a **hard merge gate** — deterministic assertions (schema conformance, "did it emit a dissent block") as the hard gate, model-graded judging as a secondary signal (never a role judged by its own model; randomize answer order). The **Adversarial Reviewer "planted-flaw re-certification"** — a mutation battery of plans each seeded with a known defect; the gate asserts the AR finds it. **Stage 4 ships the config schema + a runnable golden-set harness skeleton** (`evals/`); the full battery + CI wiring is the gap-5.1 eval-layer overlap (documented, not faked).

---

## 8. Human surface — the Engine-Room status UI (Stage 3 UI_SPEC + Helm, verbatim)

**Archetype: Instrument, dark-only, ONE screen** (`/status`). The runtime is the engine room, not the cockpit: **no fleet console** (that is MC's `LiveAgentView`, deep-linked), **no kill trigger** (MC + auth only), read-mostly. **Governing principle: "one fleet, physical truth, never a false green."** Built by **importing the Helm bundle verbatim** (`window.HelmDesignSystem_f4cb26`) and wiring the `ar-app` reference screen to live data — *no invented styling*.

Panels top→bottom (UI_SPEC §3.1): **Runtime Instance** (printed absence 🔒 "holds NO host credentials · cannot approve or execute work") → **Model Stack & Provenance** (`DataTable` + `TierBadge` + Sigstore load-gate ARMED) → **Local-Compute Headroom** (`EngineHeadroom` — VRAM / decode-streams-vs-knee-C / TPM sign-queue) → **Key-Custody / TPM Seal** (`TPMSealStatus` — health only, **never keys**) → **Drain/Kill Compliance** (client half).

**Every physical figure obeys the false-green rule (§4.9 UI_SPEC):** a stale/unconfirmable TPM seal, model signature, or supervisor beat renders halt-gold `⚠ CANNOT CONFIRM …`, **never** a fabricated green. **(F) commanded-kill** (gold `HaltBand`, `drain_state DRAINING/DRAINED`) and **(G) outage-quiesce** (gold `SYSTEM SAFE-STOPPED`, `QUIESCED_BY_OUTAGE`, inferred) render **differently and are never conflated**. Pattern-R (fixable, red ✕ — e.g. provenance-fail-at-load) vs Pattern-D (dependency down, gold ⛊) are distinct.

**Read-mostly API (siblings over one state — UI_SPEC §5):**
| Method / path | Returns | Renders |
|---|---|---|
| `GET /api/runtime/status` | `runtime_instance_id`, `supervisor_ts`, `roster`, `runtime_drain_state`, kill `epoch` mirror | Runtime-Instance + read-only `HaltBand` origin |
| `GET /api/runtime/models` | per logical role: model id, digest, sha256, quant, `provenance_verified`, sig ref, `online` | Model-Stack (`TierBadge`/`StatePill`) |
| `GET /api/runtime/headroom` | VRAM used/total, active decode streams, knee `C`, TPM sign-queue depth, `as_of` | `EngineHeadroom` |
| `GET /api/runtime/keys/custody` | `/dev/tpmrm0` reachability, PCR seal state, last `TPM2_Certify` + age, sealed-vs-soft counts — **NO key material** | `TPMSealStatus` |
| `GET /api/runtime/drain` | commanded posture (mode/epoch/grace-deadline), `drain_state`, last `DRAINED`, `QUIESCED_BY_OUTAGE` flag | Drain/Kill panel + states (F)/(G) |
| `GET /api/runtime/provenance` | append-only model-load ledger (role, digest, sig ref, Model-BOM, outcome) | `AuditInspector` provenance mode |
| `POST /api/runtime/maintenance/{drain\|restart}` *(optional)* | local per-process maintenance; **not** the global kill; light `ConfirmFriction` | `DangerAction` |

**Explicitly NOT here:** the rich per-agent heartbeat stream (terminates at MC); any approve/execute/kill-actuation endpoint (not the runtime's authority — printed absence). Status endpoints are operator-facing behind the proxy forward-auth (operator identity); **no agent scopes** exist.

---

## 9. Data model + durability (ARCHITECTURE §10)

Local SQLite (`AR_DB_PATH`). **The canonical durable spine is Board + Notes, never here** — most runtime state is operational/rebuildable (sessions, headroom cache, drain flag mirror). Two tables are **append-only audit** and get a **stated backup** (§10 requirement):
| Table | Class | Backup |
|---|---|---|
| `provenance_ledger` (append-only: load_seq, role, model_id, digest, sha256, sig_ref, model_bom, outcome, ts) | **CANONICAL — append-only** | nightly copy; MC mirrors it (C11), so restore-consistency = "ledger ⊇ what MC displays" |
| `kill_epoch_log` (append-only: epoch, mode, grace_deadline, issued_by, received_ts) | **CANONICAL — append-only** | nightly copy; monotonic — restore never lowers the persisted max epoch |
| `sessions`, `custody_index` (sub→label/sealed/attest — **NO key material**), `headroom_cache` | rebuildable / operational | none required (re-derived on boot) |
| **TPM key blobs** (`tpm2-pkcs11` token store) | **CANONICAL — special regime** | the sealed blobs are ciphertext under the TPM parent; back up the token store, but they are **useless off the sealing TPM** — restore = re-enroll on the target node |

**Restore-consistency rule (stated, drilled at Stage 7):** restoring the runtime never lowers the persisted max kill epoch and never resurrects a session as lease-holder without a fresh §2.2 fencing re-check; the provenance ledger is append-only so restore only ever *adds* history.

---

## 10. Tests (unit + contract-conformance; proven by construction)

- **Contract-conformance (the load-bearing tests):** assert the produced artifacts match the frozen docs **field-for-field** — the heartbeat per-agent + fleet frames (`agent-runtime-mc-heartbeat.md` §2/§3), the `drain_state` vocabulary, the kill command schema (`killswitch-chain.md` §2), the `generate()`/`embed()` facade shapes + typed errors (`agent-runtime-library-inference.md`). A drift fails the build (the "additive-only" change rule enforced in code).
- **Fencing echo-and-reject-stale:** unit-test that every mutating call echoes the current token; that a restart re-reads + compares before acting; that a stale rejection ⇒ abandon (no blind retry).
- **Drain/kill in code:** the pre-claim gate refuses a claim while draining **regardless of a mock model that "wants" to claim**; KILL = zero-grace abandon; a stale lower epoch never un-drains; `DRAINED` emitted distinctly.
- **TransitionGuard:** a mock model emitting `done`/`executing` is hard-rejected + logged, never forwarded to the Board.
- **Provenance gate:** a digest mismatch / unsigned model / pickle file **fails closed** (no load); a good model loads + records the ledger.
- **Auth-outage:** token-mint 5xx ⇒ `QUIESCED_BY_OUTAGE` (not KILL); jittered backoff; ordered re-entry runs the fencing re-check.
- **Infra-dependent → integration, marked CANNOT-VERIFY-IN-SANDBOX with operator commands:** real TPM `/dev/tpmrm0` + `TPM2_Certify` attestation; real vLLM/TEI model load + Sigstore verify against the Hub; live Board/auth/MC end-to-end; the two-sided kill-switch demo (needs the Gateway).

---

## 11. Sequencing (API-first — PROCESS Stage 4)

1. **Core service/state** — config loader (personas/models/runtime), SQLite schema, the drain epoch machine + pre-claim gate, the provenance gate, key-custody interface (PKCS#11 abstraction), typed errors.
2. **The inference facade** (`generate()`/`embed()`) over the OpenAI-compatible seam + constrained-output validation-at-config-load.
3. **The agent loop client** — MCP Board client, atomic claim + fencing echo/re-check, ReAct guards, TransitionGuard, Notes checkpoint, per-agent heartbeat emit.
4. **The supervisor** — worker-pool orchestration, the MC heartbeat SSE producer (aggregation + fleet frame), the auth key-provisioning/re-mint client + §4.4 degraded mode.
5. **The status API** (§8 endpoints) then **the UI** (Helm bundle vendored + `ar-app` wired to live data) — MCP-surface-equivalent (the control surface) and UI are siblings over the one state.
6. **Tests** (§10) + **verification/CHECKLIST.md** with fresh-clone operator commands.

---

## 12. Adversarial review (Critical-infra — blast radius) — residual risks

*(This section records the adversarial pass required by PROCESS Stage 2. Findings folded or accepted-with-reason.)*

- **AR-1 — "the runtime could self-clear the human gate."** *Refuted by construction:* the TransitionGuard (§2.4) is code, not model-mediated; the Board independently rejects; a compromised runtime that bypasses its own guard still cannot cause `approved`/`executing` because those are not agent-causable at the Board. Blast radius of a fully-compromised runtime = "propose anything, get nothing executed" (no host creds, no approval authority). **Accepted.**
- **AR-2 — "drain is model-obeyed, so a rogue agent ignores it."** *Acknowledged and designed for:* the client drain is **defense-in-depth only** (§4.5); the hard stop is the Gateway chokepoint + auth revocation. The Stage-7 demo is **two-sided** precisely to prove the rogue case. Risk that the *supervisor* itself is compromised (owns the pre-claim gate) is mitigated the same way — server-side stop does not trust the runtime. **Accepted with the two-sided demo as the evidence.**
- **AR-3 — "provenance gate is bypassable via a poisoned config pin."** A poisoned `models.yaml` pin is a **policy-plane** change; it is git-tracked + reviewed-commit (§7), the same control class as gate-weakening CMDB edits (ARCH §12). Residual: an attacker who owns the repo owns the pin. Mitigation: the gate still requires a **valid Sigstore signature** for the pinned digest — a bad pin to an *unsigned* artifact fails closed; a bad pin to a *validly-signed malicious* model is the residual, addressed by the operator-owned trust root + optional distinct-provenance for the AR (operator decision 11). **Accepted, flagged to operator.**
- **AR-4 — "context compaction silently drops the AR's forced-dissent constraint."** Directly the governance-decay result (§2.5). Mitigation: **constraint pinning outside the compactable region** + the discard-partial-near-SoD policy + the planted-flaw re-certification battery. **Accepted with pinning mandatory.**
- **AR-5 — "no-TPM sandbox fakes a green seal."** *Refuted:* the false-green rule (§5.2, §8) forces `⚠ CANNOT CONFIRM KEY SEAL` with no TPM; `gateway:execute` personas are refused enrollment on a non-attested node. The build **never fabricates attestation**. **Accepted.**
- **AR-6 — "the auth-outage mode is circular (escalation needs Board+Chat, both behind auth)."** Exactly why degraded mode is **local + credential-independent** (§4.4) — quiesce, don't try to escalate through dependencies that are down. **Accepted.**
- **AR-7 (m8) — deliberation-quality blast radius of a compromised runtime PROCESS is distinct from execution and larger.** AR-1 bounds *execution* to "propose anything, get nothing executed." But a compromised runtime process hosts the models: it can return attacker-chosen `generate()` output to every role (e.g. making the Adversarial Reviewer never dissent) and poisoned `embed()` vectors to Library (corrupting recon grounding suite-wide). This is inherent to hosting the model stack (Critical-infra reason #2) and is bounded only by the **server-side execution monopoly + external verification** (Wazuh confirms *done*, not the runtime) and by the provenance gate (M1) that stops an *unsigned* model — but not a validly-signed-malicious one (AR-3). **Accepted as an inherent, honestly-scoped residual**, with the operator-owned trust root + optional distinct-provenance for the AR (operator decision 11) as the available hardening.
- **Review disposition:** adversarial review returned **GO-WITH-CHANGES, no blockers**; M1–M5 folded (provenance enforcement-point pin §6.1; outage-recovery epoch reconcile §4.4; fail-closed boot §4.2; C7/C8 contract frozen + auth-authority §5.3; DEPLOYMENT.md §2 amended); m6–m9 folded (mode issuer-set §4.1; grace clamp §4.2; this residual; embed token cap §6.4). **Post-build independent verification** returned **SHIP-WITH-FIXES, no DO-NOT-SHIP**; all five fixes folded into the code: React/Babel vendored locally (no runtime CDN), the provenance soft-posture can never fabricate a green (records `unverified`), the loop's SoD-adjacent drain-abandon is wired to the in-flight work class, embed backpressure surfaces `429 + Retry-After`, and the Notes checkpoint client (fencing echo-and-reject-stale) is built + tested — closing the last PLAN §2.2 obligation.
- **Residual accepted risks (numbers, not structure):** all `PENDING-SIZING`/`PENDING-SPIKE` tunables (lease TTL, cadence, grace budget, knee C, model matrix, ceremony params) are **explicitly deferred to their measurement sessions**; the build parameterizes them with documented defaults and does not assert measured values. This is the ratified D-17 disposition, not a gap.

---

## 13. Stage-2 exit conformance

Data model (§9) and **both surfaces** — the operator/MC control+status surface (§8) and the cross-app `embed()` facade + inbound drain command (§4/§6), the runtime's "two views" being *the control surface and the UI over one runtime state* (there is deliberately **no agent MCP surface** — the inversion is constitutional) — are specified over one shared state. Adversarial concerns (§12) are resolved or accepted-with-reason. Every deferred number is a tagged placeholder, not an assumption. **Buildable.**
