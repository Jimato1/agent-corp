# Helm · Claude Design injection block — Gateway (The Hands · host execution)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Gateway (The Hands · host execution)

**Purpose (one line):** The only component in the suite that runs commands on real hosts — this is the operator's read-first control room for watching every host execution, proving its segregation-of-duties, walking its immutable audit chain, and confirming the kill switch physically bit.

**Who uses it:** Both surfaces exist, but they are strictly split. The **agent surface is MCP-only, no UI** (`execute_approved_plan(ticket, host)` — the dispatcher is never an operator button). The **human surface is operator-only** and almost entirely **read**: the only two write paths a human has are (a) catalog change-control and (b) orphan re-redemption, both heavily gated. Everything else is monitor / inspect / verify.

**Archetype:** **Instrument** (dark control-room), dark-only, `compact` density (28–32px rows) — every screen. No Workshop pane, no `--paper-*` surface anywhere; the one place text streams (task stdout/stderr) is machine output in a mono console, not prose.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** (§6.1) — 224/56px dark side rail + global header + suite switcher carrying the one shared suite-posture line; rail nav: Monitor · Audit · Kill-switch · Catalog · Sandbox · Orphans. Header identity line: `gateway · the hands — the only component that executes on hosts`. Header right = read-only halt mirror + a `[ Halt console → ]` **deep-link to MC** (no engage button in this app).
- **TicketRef** (§4.1) — opaque mono ID chip on `--sub-750`, `--ink-700`, copy-on-click, middle-truncate, never wrapped. Kind-glyph variants used heavily here: run `R-…`, ticket `T-…`, host `host_id`, approval `approval_id`, decision `decision_id`, release/lease `lse-…`. Kind is a label, never a color.
- **PrincipalRef** (§4.2) — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service (`⚙ svc:gateway`, `⬡ agent:patcher-07`).
- **TierBadge** (§4.3) — provenance badge. Load-bearing here as a **duality**: host-originated Wazuh/ticket text = **striped-amber `⚠ UNTRUSTED`** (adversarial input); sandbox/gateway-delivered evidence = **Verified `✔` green `#46B98A`** (an external verifier confirmed it). Taint is display-only, never editable.
- **FenceState** (§4.4) — the per-host mutex render: healthy `🔒 gen 47 · lease 04:12 · ♥ 0.8s` (neutral `--ink-700`, never green); stale `▲` amber near expiry; zombie `⚠ gen 46 SUPERSEDED by gen 47` (amber) = lost mutex.
- **StatePill** (§4.5) — one glyph+label pill per lifecycle state, never color-only: `⧗ EXECUTING`, `✔ VERIFYING`, `▮▮ FROZEN G1`, `✕ FAILED`, `● IDLE`, `⇉ DRAINING`.
- **HaltBand** (§4.6) — full-width **HALT-GOLD `#F2842B`** band under the header, sticky when level > G0. Interlock `▮▮` (ENGAGED) / shield `⛊` (SAFE-STOPPED), never `✕`, never red. **Read-only in this app** — the trigger is not here. G2 uses the intensified doubled-glyph `▮▮▮▮` + full edge striping variant (non-hue cue, still gold).
- **HonestState** (§4.8) — `✔ confirmed · ◐ pending · ⇉ draining` triad, all three slots always shown even at zero. Copy discipline: never "all runs stopped" while pending/draining > 0.
- **Freshness** (§4.9) — `⟳` age + source stamp on every live/mirrored figure; stale → amber `▲ STALE → treating as safe-stopped`; **never a false green**. This is the app whose whole job is to never lie about whether it acted.
- **DangerAction + ConfirmFriction** (§4.7 / §5.1) — destructive = **danger-red `#E5594E`** behind typed-intent + step-up (auth live re-auth) confirm, diff-hash-bound for policy-plane writes. Cancel is default focus / `Esc` target.
- **ReviewChip** (§4.10) — `◈ NEEDS REVIEW` / `⚑ ESCALATED · <reason>` pill deep-linking **out** to MC `/review/<ticket_id>` (this app never hosts a clear-review control).
- **DataTable** (§6.2), **Modal** (§6.4), **Toast** (§6.5), **Field** (§6.3) — standard chrome; Toast matches the action verb ("Promoted"), never gold.
- **AuditInspector** (§7.2) — the audit surface (S3) is this shared family, consumed not forked, with chain-verify that never false-greens.

