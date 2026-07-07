# UI_SPEC.md — `chat` (Stage-3 UI/UX Specification)

> **Scope:** the human-surface half of Chat — the operator's notification feed, notification detail, broadcast composer, and health strip. Chat's agent surface is a single write-only MCP tool (`post_notification`, PLAN §4); this document specifies the *other sibling over the same state* (PLAN §3 API). **Design-specification only — no code.**
>
> **Grounding:** consumes `context/DESIGN_SYSTEM.md` (FROZEN) + `DESIGN_SYSTEM_COMPONENTS.md`; app state from `apps/chat/planning/PLAN.md`; deep-links + resolve feed from `context/CONTRACTS/mc-chat-review-resolve.md` (FROZEN). Standard risk class.

---

## 1. Archetype declaration & governing principle

**Archetype: BOTH — an Instrument shell wrapping a Workshop-ish feed.**

| Screen | Archetype | Why |
|---|---|---|
| **Feed** | Instrument (control-room list) with a **Workshop reading affordance** for the body preview | It is a dense, live, keyboard-driven truth-stream (Instrument `DataTable`-family rows), but each row carries agent-authored **markdown** that reads better on a light measure than as chrome. The list is Instrument; an expanded body preview borrows the Workshop reading pane. |
| **Notification detail** | **Workshop** content pane inside the Instrument shell | The sanitized markdown `body` is long-form content — rendered on `--paper-*` at `--fs-read`, per §2. Metadata/audit around it stays Instrument. |
| **Broadcast** | Instrument (composer + banner + history table) with a Workshop **preview** of the composed markdown | A form + a `DataTable` history; the live preview of what the fleet will read uses the reading surface. |
| **Health strip** | **Instrument** (pure status readout) | Freshness figures, sink status, DB-size guard — machine truth, no reading. |

**Governing principle (the one sentence a Stage-4 build must not violate):**
Chat is **the doorbell; MC is the door.** It *renders* review/escalation state and **deep-links** to MC's canonical `ReviewQueue`; it **never hosts a queue, never clears a gate, never actuates a stop.** Everything Chat shows about another app's state is a **deliberately-stale pointer** — *when the notification and the live target disagree, the target wins* (PLAN §2), and that fact is printed on every deep link.

---

## 2. Design-language note

**This spec consumes `DESIGN_SYSTEM.md`; it states deltas only.** Every shared entity is rendered by its canonical component — this document cites by ID and never re-draws the visuals. Chat introduces **no new tokens** and **no safety-grammar variants**. Its one genuinely domain-unique widget (the `KindBadge` priority-band chip that fronts a feed row) is justified in §5; everything else is a shared component in a Chat-specific arrangement.

Two archetype notes carried verbatim from the system: the app **shell stays Instrument-dark** in every screen (DS §2); only the *content substrate* of the detail body / feed body-preview / broadcast preview uses the Workshop `--paper-*` reading surface + Source Serif 4 at `--fs-read`. **No §4 safety component ever renders on paper.**

---

## 3. Shell & chrome (consumed, not specified)

Chat renders inside `AppShell` §6.1:
- **Side rail** — Chat's own views (Feed / Broadcast / Health) as rail items; the **suite switcher** lists the operator's other apps and shows the **suite posture once** (kill level + any Pattern-D dependency), so posture is legible from inside Chat even though Chat has no actuator.
- **Global header** — app name + one-line identity ("Chat — agent→operator notifications; operator→fleet broadcast"); center `SYSTEM STATE` zone; **right slot renders the read-only `HaltBand` mirror** (§4.6) — Chat is **not** in the kill chain (`killswitch-chain.md` §1), so it shows the band **read-only with no actuator** and, if the operator wants the trigger, the band's `[ Review halt → ]` deep-links to MC/auth (§5.3 rule for non-kill-chain apps).
- **Operator identity** — logged-in operator as `PrincipalRef` §4.2 + session-freshness stamp.
- Header/rail also surface the **live SSE connection state** as a compact `Freshness` chip (§4.9) — this is the doorbell's own liveness and belongs in chrome so it is visible on every screen (full detail on the Health strip, §4.4).

