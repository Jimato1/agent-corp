# Helm · Claude Design injection block — Reference Library (`library`)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Reference Library (`library`)

**Purpose (one line):** The corporate reference shelf — a curated RAG corpus of externally-authored documentation (vendor docs, man pages, distro guides) that agents query for fast, *cited, tier-tagged, version-correct* confirmation instead of trusting model priors; the human surface lets the operator search it, inspect provenance, and run the ingestion admission gate.

**Who uses it:** Both. The MCP agent surface (search, propose ingestion, attach evidence) and this human UI are siblings over one shared state. Every screen described here is **operator-facing**; three of the six admin screens (Ingestion Review, Spot-Audit, Collections, Index Status) are gated to `library:admin` and are **human-principal-kind only** — an agent principal can never reach them.

**Archetype:** **Both** — a Workshop reading pane living inside an Instrument shell. Dense retrieval/ledger/queue tables are Instrument-dark; the *document body only* renders as lit paper (`--paper-100 #F5F3ED`, Source Serif 4, `--fs-read` 17/28). The shell, nav, every table, and every safety component stay Instrument-dark in both reading themes.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **`TierBadge` (§4.3)** — this app exercises it *hardest*. Shape = severity family, text = exact tier, glyph = independence: **Verified** `--ok #46B98A` outline + ✔ (`sandbox-verified`, `gateway_delivered` evidence); **Corroborated** `--signal #29B6D8` outline + ⧉ (`cross-referenced`); **Single/asserted** `--attn #E8B84B` outline + ◑ "treat with suspicion" (`single-source`, `agent-authored`/`agent_asserted`); **Untrusted input** = `--attn` **striped** outline + ⚠ + the word `UNTRUSTED` on hover (`curation-ingested` taint — rides on *every* ingested result; the operator's cue that the content is adversarial input and its consuming plan is auto-lane-ineligible). Hard rule: **heuristic labels render as heuristic** — origin-cluster / distinctness counts carry a `~heuristic` micro-tag and are never drawn as a verified tier. Tier is a **badge, never a sort key**.
- **`TicketRef` (§4.1)** — opaque mono chip, copy-on-click, middle-truncates. Used for `doc_id` (the durable citation) and `ticket_id` (deep-links to MC `/review/<ticket_id>`), plus `run_id` / `harness_version` as `TicketRef`-family mono chips. `chunk_id` is never surfaced as a citation.
- **`PrincipalRef` (§4.2)** — kind-glyphed mono `sub`: ⬡ agent / ◐ operator / ⚙ service. Renders `proposed_by` / `admitted_by` / `attached_by`. Click → MC `/agents/<sub>`.
- **`StatePill` (§4.5)** — one glyph+label pill per lifecycle state, never color-only: `● current`, `⇉ superseded`, `◼ retired`, `● ADMITTED`. Also carries the switching-state chip (`NORMAL` / `▲ TIGHTENED`).
- **`HaltBand` (§4.6)** — full-width gold `--halt-500 #F2842B` band under the header, **read-only in this app** (Library is not in the kill chain and hosts no actuator). Interlock ▮▮ (engaged) / shield ⛊ (safe-stopped). Informational + deep-links to MC/auth. Library keeps serving benign reads under a kill by design.
- **`DangerAction` (§4.7) + `ConfirmFriction` (§5.1)** — every admit / reject / retire / supersede / reindex. All are "toward MORE content/action" → the **full** friction variant: danger-red `#E5594E` primary behind typed-intent + step-up re-auth; consequence block states direction and blast radius. Also enforces the **destructive-absence rule**: "cannot admit by construction" is printed as an affirmative fact with a 🔒 lock glyph and **no affordance** — never a greyed-out "admit anyway" toggle, never the ⛔ glyph.
- **`Freshness` (§4.9)** — `⟳` age + source stamp on index age, push lag, feed staleness. **Never a false green:** a stale/failed read renders the honest unknown in halt-gold (`⚠ CANNOT CONFIRM…`), never a fabricated "OK."
- **`ReviewChip` (§4.10)** — needs-review/escalation pill on a proposal's `ticket_id`; **deep-links OUT** to MC/Board (Library never clears a ticket gate).
- **`AppShell` (§6.1)** — dark side-rail + header (app name + one-line identity + `SYSTEM STATE` zone + operator identity) + suite switcher + read-only halt mirror.
- **`DataTable` (§6.2)** — dense zebra `--sub-750`, sticky sortable header, mono ID column with copy, bulk-select where noted. The truth-surface of every list here.
- **`Field` (§6.3)** — search bar, scope inputs, decision notes, collection forms; inline validation.
- **`Modal` (§6.4)** / **`Toast` (§6.5)** — confirms (halt cut above scrim); toasts match the action verb, **never gold**, never for degraded state.
- **`LiveStream` (§5.5)** — SSE on the review queue, spot-audit, and index-status feeds; `event: reset` → REST re-read; every streamed figure carries `Freshness`.
- **Cross-app patterns:** **`AuditInspector` (§7.2) provenance mode** (the Doc Inspector — consumed, not forked) and **`ReviewQueue` (§7.1) anatomy** (reused for the Library-OWNED admission gate — same component, *different queue and different authority*). **`LiveAgentView` (§7.3) is NOT consumed** — Library renders no fleet; `proposed_by` just deep-links to MC.
- **NOT used: `FenceState` (§4.4)** — Library holds no lease/mutex/fence authority; it never draws a fencing chip. No kill actuator, no approval-record minting.

**⌗ Screens & views to build:**

**1. Corpus Browser / Hybrid Search** — Instrument list + Workshop reading pane. The default screen and human twin of `library_search`.
```
┌ AppShell: ⬢ LIBRARY · the corporate reference shelf   SYSTEM STATE ⟳ G0 fresh 0.4s   ◐ ada ┐
├─[ read-only HaltBand mirror when kill level > G0 ]────────────────────────────────────────┤
│ ScopeResolver:  ⌕ [ how to extend an lvm volume____ ]  / to focus                          │
│   scope ◉ host_id [host_9f2…]  ○ target: os[linux▾] distro[ubuntu▾] ver[24.04▾] arch[…▾]   │
│   version_scope: ✔ exact (CMDB fresh 1.2s)   k [8]   include_unverified ☐                   │
├──────────────── results (DataTable) ───────────────────────────┬─ READING PANE (Workshop) ┤
│ TIER            DOC › heading anchor          VER    COVER TAINT│  --paper-100, Serif 4,   │
│ ✔ sandbox-ver.  lib-01J… › lvextend › Growing exact  ▣cov ⚠ing │  --fs-read               │
│ ⧉ cross-ref.    lib-01H… › LVM2 › Resize      exact  ▢unc ⚠ing │  <title, version scope>  │
│ ◑ single-source lib-01G… › blog › "just run…" ~appr  ▢unc ⚠ing │  rendered body,          │
│ ◑ agent-authored lib-01F… › note-derived      exact  ▢unc ⚠ing │  covered spans shaded    │
│  … RRF-fused; tier is a badge, NOT a sort key …                │  --paper-200             │
│ retrieval_mode: hybrid       source: index @corpus a9c… 0.3s   │                          │
└────────────────────────────────────────────────────────────────┴──────────────────────────┘
```
Left column carries the **full trust envelope inline on every hit**: TIER (`TierBadge`), VER (`version_scope` chip: exact / ~approximate / unverified), COVER (per-chunk `evidence_covered`: ▣ covered / ▢ uncovered — anti-tier-riding), TAINT (`curation-ingested` UNTRUSTED striped-amber on *every* row). Primary action: type a query; select a row to load the reading pane.
- **Loaded:** as above.
- **Loading:** static skeleton rows in the table; paper skeleton in the reading pane. Never a spinner.
- **Empty (no query):** invitation — "Search the reference shelf. Results carry their provenance tier, version scope, and evidence coverage inline." One CTA: focus the search field. **Empty (zero hits):** "No admitted docs match this scope. Try `include_unverified` to see quarantined material (flagged), or widen the version target." — names the one action.
- **Pattern R (red ✕):** recoverable operator error — `scope_conflict` (both `host_id` AND `target_*` set — never silent precedence), malformed `k`, rejected FTS query. Inline `Field` validation, red, local.
- **Pattern D (gold ⛊):** dependency degraded, rendered as a safe reduced mode, never red — *agent-runtime down* → `⛊ SEMANTIC RETRIEVAL DEGRADED · serving lexical-only`, `retrieval_mode: lexical_only` chip, FTS results still stream; *CMDB down* → version filter disabled, every hit flagged `version_scope: unverified` in gold; *`pending_embed`* → `retrieval_mode: partial` chip; *index invalid (corpus↔index commit mismatch)* → `⛊ RETRIEVAL SUSPENDED · index rebuilding (stale results withheld)` linking to Index Status (false-green rule — no fabricated results).
- **Stop-engaged:** read-only `HaltBand` in header; reads keep serving.

**2. Doc / Provenance Inspector** — `AuditInspector` §7.2 provenance mode + Workshop body. The read-only truth of *where a doc came from and who touched it*.
```
┌ lib-01J…  "lvextend — LVM2 2.03"  [copy]   ● ADMITTED  ✔ sandbox-verified  ⚠ curation-ingested │
│ proposed_by ⬡ agent:curator-03 · admitted_by ◐ operator:ada · ticket [T-000123]                │
│ status: current   applies_to: linux/ubuntu 24.04·22.04 amd64   last_verified 2026-07-01         │
├─ EVIDENCE LEDGER (append-only) ─────────────────────────────────────────────────────────────────┤
│ WHEN        KIND      ATTESTATION           RUN / SOURCES      CONTENT-BOUND   OUTCOME            │
│ 07-02 14:10 sandbox   ✔ gateway_delivered   R-00A9… hv-3f2c9a  ✔ sha match     ✔ satisfies gate  │
│ 07-01 09:22 crossref  ◑ agent_asserted      3 origins ~heur    —               ✕ never gates     │
│ 06-30 …     operator  ◐ operator_review      —                  —               ✔ admitted        │
│  chain-verify: ✔ Gateway audit chain confirmed  (stale ⇒ ⚠ CANNOT CONFIRM, gold — never green)   │
├─ CHUNK / COVERAGE MAP ─────────────────────┬─ READING PANE (Workshop, DocReadingPane) ───────────┤
│ #0 Growing a volume  ▣ covered  R-00A9…    │  <rendered body, covered spans shaded --paper-200>  │
│ #1 lvextend flags    ▣ covered  R-00A9…    │  uncovered prose bears a ▢ margin mark +            │
│ #2 "also works on…"  ▢ UNCOVERED           │   "not execution-covered" gutter note               │
│ sources: gnu.org (~heuristic origin-cluster) · git history ▸ (opens AuditInspector git view)      │
└────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
```
The **ATTESTATION column** is the heart: `gateway_delivered` = Verified `--ok` ✔; `agent_asserted` = Single/asserted `--attn` ◑ **printed with the constitutional fact "✕ never satisfies the gate"** — rendered as a §4.7 destructive-absence (affirmative explained absence, no interactive affordance, never a greyed "admit anyway" toggle). **CONTENT-BOUND column** = `attested_content_sha256` equality vs current body: green ✔ sha-match, or gold `⚠ evidence stale — attests a superseded byte-state`. Chain-verify never renders green when stale/failed (halt-gold `⚠ CANNOT CONFIRM CHAIN`, or danger-red `✕ CHAIN BROKEN`). Read-only always; no control clears taint. Primary action: none (read-only) except deep-links out.
- **Loaded / Loading** (skeleton ledger + paper skeleton). **Empty never applies** (a doc always has ≥1 source + frontmatter); a missing body → Pattern R `✕ body unavailable`. **Pattern R:** malformed `doc_id` → "not a valid doc reference." **Pattern D:** git-history link degraded when remote push backlog is loud (gold banner → Index Status). **Stop-engaged:** read-only `HaltBand`.

**3. Ingestion Review Queue** — Library's OWN admission gate (`library:admin`, human-only). Instrument. Reuses `ReviewQueue` §7.1 anatomy but is a **DISTINCT queue with distinct authority** — item id is `doc_id` (not a Board `ticket_id`), does **not** live in MC, and cross-app tickets never appear here.
```
┌ INGESTION REVIEW · tier-2 admission gate  (library:admin · ◐ operator only)  ⟳ live 0.5s          │
│ switching: NORMAL   batch cap 10   [ select ≤10 ]  [ Admit selected ⚠ ]  [ Reject selected ⚠ ]    │
├─ ReviewQueue anatomy (DataTable, batched) ────────────────────────────────────────────────────────┤
│ ☐ TIER            DOC       PROPOSED_BY         TICKET      DISTINCTNESS          AGE  diff         │
│ ☐ ⧉ cross-ref.    lib-01K…  ⬡ agent:curator-03  [T-000341]  3 origins ~heur ⚠    2h   [view ▸]    │
│ ☐ ⧉ cross-ref.    lib-01L…  ⬡ agent:curator-07  [T-000341]  3 origins ~heur ⚠    2h   [view ▸]    │
│ ☐ ◑ single-source lib-01M…  ⬡ agent:curator-03  [T-000355]  1 origin (agent-picked ⚠) 4h [view]   │
│   ⓘ agent-asserted sandbox evidence present on lib-01M → ✕ NOT admit-eligible (content-bound gate) │
├─ per-doc DIFF sub-pane (AdmissionDiff, Workshop) — opens on [view] ────────────────────────────────┤
│  lib-01K   gnu.org  vs  quarantine body    +added / −removed markdown, frontmatter delta           │
│  sources: 3 clusters (~heuristic distinctness — NOT a verified-independence badge)                  │
│  [ Admit → cross-referenced ⚠ ]   [ Reject ⚠ ]   ← DangerAction full friction                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
The poisoning-defense emphasis of the whole app: **`agent-asserted` evidence is NEVER auto-admit-eligible** → printed §4.7 absence fact `✕ NOT admit-eligible — content-bound gate` (lock glyph, no affordance, no MCP bypass path either). **`sandbox-verified` auto-admits** (external verifier via Gateway) and does NOT appear here — it surfaces in the Spot-Audit stream. **`cross-referenced` needs batched review** — N≥3 distinct origins *raises queue priority, never confers trust*; distinctness shown as `~heur` evidence, copy literally reads "heuristic; the operator gate is the control." **Else → quarantine** (`single-source`/`agent-authored`, retrievable only behind `include_unverified`). **Anti-rubber-stamp friction:** bulk-approve capped at **default 10** (the `[Admit selected]` DangerAction disables past the cap and states why); agent-picked source sets render visually distinct (⚠ marker); `AdmissionDiff` one click away; the bulk `ConfirmFriction` echoes batch size + lists the `doc_id`s. Admit/Reject = full friction (typed-intent + red primary) — "adding trusted content to the shelf every agent reads."
- **Empty:** invitation naming the two lanes — "No docs awaiting admission. Cross-referenced proposals land here for batched review; sandbox-verified docs auto-admit and appear in the Spot-Audit Stream." **Pattern R:** a decision failed to persist (`op_id` replay, already-decided-by-another-operator) — red, row re-syncs via `LiveStream` reset. **Pattern D:** git push backlog loud → gold `⛊ DURABILITY DEGRADED · corpus push N min behind — admissions still record locally (canonical), retrying` (admission NOT blocked; escalates past 30 min). **Stop-engaged:** read-only `HaltBand`; admission decisions are internal Standard-class changes and continue under a kill; if auth is unreachable, the shell renders the "session ended — re-authenticate" state and the `library:admin` gate fails closed.

**4. Tier-1 Spot-Audit Stream** — auto-admissions surfaced for oversight. Instrument, `ReviewQueue` anatomy, `LiveStream` feed. The operator is *auditing already-admitted docs, not gating*.
```
┌ TIER-1 SPOT-AUDIT · auto-admissions (sandbox-verified)  switching: ▲ TIGHTENED (100%)  ⟳ 0.3s     │
│ sample rate: 100% (young) — steady 5%   ANSI-Z1.4 switching · reason: harness_version change       │
├─ sampled rows (DataTable) ─────────────────────────────────────────────────────────────────────────┤
│ TIER            DOC       RUN / HARNESS       COVERED   admitted_by   AUDIT                          │
│ ✔ sandbox-ver.  lib-01N…  R-00B2… hv-3f2c9a   ▣ 4/5     ⚙ svc(auto)   [ Confirm ok ]  [ Reject ⚠ ]  │
│ ✔ sandbox-ver.  lib-01P…  R-00B4… hv-3f2c9a   ▢ 2/6 ⚠   ⚙ svc(auto)   uncovered-heavy → inspect     │
│  Reject → doc rejected (synchronous index removal) + operator-confirmed cluster quarantine          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
**Switching-state chip** (`StatePill` family): `NORMAL` `--ink-700` vs `▲ TIGHTENED` `--attn` with the machine reason verbatim — **never green** (tightened is an audit posture, not health). **Uncovered-heavy rows surface prominently** (low `evidence_covered`, ▢⚠) — the anti-tier-riding cue drawing the eye to prose a sandbox never touched. **Reject** = full-friction DangerAction: flips to `rejected` (synchronous index removal), trips tightened switching, and — **only when the implicated `origin_cluster` contains previously-admitted docs** — opens a *second* operator-confirmed `ConfirmFriction` for cluster quarantine (never automatic, so a mis-clustered poison can't be weaponized into mass-suppression). **Confirm ok** = a light-verb `Toast` ("Audit passed"), never gold.
- **Empty** doubles as the honest pre-D7 statement: "No auto-admissions to audit. The sandbox-verified lane is **structurally disabled until the tier-0 sandbox seam freezes (D-7)** — until then every doc reaches trusted tier only through operator review." **Pattern R:** reject failed to persist → re-sync via `LiveStream`. **Pattern D:** feed stalled past bound → `Freshness` degrades to `STALE`, gold, "audit feed stale — treat sampling as unconfirmed" (never a frozen-green feed). **Stop-engaged:** read-only `HaltBand`.

**5. Collections & Lifecycle** — management + retirement/supersession (`library:admin`). Instrument.
```
┌ COLLECTIONS & LIFECYCLE  (library:admin · ◐ operator)                                             │
│ collections: [ cli-reference ]  [ distro-guides ]  [ advisories ]   [ + New collection ]          │
├─ retirement / supersession queue (staleness surfaces here, DataTable) ─────────────────────────────┤
│ DOC       STATUS       applies_to          last_verified  FLAG                action               │
│ lib-01Q…  ● current    ubuntu 22.04 amd64  2025-11-02      ▲ past valid_until  [ Retire ⚠ ]        │
│ lib-01R…  ● current    ubuntu 20.04 amd64  2025-08-14      ▲ distro EOL (CMDB) [ Supersede ⚠ ]     │
│ lib-01S…  ⇉ superseded ubuntu 24.04 amd64  2026-06-30      superseded_by lib-01T… (history)        │
│  Retire/Supersede preserve evidence history — never a body edit, never a delete                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
STATUS = `StatePill` (`● current` / `⇉ superseded` / `◼ retired`). Staleness flags (`past valid_until`, distro-EOL computed at query time from CMDB `eol_date`) render as `--attn ▲` — surfaced for a decision, **retirement is operator-decided, never automatic deletion**. Retire/Supersede = full-friction DangerAction; consequence block states "preserves evidence history; mints/links a new lineage doc, never edits bytes." **No delete affordance exists anywhere** — deletion is not a capability (destructive-absence: printed, not a greyed control). New collection/rename = `Field` forms, light `Toast` on success.
- **Empty:** "No collections yet — create one to group reference docs" and "Nothing stale. Docs past `valid_until` or on EOL distros surface here for retirement." **Pattern R:** lifecycle write conflict (`op_id` replay / already superseded), red. **Pattern D:** push-backlog gold banner (as screen 3). **Stop-engaged:** read-only `HaltBand`.

**6. Index Status** — health, degraded modes, rebuild (`library:admin`). Instrument. The named home of the Library's degraded modes.
```
┌ INDEX STATUS  (library:admin)                                                                     │
│ model_id: qwen3-emb-0.6b  digest 9c1f…  dim 1024   chunker_config_id: cc-2a7…                      │
│ corpus HEAD a9c… ✔   index_meta.corpus_commit a9c… ✔ (ancestor-or-equal)   built_at 2s ago ⟳      │
├─ health / degraded modes (Freshness · Pattern D) ──────────────────────────────────────────────────┤
│  ⛊ SEMANTIC RETRIEVAL DEGRADED — agent-runtime unreachable · serving lexical-only  (gold, Pat-D)  │
│  ⛊ DURABILITY DEGRADED — corpus push 12 min behind · retrying · admissions record locally (canon) │
│  pending_embed: 3 docs — served from FTS half, vectors queued (retrieval_mode: partial)           │
│  ✔ corpus↔index consistent  ·  nightly integrity sweep: last 03:00 ✔                              │
├─ rebuild ──────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Full reindex (destroy + rebuild from corpus) ⚠ ]   ← DangerAction full friction                │
│    consequence: suspends vector+FTS serving until rebuild completes; proves the rebuildable invariant│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
`model_id` / `dim` / `chunker_config_id` / `corpus_commit` render as mono machine-truth. **Corpus↔index consistency uses the false-green rule** — if `index_meta.corpus_commit` is not ancestor-or-equal of HEAD (index leads corpus), it shows `⚠ INDEX INVALID — serving suspended until rebuild` in **halt-gold**, never a green OK. Degraded-mode banners are **Pattern D (gold ⛊), not red** — lexical-only, durability-degraded (escalates past 30 min), `pending_embed` partial; each states "what's still true." The only red Pattern-R here is a genuine operator error (malformed reindex request). Full reindex = full-friction DangerAction; consequence states blast radius (stale results withheld, not served, during rebuild); on completion a `Toast` reports the two-part verdict (byte-identical manifest ✔ + recall@8/Spearman ≥0.95).
- **Empty never applies** (there is always an index or an honest "no index — rebuild required" gold state). **Stop-engaged:** read-only `HaltBand`; reindex continues under kill (band informational).

**◈ App-specific components (only where justified):**
- **`DocReadingPane`** — the Workshop content column that renders a corpus markdown doc on `--paper-*` (Source Serif 4, `--fs-read`) **with chunk boundaries and `evidence_covered` coverage shading overlaid on the prose** (covered spans shaded `--paper-200`; uncovered prose bears a ▢ margin mark + "not execution-covered" gutter note). Not a shared component: a rendered document with per-chunk coverage overlay is domain-unique to a RAG reading surface (the design system explicitly blesses "an editor, a graph, a PageGrid"). It renders *content*, not any §4 safety entity; the tier/coverage/taint chips on it are the shared `TierBadge`/`StatePill`.
- **`ScopeResolver`** — the retrieval-scope control on Search: the `host_id` **XOR** `target_os/distro/version/arch` selector, the resolved `version_scope` state (exact / ~approximate / unverified) shown honestly, and the `include_unverified` toggle. Not shared: version-scoped retrieval against CMDB host facts is a Library-specific query shape; the mutually-exclusive scope inputs (both set → typed `scope_conflict`, never silent precedence) and the fail-loud `version_scope` flag have no analogue elsewhere. Composed *from* `Field` §6.3 inputs; it does not re-draw a shared control.
- **`AdmissionDiff`** — the per-doc diff sub-pane inside the Review Queue / Spot-Audit: quarantine-body vs source markdown + frontmatter delta, with agent-picked-source markers. Not shared: a markdown/frontmatter diff for a poisoning-review gate is the anti-rubber-stamp evidence surface (finding F7). It sits *inside* the shared `ReviewQueue` anatomy and reuses `TierBadge`/`PrincipalRef`; only the diff rendering itself is bespoke.

**⚠ Safety / danger surfaces specific to this app:**
- **The provenance-honesty invariant is the app's signature:** trust is always *shown, never inferred* — tier + version-scope + evidence-coverage + `curation-ingested` taint travel inline with **every** search hit and **every** chunk, and heuristics (origin-cluster, distinctness counts) render *as heuristic* with a `~heur` tag, never as a verified tier. `curation-ingested` UNTRUSTED striped-amber on every ingested result is the operator's cue that the content is adversarial LLM-input and auto-lane-ineligible.
- **The content-bound admission gate (poisoning defense):** `sandbox-verified` auto-admits (external verifier = tier-0 sandbox via the Gateway) → surfaced in Spot-Audit for oversight, not gated by a human; `cross-referenced` → batched operator review (distinctness raises priority, never confers trust); `agent-asserted` evidence is **NEVER** auto-admit-eligible → rendered as a printed constitutional absence (🔒 lock glyph, no affordance, no MCP bypass path); everything else → quarantine (retrievable only behind `include_unverified`). This is the whole security posture of the app made visible.
- **Anti-rubber-stamp friction on the human gate:** bulk-approve capped at default 10 (the DangerAction disables past the cap and says why); agent-picked source sets render visually distinct; the diff is always one click away; cluster quarantine on a poison-reject is a *second, never-automatic* operator confirmation.
- **Honest-degraded states (Pattern D, gold, never red):** lexical-only (runtime down), version-filter-off (CMDB down), `pending_embed` partial, index-invalid serving-suspended, durability-degraded (push backlog). The false-green prohibition binds corpus↔index consistency and chain-verify — a stale read renders the honest unknown in halt-gold, never a fabricated OK.
- **Read-only halt visibility:** Library is *not* in the kill chain — it renders `HaltBand` read-only and deep-links to MC/auth; it holds no credentials, no fencing, no kill actuator, no approval-record authority, and mints no ticket-gate clear.

**⚑ Gaps flagged:** None — the spec is complete for design. It consumes the frozen design system and specifies deltas only; the one config-not-constant value it flags (`dim 1024` labeled PENDING-SIZING) is a data value to display as machine-truth, not a design decision, and the sandbox auto-admit lane's structural-disable-until-D-7 state is fully specified as an empty-state.