Note: the Gateway hosts **no `HoldToActuate` actuator** (it holds no kill trigger). `Shift+Esc` focuses the header's deep-link to MC's actuator, not a local button.

**□ Screens & views to build:**

**S1 — Live Execution Monitor** *(the landing screen)*
Per-host card grid: "what is running on which host, right now, and is every run inside its four-check envelope." Live via SSE.
```
┌─ LIVE EXECUTION ─────────────────── ⟳ fresh 480ms · 24 hosts ─┐
│ filter:[/host,ticket,agent…]  state:[active▾]  class:[all▾]   │
│ ┌───────────────────────────┐ ┌───────────────────────────┐   │
│ │ host-db-01     ⧗ EXECUTING│ │ host-web-03    ✔ VERIFYING│   │
│ │ [R-01HX…][T-000482]       │ │ [R-01HY…][T-000501]       │   │
│ │ ⬡ agent:patcher-07        │ │ ⬡ agent:patcher-02        │   │
│ │ class: kernel_update ⚠dstr│ │ class: package_update     │   │
│ │ 🔒 gen47·lease04:12·♥0.8s │ │ 🔒 gen51·lease02:03·♥1.1s │   │
│ │ SoD ✔✔✔✔ appr·pol·cred·mtx│ │ SoD ✔✔✔✔                  │   │
│ │ ▏task 6/9 apt-get dist-up…│ │ Wazuh poll: 2/5 pairs gone│   │
│ │ [ open run → ]            │ │ [ open run → ]            │   │
│ └───────────────────────────┘ └───────────────────────────┘   │
│ ┌ host-nas-01  ▮▮ FROZEN G1 ┐ ┌ host-mail-02      ● IDLE  ┐   │
│ │ run halted at task boundary│ │ no active run · last done │   │
│ └───────────────────────────┘ └───────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```
Each card = a *layout* of shared components (host/run/ticket `TicketRef` + executor `PrincipalRef` + run `StatePill` + `FenceState` + the `SoDChainStrip` collapsed to four ticks + class chip with destructive-warning `TierBadge` where `action_class ∈ {destructive,kernel_update,reboot}` + one-line current-task readout). Host-originated Wazuh posture text on a card carries `⚠ UNTRUSTED`. **Primary action:** open run → S2. There is **no start-a-run control** (agent-only, fully gated path).
*States:* **Loaded** = card grid, each figure Freshness-stamped. **Loading** = static card skeletons in grid shape (a single labelled `starting run…` spinner permitted inside one card for a genuine start-job). **Empty** (invitation) = "No hosts are executing. Runs appear here when an executor agent calls `execute_approved_plan` and clears the four-check chain. The Gateway starts nothing on its own." **Pattern-R** (red `✕`) = local runs-API read failure, "couldn't load the run list — retry." **Pattern-D** (gold `⛊`) = a dependency down (Board/CMDB/Vault/auth/its Postgres) → SAFE-STOPPED HaltBand: "STILL TRUE: no new dispatch, existing runs finish at task boundary, all gates fail closed"; unconfirmable cards show `⚠ CANNOT CONFIRM` in gold, never a green idle. **Stop-engaged** = HaltBand pins; active cards flip to `▮▮ FROZEN G1`; a card mid-`dpkg` shows `⇉ DRAINING` (boundary not yet reached), never a false "stopped."

