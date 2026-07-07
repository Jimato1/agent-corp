# Helm · Claude Design injection block — Notes (agent working memory + work product)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Notes (agent working memory + work product)

**Purpose (one line):** The org's Confluence-style external memory and work product — where agents write recon findings, where the planning huddle is recorded, and where retros write lessons; markdown is the literal source of truth, the index is rebuildable.

**Who uses it:** BOTH. The operator gets the full human UI (read/write/browse/inspect); agents get a sibling MCP surface (read/write/search/link) over the *same* markdown corpus + FTS index. Everything below is the human surface. Notes holds **no** ticket-lifecycle, approval, or kill authority — it renders the truth read-only and deep-links out to the authoritative owner (Board / Mission Control).

**Archetype:** BOTH — a **Workshop** reading/writing content pane inside a dark **Instrument** shell. This is the *one* place in the whole suite the "document as warm paper" surface appears: the content column where a note is read or written renders on `--paper-100 #F5F3ED` (warm off-white, not pure white) with **Source Serif 4** body at `--fs-read` (17/28, operator-zoomable 15–20px), plus a dark-reading alternate (`--sub-850 #12161C` body). The surrounding shell, side rail, header, tables, and **every safety chip stay Instrument-dark** in both reading modes. Never offer a "light Instrument."

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side rail (224px open / 56px collapsed) + global header (app name + "external memory & work product" tagline, logged-in `PrincipalRef` + session-freshness `🔑 fresh/stale`, suite switcher carrying once-shown suite posture). Side-rail nav: **Corpus · Graph · Review · History**. Read-only halt mirror lives here.
- **HaltBand** — full-width GOLD (`--halt-500 #F2842B`) band directly under the header, **read-only in Notes** (Notes is not in the kill chain, hosts no actuator). Two members, both gold never red, calm interlock `▮▮` / shield `⛊` iconography: (a) KILL-SWITCH ENGAGED and (b) SYSTEM SAFE-STOPPED (Pattern-D dependency down). `Shift+Esc` focuses the header halt mirror and deep-links to MC/auth.
- **TicketRef** — opaque mono ID chip (`[ T-000450 ]`, JetBrains Mono, `--ink-700` on `--sub-750`), copy-on-click, deep-links to `mc/review/<ticket_id>`.
- **PrincipalRef** — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service. Click → `mc/agents/<sub>`.
- **TierBadge** — the taint/provenance badge: `✔ verified` green (`--ok-500 #46B98A`), `⧉ cross-referenced` signal-cyan, `◑ single-source` amber (`--attn-500 #E8B84B`, "treat with suspicion"), and **striped-amber `⚠ UNTRUSTED`** for host-originated / externally-originated content (adversarial input to the models). Taint is display-of-truth, **never editable**.
- **FenceState** — `🔒 gen 47 · lease 04:12 · ♥ 0.8s` healthy (neutral `--ink-700`, never green); `⚠ SUPERSEDED by gen 47` zombie state (amber). Display-only echo here.
- **StatePill** — one glyph+label pill per lifecycle state, never color-only.
- **DangerAction + destructive-absence rule** — where a capability cannot exist by construction, print it as an affirmative fact with a lock/shield glyph `🔒/⛊` and **no greyed control** (never the `⛔` glyph, which is reserved for actionable stops).
- **Freshness** — `⟳` age + source stamp on every live figure; stale → amber `▲ STALE`, never a fabricated green. False-green prohibition: an unverifiable read renders `⚠ CANNOT CONFIRM` in halt-gold, never a green "OK."
- **ReviewChip** — `◈ NEEDS REVIEW → mc/review/<id>` / `⚑ ESCALATED · board_escalation → mc/review/…`, always shows the machine reason; deep-links out, never hosts a clear control.
- **DataTable** — dense zebra rows (`--sub-750` stripe), sticky sortable header, mono ID column with copy, reflows to cards < 640px.
- **AuditInspector** (§7.2 cross-app pattern) — append-only audit rows + provenance-lineage pivot; chain-verify never renders green when stale/failed.
- **ReviewQueue** (§7.1, MC-owned) — **consumed by deep-link + read-time derivation, never forked**; Notes hosts no clear-review control.
- **LiveStream** — SSE client contract (`GET /api/events`, `Last-Event-ID` replay); terminates at token `exp` and on `auth:revocations` → honest "Session ended — re-authenticate" state, never a silent freeze.
- **Toast** — transient action confirmation matching the verb ("Saved"); never used for safety state; never gold.

