# Helm · Claude Design injection block — Drive (artifact store)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Drive (artifact store)

**Purpose (one line):** The store for every non-markdown deliverable of agent work — rendered PDFs, exports, generated files — keyed by the ticket that produced it, where every file names its provenance and the store never lies about whether it still belongs to a real ticket.

**Who uses it:** Both. The **operator** gets the full UI (browse, preview, download, upload, admin). **Agents** use the MCP surface (no UI) over the *same* API. Every screen below is the human surface.

**Archetype:** **Both.** Instrument (dark control-room, compact) for the Ticket Browser, the Artifact Detail metadata/history rail, and the whole Admin console. Workshop (a reading/preview pane *inside* the Instrument shell) for the Preview Surface only. **Hard rule:** the shell, nav, header, and every safety component stay Instrument-dark in both — the archetype only changes the content substrate of the preview pane.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — one shell: 224px dark side rail (56px collapsed) + global header (app name + one-line "artifact store" identity, `SYSTEM STATE` center, read-only halt mirror right) + suite switcher showing current suite posture once. Operator identity chip + `🔑 fresh`/`🔑 stale` session cue in the header.
- **HaltBand** — the signature full-width GOLD `#F2842B` (`--halt-500`) safe-stop band under the header, `--halt-tint #2E1D0B` wash, interlock `▮▮` (kill engaged) / shield `⛊` (dependency-down safe-stop), gold-ink `#FFD8A8` text, never `✕`. **Read-only in Drive** — Drive hosts no kill actuator (only MC and auth do); it deep-links out to MC/auth. Present only when kill level > G0 or a dependency is down.
- **TicketRef** — opaque mono `[ T-000123 ]` chip, `--ink-700` on `--sub-750`, copy-on-click, middle-truncate, never parsed. Groups the browser.
- **PrincipalRef** — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service. On every version row and list row as `created_by`. Copy-on-click.
- **TierBadge** — provenance/trust: `✔ verified` green outline (`--ok-500 #46B98A`); `⧉ derived`/corroborated cyan outline (`--signal-500 #29B6D8`) with a `~derived` micro-tag; `◑ single-source` amber outline (`--attn-500 #E8B84B`) for unverified-ticket writes. Shape = severity family, glyph = independence, text = exact tier. Never recolors the TicketRef chip; rides *beside* it.
- **StatePill** — one `[glyph] LABEL` pill per lifecycle state, never color-only. Used for ticket verification (`✔ VERIFIED` / `◐ UNVERIFIED_PENDING` / `⛒ VERIFIED_ABSENT`), version/upload/GC state, and `◼ DELETE-MARKED`.
- **FenceState** — per-version write-fence liveness: healthy `🔒 gen 47` neutral `--ink-700` (never green — a held lock is not a confirmation); zombie `⚠ gen 46 · SUPERSEDED` in amber for a stale-agent write. Human/service versions render the neutral no-lease form (exempt).
- **DangerAction + ConfirmFriction** — the one destructive gate. GC purge = red `#E5594E` (`--danger-500`) behind the **full** variant (typed-intent `PURGE` + auth Tier-2 live step-up + red primary, disabled until both satisfied, Cancel = default/`Esc`). Restore & Delete-mark (toward-less/reversible) = the **light** variant (single confirm, signal-cyan primary, no typed intent).
- **Freshness** — `⟳ age` + source stamp on every live figure (Drive has **no SSE** — all figures are polled). Past its bound → amber `▲ STALE` with the safe reading spelled out; never a fabricated green. Binds the health strip hard.
- **ReviewChip** — `verified_absent` escalation pill (StatePill + machine reason + deep-link out). Anatomy reused, but resolves in **Drive's own** Admin console (distinct gate), not MC's `/review` queue — a nonexistent ticket has no MC review item.
- **AuditInspector** (§7.2 cross-app pattern) — append-only DataTable for version history and the admin audit log; provenance-lineage pivot for derived previews. Read-only always; **no chain-verify affordance** (Drive is Standard, not hash-chained — completeness, not tamper-evidence, is the bar).
- **DataTable** — dense zebra (`--sub-750` stripe), sticky sortable header, mono ID column w/ copy, right-aligned tabular numerics, reflows to stacked cards below ~640px. The truth-surface of every list.
- **Field / Modal / Toast** — visible-label inputs w/ inline validation (upload intent form); the one elevated surface (halt cut above every scrim); verb-matched success toasts ("Uploaded", "Delete-marked", "Restored") — **never** for the halt or any safety state.
- Not used: `ReviewQueue`, `LiveAgentView`, any kill actuator (all MC/auth-owned).

**⬡ Screens & views to build:**