**S2 — Run Detail + SoD Proof** *(the single most important screen)*
Reconstruct one run's segregation-of-duties proof **from the chain alone**, and tail its console. Layout: run header (run `TicketRef` + `StatePill` + host + Freshness; ticket, executor, class, `op_id`), then the **SoDChainStrip** (see §app-specific), then the **RunConsole** streaming pane, then a health-check / rollback-path footer line.
```
┌─ RUN [R-01HX9Q…] ⧗ EXECUTING ── host [host-db-01] · ⟳0.4s ─┐
│ [T-000482] ⬡ agent:patcher-07  class kernel_update ⚠  op_id…│
│ ┌ SEGREGATION-OF-DUTIES CHAIN (reconstructed from audit) ─┐ │
│ │ ✔ 0 CALLER  token aud=gateway·cnf DPoP✔·introspect·ep4471│ │
│ │ ✔ 1 BOARD   consume_approval [apr-…]→executing           │ │
│ │             plan_hash sha256:9f… ✔ matches·allowlist 3/3 │ │
│ │ ✔ 2 CMDB    verdict permit [dec-…]·policy a1b2·window✔   │ │
│ │ ✔ 3 VAULT   cred cred://hosts/host-db-01/root·lse-…⧗     │ │
│ │             SSH-CA TTL 11m · plaintext: never here       │ │
│ │ ✔ 4 MUTEX   🔒 gen47·pg advisory lock·fence>46 ✔         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ 🔒 SoD is enforced in Gateway code, not here. This screen│ │
│ │    displays evidence; no control can skip/relax a check. │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌ CONSOLE (RunConsole — audit-store SSE) task 6/9·⟳0.4s ──┐ │
│ │ TASK [patch_debian: apt-get dist-upgrade] changed        │ │
│ │ ▏(streaming — Last-Event-ID 00461)                       │ │
│ └──────────────────────────────────────────────────────────┘ │
│ health-check: pending · rollback path: snapshot (available)  │
└──────────────────────────────────────────────────────────────┘
```
*States:* **Loaded (executing)** = as drawn, console streams. **Loaded (terminal)** = `verifying` (Wazuh poll panel), `needs_review` (→ ReviewChip), or `failed(reason)` with the verbatim machine reason (`halted`/`rolled_back`/`unrecoverable`/`host_unreachable`/`orphaned`/`window_closed`/`credential_denied`/`PLAN_HASH_MISMATCH`) and a red `✕ FAILED` pill — **a killed run always renders `failed(halted)`, never `cancelled`**. **Loaded (rejected preflight)** = a run that never dispatched — the strip shows the **first failing check in red `✕`** with reason (`NO_APPROVED_TICKET`/`STALE_FENCE`/`FLOOR_VIOLATION`/`WINDOW_MUST_FIT`/`ALLOWLIST_MISMATCH`/`UNKNOWN_PLAYBOOK`) and every downstream check greyed `— not reached`; rejections are first-class hostile-model telemetry. **Loading** = chain + console skeletons. **Empty** = N/A (bad `run_id` → Pattern-R "no such run" + Audit link). **Pattern-R** = local run-fetch fail → red retry. **Pattern-D** = the audit store (SSE source) unreachable → RunConsole degrades to STALE + gold `⚠ CANNOT CONFIRM live output — treating as safe-stopped`, never a frozen-green console; a Board/CMDB/Vault check unconfirmable mid-render shows gold `⚠ CANNOT CONFIRM`, not a green `✔`. **Stop-engaged** = HaltBand pins; console shows honest `⇉ DRAINING` → `▮▮ cancelled at boundary → failed(halted)`. **Stream lifecycle:** on token `exp`/revocation the console ends "session ended — re-authenticate"; too-old `Last-Event-ID` → `event: reset` → REST re-sync then resume at tip.

