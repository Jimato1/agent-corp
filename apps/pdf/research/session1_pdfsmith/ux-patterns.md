# PDFsmith — UX Patterns for Fast, Pleasant PDF Page Editing

Research track: **ux-patterns**. Scope: how the page-organize surface of PDFsmith (Vite + React, pdf.js) should *feel* — thumbnail grids, multi-select, drag-to-reorder, undo/redo, batch ops, and perceived-performance tricks — benchmarked against Acrobat *Organize Pages*, Apple Preview, PDF Expert, Stirling-PDF, Smallpdf, the pdf.js reference viewer, and Sejda.

This is research only — no application code. Snippets are illustrative. Everything load-bearing is grounded in the **Sources** section.

---

## 0. The hybrid principle that drives every UX decision

PDFsmith's architecture is **hybrid**: page-level structural ops (reorder, rotate, delete, extract, preview) run client-side; heavy byte work (OCR, compression, linearization, encryption) goes to FastAPI. The single most important UX consequence:

> **The browser never edits PDF bytes during page organizing. It edits a lightweight in-memory "page model" (an ordered array of page descriptors). Bytes are only rewritten once — on export/apply — by the backend (pikepdf) or client (pdf-lib).**

This is what makes Acrobat Organize Pages and Apple Preview feel instant: dragging page 300 to position 2 in a 500-page doc is an array splice, not a file rewrite. Defer the expensive part. Every section below assumes this model.

A page descriptor is cheap:

```ts
type PageRef = {
  id: string;          // stable uuid — NOT the page index (index changes on reorder)
  srcDocId: string;    // which loaded document it came from (enables cross-doc merge)
  srcPageIndex: number;// original 0-based index in that source PDF
  rotation: 0|90|180|270; // delta applied in the editor, not yet baked
  deleted?: boolean;   // soft-delete for cheap undo (see §4)
};
```

The `id` being **stable and decoupled from position** is the linchpin for dnd-kit keys, React reconciliation, multi-select sets, and undo — get this wrong and everything else jitters.

---

## 1. Page-thumbnail grid: rendering, caching, virtualization

### 1.1 Generating a thumbnail with pdf.js

pdf.js is the right and only sane client renderer. The minimal render path:

```js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
const page = await pdf.getPage(pageNumber);            // 1-based
const baseViewport = page.getViewport({ scale: 1 });   // points: US Letter = 612×792
const scale = TARGET_THUMB_WIDTH_CSS_PX / baseViewport.width;
const viewport = page.getViewport({ scale });
const task = page.render({ canvasContext: ctx, viewport });
await task.promise;
```

Key facts (grounded in pdf.js docs/issues and the Tarkarn rendering guide):

- **Scale multiplies the PDF's declared point size, not CSS pixels.** Compute `scale = desiredCssWidth / viewport(scale:1).width` rather than guessing.
- **Device pixel ratio matters even for thumbnails.** Set the canvas *bitmap* to `Math.floor(viewport.width * dpr)` and use CSS to size it down, or text/edges look blurry on retina/HiDPI. Don't crank `dpr` for the *grid* though — a 150px thumbnail at dpr 2 is plenty; reserve true-dpr rendering for the zoomed/preview pane.
- **`RenderTask.cancel()` is mandatory.** Multiple `render()` calls on one canvas race; if a user scrolls fast or the virtualizer recycles a tile, cancel the in-flight task before starting a new one or you get "Cannot use the same canvas during multiple render() operations" and corrupted tiles.
- **Memory discipline on big docs:** call `page.cleanup()` after rendering a page and `pdf.destroy()` when closing the document. Rendering all 500 pages eagerly exhausts memory.
- **Worker already off-main-thread:** pdf.js parses in its `pdf.worker` web worker by default — you get that for free. `enableHWA: true` (hardware-accelerated canvas) and `isOffscreenCanvasSupported` are extra perf knobs; OffscreenCanvas in a worker is only safe to *require* on Safari ≥ 16.4, so treat it as progressive enhancement, not a baseline.

### 1.2 Caching strategy (the part most clones get wrong)

