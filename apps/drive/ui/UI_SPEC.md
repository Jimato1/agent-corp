# UI_SPEC.md — Drive (`drive`) · Stage-3 UI/UX Specification

**Scope:** the human surface of Drive — the artifact store for every non-markdown output of agent work, keyed by the ticket that produced it. This spec covers screens, states, and the two-view split only. **Design specification, not build.** Data model, HTTP/MCP API, and all semantics are frozen in `apps/drive/planning/PLAN.md` (esp. §4 API, §5 MCP, §6 UI, §4.1 download behavior); this document specifies how the operator *sees* that one shared state.

**Risk class:** Standard.

## Archetype declaration (DESIGN_SYSTEM §2)

Drive is **BOTH**:
- **Instrument** (control-room, dark `--sub-*`, compact) — the Ticket Browser, the Artifact Detail metadata/version rail, and the whole Admin console. This is `drive-admin`/`drive-browse` per the §2 archetype table.
- **Workshop** (a reading/preview pane inside the Instrument shell) — the **Preview Surface** only. Images sit on a neutral matte; `text/plain` renders on the `--paper-*` reading surface with Source Serif 4 body; PDFs render through the embedded `pdf` app. The surrounding shell, nav, header, and every §4 safety component stay Instrument-dark in both (the §2 hard rule).

**Governing principle.** Drive's job is *"every deliverable names the work that made it, and the store never lies about a file's provenance or whether it still belongs to a real ticket."* Provenance is the signature: `created_by`, three-state ticket verification, taint, derived-preview lineage, and fencing all ride the shared safety grammar so a Drive row reads identically to a Board row or a Gateway row. The one destructive act in the whole app — GC purge — is human-only, step-up-gated, and fail-closed.

---

## 1. Design-language note

**This spec consumes `context/DESIGN_SYSTEM.md` (FROZEN). Deltas only below.** Every shared entity renders via its canonical component — this document **cites by ID and does not re-draw** any §4/§5/§6/§7 component. Tokens, safety grammar, interaction grammar, and shared chrome are inherited wholesale. Drive introduces exactly three app-specific widgets (§4), each justified as genuinely domain-unique and none a re-draw of a shared entity.

**No SSE (explicit).** Drive is not a real-time surface. It is **not** in the `LiveStream` §5.5 consumer set (PLAN has no `ceremony_events`/SSE tail). Every live figure the UI shows (disk watermark, backup age, upload progress, ticket-recheck sweep results) is a **poll** carrying a `Freshness` §4.9 stamp — a poll-refreshed figure past its bound goes amber `▲ STALE`, never a frozen green. Escalations (`verified_absent`) surface in the Admin queue as a `ReviewChip` §4.10 and, once Chat exists, deep-link out as a Chat notification; there is no push channel in v1.

---

## 2. Shared components consumed (the consistency contract)

| Shared entity in Drive | Rendered as | Where |
|---|---|---|
| `ticket_id` (T-…) | **`TicketRef` §4.1** | every screen; groups the browser |
| Ticket verification (`verified` / `unverified_pending` / `verified_absent`) | **`StatePill` §4.5** beside the `TicketRef` (a §4.1 badge-beside, never recoloring the chip) | browser, detail, admin |
| `created_by` (`sub`) | **`PrincipalRef` §4.2** | every version row, every list row |
| Provenance / trust — `verified` ticket-state, `derived` preview, unverified-write | **`TierBadge` §4.3** | list rows, version rows, preview header |
| Fencing token per version | **`FenceState` §4.4** | Artifact Detail version history |
| Lifecycle (version state, upload state, GC state) | **`StatePill` §4.5** | detail, upload flow, admin |
| Kill-switch / dependency safe-stop | **`HaltBand` §4.6 (read-only)** | global header, all screens |
| GC purge (destructive) | **`DangerAction` §4.7 + `ConfirmFriction` §5.1 (full variant, step-up)** | Admin GC console |
| `verified_absent` escalation | **`ReviewChip` §4.10** | Admin escalation queue |
| Version history & audit-log | **`AuditInspector` §7.2** (append-only, provenance-lineage pivot) | Artifact Detail, Admin audit view |
| Fresh/mirrored figures (watermark, backup age, last-verify, sweep) | **`Freshness` §4.9** (never a false green) | Admin health strip |
| Shell, rail, suite switcher, operator identity, posture line | **`AppShell` §6.1** | every screen |
| Every truth table | **`DataTable` §6.2** | browser, version history, admin queues, audit |
| Upload intent form fields | **`Field` §6.3** | Upload flow |
| GC confirm / delete-marker confirm | **`Modal` §6.4 / `ConfirmFriction` §5.1** | admin, detail |
| Action confirmations ("Uploaded", "Delete-marked", "Restored") | **`Toast` §6.5** (verb-matched; never for the halt) | all |
| `Shift+Esc` halt-focus + fallback chord | **§5.3** | app-wide |

