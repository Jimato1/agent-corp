# UI_SPEC.md — Reference Library (`library`) — Stage 3 (UI/UX)

> **Design-specification only** — no code, no build. Every screen is described in words + ASCII wireframe and enumerates every state. This document **consumes `context/DESIGN_SYSTEM.md` (FROZEN) and specifies deltas only.** It cites shared components by ID and never re-draws them. Grounding read in order: `context/DESIGN_SYSTEM.md`, `context/DESIGN_SYSTEM_COMPONENTS.md`, `apps/library/planning/PLAN.md` (esp. §8 UI), and the three seams `gateway-cmdb-library-sandbox.md`, `cmdb-library-hostfacts.md`, `agent-runtime-library-inference.md`.

---

## 1. Scope, archetype, governing principle

**Scope.** The human surface of the Library — the corporate reference shelf (curated RAG corpus). It is the sibling of the MCP agent surface over **one shared state** (PLAN §6 API); every screen here reads/writes the same endpoints the agent tools do. Six screens: Corpus Browser/Search, Doc/Provenance Inspector, Ingestion Review Queue (Library's own admission gate), Tier-1 Spot-Audit Stream, Collections & Lifecycle, Index Status.

**Archetype declaration (§2): BOTH — a Workshop reading pane inside an Instrument shell.**

| Screen | Archetype | Why |
|---|---|---|
| Corpus Browser / Search | **Instrument** (results list) **+ Workshop** (reading pane) | dense retrieval truth-table on the left; a lit `--paper-*` document column on the right |
| Doc / Provenance Inspector | **Instrument** (evidence ledger, chunk map) **+ Workshop** (rendered body) | `AuditInspector` provenance mode over a reading pane |
| Ingestion Review Queue | **Instrument** | the admission gate is an operator control table (`ReviewQueue` anatomy) with a Workshop diff sub-pane |
| Tier-1 Spot-Audit Stream | **Instrument** | sampled auto-admissions, switching-state control room |
| Collections & Lifecycle | **Instrument** | management tables + `DangerAction` retire/supersede |
| Index Status | **Instrument** | health/degraded-mode readout |

The safety grammar (§4) and shell (§6.1) are archetype-invariant: a `TierBadge`, a `TicketRef`, a `HaltBand`, a `DangerAction` render identically here and in the Gateway. The paper column is the *only* place content reads as paper (§3.2).

**Governing principle.** *The Library never lies about how much it trusts a chunk.* This is the app that exercises `TierBadge` (§4.3) hardest — four provenance tiers plus the `curation-ingested` untrusted taint on every result — and the app whose primary Stage-5 threat is corpus poisoning via ingestion (PLAN §12). Two consequences shape every screen: (1) **trust is always shown, never inferred** — tier + version-scope + evidence-coverage + taint travel inline with every chunk, and heuristics render *as heuristics* (§4.3 hard rule); (2) **the admission gate is an honest human gate, not a rubber stamp** — agent-asserted evidence is *never* auto-admit-eligible, the operator sees the diff, and the bulk-approve cap is a designed-in friction (PLAN §8.3 / finding F7). The Library holds **no credentials, no execution path, no fencing/kill/approval-record authority** (PLAN §13): it *shows* suite posture read-only and *deep-links out* for every gate it does not own.

---

## 2. Design-language note

**Consumes `DESIGN_SYSTEM.md`; deltas only.** Tokens, typography, spacing, motion, and every §4/§5/§6/§7 component are inherited verbatim. This spec adds nothing to the token sheet. Workshop reading panes use `--paper-*` + Source Serif 4 (`--fs-read`) for document body **only**; the shell, nav, tables, and every §4 safety component stay Instrument-dark in both reading themes (operator-selectable paper / `--sub-850` dark body, §2). The three app-specific components in §5 are justified there as genuinely domain-unique; everything else is a citation.

---

## 3. Shared components consumed (map)

| Shared entity in the Library | Rendered as | Where |
|---|---|---|
| Proposal / curation ticket (`ticket_id`, opaque) | `TicketRef` §4.1 (deep-links to `/review/<ticket_id>` in MC) | every doc, every review row, inspector |
| `proposed_by` / `admitted_by` / `attached_by` (`sub`) | `PrincipalRef` §4.2 | doc header, evidence ledger, review rows |
| Provenance tier · evidence attestation · taint | `TierBadge` §4.3 | **every search hit, every chunk, every review row** |
| Admission / status lifecycle | `StatePill` §4.5 | doc header, review rows, inspector |
| Suite kill / dependency-down posture | `HaltBand` §4.6 **read-only** | global header (all screens) |
| Admit / reject / retire / supersede / reindex | `DangerAction` §4.7 + `ConfirmFriction` §5.1 | review queue, spot-audit, lifecycle, index status |
| Any ticket-level `needs_review` / escalation | `ReviewChip` §4.10 (deep-links **out** to MC/Board) | doc header, review rows |
| Evidence ledger / provenance lineage | `AuditInspector` §7.2 (provenance mode) | Doc/Provenance Inspector |
| Ingestion admission gate | `ReviewQueue` §7.1 **anatomy** (distinct gate — §6) | Ingestion Review Queue, Spot-Audit Stream |
| Live/mirrored figures (freshness, push lag, index age) | `Freshness` §4.9 (never a false green) | search header, index status, spot-audit |
| Truth tables (results, ledgers, queues, fleet of docs) | `DataTable` §6.2 | all list screens |
| Shell, rail, suite switcher, operator identity | `AppShell` §6.1 | all screens |
| Search/scope inputs, decision notes | `Field` §6.3 | search bar, review decision, collections |
| Confirm dialogs | `Modal` §6.4 / `role="alertdialog"` | every `DangerAction` |
| Transient action confirmation | `Toast` §6.5 (never for degraded state) | admit/reject/publish results |
| SSE streams (review queue, spot-audit, index status) | `LiveStream` §5.5 | review queue, spot-audit, index status |
| Keyboard / `Shift+Esc` halt-focus | §5.3 / §5.6 | all screens |

**No `FenceState` (§4.4).** The Library holds no lease/mutex/fence authority (PLAN §13 — single-writer service, but no cross-app claim it renders). It never draws a fencing chip. **No kill actuator, no approval-record minting** — it is not in the kill chain as an enforcer and does not host MC's `ReviewQueue` decisions; it renders `HaltBand` read-only and deep-links to MC/auth (§5.3 "where a stop is even visible").

---

## 4. Screens

### 4.1 Corpus Browser / Hybrid Search — Instrument list + Workshop reading pane

The default screen and the human twin of `library_search` (two views, one state — same `/api/search`). Left: the retrieval scope control (`ScopeResolver`, §5) + a `DataTable` of hits. Right: a Workshop reading pane for the selected doc. **Every hit carries its full trust envelope inline** — this is the governing principle made visible.

```
┌ AppShell §6.1 ──────────────────────────────────────────────────────────────────────┐
│ ⬢ LIBRARY · the corporate reference shelf   SYSTEM STATE: ⟳ G0 · fresh 0.4s   ◐ ada  │
├──[ read-only HaltBand mirror when level>G0 ]────────────────────────────────────────┤
│ ScopeResolver §5:  ⌕ [ how to extend an lvm volume________ ]  /  focus                │
│   scope ◉ host_id [ host_9f2… ]   ○ target: os[linux▾] distro[ubuntu▾] ver[24.04▾]…  │
│   version_scope: ✔ exact (CMDB fresh 1.2s)      k [ 8 ]   [ include_unverified ☐ ]    │
├───────────────────────────────── results (DataTable §6.2) ──────┬────────────────────┤
│ TIER            DOC / heading anchor            VER   COVER  TAINT│  READING PANE      │
│ ✔ sandbox-ver.  lib-01J… › lvextend › Growing…  exact ▣cov  ⚠ing │  (Workshop         │
│ ⧉ cross-ref.    lib-01H… › LVM2 guide › Resize   exact ▢unc  ⚠ing │   --paper-100,     │
│ ◑ single-source lib-01G… › blog › “just run…”   ~appr  ▢unc  ⚠ing │   Source Serif 4,  │
│ ◑ agent-authored lib-01F… › note-derived        exact ▢unc  ⚠ing │   --fs-read)       │
│  … RRF-fused, tier is a badge NOT a sort key …                    │  <title, ver scope>│
│                                                                  │  rendered body,    │
│ retrieval_mode: hybrid          source: index @corpus a9c… 0.3s  │  covered spans      │
└──────────────────────────────────────────────────────────────────┴────────────────────┘
```

- **TIER column = `TierBadge` §4.3** — the whole point of this app. `sandbox-verified` → Verified family (`--ok` ✔); `cross-referenced` → Corroborated (`--signal` ⧉); `single-source` / `agent-authored` → Single/asserted (`--attn` ◑ "treat with suspicion"). **TAINT column = `TierBadge` UNTRUSTED member** — `curation-ingested` on *every* ingested result renders `--attn` striped + ⚠ + `UNTRUSTED` on hover (§4.3): the operator's cue that this content is adversarial input and its consuming plan is auto-lane-ineligible. Tier is a **badge, never a sort key** — results are RRF-fused (PLAN §3), and the UI must not reorder by tier (that would let a poisoner infer the gate).
- **VER = `version_scope`** (`exact | ~approximate | unverified`) rendered as a small state chip; `~approximate` and `unverified` carry the honest flag from the contract (`cmdb-library-hostfacts.md` §2). **COVER = per-chunk `evidence_covered`** (▣ covered / ▢ uncovered) — anti-tier-riding (PLAN §2.4); an uncovered chunk inside a `sandbox-verified` doc is visibly uncovered.
- **DOC ref = `TicketRef`-family chip** for `doc_id` (opaque mono, copy-on-click); the durable citation (`doc_id` + heading anchor + line-range) is the copyable artifact, `chunk_id` is never surfaced as a citation (PLAN §3/§1.2 F12).
- **Reading pane = `DocReadingPane` (§5)** — the Workshop content column; covered spans shaded, uncovered prose plainly marked.
- **`ScopeResolver` (§5)** enforces the `host_id` **XOR** `target_*` rule — supplying both is a typed `scope_conflict` (PLAN §3 F15), surfaced as an inline `Field` §6.3 validation error, never silent precedence.

**States (§5.4 honest defaults):**
- **Loaded** — as above.
- **Loading** — static skeleton rows in the `DataTable` (never a spinner, §5.4); reading pane a paper skeleton.
- **Empty (no query)** — invitation: "Search the reference shelf. Results carry their provenance tier, version scope, and evidence coverage inline." One CTA: focus the search `Field`. **Empty (query, zero hits)** — "No admitted docs match this scope. Try `include_unverified` to see quarantined material (flagged), or widen the version target." — names the one action, no shrug.
- **Pattern R (red ✕, §5.4)** — recoverable operator error: `scope_conflict` (both scope inputs set), malformed `k`, FTS query rejected. Stated in the interface's voice with the fix; local, red, not systemic.
- **Pattern D (gold ⛊, §5.4 / §4.9)** — a dependency is degraded, **rendered as a safe reduced mode, never a red error**:
  - *agent-runtime down* → banner `⛊ SEMANTIC RETRIEVAL DEGRADED · runtime unreachable — serving lexical-only`; `retrieval_mode: lexical_only` chip on the header; results still stream from the FTS half (PLAN §3). Honest "what's still true": exact/FTS matches valid; vector recall unavailable.
  - *CMDB down / host unknown* → the hard version filter is **disabled**, every hit flagged `version_scope: unverified` in gold (contract §2) — "filter off; showing all versions, flagged" — never a silently-wrong filter.
  - *docs `pending_embed`* → `retrieval_mode: partial` chip: "N recently-admitted docs served from text index only; vectors queued."
  - *index invalid (corpus↔index commit mismatch, PLAN §1.5)* → serving **suspended**, not stale: gold `⛊ RETRIEVAL SUSPENDED · index rebuilding (stale results withheld)` with a link to Index Status. This is the §4.9 false-green rule — no fabricated results.
- **Stop-engaged** — `HaltBand` §4.6 read-only in the header when suite kill level > G0. Library keeps serving reads (benign reads continue by design, §4.6a); the band is informational and deep-links to MC.

### 4.2 Doc / Provenance Inspector — `AuditInspector` §7.2 (provenance mode) + Workshop body

The read-only truth of *where this doc came from and who touched it*. Consumes `AuditInspector` §7.2 **provenance-mode** verbatim — it is not forked. Human twin of `library_get_doc` / `/api/docs/{doc_id}`.

```
┌ lib-01J…  “lvextend — LVM2 2.03”   [copy]   ● ADMITTED  ✔ sandbox-verified  ⚠ curation-ingested │
│ proposed_by ⬡ agent:curator-03 · admitted_by ◐ operator:ada · ticket TicketRef[T-000123]        │
│ status: current   applies_to: linux/ubuntu 24.04·22.04 amd64   last_verified 2026-07-01          │
├─ EVIDENCE LEDGER (AuditInspector §7.2, append-only) ─────────────────────────────────────────────┤
│ WHEN         KIND     ATTESTATION            RUN / SOURCES        CONTENT-BOUND   OUTCOME          │
│ 07-02 14:10  sandbox  ✔ gateway_delivered    R-00A9… hv-3f2c9a…   ✔ sha match     ✔ satisfies gate│
│ 07-01 09:22  crossref ◑ agent_asserted       3 origins (~heur)    —               ✕ never gates   │
│ 06-30 …      operator ◐ operator_review       —                    —               ✔ admitted     │
│   chain-verify: ✔ Gateway audit chain confirmed  (stale ⇒ ⚠ CANNOT CONFIRM, gold — never green)   │
├─ CHUNK / COVERAGE MAP ──────────────────────┬─ READING PANE (Workshop, DocReadingPane §5) ────────┤
│ #0 Growing a volume    ▣ covered  R-00A9…   │  <rendered body, covered spans shaded --paper-200>  │
│ #1 lvextend flags      ▣ covered  R-00A9…   │  uncovered prose bears a ▢ margin mark + "not       │
│ #2 “also works on…”    ▢ UNCOVERED          │   execution-covered" gutter note                    │
│ sources: gnu.org (~heuristic origin-cluster)  ·  git history ▸ (opens AuditInspector git view)     │
└─────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
```

- **Attestation column renders `gateway_delivered` vs `agent_asserted` as `TierBadge` / `StatePill`** — `gateway_delivered` = Verified (`--ok` ✔); `agent_asserted` = Single/asserted (`--attn` ◑) **with the printed constitutional fact "✕ never satisfies the gate"** (PLAN §2.2/§2.4). This is a §4.7 **destructive-absence rendering**: agent-asserted evidence *cannot by construction* admit — printed as an affirmative explained absence with no interactive affordance, **never a greyed "admit anyway" toggle**.
- **`content-bound` column** shows `attested_content_sha256` equality with current body (PLAN §2.2 F1) — a green ✔ sha-match or, if bytes drifted, a gold `⚠ evidence stale — attests a superseded byte-state`.
- **Heuristic origin-cluster labels render AS heuristic** — every `origin_cluster` and distinctness count carries the `~heuristic` micro-tag (§4.3 hard rule / PLAN §8.3); never drawn as a verified tier.
- **Chain-verify** uses §7.2 + §4.9: a stale/failed verify **never renders green** — `⚠ CANNOT CONFIRM CHAIN` in halt-gold, or `✕ CHAIN BROKEN` in danger-red for a detected break.
- **`ticket_id` = `TicketRef`** (deep-links to MC `/review/<ticket_id>`); any ticket-level `needs_review` on the proposal shows a `ReviewChip` §4.10 that **deep-links out** to MC/Board (Library does not clear ticket gates).
- **Read-only, always** (§7.2) — the inspector never edits history; corrections are new lineage docs (PLAN §1.1). No control here clears taint (§4.3: taint is display-of-truth, raised-only, server-owned).

**States:** Loaded / Loading (skeleton ledger + paper skeleton) / **Empty** never applies (a doc always has ≥1 source + frontmatter) — a `doc_id` with a missing body renders Pattern R `✕ body unavailable` / **Pattern R** malformed `doc_id` → "not a valid doc reference" / **Pattern D** git-history link degraded when the remote push backlog is loud (gold banner referencing Index Status, §4.9) / **Stop-engaged** header `HaltBand` read-only.

### 4.3 Ingestion Review Queue — Library's OWN admission gate (`library:admin`, human-only)

**This is the reconciliation §7.1 calls out explicitly: a DISTINCT gate that Library owns and does NOT live in MC, built with the `ReviewQueue` component anatomy — same batched rows, same `TierBadge` + `DangerAction`, *different queue and different authority*.** Cross-app tickets never appear here and Library admission items never appear in MC's `/review`. It admits externally-ingested docs to a trust tier; the review-item is a `doc_id`, not a Board `ticket_id`. Human twin of `/api/review-queue` + `/api/review-queue/{doc_id}/decision`. Gated to `library:admin`, human-principal-kind only (PLAN §5.5 finding F11) — never minted to an agent.

```
┌ INGESTION REVIEW · tier-2 admission gate   (library:admin · ◐ operator only)   ⟳ live 0.5s       │
│ switching: NORMAL      batch cap 10   [ select ≤10 ]   [ Admit selected ⚠ ]  [ Reject selected ⚠ ]│
├─ ReviewQueue §7.1 anatomy (DataTable §6.2, batched) ─────────────────────────────────────────────┤
│ ☐ TIER            DOC          PROPOSED_BY        TICKET      DISTINCTNESS        AGE   diff       │
│ ☐ ⧉ cross-ref.    lib-01K…     ⬡ agent:curator-03 [T-000341]  3 origins ~heur ⚠   2h   [view ▸]  │
│ ☐ ⧉ cross-ref.    lib-01L…     ⬡ agent:curator-07 [T-000341]  3 origins ~heur ⚠   2h   [view ▸]  │
│ ☐ ◑ single-source lib-01M…     ⬡ agent:curator-03 [T-000355]  1 origin (agent-picked ⚠) 4h [view]│
│   ⓘ agent-asserted sandbox evidence present on lib-01M → ✕ NOT admit-eligible (content-bound gate)│
├─ per-doc DIFF sub-pane (AdmissionDiff §5, Workshop) — opens on [view] ────────────────────────────┤
│  lib-01K  gnu.org  vs  quarantine body     +added / −removed markdown, frontmatter delta          │
│  sources: 3 clusters (~heuristic distinctness — NOT a verified-independence badge)                 │
│  [ Admit → cross-referenced ⚠ ]   [ Reject ⚠ ]     ← DangerAction §4.7 + ConfirmFriction §5.1     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**The content-bound admission gate is the emphasis of this screen (PLAN §2.2, threat axis §12.1):**
- **`agent-asserted` evidence is NEVER auto-admit-eligible.** Any doc whose only trusted-tier evidence is `agent_asserted` renders the printed §4.7 absence fact `✕ NOT admit-eligible — content-bound gate` (lock glyph, no affordance), *not* a disabled button. There is no UI path — and no MCP path (PLAN §7) — to `admitted` that bypasses the gate.
- **`sandbox-verified` auto-admits** (external verifier = the tier-0 sandbox via the Gateway, `gateway-cmdb-library-sandbox.md` §G6) — it does **not** appear in this human queue; it surfaces in the Spot-Audit Stream (§4.4) for oversight. **Structurally disabled until D-7 freezes** — pre-D7 there are zero auto-admissions, and the screen says so (see states).
- **`cross-referenced` needs batched review** — N≥3 distinct origins *raises queue priority, never confers trust* (PLAN §2.1). Distinctness is shown as **heuristic evidence with the `~heur` tag**, never a verified-independence badge (finding F7) — the copy under a distinctness cell literally reads "heuristic; the operator gate is the control."
- **Else → quarantine** (`single-source` / `agent-authored`) — retrievable only behind `include_unverified`, never admitted here.

**Anti-rubber-stamp mechanics (the human gate is not designed down, F7):** bulk-approve is capped at **default 10** (operator-tunable, PLAN §15.6) — the `[Admit selected]` `DangerAction` disables past the cap and states why; **agent-picked source sets render visually distinct** (`attached_by: agent` ⚠ marker) from service-discovered ones; a per-doc **`AdmissionDiff` (§5)** is one click away and the bulk action's `ConfirmFriction` §5.1 consequence block echoes the batch size and lists the `doc_id`s. Admit/Reject are `DangerAction` §4.7 (toward-more-content = the **full** friction variant, §5.1: typed-intent, red primary) — the operator is *adding trusted content to the shelf every agent reads*.

**States (§5.4):**
- **Loaded** — as above.
- **Loading** — skeleton rows.
- **Empty** — invitation: "No docs awaiting admission. Cross-referenced proposals land here for batched review; sandbox-verified docs auto-admit and appear in the Spot-Audit Stream." Not a shrug — names the two lanes.
- **Pattern R (red)** — a decision failed to persist (e.g. `op_id` replay mismatch, a doc already decided by another operator) — recoverable, red, restated in the interface's voice; the row re-syncs via `LiveStream` `event: reset` → REST re-read (§5.5).
- **Pattern D (gold)** — the git push backlog is loud (durability degraded, PLAN §1.1): a gold banner `⛊ DURABILITY DEGRADED · corpus push N min behind — admissions still record locally (canonical), retrying`. Admission is *not blocked* (local commit is canonical) but the operator is told honestly; past 30 min it escalates (§4.4/Index Status). **This is Pattern D, not R** — a dependency (remote) is degraded, gold, safe.
- **Stop-engaged** — `HaltBand` read-only; admission decisions are internal Standard-class state changes with no external effect (PLAN §5.5 manifest), so they continue under a kill (the band is informational). If auth is unreachable the shell renders the §5.5 "session ended — re-authenticate" state and the `library:admin` gate fails closed.

### 4.4 Tier-1 Spot-Audit Stream — auto-admissions surfaced for oversight

Sampled `sandbox-verified` auto-admissions for operator oversight (PLAN §8.4 / §2.2 sampling). Same `ReviewQueue` §7.1 anatomy, but the item is *already admitted* — the operator is auditing, not gating. `LiveStream` §5.5 feed. **Post-D7** (pre-D7 this stream is empty by construction — no auto-admit lane exists yet).

```
┌ TIER-1 SPOT-AUDIT · auto-admissions (sandbox-verified)   switching: ▲ TIGHTENED (100%)  ⟳ 0.3s   │
│ sample rate: 100% (young) — steady 5%   ANSI-Z1.4 switching · reason: harness_version change      │
├─ sampled rows (DataTable §6.2) ──────────────────────────────────────────────────────────────────┤
│ TIER            DOC       RUN / HARNESS         COVERED   admitted_by   AUDIT                       │
│ ✔ sandbox-ver.  lib-01N…  R-00B2… hv-3f2c9a…    ▣ 4/5     ⚙ svc(auto)   [ Confirm ok ]  [ Reject ⚠]│
│ ✔ sandbox-ver.  lib-01P…  R-00B4… hv-3f2c9a…    ▢ 2/6 ⚠   ⚙ svc(auto)   uncovered-heavy → inspect  │
│   Reject → doc rejected (synchronous index removal §1.3) + operator-confirmed cluster quarantine   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Switching-state indicator** = a `StatePill`-family chip: `NORMAL` (`--ink-700`) vs `▲ TIGHTENED` (`--attn`) with the machine reason verbatim (`harness_version change` / `confirmed poison`) — an honest "why we're at 100%" per PLAN §2.2 / §5.5 threat axis 5. **Never green** — tightened is attention-amber, an audit posture, not a health signal.
- **Uncovered-heavy rows are surfaced prominently** (`evidence_covered` low ratio, ▢ ⚠) — the anti-tier-riding cue (PLAN §2.4): the operator's eye goes to prose a sandbox run never touched.
- **Reject** = `DangerAction` §4.7 full friction: flips the doc to `rejected` (synchronous index removal, PLAN §1.3), trips tightened switching, and — **only when the implicated `origin_cluster` contains previously-admitted docs** — opens a *second, operator-confirmed* `ConfirmFriction` for cluster quarantine (PLAN §2.2 F16: cluster quarantine is never automatic, so a mis-clustered poison can't be weaponized into mass-suppression). **Confirm ok** = a light-verb `Toast` §6.5 ("Audit passed"), never gold.
- `run_id` / `harness_version` render as opaque mono chips (`TicketRef`-family, copy-on-click); `harness_version = hv-…` per `gateway-cmdb-library-sandbox.md` §G7.

**States:** Loaded / Loading (skeleton) / **Empty** — invitation that doubles as an honest pre-D7 statement: "No auto-admissions to audit. The sandbox-verified lane is **structurally disabled until the tier-0 sandbox seam freezes (D-7)** — until then every doc reaches trusted tier only through operator review." / **Pattern R** a reject failing to persist (re-sync via `LiveStream`) / **Pattern D** stream stalled past its bound → `Freshness` §4.9 degrades to `STALE`, gold, "audit feed stale — treat sampling as unconfirmed" (never a frozen-green feed) / **Stop-engaged** `HaltBand` read-only.

### 4.5 Collections & Lifecycle — management + retirement/supersession

Operator management of collections and the doc lifecycle (retire / supersede / staleness), `library:admin`. Human twin of `/api/collections` + `/api/docs/{doc_id}/retire|supersede`.

```
┌ COLLECTIONS & LIFECYCLE  (library:admin · ◐ operator)                                             │
│ collections: [ cli-reference ]  [ distro-guides ]  [ advisories ]   [ + New collection ]          │
├─ retirement / supersession queue (staleness surfaces here, DataTable §6.2) ───────────────────────┤
│ DOC        STATUS        applies_to           last_verified   FLAG                 action          │
│ lib-01Q…   ● current     ubuntu 22.04 amd64   2025-11-02      ▲ past valid_until   [ Retire ⚠ ]    │
│ lib-01R…   ● current     ubuntu 20.04 amd64   2025-08-14      ▲ distro EOL (CMDB)  [ Supersede ⚠ ] │
│ lib-01S…   ⇉ superseded  ubuntu 24.04 amd64   2026-06-30      superseded_by lib-01T…  (history)    │
│   Retire/Supersede preserve evidence history — never a body edit, never a delete (§1.1)           │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **STATUS = `StatePill` §4.5** (`current` ● / `superseded` ⇉ / `retired` ◼) — the lifecycle pill, not a bespoke chip.
- **Staleness flags** (`past valid_until`, distro-EOL computed at query time from CMDB `eol_date`, PLAN §3.6/§4.1) render as `--attn` ▲ flags — surfaced for a decision, **retirement is operator-decided, never automatic deletion** (PLAN §4.1).
- **Retire / Supersede = `DangerAction` §4.7 + `ConfirmFriction` §5.1** — they remove a doc from retrieval (irreversible for the current lineage), so full friction; the consequence block states "preserves evidence history; mints/links a new lineage doc, never edits bytes" (PLAN §1.1/§4.1). No delete affordance exists anywhere — deletion is not a capability (§4.7 destructive-absence: printed, not a greyed control).
- **New collection / rename** = `Field` §6.3 forms; benign `library:admin` writes; a light `Toast` on success.

**States:** Loaded / Loading (skeleton) / **Empty** — "No collections yet — create one to group reference docs" and, for the lifecycle queue, "Nothing stale. Docs past `valid_until` or on EOL distros surface here for retirement." / **Pattern R** a lifecycle write conflict (`op_id` replay / already superseded) — red, recoverable / **Pattern D** push backlog degraded banner (as §4.3) — gold, admission/lifecycle still records locally / **Stop-engaged** `HaltBand` read-only.

### 4.6 Index Status — health, degraded modes, rebuild (`library:admin`)

The rebuildable-index health readout and the reindex control. Human twin of `/api/admin/index-status` + `/api/admin/reindex`. This is where the Library's degraded modes (PLAN §3) are named honestly, using **`Freshness` §4.9 and the Pattern-D split §5.4** — the task's explicit requirement: push-backlog / `pending_embed` / lexical-only are **Pattern D degraded (gold), never red errors.**

```
┌ INDEX STATUS  (library:admin)                                                                     │
│ model_id: qwen3-emb-0.6b  digest 9c1f…  dim 1024      chunker_config_id: cc-2a7…                   │
│ corpus HEAD a9c… ✔  index_meta.corpus_commit a9c… ✔ (ancestor-or-equal)   built_at 2s ago ⟳       │
├─ health / degraded modes (Freshness §4.9 · Pattern D §5.4) ───────────────────────────────────────┤
│  ⛊ SEMANTIC RETRIEVAL DEGRADED — agent-runtime unreachable · serving lexical-only   (gold, Pat-D) │
│  ⛊ DURABILITY DEGRADED — corpus push 12 min behind · retrying · admissions record locally (canon) │
│  pending_embed: 3 docs — served from FTS half, vectors queued (retrieval_mode: partial)           │
│  ✔ corpus↔index consistent  ·  nightly integrity sweep: last 03:00 ✔                               │
├─ rebuild ─────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Full reindex (destroy + rebuild from corpus) ⚠ ]   ← DangerAction §4.7 + ConfirmFriction §5.1   │
│    consequence: suspends vector+FTS serving until rebuild completes; proves the §10 invariant       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **`model_id` / `dim` / `chunker_config_id` / `corpus_commit`** render as mono machine-truth (PLAN §1.3); `dim` is labeled config not constant (PENDING-SIZING).
- **Corpus↔index consistency = `Freshness`/false-green rule §4.9** — if `index_meta.corpus_commit` is not ancestor-or-equal of HEAD (index leads corpus, PLAN §1.5 F9), it shows `⚠ INDEX INVALID — serving suspended until rebuild` in **halt-gold**, never a green "OK." Search (§4.1) shows the matching suspended state.
- **Degraded-mode banners are Pattern D (gold ⛊), not Pattern R (red ✕):** lexical-only (runtime down), durability-degraded (push backlog, escalates past 30 min per PLAN §1.1), `pending_embed` partial. Each states "what's still true" per §5.4-D. A **genuine operator error** (e.g. a malformed reindex request) is the only red Pattern-R here.
- **Full reindex = `DangerAction` §4.7 full friction** — it suspends serving, so the consequence block states the blast radius and that stale results are withheld (not served) during rebuild (PLAN §3/§5.3). On completion a `Toast` §6.5 reports the two-part rebuild verdict (byte-identical manifest ✔ + recall@8/Spearman ≥0.95, PLAN §5.3).

**States:** Loaded / Loading (skeleton readout) / **Empty** never applies (there is always an index or an honest "no index — rebuild required" gold state) / **Pattern R** malformed reindex request → red / **Pattern D** the degraded banners above (the normal home of Library's degraded modes) / **Stop-engaged** `HaltBand` read-only; reindex is internal state, continues under kill but the band is shown.

---

## 5. App-specific components (justified — genuinely domain-unique)

Each is justified per §8.3: a domain-unique widget, **not** a re-draw of a shared entity. Trust badges, identities, tickets, halt, danger affordances, queues, ledgers all use the shared components above.

| Component | What it is | Why it cannot be a shared component |
|---|---|---|
| **`DocReadingPane`** | The Workshop content column that renders a corpus markdown doc on `--paper-*` (Source Serif 4, `--fs-read`) **with chunk boundaries and `evidence_covered` coverage shading** overlaid on the prose. | A rendered document with per-chunk coverage overlay is genuinely domain-unique to a RAG reading surface — analogous to Notes' editor or a PageGrid (§8.3 explicitly blesses "an editor, a graph, a PageGrid"). It renders *content*, not any §4 safety entity; the tier/coverage/taint chips on it are the shared `TierBadge`/`StatePill`. |
| **`ScopeResolver`** | The retrieval-scope control on Search: the `host_id` **XOR** `target_os/distro/version/arch` selector, the resolved `version_scope` state (exact/approximate/unverified), and the `include_unverified` toggle. | Version-scoped retrieval against CMDB host facts (`cmdb-library-hostfacts.md`) is a Library-specific query shape — the mutually-exclusive scope inputs and the fail-loud `version_scope` flag have no analogue elsewhere in the suite. Built *from* `Field` §6.3 inputs; it does not re-draw a shared control, it composes them into a domain query. |
| **`AdmissionDiff`** | The per-doc diff sub-pane in the Review Queue / Spot-Audit: quarantine-body vs source markdown + frontmatter delta, with agent-picked-source markers. | A markdown/frontmatter diff for a poisoning-review gate is domain-unique (the anti-rubber-stamp evidence surface, finding F7). It sits *inside* the shared `ReviewQueue` §7.1 anatomy and reuses `TierBadge`/`PrincipalRef`; only the diff rendering itself is bespoke, and diffing corpus content is not a shared pattern. |

Everything else on every screen is a cited shared component. No bespoke ticket chip, identity chip, tier badge, halt band, danger button, queue, or ledger is introduced — reusing those verbatim is the whole point (§8).

---

## 6. Review-queue reconciliation (how Library relates to MC's canonical `ReviewQueue`)

Per §7.1's explicit Library carve-out: **Library owns a DISTINCT gate that reuses the `ReviewQueue` component anatomy but is a separate queue with separate authority.**

- **Ingestion admission (§4.3) and the Tier-1 spot-audit (§4.4) are Library-owned gates** — *admit externally-ingested docs to a trust tier* (`library:admin`, human-only). They **do not live in MC**, are **not** the ticket-review queue, and their item identity is a `doc_id`, not a Board `ticket_id`. Cross-app tickets never appear here; Library admission items never appear in MC's `/review`.
- They render with the shared **`ReviewQueue` §7.1 anatomy** — batched `DataTable` rows, per-item `TierBadge`, per-doc diff (`AdmissionDiff`), bulk-approve with a batch cap (default 10), `DangerAction` admit/reject. **No bespoke approval visual** — that would be the exact consistency failure §7.1 warns against.
- **For any ticket-level gate** (a proposal's Board `ticket_id` in `needs_review`/escalation), Library **consumes** the canonical pattern read-only: it renders a `ReviewChip` §4.10 and **deep-links out** to MC `/review/<ticket_id>` — it never hosts a "clear review" control for a ticket gate (§4.10: "apps surface it; only MC/Board clear it").
- Library **hosts no MC `ReviewQueue` decision** and mints no approval record (PLAN §13 — no approval-record authority). Its own admit/reject writes are internal Standard-class state changes (PLAN §5.5 manifest), distinct from MC's browser-direct-to-Board approvals.

**Summary: DISTINCT gate (owns ingestion admission) + deep-links to MC for ticket-level review.**

---

## 7. Human-surface API (screens/states over one shared state)

Both surfaces are clients of the one core API (PLAN §6); the UI half maps as below. Every read here is the same state the MCP tool reads — two views, one state (§8.4).

| Screen | Reads | Writes (all `DangerAction` where destructive/admin) | MCP sibling |
|---|---|---|---|
| Corpus Browser / Search | `POST /api/search` · `GET /api/docs/{doc_id}?body=true` | — | `library_search`, `library_get_doc` |
| Doc / Provenance Inspector | `GET /api/docs/{doc_id}` · `GET /api/docs/{doc_id}/chunks` | — (read-only, §7.2) | `library_get_doc` |
| Ingestion Review Queue | `GET /api/review-queue` (+`LiveStream`) | `POST /api/review-queue/{doc_id}/decision` (admit/reject; `library:admin`, `op_id`) | *none — no MCP path to `admitted`* (PLAN §7) |
| Tier-1 Spot-Audit Stream | `GET /api/review-queue` (tier-1 stream, +`LiveStream`) | `POST /api/review-queue/{doc_id}/decision` (reject + cluster-quarantine confirm) | *none* |
| Collections & Lifecycle | `GET /api/collections` | `POST/PATCH /api/collections` · `POST /api/docs/{doc_id}/retire\|supersede` (`library:admin`) | *none* |
| Index Status | `GET /api/admin/index-status` (+`LiveStream`) | `POST /api/admin/reindex` (`library:admin`) | *none* |

- **Proposal path is agent-first** (`library_propose` / `attach_sources` / `attach_sandbox_evidence` / `request_admission`, MCP) but an operator may also propose via a thin `POST /api/proposals` form reachable from the Review Queue empty-state — the operator is a `propose`-capable principal too (PLAN §2.2 transition table).
- **Every mutating UI action carries a caller-minted `op_id`** (PLAN §6, IDENTIFIERS.md) so a double-click/replay collapses to the prior result.
- **`library:admin` is human-principal-kind-gated** (PLAN §5.5 F11) — the admin screens (Review, Spot-Audit, Collections, Index Status) are unreachable by an agent principal; the shell renders the §5.5 "session ended" / scope-denied state honestly, never a fabricated-empty screen.

---

## 8. Consistency notes (what is consumed from where)

- **Safety grammar (§4):** `TierBadge` (the four tiers + `curation-ingested` UNTRUSTED taint + `gateway_delivered`/`agent_asserted` attestation — exercised harder here than anywhere in the suite), `StatePill` (admission/status lifecycle), `TicketRef` (`doc_id` + `ticket_id`, opaque), `PrincipalRef` (`proposed_by`/`admitted_by`/`attached_by`), `HaltBand` **read-only**, `DangerAction`+`ConfirmFriction` (admit/reject/retire/supersede/reindex — the operator gate), `ReviewChip` (deep-links out to MC), `Freshness` (index age, push lag, feed staleness — false-green prohibition on corpus↔index and chain-verify). **No `FenceState`** (no lease/mutex/fence authority).
- **Interaction grammar (§5):** `ConfirmFriction` full variant on every trusted-content mutation; `Shift+Esc` global halt-focus with the documented fallback chord; Pattern R (red, recoverable) strictly distinguished from Pattern D (gold, dependency-degraded — lexical-only / push-backlog / pending_embed / index-invalid); `LiveStream` on the review queue, spot-audit, and index-status feeds (advisory/observed reconciliation via read-time re-derivation).
- **Shared chrome (§6):** `AppShell` (rail + suite switcher + read-only suite-posture line + operator identity), `DataTable` (every list), `Field` (search, scope, decision notes, collections), `Modal` (confirms, halt cut out of scrim), `Toast` (transient action confirmation, never for degraded state).
- **Cross-app patterns (§7):** `AuditInspector` §7.2 provenance mode (the Doc Inspector — consumed, not forked); `ReviewQueue` §7.1 **anatomy** reused for the Library-owned distinct admission gate (§6 above); `LiveAgentView` §7.3 **not consumed** (Library renders no fleet — `proposed_by` deep-links to MC's `/agents/<sub>` where a live view exists, via the shared `PrincipalRef` link).
- **Archetype discipline (§2):** the paper reading surface appears **only** inside `DocReadingPane`; the shell, tables, and all §4 components stay Instrument-dark in both reading themes. This is what keeps the Library and the Gateway legibly the same company.
