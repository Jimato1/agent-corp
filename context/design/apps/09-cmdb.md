# Helm · Claude Design injection block — CMDB (Policy-Brain Operator Console)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — CMDB (Policy-Brain Operator Console)

**Purpose (one line):** The suite's policy plane — the fleet inventory plus the rules that decide *"may this host be touched right now?"* — and the one console where the operator authors that policy and sees exactly what any edit makes auto-executable *before* it takes effect.
**Who uses it:** Operator-facing (human UI). Agents get a read-only MCP query surface with **zero mutation verbs by construction** — no agent screen exists here. Every screen below is the human console.
**Archetype:** **Instrument only** (dark-only control-room; `compact` 28–32px density; Inter + JetBrains Mono; `DataTable`-first). There is **no Workshop pane** — policy is structured YAML edited through typed forms and viewed as diffs, never long-form prose. No `--paper-*`, no Source Serif 4.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark 224/56px side rail + global header + suite switcher; header carries operator `PrincipalRef`, a session-freshness stamp, and a load-bearing **🔑 fresh / 🔑 stale step-up cue** (the gate-weakening confirm needs a fresh step-up). Read-only `HaltBand` mirror renders top-right.
- **HaltBand** — full-width gold (`--halt-500 #F2842B`) safe-stop band under the header, calm interlock ▮▮ / shield ⛊ glyph, never ✕. **Read-only here** — CMDB is not in the kill-actuation chain; any actuator affordance deep-links to MC/auth. Carries the `HonestState` triad verbatim.
- **HonestState** — the `✔ confirmed · ◐ pending · ⇉ draining` triad (green/amber/violet), all three slots always shown even at zero; echoed live inside the gate-weakening consequence block.
- **TicketRef** — opaque mono ID chip on `--sub-750`, copy-on-click; used for `host_id`, `decision_id`/`jti`, Board ticket refs.
- **PrincipalRef** — kind-glyphed mono `sub`: ⬡ agent / ◐ operator / ⚙ service; used for `bound_by`, change-log author, proposer.
- **TierBadge** — the provenance badge: **`host-originated`/`UNTRUSTED` = striped-amber outline + ⚠ + the word UNTRUSTED on hover** (`--attn #E8B84B`, adversarial input). Used on every Wazuh-synced fact. `operator` on `facts_override`; `~ heuristic` micro-tag on group suggestions. **Taint is display-of-truth — no control clears it.**
- **StatePill** — one glyph+label pill per lifecycle state, never color-only (`● active`, `▲ stale`, `❄ FREEZE-ACTIVE`, `◼ CLOSED`).
- **DangerAction + ConfirmFriction** — destructive/gate-weakening = red (`--danger #E5594E`) behind typed-intent + auth live step-up (FULL variant); toward-less-action (tightening) = light **signal-cyan** (`--signal-500 #29B6D8`) single confirm, no typed intent.
- **Freshness** — `⟳` age stamp on every live/mirrored figure; past bound → amber `▲ STALE` with the safe reading spelled out; **never a false green** (stale/unavailable renders honest-unknown in halt-gold, not a fabricated healthy state).
- **ReviewChip** — needs-review/escalation pill carrying the machine reason verbatim + deep-link into MC's canonical queue (`/review/<ticket_id>`); CMDB **files, never clears**.
- **DataTable** — dense zebra (`--sub-750` stripe), sticky sortable header, mono ID column with copy, roving tabindex.
- **AuditInspector** (§7.2 cross-app pattern) — append-only row table with a chain-verify affordance following the false-green rule; used for policy-change history and the decision log.
- **Field / Modal** — inline-validated inputs; modal scrim with the halt affordance painted above it (never occluded).

**▣ Screens & views to build:** (11 side-rail destinations + break-glass; every screen enumerates loaded / loading-skeleton / empty-invitation / Pattern-R red error / Pattern-D gold degraded / stop-engaged)

