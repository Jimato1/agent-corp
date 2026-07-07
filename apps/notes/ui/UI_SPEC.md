# UI_SPEC.md — Notes (`notes`), Stage 3 — UI/UX

> **Scope.** The human surface of Notes: the operator's WYSIWYG-markdown editor, the corpus browser + search, the wikilink/backlink graph, the deliberation-thread reader, a review-attention view, and a provenance/history inspector. This spec is **design specification only** (screens in words + ASCII wireframes; every screen enumerates every state). It is self-contained enough to hand to Claude Design.
>
> **Grounding (read in this order):** `context/DESIGN_SYSTEM.md` (FROZEN — binds every rendering here), `context/DESIGN_SYSTEM_COMPONENTS.md` (component IDs), `apps/notes/planning/PLAN.md` (esp. §2 store, §2.2 taint model, §6 MCP surface, §7 deliberation thread, §9 core API/§9.1 REST, §15.3 UI), and the FROZEN `context/CONTRACTS/mc-chat-review-resolve.md` (the review deep-link scheme this app consumes).

---

## 1. Archetype declaration + governing principle

**Archetype: BOTH.** Notes is a **Workshop content pane inside an Instrument shell** (DESIGN_SYSTEM §2). The app *shell* — side rail, global header, `SYSTEM STATE` zone, read-only kill band, tables of corpus/system state — stays **Instrument-dark** (`--sub-*`). The *content column* where a note is read or written is the suite's canonical **Workshop reading surface**: `--paper-*` background + **Source Serif 4** body at `--fs-read`, operator-zoomable 15–20px, with a dark-reading alternate (`--sub-850` body) per §2. The safety grammar (§4) and shell (§6.1) render **identically to every other app** — a `TicketRef`, an identity chip, a taint badge, a fencing state, a kill band, a needs-review chip look the same in Notes as in the Gateway.

| Screen | Archetype |
|---|---|
| S1 Corpus Browser & Search | Instrument |
| S2 Note Editor | Instrument shell → **Workshop** content pane |
| S3 Deliberation Thread View | Instrument shell → **Workshop** content pane (specialized render) |
| S4 Link Graph & Backlinks | Instrument (graph canvas + `DataTable` list) |
| S5 Review-Attention View | Instrument |
| S6 Provenance & History Inspector | Instrument (`AuditInspector` §7.2) |

**Governing principle — two views, one state.** The editor and the MCP `read/write/search/link` tools are **siblings over one markdown corpus + one FTS index** (PLAN §9, §1). Nothing the UI shows is downstream of the MCP surface or vice-versa; both consume the same core REST API (§5 below). Notes holds **no ticket-lifecycle, approval, or kill authority** (PLAN §1, §13): it is the *readable record*. Every place the operator might expect to "act on the fleet," Notes instead **renders the truth read-only and deep-links out** to the authoritative owner (Board/MC). **Taint is display-of-truth, never editable** (DESIGN_SYSTEM §4.3; PLAN §2.2c).

---

## 2. Design-language note

**This spec consumes `context/DESIGN_SYSTEM.md`; it specifies deltas only.** It does not restate tokens, motion, or the visuals of any §4/§5/§6/§7 component. Every shared entity is cited by ID and rendered by the shared component verbatim. The only new visuals introduced are the three genuinely domain-unique widgets in §4 (the Milkdown editor pane, the wikilink graph, the deliberation-thread render) — each justified there. The metadata rail (§3, S2) is a **layout composition of shared components**, explicitly *not* a new visual entity.

---

## 3. Screens & flows

Global chrome for every screen (cited, not re-specified): **`AppShell` §6.1** (224/56px side rail, global header with the logged-in `PrincipalRef` §4.2 + session-freshness stamp, suite switcher carrying the once-shown suite posture), the read-only **`HaltBand` §4.6** directly under the header whenever suite posture > G0 or a Pattern-D dependency is engaged, and the **`LiveStream` §5.5** client contract on every live surface (`GET /api/events`, PLAN §9.1). Notes is **not** in the kill chain and hosts **no** halt actuator (DESIGN_SYSTEM §5.3: "notes … render the read-only `HaltBand` and, if they surface the trigger at all, deep-link to MC/auth"). `Shift+Esc` still focuses the header halt mirror / deep-links to MC per §5.3.

Side-rail nav (glyph + label): **Corpus** (S1) · **Graph** (S4) · **Review** (S5) · **History** (S6). The editor (S2) and thread view (S3) open from a row/link, not a top-level rail item.

### S1 — Corpus Browser & Search  *(Instrument)*