Drive **does not** host a kill actuator (§5.3: only MC and auth do) — it renders `HaltBand` read-only and deep-links to MC/auth if it surfaces the trigger at all. Drive **does not** fork the review queue: `verified_absent` is a **Drive-internal operator escalation**, not the MC ticket-review gate (a nonexistent ticket has no MC `/review/<ticket_id>` item), so it renders with `ReviewChip` anatomy but resolves in Drive's own Admin console — the same "distinct gate, shared anatomy" reconciliation §7.1 grants Library's ingestion admission.

---

## 3. Screens & flows

### 3.1 Ticket Browser (Instrument)

Artifacts grouped by the ticket that produced them. Two entry modes over one state: (a) **deep-linked** from Board/MC/Chat with a `ticket_id` (lands scoped to that ticket); (b) **recent view** — the operator browsing the store, most-recently-written tickets first.

```
┌─ AppShell §6.1 ─ side rail | header: DRIVE · artifact store  [SYSTEM STATE ⟳]  ◐ operator:ada 🔑fresh ─┐
│ [ read-only HaltBand §4.6 mirror — present only when level > G0 or a dependency is down ]              │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Ticket Browser                                        [ / search ticket_id ]   [ ↑ Upload ]           │
│                                                                                                         │
│  ▸ [ T-000123 ]  ✔ VERIFIED        4 artifacts · 1.2 GiB · last write 2m ago            source: board  │
│  ────────────────────────────────────────────────────────────────────────────── DataTable §6.2 ────── │
│   NAME                    VER   TYPE       SIZE     created_by            PROVENANCE        WHEN         │
│   report.pdf              v3    pdf        4.1 MB   ⬡ agent:patcher-07    ✔ verified        2m          │
│   report.preview.pdf      v1    pdf        3.9 MB   ⚙ svc:drive           ⧉ derived          2m          │
│   scan-export.csv         v1    csv        812 KB   ⬡ agent:recon-02      ✔ verified        14m         │
│   fleet.png               v2    png        220 KB   ⬡ agent:recon-02      ✔ verified        18m         │
│                                                                                                         │
│  ▸ [ T-000119 ]  ◐ UNVERIFIED_PENDING   2 artifacts   ⚠ Board unreachable at write; recheck queued      │
│   backup.tar.gz           v1    gzip       9.0 GiB   ⬡ agent:sre-01       ◑ single-source   1h          │
│                                                                                                         │
│  ▸ [ T-000101 ]  ⛒ VERIFIED_ABSENT      1 artifact · delete-marked   → see Admin escalation queue      │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Group header** = `TicketRef` §4.1 + ticket-verification `StatePill` §4.5 (`✔ VERIFIED` / `◐ UNVERIFIED_PENDING` / `⛒ VERIFIED_ABSENT`) + aggregate count/size + last-write `Freshness`. `verified_absent` groups collapse by default with a deep-link to the Admin escalation queue.
- **Rows** = `DataTable` §6.2: logical name, current `seq`, sniffed `mime`, size (tabular), `created_by` as `PrincipalRef` §4.2, provenance as `TierBadge` §4.3 (`verified` = ✔ ok-outline; `derived` previews = ⧉ corroborated-family with a `~derived` micro-tag; `single-source` ◑ for unverified-ticket writes). Delete-marked versions hidden unless the **`include_deleted`** toggle is on (then shown with a `◼ DELETE-MARKED` `StatePill`).
- Row click → **Artifact Detail** (§3.2). `/` focuses ticket search (§5.6). Reflows to stacked cards <640px (§6.2).

**States:**
- **Loaded** — as above.
- **Loading** — skeleton group headers + skeleton rows (§5.4; never a spinner).
- **Empty** — invitation (§5.4): *"No artifacts yet. Agents write deliverables here keyed by ticket; you can also upload one."* + the `↑ Upload` action. (In deep-linked mode with a real-but-empty ticket: *"T-000123 has produced no artifacts yet."*)
- **Pattern-R error (red ✕)** — the operator's own list request failed recoverably (malformed `ticket_id` in search → `400`; `page_token` invalid). States what happened + how to fix, in the interface's voice. Not for dependency outages.
- **Pattern-D degraded (gold ⛊)** — **Board unreachable**: ticket-verification checks degrade to `unverified_pending` (PLAN §2.1). This is **not** a red error and **not** an outage of Drive — the group header shows the `◐ UNVERIFIED_PENDING` pill + a one-line `Freshness`-stamped note *"Board unreachable — verification queued; recheck on backoff"*; the store keeps accepting and serving artifacts. A thin Pattern-D notice (§5.4-D "what's still true / what to do") sits above the list, gold not red.
- **Stop-engaged** — read-only `HaltBand` §4.6 under the header. Browsing and download are benign reads and continue by design; the band's copy makes that explicit. No list function is blocked by a kill.

### 3.2 Artifact Detail (Instrument shell + Workshop preview pane) — **BOTH**

The version history and the preview live side by side: an Instrument metadata/history rail, a Workshop preview surface.

```
┌─ header · [ ← T-000123 ]  ✔ VERIFIED           report.pdf            [ ↓ Download current ]  [ ⋯ ] ────┐
│  [ read-only HaltBand §4.6 mirror when engaged ]                                                       │
├──────────────────────────── metadata + version history (Instrument) ──────┬─ Preview Surface (Workshop)┤
│  ticket   [ T-000123 ]  ✔ VERIFIED     created_by ⬡ agent:patcher-07       │  §4 PreviewSurface (app-   │
│  logical  report.pdf    mime pdf (sniffed)   note ↪ [ note_id ] (Notes)    │  specific, §4.1 below)     │
│  sha256   3f9a…c1  ⧉copy    size 4.1 MB       derived: —                    │  ┌──────────────────────┐ │
│                                                                            │  │  [ embedded pdf app  │ │
│  Version history — AuditInspector §7.2 (append-only, provenance pivot)     │  │   viewer: pdf.<dom>  │ │
│  ─────────────────────────────────────────────────── DataTable §6.2 ───── │  │   progressive load ] │ │
│   SEQ  WHEN        WHO                   HASH     SIZE    NOTE   FENCE      │  │                      │ │
│   v3◀  2m ago      ⬡ agent:patcher-07   3f9a…c1  4.1 MB  ↪     🔒 gen47    │  │   report.pdf         │ │
│   v2   40m ago     ⬡ agent:patcher-07   9b20…7d  4.0 MB  —     🔒 gen47    │  └──────────────────────┘ │
│   v1   1h ago      ⬡ agent:patcher-07   77aa…02  3.8 MB  —     ⚠ gen46     │  Provenance: ✔ verified    │
│                                                              SUPERSEDED     │  · sniffed pdf · inline-   │
│   [ ↓ this version ]  [ ↩ Restore v2 — operator ]  (operator-only rows)    │  ok  · CSP:sandbox         │
└────────────────────────────────────────────────────────────────────────────┴────────────────────────┘
```

- **Metadata block** renders `TicketRef` §4.1 + verification `StatePill`, `PrincipalRef` §4.2, sniffed mime (canonical), `sha256` (mono, copy-on-click per §3.8), size (tabular), a `note_id` deep-link to Notes when present, and `derived_from_version_id` lineage for preview rows.
- **Version history is `AuditInspector` §7.2** — append-only rows (never edited): `seq` · timestamp (mono/tabular) · `PrincipalRef` who · `sha256` · size · note link · **`FenceState` §4.4** per version. A version whose fencing generation trails the resource renders the canonical **zombie** `⚠ gen46 · SUPERSEDED` (§4.4) — this is how a stale-agent write is shown, identical to how Board/Gateway show it. Human/service versions record no fence (`FenceState` neutral no-lease form; PLAN §3.6 exempts them). Read-only always (§7.2) — corrections are new versions, never edits.
- **Provenance pivot** (§7.2): the same `AuditInspector` pivots to lineage — this file's `created_by`, its ticket verification, and for a `report.preview.pdf` the `derived_from_version_id` chain back to the source version (`TierBadge` ⧉ derived).
- **Operator-only affordances** (`[⋯]`): **Restore** a prior version (re-point pointer; `write-benign`, reversible) and **Delete-mark** the current version — both human-principal-kind, both route through `ConfirmFriction` §5.1 **light** variant (toward-less / reversible: single confirm, signal-cyan primary, no typed intent). These are *not* the destructive GC purge (that lives only in Admin, §3.4). Agent principals never see these — the routes are operator-only (PLAN §4).

**Preview pane** = the **`PreviewSurface`** app-specific component (§4). Behavior per PLAN §4.1 inline-allowlist:
- `image/png|jpeg|webp|gif` → image on a neutral matte.
- `text/plain` → Source Serif 4 body on `--paper-*` reading surface (Workshop), operator-zoomable 15–20px (§3.8 `--fs-read`), charset pinned.
- `application/pdf` → **embedded `pdf` app viewer** (never a reimplemented viewer — PLAN forbids it), progressive/Range load off `GET /api/versions/{id}/content`.
- Anything **not** on the allowlist (svg, html, office, octet-stream, …) → a **download-only card**, never inline, echoing the `nosniff` + `CSP: sandbox` + attachment-default serving policy as printed facts.

**States (Artifact Detail):**
- **Loaded** — as above.
- **Loading** — skeleton metadata block + skeleton history rows; preview pane shows a labeled render placeholder (a bare spinner is permitted here *only* for the genuinely indeterminate pdf render job, §5.4, with a "rendering…" label).
- **Empty** — n/a (a detail page always has ≥1 version); a delete-marked-only artifact shows the history with the current pointer `NULL` and a `◼ DELETE-MARKED` banner + Restore affordance.
- **Pattern-R error (red ✕)** — version not found (`404`), or a download the operator triggered failed recoverably. Interface-voice, states the fix.
- **Pattern-D degraded (gold ⛊)** — **`pdf` app down**: the PDF preview cannot render. This degrades the **preview pane only** to a gold Pattern-D card: *"Preview unavailable — pdf renderer is down. This is the renderer safe-stopping, not a lost file. STILL TRUE: the original bytes are intact — Download still works."* (§5.4-D). Never a red error; download is unaffected because preview is a cache, not a dependency (PLAN §8). If a stored `.preview.pdf` derived version exists, it serves from Drive with no pdf dependency at all.
- **Stop-engaged** — read-only `HaltBand` §4.6. Reads/downloads continue; Restore/Delete-mark (write-benign) continue; nothing destructive is on this screen.

### 3.3 Upload flow (operator drag-drop → POST-intent + PUT)

Operator-initiated upload uses the **same** two-step API as agents (POST `/api/artifacts` intent → PUT `/api/uploads/{id}` bytes; PLAN §4/§6) — no UI-private write path.

```
┌─ Modal §6.4 · Upload to [ T-000123 ] ─────────────────────────────┐
│  UploadDropzone §4 — drop files or browse                          │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  report.pdf     4.1 MB   ███████████░░  72%   ⧗ streaming   │    │  ← per-file StatePill §4.5
│  │  fleet.png      220 KB   ✔ committed  v2  sha256 9b20…      │    │     + Freshness-polled progress
│  └───────────────────────────────────────────────────────────┘    │
│  ticket   [ T-000123 ]   logical name [ report.pdf         ]  Field│
│  note (optional) [ note_id                              ]     §6.3 │
│         [ Cancel ]                              [ Upload ]         │
└───────────────────────────────────────────────────────────────────┘
```

- Fields are `Field` §6.3 (visible labels, inline validation — malformed `ticket_id` caught before submit). Per-file status is a `StatePill` §4.5 (`⧗ streaming` → `✔ committed` / `✕ failed` / `◼ aborted`). Progress is **polled** (no SSE) and carries a `Freshness` stamp.
- **Not destructive** → no `ConfirmFriction`; success emits a verb-matched `Toast` §6.5 ("Uploaded"). A size-cap (`413`), watermark (`507`), quota (`429 QUOTA_EXHAUSTED`), or type-reject (`415`) response renders **Pattern-R** inline on the offending file (the operator's fixable problem), stating the exact limit.
- **Pattern-D** — auth/Board down mid-upload degrades gracefully: the byte PUT still authenticates locally; a Board-unreachable write lands `unverified_pending` (gold badge, not an error).

### 3.4 Admin console (Instrument) — orphan/GC, escalation queue, health, audit

The one screen with a destructive affordance. Four stacked panels.

```
┌─ Admin · Drive ──────────────────────────────────────────────────────────────────────────────────────┐
│  [ read-only HaltBand §4.6 — GC is refused suite-wide while any kill epoch > G0 ]                       │
├─ Health strip — Freshness §4.9 (never a false green) ─────────────────────────────────────────────────┤
│  DiskWatermarkMeter §4  ▐███████████░░░ 71% / 90%▐  source: healthz · as-of 8s                          │
│  backup ✔ 6h ago (nightly)     last-verify ✔ scrub clean 2d ago     journals ✔ closed                  │
│  ▲ if backup age > cadence → amber "STALE — last snapshot 3d ago; check restic repo"  (gold, not red)  │
│  ✕ if `drive verify` detected bit-rot/tamper → danger "INTEGRITY: N blobs failed hash" (red, real fail)│
├─ verified_absent escalation queue — ReviewChip §4.10 ─────────────────── DataTable §6.2 ───────────────┤
│   [ T-000101 ]  ⛒ VERIFIED_ABSENT   report-old.pdf   ⬡ agent:x-09   reason: ticket_not_found_on_board  │
│                 ◈ ESCALATED · verified_absent  → deep-link out (Chat notify when Chat exists)           │
│                 [ inspect ]   [ purge → ]   (auto delete-marked already; recoverable until purged)      │
├─ Orphan / GC console ─────────────────────────────────────────────────────────────────────────────────┤
│   Phase-1 (auto, continuous): 3 staging temps swept · 1 orphan blob past grace   [ read-only log ]     │
│   Phase-2 (manual, destructive): 12 delete-marked chains · 8 refcount-0 blobs · 4.2 GiB reclaimable    │
│                                                     [ 🔴 Purge reclaimable — DangerAction §4.7 ]        │
├─ Audit log — AuditInspector §7.2 (append-only; mutations + denials) ───────────────────────────────────┤
│   ts            who                 action              target           outcome                        │
│   12:04:11Z     ◐ operator:ada      gc_purge            8 blobs          ✔ done                          │
│   11:58:02Z     ⬡ agent:patcher-07  stale_fence_rejected T-000123        ✕ STALE_FENCING                │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Health strip** rides `Freshness` §4.9 for backup age, last-`drive verify`, and journal-close status. **The false-green rule binds hard here:** a stale/missing backup is **amber `▲ STALE` "safe reading spelled out"**, never a green "backed up"; an actual detected bit-rot/tamper from `drive verify` is **danger-red `✕ INTEGRITY`** (a real, fixable failure — Pattern R). A merely-cannot-confirm (healthz unreachable) is gold cannot-confirm, not green. The `DiskWatermarkMeter` (§4) is the one small gauge.
- **`verified_absent` escalation queue** — each row a `ReviewChip` §4.10: verification `StatePill` (`⛒ VERIFIED_ABSENT`) + the **machine reason verbatim** (`ticket_not_found_on_board`) + deep-link out. Per PLAN §2.1 the artifact is *already* auto-delete-marked (no silent rot) and stays recoverable; the operator's dispositions are **inspect** (→ Artifact Detail) or **purge** (routes into the Phase-2 GC below). This is Drive's own escalation surface (distinct gate, `ReviewChip` anatomy — §2 reconciliation), and it deep-links out to Chat as the doorbell once Chat exists.
- **Orphan/GC console** — Phase-1 is auto/continuous and shown **read-only** (nothing to action). Phase-2 purge is the **single `DangerAction` §4.7** in Drive: destructive, irreversible data removal, **human-only** (no agent-mintable scope reaches it — PLAN §5.3), routed through **`ConfirmFriction` §5.1 full variant**:

