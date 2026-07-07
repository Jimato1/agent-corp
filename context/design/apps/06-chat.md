# Helm · Claude Design injection block — Chat (notifications + operator broadcast)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Chat (notifications + operator broadcast)

**Purpose (one line):** The operator's live agent→operator notification/escalation feed plus a soft operator→fleet broadcast — the suite's *doorbell*, not its door.
**Who uses it:** Operator-facing UI (this whole block). The agent surface is a single write-only MCP tool (`post_notification`) with **no UI** — agents never get `chat:read`/`chat:manage`. Everything below is the human surface.
**Archetype:** **Both** — an Instrument-dark shell (feed list, broadcast form, health readout) wrapping a **Workshop reading pane** for the one place long-form agent markdown appears (notification body, feed body-preview, broadcast preview).

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side-rail (224px open / 56px collapsed) + global header + suite switcher; header shows `SYSTEM STATE` center zone and, right slot, the **read-only HaltBand mirror**. Suite switcher shows current posture *once*. Chat's rail items: Feed / Broadcast / Health.
- **HaltBand** — full-width GOLD `--halt-500 #F2842B` safe-stop band under the header, `--halt-tint #2E1D0B` wash, `--halt-ink #FFD8A8` text, interlock ▮▮ / shield ⛊ glyph (never ✕). **Read-only in Chat** — Chat is NOT in the kill chain, shows the band with **no actuator**; its `[ Review halt → ]` deep-links to MC/auth. Never red.
- **StatePill** — one glyph+label pill per lifecycle state, never color-only (`✔ CONFIRMED`/`✔ DONE` green `--ok #46B98A`, `● active`, `◼ expired`, `⛒ revoked`).
- **ReviewChip** — StatePill + verbatim machine-reason (`--ink-600 #94A1AE`) + **deep-link into MC's canonical ReviewQueue** at `mc.<SUITE_DOMAIN>/review/<ticket_id>`. Chat *surfaces* review/escalation, **never clears** it.
- **PrincipalRef** — mono `sub`, kind-glyphed: ⬡ agent / ◐ operator / ⚙ service. Copy-on-click. `agent_id` = server-stamped, never caller-supplied.
- **TicketRef** — opaque mono `ticket_id` chip on `--sub-750 #1E242E`, copy-on-click, middle-truncate.
- **FenceState** — 🔒 gen+lease+heartbeat. **In Chat it is ADVISORY-ONLY: rendered greyed with an `advisory` micro-tag** — display-of-truth, never a gate (Chat pings outside the fencing reject-set).
- **Freshness** — ⟳ age + source stamp; a stalled/over-bound signal goes amber `▲ STALE` with the safe reading spelled out. **False-green prohibition binds hard here** — never a frozen-green tile.
- **DangerAction + ConfirmFriction** — destructive = red `--danger-500 #E5594E` behind typed-intent + step-up. Chat uses **only the light tier** (§5.1 rule 4, *toward-less-action*): single confirm, signal-cyan `--signal-500 #29B6D8`, no typed intent, no step-up. Applies to ack, batch-ack, broadcast-post, broadcast-revoke.
- **LiveStream** — SSE with `Last-Event-ID` replay, `event: reset`→REST re-sync, terminate on `auth:revocations`→"session ended — re-authenticate."
- **DataTable** — dense zebra `--sub-750`, mono ID column, sticky sortable header (broadcast history).
- **AuditInspector** — append-only per-notification trail. **Chat's variant has NO chain-verify affordance** (Standard class, not hash-chained). Read-only.
- **Field / Toast / Modal** — standard. Toast matches the action verb, `--ok`/`--danger`, **never gold**.
- Cross-app pattern reused by pointer only: **ReviewQueue** (MC owns — Chat deep-links in, hosts none).

**⌘ Screens & views to build:**

