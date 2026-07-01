// page-model/pageModel.ts — the in-memory page model + pure transforms.
// Client-side edits (reorder / rotate / delete) mutate this model live; nothing
// is uploaded until Export (D7, SCOPE flow B).

export interface Page {
  /** Stable id for React keys + selection (independent of position). */
  id: string;
  /** 0-based index into the ORIGINAL source document (for copyPages). */
  sourceIndex: number;
  /** Original 1-based page number (shown on the sheet chip). */
  label: number;
  /** Intrinsic aspect ratio (w/h) at rotation 0. */
  aspect: number;
  /** Absolute rotation in degrees (0/90/180/270). */
  rotation: number;
  /** Soft-deleted: shown crossed-out until Export drops it. */
  deleted: boolean;
  /** Rendered thumbnail (PNG data URL) once pdf.js has drawn it. */
  src?: string;
}

export function makePage(sourceIndex: number, label: number, aspect: number): Page {
  return { id: `p${sourceIndex}`, sourceIndex, label, aspect, rotation: 0, deleted: false };
}

/** Live (non-deleted) pages in current order. */
export function livePages(pages: Page[]): Page[] {
  return pages.filter((p) => !p.deleted);
}

/** Move the page at `from` to before position `to` (array-splice semantics). */
export function reorder(pages: Page[], from: number, to: number): Page[] {
  if (from === to || from < 0 || from >= pages.length) return pages;
  const next = pages.slice();
  const [moved] = next.splice(from, 1);
  next.splice(from < to ? to - 1 : to, 0, moved);
  return next;
}

/** Rotate the given page ids by a signed delta (default +90), mod 360. */
export function rotateBy(pages: Page[], ids: ReadonlySet<string>, delta = 90): Page[] {
  return pages.map((p) => (ids.has(p.id) ? { ...p, rotation: ((p.rotation + delta) % 360 + 360) % 360 } : p));
}

/** Soft-delete the given page ids. */
export function markDeleted(pages: Page[], ids: ReadonlySet<string>): Page[] {
  return pages.map((p) => (ids.has(p.id) ? { ...p, deleted: true } : p));
}

/** Restore soft-deleted pages (undo delete). */
export function restore(pages: Page[], ids: ReadonlySet<string>): Page[] {
  return pages.map((p) => (ids.has(p.id) ? { ...p, deleted: false } : p));
}

/** Attach a rendered thumbnail to a page by id. */
export function setThumbnail(pages: Page[], id: string, src: string): Page[] {
  return pages.map((p) => (p.id === id ? { ...p, src } : p));
}

/** Whether any edit distinguishes the model from a clean open. */
export function editCount(pages: Page[], original: Page[]): number {
  let n = 0;
  const originalOrder = original.map((p) => p.id).join(',');
  const liveOrder = livePages(pages).map((p) => p.id).join(',');
  if (originalOrder !== liveOrder) n++;
  n += pages.filter((p) => p.deleted).length;
  n += pages.filter((p) => p.rotation !== 0).length;
  return n;
}