**1. Ticket Browser (Instrument)** — artifacts grouped by originating ticket. Two entry modes over one state: deep-linked from Board/MC/Chat (scoped to a `ticket_id`) or a recent view (most-recently-written tickets first). Layout: AppShell + read-only HaltBand mirror; a header row with `/ search ticket_id` and an `↑ Upload` action; then collapsible **group headers** (`TicketRef` + verification `StatePill` + aggregate count/size + last-write `Freshness`), each expanding to a `DataTable` of rows: logical name · current `seq` · sniffed mime · size (tabular) · `created_by` (`PrincipalRef`) · provenance (`TierBadge`) · when.
```
▸ [ T-000123 ]  ✔ VERIFIED     4 artifacts · 1.2 GiB · last write 2m       source: board
   NAME                VER  TYPE  SIZE     created_by            PROVENANCE      WHEN
   report.pdf          v3   pdf   4.1 MB   ⬡ agent:patcher-07    ✔ verified      2m
   report.preview.pdf  v1   pdf   3.9 MB   ⚙ svc:drive           ⧉ derived        2m
▸ [ T-000119 ]  ◐ UNVERIFIED_PENDING  2 artifacts   ⚠ Board unreachable; recheck queued
▸ [ T-000101 ]  ⛒ VERIFIED_ABSENT  1 artifact · delete-marked  → Admin escalation queue
```
`verified_absent` groups collapse by default with a deep-link to Admin. Delete-marked versions hidden unless an `include_deleted` toggle is on (then shown with `◼ DELETE-MARKED`). Row click → Artifact Detail. **States:** *Loaded* as above · *Loading* skeleton group headers + rows (never a spinner) · *Empty* invitation "No artifacts yet. Agents write deliverables here keyed by ticket; you can also upload one." + the Upload action (deep-linked-but-empty variant: "T-000123 has produced no artifacts yet.") · *Pattern-R (red ✕)* the operator's own list request failed recoverably (malformed `ticket_id`, bad page token) — states what/how-to-fix in interface voice · *Pattern-D (gold ⛊)* **Board unreachable** → verification degrades to `◐ UNVERIFIED_PENDING`; a thin gold "what's still true / what to do" notice above the list, gold *not* red, store keeps serving · *Stop-engaged* read-only HaltBand; browsing/download continue by design and the band copy says so.

**2. Artifact Detail (Instrument shell + Workshop preview) — BOTH** — metadata/version rail on the left, preview pane on the right.
```
┌ header · [ ← T-000123 ] ✔ VERIFIED   report.pdf   [ ↓ Download current ] [ ⋯ ] ┐
│ [ read-only HaltBand mirror when engaged ]                                     │
├─ metadata + version history (Instrument) ─────────┬─ Preview Surface (Workshop) ┤
│ ticket [T-000123] ✔  created_by ⬡ agent:patcher-07│  embedded pdf-app viewer     │
│ logical report.pdf  mime pdf  sha256 3f9a…c1 ⧉copy│  (progressive/Range load)    │
│ Version history — AuditInspector (append-only)    │  ┌────────────────────────┐  │
│  SEQ WHEN     WHO                HASH    FENCE     │  │   report.pdf           │  │
│  v3◀ 2m ago   ⬡ agent:patcher-07 3f9a…c1 🔒 gen47  │  └────────────────────────┘  │
│  v1  1h ago   ⬡ agent:patcher-07 77aa…02 ⚠ gen46   │  Provenance: ✔ verified      │
│                                    SUPERSEDED      │  sniffed pdf · CSP:sandbox   │
│ [ ↓ this version ] [ ↩ Restore v2 — operator ]     │                              │
└───────────────────────────────────────────────────┴──────────────────────────────┘
```
Metadata block: `TicketRef` + verification `StatePill`, `PrincipalRef`, sniffed mime (canonical), copy-on-click `sha256` (mono), tabular size, a `note_id` deep-link to Notes when present, and `derived_from_version_id` lineage for preview rows. Version history is `AuditInspector` — append-only rows with `FenceState` per version (zombie `⚠ gen46 · SUPERSEDED` = a stale-agent write, drawn identically to Board/Gateway); the same inspector pivots to a provenance-lineage view (derived-preview chain back to its source). Operator-only `[⋯]` affordances: **Restore** a prior version and **Delete-mark** the current — both `ConfirmFriction` **light** (reversible, signal-cyan, single confirm); agents never see these. **States:** *Loaded* as above · *Loading* skeleton metadata + history; preview shows a labeled render placeholder (a bare spinner permitted **only** for the genuinely indeterminate PDF render job, with a "rendering…" label) · *Empty* n/a (always ≥1 version); a delete-marked-only artifact shows history with `NULL` pointer + `◼ DELETE-MARKED` banner + Restore · *Pattern-R (red ✕)* version 404 / a download the operator triggered failed recoverably · *Pattern-D (gold ⛊)* **pdf app down** → preview pane *only* degrades to a gold card: "Preview unavailable — pdf renderer is down. This is the renderer safe-stopping, not a lost file. STILL TRUE: original bytes intact — Download still works." (a stored `.preview.pdf` derived version serves from Drive with no pdf dependency) · *Stop-engaged* read-only HaltBand; reads/downloads/Restore/Delete-mark all continue (nothing destructive here).