**Global shell.** Header reads `SYSTEM STATE: ● G0 · policy HEAD 9f3a2c ⟳ 0.4s ── ◐ operator:ada  🔑 fresh`. Side rail (danger-tinted **⚠ Break-glass** entry visually set apart at the bottom):
```
┌ cmdb ──── SYSTEM STATE: ● G0 · policy HEAD 9f3a2c ⟳ 0.4s ── ◐ operator:ada  🔑 fresh ┐
│ [read-only HaltBand mirror renders here only when kill level > G0 or a dep is down]  │
├ rail ──┬─────────────────────────────────────────────────────────────────────────────┤
│ ▸Fleet │  <screen content>                                                            │
│ ▸Host  │                                                                              │
│ ▸Tiers ▸Tasks ▸Catalog ▸Sandbox ▸Discovery ▸Dry-run ▸History ▸Decisions ▸Escalations │
│ ⚠Break-glass  ← danger-tinted, set apart                                              │
└────────┴─────────────────────────────────────────────────────────────────────────────┘
```
- **Global degraded band (Pattern D):** when CMDB's own gate cannot serve (snapshot unhealthy, `policy_version != HEAD`, boot-integrity unverified, clock unsafe), every screen shows the **SAFE-STOPPED band** in halt-gold (⛊, *not* red) *before any content*: *"SYSTEM SAFE-STOPPED · policy snapshot unverified — every verdict is `deny(policy_unavailable)` by design. STILL TRUE: no host can be actioned; existing kill epochs enforced. DO: read history out-of-band; re-arm requires step-up ack."* This is the safety system working.

**1. Fleet list — `/fleet`.** The inventory truth-surface. `DataTable`, mono `host_id` column, filter chips `[tier▾][class▾][window▾][Wazuh▾]`, `/` focuses filter, `⟳ as-of` stamp.
```
Fleet · 21 hosts   [tier▾][class▾][window▾][Wazuh▾]   / filter        ⟳ as-of 8s
┌ host_id     │ criticality │ class    │ window-state      │ mode │ Wazuh         │ lifecycle │
│ [ nas-01 ]  │ ⬢ tier0     │ managed  │ ◼ CLOSED          │ ask  │ ● SYNCED ⟳3m  │ ● active  │
│ [ web-04 ]  │ ⬢ tier2     │ managed  │ ● IN-WINDOW 01:42 │ auto │ ● SYNCED ⟳2m  │ ● active  │
│ [ db-02 ]   │ ⬢ tier1     │ managed  │ ❄ FREEZE-ACTIVE   │ ask  │ ▲ STALE ⟳41m  │ ▲ stale   │
│ [ sbx-01 ]  │ — (no tier) │ ⚙ dispos.│ — (n/a)           │auto* │ — not enrolled│ ● active  │
│ [ mail-03 ] │ ✦ unpolici. │ managed  │ ◼ deny(no_policy) │ —    │ ● SYNCED ⟳1m  │ ▲ needs-tiering →Board │
└ disposable pool collapsed by default · [show 2 disposable]   *sandbox_exec carve-out only ┘
```
Row-click → Host detail. `criticality` = **CriticalityTier chip** (app-specific, NOT TierBadge). `window-state`/`lifecycle` = StatePill; `❄ FREEZE-ACTIVE` is amber `--attn`, never gold. `unpolicied` shows always-deny sentinel + `ReviewChip needs_tiering → Board`. `Wazuh` staleness on hover: *"verdicts unaffected — policy is CMDB's own fact."* **Empty** → "No hosts yet. Bind a discovered agent or author a non-agent asset." **Pattern-D** → whole table replaced by SAFE-STOPPED band (projection index unavailable → honest unknown, never a stale green table).

