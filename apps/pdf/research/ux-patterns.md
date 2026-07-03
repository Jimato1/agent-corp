# pdf-forge — UX Patterns for Fast, Pleasant PDF Page Editing

Research track: **ux-patterns** (session 2, merged & superseding). Scope: how the page-organize surface of **pdf-forge** (Vite + React, pdf.js) should *feel* — thumbnail grids, multi-select, drag-to-reorder, undo/redo, batch ops, and perceived-performance tricks — benchmarked against Acrobat *Organize Pages*, Apple Preview, PDF Expert, Stirling-PDF, Sejda, and the pdf.js reference viewer.

This is research only — no application code. Snippets are illustrative. Everything load-bearing is grounded in the **Sources** section. Where this pass corrects or extends the session-1 file, see **§10 Changes vs. session 1**.

> **Version reality check (verified June 2026 against the npm registry):**
> `pdfjs-dist` **6.1.200** · `@tanstack/react-virtual` **3.14.5** · `@dnd-kit/core` **6.3.1** (last publish **Dec 2024**) · `@dnd-kit/sortable` **10.0.0** · `@dnd-kit/react` **0.5.0** (new rewrite, pre-1.0) · `@atlaskit/pragmatic-drag-and-drop` **2.0.1** · `@hello-pangea/dnd` **18.0.1** · `react-window` **2.x** (rewritten) · React **19.2**. These dates change the drag-and-drop recommendation materially — see §3.1.

---

## 0. The hybrid principle that drives every UX decision

pdf-forge's architecture is **hybrid**: page-level structural ops (reorder, rotate, delete, extract, preview) run client-side; heavy byte work (OCR, compression, linearization, encryption) goes to FastAPI. The single most important UX consequence:

> **The browser never edits PDF bytes during page organizing. It edits a lightweight in-memory "page model" (an ordered array of page descriptors). Bytes are only rewritten once — on export/apply — by the backend (pikepdf) or client (pdf-lib in a worker).**

This is what makes Acrobat Organize Pages and Apple Preview feel instant: dragging page 300 to position 2 in a 500-page doc is an array splice, not a file rewrite. Defer the expensive part. Every section below assumes this model.

A page descriptor is cheap:

```ts
type PageRef = {
  id: string;            // stable uuid — NOT the page index (index changes on reorder)
  srcDocId: string;      // which loaded document it came from (enables cross-doc merge)
  srcPageIndex: number;  // original 0-based index in that source PDF
  rotation: 0|90|180|270;// delta applied in the editor, not yet baked into bytes
  deleted?: boolean;     // soft-delete for cheap undo (see §4)
};
```

The `id` being **stable and decoupled from position** is the linchpin for dnd keys, React reconciliation, multi-select sets, the bitmap cache, and undo — get this wrong and everything else jitters. This holds regardless of which drag library you pick.

---

## 1. Page-thumbnail grid: rendering, caching, virtualization

### 1.1 Generating a thumbnail with pdf.js (v6 specifics)

pdf.js is the right and only sane client renderer. The minimal render path on **pdfjs-dist v6**:

```js
import * as pdfjsLib from 'pdfjs-dist';
// v4+ is ESM-only (.mjs). The worker is a module worker:
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer, enableHWA: true }).promise;
const page = await pdf.getPage(pageNumber);            // 1-based
const baseViewport = page.getViewport({ scale: 1 });   // points: US Letter = 612×792
const scale = TARGET_THUMB_WIDTH_CSS_PX / baseViewport.width;
const viewport = page.getViewport({ scale });
const task = page.render({ canvasContext: ctx, viewport });
await task.promise;
```

Key facts (grounded in the pdf.js API JSDoc, releases, and issues):