```
┌─ CONFIRM: GC PURGE  (reclaim → destroy) ─────────────────────────────┐  ← danger header §5.1
│  ⚠ This PERMANENTLY removes 8 refcount-0 blobs (4.2 GiB) and 12       │
│    delete-marked version chains. DIRECTION: toward MORE irreversible  │
│    action — purged bytes cannot be restored (delete-markers can;      │
│    a purge cannot).                                                   │
│  Blast radius: 8 blobs · 12 chains · tickets T-000101, T-000087…      │  ← app-specific preview
│  GC is suspended during the backup window; runs against the current   │
│    committed set only.                                                │
│  Type  PURGE  to confirm:   [▏          ]                             │  ← typed-intent gate
│  Re-authenticate (step-up):  🔑 passkey · auth_time fresh (Tier-2)    │  ← auth live re-check §5.1/§7
│         [ Cancel ]                          [ Purge ]  ← danger-red    │
└──────────────────────────────────────────────────────────────────────┘
```

  Primary disabled until typed-intent matches **and** step-up is fresh (§5.1 rule 1); Cancel is default focus / `Esc` target (rule 2); step-up is an **auth live Tier-2 re-check**, not a local password box (rule 5; PLAN §7). **Fail-closed:** if the auth staleness bound is exceeded or a kill epoch is engaged, the purge is **refused server-side** and the button shows the halt/degraded reason (PLAN §5.3/§7) — this is the one Drive route that fails closed.