**⬡ Screens & views to build:**

**S1 — Corpus Browser & Search** *(Instrument)* — the home surface: the searchable, filterable list of the whole corpus. `/` focuses the search field.
```
┌─ header: notes · "external memory & work product"   ◐ operator:ada · 🔑 fresh ─┐
│  [ read-only HaltBand renders here iff suite posture > G0 / Pattern-D ]        │
├──────────┬─────────────────────────────────────────────────────────────────────┤
│ Corpus ◀ │  ⌕ [ search corpus…  / ]   type:[all▾] tag:[▾] ticket:[▾]  ⟳ 0.4s   │
│ Graph    │ ─────────────────────────────────────────────────────────────────── │
│ Review   │  DataTable — one row per note (mono id col, copy)                    │
│ History  │  ● TITLE                    type          taint        ticket   updated│
│          │  Canary batch findings      research      ◑ single    [T-000123] 2m   │
│          │  Fleet patch plan slice 3   plan          ⚠ UNTRUSTED [T-000450] 14m  │
│          │  NAS reboot huddle          deliberation  ✔ clean     [T-000450] 1h   │
│          │    ↳ snippet: "…canary must share the package set…"  ◑ single-source  │
└──────────┴─────────────────────────────────────────────────────────────────────┘
```
Rows are `DataTable`; `ticket` cell = `TicketRef`, `taint` cell = `TierBadge` rendering the note's **effective** taint (own ∨ transitive over links; `own` shown on hover). Search snippets (≤64 tokens) carry their own inline `TierBadge` — taint travels with retrieved content. Filters map to `type`/`tag`/`ticket_id`; **no status/ceremony-phase filter exists** (that state lives on the Board). — **States:** Loaded (rows) / Loading (skeleton rows, never a spinner) / Empty-no-corpus (*"No notes yet. Agents write findings here as external memory; you can start one too."* + `[ New note ]` cyan primary) / Empty-no-results (*"No notes match `<query>`. Clear filters or widen the search."*) / **Pattern-R** red ✕ under the search field for a malformed FTS expression (*"That search couldn't run — remove unsupported operators."*, list stays intact) / **Pattern-D** the index/watcher is down → gold SAFE-STOPPED band (*"canonical markdown is intact on disk and in git; search is a rebuildable index that is regenerating; reads by id still work"* — **not** red) / Stop-engaged (read-only HaltBand; browser stays fully readable).

