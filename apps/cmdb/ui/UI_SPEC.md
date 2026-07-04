# cmdb — Policy-Brain Operator Console · Stage-3 UI/UX Specification

> **Consumes `context/DESIGN_SYSTEM.md` (FROZEN) and `context/DESIGN_SYSTEM_COMPONENTS.md`.** This spec cites shared components by ID and specifies **only** what is genuinely CMDB-specific. It does **not** re-draw any §4/§5/§6/§7 component. Grounding: `apps/cmdb/planning/PLAN.md` (esp. §3, §5, §6, §7.4), `context/CONTRACTS/cmdb-gateway-policy.md`, `context/CONTRACTS/cmdb-gateway-verdict-token.md`, `context/CONTRACTS/gateway-cmdb-library-sandbox.md`.

---

## 1. Scope, archetype & governing principle

### 1.1 What this console is
The CMDB is **the policy plane** — the fleet inventory plus the rules that decide *may this host be touched right now?* It is the SoD **veto, not trigger**: it holds no ticket, no credentials, no execution path, and a fully compromised CMDB returning `permit` for everything still causes zero destructive actions (PLAN §12.6). The console exists to let the operator **author policy safely** and **see exactly what any policy edit will make auto-executable** before it takes effect.

### 1.2 Archetype declaration — **Instrument, single archetype (§2)**
Every screen is **Instrument** (dark-only control-room; `compact` density; Inter + JetBrains Mono; `DataTable`-first). There is **no Workshop pane** — the CMDB authors structured YAML-frontmatter policy, not long-form prose; the git-backed markdown is the canonical store but is edited through typed policy forms and viewed as diffs, never as a reading-measure document. No `--paper-*`, no Source Serif 4.

### 1.3 The governing principle (applied on every screen)
**Fail-closed is the product; the console must never fabricate a healthy policy state.** Three rules ride every screen:
1. **Show the veto honestly.** A missing/stale/ambiguous/unparseable fact is a *deny*, and the UI renders that as the safety system working (Pattern D / `Freshness` amber "→ fail-closed"), **never** as a red error and **never** as a fabricated green (§4.9 false-green prohibition).
2. **Every gate-weakening edit is loud, blast-radius-previewed, step-up-confirmed, and diff-hash-bound** (§5 centerpiece; ARCHITECTURE §12 policy-plane change control).
3. **CMDB can lie to the operator; the git remote cannot.** The tamper-evident history renders an **out-of-band `git log` verification banner** — the chain is trusted only when read from the remote, never on the console's word alone (PLAN §6.3, AuditInspector §7.2).

---

## 2. Design language — consumes DESIGN_SYSTEM.md; **deltas only**

Tokens, safety grammar (§4), interaction grammar (§5), chrome (§6), cross-app patterns (§7) are inherited **verbatim**. CMDB-specific deltas and resolutions:

- **No SSE / no `LiveStream` (§5.5).** CMDB has no real-time surface: policy is a request/response store and the gate reads a synchronous in-process snapshot (PLAN §1). Every list/figure is **pull**, each carries `Freshness` (§4.9); when a projection or the Wazuh mirror is stale the figure degrades to amber `▲ STALE`, never a frozen green tile. The console polls (fleet/decision-log/escalations) on a documented interval; it never opens an event stream.
- **`HaltBand` (§4.6) is read-only here.** CMDB is **not** in the kill-actuation chain and hosts **no** stop trigger (§5.3 lists cmdb among read-only mirrors). The shell renders the suite-posture `HaltBand` read from source (auth/MC), carrying the `HonestState` triad (§4.8) verbatim; any actuator affordance **deep-links to MC/auth**. The one stop CMDB owns is the **sandbox kill knob** (§5.7) — a policy tightening, not a kill-switch.
- **Criticality tier ≠ `TierBadge` (§4.3) — deliberate.** The CMDB criticality tier (`tier0…tier3`, `unpolicied` sentinel) is a **host-policy classification**, *not* content provenance/verification-independence. It is rendered by an app-specific `CriticalityTier` chip (§6.1). `TierBadge` (§4.3) is reserved for its true meaning: the **`host-originated` / `UNTRUSTED` provenance badge** on Wazuh-synced facts (adversarial input, ARCHITECTURE §12). Flagged in §8.
- **Maintenance "freeze" ≠ kill "freeze" — never gold.** A maintenance-window `freeze` is *policy*; it renders as a `StatePill` (§4.5) in the `--attn` family (`❄ FREEZE-ACTIVE`), **never** in halt-gold and **never** as the §4.5 `▮▮ FROZEN G1` kill pill. Gold/`--halt` is reserved suite-wide for the kill switch and dependency-down fail-closed only. Flagged in §8.
- **No `FenceState` (§4.4), no approval affordance — by construction.** CMDB holds no lease, no host-mutex, no write-fence, and no approval record (veto-not-trigger, PLAN §12.6). This is rendered as a **printed constitutional fact** per the §4.7 destructive-*absence* rule (🔒 / ⛊ glyph, no interactive control) — **never a greyed-out toggle**. It appears once on the Host detail screen and in §8.
- **Verdict outcomes are not green.** `permit` / `ask` / `deny` render as outcome tokens inside `VerdictTrace` (§6.1): `deny` `--danger` outline, `ask` `--attn`, `permit` **neutral `--ink-700`** — *never* `--ok` green, because green is reserved for external-verifier confirmation (§4.3/§4.8), and a policy `permit` is not a verification.

---

## 3. Global shell & information architecture