- **Audit log** is `AuditInspector` §7.2 — append-only, rendering mutations *and* denials (`stale_fence_rejected`, `quota_refused`, `watermark_refused`, `ref_denied`, `gc_purge`) with `PrincipalRef` who and outcome `StatePill`. Read-only always. Drive is Standard (not hash-chained), so it shows **no chain-verify affordance** (that §7.2 feature is Critical-infra only) — audit *completeness*, not tamper-evidence, is the Standard bar.

**States (Admin):**
- **Loaded** — as above.
- **Loading** — skeleton panels; health figures show `Freshness` "loading," not a fabricated value.
- **Empty** — escalation queue empty = invitation-of-calm: *"No orphaned artifacts. Tickets that vanish from the Board surface here for disposition."* GC panel with nothing reclaimable: *"Nothing to purge — 0 refcount-0 blobs."*
- **Pattern-R error (red ✕)** — a purge that failed *recoverably* (e.g. a transient lock during the txn), stating retry. The operator's actionable problem.
- **Pattern-D degraded (gold ⛊)** — **auth/Redis down**: the GC route **fails closed** and the purge affordance renders a §5.4-D SAFE-STOPPED card *"Purge refused — cannot confirm step-up (auth unreachable). This is the destructive gate failing closed, not a console outage. Reads and the health strip continue."* Gold, not red. **healthz/backup source unreachable**: the health strip shows gold cannot-confirm figures, never green.
- **Stop-engaged** — read-only `HaltBand` §4.6. The band's copy already says destructive paths are refused suite-wide; the Phase-2 purge `DangerAction` reflects that (refused, with the halt as the printed reason and a deep-link to review the halt in MC/auth). All read panels stay live.

