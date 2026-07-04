# UI_SPEC — `gateway` (The Hands) · Stage-3 UI/UX

> **Scope:** the operator's **human surface** for the Execution Gateway — the only component that runs commands on real hosts. This spec describes screens in words + ASCII wireframes and enumerates every state per screen. **No code, no build.** It is handed to Claude Design.
>
> **Governing principle (from PLAN §1 / CLAUDE.md):** the Gateway is the scariest container in the suite; its failure mode is *fleet compromise*, not *bug*. Every operator affordance here is **read-first**. The only write paths a human has are (a) **catalog change-control** and (b) **orphan-resolution re-redemption** — both are `DangerAction` §4.7 + `ConfirmFriction` §5.1 step-up, both audit-chained. **No UI path relaxes SoD** (§4.7 destructive-absence rule): the four-check chain, the kill trigger, and approval all live elsewhere by construction, and this UI *renders that fact rather than offering a control that could weaken it.*

---

## 1. Archetype declaration (§2)

**Instrument (control-room), dark-only, `compact` density — every screen.** The Gateway has no long-form reading content, so there is **no Workshop pane and no `--paper-*` surface anywhere.** The one place text streams (task stdout/stderr) is machine output rendered mono in an Instrument console, not prose.

| Screen | Archetype | Job |
|---|---|---|
| S1 Live execution monitor | Instrument | monitor what is running on which host, right now; stop nothing here (read-mirror) |
| S2 Run detail + SoD proof | Instrument | inspect one run: the four-check chain, evidence artifacts, streaming console |
| S3 Audit trail | Instrument | walk the immutable per-command chain; chain-verify; anchor status vs MC |
| S4 Kill-switch status | Instrument | read the L2 physical-stop truth (Gateway *is* the L2-CONFIRMED source); halted-run aftermath |
| S5 Catalog registry | Instrument | review playbook versions/hashes/sigs; **the one operator write** (vetted change control) |
| S6 Sandbox runs | Instrument | browse tier-0 evidence (sandbox evidence = external verification for Library) |
| S7 Orphan reconciliation | Instrument | Gateway-local queue of half-runs after a crash; operator-gated re-redemption |

The **shell (`AppShell` §6.1)** and the **safety grammar (§4)** are archetype-invariant and identical to every other app.

---

## 2. Design-language note

**This spec consumes `context/DESIGN_SYSTEM.md`; it specifies deltas only.** Every shared entity renders through its canonical component and is **cited by ID, never re-drawn**:

- ticket / run / release / approval / host refs → **`TicketRef` §4.1** (kind-glyph variants: run `R-…`, release `rel-…`, approval `approval_id`, host `host_id`, decision `decision_id`)
- agent / operator / service identity → **`PrincipalRef` §4.2** (`svc:gateway`, executor `agent:…`, `operator:…`)
- provenance / trust-tier / taint → **`TierBadge` §4.3** (host-originated Wazuh/ticket text = `UNTRUSTED` striped; sandbox `gateway-delivered`/`sandbox-verified` = Verified)
- fencing token / host mutex / lease → **`FenceState` §4.4** (`gen N`, lease countdown, `SUPERSEDED` zombie on lost mutex)
- lifecycle state (run/host/ticket) → **`StatePill` §4.5**
- kill-switch ENGAGED / SAFE-STOPPED → **`HaltBand` §4.6** (read-only mirror; trigger is **not** here)
- destructive/irreversible affordance + constitutional absence → **`DangerAction` §4.7**
- stop aftermath counts → **`HonestState` §4.8** triad
- any live/mirrored figure → **`Freshness` §4.9** (false-green prohibition; chain-verify never false-green)
- needs_review / escalation → **`ReviewChip` §4.10** (deep-links to MC `/review/<ticket_id>`)
- confirm + step-up → **`ConfirmFriction` §5.1**; loading/empty/error honesty → **§5.4**; SSE → **`LiveStream` §5.5**
- chrome → **`AppShell` §6.1**, **`DataTable` §6.2**, **`Field` §6.3**, **`Modal` §6.4**, **`Toast` §6.5**
- audit/provenance → **`AuditInspector` §7.2** (shared family; Gateway is a consumer, not a fork)

The Gateway hosts **no `HoldToActuate` §5.2** actuator (it hosts no kill trigger — §5.3: apps that can *see* posture render read-only `HaltBand` and deep-link the trigger to MC/auth). It renders the `Shift+Esc` global halt-focus override (§5.3) like every posture-aware app, which focuses the **header's deep-link to MC's actuator**, not a local button.

---

## 3. Shell & global chrome (all screens)

Standard **`AppShell` §6.1**: 224/56px side rail, global header, suite switcher with the one suite-posture line, operator `PrincipalRef` + session-freshness stamp.

