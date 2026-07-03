# Claude Design prompt — pdf-forge Flow E: "Secure PDF" (encrypt / decrypt / permissions)

## 1. Role + goal
You are designing a small set of high-fidelity, on-brand UI mockup frames for **one flow** of pdf-forge: the **crypto flow** — add a password (encrypt), remove a password (decrypt), or set **advisory permissions** — with explicit, careful password UX. Produce a faithful visual reference (screens + states + a component inventory + interaction notes), NOT production code.

**pdf-forge** is a privacy-first, self-hosted Acrobat alternative: a single hardened Docker container in a homelab, LAN-only, single-operator. It is an **instrument** — a fast local document workshop — not a generic SaaS dashboard. A FastAPI backend serves a Vite + React 19 SPA; pdf.js renders previews client-side (zero upload for preview); heavy ops are bounded async server jobs (HTTP `202 Accepted` + poll, **no SSE/streaming progress** in v1). Crypto ops (encrypt/decrypt/permissions) are **server jobs** run by pikepdf; encryption is applied in the same finalize save. Desktop-first but must survive mobile down to ~375px.

---

## 2. Design system to apply (LOCKED — use these tokens verbatim)

### Palette
**Substrate (cool graphite workbench — the app surface):**
- `--sub-900 #0E1116` (deepest well / board backdrop) · `--sub-850 #141922` (app bg) · `--sub-800 #1A2029` (panels/toolbars/rail) · `--sub-700 #222A35` (inset wells, board substrate) · `--sub-600 #2D3743` (hairline borders) · `--sub-500 #3A4654` (control borders) · `--sub-400 #566373` (disabled fill)

**Paper (the PDF page — ONLY true whites; only objects that cast shadow):**
- `--paper-0 #FBFBF9` (sheet face / warm paper) · `--paper-edge #E7E7E2` (sheet bottom-edge thickness) · `--paper-shadow #05070A` (sheet shadow color, used at alpha) · ink-on-paper near-black `#11151B`

**Ink (text on substrate; AA-checked):**
- `--ink-900 #F2F5F8` (primary/headings ≈13:1) · `--ink-700 #C5CDD6` (secondary) · `--ink-600 #9AA6B2` (muted meta, min AA ≈4.6:1) · `--ink-500 #6B7785` (disabled/non-essential only)

**Press blue (the ONE accent — selection + primary action):**
- `--press-500 #1FA2C4` · `--press-400 #3FBDDD` (hover) · `--press-600 #157E9B` (pressed) · `--press-tint #12303A` (selected wash) · `--press-glow #1FA2C4` (focus halo @alpha)

**Semantics (rationed; only on state):**
- `--ok-500 #4BAE7E` · `--warn-500 #D6A53C` (advisory-perms, kept-input) · `--err-500 #D9594C` (4xx/5xx, wrong-pw) · `--proc-500 #E08A3C` (running "press" amber — the one warm hue) · `--err-tint #3A1E1C` · `--ok-tint #15302A`
- Contrast intent: body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper (ring on paper gets a 1px `--sub-900` spacer to hold contrast).