**S2 — Note Editor** *(Workshop content pane in the Instrument shell — the paper surface)* — left: the `NoteEditor` Milkdown paper pane; right: a **metadata rail composed of shared components only**.
```
┌─ header (Instrument) ───────────────────────────────────────────────────────┐
│  ‹ Corpus   Canary batch findings     [ Save ]  ⟳ live 0.3s   view:[paper▾]  │
├─────────────────────────────────────────────┬───────────────────────────────┤
│  ░░ WORKSHOP paper column ░░ (--paper-100,   │  METADATA RAIL (Instrument)   │
│     Source Serif 4, --fs-read, 62–72ch)      │  id     N-01J1QZ… (mono, copy)│
│                                              │  type   research              │
│  ## Objective                                │  ticket [T-000123] ← TicketRef│
│  Establish a safe canary order for the …     │  taint  ◑ single (own) →      │
│  ## What I did                               │         ⚠ UNTRUSTED (effective)│
│  Pulled posture from Wazuh; clustered …      │         via: [[Wazuh dump]] ⚠  │
│    [[canary package overlap]] ← wikilink     │  fence  🔒 gen47·lease04:12·♥0.8│
│  ## Findings ▏(caret)                        │  authors ⬡ recon-03 ◐ ada     │
│  ## Open questions                           │  ticket-status needs_review · │
│  ## Next step                                │     mirror · authority: Board │
│                                              │  ─────────────────────────────│
│                                              │  🔒 Taint is display-of-truth.│
│                                              │     It cannot be edited here. │
└─────────────────────────────────────────────┴───────────────────────────────┘
```
The paper column is the one place the document reads as paper — body prose Source Serif 4; `view:[paper▾]` toggles the dark-reading alternate. Rail = `TicketRef` + `TierBadge` (showing **both** `own` and `effective` with the `tainted_via[]` list, each `via` a wikilink chip carrying its own badge) + `FenceState` (display echo, incl. `⚠ SUPERSEDED`) + `PrincipalRef` author list. **`ticket-status`/`ceremony_phase` render as muted non-authoritative mirrors** stamped `mirror · authority: Board` beside the `TicketRef` — **never** an authoritative `StatePill`. The taint control's absence is a printed constitutional fact (`🔒`, no greyed toggle). New note of a `type` opens with fixed section headers pre-filled. — **States:** Loaded / Loading (paper-column heading+paragraph skeleton + rail skeleton) / Empty-new-note (template scaffold, faint per-section prompts, title focused) / **Pattern-R stale buffer** (`PRECONDITION_HASH`, red ✕ banner above pane: *"This note changed since you opened it…"* + `[ Show diff ]` `[ Reload ]`) / **Pattern-R hygiene reject** (*"This looks like secret material … Reference secrets by handle instead."* — matched content **never echoed back**) / **Pattern-R taint-downgrade blocked** (*"Provenance is raise-only and cannot be reduced here."*) / **Pattern-D Board unreachable on a fenced write** (`FENCE_UNVERIFIABLE` → the **Save control** for a ticket-bound note renders **gold SAFE-STOPPED**, not red: *"Can't confirm this claim's lease — the Board is unreachable, so ticket-bound writes fail closed. Non-ticket notes still save."*) / Session-ended (live feed terminates, honest *"Session ended — re-authenticate to resume"*, unsaved buffer preserved locally) / Stop-engaged (read-only HaltBand; editing continues — writing external memory is benign).