**S3 — Audit Trail** *(consumes `AuditInspector §7.2`)*
Walk the append-only, hash-chained, Ed25519-signed per-command forensic log; verify the chain; show anchor status vs MC.
```
┌─ AUDIT CHAIN ─── chain_id gw-main · 41,802 records · ⟳1.2s ──┐
│ [ Verify chain from seq… ]  filter:[run,host,type,sub…]      │
│ ┌ CHAIN-VERIFY ────────────────────────────────────────────┐│
│ │ ✔ VERIFIED seq 41500→41802 · 302 records · Ed25519 · 1.9s ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌ MC ANCHOR STATUS ────────────────────────────────────────┐│
│ │ HEAD pushed 41800 · MC ack'd 41800 · ⟳4s  ✔ IN SYNC       ││
│ └──────────────────────────────────────────────────────────┘│
│ seq   time        who              action      target  outcome│
│ 41802 12:04:11 ⬡ agent:patcher-07 dispatch    [R-01HX] ⧗ exec │
│ 41801 12:04:10 ⚙ svc:gateway      cred_redeem  cred://  ✔ ok  │
│ 41799 12:03:57 ⬡ agent:patcher-11 dispatch    [host-x] ✕ STALE_FENCE│
└──────────────────────────────────────────────────────────────┘
```
`DataTable` of append-only rows (mono tabular `seq`+timestamp · `PrincipalRef` · action verb · `TicketRef`/handle target · outcome `StatePill`); rejection rows are first-class. **Read-only always** — no row edits (corrections are new rows). *States:* **Chain-verify success** = `✔ VERIFIED` green **only** on a completed successful walk. **Chain-verify CANNOT CONFIRM** = verify couldn't complete (store slow, key unavailable) → **halt-gold `⚠ CANNOT CONFIRM CHAIN`**, never green. **Chain-verify BROKEN** = an actual detected hash/sig break → **danger-red `✕ CHAIN BROKEN at seq N`**, the forensic alarm, links the offending record. **Anchor status** = `✔ IN SYNC` / gold `⚠ RESYNC-PENDING` (MC behind — alarms, does not halt) / red-alarmed permanent HOLE (HEADs fell past retention before MC received them). **Loading** = table + two status-panel skeletons. **Empty** = genesis-only invitation. **Pattern-R** = local query fail → red retry (distinct from CHAIN BROKEN, a content alarm). **Pattern-D** = Postgres audit store unreachable → HaltBand SAFE-STOPPED (audit-write failure halts dispatch); verify/anchor show gold CANNOT-CONFIRM. **Stop-engaged** = kill/halt events are themselves audit rows in-stream; HaltBand pins.

**S4 — Kill-switch Status** *(read-mirror + the L2-CONFIRMED source)*
The Gateway **is** the L2 physical stop and its own confirmation is the sole legitimate L2-CONFIRMED source read directly by auth. This screen renders that truth read-only. **The trigger button is NOT here** — it deep-links out.
```
┌─ KILL-SWITCH · L2 PHYSICAL STOP ─────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ┃ ▮▮ KILL-SWITCH ENGAGED · G1 FREEZE-DESTRUCTIVE  epoch 4471 ┃│
│ ┃ Gateway refuses all new dispatch + new Vault redemptions.  ┃│
│ ┃ In-flight runs cancel at next safe task boundary.          ┃│
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ L2 CONFIRMATION (this Gateway — auth reads directly)         │
│  epoch_seen 4471 · level G1 · in_flight 1 · refuse 12:04:09  │
│  signed halt-status ✔ · ⟳ own truth, not a mirror           │
│ AUTH L1 EPOCH (mirror)  epoch 4471 ✔0.3s · in sync          │
│ HALTED-RUN AFTERMATH (HonestState)                           │
│ ┌ ✔ 2 CONFIRMED ┬ ◐ 0 PENDING ┬ ⇉ 1 DRAINING ┐              │
│ │ failed(halted)│             │ mid-task, past │              │
│ └───────────────┴─────────────┴────────────────┘              │
│  draining → [R-01HZ…] host-nas-01 · dpkg · will finish+log   │
│  [ Halt console (MC) → ]  [ auth safe_stopped console → ]    │
└──────────────────────────────────────────────────────────────┘
```
`HaltBand` member (a) ENGAGED (G2 = intensified doubled-glyph); `HonestState` triad for halted-run aftermath, **all three slots always shown, copy-discipline enforced**; `Freshness` on the auth-epoch mirror; the two footer links are **deep-links** — `DangerAction` is **absent by construction** (a printed fact, not a greyed control). *States:* **G0 normal** = no HaltBand, L2 panel `level G0 · 0 refusals`, triad reads `✔0 · ◐0 · ⇉0` as a positive statement of confirmed silence. **G1 engaged** = as drawn. **G2 quiesce-all** = intensified band. **Loading** = band + panel skeletons. **Pattern-R** = local failure reading the *aftermath list* only → red retry on that panel; the L2 figure is the Gateway's own and stays authoritative. **Pattern-D (auth mirror stale)** = gold `▲ STALE → treating as safe-stopped`, never green "in sync" (L2 stays authoritative as local truth). **Pattern-D (Gateway can't confirm its own halt liveness)** = HaltBand SAFE-STOPPED "cannot confirm freshness — treating as safe-stopped." **Stop-engaged** = this screen *is* the stop detail.