- **Scale multiplies the PDF's declared point size, not CSS pixels.** Compute `scale = desiredCssWidth / viewport(scale:1).width` rather than guessing.
- **Device-pixel-ratio matters even for thumbnails.** Set the canvas *bitmap* to `Math.floor(viewport.width * dpr)` and use CSS to size it down, or text/edges look blurry on retina/HiDPI. Don't crank `dpr` for the *grid* though — a ~180px thumbnail at dpr ≈ 1.5 is plenty; reserve true-dpr rendering for the zoomed/preview pane.
- **`RenderTask.cancel()` is mandatory.** Multiple `render()` calls on one canvas race; if a user scrolls fast or the virtualizer recycles a tile, cancel the in-flight task (and await its rejection) before starting a new one, or you get *"Cannot use the same canvas during multiple render() operations"* and corrupted tiles.
- **Memory discipline on big docs:** call `page.cleanup()` after rendering and `pdf.destroy()` when closing the document. Rendering all 500 pages eagerly exhausts memory.
- **`enableHWA` (hardware-accelerated canvas) is still a valid `getDocument`/render option, default `false`, but it was *removed from the bundled viewer components* in a 2025/2026 update.** Since pdf-forge calls `getDocument`/`page.render` directly (not the reference viewer), you can still pass `enableHWA: true`. **Caveat:** HWA and `willReadFrequently` are mutually exclusive — `willReadFrequently:true` *disables* GPU acceleration. So only enable HWA on canvases you do **not** call `getImageData()` on. Thumbnails feeding `createImageBitmap()` are fine; a canvas you read pixels back from should set `willReadFrequently` and skip HWA.
- **OffscreenCanvas is now broadly available** (all evergreen browsers; Safari since 16.4, which is years old now — no longer an exotic caveat). pdf.js itself now uses OffscreenCanvas *unconditionally* in its internal thumbnail view, and `isOffscreenCanvasSupported` (default true where available) lets the worker do image rendering off the main thread. Treat worker/OffscreenCanvas as the **default path**, with a main-thread `<canvas>` fallback only for the rare unsupported environment.

### 1.2 Caching strategy (the part most clones get wrong)

| Layer | What | Why | Eviction |
|---|---|---|---|
| L1: rendered bitmap | `ImageBitmap` keyed by `pageRef.id + tier` (rotation via CSS, see below) | Avoid re-rasterizing on every scroll | LRU, cap ~120–150 live bitmaps |
| L2: render-in-flight | `Map<id, RenderTask>` | Dedupe + cancel | cleared on completion/cancel |
| L3: placeholder | aspect-ratio box w/ skeleton shimmer | Layout stability before pixels exist | n/a |

- **Key the cache by `pageRef.id`, not by index.** Reorders and deletes must not invalidate already-rendered bitmaps.
- **Rotation: prefer CSS over re-render.** Apply quick-rotate as `transform: rotate()` on the cached tile and skip re-rasterizing entirely. Only bake rotation into a fresh render if you need a high-fidelity export *preview*. (Export still must write `/Rotate` to bytes — see §8.)
- **Use `createImageBitmap()`** from the rendered canvas and cache the `ImageBitmap`. It's transferable, GPU-friendly, and cheaper to re-paint than re-running pdf.js. Call `.close()` on eviction.
- **Don't cache blob URLs without revoking** — `URL.revokeObjectURL` on eviction or you leak.

### 1.3 Virtualization / windowing for 500-page docs

Rendering 500 DOM tiles + 500 canvases tanks the main thread. **Virtualize.**

**Recommendation: `@tanstack/react-virtual` (3.14.x).** It is headless (you own the markup, so DnD and a responsive column count are trivial to integrate), framework-current, and actively maintained. Pattern:

- Compute `columns` from container width via `ResizeObserver`/`matchMedia`.
- `rows = ceil(visiblePageCount / columns)`.
- One **row virtualizer** (`useVirtualizer`, vertical), `estimateSize: () => rowHeightPx`, `overscan: 6–8`, plus gap. Render the `columns` tiles inside each visible row (no need to virtualize columns at 4–8 cols).
- Position rows with `transform: translateY(virtualRow.start)` inside a spacer of `getTotalSize()` height. Use the `measureElement` ref if tile heights vary (mixed page sizes/orientations).
- Prefer a **dedicated scroll container** over `useWindowVirtualizer` for an app shell — it keeps the toolbar pinned and `scrollMargin` math simpler.

**`react-window` was rewritten as 2.x** (the old `FixedSizeList` is now `List`, `overscanCount` replaced by dynamic overscan, horizontal layout dropped, `onItemsRendered` → `onItemsDisplayed`, plus a `useDynamicRowHeight` hook). It is leaner than before, but its component-driven API fights a custom responsive DnD grid harder than TanStack's headless measurements do. Stick with TanStack Virtual; only reach for react-window 2.x if you want a batteries-included `Grid` and are willing to bend the DnD layer around it.

### 1.4 Progressive / upgrade-on-zoom

Three render tiers, rendered lazily as a tile enters the viewport:

1. **Tier 0 — skeleton:** instant, CSS only, correct aspect ratio.
2. **Tier 1 — grid thumb:** ~150–220px wide, dpr-capped ~1.5. Rendered when within overscan.
3. **Tier 2 — zoom/preview:** full dpr, rendered on hover-zoom, lightbox open, or grid zoom-slider increase. Upgrade replaces the cached bitmap for that `id`.

Debounce tier-1 renders behind scroll: only kick off a render when the tile has dwelled in-window ~100–150ms (cancel if it scrolled out). This is what stops jank on a flung scroll through 500 pages — you never start renders for tiles the user is flying past.

---

## 2. Multi-select interaction model

Match the OS file-manager mental model (Finder/Explorer) exactly — users already know it. State is a `Set<pageId>` plus an `anchorId` for range math.

| Gesture | Behavior | Notes |
|---|---|---|
| Click | Select only this; set anchor | Clears prior selection |
| Shift+Click | Select contiguous range anchor→target by **visual** order | Anchor stays put; re-shift-clicks recompute from same anchor |
| Ctrl/Cmd+Click | Toggle this item; set anchor to it | `event.metaKey \|\| event.ctrlKey` |
| Marquee (drag on empty bg) | Rubber-band; any tile *intersecting* the rect is selected; Shift/Ctrl extends | Start must be on background, not a tile, to disambiguate from drag-reorder |
| Ctrl/Cmd+A | Select all | |
| Esc / click empty | Clear | |
| Arrow keys | Move focus; Shift+Arrow extends range; Space/Enter toggles | Keyboard parity (a11y) |

**Power affordances worth shipping** (Acrobat/Sejda have these, most clones don't): **Select All / None / Odd / Even / Invert**, plus "select all landscape" / "select all this size". Odd/even is genuinely useful for two-sided scan cleanup. Trivial given the page model — filter the array, build the `Set`.

Implementation gotchas:
- **Shift-range uses *visual* order**, computed from the current rendered array index of anchor and target — not original insertion order.
- Keep selection a `Set` of stable ids so it survives reorders (a selected page stays selected after you drag it).
- **Marquee + virtualization:** tiles outside the window aren't in the DOM. Hit-test against *virtualizer geometry* (row/col → rect), not `getBoundingClientRect` on absent nodes.

---

## 3. Drag-to-reorder (single, multi, and cross-document)

### 3.1 Library choice — recommendation, with an honest 2026 caveat

This is the area where the landscape shifted since session 1. The verified facts:

| Library | Latest / last publish | State | Verdict for pdf-forge |
|---|---|---|---|
| **`@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0** | Dec 2024 | Stable, battle-tested, **but no release in ~18 months** | **Primary recommendation** — mature, well-documented, virtualization-aware. Accept the maintenance staleness. |
| **`@dnd-kit/react` 0.5.0** | Jun 2026, actively developed | New ground-up rewrite, **pre-1.0 / API not frozen** | Do **not** build production on it yet; watch for 1.0. |
| **`@atlaskit/pragmatic-drag-and-drop` 2.0.1** | Jun 2026, actively maintained (Atlassian) | Stable, framework-agnostic, tiny core, native HTML5 DnD | **Strong alternative** — pick if dnd-kit's stalled releases worry you. More wiring for a React grid + multi-select. |
| `@hello-pangea/dnd` 18.0.1 | Feb 2025 | Maintained fork of the dead react-beautiful-dnd | Good for *lists*, not 2-D grids; doesn't virtualize well. Not for this. |
| `react-dnd` | — | HTML5-backend baggage, heavier, weaker virtualization story | No. |
| framer-motion `Reorder` | — | Lovely small lists; not for 500-item virtualized grids or cross-container multi-drag | Micro-animations only. |

**Decision:** ship on **classic dnd-kit (`@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0)**. It remains the lowest-friction path for a React virtualized multi-select grid: GPU-friendly `transform: translate3d`/`scale` (no DOM mutation, no layout thrash), pointer/keyboard/touch sensors, a configurable AutoScroller, `SortableContext` strategies, and a `<DragOverlay>` that survives virtualization. The 18-month release gap is a real risk but the API is feature-complete for our needs and widely used. **Keep Pragmatic Drag and Drop as the documented fallback** — it is the actively-maintained, performance-leading option and the natural migration target if dnd-kit stays frozen or breaks under a future React. Do **not** adopt `@dnd-kit/react` 0.5.0 in production until it reaches 1.0.

> dnd-kit's design rationale — lazily computed initial positions and shifting items with transform props that don't trigger repaint — is exactly why it stays smooth with many items.