**3. Upload flow (operator drag-drop → intent + bytes)** — a `Modal` scoped to a ticket; uses the *same* two-step API as agents (no UI-private write path). `UploadDropzone` with per-file streaming rows (`StatePill`: `⧗ streaming` → `✔ committed` / `✕ failed` / `◼ aborted`), `Freshness`-polled progress bar, then `Field` intent inputs (ticket, logical name, optional `note_id`) with inline validation catching a malformed `ticket_id` before submit. **Not destructive** → no ConfirmFriction; success = verb-matched "Uploaded" `Toast`. **States:** size-cap (413), watermark (507), quota (429), type-reject (415) render **Pattern-R inline on the offending file**, stating the exact limit; **Pattern-D** auth/Board-down mid-upload degrades gracefully — bytes still authenticate locally, a Board-unreachable write lands `◐ unverified_pending` (gold badge, not an error).

**4. Admin console (Instrument)** — the one screen with a destructive affordance; four stacked panels.
```
┌ Admin · Drive ────────────────────────────────────────────────────────────────┐
│ [ read-only HaltBand — GC refused suite-wide while any kill epoch > G0 ]        │
├ Health strip — Freshness (never a false green) ─────────────────────────────────┤
│ DiskWatermarkMeter ▐███████████░░░ 71% / 90%▐  source: healthz · as-of 8s        │
│ backup ✔ 6h ago    last-verify ✔ scrub clean 2d    journals ✔ closed            │
│ ▲ backup age > cadence → amber "STALE — last snapshot 3d ago" (gold, not red)   │
│ ✕ drive verify found bit-rot → danger "INTEGRITY: N blobs failed hash" (red)    │
├ verified_absent escalation queue — ReviewChip ─────── DataTable ────────────────┤
│  [T-000101] ⛒ VERIFIED_ABSENT  report-old.pdf  ⬡ agent:x-09  ticket_not_found  │
│             ◈ ESCALATED  → deep-link out   [ inspect ]  [ purge → ]             │
├ Orphan / GC console ────────────────────────────────────────────────────────────┤
│  Phase-1 (auto, continuous): 3 temps swept · 1 orphan past grace [read-only log]│
│  Phase-2 (manual, destructive): 12 delete-marked chains · 8 refcount-0 · 4.2 GiB│
│                                          [ 🔴 Purge reclaimable — DangerAction ] │
├ Audit log — AuditInspector (append-only; mutations + denials) ──────────────────┤
│  12:04:11Z ◐ operator:ada    gc_purge             8 blobs    ✔ done             │
│  11:58:02Z ⬡ agent:patcher-07 stale_fence_rejected T-000123  ✕ STALE_FENCING    │
└─────────────────────────────────────────────────────────────────────────────────┘
```
The Phase-2 **Purge** is the single `DangerAction` in the app — destructive, irreversible, **human-only**, routed through `ConfirmFriction` **full** variant:
```
┌ CONFIRM: GC PURGE (reclaim → destroy) ──────────────────────┐  ← danger-red header
│ ⚠ PERMANENTLY removes 8 refcount-0 blobs (4.2 GiB) + 12     │
│   delete-marked chains. DIRECTION: toward MORE irreversible │
│   action — purged bytes cannot be restored.                 │
│ Blast radius: 8 blobs · 12 chains · tickets T-000101…       │  ← app-specific preview
│ Type  PURGE  to confirm:  [▏          ]                     │  ← typed-intent gate
│ Re-authenticate (step-up): 🔑 passkey · auth_time (Tier-2)  │  ← auth live re-check
│        [ Cancel ]                    [ Purge ] ← danger-red  │
└─────────────────────────────────────────────────────────────┘
```
Primary disabled until typed-intent matches **and** step-up is fresh; Cancel = default focus / `Esc`; step-up is an **auth live Tier-2 re-check**, not a local password box. **Fail-closed:** if the auth staleness bound is exceeded or a kill epoch is engaged, the purge is refused server-side and the button shows the halt/degraded reason. **States:** *Loaded* as above · *Loading* skeleton panels; health figures show `Freshness` "loading," not a fabricated value · *Empty* escalation-queue-empty is an invitation-of-calm ("No orphaned artifacts. Tickets that vanish from the Board surface here for disposition."), GC-empty ("Nothing to purge — 0 refcount-0 blobs.") · *Pattern-R (red ✕)* a purge that failed recoverably (transient txn lock) states retry · *Pattern-D (gold ⛊)* **auth/Redis down** → GC route **fails closed**, purge affordance renders a gold SAFE-STOPPED card "Purge refused — cannot confirm step-up (auth unreachable). This is the destructive gate failing closed, not a console outage. Reads and the health strip continue."; **healthz/backup source unreachable** → health strip shows gold cannot-confirm figures, never green · *Stop-engaged* read-only HaltBand; Phase-2 purge reflects the suite-wide refusal (halt as the printed reason + deep-link to review the halt in MC/auth); all read panels stay live.

