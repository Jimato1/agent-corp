# Helm · Claude Design injection block — Agent Runtime (the engine room)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Agent Runtime (the engine room)

**Purpose (one line):** A deliberately thin operator status surface that reports the *physical truth* of the runtime host — model stack + supply-chain provenance, local GPU/inference headroom, TPM key-custody seal health, and this runtime's own drain/kill compliance — for the facts Mission Control cannot show because they live on the runtime hardware itself.

**Who uses it:** Operator-facing, one screen. Agents do NOT use this (the runtime *runs* agents; its control surface faces the operator/MC). The rich per-agent fleet console is **not here** — it is Mission Control's `LiveAgentView` at `mc.<SUITE_DOMAIN>/agents`, and this surface deep-links out to it. This app is the **client half** of the kill switch and hosts **no kill trigger**.

**Archetype:** Instrument (dark control-room), dark-only, throughout. One screen, no Workshop content anywhere (the runtime authors no documents).

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side-rail (collapsed to one nav item) + global header (app name, `SYSTEM STATE` center zone, operator identity, read-only halt mirror right) + suite switcher carrying the one shared posture line. Substrate `--sub-900` bg `#0E1116`, panels `--sub-850` `#12161C`, header `--sub-800` `#171C24`; separation by 1px hairline `--sub-600` `#323C49`, never shadow.
- **PrincipalRef** — mono `sub`, kind-glyphed: ◐ operator (header, `operator:ada`), ⬡ agent (any per-agent count that drills in). Copy-on-click; an agent `sub` clicks through to MC `/agents/<sub>`. Never a bare human name.
- **TierBadge** — provenance on each model row: **Verified** family = `--ok` outline `#46B98A` + ✔ glyph (digest-pinned + Sigstore-signed). A model whose signature can't be confirmed does NOT get a Verified badge — it renders the false-green-forbidden unknown instead. Provenance is display-of-truth, never editable.
- **StatePill** — one glyph+label pill per state, never color-only: `● ONLINE` (`--ok`), `✕ ERROR` (`--danger` `#E5594E`), `● ACTIVE` / `⇉ DRAINING` (`--drain` `#A98CE8`) / `DRAINED` / `QUIESCED` for `drain_state`; TPM `● REACHABLE` / `▲ WARN` (`--attn` `#E8B84B`); Sigstore gate `⛊ ARMED`.
- **FenceState** — only if per-process rows ever render: healthy held lease is neutral `--ink-700` + 🔒 (never green); a zombie (heartbeat token behind Board's current gen) is `⚠ SUPERSEDED` in `--attn`, drawn identically to MC.
- **Freshness** — every physical figure carries `⟳ … · source · as-of` age stamp; past its bound goes amber `▲ STALE` with the safe reading spelled out. **Governs the false-green rule:** a stale/unconfirmable read renders halt-gold `⚠ CANNOT CONFIRM …`, never a fabricated green.
- **HaltBand** — full-width GOLD band under the header, `--halt-500` `#F2842B` on `--halt-tint` `#2E1D0B` wash, interlock ▮▮ (engaged) / shield ⛊ (safe-stopped), text `--halt-ink` `#FFD8A8`, never ✕, never red. **Read-only mirror here** — actuator deep-links to MC/auth. G2 uses the intensified doubled-glyph `▮▮▮▮` + edge striping variant.
- **DangerAction + ConfirmFriction** — used for the printed constitutional-absence facts (🔒, no affordance) and, if any local per-process maintenance action exists, the *toward-less-action* **light signal-cyan** confirm (`#29B6D8`) — never the full red typed-intent ceremony, because this surface can never move the system toward more action.
- **HonestState** — the `✔ confirmed · ◐ pending · ⇉ draining` triad wherever halted-agent counts appear; all three slots always shown; never "all stopped" while pending/draining > 0.
- **DataTable** — dense zebra (`--sub-750` `#1E242E` stripe), sticky header, mono ID column, copy-on-click; used for the model-stack table (and fleet-process rows if ever shown).
- **AuditInspector** (cross-app pattern, provenance mode) — the model-provenance ledger reuses this, not a bespoke view.
- **LiveAgentView** (cross-app pattern, MC-owned) — the rich fleet view lives there; this app deep-links (`[ MC fleet ▸ ]`) and, in the rare case it renders process rows, borrows that exact row anatomy so there is **one fleet, not two**.

**⬢ Screens & views to build:**

**Engine-Room Status (`/status`) — the one screen.** A single Instrument column of hairline-separated status panels inside `AppShell`; instrument-dense, no card-soup. Header shows app name + `the workforce (engine room)`, center `SYSTEM STATE` readout, operator `PrincipalRef` + `🔑 fresh/stale` step-up cue + `[ MC fleet ▸]` deep-link.

```
┌ AppShell header ───────────────────────────────────────────────────────────┐
│ agent-runtime · the workforce (engine room)   SYSTEM STATE: ● G0 NOMINAL    │
│                                     operator:ada ◐ · 🔑 fresh · [ MC fleet ▸]│
├─────────────────────────────────────────────────────────────────────────────┤
│  (no HaltBand at G0 — band appears only when posture > G0 or safe-stopped)   │
│  RUNTIME INSTANCE ──────────────────────────────────────────────────────    │
│  rt-9f2a…   supervisor ⟳ fresh 4.1s   roster 18 agents   drain_state ● ACTIVE│
│  🔒 This runtime holds NO host credentials · cannot approve or execute work. │ ← printed absence
│  MODEL STACK & PROVENANCE ───────────────────── DataTable + TierBadge + Pill │
│  logical role         model / digest      prov.       quant   loaded         │
│  adversarial-reviewer qwen 9c3f…          ✔ VERIFIED  Q6_K    ● ONLINE        │
│  scrum-master         llama a71b…         ✔ VERIFIED  Q5_K_M  ● ONLINE        │
│  hands-pool           mist 4d0e…          ✔ VERIFIED  Q4_K_M  ● ONLINE        │
│  embed (TEI, Library) qwen3 77ac…         ✔ VERIFIED  FP16    ● ONLINE        │
│  Sigstore load-gate: ⛊ ARMED · fail-closed · last verify ⟳ 6s                │
│  LOCAL-COMPUTE HEADROOM ──────────────────────────────── EngineHeadroom      │
│  VRAM  38.6 / 48.0 GB ▓▓▓▓▓▓▓░░ · decode streams 11 / knee C≈14              │
│  TPM sign queue depth 2 (serialized) · source: supervisor · as-of 3s         │
│  KEY-CUSTODY (TPM SEAL HEALTH) ───────────────────────── TPMSealStatus       │
│  /dev/tpmrm0 ● REACHABLE · PCR seal ● BOUND · attest ✔ CERTIFIED             │
│  agents sealed 15 fixedTPM · 3 soft-key   [ never shows keys ] · as-of 5s     │
│  DRAIN / KILL COMPLIANCE (client half) ─────────────────────────────────     │
│  commanded posture G0 · not draining.   MC owns actuation → [ MC fleet ▸ ]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

Primary actions: read-only monitoring; deep-links to MC (`[ MC fleet ▸ ]`, every agent `sub` → `/agents/<sub>`); optional light-friction local maintenance only if exposed (see below). Panels top-to-bottom: **Runtime Instance** → **Model Stack & Provenance** (DataTable) → **Local-Compute Headroom** (`EngineHeadroom`) → **Key-Custody / TPM Seal** (`TPMSealStatus`) → **Drain / Kill Compliance**.

**Every state:**
- **Loaded / nominal** — the wireframe: `drain_state ● ACTIVE`, all models `✔ VERIFIED / ● ONLINE`, TPM `REACHABLE / BOUND / CERTIFIED`, headroom within knee C, all freshness fresh, suite posture `● G0 NOMINAL`.
- **Loading** — static skeleton rows matching each panel (no spinner). Header posture shows last-known with a `▲ reconnecting` Freshness stamp, never a fabricated green.
- **Empty (invitation)** — no runtime instance registered / no models loaded (fresh boot, pre-enrollment). Copy: *"No agent-runtime instance is reporting. Provision the runtime and enroll its TPM-sealed keys to populate the engine room. → runtime bring-up runbook ▸."* Model-table empty: *"No model loaded. The Sigstore load-gate admits only pinned, signed models — load a vetted role model to begin."*
- **Pattern-R error (red ✕)** — a *local, fixable* fault: a model **failed Sigstore verify at load** → `✕ PROVENANCE FAILED · load refused (fail-closed)` on that row in `--danger` `#E5594E`, showing pinned-vs-computed digest and *"model not admitted; fix the pin or re-sign — no unsigned model runs."* A provenance failure is Pattern R (the gate did its job) — explicitly distinct from a dependency outage.
- **False-green-forbidden unknowns (halt-gold)** — a physical read stale/unconfirmable but not an error: TPM unreadable → `⚠ CANNOT CONFIRM KEY SEAL — /dev/tpmrm0 unreadable (as-of 47s); treat custody as UNVERIFIED`; a stale model-signature check → `⚠ CANNOT CONFIRM PROVENANCE` (never a Verified badge, never green online). All in `--halt` gold, never green.
- **Pattern-D degraded (halt-gold ⛊, NOT red)** — the auth-outage / `QUIESCED_BY_OUTAGE` posture: a dependency (auth IdP, or the runtime's own status source) is down, so the runtime safe-stopped **by inference-of-absence** — categorically different from a commanded kill and rendered as the `SYSTEM SAFE-STOPPED` band: *"This is the safety system working, not an outage of the console. STILL TRUE: no new claims; sealed keys unusable off-host; existing kill epochs enforced. Drain posture: QUIESCED_BY_OUTAGE — inferred, not commanded."* `drain_state` shows `… QUIESCING / QUIESCED`. If the supervisor heartbeat itself is stale, the whole surface flips to `⚠ CANNOT CONFIRM FRESHNESS — treating as safe-stopped` and enters Pattern D.
- **Stop-engaged (global kill)** — when auth/MC report level > G0, the gold read-only `HaltBand` slides in under the header (G2 = intensified doubled-interlock). This surface additionally shows the **client-half truth**: `drain_state ● ACTIVE → ⇉ DRAINING → DRAINED`, plus the honest note *"drain compliance is client-side defense-in-depth; the hard stop is enforced at the Gateway chokepoint and auth revocation, not here."* The band's actuator deep-links to MC/auth — **no trigger rendered here.** Header never shows a green "all agents stopped"; counts use the `HonestState` triad.

**◈ App-specific components (only where justified):**
- **`EngineHeadroom`** — local-compute capacity gauges: VRAM-pool utilization (bar, e.g. `38.6 / 48.0 GB`), live decode-stream concurrency **against the measured knee C** (`streams 11 / knee C≈14`), and the TPM signing-queue depth (signing serialized at the one TPM). Carries `Freshness` (`source: supervisor · as-of`); degrades to halt-gold unknown when stale. A *readout*, never a control. **Not shared:** the suite has no gauge for GPU/VRAM/inference-concurrency headroom — a physical property of this Critical-infra host's model stack, existing nowhere else.
- **`TPMSealStatus`** — hardware key-custody health: `/dev/tpmrm0` reachability, PCR-policy seal binding, `TPM2_Certify` attestation result, and counts of fixedTPM-sealed vs soft-key agents. State parts via `StatePill`, unknowns via `Freshness`. **Hard constraints:** shows *health only* — **NEVER** key material, private blobs, or `sub`-linked secrets; obeys false-green absolutely (unconfirmable seal = halt-gold `CANNOT CONFIRM KEY SEAL`, never green). **Not shared:** a hardware-root-of-trust signal unique to the layer that physically holds the per-agent signing keys; no §4 badge expresses "seal bound / can't confirm seal."
- **Model-provenance ledger** — the append-only record of every model load (role, model id, commit digest, SHA-256, Sigstore signature ref, Model-BOM entry, verified/refused outcome). This is **NOT a new component** — it is the *provenance-mode pivot of the shared `AuditInspector`*, reachable as a sub-panel/expand from the Model-Stack panel. Chain/signature-verify affordance obeys the false-green rule: stale/failed verify = halt-gold `⚠ CANNOT CONFIRM` or danger-red `✕ SIGNATURE INVALID`, never a fabricated green. Read-only (append-only; corrections are new rows). Same rows feed MC's Stage-7 provenance display — one truth, two viewers.

**⚠ Safety / danger surfaces specific to this app:**
- **Kill-switch client half, not trigger.** This surface hosts NO global kill actuator (that is MC's `LiveAgentView` + auth L1 only). It shows the kill posture read-only via `HaltBand` and reports its own **drain compliance** (`ACTIVE → DRAINING → DRAINED`). Honest note printed, not implied: the hard stop is enforced at the Gateway chokepoint + auth revocation, not here — drain here is defense-in-depth.
- **Printed constitutional absence.** Per the destructive-absence rule, render 🔒 (lock, NOT ⛔, NOT a greyed toggle) on the affirmative facts: *"This runtime holds NO host credentials · cannot approve or execute work."* A disabled control would falsely imply a latent capability.
- **Commanded-kill (F) vs outage-quiesce (G) must render differently.** A commanded kill = gold `HaltBand` with `drain_state DRAINING/DRAINED`; an auth/dependency outage = gold `SYSTEM SAFE-STOPPED` band with `QUIESCED_BY_OUTAGE` (inferred, not commanded). This distinction is load-bearing — label each explicitly, never conflate, never render either as a red error.
- **False-green absolutism on physical truth.** TPM seal, model provenance, GPU headroom, supervisor freshness — every one obeys the never-false-green rule. A runtime that cannot prove its keys are sealed or its models are signed must *say so* in halt-gold, because those are Critical-infra safety properties.
- **Local maintenance (if exposed at all) is light friction only.** Restart a wedged supervisor / drain one process for a node reboot routes through `DangerAction` + `ConfirmFriction` **toward-less-action** (light signal-cyan `#29B6D8`, single confirm, no typed intent), scoped to this host, carrying the note that fleet-wide stop lives in MC. The runtime can never move the system *toward* more action — that full-red typed-intent ceremony does not exist here. Prefer to omit these and route the operator to MC.

**⚑ Gaps flagged:**
- **[GAP — operator/Claude Design to decide]** the exact visual encoding of the `EngineHeadroom` VRAM/decode-stream gauges (bar vs radial vs numeric-only) and how the "knee C" threshold is marked on the bar (tick, color-shift near capacity) is not specified beyond `▓▓▓▓▓▓▓░░` — pick a treatment within the token set; do NOT put headroom on the halt-gold ramp (gold is reserved for stop states; use neutral fill with `--attn` `#E8B84B` only as it approaches the knee).
- **[GAP — operator/Claude Design to decide]** whether this thin surface ever renders per-process fleet rows at all is left to the operator; if it does, they must reuse the MC `LiveAgentView` row anatomy verbatim (one fleet, not two). Default posture is to deep-link, not render.