| Layer | What | Why | Eviction |
|---|---|---|---|
| L1: rendered bitmap | `ImageBitmap` (or `<canvas>`/blob URL) keyed by `pageRef.id + rotation + tier` | Avoid re-rasterizing on every scroll | LRU, cap ~120 live bitmaps |
| L2: render-in-flight | `Map<id, RenderTask>` | Dedupe + cancel | cleared on completion/cancel |
| L3: placeholder | aspect-ratio box w/ skeleton shimmer | Layout stability before pixels exist | n/a |

- **Key the cache by `pageRef.id`, not by index.** Reorders and deletes must not invalidate already-rendered bitmaps. Rotation is part of the key (or apply rotation via CSS `transform: rotate()` on the tile and skip re-render entirely — far cheaper, recommended for the 90° quick-rotate affordance; only bake rotation into a fresh render if you need it for export preview).
- **Use `createImageBitmap()`** from the rendered canvas and cache the `ImageBitmap`. It's transferable, GPU-friendly, and cheaper to re-paint than re-running pdf.js.
- **Don't cache blob URLs without revoking** — `URL.revokeObjectURL` on eviction or you leak.

### 1.3 Virtualization / windowing for 500-page docs

Rendering 500 DOM tiles + 500 canvases tanks the main thread. **Virtualize.** Recommended: **`@tanstack/react-virtual`** (headless, framework-agnostic measurements, actively maintained) over `react-window`/`react-virtualized` for a custom grid because PDFsmith needs a *responsive* grid (column count changes with viewport) plus drag-and-drop integration — react-window's canned Grid fights both.

Grid pattern (from the TanStack window-grid writeup):
- Compute `columns` from container width via `matchMedia`/ResizeObserver.
- `rows = ceil(pageCount / columns)`.
- One **row virtualizer** (`useVirtualizer`, vertical) with `estimateSize: () => rowHeightPx`, `overscan: 6–8`, `gap`. Render only the `columns` tiles inside each visible row (no need to virtualize columns at typical 4–8 cols).
- Position rows with `transform: translateY(virtualRow.start)` inside a spacer of `getTotalSize()` height. Use `measureElement` ref if tile heights vary (mixed page sizes/orientations).
- Prefer the **scroll-container virtualizer** (a dedicated scrollable panel) over `useWindowVirtualizer` for an app shell — it keeps the toolbar pinned and `scrollMargin` math simpler.

### 1.4 Progressive / upgrade-on-zoom

Three render tiers, rendered lazily as a tile enters the viewport:
1. **Tier 0 — skeleton:** instant, CSS only, correct aspect ratio.
2. **Tier 1 — grid thumb:** ~150–220px wide, dpr-capped at ~1.5. Rendered when tile is within overscan.
3. **Tier 2 — zoom/preview:** full dpr, rendered on hover-zoom, lightbox open, or grid zoom-slider increase. Upgrade replaces the cached bitmap for that `id`.

Debounce tier-1 renders behind scroll: only kick off a render when the tile has been in-window for ~100–150ms (cancel if it scrolled out). This is what stops jank on a flung scroll through 500 pages — you never start renders for tiles the user is flying past.

---

## 2. Multi-select interaction model

Match the OS file-manager mental model (Finder/Explorer) exactly — users already know it. State is a `Set<pageId>` plus an `anchorId` for range math.

| Gesture | Behavior | Notes |
|---|---|---|
| Click | Select only this; set anchor | Clears prior selection |
| Shift+Click | Select contiguous range anchor→target (by *visual* order) | Anchor stays put; updating shift re-clicks recompute from same anchor |
| Ctrl/Cmd+Click | Toggle this item in/out; set anchor to it | Cmd on macOS, Ctrl on Win/Linux — detect via `event.metaKey || event.ctrlKey` |
| Marquee (drag on empty space) | Rubber-band; any tile *intersecting* the rect is selected; Shift/Ctrl extends | Start must be on background, not a tile, to disambiguate from drag-reorder |
| Ctrl/Cmd+A | Select all | |
| Esc / click empty | Clear | |
| Arrow keys | Move focus; Shift+Arrow extends range; Space/Enter toggles | Keyboard-accessible parity |