**S5 — Catalog Registry** *(the ONE operator write path)*
Review the Gateway-owned playbook registry (versions, `content_sha256`, Ed25519 sigs, class, rollback capability) and perform operator-vetted change-control.
```
┌─ PLAYBOOK CATALOG ── 6 active · 1 pending change ────────────┐
│ key            ver content_sha256 class          rollback st sig│
│ patch_debian   v4  9f3a…b1        package_update snapshot ✔ ed│
│ reboot_host    v2  a180…44        reboot         none     ✔ ed│
│ sbx_pytest     v2  4400…aa        sandbox_exec   n/a      ✔ ed│
│ ── pending operator-vetted change ─────────────────────────── │
│ patch_debian   v5▲ ee02…7d        package_update snapshot PENDING⧗│
│                              [ Review & apply change → ](step-up)│
└──────────────────────────────────────────────────────────────┘
```
The write routes through the **full `ConfirmFriction`** dialog — typed-intent + step-up + red primary, **diff-hash-bound** (you confirm the exact `sha256` diff shown), with a **blast-radius line** ("12 hosts have patch_debian in an open allowlist"), states the **direction** ("MORE real-world action"), and writes a tamper-evident audit row (visible next in S3). On success emits a `Toast` matching the verb ("Promoted"). Printed on-screen: `🔒 Agents cannot write the catalog by any path — this is an operator-only, step-up gate.` *States:* **Loaded** = active entries + pending change (`⧗ PENDING` pill). **Loading** = table skeleton. **Empty** = bootstrap invitation. **Pattern-R** = the *promote* failed to apply (validation, sig mismatch, stale diff-hash) → red `✕` inline in the dialog with what to fix. **Pattern-D** = catalog store unreachable → gold SAFE-STOPPED; the write path is **disabled-by-absence** (printed `🔒 change control unavailable while the catalog store is safe-stopped`, not a greyed button). **Stop-engaged** = HaltBand pins; catalog **reads** continue; a catalog **write** during a kill is still permitted via the same step-up (catalog change is not host execution) but the confirm block echoes live halt honest-state.