### Type
- UI/label/heading/body: `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (humanist; turn on `font-feature-settings:"tnum" 1,"lnum" 1` for any numeric UI).
- Data/mono (filenames, ranges like `1-10,21-end`, byte sizes, DPI, hashes, **passwords-as-dots**): `"JetBrains Mono","IBM Plex Mono",ui-monospace,"SF Mono",Consolas,monospace`.
- Scale (px / line-height): `--fs-micro 11/16` (page chips, dense meta) · `--fs-label 12/16` (UI labels; UPPERCASE eyebrows +0.04em) · `--fs-body 13/20` · `--fs-data 13/18` (mono rows) · `--fs-base 14/20` (inputs/controls) · `--fs-h3 16/22` (panel titles) · `--fs-h2 20/26` (screen titles) · `--fs-h1 26/32` (empty-state only).
- Weights: 400 body / 500 labels+controls / 600 headings; 700 only the single empty-state H1. Sentence case (eyebrows UPPERCASE +0.04em `--ink-600`). Mono never UPPERCASE.

### Spacing (base = 4px; instrument-dense)
- `--sp-1 4` · `--sp-2 8` · `--sp-3 12` · `--sp-4 16` · `--sp-5 24` · `--sp-6 32` · `--sp-8 48`.
- Control height: default 32px / compact 28px / primary+mobile 40px; icon-btn 28px box, 16px glyph. Mobile hit-area ≥44×44 (expand padding, not visual size).
- Grid: three-zone workbench — left rail (56px collapsed / 220px open), center worksurface (hero), right inspector (300–340px). <768px inspector→bottom sheet, rail→top bar+drawer; <~768px board→2-up. Single column at 375px, no horizontal scroll. Prose/dialog max 560px; board fluid.

### Radii / borders / elevation
- Radii: `--r-sheet 2` (PAGES — crisp paper corners) · `--r-ctl 4` (inputs/buttons/chips) · `--r-panel 6` (panels/dialogs/board frame) · `--r-pill 999` (status dots/pills only). Rounded-everything banned; nothing >6px except pills.
- Borders: hairline `1px solid --sub-600` between panels; control `1px solid --sub-500`; focus REPLACES border with ring (don't stack); inset wells use inner 1px `--sub-700` + darker fill.
- Elevation: **chrome panels cast ZERO shadow** (separate by value-step + hairline — no card soup). Shadow reserved for PAPER only: resting sheet `0 1px 2px rgba(5,7,10,.45)`; hover `0 2px 6px rgba(5,7,10,.5)`; lifted/drag `0 10px 24px rgba(5,7,10,.6)`. Dialogs: `0 16px 48px rgba(5,7,10,.55)` + scrim `rgba(8,10,14,.6)` — the only chrome allowed to cast.

### The board (page-thumbnail surface)
- Substrate: inset well, fill `--sub-700`, `inset 0 1px 0 rgba(5,7,10,.5)`, `--r-panel`; optional faint 24px cutting-mat dot grid (`--sub-600` ~8%, atmospheric only, off w/ reduced-data).
- Sheet: honor each page's TRUE aspect (default ISO ~1:1.414; landscape stays landscape — never force square). Widths: compact 96 / comfortable 132 / large 180px (board zoom slider); mobile 2-up fluid. Face `--paper-0`, `--r-sheet` 2px, bottom 2px `--paper-edge`, resting shadow, pdf.js render fills face. Gaps: `--sp-3` comfortable / `--sp-2` compact; sheets flow/wrap like dealt cards (not rigid grid).
- Page-number chip: bottom-left overlapping edge 2px; `--fs-micro` mono, `--ink-900` on `--sub-900` 80% pill (`--r-pill`), tabular figures; rotated pages add ⟳+`90°`.

### Interaction states
- Hover control: bg +1 substrate step, border→`--sub-400`, no motion.
- Focus-visible: 2px `--press-500` ring, offset 2px, + 4px `--press-glow` halo @35%; on paper insert 1px `--sub-900` spacer. NEVER `outline:none` without replacement.
- Disabled: `--sub-400` fill, `--ink-500` text, no border, opacity .6, `not-allowed`. Processing: amber `--proc-500` indeterminate (spinner not progress bar — `progress` may be null). Error: banner `--err-tint` fill + 3px `--err-500` left-border + mono `code` (e.g. `wrong_password`); 422 wrong-pw = `--err-500` field border + shake (none under reduced-motion). Success: `--ok-500` check + `--ok-tint` toast + left `--ok-500` rule on artifact row.
- Selected/on toggles: press-blue (`--press-500`) when ON; checked-state group for permission toggles.

### Motion
- Durations: `--mo-fast 120ms` (hover/focus/control) · `--mo-base 180ms` (panel open) · `--mo-slow 240ms` (dialog/scrim, bottom-sheet).
- Easing: `--ease-out cubic-bezier(.2,.7,.3,1)` · `--ease-inout cubic-bezier(.4,0,.2,1)` · `--ease-press cubic-bezier(.3,0,.1,1)`. No spring overshoot beyond the 1.04 sheet lift. Processing pulse: 1.6s ease-press loop (opacity .5↔1 + sweeping highlight) = "the press is working", no fake progress bar.
- **prefers-reduced-motion: reduce** → all transitions ≤0ms or single opacity crossfade; processing = static amber readout + cycling `working…` text (no spin); **error shake OFF (color only)**; focus rings STILL render (state, not motion).

### SIGNATURE ELEMENT (honor it, but spend boldness ONLY here)
Pages are physical paper sheets on a lit, recessed cool-graphite workbench — the ONLY bright warm-white objects in the app and the only things that cast a shadow (crisp 2px corners, faint bottom-edge thickness, soft resting shadow; hover lifts a sheet 1px). Its companion accent — used only when a heavy server job runs — is the **"press at work"** treatment: the worksurface dims and a warm amber (`--proc-500`) sweep pulses across the job readout like an instrument pressing the document, resolving to a green check or a red machine-code banner. Everything else is quiet graphite + ink. **In this flow specifically:** the preview sheet (or the LOCKED-SHEET placeholder) is the one bright object; the amber press is the in-progress moment. The crypto inspector form, toggles, and disclaimer are all quiet/instrumental graphite.

---

## 3. Screen / flow brief
Layout = the three-zone workbench. **Left rail** lists the op (the operator has already chosen Encrypt / Decrypt / Permissions; show the active op highlighted in `--press-tint`). **Center worksurface** = the board well showing the input PDF as a single bright preview sheet (pdf.js render), or — if the input is already encrypted — a **locked-sheet placeholder**. **Right inspector (300–340px)** = the crypto form for the chosen op: this is where the operator works.

Operator's path through Flow E:
1. Op already selected (encrypt / decrypt / permissions) — inspector shows the matching form.
2. Operator fills password field(s) / toggles permissions. Password fields are **mono, masked as dots**, with a show/hide eye toggle.
3. Operator clicks the primary **press/submit** action → SPA `POST`s `multipart/form-data` to `POST /api/jobs/{encrypt|decrypt|permissions}` → `202 Accepted` + `Location` → poll `GET /api/jobs/{id}` (~1.5s, spinner) → on `succeeded` download `GET /api/jobs/{id}/result` (`application/pdf`).
4. Result appears as an **artifact row** with op-specific copy. Wrong password (decrypt) surfaces as a calm field-level error with the value preserved.

Per-op inspector content:
- **Encrypt** — `user_password` (required, flagged) + optional `owner_password` + permission toggles (print / modify / copy(extract) / annotate). AES-256 (R=6) noted as the handler.
- **Decrypt** — a single open-password field.
- **Permissions** — print / modify / copy / annotate toggles + optional `owner_password`, **beneath the persistent advisory-permissions disclaimer**.

**Advisory-permissions disclaimer (NON-NEGOTIABLE — render it):** a persistent `--warn-500` notice in the permissions inspector AND echoed on the permissions success row, plainly worded:
> "Permissions are advisory. They ask conforming readers to limit printing, copying, or editing — but an owner-password-only PDF still opens for anyone, and many tools ignore these flags. For real confidentiality, use Encrypt with a user password."

If owner-only perms are set without a user password, escalate to an inline `--warn-500` warning at submit: "No user password set — this file will open for anyone." (submit still allowed; advisory, not an error).

---

## 4. States to render (each as a distinct frame/section, labeled)
1. **Empty / form (Encrypt)** — desktop. Inspector: masked `user_password` (required, flagged), optional `owner_password`, 4 permission toggles, AES-256 note, primary action. Center sheet = clear input preview.
2. **Empty / form (Decrypt)** — single open-password field, masked, eye toggle visible. Center sheet = **LOCKED-SHEET placeholder** (a paper sheet with a small lock glyph, faces unrendered) + caption: "This PDF is protected — enter its password to preview/operate."
3. **Empty / form (Permissions)** — toggle group (print/modify/copy/annotate) + optional `owner_password`, with the persistent `--warn-500` advisory disclaimer above the toggles. Show one frame variant with the inline "No user password set…" submit warning.
4. **Loading (input preview)** — client-side pdf.js render of the input sheet on the board (zero upload); show the locked-sheet placeholder variant where the input is already encrypted.
5. **In-progress (202 + poll)** — the PRESS treatment: worksurface dims, amber `--proc-500` indeterminate sweep across the job readout, phase label `Running — pikepdf` → `finalize`, **spinner not progress bar** (`progress` may be `null`). Show the polled descriptor `state: "running"`.
6. **Error — wrong password (decrypt)** — THE headline state: password field gets `--err-500` border + shake (color-only under reduced-motion), focus returns to the field, **value preserved** (dots still present) so a typo is a one-char fix. Calm field-level copy: "That password didn't unlock this PDF. Check it and try again." with mono `wrong_password` code shown. (Render BOTH the motion variant and a reduced-motion color-only variant.)
7. **Error — submit-time validation (Flow C codes)** — the `--err-tint` banner with 3px `--err-500` left border + mono code: show one frame each for `file_too_large` (413), `not_a_pdf` (415), `bad_pdf_structure` (400), `queue_full` (429, with Retry-After), `disk_full` (507). Never show the raw HTTP number or stderr — code + sanitized message only.
8. **Success — Encrypt** — artifact row with `--ok-500` left rule + check + `--ok-tint` toast, copy: "Encrypted with AES-256. This file now needs its password to open." Download action present.
9. **Success — Decrypt** — artifact row, copy: "Unlocked — the password has been removed."
10. **Success — Permissions** — artifact row sitting **beneath the echoed advisory disclaimer**.
11. **Mobile (~375px)** — inspector becomes a **bottom sheet**; render the Encrypt form and the wrong-password error in this layout. Single column, no horizontal scroll, hit-areas ≥44×44.

> Multi-select / drag / drop-gap = **N/A** for this flow (whole-document crypto, single input sheet). Permission toggles are a checked-state group, not multi-select. No client undo of a committed crypto job; wrong-password retries are unlimited (each a fresh submit; nothing kept server-side on failure). Decrypt conceptually reverses encrypt (with the password) — note this, but there is no undo button.

---

## 5. Real data to show (embed these exact shapes/values — no lorem ipsum)
Use tabular figures (`tnum`) for all counts/sizes/ids; render filenames, byte sizes, ids, and masked passwords in the mono token.

**Submit (encrypt) — `POST /api/jobs/encrypt`, multipart `file` + `options`:**
```json
{
  "user_password": "open-sesame",
  "owner_password": "master-key",
  "permissions": { "print": "low", "modify": false, "extract": false }
}
```
(In the UI, never print the literal password — show masked dots `••••••••••` in mono; the eye toggle reveals it.)

**Decrypt options:** `{ "password": "•••••••" }`  ·  **Permissions options:** `{ "permissions": { "extract": false, "modify": false, "print": "low" }, "owner_password": "•••••" }`

**202 Accepted response (job descriptor, `state: queued`), `Location: /api/jobs/{id}`:**
```json
{
  "id": "7b3e91a04c2d4f8e9a16d5c0e2f47b83",
  "op": "encrypt",
  "state": "queued",
  "engine": "pikepdf",
  "created_at": "2026-06-30T12:00:00Z",
  "expires_at": "2026-06-30T13:00:00Z",
  "input": { "filename": "report.pdf", "bytes": 4823104 },
  "result": null,
  "error": null
}
```

**Poll (running):** `{ "id": "7b3e…7b83", "op": "encrypt", "state": "running", "stage": "finalize", "progress": null }`

**Poll (succeeded) — result sub-shape with `artifacts[]`:**
```json
{
  "id": "7b3e…7b83", "op": "encrypt", "state": "succeeded",
  "result": {
    "href": "/api/jobs/7b3e…7b83/result",
    "media_type": "application/pdf",
    "filename": "report-encrypted.pdf",
    "bytes": 4861002,
    "artifacts": [
      { "index": 0, "href": "/api/jobs/7b3e…7b83/result/0",
        "media_type": "application/pdf", "filename": "report-encrypted.pdf", "bytes": 4861002 }
    ],
    "meta": { "input_bytes": 4823104, "output_bytes": 4861002, "kept": "output" }
  },
  "error": null
}
```
(Decrypt success filename `report-unlocked.pdf`; permissions success filename `report-permissions.pdf`.)

**Wrong-password — preferred immediate 422 (common error envelope):**
```json
{ "error": { "code": "wrong_password", "message": "That password didn't unlock this PDF.",
             "status": 422, "request_id": "3f1c9a0b8e7d4f62a1c5d9e2b4f60718" } }