**2. Host detail / policy editor — `/fleet/<host_id>` — the ONLY policy writer in the suite.** Two columns: left = identity + live-evaluated posture; right = editable policy. **Every write routes through the ceremony (screen 3).**
```
[ nas-01 ]  ⬢ tier0 · managed · ● active                    [ Dry-run this host → ]
─ Evaluated now (same code path as Gateway & MCP) ──────────────── ⟳ as-of 0.2s ─
  window: ◼ CLOSED · next opens Sun 22:00 Europe/Oslo
  mode by action_class:  package_update ask · config_change ask · reboot ask(floor) …
  reason if queried now: [ not_in_window ]        policy_version 9f3a2c (= HEAD ✔)
─ FACTS (rebuildable mirror — NOT policy) ────────────────────────────────────────
  os_family linux ⟨TierBadge: host-originated · UNTRUSTED⟩  arch x86_64 ⟨host-originated⟩
  eol_date 2028-04 ⟨TierBadge: operator⟩  wazuh.agent_id 007 · bound_by ◐operator:ada [rebind…]
─ POLICY (canonical YAML — editing any cell opens the change-control ceremony) ────
  criticality tier: [tier0▾]      overrides (per action_class auto|ask): [edit matrix]
  snapshot_capability: [btrfs▾]  ⚠ moving away from 'none' is a GATE-WEAKENING edit
  maintenance windows: [ WindowScheduleEditor ]   on_window_close: [abort_and_rollback▾]
  ── CONSTITUTIONAL ABSENCE (printed fact) ────────────────────────────────────────
  🔒 This surface holds no lease, mutex, or approval record. CMDB is the policy VETO,
     not the trigger — cannot approve, claim, or execute. Agents cannot write policy.
  [ Propose policy change… ]  ← danger-primed; opens the ceremony
```
The "Evaluated now" panel is **byte-identical to the MCP `is_actionable_now` and the Gateway's binding verdict** (two-views-one-state). Facts provenance = TierBadge; taint is display-only, no clear control. FenceState/approval absence = printed §4.7 fact (🔒, **no greyed toggle**). **Pattern-D** → `evaluate()` can't run → panel shows `⚠ CANNOT CONFIRM — policy snapshot unavailable; treated as deny` in halt-gold, never a stale posture. **Pattern-R** → inline field-validation reject (e.g. RRULE part outside allowlist) in `Field` error style *before* the ceremony opens.

