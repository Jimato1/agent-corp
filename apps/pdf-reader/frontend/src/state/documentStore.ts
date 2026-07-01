// state/documentStore.ts — the loaded document + page-model binding + undo.
// All edits are client-side; bytes never leave the machine until Export.

import { create } from 'zustand';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { openDocument, NotAPdfError } from '../page-model/document';
import {
  markDeleted, reorder as reorderPages, restore, rotateBy, setThumbnail,
  editCount, type Page,
} from '../page-model/pageModel';
import {
  canRedo, canUndo, commit, initHistory, redo, undo, type History,
} from '../page-model/undo';
import { renderPageToDataUrl } from '../lib/pdfjs';

export type DocStatus = 'empty' | 'loading' | 'ready' | 'error';

interface DocumentState {
  status: DocStatus;
  name: string;
  size: number;
  bytes: ArrayBuffer | null;
  doc: PDFDocumentProxy | null;
  history: History<Page[]>;
  original: Page[];
  errorMessage: string;
  errorCode: string;
  /** ids currently being rendered (avoid duplicate render work). */
  rendering: Set<string>;

  open: (file: File) => Promise<void>;
  reset: () => void;
  pages: () => Page[];
  reorder: (from: number, to: number) => void;
  rotate: (ids: ReadonlySet<string>, delta?: number) => void;
  remove: (ids: ReadonlySet<string>) => void;
  restoreIds: (ids: ReadonlySet<string>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  edits: () => number;
  ensureThumbnail: (id: string, width: number) => void;
}

const EMPTY: Page[] = [];

export const useDocumentStore = create<DocumentState>((set, get) => ({
  status: 'empty',
  name: '',
  size: 0,
  bytes: null,
  doc: null,
  history: initHistory<Page[]>(EMPTY),
  original: EMPTY,
  errorMessage: '',
  errorCode: '',
  rendering: new Set(),

  pages: () => get().history.present,

  open: async (file: File) => {
    set({ status: 'loading', errorMessage: '', errorCode: '' });
    try {
      const loaded = await openDocument(file);
      set({
        status: 'ready',
        name: loaded.name,
        size: loaded.size,
        bytes: loaded.bytes,
        doc: loaded.doc,
        history: initHistory(loaded.pages),
        original: loaded.pages,
        rendering: new Set(),
      });
    } catch (err) {
      const code = err instanceof NotAPdfError ? err.code : 'bad_pdf_structure';
      set({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : "That file didn't open as a PDF.",
        errorCode: code,
      });
    }
  },

  reset: () => set({
    status: 'empty', name: '', size: 0, bytes: null, doc: null,
    history: initHistory<Page[]>(EMPTY), original: EMPTY, errorMessage: '', errorCode: '', rendering: new Set(),
  }),

  reorder: (from, to) => set((s) => ({ history: commit(s.history, reorderPages(s.history.present, from, to)) })),
  rotate: (ids, delta = 90) => set((s) => ({ history: commit(s.history, rotateBy(s.history.present, ids, delta)) })),
  remove: (ids) => set((s) => ({ history: commit(s.history, markDeleted(s.history.present, ids)) })),
  restoreIds: (ids) => set((s) => ({ history: commit(s.history, restore(s.history.present, ids)) })),

  undo: () => set((s) => ({ history: undo(s.history) })),
  redo: () => set((s) => ({ history: redo(s.history) })),
  canUndo: () => canUndo(get().history),
  canRedo: () => canRedo(get().history),
  edits: () => editCount(get().history.present, get().original),

  ensureThumbnail: (id, width) => {
    const state = get();
    const page = state.history.present.find((p) => p.id === id);
    if (!state.doc || !page || page.src || state.rendering.has(id)) return;
    const rendering = new Set(state.rendering);
    rendering.add(id);
    set({ rendering });
    renderPageToDataUrl(state.doc, page.sourceIndex + 1, width)
      .then(({ dataUrl }) => {
        set((s) => {
          const next = new Set(s.rendering);
          next.delete(id);
          return { history: { ...s.history, present: setThumbnail(s.history.present, id, dataUrl) }, rendering: next };
        });
      })
      .catch(() => {
        set((s) => {
          const next = new Set(s.rendering);
          next.delete(id);
          return { rendering: next };
        });
      });
  },
}));