Global keyboard model per §5.6: `/` focuses the feed filter; roving tabindex in the feed table; `Shift+Esc` focuses the header halt affordance (which here deep-links to MC/auth rather than actuating — Chat has no live actuator, §5.3) with the documented fallback chord.

---

## 4. Screens

### 4.1 Feed — the live notification stream

**Purpose:** the operator's continuously-updating list of what agents are telling them. Instrument list; rows are the truth-surface (`DataTable` §6.2 anatomy), fed by `GET /api/feed` (SSE, `LiveStream` §5.5) with `GET /api/notifications` for history/replay.

```
┌─ AppShell header ─────────────────────────────────────────────────────────────────┐
│  Chat   SYSTEM STATE: ● nominal        ⟳ feed fresh 0.4s · ◐ operator:ada  🔑 fresh │
├─ (HaltBand mirror renders here full-width ONLY when suite posture > G0 — read-only) ┤
├───────────────────────────────────────────────────────────────────────────────────┤
│  FEED                                            [/ filter]  [ Ack all seen ▸ ]     │
│  ▸ kind: [esc][review][done]  ▸ ≥priority: [1..5]  ▸ agent  ▸ ticket  ▸ ☐ unacked   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ ⚑ P5 ESCALATION  ⬡ agent:patcher-07  · board_escalation      2m ·×3  [Ack][→] │ │  ← pinned, --attn banner-family
│  │   NAS reboot hung — host unreachable, cannot verify patch                      │ │
│  │   ◈ → mc/review/T-000123   (target wins)   🔒 gen 46 · advisory                │ │
│  ├───────────────────────────────────────────────────────────────────────────────┤ │
│  │ ◈ P4 NEEDS_REVIEW ⬡ agent:writer-03  · —          [ T-000210 ]   14m   [Ack][→]│ │
│  │   Research note ready: safe-patch practice for Wazuh fleet                      │ │
│  │   ◈ → mc/review/T-000210   (target wins)                                        │ │
│  ├───────────────────────────────────────────────────────────────────────────────┤ │
│  │ ✔ P2 DONE        ⚙ svc:tier-approver           [ T-000198 ]      1h   [Ack][→] │ │
│  │   Canary batch patched · Wazuh confirmed active→solved                          │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│  showing 90d · 3 unacked · 41 total          [ load older → ]                        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Row anatomy — every field is a shared component:**
- **Kind + priority front-chip** = `KindBadge` (app-specific, §5) — the ONE Chat widget. It fronts `escalation ⚑ / needs_review ◈ / done ✔` with the server-clamped priority band (PLAN §3.2). Its `needs_review`/`escalation` members ARE a `ReviewChip` §4.10 (StatePill + machine-reason + deep-link); `done` is a plain `StatePill` §4.5 (`✔ DONE`). See §5 for why the band-fronting is a justified composition, not a re-draw.
- **Author** = `PrincipalRef` §4.2 (`agent_id` = server-stamped `sub`, never caller-supplied; kind-glyphed ⬡/◐/⚙).
- **Machine reason** (escalations/reviews) = rendered verbatim `--ink-600` per `ReviewChip` §4.10 (`board_escalation`, `unmapped_wazuh_agent`, …); `—` when none.
- **Ticket** = `TicketRef` §4.1 when `ticket_id` present (opaque mono, copy-on-click); absent otherwise.
- **Deep-link** `[→]` and the inline `◈ → mc/review/<ticket_id>` = the `ReviewChip` deep-link into MC's canonical `ReviewQueue` §7.1, built by read-time derivation from `source_ref` (PLAN §6 / contract §2). **Always captioned "target wins"** (§1 principle). For an `mc|review` row this is `https://mc.<SUITE_DOMAIN>/review/<ticket_id>`; while the MC seam is pre-freeze the caption falls back to "review queue" pointing at MC home (PLAN §6) — the row still renders, degraded never wrong.
- **Age / repeat** = tabular age (`2m`) + `·×3` repeat-count (PLAN §11.2 dedup collapse); tabular figures (§3.8), never width-shifting.
- **Fencing token**, when supplied, = `FenceState` §4.4 **rendered greyed with an `advisory` micro-tag** — Chat stores it verbatim but pings deliberately outside the fencing reject-set (PLAN §15.4; DS §4.4 advisory-display rule). It is display-of-truth, never a gate here.
- **Ack** = a **light**, non-destructive affordance (marking "operator saw it," Chat-owned state, PLAN §2). It is **not** a `DangerAction` and **not** a review-clear — acking never clears a gate. A `Toast` §6.5 ("Acked") confirms; the row un-pins/greys.