**1. Feed — the live notification stream** (Instrument list, Workshop body-preview per row)
Layout: header (app name + `SYSTEM STATE` + feed-fresh Freshness chip + operator PrincipalRef + `🔑 fresh`) → read-only HaltBand mirror renders full-width *only* when posture > G0 → filter bar (`[/ filter]`, `[ Ack all seen ▸ ]`, chips: kind / min-priority 1–5 / agent / ticket / ☐ unacked) → the row stack → footer (`showing 90d · N unacked · N total`, `[ load older → ]`).
Each row: **KindBadge** front-chip (app-specific, below) · **PrincipalRef** author · verbatim machine-reason or `—` · **TicketRef** if present · one-line body preview (Workshop measure) · inline `◈ → mc/review/<ticket_id>` deep-link **always captioned "(target wins)"** · tabular age + `·×N` repeat-count · greyed `🔒 gen N · advisory` FenceState if supplied · `[Ack]` (light) + `[→]` deep-link.
```
┌─ header: Chat  ● nominal   ⟳ feed fresh 0.4s · ◐ operator:ada  🔑 fresh ┐
├─ HaltBand mirror renders here full-width ONLY when posture > G0 (read-only) ┤
│ FEED                              [/ filter]  [ Ack all seen ▸ ]           │
│ ▸kind[esc][review][done] ▸≥prio[1..5] ▸agent ▸ticket ▸☐unacked            │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │⚑ P5 ESCALATION ⬡agent:patcher-07 ·board_escalation  2m ·×3 [Ack][→]│ │ ← PINNED, --attn family (NOT gold)
│ │  NAS reboot hung — host unreachable, cannot verify patch              │ │
│ │  ◈ → mc/review/T-000123  (target wins)   🔒 gen46 · advisory          │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │◈ P4 NEEDS_REVIEW ⬡agent:writer-03 [T-000210] 14m [Ack][→]           │ │
│ │  Research note ready: safe-patch practice for Wazuh fleet             │ │
│ │  ◈ → mc/review/T-000210  (target wins)                                │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │✔ P2 DONE  ⚙svc:tier-approver [T-000198] 1h [Ack][→]                 │ │
│ │  Canary batch patched · Wazuh confirmed active→solved                 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ showing 90d · 3 unacked · 41 total          [ load older → ]              │
```
- **Escalation pinning:** un-acked `escalation` rows pin to top in the **`--attn` attention family `#E8B84B`** (needs-attention, *not* halt-gold — gold is reserved for HaltBand). `·×N` ticks as the agent re-notifies. Ack un-pins + greys the row.
- **Batch ack** `[ Ack all seen ▸ ]` = single **light** signal-cyan confirm (benign, moves toward *less* noise) — never typed-intent.
- Filters are Field chips, `/`-focusable, URL-reflected (shareable).
- States: **Loaded** (live SSE tip, feed-fresh chip green). **Loading** = static row skeletons matching the table; header chip reads `⟳ connecting` — never a spinner. **Empty** = invitation: "No notifications in this window. Agents post escalations, review-ready work, and completions here — this feed fills as the fleet works. Widen the window or clear filters." (if a filter is the cause, name *which* filter + `[ clear filters ]`). **Pattern-R (red `#E5594E`)** = local recoverable, inline ✕ on the affected control only (ack 409/429, filter 400) — never colors the screen. **Pattern-D (gold `#F2842B`)** = dependency down, HaltBand SAFE-STOPPED ⛊, two cases: **(a)** SSE stalled past bound → rows held but stamped `▲ STALE — showing last-known as of <age>` + Pattern-D band "stream unconfirmed; escalations may not be arriving live — check the Board for the durable record"; **(b)** MC deep-link target unreachable → links still render (template-derived, always valid) with a gold `⛊ MC unreachable — link may 'not-in-queue' until MC returns` micro-note, **never** a red error. **Stop-engaged** = read-only HaltBand mirror appears full-width; **feed keeps flowing** (benign reads continue by design), no content change.

