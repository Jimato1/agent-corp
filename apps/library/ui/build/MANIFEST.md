# library Reference Shelf — UI build MANIFEST (Stage-3 static UI)

Dependency-free static HTML/CSS/JS realizing `apps/library/ui/UI_SPEC.md`, mirroring
the **shipped auth Operator Console pattern** (`platform/auth/ui/build/`). **No node,
no build step, no framework.** Open any `.html` directly in a browser; the shared
shell partial (`shell.js`) injects the §6.1 AppShell — global header (brand ·
read-only **SYSTEM STATE** mirror · operator identity), the **read-only** §4.6
`HaltBand` (only when suite kill level > G0), and the six-screen nav rail — then
wires the `Shift+Esc` halt-**focus** shortcut and the SCAFFOLD confirm ceremonies.

> **Visual rendering is CANNOT-VERIFY-HERE** (no browser in this sandbox). The
> HTML/CSS/JS is **real and structurally valid** — every `.html` parses via
> `python -m html.parser` (command below). Pixel-accurate contrast, font loading,
> reflow, focus rings, and paper/dark theme rendering must be confirmed in a real
> browser by the operator.

## The Library is NOT in the kill chain
Per `UI_SPEC.md` §3 and PLAN §13 the Library holds **no kill / freeze / approval-record
authority**. Consequences hard-coded into this build:

- The `HaltBand` is a **read-only mirror** (`shell.js haltBand()`): gold, calm, an
  informational band that **deep-links OUT to Mission Control** where a stop is
  actually engaged and liftable. There is **no engage/freeze actuator** anywhere.
- The **⛔ STOP glyph is never used** in this app. A "cannot-by-construction" fact is
  a calm `PrintedAbsence` 🔒 (`.absence`), never a disabled control, never a STOP glyph.
- `Shift+Esc` (+ documented fallback chord `Ctrl+Alt+H`) **focuses** the rail's
  "where a stop is visible" note (deep-linking to MC) — it **never fires** anything.

## The auto-admit lane is DISABLED pre-D7
The `sandbox-verified` auto-admission lane is **structurally disabled until the
tier-0 sandbox seam freezes (D-7)**. Pre-D7 there are **zero auto-admissions**:
`spot_audit.html` says so in its empty state, and **every doc reaches the trusted
tier only through operator review** in `ingestion_review.html`.

---

## Inventory (all in `apps/library/ui/build/`)

