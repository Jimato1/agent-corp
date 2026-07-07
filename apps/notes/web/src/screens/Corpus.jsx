// S1 — Corpus Browser & Search (Instrument). The searchable, filterable list of the whole corpus.
// This screen and the `search_notes` tool are the SAME query over the SAME FTS index (two views, one
// state). `/` focuses search. No status/ceremony-phase filter exists — that state lives on the Board.
import { api } from '../api.js';
import { H, mono, TaintBadge } from '../parts/common.jsx';
import { Head, useAsync, ErrorView } from '../parts/ui.jsx';

const { useState, useRef, useEffect } = window.React;
const NOTE_TYPES = ['research', 'plan', 'retro', 'deliberation', 'checkpoint', 'general'];

export function Corpus({ ctx }) {
  const { DataTable, Input, Button, Skeleton, EmptyState, FreshnessStamp } = H;
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [tag, setTag] = useState('');
  const [ticket, setTicket] = useState('');
  const [applied, setApplied] = useState({ query: '', type: '', tag: '', ticket_id: '' });
  const searchRef = useRef(null);

  // `/` focuses search (keyboard model §5.6). Input wraps its <input> in a <label>, so we reach the
  // control through the container rather than a forwarded ref.
  useEffect(() => {
    const onKey = (e) => {
      const el = searchRef.current && searchRef.current.querySelector('input');
      if (e.key === '/' && el && document.activeElement !== el) {
        e.preventDefault();
        el.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: rows, error, loading, reload } = useAsync(
    () => api.search({ ...applied, limit: 25 }),
    [applied.query, applied.type, applied.tag, applied.ticket_id, ctx.liveTick],
  );

  const submit = (e) => {
    e && e.preventDefault();
    setApplied({ query: query.trim(), type, tag: tag.trim(), ticket_id: ticket.trim() });
  };
  const hasFilters = applied.query || applied.type || applied.tag || applied.ticket_id;

  const cols = [
    { key: 'title', header: 'Title', render: (n) => (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title || n.note_id}</span>
        <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>{n.note_id}</span>
      </span>
    ) },
    { key: 'snippet', header: 'Snippet', render: (n) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', maxWidth: '52ch', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.snippet}</span>
        {/* A snippet is retrieved content entering context — its taint marker travels WITH it. */}
        <TaintBadge level={n.taint} />
      </span>
    ) },
    { key: 'taint', header: 'Provenance', align: 'right', render: (n) => <TaintBadge level={n.taint} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Corpus" sub="The searchable external memory — agents write findings, huddles, and retros here; markdown on disk is the source of truth, the index is rebuildable."
        right={<FreshnessStamp age={ctx.events.status === 'live' ? '0.4s ago' : 'reconnecting'} state={ctx.events.status === 'stale' ? 'stale' : 'live'} reading="search reflects the last live index tip" />} />

      <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span ref={searchRef} style={{ flex: 1, minWidth: 240 }}>
          <Input icon="⌕" placeholder="search corpus…  /" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%' }} />
        </span>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="type"
          style={selStyle}>
          <option value="">type: all</option>
          {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ width: 120 }}><Input placeholder="tag" value={tag} onChange={(e) => setTag(e.target.value)} /></span>
        <span style={{ width: 140 }}><Input mono placeholder="ticket" value={ticket} onChange={(e) => setTicket(e.target.value)} /></span>
        <Button tone="secondary" type="submit">Search</Button>
        <Button tone="primary" type="button" onClick={ctx.newNote}>New note</Button>
      </form>

      {loading ? (
        <Skeleton variant="table" rows={6} />
      ) : error ? (
        <ErrorView error={error} action={<H.Button tone="secondary" onClick={reload}>Retry</H.Button>} />
      ) : rows && rows.length ? (
        <DataTable columns={cols} rows={rows} rowKey="note_id" onRowClick={(n) => ctx.openNote(n.note_id)} />
      ) : hasFilters ? (
        <EmptyState glyph="⌕" title="No notes match" action={<H.Button tone="secondary" onClick={() => { setQuery(''); setType(''); setTag(''); setTicket(''); setApplied({ query: '', type: '', tag: '', ticket_id: '' }); }}>Clear filters</H.Button>}>
          No notes match that query or filter. Clear filters or widen the search.
        </EmptyState>
      ) : (
        <EmptyState glyph="✎" title="No notes yet" action={<H.Button tone="primary" onClick={ctx.newNote}>New note</H.Button>}>
          Agents write findings here as external memory; you can start one too.
        </EmptyState>
      )}
    </div>
  );
}

const selStyle = {
  height: 34, padding: '0 10px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border-default)',
  background: 'var(--bg-control)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer',
};