**Power affordances worth shipping** (Acrobat/Sejda have these, most clones don't): **Select All / None / Odd / Even / Invert**, and "select all landscape" or "select all this size". Odd/even is genuinely useful for two-sided scan cleanup. These are trivial given the page model — filter the array, build the Set.

Implementation gotchas:
- **Shift-range must use visual order, not insertion order** — compute from the current rendered array index of anchor and target.
- Keep selection a `Set` of stable ids so it survives reorders (a selected page stays selected after you drag it).
- Marquee + virtualization: tiles outside the window aren't in the DOM, so hit-test against *geometry the virtualizer knows* (row/col → rect), not `getBoundingClientRect` on absent nodes.

---

## 3. Drag-to-reorder (single, multi, and cross-document)

### 3.1 Library choice — recommendation: **dnd-kit**

| Library | Verdict for PDFsmith | Why |
|---|---|---|
| **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) | **Recommended** | Built for React, virtualization-aware via `<DragOverlay>`, uses GPU-friendly `transform: translate3d`/`scale` (no DOM mutation, no layout thrash), pointer/keyboard/touch sensors, configurable auto-scroller, `SortableContext` strategies for grids. |
| react-dnd | No | HTML5-backend baggage, heavier, more boilerplate, weaker virtualization story; power (nested DnD types) PDFsmith doesn't need. |
| react-beautiful-dnd | No | Deprecated/unmaintained; doesn't virtualize well; not for grids. |
| Pragmatic drag-and-drop (Atlassian) | Viable alt | Framework-agnostic, very performant; but more wiring for React grid + multi-select than dnd-kit. Keep as fallback. |
| framer-motion `Reorder` | No (for this) | Lovely for small lists/animations; not designed for 500-item virtualized grids or cross-container multi-drag. Use motion for micro-animations only. |