**S3 — Deliberation Thread View** *(Workshop content pane, specialized render)* — Notes renders the record the Board's ceremony produces; it is the *record*, never the state machine.
```
┌─ header ─────────────────────────────────────────────────────────────────────┐
│  ‹ Corpus  NAS reboot huddle · deliberation  [T-000450]  phase:planning·mirror│
│                                              authority: Board → [T-000450]     │
├───────────────────────────────────────────────────────────────────────────────┤
│  ░░ paper column ░░  participants: ⬡ recon-03 · ⬡ sre-01 · ⬡ redteam-02       │
│  ▸ triage            (Scrum-Master turn · collapsed)                           │
│  ▸ recon             grounded in → [[fleet posture]]◑ [[Wazuh dump]]⚠UNTRUSTED │
│  ▾ planning                                                                    │
│     ┌ Independent positions ─ drafted before cross-reading (anti-anchoring) ─┐ │
│     │ ### SRE — @sre-01 · 14:03Z   ⬡ sub=agent:sre-01                        │ │
│     │ ### Security — @sec-04 · …    ⬡ sub=agent:sec-04                        │ │
│     └──────────────────────────────────────────────────────────────────────┘ │
│  ▾ adversarial_review  ⚑ REQUIRED — ≥1 premise-attack cited to a recon note   │
│     ### Adversarial — @redteam-02 · … ⬡ sub=agent:redteam-02                  │
│  ▸ backlog  → child tickets [T-000451] [T-000452]                             │
│  ▸ execute  ▸ retro                                                            │
└───────────────────────────────────────────────────────────────────────────────┘
```
**Seven fixed phase sections** (`triage → recon → planning → adversarial_review → backlog → execute → retro`), collapsible, current mirrored phase auto-expands (decorative highlight, `authority: Board`). Every turn header renders the human line **and** a `PrincipalRef` resolved from the machine attribution marker (`⬡ sub=…`) — never a bare display name; turns are append-only, non-editable. Ground truth is **linked, not inlined** — each `[[wikilink]]` renders with the linked note's `TierBadge`, so an operator sees the huddle rests on `⚠ UNTRUSTED` input. `adversarial_review` carries a `⚑ REQUIRED` marker; if no premise-attack is cited, an honest *"no dissent recorded — huddle may be invalid"* note. **No "converge"/"escalate" button** — a printed *"phase transitions happen on the Board"* fact; already-filed escalations surface as a `ReviewChip` deep-linking out. Isolated turns show a small `isolated` micro-tag but are always shown in full (the file never lies to the operator). — **States:** Loaded / Loading (section skeletons) / Empty (seven empty phase headers, *"The huddle for `<ticket>` will be recorded here"*) / Pattern-R (same CAS/hygiene errors as S2) / Pattern-D (Board unreachable → ticket-bound turn writes fail-closed gold; mirrored phase line shows `phase unavailable — Board unreachable`, never a fabricated phase) / Stop-engaged (read-only HaltBand).

**S4 — Link Graph & Backlinks** *(Instrument; graph canvas + list)* — the associative-memory browser: wikilink/backlink structure as a `LinkGraph` canvas synchronized with a `DataTable` list.
```
┌─ header: Graph · focus: N-01J1QZ… "Canary batch findings"  depth:[1▾] [open in editor]┐
├──────────────────────────────────┬────────────────────────────────────────────────┤
│   LinkGraph canvas                │  Backlinks (DataTable)                         │
│        (fleet posture) ◑          │  ← FROM                   type      taint       │
│              │                    │  NAS reboot huddle        deliberation ⚠UNTRUSTED│
│      [Canary batch findings] ●    │  Fleet patch plan slice3  plan        ◑ single  │
│         │            │            │  ─────────────────────────────────────────────│
│  (canary overlap)◑ (Wazuh dump)⚠  │  Outbound → (canary overlap)◑ · (Wazuh dump)⚠  │
└──────────────────────────────────┴────────────────────────────────────────────────┘
```
Nodes carry taint via `TierBadge` glyphs (the graph is a second place effective-taint propagation is visible — an `⚠ UNTRUSTED` neighbor is *why* a focus node's effective taint is raised). Node = note; directed edge = wikilink; unresolved links = ghost nodes; `isolated` links render dimmed with an `isolated` tag. List half is `DataTable` (each row → S2). — **States:** Loaded / Loading (canvas + list skeleton) / Empty (*"This note has no links yet. Use `[[wikilinks]]` in the body to build associative memory"*) / Pattern-R (focus id not found, red ✕ *"No note with that id"*) / Pattern-D (link index rebuilding → gold SAFE-STOPPED: *"link graph is a rebuildable index, regenerating; markdown links in the body are intact"*) / Stop-engaged (read-only HaltBand).

**S5 — Review-Attention View** *(Instrument; consumes the canonical MC queue, never forks it)* — "which of my artifacts are awaiting a human gate." **Notes never hosts a clear-review control.**
```
┌─ header: Review · notes attached to tickets in a human gate   source: mc · as-of 3s ⟳┐
├───────────────────────────────────────────────────────────────────────────────────┤
│  DataTable                                                                          │
│  NOTE                     ticket       gate / state                        author   │
│  Fleet patch plan slice3  [T-000450]   ◈ NEEDS REVIEW → mc/review/T-000450  ⬡ sre-01│
│  Canary batch findings    [T-000123]   ⚑ ESCALATED · board_escalation → mc/review/… │
│  NAS reboot huddle        [T-000451]   ◐ AWAITING_APPROVAL → mc/review/T-000451     │
└───────────────────────────────────────────────────────────────────────────────────┘
```
Each gate cell is a `ReviewChip` (`StatePill` + verbatim machine reason + deep-link to `mc/review/<ticket_id>`). Clicking leaves Notes for MC's canonical item page — **no clear/approve/reject affordance in Notes.** Gate state is **read live, not stored** (browser-direct from MC's queue, advisory / MC-observed / never authoritative); the `Freshness` stamp (`source: mc · as-of 3s`) is mandatory and degrades to `▲ STALE`, never a false "all clear." A footer prints *"Reviews are cleared on the Board / Mission Control, never here"* with `🔒`. — **States:** Loaded / Loading (skeleton rows) / Empty (*"No notes are awaiting a human gate right now."* — a positive statement) / **Pattern-R** (operator session lacks `mc:read` → red ✕ *"Can't read the review queue — your session isn't scoped for Mission Control"* + deep-link) / **Pattern-D** (MC unreachable → gold SAFE-STOPPED: *"Can't reach Mission Control; showing last-known gate state as-of `<age>` — treat as unverified"*, never a fabricated "cleared") / Stop-engaged (read-only HaltBand).