Uses `AppShell` (§6.1) unchanged: 224/56px side rail, global header (app name + one-line identity "policy brain — may this host be touched now?"), `SYSTEM STATE` center zone, read-only `HaltBand` mirror right, operator `PrincipalRef` (§4.2) + session-freshness stamp + the **🔑 fresh / 🔑 stale step-up cue** (load-bearing here — gate-weakening confirm requires a fresh step-up). Suite switcher shows the one suite-posture line.

```
┌ cmdb ──────────────────── SYSTEM STATE: ● G0 · policy HEAD 9f3a2c ⟳ 0.4s ── ◐ operator:ada  🔑 fresh ┐
│ [read-only HaltBand mirror renders here only when suite kill level > G0 or a CMDB dependency is down] │
├─ rail ──┬───────────────────────────────────────────────────────────────────────────────────────────┤
│ ▸ Fleet │  <screen content>                                                                           │
│ ▸ Host  │                                                                                             │
│ ▸ Tiers │                                                                                             │
│ ▸ Tasks │   Side-rail nav (10 destinations, §5). `/` focuses the primary filter on any list screen.   │
│ ▸ Catalog                                                                                             │
│ ▸ Sandbox                                                                                             │
│ ▸ Discovery                                                                                           │
│ ▸ Dry-run                                                                                             │
│ ▸ History                                                                                             │
│ ▸ Decisions                                                                                           │
│ ▸ Escalations                                                                                         │
│ ⚠ Break-glass  ← visually set apart, danger-tinted rail entry (§5.10)                                 │
└─────────┴───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Global degraded band (Pattern D, §5.4/§4.6b).** When CMDB's own gate cannot serve — snapshot unhealthy, `policy_version != HEAD`, boot-integrity unverified, or clock unsafe — the console renders the **SAFE-STOPPED band** (`⛊`, halt-gold, *not* red): *"SYSTEM SAFE-STOPPED · policy snapshot unverified — every verdict is `deny(policy_unavailable)` by design. STILL TRUE: no host can be actioned; existing kill epochs enforced. DO: read history out-of-band; re-arm requires step-up ack (§5.11)."* This is the safety system working, and every screen shows it before any content.

**Keyboard & halt reachability.** Full §5.6 keyboard model; `Shift+Esc` (§5.3) focuses the header — which here **deep-links to MC/auth** since CMDB hosts no actuator — plus the documented non-browser-captured fallback chord.

---

## 4. Per-screen state model (§5.4 honest defaults — every screen fills this)

Each screen enumerates all six: **loaded** · **loading-skeleton** (static skeletons, never a spinner) · **empty** (invitation) · **Pattern-R error** (red ✕, the operator's recoverable action) · **Pattern-D degraded** (halt-gold ⛊, a dependency down → fail-closed — *never red*) · **stop-engaged** (read-only `HaltBand` when suite kill > G0). The screens below give the delta states; the routine three (loading/empty/populated) follow §5.4 unless noted.

---

## 5. Screens & flows

### 5.1 Fleet list — `/fleet`
The inventory truth-surface. `DataTable` (§6.2), mono `host_id` column.

```
Fleet · 21 hosts · [ tier ▾ ] [ class ▾ ] [ window ▾ ] [ Wazuh ▾ ]      / filter          ⟳ as-of 8s
┌───────────────┬────────────┬──────────┬───────────────────┬────────┬──────────────────┬───────────┐
│ host_id       │ criticality│ class    │ window-state      │ mode   │ Wazuh            │ lifecycle │
├───────────────┼────────────┼──────────┼───────────────────┼────────┼──────────────────┼───────────┤
│ [ nas-01 ]    │ ⬢ tier0    │ managed  │ ◼ CLOSED          │ ask    │ ● SYNCED ⟳ 3m    │ ● active  │
│ [ web-04 ]    │ ⬢ tier2    │ managed  │ ● IN-WINDOW 01:42 │ auto   │ ● SYNCED ⟳ 2m    │ ● active  │
│ [ db-02 ]     │ ⬢ tier1    │ managed  │ ❄ FREEZE-ACTIVE   │ ask    │ ▲ STALE ⟳ 41m    │ ▲ stale   │
│ [ sbx-01 ]    │ — (no tier)│ ⚙ dispos.│ — (n/a)           │ auto*  │ — (not enrolled) │ ● active  │
│ [ mail-03 ]   │ ✦ unpolici.│ managed  │ ◼ deny(no_policy) │ —      │ ● SYNCED ⟳ 1m    │ ▲ needs-tiering →Board │
└───────────────┴────────────┴──────────┴───────────────────┴────────┴──────────────────┴───────────┘
disposable pool shown collapsed by default · [ show 2 disposable ]      *sandbox_exec carve-out only
```
- `host_id` = `TicketRef` (§4.1) host variant (mono, copy-on-click, opaque). Row-click → §5.2.
- **criticality** = `CriticalityTier` chip (§6.1). **class** = plain `managed` / `⚙ disposable` label; disposable rows are **always flagged and collapsed out of managed queries by default** (PLAN §5.5d, sandbox §C6.3).
- **window-state / lifecycle** = `StatePill` (§4.5); `❄ FREEZE-ACTIVE` is `--attn`, never gold (§2 delta). `unpolicied` renders its always-deny sentinel + a `ReviewChip` (§4.10) `needs_tiering → Board`.
- **Wazuh** = `StatePill` + `Freshness` (§4.9): last-sync age; past bound → `▲ STALE` with *"verdicts unaffected — policy is CMDB's own fact"* on hover (PLAN §8). Facts sourced from Wazuh carry the `TierBadge` `host-originated`/`UNTRUSTED` provenance in detail (§5.2), never on the criticality chip.
- **States:** *loaded* as above; *empty* → "No hosts yet. Bind a discovered agent (§5.8) or author a non-agent asset." *Pattern-R* → a bad filter value, recoverable. *Pattern-D* → snapshot/git down: the whole table is replaced by the SAFE-STOPPED band (fleet list reads the projection index, which is unavailable → honest unknown, not a stale green table). *stop-engaged* → read-only `HaltBand` above the table.

### 5.2 Host detail / policy editor — `/fleet/<host_id>` — **the only policy writer in the suite**
Left: identity + live evaluated posture. Right: the editable policy. **All writes route through §5.3.**

```
[ nas-01 ]  ⬢ tier0 · managed · ● active                         [ Dry-run this host → §5.9 ]
─ Evaluated now (live evaluate(), same code path as the Gateway & MCP) ─────────── ⟳ as-of 0.2s ─
  window: ◼ CLOSED · next opens Sun 22:00 Europe/Oslo · effective_close honors next freeze
  mode by action_class:  package_update ask · config_change ask · service_restart ask
                         reboot ask(floor) · kernel_update ask(floor) · destructive ask(floor)
  reason if queried now: [ not_in_window ]                     policy_version 9f3a2c  (= HEAD ✔)