dnd-kit lazily computes/stores initial positions and shifts items with `translate3d`/`scale` (transform props that don't trigger repaint), which is exactly why it stays smooth with many items — the documented design rationale.

### 3.2 Multi-page drag

dnd-kit has no built-in "drag a multi-selection," but the established pattern is straightforward:
1. On drag start, if the dragged `id` is in the selection `Set`, drag the **whole set**; if not, reset selection to just that id (Finder behavior).
2. Render a **custom `<DragOverlay>`** showing a stacked/fanned badge ("12 pages") rather than one tile — the overlay can be any JSX.
3. On drop, splice *all* selected pages out and reinsert them as a contiguous block at the target index, preserving their relative order.

`<DragOverlay>` is **mandatory with virtualization**: the original drag source unmounts when the virtualized container scrolls, which would kill the drag — the overlay is decoupled from the list and survives. Rules from the docs: keep the overlay component **always mounted** (conditionally render its *children*, not the component); components inside it **must not** call `useDraggable`; default `zIndex` is 999 (lower it).

### 3.3 Drop indicators & auto-scroll

- **Drop indicator:** show an insertion caret (a 2–3px vertical/horizontal bar) *between* tiles at the computed target slot, not a "this tile will be replaced" highlight — reorder is insert-between, not swap. dnd-kit's sortable gives you the projected index; render the caret there.
- **Auto-scroll at edges:** dnd-kit's AutoScroller plugin scrolls when the pointer enters an activation zone near a scroll container edge; speed scales linearly toward the edge. Tune the activation threshold (e.g. `0.2` = outer 20%). This is essential for dragging page 1 → page 480 without manual scrolling.
- **Sortable strategy:** for a grid use `rectSortingStrategy` (not the vertical/horizontal list strategies). Note the list strategies "support virtualized lists"; for a 2-D grid, `rectSortingStrategy` + `<DragOverlay>` is the combo.

### 3.4 Cross-document drag (merge)

Because `PageRef` carries `srcDocId`, cross-document merge is "free": load multiple PDFs into multiple `SortableContext`s (or one context with multiple droppable lanes) and let a page dragged from doc A drop into doc B's order. The page model just records a `PageRef` pointing at A's bytes; the actual merge happens at export when the backend (pikepdf) assembles the final file. This is the Sejda/Smallpdf "merge & rearrange" experience and PDFsmith gets it almost for free from the model.

---

## 4. Undo/redo

### 4.1 Model — command/operation stack over an immutable page model

Recommendation: **operation-log + immutable page-model**, *not* mutate-in-place, and *not* full-document snapshots.

- Each user action becomes a **Command** object: `{ type, apply(model)→model, invert(model)→model }` (or store enough payload to derive the inverse). Undo = pop command, apply its inverse; redo = re-apply. This is the textbook Command pattern, and keeping commands **immutable** is what makes undo/redo reliable (a held reference never mutates underneath you).
- The page model is small (an array of `PageRef`s), so produce a **new array per op** with structural sharing via **Immer** (`produce`) — cheap, and gives you a clean before/after for free if you'd rather store patches than inverse commands. Immer's `produceWithPatches` yields `patches`/`inversePatches`, which *is* an undo log.

Why this beats mutation:
- Mutation makes undo require deep clones or fragile reverse-mutations; an immutable swap is O(1)-ish with structural sharing and trivially correct.
- Because the model is lightweight, "snapshot the whole model" is also acceptable up to a point — but for a 500-page doc the array is 500 small objects; patch/inverse-command logs keep memory flat over a long edit session.

### 4.2 Keeping undo cheap on large docs

- **Operate on the page model, defer byte rewrite.** Undoing a delete must be instant — it flips `deleted` back or re-inserts a `PageRef`, never re-parses or re-writes the PDF. The byte cost is paid once at export.
- **Soft-delete** (`deleted: true` + filter from view) makes delete/undo a flag toggle and preserves the rendered-bitmap cache for that `id` so an undo doesn't trigger a re-render.
- **Coalesce** rapid same-type ops (e.g. three quick rotates of one page) into one undo step with a debounce/merge window, so undo doesn't feel like it "barely moves."
- Cap history depth (e.g. 100 ops) and keep stacks per-document.

A CAD-style caveat from the literature: snapshotting an entire large model per step is the thing to avoid — that's a memory blowup. Patches/inverse-commands sidestep it.

---

## 5. Batch operations & server-job progress

### 5.1 Apply a selection-wide op

Rotate/delete/extract over a multi-selection are pure page-model edits → one command, instant, optimistic. No server round-trip for the *organize* step. "Extract" = spawn a new doc/model from the selected `PageRef`s (or mark for export-as-separate). Bulk affordances: a context toolbar that appears when `selection.size > 0` ("12 selected — Rotate ⟳ ⟲ · Delete · Extract · Export").

### 5.2 When the op IS a server job (OCR, compress, linearize, encrypt)

These hit FastAPI. Progress-feedback recommendation:

| Mechanism | Use it when | Trade-off |
|---|---|---|
| **Polling** (`POST /jobs` → `id`, then `GET /jobs/{id}`) | Default. Single-container homelab, no fan-out, simplicity wins | Slightly chattier; trivial to implement & reason about; survives reconnects |
| **SSE** (`EventSource`, `text/event-stream`) | You want smooth, true-progress bars (OCR page 37/120) pushed in real time | One-way server→client over plain HTTP, native browser support, simpler than WS; reverse proxy must not buffer the stream |
| **WebSocket** | Not recommended here | Bidirectional/duplex is overkill for progress; harder to scale/operate; reconnection logic |

**Recommendation:** ship **polling first** (robust, dead-simple, great behind any reverse proxy), and add **SSE** for the long jobs (OCR especially) where a moving per-page progress bar materially improves UX. The community consensus — "if unsure, start with SSE" for server→client streaming — holds, but for a self-hosted single container, polling's operational simplicity makes it the safe default with SSE as the upgrade. Avoid WebSockets unless you later add collaborative editing.

Reverse-proxy gotcha for SSE: disable response buffering (`X-Accel-Buffering: no` for nginx; equivalent for Caddy/Traefik) and set generous read timeouts, or progress events arrive in a clump at the end.

FastAPI specifics: kick the job to a background worker (FastAPI `BackgroundTasks` for short jobs; a real queue/worker process for OCR/Ghostscript which are CPU-heavy and will block an event loop). Return `202 Accepted` + job id immediately; never run a 90s OCR inside the request handler.

### 5.3 Optimistic UI for server jobs

- For *reversible-looking* ops, update the UI immediately and reconcile on completion. React 19's **`useOptimistic`** is purpose-built: render the optimistic state instantly, auto-revert if the action rejects.
- For *irreversible/expensive* server ops, prefer an explicit pending state (skeleton/dimmed + progress) over a fake-success optimistic flip — a failed OCR that silently rolls back is more jarring than an honest progress bar. Use `useTransition`'s `isPending` to drive *subtle* feedback (dimmed button, inline spinner) instead of a full-screen blocker.

---

## 6. What makes it FEEL fast — concrete React recommendations

The perception budget: respond to input in <100ms, show *something* for any wait, never block the main thread. Tactics, mapped to PDFsmith:

1. **Instant client-side preview.** All organize ops mutate the page model and re-render the (virtualized) grid synchronously. No spinner ever appears for reorder/rotate/delete — they're array ops.
2. **Optimistic updates** (`useOptimistic`) for the handful of ops that do touch the server, with honest progress for the expensive ones.
3. **Skeleton/placeholder thumbnails** (Tier 0) so the grid has correct layout and shimmer *before* any pixels render — eliminates layout shift and the "blank then pop" feeling. `<Suspense>` fallbacks for async chunks.
4. **Debounced/canceled renders** behind scroll (§1.4) — start a render only after a tile dwells in-window ~120ms; `RenderTask.cancel()` everything that scrolled away. This is the difference between buttery and janky on a 500-page fling.
5. **Off the main thread.** pdf.js parsing is already in its worker. Add `enableHWA: true`; treat OffscreenCanvas-in-worker rendering as progressive enhancement (Safari ≥16.4). For heavy *client* assembly (pdf-lib export), run it in a dedicated worker so the UI never freezes.
6. **`useTransition` for non-urgent updates.** Wrap expensive list recomputations (e.g. re-sorting after a big multi-move, switching zoom tier across the whole grid) in a transition so typing/scrolling/click feedback stays instant; drive feedback from `isPending`, not a modal spinner.
7. **GPU-cheap motion.** Reorder shifts via dnd-kit's `translate3d`/`scale`; quick-rotate via CSS `transform: rotate()` on the cached bitmap (no re-raster). Keep animations on `transform`/`opacity` only.
8. **`content-visibility: auto`** on tiles as a cheap complement to virtualization for the rows just outside the window — lets the browser skip rendering/layout of off-screen content.
9. **Stable keys.** React keys = `pageRef.id` (never index). Index keys + reorder = full remount of every moved tile = re-render storm and lost canvas state. This one mistake silently destroys all the above.
10. **Memoize tiles** (`React.memo`) keyed on `id + tier + rotation + selected` so a selection change repaints only the toggled tiles, not 200 of them.

---

## 7. Recommendations (decision-ready)

1. **Edit a lightweight `PageRef[]` model client-side; rewrite bytes once at export (pikepdf on the backend, or pdf-lib in a worker).** This is the foundation that makes reorder/rotate/delete/undo all instant.
2. **Stable, position-independent `id` on every page; React keys, dnd-kit keys, selection Set, and bitmap cache all key off it.** Non-negotiable.
3. **Virtualize the grid with `@tanstack/react-virtual`** (row virtualizer + N tiles/row, responsive column count, overscan 6–8). Skip react-window's canned Grid.
4. **dnd-kit for drag-reorder** with `rectSortingStrategy`, a custom always-mounted `<DragOverlay>` (stacked "N pages" badge for multi-drag), the AutoScroller plugin (~0.2 edge zone), and insertion-caret drop indicators. Cross-doc merge falls out of the model for free.
5. **Three-tier progressive thumbnails** (skeleton → grid thumb → zoom render), rendered lazily on viewport entry, **with `RenderTask.cancel()` and `page.cleanup()`** for memory/jank control.
6. **Finder/Explorer multi-select** (click, shift-range by visual order, ctrl/cmd-toggle, marquee, Cmd+A, arrows/space) plus power selectors **All/None/Odd/Even/Invert**.
7. **Undo/redo as an immutable command/patch log over the page model** (Immer `produceWithPatches` or inverse-command objects), soft-delete for cheap delete-undo, coalesce rapid ops, cap depth ~100. Never snapshot bytes.
8. **Server jobs: polling by default, SSE for OCR-style long jobs**; return `202` + job id immediately; never block the request thread; disable proxy buffering for SSE. No WebSockets.
9. **Perceived-speed stack:** optimistic/instant model edits, `useOptimistic`/`useTransition` for server ops, skeletons + `<Suspense>`, debounced+canceled renders, `React.memo` tiles, `content-visibility: auto`, CSS-transform rotations, work in workers.

---

## 8. Gotchas / pitfalls

- **Index-as-key kills everything.** React/dnd-kit keys must be the stable `id`. Index keys cause remounts on reorder, lost canvas state, and a re-render storm — and silently defeat virtualization + memoization.
- **`RenderTask` races** corrupt canvases: "Cannot use the same canvas during multiple render() operations." Always cancel the in-flight task when a tile recycles or the user re-triggers.
- **Virtualization + drag-source unmount:** without `<DragOverlay>`, scrolling during a drag unmounts the source and breaks the drag. Overlay is required, must stay mounted, and its children must not use `useDraggable`.
- **Marquee hit-testing absent DOM nodes:** virtualized tiles outside the window aren't in the DOM; compute intersection from virtualizer geometry, not `getBoundingClientRect`.
- **Rotation baked vs. CSS:** baking rotation into a re-render is wasteful for the quick-rotate affordance — use CSS `transform: rotate()` on the cached bitmap and only bake at export. But remember the *export* must apply the rotation to bytes (pikepdf `page.rotate` / `/Rotate`), or the visual and the file disagree.
- **dpr blur vs. memory:** too-low dpr → blurry thumbs; full dpr on 500 tiles → memory blowup. Cap grid thumbs at ~1.5 dpr; reserve true dpr for the zoom tier.
- **Blob-URL / ImageBitmap leaks:** revoke object URLs and `close()` ImageBitmaps on LRU eviction; call `pdf.destroy()` on document close.
- **OffscreenCanvas isn't universal:** Safari only since 16.4 — progressive enhancement with a main-thread fallback, never a hard dependency.
- **SSE behind a reverse proxy:** buffering must be disabled (`X-Accel-Buffering: no` / proxy equivalent) and read timeouts raised, or progress events clump at the end. This bites homelab Caddy/nginx/Traefik setups.
- **Blocking the event loop with OCR/Ghostscript:** these are CPU-bound; running them in-process blocks FastAPI's async loop and freezes *all* requests. Use a worker process/queue, not just `BackgroundTasks`.
- **Optimistic UI for irreversible server ops** is a trap: a silently-rolled-back failed OCR is worse than an honest progress bar. Optimism for cheap/reversible; explicit pending for expensive.
- **Shift-range off the wrong order:** range selection must use the *current visual* order, not original insertion order, or selections look scrambled after reorders.

---

## 9. Operation → ownership map

| Operation | Where it runs | Cost model | UX |
|---|---|---|---|
| Reorder (single/multi) | Client (page model) | array splice | Instant, optimistic |
| Rotate (quick) | Client (CSS transform + model flag) | O(1) | Instant |
| Delete | Client (soft-delete flag) | O(1) | Instant, instant-undo |
| Extract / split | Client (new model from selection) | array filter | Instant |
| Merge / cross-doc | Client model; bytes assembled at export | deferred | Instant in UI |
| Thumbnail/preview | Client (pdf.js worker) | lazy raster | Skeleton → progressive |
| Export / save | Backend pikepdf (or client pdf-lib worker) | one byte rewrite | Progress (poll) |
| OCR | Backend ocrmypdf/Tesseract | minutes | SSE per-page progress |
| Compress | Backend Ghostscript | seconds–min | Poll/SSE |
| Linearize / encrypt | Backend pikepdf/qpdf | seconds | Poll |

---

## Sources

pdf.js rendering, workers, performance:
- pdf.js rendering & viewer implementation guide — https://tarkarn.com/blog/pdfjs-rendering-guide
- pdf.js Examples (official) — https://mozilla.github.io/pdf.js/examples/
- pdf.js API source (JSDoc: getDocument/getViewport/render/cleanup, enableHWA, isOffscreenCanvasSupported) — https://mozilla.github.io/pdf.js/api/draft/api.js.html
- pdf.js issue #16273 (image quality / scale) — https://github.com/mozilla/pdf.js/issues/16273
- pdf.js issue #9973 (render to fixed size / scale math) — https://github.com/mozilla/pdf.js/issues/9973
- pdf.js issue #10319 (canvas rendering in a web worker) — https://github.com/mozilla/pdf.js/issues/10319
- pdf.js issue #15278 (rendering large pdf in web worker) — https://github.com/mozilla/pdf.js/issues/15278
- MDN OffscreenCanvas — https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- web.dev: OffscreenCanvas — https://web.dev/articles/offscreen-canvas

Virtualization:
- TanStack Virtual (official) — https://tanstack.com/virtual/latest
- TanStack Virtual — window example — https://tanstack.com/virtual/v3/docs/framework/react/examples/window
- Virtualized responsive grid with TanStack Virtual — https://adamcollier.co.uk/posts/using-tanstack-virtual-and-window-virtualisation-for-a-grid-of-items/
- web.dev: Virtualize large lists with react-window — https://web.dev/articles/virtualize-long-lists-react-window

Drag & drop:
- dnd-kit (official) — https://dndkit.com/
- dnd-kit DragOverlay docs — https://dndkit.com/api-documentation/draggable/drag-overlay
- dnd-kit Sortable preset (list strategies, virtualization note) — https://docs.dndkit.com/presets/sortable
- dnd-kit AutoScroller plugin — https://dndkit.com/extend/plugins/auto-scroller
- dnd-kit Draggable docs — https://docs.dndkit.com/api-documentation/draggable
- npm-compare: dnd-kit vs react-dnd vs react-beautiful-dnd vs react-sortable-hoc — https://npm-compare.com/@dnd-kit/core,react-beautiful-dnd,react-dnd,react-sortable-hoc
- Top drag-and-drop libraries for React (Puck) — https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react
- dnd-kit vs react-beautiful-dnd vs Pragmatic DnD (2026) — https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026

Multi-select UX:
- Selecting with Cmd/Ctrl/Shift — https://www.sdmfoundation.org/2017/11/02/selecting-using-command-control-shift-make-selections/
- Ctrl + Shift precision selection — https://www.pcisdeadagain.com/p/how-to-use-ctrl-and-shift-to-select
- Select files in Windows 11 (marquee) — https://www.teachucomp.com/select-files-in-windows-11-instructions/

Undo/redo:
- Command pattern for undo/redo (Gernot Klingler) — https://gernotklingler.com/blog/implementing-undoredo-with-the-command-pattern/
- Immutability & observability for reliable undo/redo — https://blog.voyonic-systems.de/leveraging-immutability-and-observability-for-reliable-undo-redo-in-document-based-applications/
- Command pattern in text-editor undo/redo — https://www.momentslog.com/development/web-backend/the-role-of-the-command-pattern-in-undo-redo-mechanisms-in-text-editors

Server jobs & perceived performance:
- Handling long-running tasks in FastAPI — https://www.datasciencebyexample.com/2023/08/26/handling-long-running-tasks-in-fastapi-python/
- FastAPI polling strategy for long tasks — https://openillumi.com/en/en-fastapi-long-task-progress-polling/
- WebSocket vs SSE vs Long Polling (2025) — https://potapov.me/en/make/websocket-sse-longpolling-realtime
- React useOptimistic (official) — https://react.dev/reference/react/useOptimistic
- useTransition for perceived performance — https://react.wiki/guides/usetransition-for-perceived-performance-smarter-ui-feedback-without-loading-spin
- Remix: Pending and Optimistic UI — https://v2.remix.run/docs/discussion/pending-ui/
