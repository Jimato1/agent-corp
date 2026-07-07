# UI/UX Spec — Agent Runtime (`agent-runtime`)

> **Stage 3 (UI/UX). Scope: DELIBERATELY MINIMAL.** The agent-runtime is **the engine room, not the cockpit.** It has **no rich UI of its own** and hosts **no fleet console.** The canonical fleet/agent view is **Mission Control's `LiveAgentView` §7.3** at `https://mc.<SUITE_DOMAIN>/agents`, fed by this runtime's heartbeat SSE (`context/CONTRACTS/agent-runtime-mc-heartbeat.md`). This app renders **only a minimal operator engine-room status surface** for the things MC cannot show because they are *physical properties of the runtime host itself*: model-stack load + local-compute headroom, TPM key-custody seal health, Sigstore model-provenance gate status, and this runtime's own drain/kill/quiesce compliance state. Everything an operator does to *the fleet* (watch agents, actuate the kill switch, clear reviews) happens in MC/auth/Board — this surface **deep-links out**, it does not fork those views.
>
> PLAN.md is *not started*; this spec grounds in `platform/agent-runtime/CLAUDE.md`, `research/RESEARCH.md` (§3 drain, §4 TPM custody, §5 model provenance, §6 sizing), and the frozen heartbeat contract. It is intentionally short — matching a thin app, not padding one.

---

## 1. Archetype declaration & governing principle

**Archetype: Instrument (control-room), dark-only** (§2). There is **one screen** and it is Instrument throughout; no Workshop content anywhere. The runtime authors no documents — agents write to Notes, not here.

**Governing principle — *"one fleet, physical truth, never a false green."*** Two rules bind every pixel:
1. **One fleet, not two.** If this surface ever renders per-process rows, they use the **exact `LiveAgentView` §7.3 row anatomy** (PrincipalRef + phi-accrual liveness via `Freshness`, never a bare green dot; `FenceState`; attention band) so the operator sees the *same* fleet MC shows, never a divergent second table. The default posture is to **deep-link to MC** rather than re-render rows.
2. **Physical truth, fail-closed.** This surface reports hardware-root-of-trust facts (TPM seal, model provenance, GPU headroom). Every such figure obeys the **false-green rule §4.9**: if a read is stale or unconfirmable, it renders the honest halt-gold unknown (`⚠ CANNOT CONFIRM …`), **never** a fabricated healthy state. A runtime that cannot prove its keys are sealed or its models are signed must *say so*, because those are Critical-infra safety properties.

**Where actuation lives (constitutional, printed not implied):** this surface hosts **no global kill trigger** — that is MC (`LiveAgentView` §7.3, `HoldToActuate`) and auth (identity-layer L1) only. It shows the kill posture **read-only** via `HaltBand` §4.6 and reports its own *drain compliance* as the **client half** of the switch. It also renders, per the destructive-absence rule §4.7, the printed constitutional facts that the runtime **holds no host credentials** and **cannot approve or execute work** (🔒, not a greyed toggle).

---

## 2. Design-language note

**This spec consumes `context/DESIGN_SYSTEM.md` verbatim; it specifies deltas only.** It cites shared components by ID and does **not** re-draw any §4/§5/§6/§7 component. Tokens, safety grammar, chrome, and honest-state discipline are inherited. Only two genuinely engine-room-physical readouts (§4) are app-specific, and both are justified as hardware/compute telemetry with no shared analog.

---

## 3. The one screen — **Engine-Room Status** (`/status`)

A single Instrument screen inside `AppShell` §6.1 (side rail collapsed to the one nav item; global header with operator `PrincipalRef` §4.2, the suite-posture line, and the read-only `HaltBand` mirror). It is a column of hairline-separated status panels — a `DataTable` §6.2 is reused where rows exist; everything else is a labelled status block. No card-soup, instrument-dense.

### 3.1 Wireframe (loaded, nominal)