```
**Wrong-password — alternate path (sanitized failed job, HTTP 200 document) — render identically:**
```json
{ "id": "7b3e…7b83", "op": "decrypt", "state": "failed",
  "error": { "code": "validation", "category": "engine", "message": "That password didn't unlock this PDF." },
  "result": null }
```

**Other error envelopes this flow can hit (show the codes, sanitized messages, mono code chips):**
- `413 file_too_large` — "Upload exceeds the 200 MB limit." `details: { "limit_mb": 200 }`
- `415 not_a_pdf` — "That file isn't a PDF."
- `400 bad_pdf_structure` — "This PDF couldn't be opened."
- `429 queue_full` — "All workers are busy; retry shortly." (+ `Retry-After: 30`)
- `507 disk_full` — "Not enough working storage to accept this job."

**Sample mono filenames/sizes for rows/chips:** `report.pdf` · `4.82 MB` (4,823,104 bytes) → `report-encrypted.pdf` · `4.86 MB`; `statement-2026.pdf` · `1.31 MB`. Job id shown abbreviated as `7b3e…7b83`.

**Client-side blocked submit (encrypt with blank user password — never reaches server):** inline `--warn-500`/`--err-500` field message "Set a user password — without one there's nothing to unlock."

---

## 6. Quality floor (mandatory — every frame)
- **Responsive down to ~375px:** desktop three-zone → mobile single column with inspector as a bottom sheet; no horizontal scroll; touch hit-areas ≥44×44 (expand padding, not visual size).
- **Visible keyboard focus:** every interactive element shows the 2px `--press-500` focus-visible ring + offset + halo; rings render even under reduced-motion. Never `outline:none` without replacement. The password field, eye toggle, each permission toggle, and the primary action must all show their focus state in at least one frame.
- **prefers-reduced-motion: reduce:** provide the fallback — no shake on the wrong-password field (color-only), processing = static amber readout + cycling `working…` text (no spin), transitions ≤0ms / opacity crossfade. Render a reduced-motion variant of the wrong-password frame.
- **Contrast:** body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper (ring on the bright sheet gets a 1px `--sub-900` spacer).
- **Quiet everywhere except the signature element:** chrome panels cast zero shadow (separate by value-step + hairline); the ONLY warm-white shadow-casting object is the preview/locked sheet; the ONLY warm hue is the amber press during the running state. Press blue is the single accent. Never show raw HTTP status numbers or engine stderr — sanitized message + mono machine code only.

---

## 7. Deliverable / hand-back
Return:
1. **The labeled frames** for every state in §4 (desktop + the ~375px mobile + the reduced-motion wrong-password variant), each clearly titled.
2. A **component inventory**: masked mono password field + eye toggle, permission toggle group, advisory `--warn-500` disclaimer block, op-active rail item, board well + bright preview sheet, locked-sheet placeholder, amber "press at work" job readout, error banner (with mono code chip), field-level wrong-password error, success artifact row + download action, mobile bottom-sheet inspector.
3. **Interaction notes**: the 202→poll→download lifecycle (spinner not progress bar; `progress` may be null), the wrong-password preserve-value + return-focus behavior, the show/hide password toggle, the advisory escalation warning, and the press/reduced-motion behavior.

**Do NOT:** write production application code, wire real API calls, invent endpoints or fields beyond those in §5, add features outside encrypt/decrypt/permissions, use placeholder/lorem text, or spend visual boldness anywhere except the signature sheet + amber press. This is a visual reference only.