**S6 — Provenance & History Inspector** *(Instrument; `AuditInspector` §7.2, both modes)* — read-only truth of where a note came from and who touched it.
```
┌─ header: History · Canary batch findings  N-01J1QZ…  [audit ▾ | provenance]  git ✔0.6s┐
├───────────────────────────────────────────────────────────────────────────────────┤
│  AuditInspector — append-only rows (DataTable)                                      │
│  ts (mono)          who                 action        target        outcome         │
│  2026-07-02T14:03Z  ⬡ agent:recon-03   append_note   §Findings      ✔               │
│  2026-07-02T14:00Z  ◐ operator:ada      update_note   whole note     ✔               │
│  ── chain: git trailers · commit_sha per row · [ verify against git log ]  ✔ verified│
└───────────────────────────────────────────────────────────────────────────────────┘
```
**Audit mode** = git-trailer projection: each row `ts` (mono/tabular) · `PrincipalRef` (the `Sub:` trailer — authoritative per-edit "who") · action verb · target · outcome `StatePill`. Chain-verify follows the §4.9 rule: a stale/failed `git log` reconcile **never renders green** — shows `⚠ CANNOT CONFIRM` in halt-gold, or `✕ CHAIN BROKEN` in danger-red (`--danger-500 #E5594E`) for a detected divergence. A footer states plainly that denied/rejected calls are not here (state-changes-only). **Provenance mode** = the lineage pivot: `own` vs `effective` `TierBadge`, the `tainted_via[]` chain, and the ticket-lineage structural floor — **read-only always, no correction control.** — **States:** Loaded / Loading (row skeletons) / Empty (single genesis commit: *"One entry — this note was created and not yet edited"*) / Pattern-R (note id not found) / **Pattern-D git-remote/push-lag or index rebuild** (gold SAFE-STOPPED: *"Can't verify the audit chain right now — treat as UNVERIFIED"*; surfaces boot-time git-remote degraded mode and `git_push_lag_seconds` as an honest health fact, never green while lag exceeds bound) / Stop-engaged (read-only HaltBand).