```
┌ AppShell header ─────────────────────────────────────────────────────────────┐
│ agent-runtime · the workforce (engine room)   SYSTEM STATE: ● G0 NOMINAL      │
│                                       operator:ada ◐ · 🔑 fresh · [ MC fleet ▸]│
├──────────────────────────────────────────────────────────────────────────────┤
│  (no HaltBand — posture is G0; band appears here only when engaged, §3.3-F)   │
│                                                                                │
│  RUNTIME INSTANCE ─────────────────────────────────────────────────────────   │
│  runtime_instance_id  rt-9f2a…    supervisor ⟳ fresh 4.1s   roster 18 agents   │
│  drain_state:  ● ACTIVE            (StatePill §4.5)          epoch 4471         │
│  🔒 This runtime holds NO host credentials · cannot approve or execute work.   │  ← §4.7 printed fact
│                                                                                │
│  MODEL STACK & PROVENANCE ─────────────────────────────────────────────────    │  DataTable §6.2
│  logical role         model id / digest        prov.        quant   loaded     │
│  adversarial-reviewer qwen…  9c3f… ⧉→✔ VERIFIED [Verified]  Q6_K    ● ONLINE   │  TierBadge §4.3
│  scrum-master         llama… a71b… ✔ VERIFIED   [Verified]  Q5_K_M  ● ONLINE   │  StatePill §4.5
│  hands-pool           mist…  4d0e… ✔ VERIFIED   [Verified]  Q4_K_M  ● ONLINE   │
│  embed (TEI, Library) qwen3… 77ac… ✔ VERIFIED   [Verified]  FP16    ● ONLINE   │
│  Sigstore load-gate: ⛊ ARMED · fail-closed · last verify ⟳ 6s                  │  Freshness §4.9
│                                                                                │
│  LOCAL-COMPUTE HEADROOM ───────────────────────────────────────────────────    │  EngineHeadroom §4.1
│  VRAM pool   38.6 / 48.0 GB ▓▓▓▓▓▓▓░░  · decode streams 11 / knee C≈14         │
│  TPM sign queue  depth 2 (serialized)   · source: supervisor · as-of 3s        │
│                                                                                │
│  KEY-CUSTODY (TPM SEAL HEALTH) ────────────────────────────────────────────    │  TPMSealStatus §4.2
│  /dev/tpmrm0  ● REACHABLE   · PCR-policy seal ● BOUND   · attest ✔ CERTIFIED   │
│  agents sealed 15 fixedTPM · 3 soft-key (non-executor)   [ never shows keys ]   │
│  as-of 5s · source: runtime custody probe                                      │
│                                                                                │
│  DRAIN / KILL COMPLIANCE (client half) ────────────────────────────────────    │
│  commanded posture: G0 · not draining.   MC owns actuation → [ MC fleet ▸ ]    │  HaltBand read-only origin
│  last DRAINED report: —      (this runtime is the client of the kill switch)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Shared components this screen uses

- `AppShell` §6.1 — shell, suite switcher, suite-posture line, operator identity + `🔑 fresh/stale` step-up cue.
- `PrincipalRef` §4.2 — operator (header) and every per-agent row that appears (custody counts drill to the agent `sub`; clicking a `sub` goes to MC `/agents/<sub>` §7.3).
- `StatePill` §4.5 — `drain_state` (`● ACTIVE / ⇉ DRAINING / … DRAINED / QUIESCED`), each loaded model's `● ONLINE / ✕ ERROR`, TPM `● REACHABLE / ▲ WARN`, Sigstore gate `⛊ ARMED`.
- `TierBadge` §4.3 — each model's provenance: **Verified** family (`✔ VERIFIED`, digest-pinned + Sigstore-signed per RESEARCH §5.3). A model whose signature cannot be confirmed does **not** get a Verified badge — it renders the §4.9 unknown (see 3.3-E). Never editable (provenance is display-of-truth).
- `Freshness` §4.9 — supervisor beat age, per-panel `source · as-of`, Sigstore last-verify age, headroom `as-of`. **The false-green rule governs all of them.**
- `FenceState` §4.4 — only if per-process rows are shown; a zombie (heartbeat token behind Board's current gen) renders `⚠ SUPERSEDED` exactly as MC does.
- `DataTable` §6.2 — the model-stack table and (if shown) the fleet-process rows.
- `HaltBand` §4.6 — **read-only mirror** of the global kill posture (3.3-F).
- `DangerAction` §4.7 + `ConfirmFriction` §5.1 — the printed constitutional-absence facts (🔒, no affordance); and, if a local *maintenance* action exists (3.4), it routes through the light/full friction variant — but this is **not** the global kill.
- `AuditInspector` §7.2 — the model-provenance ledger (3.5) is the **provenance-mode** pivot of the shared inspector, not a bespoke view.
- `Shift+Esc` override §5.3 + keyboard model §5.6 — this app can see posture, so it honors the global halt-focus chord with the documented fallback.

### 3.3 Every state of this screen (§5.4 honest defaults)

- **(A) Loaded / nominal** — the wireframe above. `drain_state ● ACTIVE`, all models `✔ VERIFIED / ● ONLINE`, TPM `● REACHABLE / BOUND / CERTIFIED`, headroom within knee C, freshness fresh. Suite posture `● G0 NOMINAL`.
- **(B) Loading (skeleton)** — static skeleton rows matching each panel's layout (§5.4; no spinner). Header suite-posture shows last-known with a `Freshness` `▲ reconnecting` stamp rather than a fabricated green.
- **(C) Empty (invitation)** — **no runtime instance registered / no models loaded yet** (fresh boot, pre-enrollment). Not a shrug: *"No agent-runtime instance is reporting. Provision the runtime and enroll its TPM-sealed keys to populate the engine room. → runtime bring-up runbook ▸."* Model-stack table empty state: *"No model loaded. The Sigstore load-gate admits only pinned, signed models — load a vetted role model to begin."*
- **(D) Pattern-R error (red ✕)** — a *local, recoverable* fault the operator can act on: a model **failed its Sigstore verify at load** → `✕ PROVENANCE FAILED · load refused (fail-closed)` on that row in `--danger`, with the pinned-vs-computed digest and *"model not admitted; fix the pin or re-sign — no unsigned model runs."* Or the status API 4xx/5xx for a reason the operator fixes. Red = "something you can fix," in the interface's voice, never an apology. **A provenance failure is Pattern R (the gate did its job and refused a bad artifact) — distinct from a dependency outage (Pattern D).**
- **(E) False-green-forbidden unknowns (halt-gold, §4.9)** — a physical read is *stale or unconfirmable* but not an error:
  - TPM unreachable / attestation stale → `⚠ CANNOT CONFIRM KEY SEAL — /dev/tpmrm0 unreadable (as-of 47s); treat custody as UNVERIFIED` in halt-gold. Never a green "sealed."
  - A model's signature check is stale → the row shows `⚠ CANNOT CONFIRM PROVENANCE` (halt-gold), **not** a Verified badge and **not** a green online.
  - Supervisor heartbeat itself stale → the whole surface flips to `⚠ CANNOT CONFIRM FRESHNESS — treating as safe-stopped` and enters Pattern D.
- **(F) Stop-engaged (global kill) — `HaltBand` §4.6 read-only** — when auth/MC report a kill level > G0, the gold `HaltBand` slides in under the header (identical to every app; G2 uses the intensified doubled-interlock variant). This surface additionally shows the **client-half truth**: its own `drain_state` transitions `● ACTIVE → ⇉ DRAINING → DRAINED` (StatePill), and the honest reading that *"drain compliance is client-side and defense-in-depth; the hard stop is enforced at the Gateway chokepoint and auth revocation, not here"* (RESEARCH §3.4). The band's actuator deep-links to MC/auth — no trigger is rendered here. The header **never** shows a green "all agents stopped" (§4.8 copy discipline); counts, where shown, use the `HonestState` triad.
- **(G) Pattern-D degraded (halt-gold ⛊, dependency down — NOT red)** — the **auth-outage / `QUIESCED_BY_OUTAGE`** posture (RESEARCH §3.3, §8.B). A dependency (auth IdP, or the runtime's own status source) is down, so the runtime **safe-stopped by inference-of-absence**, which is *categorically different from a commanded kill* and **must render differently** (heartbeat contract §4). It shows the §4.6b `SYSTEM SAFE-STOPPED` band with *"This is the safety system working, not an outage of the console. STILL TRUE: no new claims; sealed keys unusable off-host; existing kill epochs enforced. Drain posture: `QUIESCED_BY_OUTAGE` — inferred, not commanded."* `drain_state` shows `… QUIESCING / QUIESCED`. **Never rendered as a red error.** The distinction between (F) commanded-kill and (G) outage-quiesce is load-bearing and the surface labels each explicitly.

### 3.4 Local maintenance actions (if any — not the kill switch)

The runtime's control surface *faces the operator/MC* (CLAUDE.md) for drain/restart of its own processes. If a local operator maintenance affordance is exposed on this surface at all (e.g. restart a **wedged supervisor process**, or drain **one** process for a node reboot), it is a `DangerAction` §4.7 behind `ConfirmFriction` §5.1 — **toward-*less*-action** (drain/restart) uses the *light* signal-cyan variant per §5.1 rule 4. It is explicitly **not** the global kill switch, is scoped to this host, and carries the honest note that the fleet-wide stop lives in MC. Draining toward *more* action does not exist here (the runtime can never move the system toward execution — that authority isn't its to hold). Prefer to **omit** even these and route the operator to MC where possible, keeping the engine room read-mostly.

### 3.5 Model-provenance ledger (consumes `AuditInspector` §7.2)

The append-only record of every model load — role, model id, commit digest, SHA-256, Sigstore signature ref, Model-BOM entry, verified/refused outcome (RESEARCH §5.3; contract C11) — is the **provenance-mode pivot of `AuditInspector` §7.2**, not a new component. It renders the chain/signature-verify affordance with the §4.9 rule: a stale or failed verify shows `⚠ CANNOT CONFIRM` in halt-gold or `✕ SIGNATURE INVALID` in danger-red — **never a fabricated green**. Read-only (append-only is the point; corrections are new rows). Reachable as a sub-panel/expand from the Model-Stack panel; the same rows feed MC's Stage-7 provenance display (C11) — **one truth, two viewers.**

---

## 4. App-specific components (justified)

Only two, both genuinely engine-room-physical telemetry with **no** shared-component analog. Neither is a re-draw of a §4 entity; each *reuses* `StatePill`/`Freshness`/`TierBadge` for its state and provenance sub-parts.

### 4.1 `EngineHeadroom` — local-compute capacity gauges
Renders VRAM-pool utilization, live decode-stream concurrency **against the measured knee C** (RESEARCH §6), and the TPM signing-queue depth (signing is serialized at the one TPM, §4.3 of research). **Why not shared:** the suite has no gauge for GPU/VRAM/inference-concurrency headroom — it is a physical property of *this* Critical-infra host's local model stack and exists nowhere else in the suite. It carries `Freshness` §4.9 (`source: supervisor · as-of`) and degrades to the halt-gold unknown when its read is stale; it is a *readout*, never a control.

### 4.2 `TPMSealStatus` — hardware key-custody health (never key material)
Renders TPM root-of-trust posture: `/dev/tpmrm0` reachability, PCR-policy seal binding, `TPM2_Certify` attestation result, and counts of `fixedTPM`-sealed vs soft-key agents (RESEARCH §4). **Why not shared:** it is a hardware-root-of-trust health signal unique to the layer that *physically holds* the per-agent signing keys — no other component owns TPM custody, and no §4 badge expresses "seal bound / can't confirm seal." **Hard constraints:** it shows *health*, **never** key material, private blobs, or `sub`-linked secrets; and it obeys the false-green rule absolutely — unconfirmable seal = halt-gold `CANNOT CONFIRM KEY SEAL`, never green. State parts render via `StatePill` §4.5; unknowns via `Freshness` §4.9.

*(Model-stack rows, the provenance ledger, and any fleet-process rows are **not** app-specific — they are `DataTable` + `TierBadge` + `StatePill` + `AuditInspector` + `LiveAgentView` row anatomy respectively.)*

---

## 5. Human-surface half of the API (two views, one state)

The operator status UI and the runtime's operator/MC control surface are **siblings over one runtime state** — the same state the heartbeat SSE producer aggregates (`agent-runtime-mc-heartbeat.md`) and the same state the drain/kill client half acts on. The UI is **read-mostly**; it mints no fleet truth (MC does). All reads carry a `Freshness` stamp.

| Method / path | Returns (read over one state) | Renders in |
|---|---|---|
| `GET /api/runtime/status` | `runtime_instance_id`, `supervisor_ts`, `roster` (denominator), `runtime_drain_state`, kill `epoch` mirror | Runtime-Instance panel; drives the read-only `HaltBand` origin |
| `GET /api/runtime/models` | per **logical role**: model id, commit digest, SHA-256, quant, `provenance_verified` flag, Sigstore ref, `online` state | Model-Stack table (`TierBadge`/`StatePill`) |
| `GET /api/runtime/headroom` | VRAM pool used/total, active decode streams, measured knee `C`, TPM sign-queue depth, `as_of` | `EngineHeadroom` §4.1 |
| `GET /api/runtime/keys/custody` | TPM device reachability, PCR-policy seal state, last `TPM2_Certify` result + age, sealed-vs-soft agent counts — **NO key material** | `TPMSealStatus` §4.2 |
| `GET /api/runtime/drain` | commanded posture (mode/epoch/grace-deadline), current `drain_state ∈ {active,draining,drained,quiescing,quiesced}`, last `DRAINED` report, `QUIESCED_BY_OUTAGE` flag | Drain/Kill-Compliance panel + states (F)/(G) |
| `GET /api/runtime/provenance` | append-only model-load ledger (role, digest, sig ref, Model-BOM, outcome), chain/signature-verify result | `AuditInspector` §7.2 provenance mode (3.5) |
| `POST /api/runtime/maintenance/{drain\|restart}` *(optional, §3.4)* | local per-process maintenance; **not** the global kill; guarded by `ConfirmFriction` §5.1 (light variant) | `DangerAction` §4.7 |

**Explicitly NOT here:** the rich per-agent heartbeat stream (that SSE terminates at **MC**, `LiveAgentView` §7.3, per `agent-runtime-mc-heartbeat.md` — this UI does **not** host its own rich stream; it re-syncs its own status panels via REST and may tail a thin status SSE that follows the `LiveStream` §5.5 contract for *its own* liveness only). No approve/execute/kill-actuation endpoint — those authorities are not the runtime's to hold (§4.7 printed absence).

---

## 6. Consistency notes (what it consumes, from where)

- **Fleet view → Mission Control.** The rich agent/fleet console is `LiveAgentView` §7.3 (MC-owned). This app **does not fork it**; it deep-links (`[ MC fleet ▸ ]`, and every `sub` → `/agents/<sub>`) and, in the rare case it renders per-process rows, reuses that exact row anatomy so there is **one fleet, not two**.
- **Kill switch → read-only.** `HaltBand` §4.6 is mirrored read-only; actuation is MC (`HoldToActuate` §5.2/§7.3) + auth only. This app is the **client half** — its contribution is honest drain-compliance state, never a trigger. `Shift+Esc` §5.3 focuses the (deep-linked) halt path with the documented fallback chord.
- **Review/approval → MC/Board.** N/A here — the runtime hosts no review queue; any escalation it *files* (as an agent action) surfaces in MC's `ReviewQueue` §7.1, not on this surface.
- **Audit/provenance → shared family.** The model-provenance ledger is `AuditInspector` §7.2 (provenance mode), obeying the never-false-green chain-verify rule §4.9.
- **Identity → auth.** Every `sub` is `PrincipalRef` §4.2, resolving to auth; no bare human names.
- **Honest state everywhere.** All physical figures carry `Freshness` §4.9; unconfirmable seal/provenance/liveness render halt-gold unknowns, never green; a dependency outage is **Pattern D §5.4 (gold ⛊)**, a fixable fault is **Pattern R (red ✕)**, and the two are never conflated — the commanded-kill (F) vs outage-quiesce (G) distinction is the runtime-specific instance of that rule.
- **Tokens/chrome/keyboard.** `AppShell` §6.1, `DataTable` §6.2, `Modal` §6.4, `Toast` §6.5 (never for the stop/degraded posture — those are persistent bands), full keyboard model §5.6, all §3 tokens — inherited verbatim.

**Net:** a single Instrument status screen plus two justified hardware/compute telemetry readouts; everything else is a shared component or a deep-link. Intentionally thin — the engine room reports its physical truth and points at the cockpit for everything else.
