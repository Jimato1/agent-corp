// pdf-forge flow F — board, text pane, shell. → window.PFF
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, MONO = PFW.MONO, EYE = PFW.EYE;
  const { PageSheet, IconButton, Spinner } = DS;

  const WIDTHS = { compact: 96, comfortable: 132, large: 180 };

  // faux text on a sheet face; matched sheets show press-blue highlighted runs
  function SheetText({ matched, scanned }) {
    if (scanned) return <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#f3f3ef,#e6e6e0)' }} />;
    const rows = [78, 92, 64, 88, 72, 96, 60, 84, 70];
    return (
      <div style={{ position: 'absolute', inset: 0, padding: '13% 12%', display: 'flex', flexDirection: 'column', gap: '5.5%' }}>
        {rows.map((w, i) => {
          const hit = matched && (i === 2 || i === 5);
          return <span key={i} style={{ height: 3, width: w + '%', borderRadius: 1, background: hit ? 'var(--press-500)' : '#d9d9d4', boxShadow: hit ? '0 0 0 2px var(--press-tint)' : 'none' }} />;
        })}
      </div>
    );
  }

  function MatchSheet({ page, width, aspect, rotation, matched, selected, focused, scanned }) {
    return (
      <PageSheet page={page} width={width} aspect={aspect} rotation={rotation} selected={selected} focused={focused}>
        <SheetText matched={matched} scanned={scanned} />
      </PageSheet>
    );
  }

  // flow-F board (renders match highlights + scanned faces)
  function FBoard({ pages, size = 'compact', matchedIds = [], selectedIds = [], scanned = false, dim = false, marquee = null, children, margin = 16 }) {
    const width = WIDTHS[size] || 96;
    const gap = size === 'compact' ? 8 : 12;
    const M = new Set(matchedIds), S = new Set(selectedIds);
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin, padding: '18px 16px', borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap, position: 'relative' }}>
          {pages.map((p) => <MatchSheet key={p.id} page={p.page} width={width} aspect={p.aspect} rotation={p.rotation} matched={M.has(p.id)} selected={S.has(p.id) || p.selected} focused={p.focused} scanned={scanned} />)}
        </div>
        {marquee ? <div style={{ position: 'absolute', ...marquee, border: '1px solid var(--press-500)', background: 'var(--press-tint)', opacity: 0.5, borderRadius: 2 }} /> : null}
        {dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)', zIndex: 1 }} /> : null}
        {children ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, padding: 20 }}>{children}</div> : null}
      </div>
    );
  }

  // find/highlight box atop the text pane
  function FindBox({ query, matches }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--sub-600)', background: 'var(--sub-800)', flex: 'none' }}>
        <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="search" size={15} /></span>
        <input readOnly value={query} placeholder="Find in text" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-900)', ...MONO, fontSize: 13 }} />
        {query ? <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>{matches} matches</span> : null}
        <IconButton size="md" label="Previous match"><Icon name="chevron" size={15} sw={2} /></IconButton>
        <IconButton size="md" label="Next match"><span style={{ transform: 'rotate(90deg)', display: 'inline-flex' }}><Icon name="chevron" size={15} /></span></IconButton>
      </div>
    );
  }

  function hl(line, query) {
    if (!query) return line;
    const low = line.toLowerCase(), q = query.toLowerCase();
    let i = 0, idx = low.indexOf(q); if (idx < 0) return line;
    const out = [];
    while (idx >= 0) {
      if (idx > i) out.push(line.slice(i, idx));
      out.push(<mark key={idx} style={{ background: 'var(--press-tint)', color: 'var(--ink-900)', borderBottom: '2px solid var(--press-500)', padding: '0 1px', borderRadius: 1 }}>{line.slice(idx, idx + q.length)}</mark>);
      i = idx + q.length; idx = low.indexOf(q, i);
    }
    if (i < line.length) out.push(line.slice(i));
    return out;
  }

  // mono text pane beside the board
  function TextPane({ lines = [], query = '', matches = 0, streamingPage = 0, empty = false, showFind = true, footer = true }) {
    return (
      <div style={{ flex: 1, minHeight: 0, margin: '16px 16px 16px 0', display: 'flex', flexDirection: 'column', background: 'var(--sub-850)', border: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel)', overflow: 'hidden' }}>
        {showFind ? <FindBox query={query} matches={matches} /> : null}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: empty ? 0 : '10px 0' }}>
          {empty ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--ink-500)', padding: 24, textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="text" size={26} /></span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-600)' }}>Open a PDF to read its text</span>
            </div>
          ) : (
            <>
              {lines.map((ln, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '0 14px', minHeight: 18 }}>
                  <span style={{ ...MONO, fontSize: 12, lineHeight: '18px', color: 'var(--ink-500)', width: 22, textAlign: 'right', flex: 'none', userSelect: 'none' }}>{ln === '' ? '' : i + 1}</span>
                  <span style={{ ...MONO, fontSize: 13, lineHeight: '18px', color: /^[0-9]|AGREEMENT|FEES|TERM|CONFID/.test(ln) ? 'var(--ink-900)' : 'var(--ink-700)', whiteSpace: 'pre-wrap' }}>{hl(ln, query)}</span>
                </div>
              ))}
              {streamingPage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', color: 'var(--ink-600)' }}>
                  <Spinner size={13} tone="ink" />
                  <span style={{ ...MONO, fontSize: 12 }}>extracting page {streamingPage}…</span>
                </div>
              ) : null}
            </>
          )}
        </div>
        {footer && !empty ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--sub-600)', background: 'var(--sub-800)', flex: 'none' }}>
            <DS.Button size="sm" variant="secondary" leftIcon={<Icon name="copy" size={15} />}>Copy all</DS.Button>
            <DS.Button size="sm" variant="secondary" leftIcon={<Icon name="download" size={15} />}>Download .txt</DS.Button>
            <span style={{ marginLeft: 'auto', ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>built locally · zero upload</span>
          </div>
        ) : null}
      </div>
    );
  }

  // three-zone frame with board + text pane in the worksurface
  function FWorkFrame({ rail, header, board, textPane, inspector, overlay, boardFlex = '0 0 42%' }) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'var(--sub-900)', color: 'var(--ink-900)', overflow: 'hidden' }}>
        {rail}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)', position: 'relative' }}>
          {header}
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <div style={{ flex: boardFlex, minWidth: 0, display: 'flex' }}>{board}</div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>{textPane}</div>
          </div>
          {overlay}
        </main>
        {inspector}
      </div>
    );
  }

  window.PFF = Object.assign(window.PFF || {}, { FBoard, MatchSheet, SheetText, TextPane, FindBox, FWorkFrame, WIDTHS });
})();