| File | Role |
|---|---|
| `tokens.css` | Helm **master** token sheet, vendored: `--surface-*`, `--ink-*`, `--paper-*`, `--signal-cyan*`, `--halt-gold*`, `--danger-red*`, `--state-*`, `--tier-*`, `--font-ui/-mono/-serif`, `--space-*`, `--radius-*`, type scale, z-index, motion. `@import`s Google Fonts (Inter / JetBrains Mono / Source Serif 4) with system fallbacks. Includes `.workshop-surface` (paper reading surface, `--paper-*`). |
| `shell.css` | Shared shell (header / rail / content) **+ the Helm component VOCABULARY** as CSS classes (see below). Dark Instrument shell; paper only inside `.reading-pane` / `.workshop-surface`. Responsive to ~375px, no horizontal scroll. |
| `shell.js` | One IIFE. `NAV` = the 6 screens. Brand **"library ▸ reference shelf"**. Reads `window.LIB_SHELL`. Renders header (read-only system-state line + read-only `HaltBand` when level>G0) + left rail (active per `LIB_SHELL.activeNav`). **No kill/freeze actuator.** `Shift+Esc` / `Ctrl+Alt+H` focus the MC deep-link note. Inert SCAFFOLD `ConfirmFriction` wiring (typed-intent gate; no network write). |
| `corpus_search.html` | Screen 1 — Corpus Browser / Hybrid Search. |
| `doc_inspector.html` | Screen 2 — Doc / Provenance Inspector. |
| `ingestion_review.html` | Screen 3 — Ingestion Review Queue (Library's own admission gate). |
| `spot_audit.html` | Screen 4 — Tier-1 Spot-Audit Stream. |
| `collections_lifecycle.html` | Screen 5 — Collections & Lifecycle. |
| `index_status.html` | Screen 6 — Index Status. |
| `MANIFEST.md` | This file. |

## Component vocabulary in `shell.css` (cited by name from the screens)

`.pill` / `.pill--ok|--attn|--danger|--drain|--halt|--neutral` (StatusPill / StatePill);
tier badges `.tier--verified` ✔ / `.tier--corroborated` ⧉ / `.tier--single` ◑ /
`.tier--untrusted` ⚠ (striped-amber, appends **"UNTRUSTED"**, reads "curation-ingested");
`.halt-band` (gold, **read-only** — no engage actuator); `.tbl` / `.tbl-wrap`
(DataTable — dense, zebra, sticky header, mono id col, `.uncovered-heavy` cue);
`.actuator--danger` (`--solid`/`--outline`) + `.modal-scrim` / `.modal--danger` /
`.consequence` (DangerAction + ConfirmFriction, typed-intent); `.absence` (PrintedAbsence 🔒);
`.err` (Pattern R, red); `.degraded` (Pattern D, **gold** degraded banner, with a
"still true" line; `.invalid` = heavier gold for index-invalid); `.freshness`
(STALE is amber, never a false green); plus the app-specific `.reading-pane`
(DocReadingPane paper + coverage shading), `.scope` (ScopeResolver), `.admdiff` (AdmissionDiff).

---

## REAL vs SCAFFOLD (honesty table)

**REAL** here = the token language, the shell partial, the component CSS vocabulary,
the safety grammar (tier badges, read-only HaltBand, PrintedAbsence, Pattern-R-vs-D
split, typed-intent confirm ceremony), the two-view mapping to the live Core API,
and the structural markup of all six screens. **SCAFFOLD** = the per-screen row/readout
data is a static mock and mutating controls are inert (no network write).

| File | Class | What is REAL | What is SCAFFOLD / mocked |
|---|---|---|---|
| `tokens.css` | **REAL** | Full vendored Helm master token sheet + `.workshop-surface`. | Pixel contrast / font loading = CANNOT-VERIFY-HERE (no browser). |
| `shell.css` | **REAL** | Shell layout + the entire component vocabulary above; responsive rules. | Rendering fidelity CANNOT-VERIFY-HERE. |
| `shell.js` | **REAL** | Header/rail/read-only-HaltBand injection from `window.LIB_SHELL`; `Shift+Esc`/`Ctrl+Alt+H` focus-the-MC-note; typed-intent confirm gate. | Actuator "completion" shows a stub Toast; **no `/api/*` write**, no SSE `LiveStream`. |
| `corpus_search.html` | SCAFFOLD | ScopeResolver (host_id XOR target_*), trust-envelope DataTable (Tier · Ver · Cover · Taint on **every** row), Workshop reading pane with covered-span shading, "tier is a badge NOT a sort key" footer. | Result rows mocked; live retrieval mocked. |
| `doc_inspector.html` | SCAFFOLD | Doc header (TierBadge + StatePill ADMITTED + taint); append-only evidence ledger with the Attestation column (`gateway_delivered`=✔ / `agent_asserted`=◑ + printed "✕ never satisfies the gate"), content-bound ✔ sha-match, chain-verify "⚠ CANNOT CONFIRM never green"; chunk/coverage map + paper reading pane. | Ledger rows mocked. |
| `ingestion_review.html` | SCAFFOLD | Library's OWN admission gate (`library:admin`, ◐ operator-only); batched ReviewQueue DataTable of **doc_id** items; bulk-approve **cap 10** stated; distinctness as "3 origins ~heur" + "heuristic; the operator gate is the control"; agent_asserted row = PrintedAbsence "✕ NOT admit-eligible — content-bound gate"; AdmissionDiff paper sub-pane; Admit/Reject full-friction DangerAction. | Rows mocked; decision writes inert. |
| `spot_audit.html` | SCAFFOLD | Auto-admissions oversight; switching chip **▲ TIGHTENED (never green)**; covered ▣ n/m; uncovered-heavy row prominent; Reject full-friction + operator-confirmed cluster quarantine; **empty state states the sandbox lane is structurally DISABLED until D-7**. | Rows mocked; the populated table illustrates the post-D7 shape only. |
| `collections_lifecycle.html` | SCAFFOLD | Collection chips; lifecycle table (StatePill current/superseded/retired); staleness ▲ flags; Retire/Supersede full-friction ("preserves evidence history; mints new lineage doc, never edits bytes"); PrintedAbsence "no delete capability exists". | Rows mocked; lifecycle writes inert. |
| `index_status.html` | SCAFFOLD | `model_id` / `dim (config PENDING-SIZING)` / `chunker_config_id` / corpus-commit ancestor check; **Pattern-D GOLD** banners (SEMANTIC lexical-only, DURABILITY push-behind, pending_embed partial, INDEX INVALID suspended never-green); Full reindex full-friction ("suspends serving; stale results withheld"). | Values mocked; reindex inert. |

---

## Endpoint map (each screen → its live `/api` route + MCP sibling)

Both surfaces are clients of the **one** Core API (two views, one state, PLAN §6). The
Core API at `/api/*` is **live + tested**; these screens map onto it. `library:admin`
screens are **human-principal-kind gated** (no agent principal), so an agent session
renders the honest "session ended / scope-denied" state, never a fabricated-empty screen.

| Screen (file) | Reads | Writes (all DangerAction where destructive/admin) | MCP sibling |
|---|---|---|---|
| Corpus search (`corpus_search.html`) | `POST /api/search` · `GET /api/docs/{doc_id}?body=true` | — | `library_search`, `library_get_doc` |
| Doc / provenance (`doc_inspector.html`) | `GET /api/docs/{doc_id}` · `GET /api/docs/{doc_id}/chunks` | — (read-only) | `library_get_doc` |
| Ingestion review (`ingestion_review.html`) | `GET /api/review-queue` (+LiveStream) | `POST /api/review-queue/{doc_id}/decision` (admit/reject; `library:admin`, `op_id`) | **none — no MCP path to `admitted`** (PLAN §7) |
| Tier-1 spot-audit (`spot_audit.html`) | `GET /api/review-queue` (tier-1 stream, +LiveStream) | `POST /api/review-queue/{doc_id}/decision` (reject + cluster-quarantine confirm) | none |
| Collections & lifecycle (`collections_lifecycle.html`) | `GET /api/collections` | `POST/PATCH /api/collections` · `POST /api/docs/{doc_id}/retire\|supersede` | none |
| Index status (`index_status.html`) | `GET /api/admin/index-status` (+LiveStream) | `POST /api/admin/reindex` | none |

The **proposal path is agent-first** (`library_propose` / `attach_sources` /
`attach_sandbox_evidence` / `request_admission`, MCP); an operator may also propose via
a thin `POST /api/proposals` reachable from the Review-Queue empty state.

---

## Design-language / safety-grammar decisions applied (from UI_SPEC + task hard rules)

- **Trust is always shown, never inferred** — every search hit and chunk carries tier +
  version-scope + evidence-coverage + the `curation-ingested` UNTRUSTED taint inline;
  heuristics render **as heuristics** (`~heur`), never as a verified tier.
- **Colour is never the only signal** — every state is glyph + label + colour (legible in
  grayscale / to colour-blind operators).
- **Pattern R vs Pattern D never conflated** — a recoverable operator error is red (`.err`);
  a degraded **dependency** is gold (`.degraded`, "safe reduced mode", with a "still true"
  line), **never a red error**. Index Status is the named home of the gold degraded modes.
- **False-green prohibition** — corpus↔index consistency and chain-verify never render a
  green "OK" when stale/invalid: `⚠ CANNOT CONFIRM` / `INDEX INVALID — suspended` in gold.
- **The admission gate is an honest human gate** — `agent_asserted` evidence is a
  `PrintedAbsence` (printed "✕ NOT admit-eligible — content-bound gate", 🔒, no affordance),
  the bulk-approve cap (10) is a designed-in friction, and every trusted-content mutation is
  a full-friction typed-intent `ConfirmFriction`.
- **Read-only HaltBand + deep-links out** — the Library shows suite posture and links to MC
  for every gate it does not own (ticket-level `needs_review` deep-links to MC `/review/<ticket_id>`).

## CANNOT-VERIFY-HERE (and how the operator closes each)
1. **Visual rendering / contrast / fonts / reflow / focus rings / paper theme** — no browser
   in the sandbox. Close it: `python -m http.server 8080 --directory "apps/library/ui/build"`
   then browse `http://localhost:8080/corpus_search.html`; verify with axe DevTools + a
   colour-blindness simulator + `prefers-reduced-motion` toggled.
2. **Live data** (`/api/search`, `/api/review-queue`, `LiveStream` SSE, index counters) — no
   backend here. Pages run a static mock; confirm-ceremony "completion" shows a stub Toast.
   Close it: serve the Core API and point a fetch layer at it (integration task).
3. **Real admission / reindex writes** — need the Core API + `op_id` idempotency + the
   `library:admin` human-only gate. Close it: exercise against the deployed stack at Stage-7.

## HTML parse validation (run in this sandbox)
```
python -c "import html.parser,glob; [html.parser.HTMLParser().feed(open(f,encoding='utf-8').read()) for f in glob.glob(r'apps/library/ui/build/*.html')]; print('HTML OK')"
```
