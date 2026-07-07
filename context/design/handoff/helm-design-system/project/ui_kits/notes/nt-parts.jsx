/* Helm — Notes · app-specific components. Exposed as window.NTParts.
   NoteEditor is the one Workshop paper surface in the suite; every metadata chip
   and the whole shell stay Instrument-dark. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { TierBadge, TicketRef, PrincipalRef, StatusPill, DataTable } = H;

  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  const TMAP = { verified: 'verified', single: 'single', cross: 'corroborated', clean: 'verified', untrusted: 'untrusted' };
  function taintBadge(t, label) { return <TierBadge tier={TMAP[t] || 'single'} label={label} />; }

  // A wikilink chip carrying the linked note's taint (taint travels with content).
  function WikiLink({ title, taint }) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'baseline' }}>
        <span style={{ color: 'var(--signal-cyan-press)', borderBottom: '1px solid currentColor', fontFamily: 'inherit' }}>[[{title}]]</span>
        {taint === 'untrusted' ? <span style={{ ...mono, fontSize: 10, color: 'var(--state-amber-ink)' }}>⚠</span> : taint === 'single' ? <span style={{ ...mono, fontSize: 10, color: 'var(--state-amber-ink)' }}>◑</span> : null}
      </span>
    );
  }

  // Render a body-section paragraph, turning [[wikilinks]] into WikiLink chips.
  function renderProse(text, via, paper) {
    const parts = text.split(/(\[\[[^\]]+\]\])/g);
    return parts.map((p, i) => {
      const m = p.match(/^\[\[([^\]]+)\]\]$/);
      if (m) {
        const v = (via || []).find((x) => x.title === m[1]);
        return <WikiLink key={i} title={m[1]} taint={v ? v.taint : 'single'} />;
      }
      return <React.Fragment key={i}>{p}</React.Fragment>;
    });
  }

  /* NoteEditor — the WYSIWYG-markdown Workshop paper pane. */
  function NoteEditor({ note, mode }) {
    const paper = mode === 'paper';
    const surface = paper ? { background: 'var(--paper-page)' } : { background: 'var(--surface-screen)' };
    const ink = paper ? 'var(--paper-ink)' : 'var(--ink-primary)';
    const muted = paper ? 'var(--paper-ink-muted)' : 'var(--ink-muted)';
    return (
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', ...surface }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: muted, marginBottom: 8 }}>{note.type}</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, lineHeight: '38px', fontWeight: 600, color: ink, margin: '0 0 20px' }}>{note.title}</h1>
          {note.body.map(([h, p], i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: ink, margin: '0 0 8px' }}>{h}</h2>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: '28px', color: ink, margin: 0 }}>{renderProse(p, note.via, paper)}</p>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: ink, margin: 0, opacity: 0.5 }}>Next</h2>
            <span style={{ width: 2, height: 24, background: 'var(--signal-cyan)', display: 'inline-block', animation: 'none' }} />
          </div>
        </article>
      </div>
    );
  }

  /* LinkGraph — wikilink/backlink canvas; taint on nodes; list half is DataTable. */
  function LinkGraph({ graph, onOpen }) {
    const glyph = (t) => t === 'untrusted' ? '⚠' : t === 'single' ? '◑' : '✔';
    const col = (t) => t === 'untrusted' ? 'var(--state-amber-ink)' : t === 'single' ? 'var(--state-amber-ink)' : 'var(--state-green-ink)';
    const nodeById = {}; graph.nodes.forEach((n) => { nodeById[n.id] = n; });
    return (
      <div style={{ position: 'relative', height: 320, ...panel, overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {graph.edges.map(([a, b], i) => {
            const na = nodeById[a], nb = nodeById[b];
            return <line key={i} x1={na.x + '%'} y1={na.y + '%'} x2={nb.x + '%'} y2={nb.y + '%'} stroke="var(--border-strong)" strokeWidth="1" markerEnd="url(#arr)" />;
          })}
          <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="var(--border-strong)" /></marker></defs>
        </svg>
        {graph.nodes.map((n) => (
          <button key={n.id} onClick={() => onOpen(n.id)} style={{ position: 'absolute', left: n.x + '%', top: n.y + '%', transform: 'translate(-50%,-50%)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 'var(--radius-control)', cursor: 'pointer', background: n.focus ? 'var(--signal-cyan-wash)' : 'var(--surface-inset)', border: '1px solid ' + (n.focus ? 'var(--signal-cyan)' : 'var(--border-strong)'), color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 12, whiteSpace: 'nowrap' }}>
            {n.title}<span style={{ color: col(n.taint) }}>{glyph(n.taint)}</span>
          </button>
        ))}
      </div>
    );
  }

  /* DeliberationThreadView — the seven-phase ceremony record (never the state machine). */
  function DeliberationThreadView({ thread, ticket }) {
    const [open, setOpen] = React.useState(() => { const s = {}; thread.phases.forEach((p) => { s[p.key] = p.open; }); return s; });
    return (
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--paper-page)' }}>
        <article style={{ maxWidth: 760, margin: '0 auto', padding: '32px 40px 80px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--paper-ink-muted)', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            participants: {thread.participants.map((s) => <PrincipalRef key={s} kind="agent" id={s} href="#" />)}
          </div>
          {thread.phases.map((ph) => {
            const isOpen = open[ph.key];
            return (
              <div key={ph.key} style={{ borderTop: '1px solid var(--paper-hairline)', padding: '10px 0' }}>
                <button onClick={() => setOpen((o) => ({ ...o, [ph.key]: !o[ph.key] }))} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <span style={{ color: 'var(--paper-ink-muted)' }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--paper-ink)' }}>{ph.label}</span>
                  {ph.required ? <span style={{ ...mono, fontSize: 10, color: '#8a5a00', background: '#F0E4C8', border: '1px solid #D8C89A', borderRadius: 999, padding: '0 6px' }}>⚑ REQUIRED</span> : null}
                  {ph.note ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--paper-ink-muted)' }}>({ph.note})</span> : null}
                </button>
                {isOpen ? (
                  <div style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ph.grounded ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--paper-ink-muted)' }}>grounded in → {ph.grounded.map((g, i) => <WikiLink key={i} title={g.title} taint={g.taint} />)}</div> : null}
                    {ph.independent ? <div style={{ ...eyebrow, color: 'var(--paper-ink-muted)' }}>Independent positions — drafted before cross-reading (anti-anchoring)</div> : null}
                    {ph.turns.map((t, i) => (
                      <div key={i} style={{ background: 'var(--paper-inset)', border: '1px solid var(--paper-hairline)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, color: 'var(--paper-ink)' }}>{t.role}</span>
                          <span style={{ ...mono, fontSize: 11, color: 'var(--paper-ink-muted)' }}>· {t.at}</span>
                          <PrincipalRef kind="agent" id={t.sub} href="#" />
                          {t.isolated ? <span style={{ ...mono, fontSize: 10, color: 'var(--paper-ink-muted)', border: '1px solid var(--paper-hairline)', borderRadius: 999, padding: '0 5px' }}>isolated</span> : null}
                        </div>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: '25px', color: 'var(--paper-ink)', margin: 0 }}>{renderProse(t.body, ph.grounded, true)}</p>
                      </div>
                    ))}
                    {ph.required && !ph.turns.length ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#8a5a00' }}>no dissent recorded — huddle may be invalid</div> : null}
                    {ph.children ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--paper-ink-muted)' }}>→ child tickets {ph.children.map((c) => <TicketRef key={c} id={c} href="#" />)}</div> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </article>
      </div>
    );
  }

  window.NTParts = { taintBadge, WikiLink, NoteEditor, LinkGraph, DeliberationThreadView, eyebrow, mono, panel };
})();