─ FACTS (rebuildable mirror — NOT policy) ────────────────────────────────────────────────────
  os_family linux ⟨TierBadge: host-originated · UNTRUSTED⟩   arch x86_64 ⟨host-originated⟩
  eol_date 2028-04 ⟨TierBadge: operator⟩   snapshot_capability btrfs ⟨POLICY — see right⟩
  wazuh.agent_id 007 · bound_by ◐ operator:ada · bound_at 2026-06-30   [ rebind… ]  (→ §5.3)
─ POLICY (canonical markdown/YAML — editing any cell opens the change-control ceremony) ───────
  criticality tier: [ tier0 ▾ ]          overrides (per action_class auto|ask): [ edit matrix ]
  snapshot_capability: [ btrfs ▾ ]   ⚠ moving away from 'none' is a GATE-WEAKENING edit
  maintenance windows:  [ WindowScheduleEditor §6.1 ]   on_window_close: [ abort_and_rollback ▾ ]
  ── CONSTITUTIONAL ABSENCE (printed fact, §4.7) ──────────────────────────────────────────────
  🔒 This surface holds no lease, mutex, or approval record. CMDB is the policy VETO, not the
     trigger — it cannot approve, claim, or execute. Agents cannot write policy by construction.
  [ Propose policy change… ]  ← danger-primed; opens §5.3
