/* Helm — Notes · screens (S1–S6). Exposed as window.NTScreens.
   Workshop paper content panes inside the dark Instrument shell. Notes holds no
   ticket/approval/kill authority — it renders truth read-only and deep-links out. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.NT_DATA;
  const P = window.NTParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, TierBadge, FenceState, ReviewChip, FreshnessStamp, Button, Input, PrintedAbsence, ErrorState, HaltBand } = H;
  const { taintBadge, NoteEditor, LinkGraph, DeliberationThreadView, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>{crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
          {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '80ch' }}>{sub}</p> : null}</div>
        {right}
      </div>
    );
  }
  const modeToggle = (mode, setMode) => (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
      {['paper', 'dark'].map((m) => <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 11px', border: 0, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', background: mode === m ? 'var(--signal-cyan-wash)' : 'transparent', color: mode === m ? 'var(--signal-cyan-ink)' : 'var(--text-muted)' }}>{m}</button>)}
    </div>
  );

  /* ===== S1 · Corpus Browser & Search ===== */
  function Corpus({ ctx }) {
    const cols = [
      { key: 'title', header: 'Title', render: (n) => <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span><span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>{n.id}</span></span> },
      { key: 'type', header: 'Type', render: (n) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{n.type}</span> },
      { key: 'taint', header: 'Provenance', render: (n) => taintBadge(n.taintEffective) },
      { key: 'ticket', header: 'Ticket', render: (n) => n.ticket ? <TicketRef id={n.ticket} href="#" /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
      { key: 'updated', header: 'Updated', align: 'right', render: (n) => <FreshnessStamp age={n.updated} /> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Corpus" sub="The searchable external memory — agents write findings, huddles, and retros here; markdown on disk is the source of truth, the index is rebuildable." right={<FreshnessStamp age="0.4s ago" />} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input icon="⌕" placeholder="search corpus…  /" style={{ flex: 1, minWidth: 240 }} />
          {['type ▾', 'tag ▾', 'ticket ▾'].map((f) => <button key={f} style={{ height: 32, padding: '0 10px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border-default)', background: 'var(--bg-control)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>{f}</button>)}
          <Button tone="primary">New note</Button>
        </div>
        <DataTable columns={cols} rows={D.NOTES} rowKey="id" onRowClick={ctx.openNote} />
      </div>
    );
  }

  /* ===== S2 · Note Editor (paper pane + metadata rail) ===== */
  function Editor({ note, ctx }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-raised)' }}>
          <button onClick={() => ctx.goto('corpus')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-link)' }}>‹ Corpus</button>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{note.title}</span>
          <Button tone="primary" size="compact">Save</Button>
          <FreshnessStamp age="live 0.3s" />
          <span style={{ flex: 1 }} />
          {modeToggle(ctx.mode, ctx.setMode)}
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <NoteEditor note={note} mode={ctx.mode} />
          <div style={{ width: 288, flex: 'none', borderLeft: '1px solid var(--border-default)', background: 'var(--surface-panel)', padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={eyebrow}>Metadata</div>
            <Row k="id"><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{note.id}</span></Row>
            <Row k="type"><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{note.type}</span></Row>
            {note.ticket ? <Row k="ticket"><TicketRef id={note.ticket} href="#" /></Row> : null}
            <Row k="taint">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
                <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>{taintBadge(note.taintOwn)}<span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>own</span></span>
                <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>{taintBadge(note.taintEffective)}<span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>effective</span></span>
                {note.via.length ? <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>via: [[{note.via[0].title}]] ⚠</span> : null}
              </div>
            </Row>
            {note.fence ? <Row k="fence"><FenceState gen={note.fence.gen} lease={note.fence.lease} heartbeat={note.fence.hb} state={note.fence.state} /></Row> : null}
            <Row k="authors"><div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>{note.authors.map((a) => <PrincipalRef key={a.sub} kind={a.kind} id={a.sub} href="#" />)}</div></Row>
            {note.ticketStatus ? <Row k="ticket-status"><span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>{note.ticketStatus}</span><span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>mirror · authority: Board</span></span></Row> : null}
            <PrintedAbsence glyph="🔒" tag="display-of-truth">
              <strong>Taint cannot be edited here.</strong>
            </PrintedAbsence>
          </div>
        </div>
      </div>
    );
  }
  function Row({ k, children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 8, alignItems: 'start' }}><span style={{ ...eyebrow, fontSize: 10 }}>{k}</span><div>{children}</div></div>;
  }

  /* ===== S3 · Deliberation Thread ===== */
  function Deliberation({ note, ctx }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-raised)', flexWrap: 'wrap' }}>
          <button onClick={() => ctx.goto('corpus')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-link)' }}>‹ Corpus</button>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{note.title}</span>
          <StatusPill tone="neutral" size="sm">deliberation</StatusPill>
          {note.ticket ? <TicketRef id={note.ticket} href="#" /> : null}
          <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>phase: {note.ticketStatus} · mirror · authority: Board</span>
          <span style={{ flex: 1 }} />
          <PrintedAbsence glyph="🔒" tag="on the Board">Phase transitions happen on the Board.</PrintedAbsence>
        </div>
        <DeliberationThreadView thread={note.thread} ticket={note.ticket} />
      </div>
    );
  }

  /* ===== S4 · Link Graph & Backlinks ===== */
  function Graph({ ctx }) {
    const g = D.GRAPH;
    const cols = [
      { key: 'note', header: '← From', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>{r.note}</span> },
      { key: 'type', header: 'Type', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.type}</span> },
      { key: 'taint', header: 'Provenance', render: (r) => taintBadge(r.taint) },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="Graph" title="Link graph & backlinks" sub="Associative memory — wikilinks as a graph. Effective-taint propagation is visible here: an ⚠ UNTRUSTED neighbor is why a focus node's taint is raised." right={<Button tone="ghost" size="compact" onClick={() => ctx.openNote(D.byId[g.focus])}>open in editor →</Button>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <LinkGraph graph={g} onOpen={(id) => ctx.openNote(D.byId[id])} />
          <div style={{ ...panel, padding: 12 }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>Backlinks</div>
            <DataTable columns={cols} rows={g.backlinks} rowKey="id" onRowClick={(r) => ctx.openNote(D.byId[r.id])} reflow={false} />
          </div>
        </div>
      </div>
    );
  }

  /* ===== S5 · Review-Attention ===== */
  function Review() {
    const cols = [
      { key: 'note', header: 'Note', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>{r.note}</span> },
      { key: 'ticket', header: 'Ticket', render: (r) => <TicketRef id={r.ticket} href="#" /> },
      { key: 'gate', header: 'Gate / state', render: (r) => r.state === 'escalated' ? <ReviewChip state="escalated" reason={r.reason} href="#" /> : r.state === 'needs_review' ? <ReviewChip reason={r.reason} href="#" /> : <StatusPill tone="attention" glyph="◐" size="sm">awaiting_approval</StatusPill> },
      { key: 'author', header: 'Author', render: (r) => <PrincipalRef kind="agent" id={r.author} href="#" /> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="Review" title="Review attention" sub="Which of these notes are attached to a ticket in a human gate. Read live from Mission Control — advisory, never authoritative." right={<FreshnessStamp age="3s ago" state="live" />} />
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>source: mc · as-of 3s</div>
        <DataTable columns={cols} rows={D.REVIEW} rowKey="id" />
        <PrintedAbsence glyph="🔒" tag="never here">
          <strong>Reviews are cleared on the Board / Mission Control, never here.</strong> Notes surfaces the gate and deep-links out.
        </PrintedAbsence>
      </div>
    );
  }

  /* ===== S6 · Provenance & History Inspector ===== */
  function History({ note }) {
    const [mode, setMode] = React.useState('audit');
    const cols = [
      { key: 'ts', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
      { key: 'who', header: 'Who', render: (r) => <PrincipalRef kind={r.kind} id={r.who} href="#" /> },
      { key: 'action', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.action}</code> },
      { key: 'target', header: 'Target', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.target}</span> },
      { key: 'outcome', header: 'Outcome', render: () => <StatusPill tone="verified" glyph="✔" size="sm">ok</StatusPill> },
      { key: 'sha', header: 'commit', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>{r.sha}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1080 }}>
        <Head crumb="History" title={note.title} sub="Read-only truth of where this note came from and who touched it. A stale or failed chain-verify is never green." right={<div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>{['audit', 'provenance'].map((m) => <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 11px', border: 0, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', background: mode === m ? 'var(--signal-cyan-wash)' : 'transparent', color: mode === m ? 'var(--signal-cyan-ink)' : 'var(--text-muted)' }}>{m}</button>)}</div>} />
        {mode === 'audit' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>chain: git trailers · commit_sha per row · <StatusPill tone="verified" glyph="✔" size="sm">verified against git log</StatusPill> <FreshnessStamp age="0.6s ago" /></div>
            <DataTable columns={cols} rows={D.AUDIT} rowKey="sha" reflow={false} />
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>state-changes only · denied/rejected calls are not recorded here</div>
          </div>
        ) : (
          <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{taintBadge(note.taintOwn)}<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>own</span>→ {taintBadge(note.taintEffective)}<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>effective</span></div>
            {note.via.length ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>tainted_via: {note.via.map((v) => <span key={v.title} style={{ ...mono, color: 'var(--state-amber-ink)' }}>[[{v.title}]] ⚠ </span>)}</div> : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>No transitive taint — own = effective.</div>}
            <PrintedAbsence glyph="🔒" tag="read-only">Provenance is display-of-truth — there is no correction control here.</PrintedAbsence>
          </div>
        )}
      </div>
    );
  }

  window.NTScreens = { Corpus, Editor, Deliberation, Graph, Review, History };
})();