**2. Notification detail — deep-link landing + full envelope** (Workshop reading pane inside Instrument shell)
Layout: `← Feed` back · KindBadge + PrincipalRef + machine-reason header · `notification_id` mono copy-chip + posted timestamp + `×N (last …)` + TicketRef · a **target-wins caption block** (`ⓘ This is a snapshot from when it was posted. The live target is authoritative — open it: ◈ → mc/review/… [ Open in MC → ]`) · the **body on the Workshop `--paper-100 #F5F3ED` reading surface, Source Serif 4 at `--fs-read` 17/28, operator-zoomable** · `── envelope ──` metadata row (kind/priority/tags/source + greyed `🔒 gen N · advisory` FenceState) · `── audit ──` AuditInspector.
- **Body sanitization is a visible fact:** allowlist markdown only; raw HTML + remote images stripped and **rendered as dead text**; **body links render as dead (non-clickable) text** — the *only* live link on the screen is the template-derived MC deep-link (anti-phishing).
- `notification_id` uses the shared mono-identifier + copy affordance (a Chat-minted id — NOT a TicketRef, since it's not a work-item).
- AuditInspector rows: mono timestamp · PrincipalRef actor · action verb · outcome StatePill (posted / repeat-collapses / push delivered|gave_up / acked-by-whom). No chain-verify.
- States: **Loaded** full envelope. **Loading** = header chips + paper-pane body skeleton + audit-row skeletons. **Empty** = N/A by construction; a **stale/bad `notification_id`** renders Pattern-R "This notification is no longer in the retained window ([ back to feed ]) — the underlying condition, if still live, will have re-fired as a new row" (never a bare 404). **Pattern-R** = ack from this page failed (409/429), inline ✕ on the ack control. **Pattern-D** = deep-link target's system (MC/Board/Notes) unreachable → link stays rendered with gold `⛊ target unreachable — showing this snapshot; open when it returns`; target-wins caption **reinforced, never contradicted** (the snapshot body is still true as posted). **Stop-engaged** = read-only HaltBand mirror in header, content unchanged.

**3. Broadcast — operator→fleet composer + active banner + history** (Instrument; Workshop preview)
Layout: an **ACTIVE BROADCAST banner** (renders only when one is live) → `── compose ──` (the non-authority fact line, then Field composer + Workshop preview + `[ Post broadcast ]`) → `── history ──` DataTable.
```
┌─ BROADCAST ───────────────────────────────────────────────────────────┐
│ ┌ ACTIVE BROADCAST (only when live) ─────────────────────────────────┐ │
│ │📣 P3 · "Maintenance window opens 22:00 UTC — pause non-urgent claims"│ │ ← --signal/--attn family, NOT gold
│ │   by ◐operator:ada · posted 2h · expires in 21h      [ Revoke ▸ ]   │ │ ← DangerAction, LIGHT tier
│ └────────────────────────────────────────────────────────────────────┘ │
│ ── compose ──                                                           │
│ 🔒 A broadcast is an advisory the fleet MAY read. It does NOT stop,     │ ← destructive-ABSENCE fact (lock glyph)
│    gate, or command any agent. To halt the fleet, use MC/auth → .       │
│ Body [ markdown, ≤2000 … ]      Priority [3▾]   Expires [24h▾]          │
│ ╔ preview (Workshop --paper pane — what a fleet reader would see) ════╗ │
│ ║ Maintenance window opens 22:00 UTC — pause non-urgent claims         ║ │
│ ╚═════════════════════════════════════════════════════════════════════╝ │
│                                                     [ Post broadcast ]   │
│ ── history ── DataTable: [B-…]·body·PrincipalRef·posted·expires·revoke   │
```
- **Active banner** = persistent `--signal`/`--attn`-family band (StatePill-family notice), **deliberately NOT HaltBand and NOT gold** — a broadcast is not a safe-stop and must never borrow the safe-stop grammar. Shows author PrincipalRef + tabular expiry countdown.
- **Non-authority statement** = destructive-absence rule: an **affirmative printed fact with lock glyph 🔒 and no interactive affordance** — *not* a greyed-out "stop the fleet" button (a disabled control implies a latent capability). The ⛔ glyph is never used here.
- **Post** = light confirm (advisory, no world effect), Toast "Broadcast posted." **Revoke** = DangerAction at **light** tier (withdraws → toward-less), single signal-cyan confirm, writes an audit row.
- History DataTable: mono `broadcast_id` copy · body preview · PrincipalRef · posted/expires tabular · StatePill (`● active`/`◼ expired`/`⛒ revoked`) · revoke on active rows.
- States: **Loaded** composer + (banner iff live) + history. **Loading** = skeleton composer + history-row skeletons. **Empty** = banner region collapsed with invitation "No active broadcast. A broadcast is a soft advisory the fleet may read — it does not stop or command agents. Compose one below."; history empty → "No broadcasts yet." **Pattern-R** = post/revoke failed (400 inline Field triangle-bang; 429 red ✕ retry-after; 409 red ✕ "already revoked, refreshing"). **Pattern-D** = Chat's own store unreachable → composer submit disables + Pattern-D gold band "broadcast composing is paused — Chat's store is unreachable; existing broadcasts still display." **Stop-engaged** = read-only HaltBand mirror; **broadcasting remains available** (not a kill-chain action; operator may want to advise the fleet *about* the halt) — the destructive-absence statement stays so a broadcast is never mistaken for the stop.

**4. Health strip — the doorbell's own liveness** (pure Instrument)
Layout: one Freshness row per signal, each with a **source stamp**: SSE feed (`● connected · fresh 0.4s · Last-Event-ID` + source) · push sink (`● ntfy delivering · last ok 12s · gave_up 0`) · DB size (`● 0.4 GB / 2.0 GB guard`) · backup (`● last 06:00 (7h ago) · 30 dailies · 12 monthlies`) · `── MC resolve seam ──` resolve-feed row.
```
┌─ HEALTH ──────────────────────────────────────────────────────────────┐
│ ⟳ SSE feed   ● connected · fresh 0.4s · Last-Event-ID N-01J8… source:chat│
│ 📤 push sink  ● ntfy delivering · last ok 12s · gave_up 0    source:outbox│
│ 🗄 DB size    ● 0.4 GB / 2.0 GB guard (CHAT_DB_SIZE_GUARD)   source:chat  │
│ 💾 backup     ● last 06:00 (7h ago) · 30 dailies · 12 monthlies source:chat│
│ ── MC resolve seam ──                                                    │
│ 🔗 resolve feed ▲ awaiting mc:read grant → deep-links on fallback        │ ← honest PENDING, amber ▲
```
- **False-green prohibition binds hardest here** (a doorbell that lies about whether it can ring is the worst failure). Healthy = neutral `●`/`⟳`. A stalled/over-bound signal goes **amber `▲ STALE`** with the safe reading spelled out (`SSE stale → showing last-known` / `push gave_up N → check ntfy`) — **never a fabricated green**. Backup stale past cadence → `▲` in **halt-gold** (canonical-store DR honesty). DB size over guard → `▲` + Chat has posted itself a `needs_review` system notification, linked as a ReviewChip.
- States: **Loaded** rows fresh with source. **Loading** = row skeletons. **Empty** = N/A. **Pattern-R** = a health *query* itself failed (rare) → single red ✕ row "cannot read <signal> status." **Pattern-D** = a monitored dependency down (SSE `▲ STALE` + Pattern-D band; push `gave_up` → `▲ push sink not delivering — feed + UI remain the durable fallback`; backup stale → halt-gold `▲`) — none red. **Stop-engaged** = read-only HaltBand mirror; figures unchanged.

**◈ App-specific components (only where justified):**
- **`KindBadge`** — the one genuinely Chat-unique widget: the leading front-chip on every feed/detail row that fuses (a) notification **kind** (`escalation ⚑ / needs_review ◈ / done ✔`) with (b) the **server-clamped priority band P1–P5** into one glanceable, sortable marker, and drives escalation-pin ordering. **Why not a shared component:** its `needs_review`/`escalation` members ARE a **ReviewChip** (delegated verbatim — StatePill + machine-reason + MC deep-link) and its `done` member IS a plain **StatePill** (`✔ DONE`); KindBadge re-draws *none* of those. It is a composition that adds the one thing no shared component carries — the **priority band**, a Chat-domain data field (neither a lifecycle state, a trust tier, nor a fencing state). **Hard honesty constraints:** the escalation member uses the **`--attn` attention family `#E8B84B`, never halt-gold** (an escalation is needs-attention, not a safe-stop); priority is shown as **band + numeral + glyph**, never color-alone; it introduces no new interactive color (the deep-link inside it is the shared ReviewChip link).

**⚠ Safety / danger surfaces specific to this app:**
- **Chat is the doorbell, MC is the door** — it renders ReviewChip and **deep-links** to MC's canonical ReviewQueue; it **hosts no queue, clears no gate, actuates no stop**. No "clear review"/"approve"/"delete" control exists on any screen — the absence is rendered as a deep-link-out (destructive-absence rule).
- **Chat is not in the kill chain** — HaltBand renders **read-only with no actuator**; the only stop-trigger it exposes is a deep-link to MC/auth. `Shift+Esc` focuses the header halt affordance which **deep-links** rather than actuating (with the documented non-browser-captured fallback chord).
- **"Target wins" is printed on every deep link** — a notification is a deliberately-stale snapshot; when the snapshot and the live target disagree, the target is authoritative, and Pattern-D never contradicts that caption.
- **Gold is reserved for HaltBand only** — never appears on an escalation, a priority band, an active broadcast, or a Toast. Escalations/broadcasts live in the `--signal`/`--attn` families.
- **FenceState is advisory-only** (greyed + `advisory` micro-tag) — display-of-truth, never a gate.
- **Body sanitization** — remote images/raw HTML stripped to dead text, body links non-clickable; the only live link is the template-derived MC deep-link (anti-phishing).
- **All confirms are light-tier** — Chat has no toward-more/irreversible action anywhere; no typed-intent or step-up ceremony exists in this app.
- **Honest-degraded triad** — SSE stall, push `gave_up`, stale backup all render Pattern-D gold or amber `▲ STALE`, never a red error and never a frozen-green tile.

**⚑ Gaps flagged:** None new — the spec is complete for design. One inherited PENDING to render honestly (already specified, not a gap): the **MC resolve-seam `mc:read` grant is pre-freeze** (contract §3) — until granted, the resolve-feed health row shows amber `▲ awaiting mc:read grant` and deep-links fall back to MC home with a "review queue" caption; the row still renders, degraded never wrong.