The home surface: the searchable, filterable list of the whole corpus. `search_notes` and this screen are the **same query over the same FTS index** (PLAN §6, §9.1 `GET /api/search`). `/` focuses the search field (§5.6).

```
┌─ AppShell header: notes · "external memory & work product"   ◐ operator:ada · 🔑 fresh ─┐
│  [ read-only HaltBand §4.6 renders here iff suite posture > G0 / Pattern-D ]            │
├──────────┬──────────────────────────────────────────────────────────────────────────────┤
│ Corpus ◀ │  ⌕ [ search corpus…  /            ]   type:[all▾] tag:[▾] ticket:[▾]  ⟳ 0.4s │
│ Graph    │ ──────────────────────────────────────────────────────────────────────────── │
│ Review   │  DataTable §6.2 — one row per note (mono id col, copy)                        │
│ History  │  ● TITLE                        type      taint        ticket        updated  │
│          │  ─────────────────────────────────────────────────────────────────────────── │
│          │  Canary batch findings          research   ◑ single    [T-000123]   2m ago    │
│          │  Fleet patch plan — slice 3     plan       ⚠ UNTRUSTED [T-000450]   14m ago   │
│          │  NAS reboot huddle              deliberation ✔ clean·  [T-000450]   1h ago     │
│          │    ↳ snippet: "…canary must share the package set…"  ◑ single-source          │
│          │  …                                                                            │
└──────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Rows use `DataTable` §6.2** (dense zebra, mono `note_id` column with copy, sticky sortable header, roving tabindex, card-reflow < 640px). The `ticket` cell is a **`TicketRef` §4.1** (deep-links to `mc/review/<ticket_id>`). The `taint` cell is a **`TierBadge` §4.3** rendering the note's **effective** taint (own ∨ transitive over links, PLAN §2.2c) — `own` shown on hover; host-originated/external ⇒ the `UNTRUSTED` striped-amber badge, surfaced as a machine-readable fact, never buried.
- **Search snippets carry taint at the point of retrieval.** A result row's `snippet` (≤64 tokens, bm25-ranked; bodies never returned in a list — PLAN §6) shows its own **`TierBadge`** inline, because a snippet is retrieved content entering context and its taint marker must travel with it (PLAN §6, ARCH §12). This is the human mirror of the `taint` field the `search_notes` tool returns.
- Filters map 1:1 to the tool params: `type` (enum), `tag`, `ticket_id`. **No status/ceremony-phase filter exists** — that state lives on the Board and Notes never offers a filter over a display copy (PLAN §6, §2.2b).
- The freshness stamp (`⟳ 0.4s`, `Freshness` §4.9) on the search bar reflects the SSE live tip; when the watcher stream stalls it degrades to `▲ STALE` honestly.

**States** (§5.4 honest defaults):
- **Loaded:** rows as above.
- **Loading:** static skeleton rows matching the table (never a spinner, §5.4).
- **Empty (no corpus yet):** invitation — *"No notes yet. Agents write findings here as external memory; you can start one too."* + a `[ New note ]` primary (`--signal`).
- **Empty (query returns nothing):** *"No notes match `<query>`. Clear filters or widen the search."* — states the one action, no shrug.
- **Pattern-R error §5.4:** a malformed FTS expression or a rejected filter → red ✕ inline under the search field, in the interface's voice (*"That search couldn't run — remove unsupported operators."*), non-apologetic. The corpus list below stays intact.
- **Pattern-D degraded §5.4:** the **index/watcher** is unavailable (SQLite/FTS down or reindex in flight) → the surface renders the **`HaltBand` SAFE-STOPPED variant (§4.6b)** with "what's still true" (*canonical markdown is intact on disk and in git; search is a rebuildable index that is regenerating; reads by id still work*). **This is not a red error** — a dependency outage of a rebuildable index is degraded-gold, never Pattern R.
- **Stop-engaged:** read-only `HaltBand` (ENGAGED, §4.6a) under the header; the browser stays fully readable (Notes reads + planning continue by design under a G1 freeze).

### S2 — Note Editor  *(Workshop content pane in the Instrument shell)*

The WYSIWYG-markdown editor. Left: the **`NoteEditor`** Workshop pane (§4 below). Right: the **metadata rail** — a *composition of shared components only*, never a bespoke redraw.

```
┌─ header (Instrument) ────────────────────────────────────────────────────────────────┐
│  ‹ Corpus   Canary batch findings              [ Save ]  ⟳ live 0.3s   view:[paper▾]   │
├──────────────────────────────────────────────┬────────────────────────────────────────┤
│  ░░ WORKSHOP paper column ░░ (--paper-100,    │  METADATA RAIL (Instrument --sub-*)     │
│     Source Serif 4, --fs-read, 62–72ch)       │  id      N-01J1QZ…  (mono, copy)        │
│                                               │  type    research                       │
│  ## Objective                                 │  ticket  [T-000123] ← TicketRef §4.1    │
│  Establish a safe canary order for the …      │  taint   ◑ single (own) → ⚠ UNTRUSTED  │
│                                               │          (effective)  ← TierBadge §4.3  │
│  ## What I did                                │          via: [[Wazuh alert dump]] ⚠    │
│  Pulled posture from Wazuh; clustered …       │  fence   🔒 gen 47 · lease 04:12 · ♥0.8s│
│    [[canary package overlap]]  ← wikilink     │          ← FenceState §4.4 (display)    │
│                                               │  authors ⬡ agent:recon-03  ◐ operator:ada│
│  ## Findings ▏(caret)                         │          ← PrincipalRef §4.2            │
│                                               │  ticket-status  needs_review · mirror  │
│  ## Open questions                            │     authority: Board → [T-000123]      │
│  ## Next step                                 │  ────────────────────────────────────  │
│                                               │  🔒 Taint is display-of-truth. It cannot│
│                                               │     be edited here (§4.3).             │
└──────────────────────────────────────────────┴────────────────────────────────────────┘
```

- **The paper column is the one place the "document" reads as paper** (§3.2). Body prose is Source Serif 4; the shell, rail, and every §4 chip stay Instrument-dark. `view:[paper▾]` toggles the operator's dark-reading alternate (`--sub-850` body, §2) — a reading affordance, never a "light Instrument."
- **Metadata rail = shared components only.** `id` mono/copy; `ticket` = **`TicketRef` §4.1**; `taint` = **`TierBadge` §4.3** showing **both** `own` and `effective` with the `tainted_via[]` linked-notes list (PLAN §2.2c, §9.1 `GET /api/notes/{id}/taint`) — each `via` entry is a wikilink chip carrying its own badge; `fence` = **`FenceState` §4.4** (display-only echo of the token on ticket-bound writes — PLAN §6 fencing rule; Notes *enforces* server-side, the rail *shows* it, incl. the `⚠ SUPERSEDED` zombie state if a lease was reaped); `authors` = **`PrincipalRef` §4.2** list (`authored_by`, the display join; per-edit authority is the git trailer — S6).
- **`ticket-status` and any `ceremony_phase` shown are decorative mirrors, rendered as such.** Per the display-only firewall (PLAN §2.2b) and the false-green rule (§4.9), they render **not** as an authoritative `StatePill` but as a muted line stamped `mirror · authority: Board` beside the deep-linking `TicketRef`. Notes never reads these fields back to decide anything and never presents them as ground truth.
- **The taint control's absence is a printed constitutional fact, not a disabled toggle** (destructive-absence rule §4.7): the rail prints *"Taint is display-of-truth; it cannot be edited here"* with a 🔒, and **no greyed control**. (Genuine mistag correction is an out-of-band, operator-only, step-up-audited endpoint — see §6 Conflicts; it is deliberately kept off this surface.)
- **Save = `update_note` / `PUT /api/notes/{id}`** carrying `expected_hash` (CAS, PLAN §9.2). This is the `notes:write` surface — the operator UI session, not an agent role (PLAN §8). Agents *append* (never overwrite); the human editor overwrites under CAS. Save success → **`Toast` §6.5** matching the verb ("Saved"). The editor **live-refreshes off the SSE channel** rather than trusting its buffer (PLAN §9.2).
- Template scaffolding: a new note of a given `type` opens with the fixed section headers pre-filled (PLAN §5) as an empty-state invitation to fill each section — constrained output without model schema-intelligence.

**States:**
- **Loaded:** as above.
- **Loading:** paper-column skeleton (heading + paragraph bars) + rail skeleton.
- **Empty (new note):** the template scaffold with each section header and a faint prompt of what belongs in it (Research: Objective / What I did / Findings / Open questions / Next step — PLAN §5); title field focused.
- **Pattern-R error — stale buffer (`PRECONDITION_HASH`, PLAN §9.2):** a red ✕ inline banner above the pane — *"This note changed since you opened it. Review the newer version, then re-apply your edit."* + `[ Show diff ]` + `[ Reload ]`. The operator's problem, recoverable, never gold.
- **Pattern-R error — hygiene reject (`HYGIENE_REJECT`, PLAN §11.4):** red ✕ — *"This looks like secret material (credential/private-key shape) and was not saved. Reference secrets by handle instead."* The matched content is **never echoed back** (PLAN §11.4) — the banner names the pattern class only.
- **Pattern-R error — taint downgrade blocked (`TAINT_DOWNGRADE`, PLAN §2.2c):** red ✕ — *"That edit would lower this note's provenance. Provenance is raise-only and cannot be reduced here."*
- **Pattern-D degraded — Board unreachable on a fenced write (`FENCE_UNVERIFIABLE`, PLAN §9.3):** the Save affordance for a **ticket-bound** note renders the **gold SAFE-STOPPED** treatment on the save control (not red): *"Can't confirm this claim's lease — the Board is unreachable, so ticket-bound writes fail closed to protect the record. Non-ticket notes still save."* Fail-closed is the safety system working (§5.4-D). A well-formed `TicketRef` still deep-links.
- **Session ended (`auth:revocations` / token `exp`, §5.5):** the live feed terminates and the editor enters the honest *"Session ended — re-authenticate to resume"* state (not a silent freeze); unsaved buffer preserved locally, re-applied under CAS after re-auth.
- **Stop-engaged:** read-only `HaltBand` under the header; editing continues (writing external memory is benign; Notes registers no destructive class — PLAN §8).

### S3 — Deliberation Thread View  *(Workshop content pane, specialized render)*

The `type: deliberation` note: **Notes renders the thread that the Board's ceremony produces** (PLAN §7). It is the *record*, never the state machine — the Board's `ceremony_events` log is the sole phase authority (PLAN §7, §2.2b). This is a specialized read/render mode of S2 over the same file and the same API.

```
┌─ header ─────────────────────────────────────────────────────────────────────────────┐
│  ‹ Corpus   NAS reboot huddle · deliberation      [T-000450]   phase: planning ·mirror│
│                                                   authority: Board → [T-000450]        │
├───────────────────────────────────────────────────────────────────────────────────────┤
│  ░░ paper column ░░  participants: ⬡ recon-03 · ⬡ sre-01 · ⬡ redteam-02  (PrincipalRef)│
│                                                                                         │
│  ▸ triage            (Scrum-Master turn · collapsed)                                    │
│  ▸ recon             grounded in → [[fleet posture]] ◑  [[Wazuh alert dump]] ⚠UNTRUSTED │
│  ▾ planning                                                                             │
│     ┌ Independent positions ─ drafted before cross-reading (anti-anchoring) ───────┐    │
│     │ ### SRE — @sre-01 · 2026-07-02T14:03Z    ⬡ sub=agent:sre-01                  │    │
│     │   Batch tier-3 first; canary = web-07 …                                       │    │
│     │ ### Security — @sec-04 · …               ⬡ sub=agent:sec-04                  │    │
│     └──────────────────────────────────────────────────────────────────────────────┘    │
│     Joint discussion …                                                                  │
│  ▾ adversarial_review   ⚑ REQUIRED — ≥1 premise-attack cited to a recon note           │
│     ### Adversarial — @redteam-02 · …    ⬡ sub=agent:redteam-02                        │
│       Premise "canary shares package set" unproven → re: [[canary package overlap]]     │
│  ▸ backlog   → child execution tickets [T-000451] [T-000452]  (TicketRef)               │
│  ▸ execute   → run evidence refs …                                                      │
│  ▸ retro                                                                                 │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Seven fixed phase sections**, spec vocabulary 1:1 (`triage → recon → planning → adversarial_review → backlog → execute → retro`, PLAN §7.1/§7.2) — collapsible; the current mirrored phase auto-expands (decorative highlight only, `authority: Board`).
- **Every turn header** renders the human line (`### <role> — @<display> · <ISO-8601 UTC>`) **and** the service-written machine attribution marker `⬡ sub=<sub> …` (PLAN §7.2) — the per-turn identity is a **`PrincipalRef` §4.2** resolved from the token-derived marker, never a bare display name. Turns are append-only and never edit each other (visible as a flat, non-editable read in this view even though S2's editor backs it).
- **Ground truth is linked, not inlined** (PLAN §7.2): each `[[wikilink]]` to a recon note renders with the linked note's **`TierBadge` §4.3**, so an operator sees at a glance that the huddle rests on `⚠ UNTRUSTED` host-originated input — the transitive taint (PLAN §2.2c) is *why* this planning note's effective taint is raised, shown in S2's rail.
- **`adversarial_review` is flagged REQUIRED** (PLAN §7.2, D-1): the section carries a `⚑` marker and, if the huddle lacks a premise-attack cited to a recon note, an honest *"no dissent recorded — huddle may be invalid"* note (display of the invariant; Notes does not enforce it — the Board watchdog does).
- **Convergence/escalation are Board events, not Notes controls** (PLAN §7.2): the `backlog`/`execute` sections *link out* to child execution `TicketRef`s and run evidence; there is **no "converge" or "escalate" button here** (destructive-absence §4.7 — a printed *"phase transitions happen on the Board"* fact, not a disabled control). Escalations already filed surface as a **`ReviewChip` §4.10** deep-linking to `mc/review/<ticket_id>` with the machine reason (`board_escalation`).
- **Draft-isolation (PLAN §7.3, gap-1.2-gated):** the file never lies to the operator — the human always sees every turn including `isolated` ones. If the *mechanical* variant is ratified, the elision is an agent-read-surface rule only; this UI renders isolated turns with a small `isolated` micro-tag so the operator understands the agent view differs, but shows them in full.

**States:** Loaded / Loading (section skeletons) / **Empty** (a fresh deliberation note = the seven empty phase headers, invitation: *"The huddle for `<ticket>` will be recorded here"*) / **Pattern-R** (same CAS/hygiene errors as S2) / **Pattern-D** (Board unreachable ⇒ ticket-bound turn writes fail-closed gold, per S2; the mirrored phase line shows `phase unavailable — Board unreachable`, honest-unknown, never a fabricated phase) / **Stop-engaged** read-only `HaltBand`.

### S4 — Link Graph & Backlinks  *(Instrument; graph canvas + list)*

The associative-memory browser: the wikilink/backlink structure as a **`LinkGraph`** (§4 below) with a synchronized **`DataTable` §6.2** backlink list.

```
┌─ header ─────────────────────────────────────────────────────────────────────────────┐
│  Graph · focus: N-01J1QZ… "Canary batch findings"        depth:[1▾]  [ open in editor ]│
├──────────────────────────────────┬────────────────────────────────────────────────────┤
│   LinkGraph canvas                │  Backlinks (DataTable §6.2)                         │
│        (fleet posture) ◑          │  ← FROM                     type     taint          │
│              │                    │  NAS reboot huddle          deliberation ⚠UNTRUSTED │
│      [Canary batch findings] ●    │  Fleet patch plan slice 3   plan        ◑ single    │
│         │            │            │  ────────────────────────────────────────────────  │
│  (canary overlap)◑  (Wazuh dump)⚠ │  Outbound → (canary overlap) ◑ · (Wazuh dump)⚠     │
└──────────────────────────────────┴────────────────────────────────────────────────────┘
```

- **Nodes carry taint** via **`TierBadge` §4.3** glyphs (the graph is a second place effective-taint propagation is *visible*: an `⚠ UNTRUSTED` neighbor is why a focus node's effective taint is raised). Node = note; edge = wikilink (directional). Unresolved links render as ghost nodes (`link.resolved=false`, PLAN §4.2). `isolated` links (§7.3) render dimmed with an `isolated` tag until released.
- **Backlink rows and outbound rows are `DataTable` §6.2**; each row is a note with its `TicketRef`/`TierBadge`, click → S2. This is the human mirror of the `list_backlinks` tool (PLAN §6, `GET /api/notes/{id}/backlinks`) — same edges, same index.
- Justification for a bespoke canvas is in §4 (a graph is domain-unique per DESIGN_SYSTEM §8); the **list half reuses `DataTable`, not a fork.**

**States:** Loaded / Loading (canvas skeleton + list skeleton) / **Empty** (*"This note has no links yet. Use `[[wikilinks]]` in the body to build associative memory"*) / **Pattern-R** (focus note id not found → red ✕ *"No note with that id"*) / **Pattern-D** (link index rebuilding ⇒ gold SAFE-STOPPED: *"link graph is a rebuildable index, regenerating; markdown links in the body are intact"*) / **Stop-engaged** read-only `HaltBand`.

### S5 — Review-Attention View  *(Instrument; consumes the canonical queue, never forks it)*

"Which of my artifacts are awaiting a human gate." Notes **does not own a queue** — MC owns the canonical `ReviewQueue` §7.1. This screen is a **filter over Notes' own corpus, decorated with live gate state read from MC**, that **deep-links out** to clear. **Notes never hosts a clear-review control** (DESIGN_SYSTEM §4.10; PLAN §1, §15.3).

```
┌─ header ─────────────────────────────────────────────────────────────────────────────┐
│  Review · notes attached to tickets in a human gate       source: mc · as-of 3s ⟳     │
├───────────────────────────────────────────────────────────────────────────────────────┤
│  DataTable §6.2                                                                         │
│  NOTE                        ticket        gate / state                    author       │
│  ─────────────────────────────────────────────────────────────────────────────────── │
│  Fleet patch plan slice 3    [T-000450]    ◈ NEEDS REVIEW → mc/review/T-000450  ⬡ sre-01│
│  Canary batch findings       [T-000123]    ⚑ ESCALATED · board_escalation → mc/review/… │
│  NAS reboot huddle           [T-000451]    ◐ AWAITING_APPROVAL → mc/review/T-000451     │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- Each gate cell is a **`ReviewChip` §4.10** — `StatePill` + machine reason (verbatim, e.g. `board_escalation`) + **deep-link to `mc/review/<ticket_id>`** (the FROZEN scheme, `mc-chat-review-resolve.md` §2). Clicking leaves Notes for MC's canonical item page; **there is no clear/approve/reject affordance in Notes.**
- **Gate state is read live, not stored.** The Notes UI derives it under the operator's own session from MC's canonical queue read (`GET /api/queue` + `/api/events/resolve`, `mc-chat-review-resolve.md` §3) — **advisory, at-least-once, MC-observed**: the surface reconciles by read-time derivation and **never treats the feed as authoritative for a gate** (§5.5, contract §3). The **`Freshness` §4.9** stamp (`source: mc · as-of 3s`) is mandatory; a stalled feed degrades to `▲ STALE`, never a false "all clear." (This cross-app read is flagged in §6 Conflicts.)
- **The absence of a clear-review control is a printed constitutional fact** (§4.7): a footer prints *"Reviews are cleared on the Board / Mission Control, never here"* with 🔒 — no greyed button.

**States:** Loaded / Loading (skeleton rows) / **Empty** (*"No notes are awaiting a human gate right now."* — a positive statement, not a shrug) / **Pattern-R** (operator lacks `mc:read` on this session → red ✕ *"Can't read the review queue — your session isn't scoped for Mission Control"* + deep-link to MC) / **Pattern-D** (MC unreachable → gold SAFE-STOPPED: *"Can't reach Mission Control; showing last-known gate state as-of `<age>` — treat as unverified"*, the false-green prohibition — never a fabricated "cleared", §4.9) / **Stop-engaged** read-only `HaltBand`.

### S6 — Provenance & History Inspector  *(Instrument; `AuditInspector` §7.2)*

The read-only truth of *where a note came from and who touched it*. This **consumes the shared `AuditInspector` component family (§7.2)** in both its modes; it does **not** invent an audit visual.

```
┌─ header ─────────────────────────────────────────────────────────────────────────────┐
│  History · Canary batch findings  N-01J1QZ…      [ audit ▾ | provenance ]  git ✔ 0.6s │
├───────────────────────────────────────────────────────────────────────────────────────┤
│  AuditInspector §7.2 — append-only rows (DataTable)                                     │
│  ts (mono)            who                    action        target            outcome    │
│  ───────────────────────────────────────────────────────────────────────────────────  │
│  2026-07-02T14:03Z    ⬡ agent:recon-03      append_note   §Findings          ✔          │
│  2026-07-02T14:00Z    ◐ operator:ada        update_note   whole note         ✔          │
│  2026-07-02T13:58Z    ⬡ agent:recon-03      create_note   N-01J1QZ…          ✔          │
│  ── chain: git trailers · commit_sha per row ·  [ verify against git log ]  ✔ verified  │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Audit mode** = the `audit` projection (PLAN §4.2), rebuilt from git-commit trailers: each row is `ts` (mono/tabular) · **`PrincipalRef`** (the `Sub:` trailer — the authoritative per-edit "who", PLAN §3.2) · action verb (`create/append/link/update_note`) · target (`Note-Id`/section) · outcome `StatePill`. The chain-verify affordance is the §7.2 rule: a stale or failed `git log` reconcile **never renders green** — it shows `⚠ CANNOT CONFIRM` in halt-gold, or `✕ CHAIN BROKEN` in danger-red for a detected divergence (PLAN §9 boot-time `git fetch` divergence check). **Denied/rejected calls are not here** — they live only in stdout logs (PLAN §4.2), stated plainly in a footer so the operator knows this view is state-changes-only.
- **Provenance mode** = the §7.2 lineage pivot: the note's `own` vs `effective` **`TierBadge`**, the `tainted_via[]` chain of linked notes that raised it (PLAN §2.2c, `GET /api/notes/{id}/taint`), and the structural floor (ticket-lineage inheritance). **Read-only always** — taint is display-of-truth (§4.3); no correction control here.

**States:** Loaded / Loading (row skeletons) / **Empty** (only for a note with a single genesis commit: *"One entry — this note was created and not yet edited"*) / **Pattern-R** (note id not found) / **Pattern-D — git remote/push-lag or index rebuild** (gold SAFE-STOPPED using the §4.9 chain rule: *"Can't verify the audit chain right now — treat as UNVERIFIED"*; also surfaces the boot-time `NOTES_GIT_REMOTE_URL` degraded-visible mode and `git_push_lag_seconds` as an honest health fact per PLAN §2.3, never green while lag > bound) / **Stop-engaged** read-only `HaltBand`.

---

## 4. App-specific components (justified)

Each is a genuinely domain-unique widget explicitly sanctioned by DESIGN_SYSTEM §8 ("a Milkdown editor, a wikilink graph, a PageGrid — is fine"). None re-draws a §4 entity; all render shared entities *inside* themselves via the shared components.

| Component | What it is | Why it cannot be a shared component |
|---|---|---|
| **`NoteEditor`** (Milkdown `@milkdown/crepe`) | The WYSIWYG-markdown Workshop content pane (S2/S3) that stores markdown **verbatim** — the canonical-store editing affordance. Renders on `--paper-*` + Source Serif 4 at `--fs-read` (§2/§3.2/§3.8). | A WYSIWYG-markdown authoring surface is a domain-unique content editor, not a re-draw of any §4/§5/§6 entity; the suite has exactly one canonical markdown corpus and this is its writing tool. Its chrome (save, view toggle) and every metadata chip reuse shared components. |
| **`LinkGraph`** | The wikilink/backlink graph canvas (S4): notes as nodes, wikilinks as directed edges, taint on nodes, unresolved/isolated edge styling. | A force/graph visualization of associative memory is domain-unique (§8 names "a wikilink graph" explicitly); no shared component renders a node-edge graph. Its *node badges* are `TierBadge`, its *list half* is `DataTable` — only the canvas is new. |
| **`DeliberationThreadView`** | The seven-phase ceremony render (S3): fixed phase sections, per-turn attribution markers, Independent-positions/Joint/Adversarial-review structure, linked ground-truth. | The huddle record's phase-sectioned, append-only, turn-attributed *document structure* is Notes-specific (the Board produces the ceremony; Notes renders its record). It is not the `ReviewQueue`, not the `AuditInspector`; it *contains* `PrincipalRef`/`TierBadge`/`TicketRef`/`ReviewChip` but its sectioned-thread layout is a domain render with no shared equivalent. |

> The **metadata rail** (S2) is deliberately **not** listed as an app-specific component: it is a layout composition of `TicketRef` + `TierBadge` + `FenceState` + `PrincipalRef` + `StatePill` only. Introducing a bespoke "note-meta chip" would be the exact consistency failure §8 forbids.

---

## 5. Human-surface API (screens/states over one shared state)

The UI is a sibling of the MCP surface over the **same core REST API** (PLAN §9.1) — two views, one state. Every read/write a screen performs maps to an endpoint the MCP adapter also calls; there is no UI-private store.

| Screen action | Endpoint (PLAN §9.1) | MCP sibling (PLAN §6) | Notes |
|---|---|---|---|
| S1 search / filter | `GET /api/search` | `search_notes` | same FTS index; response carries `taint` (effective) per row — the snippet `TierBadge` source |
| S1/S2 open note | `GET /api/notes/{id}` | `read_note` | returns body + canonical frontmatter + `content_hash` + `commit_sha` + `{own,effective}` taint |
| S2 create | `POST /api/notes` | `create_note` | template instantiation; fencing + `provenance` params when ticket-bound |
| S2/S3 append (agent path; UI shows read-only) | `POST /api/notes/{id}/append` | `append_note` | section-targeted; the human editor generally overwrites, agents append |
| S2 save (overwrite) | `PUT /api/notes/{id}` | `update_note` (`notes:write`) | `expected_hash` CAS mandatory → `PRECONDITION_HASH`; `TAINT_DOWNGRADE` guard; `HYGIENE_REJECT` scan |
| S4 links / backlinks | `POST /api/notes/{id}/links` · `GET /api/notes/{id}/backlinks` | `link_notes` · `list_backlinks` | fencing param when ticket-bound |
| S2/S6 taint read | `GET /api/notes/{id}/taint` | (taint travels on reads/search) | `{own, effective, tainted_via[]}` — the rail + provenance-mode source |
| every live screen | `GET /api/events` (SSE) | — (UI-facing) | `LiveStream` §5.5: `Last-Event-ID` replay, terminates at token `exp` and on `auth:revocations` |
| S6 audit rows | (git-trailer projection; read via the note/history read path) | — | rebuildable from `git log` trailers; chain-verify per §7.2 |
| S1/S6 health honesty | `GET /healthz` | — | index freshness, `git_push_lag_seconds`, remote reachability → feeds Pattern-D banners |

**Cross-app reads (not Notes-owned state):** S5's live gate decoration is read under the **operator's own browser session** from MC's canonical queue (`GET /api/queue` + `/api/events/resolve`, `mc-chat-review-resolve.md` §3) — browser-direct, advisory/MC-observed, never authoritative for a gate. `TicketRef` deep-links resolve on MC. **No approval, kill, or review-clear endpoint exists in Notes** (PLAN §8: no `propose`/`sod-critical`/`destructive-exec` classes) — those affordances are *absent by construction* and printed as constitutional facts (§4.7), never rendered as controls.

---

## 6. Consistency notes (what is consumed from where)

- **Shell / chrome:** `AppShell` §6.1, `DataTable` §6.2, `Field` §6.3, `Modal` §6.4, `Toast` §6.5 — verbatim.
- **Safety grammar (rendered identically to every app):** `TicketRef` §4.1 (ticket frontmatter + child tickets), `PrincipalRef` §4.2 (git-trailer `Sub:` / `authored_by` / per-turn markers), `TierBadge` §4.3 (own/effective taint on rails, rows, snippets, graph nodes; host-originated ⇒ `UNTRUSTED`), `FenceState` §4.4 (display echo of the fencing token, incl. `SUPERSEDED` zombie), `StatePill` §4.5, **`HaltBand` §4.6 read-only** (Notes hosts no actuator, §5.3), `DangerAction`/destructive-**absence** §4.7 (every "act on the fleet" affordance is an absent-by-construction printed fact), `ReviewChip` §4.10 (needs_review/escalation, deep-link out).
- **Interaction grammar:** `ConfirmFriction` §5.1 (only the out-of-band taint-downgrade correction, if ever surfaced — full variant + step-up + tamper-evident, kept off the note surface), §5.4 honest defaults on every screen (Pattern R ≠ Pattern D — an index/Board/remote outage is **gold degraded**, never red), `LiveStream` §5.5 (SSE, terminates on `auth:revocations`), keyboard model §5.6 (`/` search, `Shift+Esc` halt-focus).
- **Cross-app patterns:** `ReviewQueue` §7.1 — **consumed by deep-link** (`mc/review/<ticket_id>`) + read-time derivation, **never forked**; Notes hosts no clear-review control. `AuditInspector` §7.2 — **consumed** for S6 in both audit and provenance-lineage modes. `LiveAgentView` §7.3 — not surfaced (a `PrincipalRef` click deep-links to `mc/agents/<sub>` where a live view exists).
- **Two-view-one-state discipline:** every §5 endpoint is shared with the MCP surface; the UI introduces **no** private state, and taint/fencing/audit are **display-of-truth** the UI renders but never authors (§4.3, PLAN §2.2c).

**Conflicts / operator flags:**
1. **Taint-downgrade endpoint vs. §4.3 "taint is not editable in the UI."** PLAN §8 defines an operator-only, step-up-audited taint-**downgrade** endpoint (for genuine mistags); DESIGN_SYSTEM §4.3 states *no control anywhere lets an operator edit/clear taint.* Resolution taken here: the note surfaces (S2/S3/S4/S6) render taint **strictly read-only** and print the absence as a constitutional fact; the correction endpoint is kept **off the note UI**, reachable (if at all) only as an out-of-band `DangerAction` + full `ConfirmFriction` + step-up + tamper-evident audit, quarantined from the reading surface. **Operator call needed:** surface that rare correction path in an admin console, or keep it API-only. Defaulted to API-only to honor §4.3's absoluteness.
2. **S5 live gate state requires a cross-app read of MC's queue** (`GET /api/queue` / `/api/events/resolve`) under the operator session. PLAN §9.3 enumerates only the *service-principal* Board reads (`svc:notes`), not this *browser-session* MC read. Flag to confirm at the Board/MC seam that the operator session carries `mc:read`; until then S5 renders the Pattern-R "not scoped for MC" state and deep-links out — degraded, never wrong.
3. **Display-only mirrors** (`ticket_status_display`, `ceremony_phase_display`, PLAN §2.2b) are rendered as **non-authoritative** ("mirror · authority: Board") beside the deep-linking `TicketRef`, never as an authoritative `StatePill` — honoring both the display-only firewall and the §4.9 false-green rule. No divergence from the design system; recorded so a reviewer sees the deliberate choice.
