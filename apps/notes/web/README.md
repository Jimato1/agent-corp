# Notes — Web UI (human surface)

The operator's surface for Notes: a corpus browser + FTS search, a **real Milkdown-Crepe markdown
editor**, the wikilink/backlink graph, the deliberation-thread reader, a review-attention view, and a
provenance/history inspector. It is a **sibling of the MCP surface over the same core REST API** —
two views, one state. This UI holds **no** ticket-lifecycle, approval, kill, or review-clear authority;
everywhere the operator might expect to "act on the fleet," Notes renders the truth read-only and
deep-links out to the authoritative owner (Board / Mission Control).

## The pinned build shape (why it looks unusual)

There is exactly **one React** in the page — the global UMD (`window.React`) that the vendored Helm
design-system bundle (`_ds_bundle.js`) also binds to. If app code imported React from npm, a second
React instance would break hooks across the Helm/app component boundary. So:

- `index.html` loads, as **classic scripts and in this order**, before the app module:
  `/helm/styles.css` → `/helm/react.production.min.js` → `/helm/react-dom.production.min.js` →
  `/helm/_ds_bundle.js` → then `<script type="module" src="/src/main.jsx">`.
- `vite.config.js` compiles JSX with esbuild's classic runtime (`React.createElement`) and injects
  `import React from '/src/react-global.js'` into every module. `react-global.js` re-exports
  `window.React`. **App code never `import`s `react`/`react-dom` from npm.**
- Hooks are taken from the global: `const { useState, useEffect } = window.React`. Helm components come
  from `const H = window.HelmDesignSystem_f4cb26`.
- **Milkdown Crepe is framework-agnostic vanilla JS** — it is bundled normally by Vite and mounted
  into a plain DOM ref (`src/parts/NoteEditor.jsx`). It does not use the app's React.

`react` / `react-dom` are **devDependencies only**: they exist so the vendor step can copy their UMD
builds into `public/helm/`. Nothing imports them, so Vite never bundles them.

## Vendored assets (`public/helm/`, committed)

`scripts/vendor-helm.mjs` (runs on `predev` / `prebuild`, and `npm run vendor`) copies, verbatim,
from `context/design/handoff/helm-design-system/project/`:

- `_ds_bundle.js`, `styles.css`, and the whole `tokens/` dir (Helm design system — source of truth), and
- `react.production.min.js` + `react-dom.production.min.js` from `node_modules` (the single global React).

The copies are committed so `vite build` works even if the script is skipped. Re-run `npm run vendor`
to re-sync after a design-system update. (Helm's `tokens/fonts.css` `@import`s the three web fonts
from Google Fonts; offline it degrades to system fallbacks — the design system is vendored as-is.)

## Dev / build

```bash
npm install          # installs vite + @milkdown/crepe/kit (+ react/react-dom for UMD vendoring)
npm run vendor       # copy Helm + React UMD into public/helm (auto-run by predev/prebuild)
npm run dev          # Vite dev server on :5173, proxying /api,/healthz,/mcp,/.well-known → :8080
npm run build        # → dist/  (the server serves this behind the proxy at notes.<domain>)
npm run preview      # preview the production build
```

The dev server proxies the API paths to the **already-built core server on `http://localhost:8080`**.
Run that server with `NOTES_DEV_UNSAFE_NO_AUTH=true` for a headers-based dev principal.

### Auth (dev vs prod)

`src/api.js` sends `Authorization: Bearer <token>` when `localStorage.notes_bearer` is set
(production). Otherwise it sends the dev-bypass headers `X-Dev-Sub` / `X-Dev-Scopes` (default
`operator:ada` with all four scopes), which the server honors **only** under
`NOTES_DEV_UNSAFE_NO_AUTH=true`. Override with `localStorage.notes_dev_sub` / `notes_dev_scopes`.

The SSE stream (`/api/events`) uses the browser `EventSource`, which cannot set headers; in dev the
server's bypass yields a default principal, so the live stream connects without extra config.

## Screens (S1–S6) and their states