- **Header identity line:** `gateway · the hands — the only component that executes on hosts`.
- **Header center `SYSTEM STATE` zone:** the live suite kill level (from the switcher's shared posture read) **plus** the Gateway's own L2 figure: `L2 · epoch 4471 seen · 0 in-flight` with **`Freshness §4.9`** on the epoch. When level > G0 the **`HaltBand §4.6`** pins under the header on every screen (sticky), and the collapsed rail's halt glyph is gold-ringed.
- **Header right:** the read-only halt mirror + a `[ Halt console → ]` **deep-link to MC `/agents`** (the actuator lives there; §7.3). There is **no engage button in this app.**
- **Rail nav:** Monitor · Audit · Kill-switch · Catalog · Sandbox · Orphans.

Global states inherited by every screen:
- **`auth:revocations` session-ended** (§5.5): the operator's session dropped → "session ended — re-authenticate," streams stop, no frozen-green tiles.
- **stop-engaged:** `HaltBand` pinned; per-screen bodies additionally reflect halt (S1 cards flip to `▮▮ FROZEN`, S4 is the detail view).

---

## 4. Screen S1 — Live execution monitor  *(Instrument; the landing screen)*

**Job:** "what is running on which host, right now, and is every run inside its four-check envelope." A per-host card grid over `GET /api/hosts` + `GET /api/runs?state=active`, live via **`LiveStream §5.5`** on the aggregate event tail.

```
┌─ LIVE EXECUTION ─────────────────────────────────── ⟳ fresh 480ms · 24 hosts ─┐
│  filter: [ /host, ticket, agent…      ]   state:[active▾]  class:[all▾]        │
│                                                                                │
│ ┌────────────────────────────┐  ┌────────────────────────────┐                │
│ │ host-db-01        ⧗ EXECUTING│ │ host-web-03      ✔ VERIFYING│                │
│ │ [ R-01HX­…  ] [ T-000482 ]   │  │ [ R-01HY… ] [ T-000501 ]   │                │
│ │ ⬡ agent:patcher-07          │  │ ⬡ agent:patcher-02         │                │
│ │ class: kernel_update  ⚠dstr │  │ class: package_update      │                │
│ │ 🔒 gen 47 · lease 04:12 · ♥0.8s│ 🔒 gen 51 · lease 02:03 ·♥1.1s│               │
│ │ SoD ✔✔✔✔  approval·policy·   │  │ SoD ✔✔✔✔                   │                │
│ │        cred·mutex all bound  │ │ Wazuh poll: 2/5 pairs gone │                │
│ │ ▏task 6/9  apt-get dist-upgr…│  │ ⧗ awaiting post-scan       │                │
│ │ [ open run → ]               │  │ [ open run → ]             │                │
│ └────────────────────────────┘  └────────────────────────────┘                │
│ ┌────────────────────────────┐  ┌────────────────────────────┐                │
│ │ host-nas-01     ▮▮ FROZEN G1│  │ host-mail-02      ● IDLE    │                │
│ │ run halted at task boundary │  │ no active run              │                │
│ │ [ R-01HZ… ] → failed(halted)│  │ last: T-000455 done 11:04  │                │
│ └────────────────────────────┘  └────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Per-card composition (all shared components):** host `TicketRef`(host_id) + run `TicketRef` + ticket `TicketRef`; executor `PrincipalRef §4.2`; run lifecycle `StatePill §4.5` (`executing`/`verifying`/`health_check`/`rolling_back`/`preflight`); `FenceState §4.4` for the mutex generation + lease + heartbeat; the **`SoDChainStrip`** app-specific glyph strip (§8.1) collapsed to four ticks; a class chip that carries the destructive `TierBadge`-family warning where `action_class ∈ {destructive,kernel_update,reboot}`; a one-line current-task readout. **Host-originated content** (Wazuh-derived posture text) that appears on the card carries the `UNTRUSTED` `TierBadge §4.3`.

**States (§5.4):**
- **Loaded:** grid of cards as above; each streamed figure carries `Freshness §4.9`.
- **Loading-skeleton:** static card skeletons in the grid shape; no spinner (a per-run start *job* may show the single §5.4-permitted labelled spinner `starting run…` inside one card).
- **Empty (invitation):** "No hosts are executing. Runs appear here when an executor agent calls `execute_approved_plan` and clears the four-check chain. The Gateway starts nothing on its own." — states what populates it; no control (the operator cannot start a run here — that is an agent-only, fully-gated path).
- **Pattern-R error (red ✕):** a *local* read failure of the runs API the operator could retry → red inline notice "couldn't load the run list — retry"; **never** used for a dependency outage.
- **Pattern-D degraded (gold ⛊):** a **dependency** the Gateway needs is down (Board/CMDB/Vault/auth/its own Postgres) → **`HaltBand §4.6(b)` SAFE-STOPPED**, "This is the safety system working, not an outage of the console. STILL TRUE: no new dispatch, existing runs finish at task boundary, all gates fail closed." Cards that can't be confirmed render `Freshness` `⚠ CANNOT CONFIRM` in gold, **never a green idle**.
- **Stop-engaged:** `HaltBand §4.6(a)` pinned; active cards flip to `▮▮ FROZEN G1` and show the honest cancel-at-task-boundary status; a card mid-`dpkg` shows `⇉ DRAINING` (task boundary not yet reached), never a false "stopped."

---

## 5. Screen S2 — Run detail + SoD proof  *(Instrument; opened from any run ref)*

**Job:** the single most important Gateway screen — reconstruct one run's **segregation-of-duties proof from the chain alone** (PLAN §3), and tail its console. `GET /api/runs/{run_id}` + `GET /api/runs/{run_id}/events` (SSE over the audit store; **separate from the agent's MCP task channel**).

```
┌─ RUN  [ R-01HX9Q… ]  ⧗ EXECUTING ────────────── host [ host-db-01 ] · ⟳ 0.4s ─┐
│ ticket [ T-000482 ]   ⬡ agent:patcher-07   class kernel_update ⚠   op_id 0h2… │
│                                                                                │
│ ┌─ SEGREGATION-OF-DUTIES CHAIN (reconstructed from the audit chain) ────────┐ │
│ │ ✔ 0 CALLER   token aud=gateway · cnf DPoP ✔ · introspect 210ms · epoch4471│ │
│ │ ✔ 1 BOARD    consume_approval [ approval_id apr-… ] → executing            │ │
│ │              plan_hash sha256:9f… ✔ matches · allowlist 3/3 bound          │ │
│ │ ✔ 2 CMDB     verdict permit · [ decision_id dec-… ] · policy_version a1b2 │ │
│ │              window closes 02:40 · must-fit ✔ (est 6m ×2 fits)             │ │
│ │ ✔ 3 VAULT    cred by handle cred://hosts/host-db-01/root · lease lse-… ⧗  │ │
│ │              SSH-CA cert key_id=T-000482 · TTL 11m · plaintext: never here │ │
│ │ ✔ 4 MUTEX    🔒 gen 47 · Board hold + pg advisory lock · fence > 46 ✔      │ │
│ │ ────────────────────────────────────────────────────────────────────────  │ │
│ │ 🔒 SoD is enforced in Gateway code, not here. This screen displays the     │ │
│ │    evidence; no control on this page can skip, relax, or re-order a check. │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│ ┌─ CONSOLE  (RunConsole — audit-store SSE tail) ── task 6/9 · ⟳ live 0.4s ──┐ │
│ │ TASK [patch_debian : snapshot rootfs]  ok                                  │ │
│ │ TASK [patch_debian : apt-get dist-upgrade]  changed                        │ │
│ │  > 47 upgraded, 0 newly installed …                                        │ │
│ │ ▏(streaming — Last-Event-ID 00461)                                         │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│ health-check: pending   ·   rollback path: snapshot (available)                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Composition:** the **`SoDChainStrip §8.1`** rendered in full (four checks + Check-0 caller), each row citing its evidence artifact as a `TicketRef` variant (`approval_id`/`decision_id`/`release`/`lease`) and its verdict `StatePill`; `FenceState §4.4` for check 4; the **destructive-absence rule §4.7** printed verbatim as a 🔒 constitutional fact (no toggle, no ⛔). The console is the **`RunConsole §8.2`** app-specific component over `LiveStream §5.5`.

**States (§5.4):**
- **Loaded (executing):** as drawn; console streams; each check shows ✔/current.
- **Loaded (terminal):** run in `verifying` (Wazuh poll panel appears), `needs_review` (→ `ReviewChip §4.10` deep-linking MC), or `failed(reason=…)` — the reason is shown verbatim (`halted`/`rolled_back`/`unrecoverable`/`host_unreachable`/`orphaned`/`window_closed`/`credential_denied`/`PLAN_HASH_MISMATCH`) with a red `✕ FAILED` `StatePill`; **a killed run always renders `failed(halted)`, never `cancelled`** (PLAN §6.5).
- **Loaded (rejected preflight):** a run that never dispatched — the SoD strip shows the **first failing check in red ✕** with the machine reason (`NO_APPROVED_TICKET`/`STALE_FENCE`/`FLOOR_VIOLATION`/`WINDOW_MUST_FIT`/`ALLOWLIST_MISMATCH`/`UNKNOWN_PLAYBOOK`/…) and every downstream check greyed as `— not reached`. Rejections are first-class here (they are the hostile-model telemetry).
- **Loading-skeleton:** chain rows + console skeleton.
- **Empty:** N/A (a run detail always has a run; a bad `run_id` → Pattern-R "no such run" with an Audit link).
- **Pattern-R error:** run-fetch failed locally → red retry notice.
- **Pattern-D degraded:** the **audit store itself** (the SSE source) is unreachable → `RunConsole` degrades to `LiveStream` STALE and the panel shows gold `⚠ CANNOT CONFIRM live output — treating as safe-stopped`; **never a frozen-but-green console**. If Board/CMDB/Vault is down mid-render, the affected check row shows gold `⚠ CANNOT CONFIRM` (false-green prohibition §4.9), not a green ✔.
- **Stop-engaged:** `HaltBand` pins; the console shows the honest `⇉ DRAINING` → task-boundary `▮▮ cancelled at boundary → failed(halted)` progression.
- **Stream lifecycle:** on token `exp`/`auth:revocations` the console ends with "session ended — re-authenticate" (§5.5), not a silent freeze; on too-old `Last-Event-ID` → `event: reset` → re-sync from `GET /api/runs/{run_id}` then resume at tip.

---

## 6. Screen S3 — Audit trail  *(Instrument; consumes `AuditInspector §7.2`)*

**Job:** walk the append-only, hash-chained, Ed25519-signed per-command forensic log; verify the chain; show anchor status against MC. **This is `AuditInspector §7.2` — a shared family; the Gateway is a consumer, it does not fork it.** `GET /api/audit`.

```
┌─ AUDIT CHAIN ──────────────── chain_id gw-main · 41,802 records · ⟳ 1.2s ──────┐
│  [ Verify chain from seq… ]   filter:[ run, host, record_type, sub… ]          │
│                                                                                │
│  ┌─ CHAIN-VERIFY ────────────────────────────────────────────────────────┐   │
│  │ ✔ VERIFIED seq 41500→41802 · 302 records · Ed25519 ok · 1.9s           │   │
│  │  (a stale or failed verify NEVER renders green — see states)           │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│  ┌─ MC ANCHOR STATUS ────────────────────────────────────────────────────┐   │
│  │ last HEAD pushed seq 41800 · MC ack'd 41800 · ⟳ 4s   ✔ IN SYNC         │   │
│  │  retention 180d · re-push-above-last on reconnect                      │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  seq    time         who              action         target        outcome     │
│  41802  12:04:11.3  ⬡ agent:patcher-07 dispatch      [R-01HX…]     ⧗ executing │
│  41801  12:04:10.9  ⚙ svc:gateway      cred_redeem   cred://…root  ✔ ok        │
│  41800  12:03:58.1  ⚙ svc:gateway      cmdb_verdict  [dec-…]       ✔ permit    │
│  41799  12:03:57.0  ⬡ agent:patcher-11 dispatch      [host-x-02]   ✕ STALE_FENCE│
│  41798  12:03:44.2  ⚙ svc:gateway      consume_appr  [apr-…]       ✔ executing │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Composition (per §7.2):** a `DataTable §6.2` of append-only rows — mono tabular `seq`+timestamp · `PrincipalRef §4.2` (who) · action verb · `TicketRef`/handle target · outcome `StatePill §4.5`; rejection rows (`✕ STALE_FENCE`, `✕ FLOOR_VIOLATION`) are first-class. The **chain-verify affordance** and **verify-result** follow the §4.9 / §7.2 rule. **Read-only always** (append-only is the point; no row edits).

**States (§5.4):**
- **Loaded:** rows + last verify result + anchor status.
- **Chain-verify — success:** `✔ VERIFIED seq A→B · Ed25519 ok` (green **only** on a completed successful walk).
- **Chain-verify — CANNOT CONFIRM:** verify couldn't complete (store slow/partial, key unavailable) → **halt-gold** `⚠ CANNOT CONFIRM CHAIN` (§4.9) — **never green**.
- **Chain-verify — BROKEN:** an actual detected hash/sig break → **danger-red** `✕ CHAIN BROKEN at seq N` (§7.2), the operator's forensic alarm; links the offending record.
- **Anchor status — in sync / RESYNC-PENDING / HOLE:** `✔ IN SYNC`; or gold `⚠ RESYNC-PENDING` when MC is behind (anchor-push failure alarms, **does not halt** — contract §4); or red-alarmed **permanent hole** when HEADs fell past retention before MC received them (contract §3) — surfaced, never papered over.
- **Loading-skeleton:** table + two status-panel skeletons.
- **Empty (invitation):** only at genesis — "No audit records yet. Every dispatch, rejection, redemption, verdict, and kill event lands here, hash-chained." (Realistically never empty.)
- **Pattern-R error:** audit query failed locally → red retry; the chain itself is not implicated (distinguish from CHAIN BROKEN, which is a *content* alarm).
- **Pattern-D degraded:** the Postgres audit store is unreachable → `HaltBand` SAFE-STOPPED (audit-write failure halts dispatch, PLAN §9); verify/anchor panels show gold CANNOT-CONFIRM, not green.
- **Stop-engaged:** kill/halt events are themselves audit rows and appear in-stream; `HaltBand` pins.

---

## 7. Screen S4 — Kill-switch status  *(Instrument; read-mirror + the L2-CONFIRMED source)*

**Job:** the Gateway is the **L2 physical stop** and its own confirmation is the *sole legitimate L2-CONFIRMED source, read directly by auth* (`killswitch-chain.md` §4, PLAN §8). This screen renders that truth read-only. **The trigger button is NOT here** (§5.3/§7.3 — it lives in MC/auth); this screen deep-links to it.

```
┌─ KILL-SWITCH · L2 PHYSICAL STOP ──────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ┃ ▮▮  KILL-SWITCH ENGAGED · G1 FREEZE-DESTRUCTIVE           epoch 4471       ┃ │
│ ┃ Gateway refuses all new dispatch + new Vault redemptions.                  ┃ │
│ ┃ In-flight runs cancel at the next safe task boundary (never mid-dpkg).     ┃ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                                                                │
│  L2 CONFIRMATION (this Gateway — the source auth reads directly)               │
│   epoch_seen 4471  ·  level G1  ·  in_flight_runs 1  ·  last refuse 12:04:09   │
│   signed halt-status ✔  ·  ⟳ own truth, not a mirror                           │
│                                                                                │
│  AUTH L1 EPOCH (mirror)   epoch 4471 ✔ 0.3s   ·   in sync                      │
│                                                                                │
│  HALTED-RUN AFTERMATH (HonestState §4.8)                                       │
│  ┌────────────────┬────────────────────┬─────────────────────┐                │
│  │ ✔ 2 CONFIRMED  │ ◐ 0 PENDING        │ ⇉ 1 DRAINING        │                │
│  │ failed(halted) │ within TTL window  │ mid-task, past its  │                │
│  │ hold released  │                    │ reversible instant  │                │
│  └────────────────┴────────────────────┴─────────────────────┘                │
│   draining → [ R-01HZ… ] host-nas-01 · dpkg step · will finish + log           │
│                                                                                │
│   [ Halt console (MC) → ]   [ auth safe_stopped console → ]                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Composition:** **`HaltBand §4.6`** (member (a) ENGAGED here; G2 uses the intensified doubled-glyph variant); the **`HonestState §4.8`** triad for halted-run aftermath — **all three slots always shown, copy-discipline enforced** (never "all runs stopped" while pending/draining > 0); `Freshness §4.9` on the auth-epoch mirror; run refs as `TicketRef`. The two footer links are **deep-links** (`DangerAction` is **absent** by construction here — the Gateway hosts no lift/trigger; that is a printed fact, not a greyed control §4.7).

**States (§5.4):**
- **Loaded — G0 normal:** no `HaltBand`; the L2 panel shows `level G0 · 0 refusals`; the `HonestState` triad reads `✔ 0 · ◐ 0 · ⇉ 0` as a *positive* statement of confirmed silence.
- **Loaded — G1 engaged:** as drawn.
- **Loaded — G2 quiesce-all:** intensified `HaltBand` (heavier band, `▮▮▮▮`, full edge striping — still gold, non-hue cue).
- **Loading-skeleton:** band + panel skeletons.
- **Empty:** N/A (posture always exists).
- **Pattern-R error:** local failure reading the *aftermath list* → red retry on that panel only; the L2 confirmation figure is the Gateway's own and remains authoritative.
- **Pattern-D degraded — auth epoch mirror stale:** the auth L1 mirror is stale/unreachable → gold `▲ STALE → treating as safe-stopped` (§4.9), **never** a green "in sync." Note the L2 confirmation itself is *local Gateway truth*, so it stays authoritative even when the auth mirror is stale.
- **Pattern-D degraded — Gateway can't confirm its own halt liveness** (its own halt-state source stale): flips to `HaltBand` SAFE-STOPPED "cannot confirm freshness — treating as safe-stopped" (§4.9), Pattern D.
- **Stop-engaged:** this screen *is* the stop detail; the band is its primary content.

---

## 8. Screen S5 — Catalog registry  *(Instrument; the ONE operator write path)*

**Job:** review the Gateway-owned playbook implementations registry (versions, `content_sha256`, signatures, extravars schema, class, rollback capability) and perform **operator-vetted change control** — the single human write this app has. **Catalog writes are `DangerAction §4.7` + `ConfirmFriction §5.1` full-variant step-up, diff-hash-bound, audit-chained** (policy-plane change control, ARCH §12).

```
┌─ PLAYBOOK CATALOG ─────────────── 6 active · 1 pending change ─────────────────┐
│  key             ver   content_sha256   class          rollback  status  sig    │
│  patch_debian    v4     9f3a…b1          package_update snapshot  active  ✔ ed  │
│  patch_rhel      v3     2c77…0e          package_update dnf_hist  active  ✔ ed  │
│  reboot_host     v2     a180…44          reboot         none      active  ✔ ed  │
│  service_restart v5     7de1…9c          service_restart none     active  ✔ ed  │
│  health_probe    v3     11bc…f2          (read-only)    n/a       active  ✔ ed  │
│  sbx_pytest      v2     4400…aa          sandbox_exec   n/a       active  ✔ ed  │
│  ── pending operator-vetted change ─────────────────────────────────────────── │
│  patch_debian    v5▲    ee02…7d          package_update snapshot  PENDING ⧗     │
│                                          [ Review & apply change → ] (step-up)  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Change-control confirm (`ConfirmFriction §5.1` full):**
```
┌─ CONFIRM: PROMOTE CATALOG ENTRY  (patch_debian v4 → v5) ───────────── danger ─┐
│ ⚠ This registers new executable content in the Gateway catalog. Direction:    │
│   MORE real-world action — any approved plan naming patch_debian will run     │
│   THIS content on real hosts. Irreversible for runs already dispatched.       │
│   diff-hash bound: you are confirming sha256 ee02…7d (the exact diff shown).  │
│   Blast-radius: 12 hosts have patch_debian in an open allowlist.              │
│   Type  promote patch_debian v5  to confirm: [▏               ]               │
│   Re-authenticate (step-up):  🔑 passkey · auth_time fresh                    │
│         [ Cancel ]                        [ Promote entry ]  ← danger          │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Composition:** `DataTable §6.2` (mono `content_sha256` copy column, class chip, signature status); the pending change is a `StatePill` `⧗ PENDING`; the write routes through `ConfirmFriction §5.1` (typed-intent + step-up + red primary, diff-hash-bound), emits a `Toast §6.5` matching the verb ("Promoted") on success, and writes a tamper-evident audit row (visible next in S3). **There is no MCP path to this write** — the destructive-absence rule §4.7 is printed on the screen: `🔒 Agents cannot write the catalog by any path — this is an operator-only, step-up gate.`

**States (§5.4):**
- **Loaded:** active entries + any pending change.
- **Loading-skeleton:** table skeleton.
- **Empty (invitation):** "No playbooks registered. A playbook is admin-authored, hashed, signed, and promoted here before any plan can name it." (bootstrap only).
- **Pattern-R error:** the *promote* action failed to apply (validation, sig mismatch, stale diff-hash) → red `✕` inline in the dialog with what to fix; the operator's problem, recoverable.
- **Pattern-D degraded:** catalog store unreachable → gold SAFE-STOPPED panel; **the write path is disabled-by-absence** (rendered as a printed 🔒 fact "change control unavailable while the catalog store is safe-stopped," not a greyed button implying latent capability).
- **Stop-engaged:** `HaltBand` pins; catalog **reads** continue; a catalog **write** during a kill is still permitted only through the same step-up (catalog change is not itself host execution), but the confirm block echoes the live halt honest-state so the operator sees posture.

---

## 9. Screen S6 — Sandbox runs  *(Instrument; tier-0 evidence browser)*

**Job:** browse tier-0 sandbox evidence — **sandbox evidence = external verification** for the Library's admission gate. Read-only; the Gateway spawns and captures, the operator inspects. `GET /api/sandbox/{run_id}` + list. No host parameter exists anywhere in this surface (the D-7 non-leak guarantee is visible here).

```
┌─ SANDBOX RUNS (tier-0) ─────────────── harness hv-4c1a…9d20 ──────────────────┐
│  run          ticket      profile     exit  harness        finished           │
│  [R-01HS…]   [T-000733]  sbx_pytest  ✔ 0   hv-4c1a…       11:58   [ view → ]  │
│  [R-01HR…]   [T-000730]  sbx_lint    ✕ 2   hv-4c1a…       11:41   [ view → ]  │
│                                                                                │
│ ┌─ EVIDENCE  [ R-01HS… ] ───────────────────────────────────────────────────┐│
│ │ ticket [ T-000733 ]  profile sbx_pytest  exit ✔ 0                           ││
│ │ harness_version hv-4c1a…9d20   env: image sha256:…  · py3.12 · pytest8.2    ││
│ │ input_ref  note nt-…@rev14   [ UNTRUSTED ⚠ curation-ingested ]              ││
│ │ evidence tier:  [ ✔ sandbox-verified · gateway-delivered ]                  ││
│ │ transcript_ref  blob sha256:… (in audit chain)                              ││
│ │ ┌─ transcript ────────────────────────────────────────────────────────┐    ││
│ │ │ ===== 12 passed in 3.41s =====                                       │    ││
│ │ └─────────────────────────────────────────────────────────────────────┘    ││
│ │  target: fresh podman container · no suite networks · no creds mounted      ││
│ └─────────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────────┘
```

**Composition:** `DataTable §6.2` list; the evidence detail is the **`SandboxEvidenceView §8.3`** app-specific component. Crucially it renders the **provenance duality via `TierBadge §4.3`**: the *input* (`input_ref` — a note/doc revision) is **`UNTRUSTED`** (host/externally-originated adversarial content), while the *evidence itself* is **Verified** (`sandbox-verified`/`gateway-delivered`) — a sandbox test IS an external verifier. The transcript is machine output in a mono pane. `harness_version` is a mono ID with copy.

**States (§5.4):**
- **Loaded:** list + selected evidence.
- **Loading-skeleton:** list + evidence skeleton.
- **Empty (invitation):** "No sandbox runs yet. Curation-team agents call `run_sandbox_test`; each run's transcript and environment fingerprint land here as external-verification evidence for the Library."
- **Pattern-R error:** local evidence-fetch failure → red retry.
- **Pattern-D degraded:** sandbox execution disabled (CMDB `disposable` class set to deny → the operator's sandbox kill knob, §C5) → gold "sandbox execution disabled by policy (kill knob)" — a *policy* safe-stop, rendered `⛊`, **not** a red error; existing evidence stays browsable.
- **Stop-engaged:** at kill ≥ G1 sandbox dispatch is refused (same chokepoint) → new runs show `▮▮ FROZEN`; historical evidence stays readable; `HaltBand` pins.

---

## 10. Screen S7 — Orphan reconciliation  *(Instrument; Gateway-local operational queue)*

**Job:** after a Gateway crash mid-run, the Board hold persists deliberately (the host may have been touched). This queue surfaces those orphans and the **operator-gated re-redemption** when the old lease expired (PLAN §6.4). **This is a Gateway-local operational queue — NOT the canonical `ReviewQueue`** (which is MC-owned §7.1). Its escalations render `ReviewChip §4.10` and **deep-link out** to Chat + MC.

```
┌─ ORPHAN RECONCILIATION ─────────────── 1 orphan · 0 auto-resolvable ──────────┐
│  run         host          state at crash  Board hold  probe        action     │
│  [R-01HP…]  [host-fs-04]  executing       held gen 39  ⚠ needed     ▼          │
│   ┌──────────────────────────────────────────────────────────────────────┐    │
│   │ ticket [ T-000701 ]  ⬡ agent:patcher-05  crashed 11:12 mid-task 4/7   │    │
│   │ Board hold: 🔒 gen 39 · NOT reaper-eligible (orphan rule)             │    │
│   │ read-only probe: host reachable ✔ · reboot marker present ⚠           │    │
│   │ old lease lse-… EXPIRED → re-redemption needed (operator-gated)       │    │
│   │ ⚑ ESCALATED · orphaned  → mc/review/T-000701   → chat                 │    │
│   │        [ Request fresh credential + probe → ]  (step-up)              │    │
│   │        NEVER auto-resumes a half-run — reports truthful terminal only │    │
│   └──────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Composition:** `DataTable §6.2`; `FenceState §4.4` for the persisted Board hold generation; `ReviewChip §4.10` with the machine reason `orphaned` deep-linking MC `/review/<ticket_id>` and Chat; the one action (**re-redemption** — request a fresh minimal-TTL `release_id` for a read-only probe) is `DangerAction §4.7` + `ConfirmFriction §5.1` step-up (it moves toward touching a host again). **The Gateway never auto-resumes** — printed as a 🔒 constitutional fact; the only outcomes it writes are the truthful terminal (`verifying`/`needs_review` if healthy + complete, else `failed(orphaned)`).

**States (§5.4):**
- **Loaded:** orphan rows with probe status + escalation chips.
- **Loaded — empty (the healthy default, invitation):** "No orphaned runs. If the Gateway ever dies mid-run, the half-run appears here for truthful reconciliation — it is never silently resumed." — the reassuring empty state that states the guarantee.
- **Loading-skeleton:** table skeleton.
- **Pattern-R error:** re-redemption request failed locally (Board/Vault said no at request time) → red inline with reason; recoverable, retryable by the operator.
- **Pattern-D degraded:** Board/Vault down → the probe/re-redemption path is safe-stopped gold; orphans still *listed* from local `runs` (fail-closed: cannot resolve, can enumerate). `Freshness` on the Board-hold cross-check shows `⚠ CANNOT CONFIRM hold`, never a green "resolved."
- **Stop-engaged:** at kill, re-redemption is refused (no new Vault redemptions ≥ G1); orphans remain listed; the action shows `▮▮ FROZEN`.

---

## 11. App-specific components (justified — genuinely domain-unique, not re-draws)

Each is justified against §8/§4: it renders something no shared component covers, and it **composes** shared components internally rather than re-drawing any §4 entity.

| # | Component | What it is | Why it can't be a shared component |
|---|---|---|---|
| **8.1** | `SoDChainStrip` | the four-check (+Check-0 caller) segregation-of-duties evidence render — approval→policy→credential→mutex, each with its verdict `StatePill` and its evidence-artifact `TicketRef` variant | **domain-unique to the Gateway**: no other app *has* a four-holder execution chain to reconstruct. It is the visual proof that "no single component reaches a destructive action." It *consumes* `TicketRef`/`PrincipalRef`/`StatePill`/`FenceState`/`TierBadge` — it re-draws none of them; only the four-slot chain layout + the §4.7 destructive-absence caption are new. |
| **8.2** | `RunConsole` | the streaming ansible task-event stdout/stderr tail pane (mono, task-indexed, `Last-Event-ID` cursored) | **domain-unique**: a live machine-output terminal is not a `DataTable` and not prose. Its *transport* is the shared `LiveStream §5.5` contract (freshness-tagged, degrades to STALE, terminates on `exp`/revocation); only the terminal render is new. A generic table cannot represent interleaved streaming task output. |
| **8.3** | `SandboxEvidenceView` | the tier-0 evidence detail: transcript blob + `env_fingerprint` + `harness_version` attestation + input/evidence provenance duality | **domain-unique** (an evidence ledger, the §7.2 note explicitly allows "evidence ledger" as domain-unique). It *consumes* `TierBadge §4.3` for the UNTRUSTED-input vs Verified-evidence split and `TicketRef` for ids; the transcript/fingerprint/attestation layout is Gateway-specific and cannot be a `DataTable` row. |

**Explicitly NOT app-specific (consumed, never re-drawn):** the audit trail (S3) is **`AuditInspector §7.2`**, not a bespoke log; the kill status (S4) is **`HaltBand §4.6` + `HonestState §4.8`**, not a custom banner; the catalog write (S5) is **`ConfirmFriction §5.1`**, not a bespoke dialog; every id/identity/state/fence/tier is its §4 component. A per-host "card" on S1 is a *layout* of shared components (`TicketRef`+`PrincipalRef`+`StatePill`+`FenceState`+`SoDChainStrip`), not a new component.

---

## 12. Human-surface API (two views, one state — §8.4)

The operator UI and the MCP agent surface (PLAN §11) are **siblings over one core HTTP API** (PLAN §12); the UI reads the same state the agent tools write. Human write paths are **only** catalog change-control and orphan re-redemption — both step-up + audit-chained. The dispatcher (`POST /api/runs`) is **internal/agent-driven, never an operator button.**

| Endpoint | Method | Serves screen | Read/Write | Notes |
|---|---|---|---|---|
| `/api/runs` | GET | S1 | read | list; `?state=active`, filters by host/ticket/agent |
| `/api/runs/{run_id}` | GET | S2 | read | one run + reconstructed SoD chain evidence |
| `/api/runs/{run_id}/events` | GET (SSE) | S1,S2 | read | `LiveStream §5.5` tail over the **audit store** (separate from the agent MCP task channel); `Last-Event-ID` replay, `event: reset`→REST re-sync |
| `/api/runs` | POST | — | write (internal) | the dispatcher; **not an operator affordance** — runs only via `execute_approved_plan` through the four checks |
| `/api/hosts` | GET | S1 | read | per-host lock / fence / health view |
| `/api/audit` | GET | S3 | read | chain browse + `?verify_from=seq` verify-walk; `AuditInspector §7.2` |
| `/api/halt-status` | GET | S4 | read | `{epoch_seen, level, in_flight_runs, last_dispatch_refused_at, sig}` — **auth reads this directly as the sole L2-CONFIRMED source**; the UI renders the same tuple |
| `/api/anchors` | POST (outbound worker) | S3 (status) | write (→MC) | signed HEAD push to MC per `gateway-mc-audit-anchor.md`; UI shows sync status, does not trigger |
| `/api/catalog` | GET | S5 | read | playbook versions/hashes/sigs/schemas |
| `/api/catalog` | POST | S5 | **write (operator, step-up)** | vetted change control; diff-hash-bound `ConfirmFriction §5.1`; tamper-evident audit row; **no MCP path** |
| `/api/sandbox` , `/api/sandbox/{run_id}` | GET | S6 | read | tier-0 evidence list + detail |
| `/api/orphans` | GET | S7 | read | Gateway-local orphan queue from non-terminal `runs` ⋈ Board holds |
| `/api/orphans/{run_id}/reprobe` | POST | S7 | **write (operator, step-up)** | operator-gated fresh-`release_id` + read-only probe; never auto-resumes |

**Operator auth (all screens):** forward-auth session via proxy (human principal, `gateway`-audience UI session); every state-changing operator action is step-up-confirmed + audit-chained (PLAN §12).

---

## 13. Consistency notes (what this app consumes, from where)

- **Renders every §4 entity via its shared component** — `TicketRef`, `PrincipalRef`, `TierBadge`, `FenceState`, `StatePill`, `HaltBand`, `DangerAction`+absence-rule, `HonestState`, `Freshness`, `ReviewChip`. No one-off re-draws (checked against the DESIGN_REVIEW sweep).
- **Cross-app patterns are consumed, never forked:** the audit surface is **`AuditInspector §7.2`** (shared family); escalations deep-link to MC's canonical **`ReviewQueue §7.1`** via `ReviewChip §4.10`; the kill actuator is MC/auth's (§7.3) — this app renders only the read-only `HaltBand` and deep-links out.
- **The Gateway does not own or host a review/approval queue.** The orphan-reconciliation queue (S7) is a Gateway-local *operational* queue, explicitly distinct from `ReviewQueue`; its review-worthy items escalate **out** to MC + Chat.
- **False-green prohibition is load-bearing here** (§4.9): chain-verify, anchor status, halt-status, host-health, and every mirror render the honest unknown in halt-gold rather than a fabricated green — this is the app whose whole job is to never lie about whether it acted or stopped.
- **The destructive-absence rule (§4.7) is used affirmatively, not by omission:** "agents cannot write the catalog," "SoD cannot be relaxed here," "the Gateway never auto-resumes a half-run," and "no kill trigger lives here" are **printed 🔒 constitutional facts**, never greyed-out controls.
- **Instrument-only, dark-only** (§2): no `--paper-*`, no Source Serif 4, no Workshop pane anywhere in this app.
- **One `ConfirmFriction §5.1` gate** governs both operator writes (catalog promote, orphan re-probe) — full variant (typed-intent + step-up + red), diff-hash-bound for the catalog (policy-plane change control, ARCH §12).