**◈ App-specific components (only where justified):**
- **`NoteEditor`** (Milkdown `@milkdown/crepe`) — the WYSIWYG-markdown Workshop content pane (S2/S3) that stores markdown **verbatim**; the canonical-store editing tool. Renders on `--paper-100` + Source Serif 4 at `--fs-read`, reading measure 62–72ch, with the dark-reading alternate. *Not shared:* a WYSIWYG-markdown authoring surface is domain-unique; the suite has exactly one canonical markdown corpus and this is its writing tool. Its chrome (Save, view toggle) and every metadata chip reuse shared components.
- **`LinkGraph`** — the wikilink/backlink graph canvas (S4): notes as nodes, wikilinks as directed edges, `TierBadge` taint on nodes, ghost-node styling for unresolved links, dimmed `isolated` edges. *Not shared:* no shared component renders a node-edge graph; only the canvas is new — its node badges are `TierBadge`, its list half is `DataTable`.
- **`DeliberationThreadView`** — the seven-phase ceremony render (S3): fixed phase sections, per-turn attribution markers, Independent-positions / Joint / Adversarial-review structure, linked (never inlined) ground truth. *Not shared:* the huddle record's phase-sectioned, append-only, turn-attributed document structure is Notes-specific — it *contains* `PrincipalRef`/`TierBadge`/`TicketRef`/`ReviewChip` but its sectioned-thread layout has no shared equivalent.

> The **metadata rail** (S2) is deliberately **not** an app-specific component — it is a layout composition of `TicketRef` + `TierBadge` + `FenceState` + `PrincipalRef` + `StatePill` only. A bespoke "note-meta chip" would be the exact consistency failure the system forbids.

**⚠ Safety / danger surfaces specific to this app:**
- **Taint is display-only, never editable in the UI.** No screen offers a taint control. The absence is a **printed constitutional fact** with a `🔒` and no greyed toggle (destructive-absence rule) — *"Taint is display-of-truth; it cannot be edited here."* Provenance is raise-only; a Pattern-R error blocks any edit that would lower it. (A rare operator-only mistag-correction endpoint is kept **entirely off** the note surfaces by design — see Gap.)
- **The clear-review control is absent by construction.** S5 renders gate state and deep-links to MC to clear it; a footer prints *"Reviews are cleared on the Board / Mission Control, never here"* with `🔒`. There is no approve/reject/clear affordance anywhere in Notes.
- **Fail-closed on ticket-bound writes = gold, not red.** When the Board is unreachable, ticket-bound Save/append renders the **gold SAFE-STOPPED** treatment on the affordance (Pattern-D), never a red error — fail-closed is the safety system working. Non-ticket notes still save.
- **False-green prohibition on the audit chain and every mirror.** The S6 chain-verify, the S5 gate feed, and the S1/S4 index all render honest-unknown in halt-gold when unverifiable — never a fabricated healthy/green/"cleared" state. Decorative `ticket_status`/`ceremony_phase` mirrors are stamped `mirror · authority: Board`, never an authoritative pill.
- **HaltBand is read-only here.** Notes is not in the kill chain and hosts no actuator; it shows the band and, at most, deep-links to MC/auth. `Shift+Esc` focuses the header halt mirror.
- **Secret-material hygiene reject** — on Save, credential/private-key-shaped content is refused; the banner names the pattern class only and **never echoes the matched content back**.

**⚑ Gaps flagged:**
- **[GAP — operator/Claude Design to decide]** The rare operator-only taint-**downgrade** (mistag correction) endpoint: the spec quarantines it entirely off the note reading surfaces and defaults it to API-only. Whether to surface it in a separate admin console (as a full `DangerAction` + typed-intent + step-up + tamper-evident audit) or keep it API-only is an unresolved operator call — do **not** place any taint-edit control on S2/S3/S4/S6.
- **[GAP — Board/MC seam to confirm]** S5's live gate decoration requires the operator's browser session to carry `mc:read` for the cross-app MC queue read. Until confirmed, S5 correctly renders the Pattern-R "not scoped for MC" state and deep-links out — degraded, never wrong; no design change needed, but the scope grant is unconfirmed.
- All colors, type, spacing, and safety cues used here are drawn from the frozen token set; no out-of-token color is introduced.