### 3.2 Multi-page drag

dnd-kit has no built-in "drag a multi-selection," but the established pattern is straightforward:
1. On drag start, if the dragged `id` is in the selection `Set`, drag the **whole set**; otherwise reset selection to just that id (Finder behavior).
2. Render a **custom `<DragOverlay>`** showing a stacked/fanned badge ("12 pages") instead of one tile — the overlay can be any JSX.
3. On drop, splice *all* selected pages out and reinsert them as a contiguous block at the target index, preserving relative order.

`<DragOverlay>` is **mandatory with virtualization**: the drag source unmounts when the virtualized container scrolls, which would kill a non-overlay drag — the overlay is decoupled from the list and survives. Rules from the docs: keep the overlay component **always mounted** (conditionally render its *children*, not the component); components inside it **must not** call `useDraggable`; default `zIndex` is 999 (often lower it).

### 3.3 Drop indicators & auto-scroll

- **Drop indicator:** show an insertion caret (2–3px bar) *between* tiles at the projected slot, not a "this tile will be replaced" highlight — reorder is insert-between, not swap. dnd-kit's sortable gives you the projected index; render the caret there.
- **Edge auto-scroll:** dnd-kit's AutoScroller scrolls when the pointer enters an activation zone near a scroll-container edge; speed scales toward the edge. Tune the threshold (e.g. outer ~20%). Essential for dragging page 1 → page 480 without manual scrolling.
- **Sortable strategy:** for a grid use **`rectSortingStrategy`** (not the vertical/horizontal list strategies). The list strategies are the ones documented as virtualization-friendly; for a 2-D grid, `rectSortingStrategy` + always-mounted `<DragOverlay>` is the combo.

### 3.4 Cross-document drag (merge)

Because `PageRef` carries `srcDocId`, cross-document merge is nearly free: load multiple PDFs, render multiple `SortableContext` lanes (or one context with multiple droppable zones), and let a page dragged from doc A drop into doc B's order. The model just records a `PageRef` pointing at A's bytes; the **actual merge happens at export**, when the backend (pikepdf) assembles the final file. This is the Sejda/Smallpdf "merge & rearrange" experience, and pdf-forge gets it almost for free from the model.

---

## 4. Undo/redo

### 4.1 Model — command/patch log over an immutable page model

Recommendation: **operation-log + immutable page-model** — *not* mutate-in-place, and *not* full-document byte snapshots.

- Each user action becomes a **Command**: `{ type, apply(model)→model, invert(model)→model }` (or store enough payload to derive the inverse). Undo = apply inverse; redo = re-apply. Keeping commands **immutable** is what makes undo/redo reliable — a held reference never mutates underneath you.
- The model is small (an array of `PageRef`s), so produce a **new array per op** with structural sharing via **Immer** (`produce`). **`produceWithPatches`** yields `patches`/`inversePatches`, which *is* an undo log — store the patch pairs and you get redo/undo without writing inverse commands by hand.

Why this beats mutation:
- Mutation makes undo require deep clones or fragile reverse-mutations; an immutable swap is cheap with structural sharing and trivially correct.
- The model is lightweight, so even whole-model snapshots are acceptable up to a point — but patch/inverse-command logs keep memory flat over a long edit session.

### 4.2 Keeping undo cheap on large docs

- **Operate on the page model, defer byte rewrite.** Undoing a delete flips `deleted` back or re-inserts a `PageRef` — it never re-parses or re-writes the PDF. Byte cost is paid once, at export.
- **Soft-delete** (`deleted:true` + filter from view) makes delete/undo a flag toggle and preserves the rendered-bitmap cache for that `id`, so undo doesn't re-render.
- **Coalesce** rapid same-type ops (e.g. three quick rotates of one page) into one undo step with a debounce/merge window.
- Cap history depth (~100 ops) and keep stacks per-document.
- **Avoid snapshotting an entire large model per step** — that's the classic memory blowup; patches/inverse-commands sidestep it.

---

## 5. Batch operations & server-job progress

### 5.1 Apply a selection-wide op

Rotate/delete/extract over a multi-selection are pure page-model edits → one command, instant, optimistic, no server round-trip. "Extract" = spawn a new doc/model from the selected `PageRef`s. Bulk affordance: a context toolbar that appears when `selection.size > 0` ("12 selected — Rotate ⟳ ⟲ · Delete · Extract · Export").

### 5.2 When the op IS a server job (OCR, compress, linearize, encrypt)

