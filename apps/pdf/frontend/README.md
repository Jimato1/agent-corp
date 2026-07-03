# pdf-forge — frontend

Vite + React 19 + TypeScript SPA implementing the **pdf-forge Design System v1**
(Claude Design handoff). It is the human surface of the workbench: a three-zone
instrument — **rail** (operations) · **worksurface** (the board of paper sheets,
the SIGNATURE) · **inspector** (op options + the amber "press at work" readout).

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (proxies /api → 127.0.0.1:8000)
npm run build      # tsc -b && vite build → dist/  (copied to /app/static in the image)
npm run typecheck
```

The dev server proxies `/api/*` to the backend (`VITE_API_TARGET`, default
`http://127.0.0.1:8000`). With no backend running, all **client-side** flows still
work fully — nothing is uploaded.

## What's implemented

Design foundation (ported 1:1 from the handoff):

- **Tokens** — `src/styles/tokens/*` (colors, type, spacing, radii, elevation,
  motion, base). Fonts (Inter, JetBrains Mono) are **self-hosted** via
  `@fontsource` (bundled by Vite — no CDN, LAN-only).
- **Design system** — `src/components/ds/*`: Button, IconButton, Input, Select,
  Checkbox, Radio/RadioGroup, Switch, Slider, Panel, Tabs, Tag, StatusPill,
  SegmentedControl, Spinner, InlineBanner, Toast/ToastViewport, Tooltip,
  PressIndicator, Dialog, and the board pieces PageSheet / PageChip / InsertionBar.
  Styles live in `src/styles/ds.css` (no runtime `<style>` injection).

Workbench (Flows A + B, real client ops):

- **Open / preview** (Flow A) — drop or pick a PDF; pages render as real paper
  sheets via **pdf.js** (hardened: `isEvalSupported:false`, `enableScripting:false`),
  thumbnails rendered lazily as sheets scroll into view. **Zero upload.**
- **Organize** (Flow B) — multi-select (click / shift-range / ⌘-toggle), keyboard
  roving focus, drag-to-reorder with the press-blue insertion bar, rotate (`R`),
  delete (`⌫`, with Undo), zoom (compact/comfortable/large), full undo/redo.
- **Export** — assembles edited bytes with **pdf-lib** in a Web Worker
  (`⌘E`) and downloads locally; the server `finalize` normalize+linearize pass is
  wired through `lib/api.ts` for when the backend is present.

Server-op scaffolding: merge / split / compress inspectors submit through the
single typed API client (`lib/api.ts`) and drive the press readout
(processing → succeeded/failed); they light up end-to-end once the backend exists.

## Layout

```
src/
  components/ds/     design-system components (+ board/ for the signature sheets)
  workbench/         Rail · BoardHeader · Worksurface · Inspector · Dropzone · Workbench
  page-model/        in-memory document + page model + undo/redo
  state/             zustand stores (document · ui · jobs)
  lib/               api.ts (single client) · pdfjs.ts · pdflib.ts · exportClient.ts · thresholds · format
  workers/           pdfExport.worker.ts (off-main-thread pdf-lib save)
  styles/            tokens/ · ds.css · app.css · styles.css (manifest)
```

## Privacy

Preview, thumbnails, page-model edits and quick text all run in the browser and
upload nothing. `lib/api.ts` is the **only** module that touches the network.