**Behaviors:**
- **Escalation pinning:** un-acked `escalation` rows are **pinned to the top** and rendered in the `--attn` StatePill family (attention, *not* halt-gold — an escalation is a needs-attention state, not a safe-stop; gold is reserved for §4.6 only). They stay pinned until acked (PLAN §10, §11.2). Repeat-count ticks as the agent re-notifies (≤ every 15 min, PLAN §11.2).
- **Batch ack** = `[ Ack all seen ▸ ]` → `POST /api/notifications/ack {up_to_seq, kind?}` (PLAN §3). This is bulk but **benign** (marks-seen only), so it is a single light confirm (§5.1 light variant, signal-cyan) — **not** typed-intent/step-up; it moves toward *less* noise, not more action.
- **Filters** = `Field`-family §6.3 chips: kind / min-priority / agent / ticket / unacked (PLAN §10). `/` focuses. Filter state is URL-reflected so a filtered feed is shareable/bookmarkable.
- **Live stream** = `LiveStream` §5.5: `Last-Event-ID` = `notification_id` replay (PLAN §7); on too-old cursor → `event: reset` → re-sync from `GET /api/notifications` then resume at live tip. New rows settle-flash in (§3.11). Stream terminates on token `exp` / `auth:revocations` → the "session ended — re-authenticate" state (§5.5), never a silent freeze.

**States (§5.4 honest defaults):**
| State | Rendering |
|---|---|
| **Loaded** | rows as above; live SSE tip; feed-fresh chip green in header. |
| **Loading (skeleton)** | static row skeletons matching the table (§5.4) — never a spinner. Header freshness chip reads `⟳ connecting`. |
| **Empty (invitation)** | "No notifications in this window. Agents post escalations, review-ready work, and completions here — this feed fills as the fleet works. Widen the window or clear filters." (§5.4 invitation, no mascot). If filters are the cause, the empty state names *which* filter is hiding rows and offers `[ clear filters ]`. |
| **Pattern-R error (red)** | a *local, recoverable* failure — e.g. an ack POST returned 409/429, or a filter query 400'd. Red ✕ inline notice on the affected control ("Ack didn't apply — already acked by another session; refreshing row" / "Rate-limited, retry in Ns"), the operator's problem, stated + fixable. **Does not** color the whole screen. |
| **Pattern-D degraded (gold)** | a *dependency* is down. **Two distinct cases, both `HaltBand` §4.6b SAFE-STOPPED (gold ⛊), never red:** **(a) the SSE feed stalled past its bound** → the feed body degrades to `STALE` (§4.9): last-known rows held but stamped `▲ STALE — live feed unconfirmed; showing last-known as of <age>`, and a Pattern-D band explains "the notification stream is unconfirmed; escalations may not be arriving live — check the Board for the durable record" (PLAN §12 availability row: Board is the durable coordination fallback). **(b) the MC resolve feed / deep-link target is unreachable** → deep-links still render (they are template-derived and always valid) but carry a gold `⛊ MC unreachable — link may 'not-in-queue' until MC returns` micro-note; the row is **never** shown as a red error, because MC being down is the safety system's honest gap (contract §3 "MC-observed, honest gaps"), not Chat's failure. |
| **Stop-engaged** | when suite posture > G0, the read-only `HaltBand` mirror renders full-width under the header (§3). The **feed keeps flowing** — Chat is out of the kill chain and benign reads continue by design (`killswitch-chain.md`; DS §4.6 "benign reads continue"). No feed content changes; only the band appears. |

---

### 4.2 Notification detail — deep-link landing + full envelope

**Purpose:** the full record of one notification: sanitized markdown body (Workshop reading pane), complete envelope metadata, the mutating-action audit trail, and the deep-link out. Reached by row-click or by `GET /api/notifications/{id}`.