Each screen enumerates **Loaded / Loading (skeleton, never a spinner) / Empty / Pattern-R (red,
recoverable) / Pattern-D (gold, dependency safe-stopped) / Stop-engaged (read-only HaltBand)**.

| Screen | File | Live source | Notes-specific honesty |
|---|---|---|---|
| **S1 Corpus & Search** | `screens/Corpus.jsx` | `GET /api/search` | same FTS index as `search_notes`; `/` focuses search; snippet carries its own `TierBadge`; no status/phase filter |
| **S2 Note Editor** | `screens/Editor.jsx` + `parts/NoteEditor.jsx` | `GET/PUT /api/notes/:id` | **real Crepe editor** storing markdown; Save = CAS `expected_hash`; `PRECONDITION_HASH`/`HYGIENE_REJECT`/`TAINT_DOWNGRADE` = Pattern-R, `FENCE_UNVERIFIABLE` = Pattern-D gold; taint read-only printed-🔒 absence; ticket-status = muted `mirror · authority: Board` |
| **S3 Deliberation Thread** | `screens/Deliberation.jsx` + `parts/DeliberationThreadView.jsx` | `GET /api/notes/:id` | parses the body into the **seven spec phases**; per-turn `sub=` → `PrincipalRef`; `adversarial_review` flagged REQUIRED; **no converge/escalate button** (printed fact) |
| **S4 Link Graph & Backlinks** | `screens/Graph.jsx` + `parts/LinkGraph.jsx` | `GET /api/notes/:id` + `/backlinks` | taint on nodes; list half is the shared `DataTable`; ghost nodes for unresolved links |
| **S5 Review-Attention** | `screens/Review.jsx` | **cross-app** MC queue (`/mc/api/queue`) | read-only, MC-observed, advisory; deep-links to `mc/review/<ticket_id>`; **no clear-review control** (printed fact); missing `mc:read` = Pattern-R, MC unreachable = Pattern-D (never a false "cleared") |
| **S6 Provenance & History** | `screens/History.jsx` | `GET /api/notes/:id` + `/healthz` + live SSE `audit` | chain-verify is **never green** when it can't be confirmed (gold ⚠ CANNOT CONFIRM); provenance mode shows own→effective taint + `tainted_via` |

## Known seams (honest, documented)

- **Corpus columns.** `GET /api/search` returns `{ note_id, title, snippet, score, taint }` — not
  `type`/`ticket`/`updated`. S1 renders exactly what the endpoint provides (title + id, snippet with
  its travelling taint badge, effective-taint badge). The `type` / `tag` / `ticket` **filters** are
  inputs to the same query.
- **S2 fence rail.** The read response carries no live fencing token (fencing is enforced server-side
  on *agent* append/link writes and held by the Board). The rail renders `FenceState` **advisory**
  with a printed "lease + generation live on the Board" line — it never fabricates a live lease.
- **S6 audit.** The full append-only audit projection is rebuilt server-side from git-commit trailers
  and is **not exposed as a REST list** on this build. S6 shows the latest commit, the live SSE audit
  tail (this session), and a **gold "CANNOT CONFIRM" chain-verify** — honoring the false-green rule.
- **S5 cross-app read.** MC's queue is read under the operator's own session at a configurable base
  (`localStorage.notes_mc_base`, default `/mc`). This is UI_SPEC §6 Conflict #2 (whether the operator
  session carries `mc:read`); until resolved at the Board/MC seam, S5 degrades honestly.

## Safety-grammar invariants honored in the UI (verification checks these)

- `ceremony_phase` / `ticket_status` render as muted **`mirror · authority: Board`**, never an
  authoritative pill (display-only firewall, CORR-2).
- Taint is **display-of-truth, read-only** — a printed 🔒 absence, no editable control anywhere.
- **No** converge/escalate control in S3; **no** clear-review control in S5 (deep-link only).
- The **HaltBand is read-only** — Notes is not in the kill chain and hosts no actuator.
- Fail-closed states render **GOLD (Pattern D)**, never red.
