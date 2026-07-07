// NoteEditor.jsx — the ONE canonical-store editing affordance: a REAL @milkdown/crepe WYSIWYG-
// markdown editor (UI_SPEC §4). It stores MARKDOWN verbatim (markdown = truth). Crepe is
// framework-agnostic vanilla JS, so Vite bundles it and we mount it into a plain DOM ref — it does
// NOT use the app's React. The paper column is the suite's Workshop reading surface (--paper-* +
// Source Serif 4); a view toggle offers the dark-reading alternate.
//
// Save flow (owned by the S2 screen): read getMarkdown() → PUT /api/notes/:id { content, expected_hash }.
// `content` is the body markdown; the server preserves canonical frontmatter and enforces the CAS.
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

const { useEffect, useRef } = window.React;

// Scoped styling so the editor body reads as PAPER (Source Serif 4) or the dark alternate. Injected
// once. We only recolor the reading surface — the shell + every metadata chip stay Instrument-dark.
const STYLE_ID = 'nt-editor-style';
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .nt-editor { flex: 1; min-width: 0; overflow: auto; }
  .nt-editor .milkdown { height: 100%; }
  .nt-editor .milkdown .ProseMirror {
    font-family: var(--font-serif);
    font-size: var(--fs-read, 17px);
    line-height: 1.7;
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 40px 96px;
    min-height: 100%;
    box-sizing: border-box;
  }
  .nt-editor .milkdown .ProseMirror h1,
  .nt-editor .milkdown .ProseMirror h2,
  .nt-editor .milkdown .ProseMirror h3 { font-family: var(--font-serif); font-weight: 600; }
  /* PAPER view — the Workshop reading surface. */
  .nt-editor[data-view="paper"] { background: var(--paper-page); }
  .nt-editor[data-view="paper"] .milkdown,
  .nt-editor[data-view="paper"] .milkdown .ProseMirror { color: var(--paper-ink); }
  /* DARK reading alternate. */
  .nt-editor[data-view="dark"] { background: var(--surface-screen); }
  .nt-editor[data-view="dark"] .milkdown,
  .nt-editor[data-view="dark"] .milkdown .ProseMirror { color: var(--ink-primary, var(--text-primary)); }
  `;
  document.head.appendChild(el);
}

export function NoteEditor({ noteId, initialMarkdown, view = 'paper', apiRef, onDirty }) {
  const mountRef = useRef(null);
  const crepeRef = useRef(null);

  // (Re)build the editor whenever the loaded note changes. Rebuild — not setValue — because Crepe's
  // defaultValue is the clean way to load a document and it keeps undo history note-scoped.
  useEffect(() => {
    ensureStyle();
    let disposed = false;
    const root = mountRef.current;
    if (!root) return undefined;

    const crepe = new Crepe({ root, defaultValue: initialMarkdown || '' });
    crepe
      .create()
      .then(() => {
        if (disposed) { crepe.destroy(); return; }
        crepeRef.current = crepe;
        // Live-dirty signal so Save can enable/disable honestly.
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown, prev) => {
            if (markdown !== prev && onDirty) onDirty(markdown);
          });
        });
        // The imperative handle the S2 screen calls on Save.
        if (apiRef) apiRef.current = { getMarkdown: () => crepe.getMarkdown() };
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[NoteEditor] Crepe failed to mount', e);
      });

    return () => {
      disposed = true;
      if (apiRef) apiRef.current = null;
      if (crepeRef.current) { crepeRef.current.destroy(); crepeRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  return <div className="nt-editor" data-view={view} ref={mountRef} />;
}