```
┌─ ← Feed ──────────────────────────────────────────────────────────────────────────┐
│  ⚑ P5 ESCALATION      ⬡ agent:patcher-07      · board_escalation                    │  ← KindBadge + PrincipalRef + reason
│  [ N-01J8… ]  copy      posted 14:02:11 · ×3 (last 14:31:02)   [ T-000123 ]         │  ← notification_id (mono) + TicketRef
│  ┌─ target-wins caption ───────────────────────────────────────────────────────┐   │
│  │ ⓘ This is a snapshot from when it was posted. The live target is authoritative│  │
│  │   — open it to see current truth:  ◈ → mc/review/T-000123   [ Open in MC → ]  │  │  ← ReviewChip deep-link §4.10/§7.1
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│  ╔══════════ body (Workshop --paper reading pane, Source Serif 4 --fs-read) ═══════╗ │
│  ║  NAS reboot hung — host unreachable, cannot verify patch                        ║ │
│  ║  The NAS did not come back after the kernel update; SSH is refused and Wazuh    ║ │
│  ║  shows the agent offline. I have not retried (per escalation-not-spin). …       ║ │
│  ║  [ remote images / raw HTML stripped — rendered as dead text, PLAN §12 ]        ║ │
│  ╚═════════════════════════════════════════════════════════════════════════════════╝ │
│  ── envelope ──────────────────────────────────────────────────────────────────────  │
│  kind escalation · priority 5 · tags [reboot][nas] · source board/ticket/T-000123     │
│  🔒 gen 46 · advisory   (FenceState, greyed — Chat does not enforce fencing)          │
│  ── audit ─────────────────────────────────────────────────────────────────────────  │
│  AuditInspector §7.2 (append-only): posted · 3× repeat · push delivered/gave_up · ack │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components used:**
- `KindBadge` §5 (header) fronting the same `ReviewChip`/`StatePill` as the feed row.
- `PrincipalRef` §4.2 (author), `TicketRef` §4.1 (`ticket_id`), and the `notification_id` as a **mono copy-on-click chip** (a Chat-minted id per IDENTIFIERS, rendered with the DS mono-identifier rule §3.8 — not a `TicketRef`, since it is not a work-item, but the same mono+copy affordance).
- **Body** = Workshop reading pane (`--paper-*`, Source Serif 4, `--fs-read`, operator-zoomable per §3.8). Sanitized at render (allowlist markdown, raw HTML + remote refs stripped, PLAN §12) — **body links render as dead text**, not clickable (PLAN §12 anti-phishing); the *only* live link on the screen is the template-derived deep-link.
- **Deep-link block** = `ReviewChip` §4.10 into `ReviewQueue` §7.1, with the mandatory **target-wins caption** (§1 principle; contract §3 "target wins").
- `FenceState` §4.4 greyed + `advisory` micro-tag.
- **Audit trail** = `AuditInspector` §7.2 — the append-only mutating-action record for *this* notification (posted / repeat-collapses / push delivered|gave_up / acked-by-whom), rows: timestamp (mono) · `PrincipalRef` (actor, e.g. the acking operator) · action verb · outcome `StatePill`. Chat's `audit_log` is **not** hash-chained (Standard class, not Critical-infra), so the inspector shows **no chain-verify affordance** — it is the plain append-only family member (§7.2 without the tamper-evidence pivot). Read-only always.

**States (§5.4):**
| State | Rendering |
|---|---|
| **Loaded** | full envelope as above. |
| **Loading** | skeleton: header chips + a paper-pane body skeleton + audit-row skeletons. |
| **Empty** | **not applicable by construction** — a detail page always has an envelope. A **bad/stale `notification_id`** (e.g. from an old push whose row aged out) renders a Pattern-R "This notification is no longer in the retained window ([ back to feed ]) — the underlying condition, if still live, will have re-fired as a new row" (never a bare 404; PLAN §9 retention). |
| **Pattern-R error** | ack from this page failed (409 already-acked / 429) → red ✕ inline on the ack control, fixable, local. |
| **Pattern-D degraded** | the **deep-link target's system (MC/Board/Notes) is unreachable** → the deep-link stays rendered with the gold `⛊ target unreachable — showing this snapshot; open when it returns` note (Pattern-D, not red — the snapshot body is *still true as posted*; the live door is just temporarily shut). The **target-wins caption is reinforced**, never contradicted. |
| **Stop-engaged** | read-only `HaltBand` mirror in the shell header; detail content unchanged (benign read). |

---

### 4.3 Broadcast — operator→fleet composer + active banner + history

**Purpose:** the operator writes one soft, UI-only advisory to the fleet (PLAN §1.2). Explicitly **weaker than the kill switch** — a broadcast has **no enforcement teeth** and is nowhere in the kill chain (`killswitch-chain.md` §1). This screen must make that non-authority visually honest so a broadcast is never mistaken for a stop.

```
┌─ BROADCAST ───────────────────────────────────────────────────────────────────────┐
│  ┌─ ACTIVE BROADCAST (renders only when one is live) ───────────────────────────┐   │
│  │ 📣 P3 · "Maintenance window opens 22:00 UTC — pause non-urgent claims"        │   │  ← --signal/--attn family, NOT gold
│  │    by ◐ operator:ada · posted 2h · expires in 21h            [ Revoke ▸ ]     │   │  ← DangerAction, light tier (toward-less)
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│  ── compose ───────────────────────────────────────────────────────────────────────  │
│  🔒 A broadcast is an advisory the fleet MAY read. It does NOT stop, gate, or         │  ← destructive-ABSENCE fact §4.7 (lock glyph)
│     command any agent. To halt the fleet, use the kill switch in MC/auth → .          │
│  Body   [ markdown, ≤2000 … ]                Priority [ 3 ▾ ]   Expires [ 24h ▾ ]     │  ← Field §6.3
│  ╔═ preview (Workshop paper pane — what a fleet reader would see) ═════════════════╗  │
│  ║  Maintenance window opens 22:00 UTC — pause non-urgent claims                    ║  │
│  ╚═════════════════════════════════════════════════════════════════════════════════╝ │
│                                                            [ Post broadcast ]         │
│  ── history ───────────────────────────────────────────────────────────────────────  │
│  DataTable §6.2: [ B-… ] · body · by PrincipalRef · posted · expires/expired · revoke │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components used:**
- **Active-broadcast banner** — a persistent `--signal`/`--attn`-family band (interactive/attention), **deliberately NOT `HaltBand` and NOT gold** — a broadcast is not a safe-stop and must never borrow the safe-stop grammar. It renders `PrincipalRef` §4.2 (author) + a tabular expiry countdown (§4.9 figure). *(This is a persistent StatePill-family advisory notice, not a new component; §6.5 Toast-discipline reinforces "gold is never used here.")*
- **The non-authority statement** = the **destructive-absence rule §4.7**: rendered as an **affirmative printed fact with a lock glyph 🔒 and no interactive affordance** ("a broadcast does NOT stop/gate/command — to halt, use MC/auth") — *not* a greyed-out "stop the fleet" button (which would imply a latent capability). The ⛔ glyph is never used here (§3.7). This is how the UI encodes "Chat has no kill authority" constitutionally.
- **Composer** = `Field` §6.3 (body markdown ≤2000, priority select, expiry select — PLAN §1.2). Inline validation, visible labels, no placeholder-as-label. **Preview** on the Workshop paper pane.
- **Post** = `POST /api/broadcasts` under `chat:manage`. Posting a broadcast is benign (advisory, no world effect — PLAN §4.1 action-class = write-benign), so it is a **plain submit with a light confirm** — it moves toward *more information*, not more real-world action, so it does **not** require typed-intent/step-up. A `Toast` §6.5 ("Broadcast posted") matching the verb confirms.
- **Revoke** = `POST /api/broadcasts/{id}/revoke` under `chat:manage`. Revoke *withdraws* an advisory — toward **less** standing signal — so it is `DangerAction` §4.7 at the **light** friction tier (§5.1 rule 4: toward-less → single confirm, signal-cyan, no typed intent). It writes an audit row.
- **History** = `DataTable` §6.2: `broadcast_id` (mono copy) · body preview · `PrincipalRef` author · posted/expires (tabular) · `StatePill` (`● active` / `◼ expired` / `⛒ revoked`) · revoke affordance for active rows.