**S6 — Sandbox Runs** *(tier-0 evidence browser)*
Browse tier-0 sandbox evidence — sandbox evidence = external verification for the Library's admission gate. Read-only; **no host parameter exists anywhere in this surface** (the D-7 non-leak guarantee is visible here).
```
┌─ SANDBOX RUNS (tier-0) ─── harness hv-4c1a…9d20 ─────────────┐
│ run       ticket     profile    exit harness   finished       │
│ [R-01HS…][T-000733] sbx_pytest ✔0  hv-4c1a… 11:58 [view→]    │
│ [R-01HR…][T-000730] sbx_lint   ✕2  hv-4c1a… 11:41 [view→]    │
│ ┌ EVIDENCE [R-01HS…] ──────────────────────────────────────┐ │
│ │ [T-000733] sbx_pytest exit ✔0                             │ │
│ │ env: image sha256:… · py3.12 · pytest8.2                  │ │
│ │ input_ref  note nt-…@rev14  [ UNTRUSTED ⚠ curation-ingest]│ │
│ │ evidence:  [ ✔ sandbox-verified · gateway-delivered ]     │ │
│ │ ┌ transcript ─────────────────────────────────────────┐  │ │
│ │ │ ===== 12 passed in 3.41s =====                       │  │ │
│ │ └──────────────────────────────────────────────────────┘  │ │
│ │ target: fresh podman container · no suite networks · no creds│ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```
The evidence detail is the `SandboxEvidenceView` (see §app-specific), whose signature is the **provenance duality**: the *input* (`input_ref`) is `⚠ UNTRUSTED` striped-amber, the *evidence itself* is `✔` Verified green. *States:* **Loaded** = list + selected evidence. **Loading** = list + evidence skeleton. **Empty** = "No sandbox runs yet. Curation-team agents call `run_sandbox_test`; each run's transcript and environment fingerprint land here as external-verification evidence for the Library." **Pattern-R** = local evidence-fetch fail → red retry. **Pattern-D** = sandbox execution disabled (CMDB `disposable` class set to deny — the operator's sandbox kill knob) → gold "sandbox execution disabled by policy (kill knob)" `⛊`, **not** a red error; existing evidence stays browsable. **Stop-engaged** = at kill ≥ G1 sandbox dispatch refused (same chokepoint) → new runs `▮▮ FROZEN`; historical evidence stays readable; HaltBand pins.

**S7 — Orphan Reconciliation** *(Gateway-local operational queue — NOT the canonical ReviewQueue)*
After a Gateway crash mid-run, the Board hold persists deliberately (the host may have been touched). This queue surfaces those orphans and the operator-gated re-redemption.
```
┌─ ORPHAN RECONCILIATION ── 1 orphan · 0 auto-resolvable ──────┐
│ run       host        state@crash Board hold probe   action  │
│ [R-01HP…][host-fs-04] executing   gen 39     ⚠needed ▼       │
│  ┌ [T-000701] ⬡ agent:patcher-05 crashed 11:12 task 4/7 ──┐ │
│  │ Board hold: 🔒 gen 39 · NOT reaper-eligible (orphan)   │ │
│  │ read-only probe: reachable ✔ · reboot marker present ⚠ │ │
│  │ old lease lse-… EXPIRED → re-redemption (operator-gated)│ │
│  │ ⚑ ESCALATED · orphaned → mc/review/T-000701 → chat     │ │
│  │       [ Request fresh credential + probe → ](step-up)  │ │
│  │       NEVER auto-resumes a half-run — truthful terminal│ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```
`DataTable`; `FenceState` for the persisted Board hold generation; `ReviewChip` with machine reason `orphaned` deep-linking MC + Chat; the one action (re-redemption — a fresh minimal-TTL `release_id` for a **read-only probe**) is full `ConfirmFriction` step-up (it moves toward touching a host again). Printed `🔒` fact: the Gateway never auto-resumes. *States:* **Loaded** = orphan rows with probe status + escalation chips. **Empty (the healthy default, reassuring invitation)** = "No orphaned runs. If the Gateway ever dies mid-run, the half-run appears here for truthful reconciliation — it is never silently resumed." **Loading** = table skeleton. **Pattern-R** = re-redemption request failed locally (Board/Vault said no) → red inline with reason, retryable. **Pattern-D** = Board/Vault down → probe/re-redemption safe-stopped gold; orphans still *listed* from local `runs` (fail-closed: cannot resolve, can enumerate); Board-hold cross-check shows `⚠ CANNOT CONFIRM hold`, never green "resolved." **Stop-engaged** = at kill, re-redemption refused (no new Vault redemptions ≥ G1); orphans remain listed; the action shows `▮▮ FROZEN`.

**◈ App-specific components (only where justified):**
- **`SoDChainStrip`** (S1 collapsed, S2 full) — the four-check (+Check-0 caller) segregation-of-duties evidence render: `0 CALLER → 1 BOARD approval → 2 CMDB policy → 3 VAULT credential → 4 MUTEX`, each row a verdict `StatePill` + its evidence-artifact `TicketRef` variant (`approval_id`/`decision_id`/`release`/`lease`) + `FenceState` on check 4. It **composes** shared components and re-draws none; only the four-slot chain layout and the printed §4.7 destructive-absence caption are new. *Why not shared:* no other app has a four-holder execution chain to reconstruct — it is the literal visual proof that "no single component reaches a destructive action." On a rejected preflight it renders the first failing check red `✕` + reason and greys downstream checks `— not reached`.
- **`RunConsole`** (S2) — the streaming ansible task-event stdout/stderr tail: mono, task-indexed (`task 6/9`), `Last-Event-ID`-cursored, over the `LiveStream §5.5` transport (freshness-tagged, degrades to STALE, terminates on `exp`/revocation). *Why not shared:* a live machine-output terminal is neither a `DataTable` nor prose; a generic table cannot represent interleaved streaming task output.
- **`SandboxEvidenceView`** (S6) — the tier-0 evidence detail: transcript blob + `env_fingerprint` (image sha256, runtime versions) + `harness_version` attestation + the input-vs-evidence provenance duality. *Why not shared:* §7.2 explicitly allows an "evidence ledger" as domain-unique; it consumes `TierBadge`/`TicketRef` but the transcript/fingerprint/attestation layout is Gateway-specific.

*Explicitly NOT app-specific (do not re-draw):* the audit trail (S3) is `AuditInspector §7.2`; the kill status (S4) is `HaltBand §4.6` + `HonestState §4.8`; the catalog write (S5) is `ConfirmFriction §5.1`; a per-host card is a *layout* of shared components, not a new component.

**⚠ Safety / danger surfaces specific to this app:**
- **The four-check SoD proof strip** is the app's reason for existing — render it as *evidence being displayed, not controls being offered*. Every check row is read-only; there is **no toggle, no skip, no re-order** anywhere. The destructive-absence caption is printed verbatim as a `🔒` constitutional fact: `SoD is enforced in Gateway code, not here. No control on this page can skip, relax, or re-order a check.` — never a greyed control, never a `⛔`.
- **False-green prohibition is load-bearing here above all apps.** Chain-verify, anchor status, halt-status, host-health, and every mirror render the honest unknown in **halt-gold `#F2842B`** (`⚠ CANNOT CONFIRM`) rather than a fabricated green. This is the app whose whole job is to never lie about whether it acted or stopped. Only a *completed successful* chain walk is green; a *detected break* is danger-red `✕ CHAIN BROKEN`; everything in between is gold.
- **The kill switch (S4):** the Gateway is the L2 physical-stop *source* auth reads directly — but **the trigger is not here**. Render the read-only ENGAGED HaltBand + the L2-confirmation panel (local authoritative truth, survives auth-mirror staleness) + the honest halted-run triad, and deep-link the actuator to MC/auth. A killed run always reads `failed(halted)`, never `cancelled`; in-flight runs cancel only at the next safe task boundary (never mid-`dpkg`) — shown honestly as `⇉ DRAINING` → `▮▮ cancelled at boundary`.
- **Catalog change-control (S5)** and **orphan re-redemption (S7)** are the only two human writes — both full `ConfirmFriction` (typed-intent + step-up + red primary), the catalog additionally **diff-hash-bound** with a blast-radius preview (policy-plane change control, ARCH §12). Both write tamper-evident audit rows.
- **Provenance/quarantine:** host-originated Wazuh/ticket text is `⚠ UNTRUSTED` striped-amber wherever it appears on a card or run; the sandbox surface renders the input-is-untrusted / evidence-is-verified duality explicitly. Taint is display-only — no control clears it.
- **Destructive-ABSENCE printed as facts, not greyed toggles:** `Agents cannot write the catalog by any path`; `SoD cannot be relaxed here`; `The Gateway never auto-resumes a half-run`; `No kill trigger lives here`; `change control unavailable while the catalog store is safe-stopped` — all rendered with `🔒/⛊` and no interactive affordance.

**⚑ Gaps flagged:** None — the spec is complete for design. It cites every shared component by ID, declares Instrument-only/dark-only, justifies its three app-specific components, and enumerates all six states per screen. No colors outside the frozen token set are required (all safety cues use `--halt-500 #F2842B`, `--danger-500 #E5594E`, `--ok-500 #46B98A`, `--attn` striped, `--signal-500 #29B6D8`).