---

## 4. App-specific components (justified)

Three, each genuinely domain-unique — none re-draws a §4/§5/§6/§7 entity.

1. **`PreviewSurface`** — the inline artifact viewer: image-on-matte, `text/plain` on the `--paper-*` Workshop reading surface, embedded `pdf`-app frame for PDFs, and a download-only fallback card for everything off the §4.1 inline-allowlist. *Justification:* a media/document viewer is a domain-unique widget in the class the design system explicitly permits (an editor, a graph). It **embeds** the `pdf` app rather than reimplementing rendering (Drive is forbidden to build a viewer — `apps/drive/CLAUDE.md`), and it enforces the sniffed inline-allowlist + `nosniff`/`CSP:sandbox` serving policy that is Drive's stored-XSS boundary. Not a re-draw of any shared entity; its provenance header and states use `TierBadge`/`Freshness`/Pattern-D.

2. **`DiskWatermarkMeter`** — a single horizontal capacity gauge (used-% against the 90% watermark) in the Admin health strip. *Justification:* a capacity/threshold gauge is a small domain widget with no shared equivalent (`Freshness` stamps a figure's *age*, not a fill-vs-threshold ratio). Its figure and source stamp ride `Freshness` §4.9 and obey the false-green rule (crossing the watermark is amber/gold, never a green "OK"); only the fill-bar geometry is app-specific.

3. **`UploadDropzone`** — the operator drag-drop target with per-file streaming progress driving the POST-intent → PUT flow. *Justification:* a multi-file streaming uploader is domain-specific plumbing; its chrome is built from `Field` §6.3 (the intent form), `StatePill` §4.5 (per-file state), and `Toast` §6.5 (success), but the drop target + progress rows have no shared component. It writes only through the public API (no UI-private path).

Everything else — every identity, ticket ref, tier badge, fence state, lifecycle pill, halt band, danger action, review chip, audit/version table, health figure, table, form, modal, toast — **is a shared component cited above.** No bespoke re-draws.

---

## 5. Human-surface API (screens/states over the same state the MCP surface serves)

Two views, one state (DESIGN_SYSTEM §8.4). Every screen above reads/writes the **exact** HTTP API frozen in PLAN §4 — the MCP tools (PLAN §5) are the sibling surface over the same service layer; neither is downstream of the other. No UI-private endpoint, no UI-private state.

| UI surface | Consumes (PLAN §4) | Notes |
|---|---|---|
| Ticket Browser (deep-linked) | `GET /api/artifacts?ticket_id=…&page_token=…&include_deleted=` | rows carry `created_by`, `ticket_state`, `derived` for `PrincipalRef`/`StatePill`/`TierBadge` |
| Ticket Browser (recent view) | **`GET /api/tickets` (distinct-ticket index — DELTA, §7)** | rebuildable read the browser's grouping needs; not yet in PLAN §4 |
| Artifact Detail (metadata + history) | `GET /api/artifacts/{artifact_id}` | metadata + full version chain → `AuditInspector` |
| Download (current / a version) | `GET|HEAD /api/artifacts/{id}/content` · `GET|HEAD /api/versions/{version_id}/content` | Range/206/ETag/immutable per §4.1; `HEAD` powers size/type before render |
| Preview (PDF) | `GET /api/versions/{id}/content` (Range) via embedded pdf viewer | pdf renders in its own origin/frame; Drive serves bytes only (§8) |
| Upload flow | `POST /api/artifacts` (intent) → `PUT /api/uploads/{upload_id}` (bytes) · `DELETE` (abort) | same two-step as agents; per-file `StatePill` from the upload state machine (§4.2) |
| Delete-mark / Restore (operator) | `DELETE /api/artifacts/{id}` · `POST /api/artifacts/{id}/restore` | operator-only (human principal kind); `ConfirmFriction` light |
| GC purge (operator) | `POST /api/admin/gc` | operator-only + Tier-2 step-up; `ConfirmFriction` full; fail-closed |
| Health strip | `GET /api/healthz` | watermark + backup age + last-verify → `Freshness` + `DiskWatermarkMeter` |
| `verified_absent` queue | derived from `GET /api/artifacts?...` filtered on `ticket_state='verified_absent'` (+ recheck-sweep result) | `ReviewChip`; disposition reuses delete-mark/GC routes |

Authorization is the frozen RS baseline (PLAN §7): humans ride the proxy forward-auth session + verified `X-Auth-Identity`; the destructive GC route additionally requires the auth **Tier-2 live re-check** (never the forwarded header alone). Budget/staleness: reads and write-benign stay allow-but-bounded; **only GC fails closed**.

---

## 6. Consistency notes (what Drive consumes, from where)

- **Renders every shared entity via its shared component** (§2 table) — `TicketRef`, `PrincipalRef`, `TierBadge`, `FenceState`, `StatePill`, `HaltBand`, `DangerAction`+`ConfirmFriction`, `ReviewChip`, `Freshness`, `AuditInspector`, plus all §6 chrome. Zero one-off re-draws (the consistency-sweep bar, DESIGN_SYSTEM §8/`DESIGN_REVIEW.md`).
- **Consumes, never forks, the cross-app patterns:** version history + audit are the `AuditInspector` §7.2 family (provenance-lineage pivot for derived previews); Drive shows **no** chain-verify (Standard, not hash-chained). It hosts **no** `ReviewQueue` and **no** `LiveAgentView` (MC-owned §7.1/§7.3) and **no** kill actuator (MC/auth-only §5.3) — it renders `HaltBand` read-only and deep-links out.
- **`verified_absent` reconciliation:** rendered with `ReviewChip` anatomy but resolved in Drive's own Admin console — a *distinct gate*, not the MC ticket-review queue (a ticket absent from the Board has no `/review/<ticket_id>` item). This mirrors §7.1's Library-ingestion carve-out: same component, different queue and authority.
- **No SSE** anywhere (Drive is not a `LiveStream` §5.5 consumer); every live figure is poll-refreshed and `Freshness`-stamped; escalation is the Admin queue + Chat doorbell (when Chat exists).
- **Two views, one state:** every screen sits on the PLAN §4 HTTP API that the MCP tools also serve; no private endpoint.

---

## 7. Conflicts / flags for the operator

1. **`GET /api/tickets` distinct-ticket index is a required DELTA.** The Ticket Browser's *recent view* needs to enumerate tickets-that-have-artifacts (with counts + aggregate `ticket_state`); PLAN §4 lists only ticket-scoped `GET /api/artifacts?ticket_id=…`. This is a rebuildable read over existing state (a `SELECT DISTINCT` on `artifacts`) and should serve **both** surfaces to preserve two-views-one-state — but it is not yet in the frozen API. *Operator call:* add it to Drive's Stage-4 API (and, if agents should page the whole store, mirror it in MCP), or restrict the Browser to deep-linked ticket-scoped entry only.
2. **`verified_absent` deep-link target before Chat exists.** PLAN §2.1 sends the escalation to the Admin queue now, Chat later. Until Chat ships, the `ReviewChip`'s "deep-link out" resolves in-app (to Artifact Detail for disposition) rather than to a Chat notification — honest, but not the full doorbell pattern. *No action needed*; flagged so the missing push channel is a known, not a surprise.
3. **`unverified_pending` is a first-class visible state, indefinitely, in the degraded default.** Until the two-half Board-existence dependency lands (PLAN §2.1/§15.5: Board ticket-exists read + `svc:drive board:read` grant), *every* write is `unverified_pending`, so the Browser will show that gold pill on nearly every group. This is correct honest behavior, not a bug — but the operator should expect a "sea of pending" until the dependency ships, and the UI must not let it read as an error (it is gold Pattern-D, never red).