**3. ★ CENTERPIECE — the gate-weakening ceremony (propose → blast-radius preview → step-up confirm).** Every policy/registry/bind/sandbox mutation runs here. It **IS `ConfirmFriction`** filled with the app-specific **`BlastRadiusPreview`** and bound to the diff hash. Friction is chosen **by direction of the edit** (classified server-side, merely rendered here):
- **Tightening/benign** (add a freeze, disable sandbox knob, narrow a window) → **light** variant: single **signal-cyan** confirm, no typed intent, no step-up.
- **Gate-weakening** (any cell moves permissive; `ask→auto`; new allow window; `snapshot_capability` off `none`; tier downgrade; catalog/task-type reclass; bind/rebind; sandbox re-enable/create; key rotation) → **FULL** variant:
```
┌─ CONFIRM: WEAKEN POLICY  (nas-01 · snapshot_capability: none → btrfs) ── --danger header ┐
│ ⚠ CONSEQUENCE — this moves the system TOWARD MORE real-world action.                     │
│   'btrfs' gives nas-01 in-band rollback, so snapshot-gated classes stop routing to ask/  │
│   manual. Irreversible in effect until re-tightened.                                     │
│ ── BlastRadiusPreview (fills the ConfirmFriction app-specific slot) ────────────────────  │
│  This edit makes ▸ 4 (host × action_class) cells auto-executable  (were ask/manual)      │
│                  ▸ 1 host gains window coverage it lacked   ▸ full-shadow warnings: none  │
│  ┌ host   │ action_class   │ before │ after │   diff (canonical, mono):                   │
│  │ nas-01 │ package_update │ manual │ auto  │   - snapshot_capability: none                │
│  │ nas-01 │ config_change  │ ask    │ auto  │   + snapshot_capability: btrfs               │
│  │ …2 more                              │   diff_hash: 7c1e…a90 (confirm binds here)       │
│ live honest-state echo: suite ● G0 · confirmed 0 · pending 0 · draining 0                 │
│ Type  WEAKEN nas-01 snapshot  to confirm:  [▏                    ]                         │
│ Re-authenticate (step-up): 🔑 passkey · auth_time must be fresh  [Re-auth] (auth live)     │
│        [ Cancel ] (default focus, Esc)          [ Weaken policy ] ← --danger, disabled      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
Primary disabled until typed-intent matches **AND** step-up fresh. On submit a live re-check runs at the commit instant; any drift (diff-hash mismatch, snapshot moved) ⇒ Pattern-R "policy moved under you — re-propose." On success: **commit → push to remote → *only then* snapshot swap** (push is a precondition for weakening), writing a hash-chained `policy_change_log` row. **Halt affordance never occluded.** **Pattern-R** → typed-intent mismatch (inline), step-up stale (`🔑 stale — re-auth`), or **push-failure on a weakening edit → the swap did not happen, edit refused** with a clear red error, commit parked. **Pattern-D** → the auth live-check transport is unreachable → the confirm **fails closed in halt-gold** ("cannot confirm authorization live — refusing to weaken"), *not* red.

**4. Tier catalog — `/tiers`.** `DataTable` of `tier0…tier3` + read-only `unpolicied` sentinel. Each row: CriticalityTier chip, its `{action_class → auto|ask}` default row (the **destructive-never-auto floor cells rendered locked `🔒 floor`** — printed absence, not a disabled toggle), and `{health_check_timeout_s, ssh_wait_timeout_s}`. Editing a default row or a floor-shrink attempt → ceremony; a floor-shrink is **rejected outright** as a §4.7 printed impossibility. **Pattern-D** → SAFE-STOPPED band.

**5. Task-type registry — `/tasks`.** `DataTable` of `{title, destructive, reversible, action_class default, external_verifier, verification_window_s}`. Board triage + auth PDP read this, so a reclassification toward reversible/less-destructive, verifier unbinding, or a permissive attribute is **gate-weakening** → ceremony. `external_verifier` values render as plain labels. **Empty** → "No task types registered — Board triage falls back to catalog-novelty. Add one." **Pattern-R** → duplicate `type_key`.

**6. Runbook-catalog policy attributes — `/catalog`.** `DataTable` of playbook **policy attributes only** (implementations are the Gateway's, read-only): `{action_class binding, risk_class, applicable_tiers, rollback_declared, rollback_method, sandbox_eligible}`. A cell can go `auto` only while a catalog entry exists with `rollback_declared: true`, so catalog-entry creation / `action_class` rebind / a `rollback_declared` false→true flip is **gate-relevant** → ceremony (BlastRadiusPreview shows which cells flip auto-eligible). **Empty** → "No playbook policy attributes — every class stays ask/manual until authored."

**7. Sandbox pool + KILL KNOB — `/sandbox`.** The immutable `disposable`-class pool (no tier, no windows, no Vault creds).
```
Sandbox pool · disposable class · orthogonal to tier          knob: ● ENABLED
┌ host_id │ class    │ Vault creds              │ verdict {sandbox_exec}                │
│ [sbx-01]│ ⚙ dispos.│ 🔒 none (by construction)│ permit · verdict_basis sandbox_carve_out │
└──────────────────────────────────────────────────────────────────────────────────────┘
  [ Disable sandbox pool ]  ← the OPERATOR'S SANDBOX KILL KNOB
   Disabling: instant, ceremony-free TIGHTENING (light signal-cyan) → every sandbox verdict
   becomes deny(sandbox_disabled).  Re-enabling / creating a slot: GATE-WEAKENING (→ ceremony).
  ⛊ Not a kill-switch: the global kill switch covers sandbox exec at the Gateway chokepoint;
     this knob is the policy-plane stop — deep-links to MC for the global halt.
```
Vault-creds absence = 🔒 printed fact. Verdict `permit` = **neutral `--ink-700` label, NOT green** (green is reserved for external-verifier confirmation; a policy permit is not a verification). A disposable record carrying any window/override/tier/Wazuh-bind is a config error → row shows `⚠ deny(sandbox_config_error) → Board` (ReviewChip). **Empty** → "No sandbox slots — Library curation cannot get sandbox evidence until a slot is created (gate-weakening)."

**8. Wazuh sync / discovery — `/discovery`.** Two-part split. Top = sync status (last poll Freshness, RBAC scopes, version probe); a sync failure renders the **mirror `▲ STALE` with "verdicts unaffected" — Pattern D at the mirror level, NOT a red console error** (a Wazuh outage is not the console breaking). Bottom = discovery queue of `discovered_agents` with no host record yet.
```
Wazuh sync · account: agent:read syscollector:read group:read · v4.14.2 ✔  last poll ⟳4m ● OK
─ Discovery queue · 3 unbound ────────────────────────────────────────────────────────────
┌ agent_id │ reported name ⟨host-originated⟩ │ os ⟨host-originated⟩ │ group (advisory) │ action │
│ 013      │ "web-05" ⟨UNTRUSTED⟩           │ linux ⟨UNTRUSTED⟩    │ web ~suggestion  │ [bind…][new host_id…]
└──────────────────────────────────────────────────────────────────────────────────────────┘
  ⚠ Reported names/groups are ATTACKER-INFLUENCEABLE at enrollment. Group membership is a
     UI-only tiering SUGGESTION, never auto-applied. Bind = gate-weakening, operator-confirmed,
     change-logged; a new host lands at 'unpolicied' + fires needs_tiering → Board.