**States (§5.4):**
| State | Rendering |
|---|---|
| **Loaded** | composer + (active banner iff live) + history table. |
| **Loading** | skeleton composer + history-row skeletons. |
| **Empty** | no active broadcast → banner region collapsed with an invitation: "No active broadcast. A broadcast is a soft advisory the fleet may read — it does not stop or command agents. Compose one below." History empty → "No broadcasts yet." |
| **Pattern-R error** | post/revoke failed (400 validation → inline `Field` error with triangle-bang; 429 rate-limited → red ✕ retry-after; 409 already-revoked → red ✕ "already revoked, refreshing"). Local, fixable. |
| **Pattern-D degraded** | Chat's own DB/write path unavailable → composer disables its submit and a Pattern-D gold band explains "broadcast composing is paused — Chat's store is unreachable; existing broadcasts still display" (never a red error for a dependency outage). |
| **Stop-engaged** | read-only `HaltBand` mirror in header. Broadcasting **remains available** (it is not a kill-chain action, and the operator may well want to advise the fleet *about* the halt) — but the destructive-absence statement (§4.7) remains, so the operator cannot mistake a broadcast for the stop. |

---

### 4.4 Health strip — the doorbell's own liveness

**Purpose:** honest status of Chat's operational signals (PLAN §10.4): SSE connection, ntfy push-sink, DB size vs guard, backup age, MC resolve-seam. Pure Instrument. Every figure is `Freshness` §4.9 — **the false-green prohibition binds hard here** (a doorbell that lies about whether it can ring is the worst failure this app can have).