**◈ App-specific components (only where justified):**
1. **`PreviewSurface`** — the inline artifact viewer inside Artifact Detail's Workshop pane: `image/png|jpeg|webp|gif` on a neutral matte; `text/plain` on the `--paper-100 #F5F3ED` reading surface in **Source Serif 4** body (`--fs-read` 17/28, operator-zoomable 15–20px, charset pinned); `application/pdf` via the **embedded `pdf` app viewer** (progressive/Range load — never a reimplemented viewer); anything off the inline-allowlist (svg, html, office, octet-stream) → a **download-only card** echoing the `nosniff` + `CSP: sandbox` + attachment-default serving policy as printed facts. *Why not shared:* a media/document viewer is a domain-unique widget the system explicitly permits (like an editor or a graph); it embeds the pdf app rather than reimplementing rendering, and enforces the sniffed-allowlist that is Drive's stored-XSS boundary. Its provenance header + states reuse `TierBadge`/`Freshness`/Pattern-D.
2. **`DiskWatermarkMeter`** — a single horizontal capacity gauge (used-% against the 90% watermark) in the Admin health strip. *Why not shared:* `Freshness` stamps a figure's *age*, not a fill-vs-threshold ratio; only the fill-bar geometry is app-specific. Its figure + source stamp ride `Freshness` and obey the false-green rule — crossing the watermark is amber/gold, **never** a green "OK."
3. **`UploadDropzone`** — the operator drag-drop target with per-file streaming progress driving the intent→bytes flow. *Why not shared:* a multi-file streaming uploader is domain-specific plumbing; its chrome is built from `Field` + `StatePill` + `Toast`, but the drop target + progress rows have no shared equivalent. Writes only through the public API.

**⚠ Safety / danger surfaces specific to this app:**
- **GC purge is the one destructive act** — human-only (no agent-mintable scope reaches it), full ConfirmFriction (typed `PURGE` + auth Tier-2 live step-up), with an app-specific **blast-radius preview** (N blobs · N chains · affected tickets). It is the **one Drive route that fails closed** — refused server-side under auth-staleness or an engaged kill epoch. Build the friction so the primary stays disabled until both typed-intent and fresh step-up are satisfied.
- **Three-state ticket verification** (`verified` / `unverified_pending` / `verified_absent`) is a first-class visible truth via `StatePill` beside the `TicketRef`, never recoloring the chip. Expect a "sea of gold `◐ UNVERIFIED_PENDING`" in the default degraded posture (until the Board-existence dependency ships) — this is **honest Pattern-D, never a red error**.
- **The false-green rule binds the health strip hard:** a stale/missing backup is amber `▲ STALE` with the safe reading spelled out, never a green "backed up"; a real detected bit-rot/tamper from `drive verify` is danger-red `✕ INTEGRITY` (a real Pattern-R failure); a merely-unreachable healthz is gold cannot-confirm — never green.
- **Fencing honesty:** a version whose fencing generation trails the resource renders the canonical zombie `⚠ gen46 · SUPERSEDED` — a stale-agent write shown identically to Board/Gateway.
- **HaltBand is read-only here** — browsing and download are benign reads that continue under a kill by design (band copy says so); Drive never hosts a kill trigger, only deep-links to MC/auth.
- **`verified_absent` reconciliation:** rendered with `ReviewChip` anatomy but resolved in Drive's own Admin console (distinct gate, different authority) — it does **not** appear in MC's `/review` queue.

**⚑ Gaps flagged:**
- **`verified_absent` deep-link target before Chat ships** — the `ReviewChip`'s "deep-link out" currently resolves in-app (to Artifact Detail for disposition) rather than to a Chat notification; the full doorbell pattern arrives when Chat exists. Honest, not a surprise — [GAP — the push-channel destination is deferred until Chat exists; no design action needed now].
- **Recent-view Ticket Browser depends on a `GET /api/tickets` distinct-ticket index not yet in the frozen API** — a rebuildable read the grouping needs. [GAP — operator/Claude Design to decide: design the recent view assuming this index exists, or restrict the Browser to deep-linked ticket-scoped entry only.] Does not change any visual; flagged because the recent-view screen presupposes it.
- All colors, type, spacing, and safety cues above are drawn from the frozen token set; no out-of-token color is required. Otherwise the spec is complete for design.