```
Every Wazuh-reported field = TierBadge `host-originated`/`UNTRUSTED`; group suggestions carry `~ heuristic`. Bind/new-`host_id`/rebind → ceremony. **Empty** → "No unbound agents — inventory matches Wazuh." **Pattern-R** → bind to already-bound agent_id. **Pattern-D** → Wazuh unreachable = mirror STALE band with last-known set + as-of stamp, **not** red.

**9. Verdict dry-run / "explain this verdict" — `/dry-run` — app-specific `VerdictTrace`.** The operator runs the **same `evaluate()`** at an arbitrary `at`, subject-free, and sees *why* — the console half of the binding `POST /v1/decision`.
```
Explain a verdict   host_id [nas-01]  action_class [kernel_update▾]  at [2026-07-05 23:30 Oslo] [Explain]
─ VerdictTrace ────────────────────────────────────────────────────────────────────────────
  RESULT:  deny        ← neutral/danger outcome token, NOT green
  decision path (universal preconditions → class fork → window → mode):
    ✔ host resolved   ✔ snapshot healthy · policy_version 9f3a2c = HEAD
    ✔ action_class ∈ enum(7)   ✔ clock healthy (offset 0.3s, NTP-synced)
    ▸ class fork: managed → window algebra
       ✔ allow window w-sun-night covers T    ✕ freeze f-quarter-end also covers T
       → deny-overrides: effective_close = start of freeze → NOT cleanly in-window
    reason[]: [ freeze_active(f-quarter-end) ]   (CMDB-authored enum codes, never host free-text)
  policy_version 9f3a2c · valid_until = evaluated_at + 60s      [ copy trace ]
  NOTE: dry-run is UNSIGNED/advisory (no aud, no JWS) — mechanically unusable at the Gateway.
```
**Empty** → "Enter a host + action_class to trace a verdict." **Pattern-R** → unknown host/bad action_class renders the honest `deny(no_such_host)` / `deny(bad_action_class)` **as the correct result, not an error** (a deny is a valid answer). **Pattern-D** → `evaluate()` unavailable → SAFE-STOPPED band.

**10. Break-glass console — `/break-glass` — distinct, LOUD.** Operator-only emergency window minting; the ceremony with a **louder, freeze-specific re-type** + its own danger-tinted rail entry + a persistent BREAK-GLASS banner riding the whole console while a window is live.
```
⚠ BREAK-GLASS — emergency maintenance window
  Mints ONLY a one-shot bounded window (hard cap ≤4h, auto-expiring) or a time-boxed tier
  exception (same cap). NEVER touches the destructive-never-auto floor (🔒 printed fact).
  ┌─ CONFIRM: BREAK-GLASS (db-02 · emergency allow window 90m) ── --danger header ┐
  │ ⚠ This OVERRIDES an active freeze (allow < freeze < break-glass lattice).      │
  │   BlastRadiusPreview: db-02 becomes cleanly-in-window 90m; 3 classes clear.    │
  │ Type  OVERRIDE FREEZE db-02  to confirm: [▏           ] ← louder, freeze-specific
  │ Re-authenticate: 🔑 passkey fresh      [Cancel]   [Break glass] ← --danger      │
  └────────────────────────────────────────────────────────────────────────────────┘
  On arm: auto-files break_glass_posthoc review → Board (ReviewChip); distinct chain row.