```
- Identity chips = `TicketRef`/`CriticalityTier`; `bound_by` = `PrincipalRef` (§4.2). Facts provenance = `TierBadge` (§4.3): Syscollector facts `host-originated`/`UNTRUSTED`; `facts_override` = `operator`. **Taint is display-of-truth — no control clears it** (§4.3).
- The **FenceState/approval absence** is the §4.7 printed constitutional fact (🔒, no toggle) — the one place FenceState "renders" is as an *explained absence*.
- **`evaluate()` posture panel is byte-identical to the MCP `is_actionable_now` and the Gateway's binding verdict** (PLAN §3.3) — this *is* two-views-one-state. `policy_version` shows `= HEAD ✔` via `Freshness`; a restored-older version shows `▲ policy_version behind HEAD` in halt-gold (§5.11).
- **States:** *loaded* as above; *loading* → skeleton of the two columns; *empty* n/a (a host always has facts or the sentinel); *Pattern-R* → an inline field-validation reject (e.g. RRULE part outside the allowlist) renders in the `Field` (§6.3) error style *before* the ceremony ever opens; *Pattern-D* → evaluate() cannot run (snapshot down) → the "Evaluated now" panel shows `⚠ CANNOT CONFIRM — policy snapshot unavailable; treated as deny` in halt-gold (§4.9), never a stale posture; *stop-engaged* → read-only `HaltBand`.

### 5.3 ★ THE CENTERPIECE — the gate-weakening ceremony (propose → blast-radius preview → step-up confirm)
Every mutation of policy, registries, binds, or the sandbox pool runs here. It **is** `ConfirmFriction` (§5.1) — CMDB introduces **no new dialog**, it fills §5.1's app-specific preview slot with `BlastRadiusPreview` (§6.1) and binds the confirm token to the diff hash. Friction is chosen by **direction of the edit** (§5.1 rule 4), decided **server-side** by the three-layer classifier (PLAN §6.2) and merely *rendered* here:

- **Tightening / benign edit** (add a freeze, disable the sandbox knob, narrow a window) → the **light** `ConfirmFriction` variant: single **signal-cyan** confirm, no typed intent, no step-up. Engaging safety is the encouraged path.
- **Gate-weakening edit** (any cell moves permissive; new allow window; `ask→auto`; new/ rebinding catalog entry; `snapshot_capability` off `none`; tier downgrade; action-class enum add; disposable-slot create; pool re-enable; Wazuh bind; key rotation) → the **FULL** variant below.

**Phase 1 — `propose`.** CMDB computes the typed diff + classification + blast-radius; returns a single-use `confirm_token` (TTL 5m) **bound to `sha256(rendered diff)`** (PLAN §6.3).

```
┌─ CONFIRM: WEAKEN POLICY  (nas-01 · snapshot_capability: none → btrfs) ──────────── --danger header ┐
│ ⚠ CONSEQUENCE — this moves the system TOWARD MORE real-world action.                                │
│    'btrfs' gives nas-01 an in-band rollback route, so snapshot-gated classes stop routing to        │
│    ask-tier/manual. This is irreversible in effect until re-tightened.                              │
│                                                                                                     │
│  ── BlastRadiusPreview (§6.1 — fills §5.1's app-specific preview slot) ────────────────────────────  │
│   This edit makes  ▸ 4 (host × action_class) cells auto-executable   (were ask/manual)              │
│                    ▸ 1 host gains window coverage it lacked                                          │
│                    ▸ full-shadow warnings: none                                                     │
│   ┌ affected cells ───────────────┬──────────┬──────────┐   diff (canonical, mono):                 │
│   │ host        │ action_class    │ before   │ after    │   - snapshot_capability: none               │
│   │ nas-01      │ package_update  │ manual   │ auto     │   + snapshot_capability: btrfs              │
│   │ nas-01      │ config_change   │ ask      │ auto     │   diff_hash: 7c1e…a90  (confirm binds here) │
│   │ …2 more                                                                                          │
│   └────────────────────────────────────────────────────┘                                            │
│  live honest-state echo (§4.8): suite ● G0 · no kill engaged · confirmed 0 · pending 0 · draining 0 │
│                                                                                                     │
│  Type  WEAKEN nas-01 snapshot  to confirm:   [▏                         ]                            │
│  Re-authenticate (step-up):  🔑 passkey · auth_time must be fresh   [ Re-auth ]  (auth live re-check)│
│              [ Cancel ] (default focus, Esc)              [ Weaken policy ]  ← --danger, disabled     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
**Phase 2 — `confirm`.** Primary is disabled until typed-intent matches **AND** step-up is fresh (§5.1 rule 1). On submit the §8-pin live-check re-runs at the commit instant; any drift (diff-hash mismatch, snapshot moved) ⇒ *start over* (Pattern-R "policy moved under you — re-propose"). On success: **commit → push to remote → only then snapshot swap** (push is a precondition for weakening edits, PLAN §6.3); a `policy_change_log` hash-chained row is written `{seq, prev_hash, hash, sub, jti, diff_hash, git_commit, confirm_token_id}`.

- Uses `DangerAction` (§4.7) + `ConfirmFriction` (§5.1, FULL variant, **diff-hash-bound + tamper-evident** — the exact §5.1 rule-5 path for CMDB gate-weakening). Consequence block states **direction** and echoes live `HonestState` (§4.8). The halt affordance is **never occluded** (§5.3).
- **States:** *loaded* = the dialog; *Pattern-R (recoverable)* → typed-intent mismatch (inline), step-up stale (`🔑 stale — re-auth`), **push-failure on a weakening edit → the swap did not happen, the edit is refused** with a clear red error and the commit parked (PLAN §6.3, §13-E); *Pattern-D* → the live-check transport (auth denylist) is unreachable → the confirm **fails closed** in halt-gold ("cannot confirm authorization live — refusing to weaken", not red); *stop-engaged* → a weakening confirm is unavailable while a suite freeze covers approve/execute paths; the band is shown above the (disabled) dialog.

### 5.4 Tier catalog — `/tiers`
`DataTable` of the four tiers (`tier0…tier3`) + the synthetic `unpolicied` shown read-only as a non-editable sentinel row. Each tier row: `CriticalityTier` chip, its `{action_class → auto|ask}` default row (the **destructive-never-auto floor** cells are rendered locked `🔒 floor` — a printed absence, §4.7, not a disabled toggle), and the D-6b `{health_check_timeout_s, ssh_wait_timeout_s}` policy. Editing any default row or timeout → §5.3 (an `ask→auto` flip or floor-shrink attempt classifies weakening; a floor-shrink is **rejected outright**, rendered as the §4.7 printed impossibility). *empty* n/a (four tiers always exist). *Pattern-D* → SAFE-STOPPED band.

### 5.5 Task-type registry — `/tasks`
`DataTable` of `task-types/<type_key>.md`: `{title, destructive, reversible, action_class default, external_verifier, verification_window_s}`. Consumers (Board triage, auth PDP) read this — so a **reclassification toward reversible/less-destructive, verifier unbinding, or a permissive-attribute creation** is a gate-weakening edit (§5.3, PLAN §6.2). `external_verifier` values (`wazuh_states_disappearance`, …) render as plain labels. *empty* → "No task types registered — Board triage falls back to catalog-novelty. Add one." *Pattern-R* → duplicate `type_key`.

### 5.6 Runbook-catalog policy attributes — `/catalog`
`DataTable` of `catalog/<playbook_key>.md` **policy attributes** (implementations are the Gateway's — read-only here): `{action_class binding, risk_class, applicable_tiers, rollback_declared, rollback_method, duration_estimate_s, sandbox_eligible}`. **A cell can go `auto` only while a catalog entry exists with `rollback_declared: true`** — so **catalog-entry creation / `action_class` rebinding / a `rollback_declared` false→true flip is itself gate-relevant** and routes through §5.3 (`BlastRadiusPreview` shows which cells flip auto-eligible — the critical §13-C finding). *empty* → "No playbook policy attributes — every class stays ask/manual until authored." *Pattern-D* → SAFE-STOPPED.

### 5.7 Sandbox pool + **KILL KNOB** — `/sandbox`
The `sandbox/pool.md` disposable-class pool (`class: disposable`, **immutable**, no tier, no windows, no Vault creds — PLAN §5, contract §C).

```
Sandbox pool · disposable class · orthogonal to tier          knob: ● ENABLED
┌─────────┬───────────┬──────────────┬─────────────────────────────────────────┐
│ host_id │ class     │ Vault creds  │ verdict when queried {sandbox_exec}       │
│ [sbx-01]│ ⚙ dispos. │ 🔒 none (by construction) │ permit · verdict_basis sandbox_carve_out │
│ [sbx-02]│ ⚙ dispos. │ 🔒 none                   │ permit · sandbox_carve_out             │
└─────────┴───────────┴──────────────┴─────────────────────────────────────────┘
  [ Disable sandbox pool ]  ← the OPERATOR'S SANDBOX KILL KNOB
     Disabling: instant, ceremony-free TIGHTENING — every sandbox verdict becomes deny(sandbox_disabled).
     Re-enabling: GATE-WEAKENING (→ §5.3 full).   Creating a slot: GATE-WEAKENING (→ §5.3).
  ⛊ Not a kill-switch: the global kill switch covers sandbox exec at the Gateway chokepoint
     (killswitch-chain §5); this knob is the policy-plane stop, deep-links to MC for the global halt.
```
- **Disable = light `ConfirmFriction`** (§5.1, toward-less-action, signal-cyan) — a tightening the operator is encouraged to take. **Enable / create-slot = full §5.3.** `host_id` = `TicketRef`; Vault-creds absence = §4.7 printed fact (🔒, not a toggle). Verdict token = neutral outcome label (§2, permit not green). A disposable record carrying any window/override/tier/Wazuh-bind is a config error → the row shows `⚠ deny(sandbox_config_error) → Board` (`ReviewChip`, §4.10). *empty* → "No sandbox slots — Library curation cannot get sandbox evidence until a slot is created (gate-weakening)." *Pattern-D* → SAFE-STOPPED.

### 5.8 Wazuh sync / reconcile + discovery queue — `/discovery`
Two-way split. **Sync status** (top): last poll `Freshness`, RBAC account scopes, Wazuh version probe; a sync failure renders the **mirror `▲ STALE`** with *"verdicts unaffected"* — **Pattern D at the mirror level, not a red console error** (a Wazuh outage is not the console breaking). **Discovery queue** (bottom): `DataTable` of `discovered_agents` — agents Wazuh reports that have **no host record yet**.

```
Wazuh sync · account: agent:read syscollector:read group:read · v4.14.2 ✔    last poll ⟳ 4m ● OK
─ Discovery queue · 3 unbound ────────────────────────────────────────────────────────────────
┌ wazuh agent_id │ reported name ⟨host-originated⟩ │ os ⟨host-originated⟩ │ group (advisory)   │ action
│ 013            │ "web-05" ⟨UNTRUSTED⟩            │ linux ⟨UNTRUSTED⟩    │ web ~suggestion    │ [ bind… ] [ new host_id… ]
│ 014            │ "??"     ⟨UNTRUSTED⟩            │ unknown              │ —                  │ [ bind… ]
└──────────────────────────────────────────────────────────────────────────────────────────────
  ⚠ Reported names / groups are ATTACKER-INFLUENCEABLE at enrollment (ARCHITECTURE §12).
     Group membership is a UI-only tiering SUGGESTION — never auto-applied. Binding mints/attaches
     a host_id only on explicit operator confirm; every bind/rebind is a change-logged event (→ §5.3).
```
- Every Wazuh-reported field = `TierBadge` `host-originated`/`UNTRUSTED` (§4.3) — the console's cue that these are adversarial input; group suggestions carry the `~ heuristic` micro-tag (§4.3). **Bind / new-`host_id` / rebind = gate-weakening §5.3** (operator-confirmed, change-logged; a new host lands at the `unpolicied` sentinel and fires `needs_tiering → Board`). *empty* → "No unbound agents — inventory matches Wazuh." *Pattern-R* → bind to an already-bound agent_id. *Pattern-D* → Wazuh unreachable = mirror STALE band (per above), **not** a red error; the queue shows its last-known set with an as-of stamp.

### 5.9 Verdict dry-run / "explain this verdict" — `/dry-run` — *app-specific `VerdictTrace`*
The operator runs the **same `evaluate()`** at an arbitrary `at`, subject-free, and sees *why*. This is the console half of the binding `POST /v1/decision` — **two views, one state** (PLAN §3.3).

```
Explain a verdict          host_id [ nas-01        ]   action_class [ kernel_update ▾ ]   at [ 2026-07-05 23:30 Oslo ]  [ Explain ]
─ VerdictTrace (§6.1) ─────────────────────────────────────────────────────────────────────────
  RESULT:  deny        ← neutral/danger outcome token, NOT green (§2)
  decision path (universal preconditions → class fork → window → mode):
    ✔ host resolved (nas-01)          ✔ snapshot healthy · policy_version 9f3a2c = HEAD
    ✔ action_class ∈ enum(7)           ✔ clock healthy (offset 0.3s, NTP-synced)
    ▸ class fork: managed → window algebra
       ✔ allow window w-sun-night covers T          ✕ freeze f-quarter-end also covers T
       → deny-overrides: effective_close = start of freeze → NOT cleanly in-window
    reason[]: [ freeze_active(f-quarter-end) ]      window evidence retained (raw close 02:00)
  policy_version 9f3a2c · evaluated_at … · valid_until = evaluated_at + 60s      [ copy trace ]
  NOTE: dry-run is UNSIGNED/advisory (no aud, no JWS) — mechanically unusable at the Gateway.
```
- `VerdictTrace` renders the deterministic decision path (PLAN §3.3), `effective_close`/deny-overrides lattice, grace-zone vs genuinely-closed, and CMDB-authored `reason[]` enum codes (**never host-originated free text**, §4.3/ARCHITECTURE §12). `host_id` = `TicketRef`; `policy_version` = `Freshness`-stamped. *empty* → "Enter a host + action_class to trace a verdict." *Pattern-R* → unknown host / bad action_class renders the honest `deny(no_such_host)` / `deny(bad_action_class)` **as the correct result**, not an error (a deny is a valid answer). *Pattern-D* → evaluate() unavailable → SAFE-STOPPED band.

### 5.10 Break-glass console — `/break-glass` (distinct, LOUD)
Operator-only emergency window minting. It is the §5.3 ceremony with a **distinct, louder confirmation** (PLAN §6.4) and its own danger-tinted rail entry + persistent context banner while an emergency window is live.

```
⚠ BREAK-GLASS — emergency maintenance window            (rail entry is set apart, danger-tinted)
  Mints ONLY a one-shot bounded window (hard cap ≤ 4h, auto-expiring) or a time-boxed tier
  exception (same cap). NEVER touches the destructive-never-auto floor (🔒 printed fact, §4.7).
  ┌─ CONFIRM: BREAK-GLASS  (db-02 · emergency allow window 90m) ─────────────── --danger header ┐
  │ ⚠ This OVERRIDES an active freeze (allow < freeze < break-glass lattice).                    │
  │   BlastRadiusPreview: db-02 becomes cleanly-in-window for 90m; 3 classes clear to their mode.│
  │ Type  OVERRIDE FREEZE db-02  to confirm:  [▏            ]   ← the louder, freeze-specific re-type
  │ Re-authenticate (step-up):  🔑 passkey fresh                                                  │
  │            [ Cancel ]                         [ Break glass ]  ← --danger                      │
  └──────────────────────────────────────────────────────────────────────────────────────────────
  On arm: auto-files break_glass_posthoc review → Board (ReviewChip); distinct edit_kind:break_glass
          chain row. A persistent BREAK-GLASS banner rides the whole console until the window expires.
```
- `DangerAction` + `ConfirmFriction` FULL, with the **freeze-override re-type** when the lattice requires it (§5.1/§6.4). Post-hoc review = `ReviewChip` (§4.10) `break_glass_posthoc → Board` — CMDB **files, never clears** it. *Pattern-D* → if the change-control path can't fail-closed-verify, break-glass **refuses in halt-gold** ("cannot arm safely"), never a partial arm.

### 5.11 Policy-change history — `/history` — `AuditInspector` (§7.2), git-derived
The hash-chained `policy_change_log` rendered as `AuditInspector` (§7.2) — **not forked**. Append-only rows: timestamp (mono) · `PrincipalRef` (who) · `edit_kind` verb · target `host_id`/registry (`TicketRef`) · `weakening` flag · `diff_hash` · `git_commit` · outcome `StatePill`.

```
Policy-change history                                                        [ chain-verify ]
┌ ⚠ VERIFY OUT-OF-BAND: this console can lie. Confirm the chain by reading `git log` on the ────┐
│   configured REMOTE, not here. Remote: git@…/cmdb_policy.git  · local HEAD present on remote ✔ │
└───────────────────────────────────────────────────────────────────────────────────────────────
  chain-verify: ✔ CHAIN INTACT (local)     [renders per §4.9: stale → ⚠ CANNOT CONFIRM CHAIN (gold);
                                            actual break → ✕ CHAIN BROKEN (danger) — never false-green]
┌ ts        │ who            │ edit_kind        │ target      │ weakening │ diff_hash │ git_commit │ ok │
│ 12:04:11  │ ◐ operator:ada │ snapshot_cap     │ [ nas-01 ]  │ ⚠ YES     │ 7c1e…a90  │ 9f3a2c     │ ✔  │
│ 09:15:02  │ ◐ operator:ada │ break_glass      │ [ db-02 ]   │ ⚠ YES     │ 2b40…f11  │ a6597c     │ ✔  │
│ 08:50:44  │ ◐ operator:ben │ add_freeze       │ [ web-04 ]  │ tighten   │ …         │ …          │ ✔  │
└─────────────────────────────────────────────────────────────────────────────────────────────────
  Restored-older policy_version banner (§1 boot-integrity): shown here + on every verdict if HEAD < chain tip.
```
- The **out-of-band `git log` verification banner** is the CMDB-specific §7.2 obligation (PLAN §6.3; DESIGN_SYSTEM §7.2 "CMDB's git-derived history carries the out-of-band `git log` verification banner"). Chain-verify follows the §4.9 rule exactly — stale/unverifiable → halt-gold `CANNOT CONFIRM`, real break → danger `CHAIN BROKEN`, **never** a fabricated green. **Read-only always** (§7.2). *empty* → "No policy changes yet." *Pattern-D* → git/remote unreachable → the banner flips to `⚠ CANNOT CONFIRM local HEAD is on remote — degraded; further weakening edits refused` (halt-gold; PLAN §6.3 degraded mode), not red.

### 5.12 Decision-log browser — `/decisions` — `AuditInspector` (§7.2)
The canonical append-only `decision_log` (every issued verdict, binding + advisory) as `AuditInspector` (§7.2), filterable by `host_id` / `action_class` / verdict / `policy_version`. Rows: `evaluated_at` · caller-selected `aud` · `host_id` (`TicketRef`) · `action_class` · verdict outcome token · `decision_id`/`jti` (`TicketRef` related-ID) · `policy_version` · `verdict_basis`. Used to answer "what did the CMDB actually decide, and against which policy version." *empty* → "No decisions logged yet — no verdict has been issued." *Pattern-D* → SQLite log unreadable → SAFE-STOPPED (a canonical store is unavailable; PLAN §1).

### 5.13 Escalation-outbox status — `/escalations` → Board
The durable outbox (PLAN §8). `DataTable`; each row a `ReviewChip` (§4.10) carrying the **machine reason verbatim** + a **deep-link into the canonical queue** (`/review/<ticket_id>` §7.1) once Board mints the escalation ticket.

```
Escalation outbox → Board       ⟳ as-of 6s     ● svc:cmdb principal: present    Board intake: ● up
┌ kind                    │ target      │ state              │ deep-link                 │
│ ⚑ needs_tiering         │ [ mail-03 ] │ ◈ delivered        │ → mc/review/T-000481      │
│ ⚑ window_ambiguity      │ [ db-02 ]   │ ◐ queued (retry 2) │ (awaiting Board mint)     │
│ ⚑ break_glass_posthoc   │ [ db-02 ]   │ ◈ delivered        │ → mc/review/T-000480      │
│ ⚑ sandbox_config_error  │ [ sbx-03 ]  │ ◐ queued           │ (awaiting Board mint)     │
└────────────────────────────────────────────────────────────────────────────────────────
  Host-originated strings in payloads are provenance-tagged (TierBadge, ARCHITECTURE §12).
  CMDB FILES escalations; only MC/Board CLEAR them (§4.10). This is a distinct producer view,
  NOT the ReviewQueue and NOT a fork of it.
```
- `ReviewChip` (§4.10) with machine reason (`needs_tiering`, `window_ambiguity`, `break_glass_posthoc`, `missing_from_wazuh`, `policy_integrity_error`, `clock_skew`, `sandbox_config_error`, `dst_gap_window_never_opened`) + deep-link. **Degraded-but-honest** is a first-class state: until `svc:cmdb` + Board intake exist, escalations `queued` locally and are flagged loudly — **Pattern D**, halt-gold, "queued, not dropped" — **never a red error and never hidden** (PLAN §8, §13 residual). `[ resend ]` = benign `cmdb:manage` (light friction). *empty* → "No escalations — fleet policy is clean." *stop-engaged* → read-only `HaltBand`.

---

## 6. App-specific components (each justified — why it cannot be a shared component)

### 6.1 The five CMDB-specific widgets
| Component | What it is | Why it is NOT a shared §4/§5/§6/§7 component |
|---|---|---|
| **`VerdictTrace`** (§5.9) | the arbitrary-`at` decision-path explainer: preconditions → class fork → window/deny-overrides lattice → `effective_close`/grace → `reason[]` | a domain-unique *policy-decision trace visualization* (a PDP's "why"); no shared component renders an evaluation tree. Its identity/verdict chips **reuse** `TicketRef`/`PrincipalRef`; only the trace layout is new. |
| **`BlastRadiusPreview`** (§5.3) | the derived-effect matrix diff — "makes N (host × class) cells auto-executable; J hosts gain coverage; full-shadow warnings" | it **fills the §5.1 `ConfirmFriction` app-specific-preview slot** (which §5.1 explicitly reserves); a domain-unique policy-impact simulation. It does not re-draw the dialog — the dialog *is* `ConfirmFriction`. |
| **`WindowScheduleEditor`** (§5.2) | the RRULE-allowlist maintenance-window editor with DST fold/gap-aware occurrence preview and overnight/next-day-anchor rendering | an *editor* for recurring policy windows (the §8 "a genuinely domain-unique widget — an editor — is fine" case); no shared component authors RRULE + IANA-zone occurrences. |
| **`CriticalityTier` chip** (§5.1/§5.2) | `tier0…tier3` + `unpolicied` sentinel host-criticality classification | **deliberately not `TierBadge` (§4.3):** TierBadge encodes provenance/verification-*independence* (✔/⧉/◑/⚠ families); host criticality has no provenance semantics, so borrowing TierBadge's glyphs would misrepresent it. A small labeled classification chip; flagged in §8. |
| **`PolicyMatrix`** (§5.2/§5.4) | the (host/tier × action_class) → `auto`/`ask`/`deny(floor)` grid | a thin **configuration of `DataTable` (§6.2)**, not a new component: rows/columns are a `DataTable`; cells are plain mode labels (`auto`/`ask`) and the floor cells are §4.7 printed-fact `🔒 floor`. Listed for completeness; it introduces no bespoke visual. |

No other widget is introduced. Every ticket/host ref, identity, provenance badge, lifecycle state, halt band, danger affordance, freshness stamp, review chip, audit table, confirm dialog, data table, and form is a shared component cited by ID.

---

## 7. Human-surface API (over the SAME state the MCP surface serves — two views, one state)

The console reads/writes the identical `evaluate()` + write-through snapshot + git repo + canonical logs that the MCP tools and the Gateway endpoint use (PLAN §3.3, §7). No screen has a private data path.

**Reads (shared with the agent/Gateway surface):**
| Screen | Human read | MCP/machine sibling over the same state |
|---|---|---|
| Fleet (5.1) | `GET /v1/hosts?tier&class&window` (projection index) | `list_fleet(tier?, class?, window_state?)` |
| Host detail (5.2) | `GET /v1/hosts/<host_id>` + `GET /v1/hosts/<host_id>/facts` | `get_host`, `get_host_policy`, `resolve_host_facts`, `get_maintenance_windows`, `get_tier` |
| Dry-run (5.9) | `GET /v1/explain?host_id&action_class&at` (advisory, **unsigned**) | `is_actionable_now` / `is_in_window` — **byte-identical `evaluate()`**; the Gateway's binding `POST /v1/decision` mints the signed JWS |
| Tiers/Tasks/Catalog (5.4–5.6) | `GET /v1/tiers`, `GET /v1/task-types`, `GET /v1/catalog` | `list_task_types`, `get_catalog_policy` |
| Sandbox (5.7) | `GET /v1/sandbox/pool` | (verdict via `is_actionable_now{sandbox_exec}`) |
| Discovery (5.8) | `GET /v1/discovered`, `GET /v1/wazuh/sync-status` | — (operator-only) |
| History (5.11) | `GET /v1/policy-change-log` + `GET /v1/verdict-jwks` (key status) | — (git-derived; verify out-of-band) |
| Decisions (5.12) | `GET /v1/decision-log?filters` | — (mirror of every issued verdict) |
| Escalations (5.13) | `GET /v1/escalations` | — |

**Writes (human-only; `cmdb:write-policy` HOLDER scope — machine-unmintable by auth's kind-gate, PLAN §6.1/§7.1):**
- `POST /v1/policy/propose` → `{typed_diff, classification(weakening?), blast_radius, confirm_token(diff-hash-bound, TTL 5m)}` — Phase 1 of §5.3.
- `POST /v1/policy/confirm` → validates §8-pin holder token + live-check + typed-intent + fresh step-up + diff-hash match → **commit → push → snapshot swap → chain row**; Phase 2 of §5.3. Covers policy edits, tier/task-type/catalog registries, Wazuh bind/rebind, sandbox-slot create / pool re-enable, verdict-key rotation, and break-glass (§5.10, louder confirm).
- **Benign ops (`cmdb:manage`, human-only, write-benign):** `POST /v1/sync/trigger`, `POST /v1/discovered/<id>/bind`(routes to the ceremony), `POST /v1/drift/ack`, `POST /v1/escalations/<id>/resend`, `POST /v1/sandbox/pool/disable` (tightening → light `ConfirmFriction`).
- **Zero mutation verbs exist on the agent MCP server** (PLAN §7.2) — structural absence, not scope-denial; rendered as the §4.7 printed constitutional fact on §5.2.

---

## 8. Consistency notes — what CMDB consumes, and the flags

**Consumes verbatim (cited, not re-drawn):** `TicketRef` §4.1 (host_id, decision_id/jti, Board ticket refs) · `PrincipalRef` §4.2 (bound_by, change-log sub, proposer) · `TierBadge` §4.3 (host-originated/`UNTRUSTED` on synced facts; `operator` on facts_override; `~ heuristic` on group suggestions) · `StatePill` §4.5 (window-state, Wazuh status, host lifecycle, verdict outcomes) · `HaltBand` §4.6 (**read-only mirror only**) · `DangerAction`/absence rule §4.7 (ceremony, break-glass, key rotation; FenceState/approval/Vault-creds/SoD-relax as printed facts) · `HonestState` §4.8 (carried read-only inside the HaltBand mirror) · `Freshness` §4.9 (every live/mirrored figure; no false-green) · `ReviewChip` §4.10 (escalations → Board) · `ConfirmFriction` §5.1 (the centerpiece; FULL diff-hash-bound/tamper-evident for weakening, light for tightening) · `Shift+Esc` §5.3 · honest loading/empty/**Pattern R≠D** §5.4 · keyboard §5.6 · `AppShell` §6.1 · `DataTable` §6.2 · `Field` §6.3 · `Modal` §6.4 · `Toast` §6.5 (benign confirmations only, never gold) · `AuditInspector` §7.2 (policy-change history **and** decision-log; git-derived history carries the out-of-band `git log` banner).

**Cross-app pattern handling:** CMDB **does not own or fork `ReviewQueue` §7.1.** Its escalations are *produced* here and **deep-link** to MC's canonical queue (`/review/<ticket_id>`); MC/Board clear them (§5.13). The **gate-weakening ceremony (§5.3) is a distinct CMDB-owned change-control gate** — analogous to Library's ingestion admission being a distinct gate — it is **not** the ticket-review queue and reuses `ConfirmFriction`, not a bespoke approval visual. `LiveAgentView` §7.3 is not consumed (CMDB tracks no agents).

**Divergences / flags for the operator (design review):**
1. **Criticality tier is rendered by an app-specific `CriticalityTier` chip, NOT `TierBadge` §4.3.** Justification: host criticality carries no provenance/verification-independence semantics; reusing TierBadge's ✔/⧉/◑/⚠ families would misrepresent it. `TierBadge` is reserved for the true provenance signal (host-originated facts). This is the one place the word "tier" means two different things in the suite — surfaced deliberately.
2. **Maintenance-window `freeze` renders as `--attn` `StatePill` (`❄ FREEZE-ACTIVE`), never halt-gold** — to protect the suite invariant that gold/`--halt` means *only* the kill switch / dependency-down fail-closed. The freeze/frozen word collision is a real hazard; the color discipline resolves it.
3. **`HaltBand` is read-only and CMDB hosts no kill actuator** (§5.3 permits this for cmdb); the sandbox kill knob is a policy tightening, not a suite kill — the console deep-links to MC for the global halt.
4. **No `FenceState` §4.4 and no approval affordance** — rendered as §4.7 printed constitutional facts (veto-not-trigger). CMDB deliberately has no fencing/lease/mutex/approval-record role.
5. **`req_nonce`, `host_class`, `verdict_basis` verdict-token fields** ride the `cmdb-gateway-verdict-token.md` freeze; the console surfaces them (dry-run/decision-log) but the signed token is minted only on the Gateway's binding call, never in a human/advisory read.