These hit FastAPI. Progress-feedback options:

| Mechanism | Use it when | Trade-off |
|---|---|---|
| **Polling** (`POST /jobs` → `id`, then `GET /jobs/{id}`) | Default. Single-container homelab, no fan-out, simplicity wins | Slightly chattier; trivial to reason about; survives reconnects |
| **SSE** (`EventSource`, `text/event-stream`) | Smooth true-progress bars (OCR "page 37/120") pushed live | One-way server→client over plain HTTP, native `EventSource`, built-in auto-reconnect; reverse proxy must not buffer |
| **WebSocket** | Not recommended here | Duplex is overkill for progress; harder to operate; manual reconnect logic |

**Recommendation:** **polling first** (robust, dead-simple, great behind any reverse proxy), add **SSE** for long jobs (OCR especially) where a moving per-page bar materially improves UX. Avoid WebSockets unless you later add collaborative editing.

**FastAPI specifics (updated):**
- FastAPI added **native SSE support in v0.135.0** (`response_class=EventSourceResponse`, `yield` events in the path operation). The mature third-party library **`sse-starlette`** (`EventSourceResponse`) remains the standard, production-tested choice and gives you W3C-compliant framing, heartbeat/ping, and graceful shutdown. Either works.
- Return **`202 Accepted` + job id immediately**; never run a 90s OCR inside the request handler.
- For short jobs, FastAPI `BackgroundTasks` is fine. For CPU-bound OCR/Ghostscript, use a **separate worker process / queue** (or at minimum `run_in_executor`/a process pool) — running them in-process blocks the async event loop and freezes *all* requests.
- **Reverse-proxy gotcha for SSE:** disable response buffering (`X-Accel-Buffering: no` for nginx; Caddy/Traefik equivalents) and raise read timeouts, or progress events arrive in a clump at the end.

### 5.3 Optimistic UI for server jobs

- For *reversible-looking* ops, update the UI immediately and reconcile on completion. React 19's **`useOptimistic`** renders the optimistic state instantly and auto-reverts if the action rejects.
- For *irreversible/expensive* server ops, prefer an explicit pending state (skeleton/dimmed + progress) over a fake-success flip — a silently-rolled-back failed OCR is more jarring than an honest progress bar. Drive *subtle* feedback (dimmed button, inline spinner) from `useTransition`'s `isPending`, not a full-screen blocker.

---

## 6. What makes it FEEL fast — concrete React recommendations

Perception budget: respond to input in <100ms, show *something* for any wait, never block the main thread.

1. **Instant client-side preview.** All organize ops mutate the page model and re-render the (virtualized) grid synchronously. No spinner ever appears for reorder/rotate/delete — they're array ops.
2. **Optimistic updates** (`useOptimistic`) for the few ops that touch the server, with honest progress for the expensive ones.
3. **Skeleton/placeholder thumbnails** (Tier 0) so the grid has correct layout and shimmer *before* pixels render — eliminates layout shift and the "blank then pop" feeling. `<Suspense>` fallbacks for async chunks.
4. **Debounced/canceled renders** behind scroll (§1.4): start a render only after a tile dwells ~120ms; `RenderTask.cancel()` everything that scrolled away. The difference between buttery and janky on a 500-page fling.
5. **Off the main thread.** pdf.js parsing is already in its worker. Use OffscreenCanvas (now baseline) for off-main-thread rasterization; run heavy *client* assembly (pdf-lib export) in a dedicated worker so the UI never freezes.
6. **`useTransition` for non-urgent updates.** Wrap expensive list recomputations (re-sorting after a big multi-move, switching zoom tier across the grid) in a transition so click/scroll feedback stays instant; feedback from `isPending`, not a modal spinner.
7. **GPU-cheap motion.** Reorder shifts via dnd-kit's `translate3d`/`scale`; quick-rotate via CSS `transform: rotate()` on the cached bitmap (no re-raster). Keep animations on `transform`/`opacity` only.
8. **`content-visibility: auto`** on tiles as a cheap complement to virtualization for rows just outside the window.
9. **Stable keys.** React keys = `pageRef.id` (never index). Index keys + reorder = full remount of every moved tile = re-render storm and lost canvas state. This one mistake silently destroys everything above.
10. **Memoize tiles** (`React.memo`) keyed on `id + tier + rotation + selected` so a selection change repaints only the toggled tiles, not 200 of them.

---

## 7. Recommendations (decision-ready)