```
CMDB **files, never clears** the post-hoc review. **Pattern-D** → if the change-control path can't fail-closed-verify, break-glass **refuses in halt-gold** ("cannot arm safely"), never a partial arm.

**11. Policy-change history — `/history` — `AuditInspector`, git-derived.** Hash-chained `policy_change_log` rows: timestamp (mono) · PrincipalRef · `edit_kind` verb · target (TicketRef) · `weakening` flag · `diff_hash` · `git_commit` · outcome StatePill. Carries the **out-of-band `git log` verification banner** — the CMDB-specific obligation.
```
Policy-change history                                                   [ chain-verify ]
┌ ⚠ VERIFY OUT-OF-BAND: this console can lie. Confirm the chain by reading `git log` on the ─┐
│   configured REMOTE, not here. Remote: git@…/cmdb_policy.git · local HEAD present on remote ✔ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
  chain-verify: ✔ CHAIN INTACT (local)   [stale → ⚠ CANNOT CONFIRM CHAIN (gold); real break →
                                          ✕ CHAIN BROKEN (danger) — never false-green]
┌ ts       │ who          │ edit_kind    │ target    │ weakening │ diff_hash │ git_commit │ ok │
│ 12:04:11 │ ◐ operator:ada│ snapshot_cap │ [nas-01]  │ ⚠ YES     │ 7c1e…a90  │ 9f3a2c     │ ✔  │
│ 08:50:44 │ ◐ operator:ben│ add_freeze   │ [web-04]  │ tighten   │ …         │ …          │ ✔  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
**Read-only always.** A restored-older `policy_version` shows a `▲ policy_version behind HEAD` banner in halt-gold here + on every verdict. **Pattern-D** → git/remote unreachable → banner flips to `⚠ CANNOT CONFIRM local HEAD is on remote — degraded; further weakening edits refused` (halt-gold), not red.

**12. Decision-log browser — `/decisions` — `AuditInspector`.** Canonical append-only `decision_log` (every issued verdict, binding + advisory), filterable by `host_id`/`action_class`/verdict/`policy_version`. Rows: `evaluated_at` · caller-selected `aud` · `host_id` (TicketRef) · `action_class` · verdict outcome token (neutral, not green) · `decision_id`/`jti` · `policy_version` · `verdict_basis`. **Pattern-D** → SQLite log unreadable → SAFE-STOPPED (a canonical store unavailable).

**13. Escalation-outbox status — `/escalations` → Board.** The durable outbox. `DataTable`; each row a `ReviewChip` with the **machine reason verbatim** + deep-link into MC's queue once Board mints the ticket.
```
Escalation outbox → Board    ⟳ as-of 6s   ● svc:cmdb present   Board intake: ● up
┌ kind                   │ target    │ state              │ deep-link              │
│ ⚑ needs_tiering        │ [mail-03] │ ◈ delivered        │ → mc/review/T-000481   │
│ ⚑ window_ambiguity     │ [db-02]   │ ◐ queued (retry 2) │ (awaiting Board mint)  │
│ ⚑ break_glass_posthoc  │ [db-02]   │ ◈ delivered        │ → mc/review/T-000480   │
└──────────────────────────────────────────────────────────────────────────────────┘
```
Reasons: `needs_tiering`, `window_ambiguity`, `break_glass_posthoc`, `missing_from_wazuh`, `policy_integrity_error`, `clock_skew`, `sandbox_config_error`, `dst_gap_window_never_opened`. **Degraded-but-honest is first-class:** until `svc:cmdb` + Board intake exist, escalations sit `queued` locally, flagged loudly in **Pattern D halt-gold — "queued, not dropped," never a red error and never hidden.** `[resend]` = benign (light friction). CMDB **files; only MC/Board clear.** This is a **producer view, NOT the ReviewQueue and not a fork of it.**