```
┌─ HEALTH ──────────────────────────────────────────────────────────────────────────┐
│  ⟳ SSE feed      ● connected · fresh 0.4s · Last-Event-ID N-01J8…    source: chat     │
│  📤 push sink    ● ntfy delivering · last ok 12s · gave_up 0          source: outbox   │
│  🗄 DB size       ● 0.4 GB / 2.0 GB guard (CHAT_DB_SIZE_GUARD)         source: chat     │
│  💾 backup        ● last 06:00 (7h ago) · 30 dailies · 12 monthlies   source: chat     │
│  ── MC resolve seam ──────────────────────────────────────────────────────────────── │
│  🔗 resolve feed  ▲ awaiting mc:read grant → deep-links on documented fallback         │  ← honest PENDING, contract §3
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components used:**
- Every row = a `Freshness` §4.9 figure with a **source stamp** and, where it is a live signal, a staleness bound. Healthy = `● / ⟳` neutral-to-`--ok` on *state*; a stalled/over-bound signal goes **amber `▲ STALE` with the safe reading spelled out** (`SSE stale → showing last-known` / `push gave_up N → check ntfy`), **never a fabricated green**. If the DB size crosses the guard, the row goes `▲` and Chat has itself posted a `needs_review` system notification (PLAN §9) — the strip links to it as a `ReviewChip` §4.10.
- Backup-age and gave_up-count are tabular figures (§3.8), never width-shifting.
- The **MC resolve-seam row** honestly renders the contract §3 pre-grant state (`awaiting mc:read` → 403 → documented fallback links) as an amber `▲`, not an error — "degraded, never wrong" (contract §3).

**States (§5.4):**
| State | Rendering |
|---|---|
| **Loaded** | rows, each fresh with source. |
| **Loading** | row skeletons. |
| **Empty** | not applicable (health always has figures). |
| **Pattern-R error** | a health *query* itself failed (rare) → single red ✕ row "cannot read <signal> status" — local. |
| **Pattern-D degraded** | a monitored dependency is down: **SSE stalled** → `▲ STALE` + Pattern-D band (as Feed 4.1); **push sink `gave_up`** → `▲ push sink not delivering — feed + UI remain the durable fallback` (PLAN §1.4 at-least-once-with-fallback); **backup stale past cadence** → `▲ last backup <age> — exceeds nightly cadence` in halt-gold (canonical-store DR honesty, ARCH §10). None of these is red — they are the safety/durability posture rendered honestly. |
| **Stop-engaged** | read-only `HaltBand` mirror in header; health figures unchanged. |

---

## 5. App-specific components (justified)

Chat introduces exactly **one** component. Everything else is a shared component in a Chat arrangement.

### 5.1 `KindBadge` — the priority-banded kind chip fronting a feed/detail row

**What it is:** the leading chip on every notification that fuses (a) the notification **kind** (`escalation ⚑ / needs_review ◈ / done ✔`) with (b) the **server-clamped priority band** (P1–P5, PLAN §3.2) into one glanceable, sortable front-marker, and drives the escalation-pin ordering.

**Why it cannot be a bare shared component (the justification):**
- Its `needs_review` and `escalation` members **ARE `ReviewChip` §4.10** (StatePill + machine-reason + deep-link into `ReviewQueue`) and its `done` member **IS a `StatePill` §4.5 (`✔ DONE`)** — Chat **does not re-draw** any of those. `KindBadge` is a **composition/arrangement** that adds the one thing no shared component carries: the **priority band** (P1–P5), a *Chat-domain data field* (the clamped notification priority, PLAN §3.2) with no home in the suite grammar — priority is neither a lifecycle state, a trust tier, nor a fencing state.
- It is genuinely domain-unique in the way §8/§5 permits (a domain data widget), **not** a bespoke re-draw of a chip the system already owns — the safety-carrying half (review/escalation state) is delegated verbatim to `ReviewChip`; only the priority-band decoration and the escalation-pin ordering are Chat's.
- **Hard constraint (so it stays honest):** its escalation member uses the **`--attn` attention family, never halt-gold** (an escalation is needs-attention, not a safe-stop — DS §4.6 reserves gold). Priority is shown as **band + numeral + glyph**, never color-alone (§3.7 color-independence). It introduces no new interactive color: the deep-link inside it is the shared `ReviewChip` link.

*(No other app-specific component exists. The active-broadcast banner is a persistent StatePill-family notice, not new; the body/preview panes are the shared Workshop reading surface; the `notification_id` chip is the shared mono-identifier affordance.)*

---

## 6. The human-surface API (screens/states over the same one state)

Both surfaces sit on PLAN §3's HTTP API — the MCP tool (`post_notification`) and this UI are **siblings over one state**, neither downstream of the other. The UI is **read + operator-mutate only**; it holds **no** agent-post path (agents never get `chat:read`/`chat:manage`, PLAN §5).

| Screen / affordance | Endpoint(s) | Scope | Notes |
|---|---|---|---|
| Feed list + history | `GET /api/notifications` (keyset on `seq`; filters kind/min_priority/agent/ticket/acked/since/limit) | `chat:read` | powers list, filters, "load older". |
| Feed live tip | `GET /api/feed` (SSE) | `chat:read` | `LiveStream` §5.5; `Last-Event-ID`=`notification_id`; `event: reset`→REST re-sync. |
| Notification detail | `GET /api/notifications/{id}` | `chat:read` | envelope + server-derived `deep_link` (§6/PLAN §6). |
| Ack (row) | `POST /api/notifications/{id}/ack` | `chat:manage` | idempotent; Chat-owned "operator saw it"; audit row. |
| Batch ack | `POST /api/notifications/ack {up_to_seq, kind?}` | `chat:manage` | light-confirm bulk; benign. |
| Active-broadcast banner + history | `GET /api/broadcasts` (`?active=true` for banner) | `chat:read` | MC-consumable later (seam, PLAN §16). |
| Post broadcast | `POST /api/broadcasts` | `chat:manage` | light-confirm; audit row. |
| Revoke broadcast | `POST /api/broadcasts/{id}/revoke` | `chat:manage` | `DangerAction` light tier (toward-less); audit row. |
| Health strip | `GET /healthz` + read-derived (outbox status, DB size, backup age) | edge-internal / `chat:read` | `Freshness` figures. |
| MC resolve mirror (reserved) | subscribes `GET https://mc.<SUITE_DOMAIN>/api/events/resolve` | `mc:read` (svc:chat) | **PENDING grant** (contract §3); until then 403 → fallback deep-links; feeds the reserved `resolved_*` columns (PLAN §2, seam #24). Read-only into Chat; **never authoritative for a gate** (§5.5). |