1. **Edit a lightweight `PageRef[]` model client-side; rewrite bytes once at export** (pikepdf on the backend, or pdf-lib in a worker). Foundation that makes reorder/rotate/delete/undo all instant.
2. **Stable, position-independent `id` on every page**; React keys, dnd keys, selection `Set`, and bitmap cache all key off it. Non-negotiable.
3. **Virtualize with `@tanstack/react-virtual` 3.x** (row virtualizer + N tiles/row, responsive column count, overscan 6–8). react-window 2.x is a viable batteries-included alternative but fights the custom DnD grid more.
4. **Drag-reorder on classic dnd-kit (`@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0)** with `rectSortingStrategy`, an always-mounted custom `<DragOverlay>` (stacked "N pages" badge), the AutoScroller (~0.2 edge zone), and insertion-caret drop indicators. **Pragmatic Drag and Drop 2.x is the documented fallback** given dnd-kit's stalled release cadence; avoid `@dnd-kit/react` 0.5.0 until 1.0. Cross-doc merge falls out of the model for free.
5. **Three-tier progressive thumbnails** (skeleton → grid thumb → zoom render), rendered lazily on viewport entry, with `RenderTask.cancel()` and `page.cleanup()`. Use OffscreenCanvas off the main thread (now baseline). Enable `enableHWA` only on canvases you don't `getImageData()` from.
6. **Finder/Explorer multi-select** (click, shift-range by visual order, ctrl/cmd-toggle, marquee, Cmd+A, arrows/space) plus power selectors **All/None/Odd/Even/Invert**.
7. **Undo/redo as an immutable command/patch log over the page model** (Immer `produceWithPatches` or inverse-command objects), soft-delete for cheap delete-undo, coalesce rapid ops, cap depth ~100. Never snapshot bytes.
8. **Server jobs: polling by default, SSE for OCR-style long jobs** (FastAPI native SSE v0.135.0 or `sse-starlette`); return `202` + job id immediately; offload CPU work to a worker process; disable proxy buffering for SSE. No WebSockets.
9. **Perceived-speed stack:** optimistic/instant model edits, `useOptimistic`/`useTransition` for server ops, skeletons + `<Suspense>`, debounced+canceled renders, `React.memo` tiles, `content-visibility: auto`, CSS-transform rotations, work in workers.

---

## 8. Gotchas / pitfalls

- **Index-as-key kills everything.** React/dnd keys must be the stable `id`. Index keys cause remounts on reorder, lost canvas state, a re-render storm — and silently defeat virtualization + memoization.
- **`RenderTask` races** corrupt canvases (*"Cannot use the same canvas during multiple render() operations"*). Always cancel the in-flight task — and await its rejection — when a tile recycles or the user re-triggers.
- **Virtualization + drag-source unmount:** without `<DragOverlay>`, scrolling during a drag unmounts the source and breaks the drag. Overlay must stay mounted; its children must not call `useDraggable`.
- **Marquee hit-testing absent DOM nodes:** virtualized off-window tiles aren't in the DOM; compute intersection from virtualizer geometry, not `getBoundingClientRect`.
- **Rotation: CSS vs. baked.** Use CSS `transform: rotate()` for the quick-rotate affordance (no re-raster), but the **export must apply rotation to bytes** (pikepdf sets `/Rotate` on the page), or the visual and the file disagree.
- **`enableHWA` ⊥ `willReadFrequently`.** HWA disables fast pixel readback and vice-versa. Enabling HWA on a canvas you later `getImageData()` from causes high CPU / lag. Pick per-canvas based on whether you read pixels back.
- **pdf.js is ESM-only since v4.** v6 worker is `pdf.worker.min.mjs`; configure `workerSrc` via `new URL(..., import.meta.url)` under Vite. CommonJS `require` of pdfjs-dist is gone; Node/SSR setups need the legacy build or a canvas polyfill.
- **dpr blur vs. memory:** too-low dpr → blurry thumbs; full dpr on 500 tiles → memory blowup. Cap grid thumbs ~1.5 dpr; reserve true dpr for the zoom tier.
- **Bitmap / blob-URL leaks:** `URL.revokeObjectURL` and `ImageBitmap.close()` on LRU eviction; `pdf.destroy()` on document close.
- **SSE behind a reverse proxy:** buffering must be off (`X-Accel-Buffering: no` / equivalent) and read timeouts raised, or progress clumps at the end. Bites homelab Caddy/nginx/Traefik setups.
- **Blocking the event loop with OCR/Ghostscript:** CPU-bound; in-process they freeze *all* FastAPI requests. Use a worker process/queue or a process-pool executor, not just `BackgroundTasks`.
- **Optimistic UI for irreversible server ops** is a trap: a silently-rolled-back failed OCR is worse than an honest progress bar. Optimism for cheap/reversible; explicit pending for expensive.
- **Shift-range off the wrong order:** range selection must use *current visual* order, not original insertion order, or selections look scrambled after reorders.
- **dnd-kit maintenance risk:** `@dnd-kit/core` hasn't shipped since Dec 2024 while the maintainer focuses on the pre-1.0 `@dnd-kit/react` rewrite. It works today, but pin versions, watch for React-version breakage, and keep the Pragmatic-DnD escape hatch in mind.

---

## 9. Operation → ownership map

| Operation | Where it runs | Cost model | UX |
|---|---|---|---|
| Reorder (single/multi) | Client (page model) | array splice | Instant, optimistic |
| Rotate (quick) | Client (CSS transform + model flag) | O(1) | Instant |
| Delete | Client (soft-delete flag) | O(1) | Instant, instant-undo |
| Extract / split | Client (new model from selection) | array filter | Instant |
| Merge / cross-doc | Client model; bytes assembled at export | deferred | Instant in UI |
| Thumbnail/preview | Client (pdf.js worker + OffscreenCanvas) | lazy raster | Skeleton → progressive |
| Export / save | Backend pikepdf (or client pdf-lib worker) | one byte rewrite | Progress (poll) |
| OCR | Backend ocrmypdf/Tesseract (worker process) | minutes | SSE per-page progress |
| Compress | Backend Ghostscript (worker process) | seconds–min | Poll/SSE |
| Linearize / encrypt | Backend pikepdf/qpdf | seconds | Poll |

---

## 10. Changes vs. session 1

**Corrected / updated:**
- **Drag-and-drop recommendation is now nuanced.** Session 1 flatly recommended dnd-kit. Verified versions show `@dnd-kit/core` (6.3.1) has had **no release since Dec 2024**, the maintainer's energy is in a **pre-1.0 rewrite `@dnd-kit/react` 0.5.0**, and **Pragmatic Drag and Drop matured to 2.0.1** (actively maintained, Atlassian). I still pick classic dnd-kit as primary but flag the staleness and elevate Pragmatic DnD from "viable alt" to documented fallback; explicitly warn off `@dnd-kit/react` 0.5.0 for production.
- **react-beautiful-dnd:** session 1 called it "deprecated/unmaintained" (correct) but missed that the maintained successor fork is **`@hello-pangea/dnd` (18.0.1)**. Added (though still not recommended for a grid).
- **pdf.js is now v6** (`pdfjs-dist` 6.1.200) and **ESM-only since v4**. Added v6/ESM migration notes; confirmed the `.mjs` worker path session 1 used.
- **`enableHWA`:** session 1 said "add `enableHWA: true`." Refined: it's still a valid `getDocument` option (default `false`) **but was removed from the bundled viewer components**, and it is **mutually exclusive with `willReadFrequently`** — only enable it on canvases you don't read pixels back from. Session 1 missed that trade-off.
- **OffscreenCanvas:** session 1 framed it as a Safari-≥16.4 progressive-enhancement caveat. It is now **baseline across evergreen browsers**, pdf.js uses it **unconditionally in its own thumbnail view**, and `isOffscreenCanvasSupported` defaults on. Promoted from "enhancement" to "default path."
- **react-window:** noted it was **rewritten as 2.x** (List/Grid API, dynamic overscan, no horizontal layout) — session 1's dismissal of "react-window's canned Grid" predates that rewrite; updated the comparison.

**Newly added (not in session 1):**
- **FastAPI native SSE support landed in v0.135.0** (`EventSourceResponse` / `yield`), alongside the established `sse-starlette`. Session 1 implied a custom `StreamingResponse`.
- A **verified, dated version table** at the top so the recommendation is auditable.
- Per-canvas **HWA vs. willReadFrequently** guidance.

**Confirmed (held up under verification):**
- The hybrid page-model principle, stable-`id` linchpin, `@tanstack/react-virtual` for the grid, `RenderTask.cancel()` + `page.cleanup()` discipline, three-tier progressive rendering, Finder-style multi-select with odd/even/invert power selectors, the `<DragOverlay>`-is-mandatory-with-virtualization rule, `rectSortingStrategy` for grids, immutable command/patch undo log (Immer `produceWithPatches`) with soft-delete and op coalescing, polling-default/SSE-for-OCR job strategy with `202` + worker offload, and the perceived-speed stack (`useOptimistic`/`useTransition`, skeletons, debounced+canceled renders, `React.memo`, `content-visibility:auto`, CSS-transform rotation). React 19 `useOptimistic`/`useTransition` confirmed current (React 19.2).

---

## Sources

Versions verified directly against `https://registry.npmjs.org/<pkg>` on 2026-06-30.

pdf.js rendering, workers, OffscreenCanvas, HWA, v6:
- pdf.js API JSDoc (getDocument/getViewport/render/cleanup, enableHWA, isOffscreenCanvasSupported) — https://mozilla.github.io/pdf.js/api/draft/api.js.html
- pdf.js module JSDoc (pdfjsLib) — https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- pdf.js releases (v6, enableHWA viewer removal, OffscreenCanvas in thumbnails) — https://github.com/mozilla/pdf.js/releases
- pdf.js Discussion #18199 — Hardware acceleration of canvas — https://github.com/mozilla/pdf.js/discussions/18199
- pdf.js Issue #10319 — run canvas rendering in a web worker — https://github.com/mozilla/pdf.js/issues/10319
- pdfjs-dist on npm — https://www.npmjs.com/package/pdfjs-dist
- Nutrient: complete guide to PDF.js — https://www.nutrient.io/blog/complete-guide-to-pdfjs/
- Schiener: Chrome's willReadFrequently attribute — https://www.schiener.io/2024-08-02/canvas-willreadfrequently
- MDN OffscreenCanvas — https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

Virtualization:
- TanStack Virtual (official) — https://tanstack.com/virtual/latest
- Virtualized responsive grid with TanStack Virtual — https://adamcollier.co.uk/posts/using-tanstack-virtual-and-window-virtualisation-for-a-grid-of-items/
- react-window CHANGELOG (2.x rewrite) — https://github.com/bvaughn/react-window/blob/main/CHANGELOG.md
- react-window v2 changes — https://github.com/bvaughn/react-window/issues/302

Drag & drop (incl. maintenance status):
- dnd-kit (official) — https://dndkit.com/
- dnd-kit DragOverlay docs — https://docs.dndkit.com/api-documentation/draggable/drag-overlay
- dnd-kit Sortable preset (strategies, virtualization note) — https://docs.dndkit.com/presets/sortable
- dnd-kit Issue #1194 — future of library & maintenance — https://github.com/clauderic/dnd-kit/issues/1194
- dnd-kit Issue #1830 — active maintenance / production suitability — https://github.com/clauderic/dnd-kit/issues/1830
- dnd-kit Discussion #1842 — @dnd-kit/react vs @dnd-kit/core roadmap — https://github.com/clauderic/dnd-kit/discussions/1842
- @dnd-kit/react on npm — https://www.npmjs.com/package/@dnd-kit/react
- Pragmatic drag-and-drop (Atlassian) — https://github.com/atlassian/pragmatic-drag-and-drop
- @hello-pangea/dnd (react-beautiful-dnd successor) — https://github.com/atlassian/react-beautiful-dnd/issues/2437
- Top 5 Drag-and-Drop Libraries for React in 2026 (Puck) — https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react

Multi-select UX:
- Selecting with Cmd/Ctrl/Shift — https://www.sdmfoundation.org/2017/11/02/selecting-using-command-control-shift-make-selections/

Undo/redo:
- Command pattern for undo/redo (Gernot Klingler) — https://gernotklingler.com/blog/implementing-undoredo-with-the-command-pattern/
- Immer patches (produceWithPatches) — https://immerjs.github.io/immer/patches/
- Immutability & observability for reliable undo/redo — https://blog.voyonic-systems.de/leveraging-immutability-and-observability-for-reliable-undo-redo-in-document-based-applications/

Server jobs & perceived performance:
- FastAPI Server-Sent Events (native SSE, v0.135.0) — https://fastapi.tiangolo.com/tutorial/server-sent-events/
- sse-starlette (PyPI) — https://pypi.org/project/sse-starlette/
- React useOptimistic (official) — https://react.dev/reference/react/useOptimistic
- React 19.2 release notes — https://react.dev/blog/2025/10/01/react-19-2
- WebSocket vs SSE vs Long Polling (2025) — https://potapov.me/en/make/websocket-sse-longpolling-realtime