**◈ App-specific components (only where justified):**
- **`VerdictTrace`** (screen 9) — the arbitrary-`at` decision-path explainer: preconditions → class fork → window/deny-overrides lattice → `effective_close`/grace → `reason[]` enum codes. A domain-unique *policy-decision "why" tree*; no shared component renders an evaluation tree. Reuses TicketRef/PrincipalRef for chips; only the trace layout is new.
- **`BlastRadiusPreview`** (screen 3) — the derived-effect matrix diff ("makes N (host × class) cells auto-executable; J hosts gain coverage; full-shadow warnings"). It **fills the ConfirmFriction app-specific-preview slot** the shared dialog explicitly reserves — it does *not* re-draw the dialog (the dialog *is* ConfirmFriction). A domain-unique policy-impact simulation.
- **`WindowScheduleEditor`** (screen 2) — the RRULE-allowlist maintenance-window editor with DST fold/gap-aware occurrence preview and overnight/next-day-anchor rendering. An editor for recurring policy windows; no shared component authors RRULE + IANA-zone occurrences.
- **`CriticalityTier` chip** (screens 1/2/4) — `tier0…tier3` + `unpolicied` (✦) sentinel host-criticality classification. A small labeled chip, **deliberately NOT `TierBadge`**: host criticality carries no provenance/verification-independence semantics, so borrowing TierBadge's ✔/⧉/◑/⚠ glyphs would misrepresent it. (Flagged below.)
- **`PolicyMatrix`** (screens 2/4) — the (host/tier × action_class) → `auto`/`ask`/`deny(floor)` grid. Listed for completeness; it is a thin **configuration of DataTable**, not a bespoke visual (rows/cols are a DataTable; cells are plain mode labels; floor cells are the `🔒 floor` printed fact). Introduces no new visual.

**⚠ Safety / danger surfaces specific to this app:**
- **The gate-weakening ceremony is the whole point** — any policy edit that loosens a gate gets the FULL ConfirmFriction: red primary, typed-intent, auth live step-up, a `BlastRadiusPreview` naming the exact cells that become auto-executable, a diff-hash-bound confirm token, and a tamper-evident hash-chained audit row. Commit → **push to remote → only then snapshot swap** (push-failure refuses the weakening). Direction is classified server-side; the UI only renders it.
- **Two "tier" meanings, kept visually distinct (preserve both):** host-criticality tier uses the app-specific **`CriticalityTier` chip** (a small labeled classification chip), while the provenance **`TierBadge`** (striped-amber `UNTRUSTED` on host-originated facts) is reserved for its true meaning. This is the one place "tier" means two things in the suite — surfaced deliberately.
- **Maintenance-window "FREEZE" renders AMBER, never halt-gold.** A maintenance `freeze` is *policy* → `StatePill ❄ FREEZE-ACTIVE` in the `--attn` family (`#E8B84B`). Gold/`--halt` (`#F2842B`) is reserved suite-wide for the kill switch and dependency-down fail-closed **only**. Never draw a freeze as the `▮▮ FROZEN` kill pill.
- **Verdict outcomes are never green.** `permit`/`ask`/`deny` render as outcome tokens — `deny` danger outline, `ask` amber, **`permit` neutral `--ink-700`** — because green is reserved for external-verifier confirmation and a policy permit is not a verification.
- **Sandbox KILL KNOB is a policy tightening, not the suite kill.** Disabling = instant light-friction; re-enable/create = full ceremony. `⛊ Not a kill-switch` note deep-links to MC for the global halt.
- **Fail-closed is rendered as the system working, never as breakage:** missing/stale/ambiguous/unparseable facts → `deny` shown in halt-gold Pattern-D, never a red error and never a fabricated green. CMDB can lie to the operator; the git remote cannot — hence the out-of-band `git log` verify banner on history.
- **Constitutional absences are printed, not disabled:** no FenceState, no lease/mutex, no approval affordance, no Vault creds — each rendered as an affirmative 🔒 explained fact, **never a greyed-out toggle** (a disabled control implies a latent capability). The ⛔ actionable-stop glyph must never appear on these.
- **HaltBand is read-only** — CMDB hosts no kill actuator; `Shift+Esc` focuses the header which deep-links to MC/auth (plus the documented non-browser-captured fallback chord).

**⚑ Gaps flagged:** None new — the spec is complete for design. Every color, glyph, and behavior is drawn from the frozen tokens or an app-specific component justified in the spec. The three deliberate divergences the spec records (CriticalityTier chip ≠ TierBadge; freeze = amber ≠ halt-gold; HaltBand read-only / no kill actuator here) are called out above for the design review as intended nuances to preserve, **not** as gaps to fill.