**Two-view invariant:** every figure the UI shows is the **same state** the append-only envelope tables hold; the UI has **no DELETE and no gate-clearing path anywhere** (PLAN §3) — it cannot mutate ticket/review/kill state, only Chat's own ack/broadcast records. "Clear this review" is structurally absent and, where an operator might look for it, rendered as the destructive-absence deep-link-out to MC (§4.7 / §4.10 "apps surface it; only MC/Board clear it").

---

## 7. Consistency notes — what Chat consumes, from where

| Shared entity Chat renders | Component (ID) | Source | Chat's specific note |
|---|---|---|---|
| ticket / work-item ref | `TicketRef` §4.1 | DS | opaque `ticket_id`, verbatim, copy-on-click; deep-links to `/review/<ticket_id>`. |
| agent/operator/service identity | `PrincipalRef` §4.2 | DS | `agent_id` = server-stamped `sub` (never caller-supplied); ⬡/◐/⚙ kind-glyphed. |
| fencing token | `FenceState` §4.4 | DS | **greyed + `advisory` micro-tag** — Chat pings outside the reject-set (PLAN §15.4); display-only, never a gate. |
| lifecycle state (`done`, broadcast active/expired/revoked) | `StatePill` §4.5 | DS | plain pills; `done` = `✔ DONE`. |
| needs_review / escalation | `ReviewChip` §4.10 | DS | StatePill + machine-reason + **deep-link into `ReviewQueue`**; Chat **surfaces, never clears**. |
| kill / quiesce posture | `HaltBand` §4.6 | DS | **read-only mirror only** — Chat is out of the kill chain (`killswitch-chain.md`); no actuator; band's review-link deep-links to MC/auth. |
| destructive / absent affordance | `DangerAction` + absence rule §4.7 | DS | revoke = light tier (toward-less); "broadcast can't stop the fleet" = printed 🔒 absence fact, never a greyed button. |
| freshness / staleness | `Freshness` §4.9 | DS | health strip + feed/SSE liveness; **false-green prohibition binds** — a stalled feed goes amber `▲ STALE`, never frozen-green. |
| the review/approval queue | `ReviewQueue` §7.1 | **MC owns** | Chat is **the doorbell** — deep-links `/review/<ticket_id>` (contract §2) + subscribes the resolve feed (contract §3); **does NOT host or fork a queue.** |
| audit / provenance | `AuditInspector` §7.2 | shared family | per-notification append-only trail; **no chain-verify** (Standard class, not hash-chained); read-only. |
| real-time transport | `LiveStream` §5.5 | DS | `Last-Event-ID` replay, `event: reset` re-sync, terminate on `auth:revocations`. |
| shell / table / form / modal / toast | `AppShell` §6.1, `DataTable` §6.2, `Field` §6.3, `Modal` §6.4, `Toast` §6.5 | DS | standard consumption; Toast never gold, never for safety state. |
| confirm friction | `ConfirmFriction` §5.1 | DS | only light-tier variants appear (ack, broadcast, revoke) — Chat has **no toward-more/irreversible action**; no typed-intent/step-up anywhere. |

**Cross-app pattern discipline (the load-bearing consistency claims):**
1. **Chat hosts no `ReviewQueue`.** It renders `ReviewChip`s and deep-links to MC's canonical queue (§7.1). MC owns the door; Chat is the doorbell.
2. **Chat is not in the kill chain.** It renders `HaltBand` **read-only** with **no actuator** (§5.3 non-kill-chain rule); the only stop-trigger it exposes is a deep-link to MC/auth.
3. **Chat clears no gate.** No "clear review" / "approve" / "delete" control exists on any screen — those are MC/Board authority (§4.10). The absence is rendered as a deep-link-out, per the destructive-absence rule.
4. **Chat's stop grammar is never borrowed for a broadcast.** A broadcast is a soft advisory in the `--signal`/`--attn` family; **gold is reserved for §4.6** and never appears on a broadcast, an escalation, or a priority band.
5. **Chat never shows a false green.** Its own liveness (SSE, push, backup) obeys the §4.9 false-green prohibition — a dependency outage is Pattern-D gold, never a red error and never a frozen-green tile.
