// S4 — Link Graph & Backlinks (Instrument; graph canvas + synchronized DataTable). The associative-
// memory browser: wikilinks as a directed graph with EFFECTIVE taint on nodes. The list half is the
// shared DataTable (the human mirror of list_backlinks over the SAME index) — only the canvas is new.
import { api, mcReviewHref } from '../api.js';
import { H, mono, eyebrow, panel, TaintBadge } from '../parts/common.jsx';
import { Head, useAsync, ErrorView } from '../parts/ui.jsx';
import { LinkGraph } from '../parts/LinkGraph.jsx';

const { useState } = window.React;

// Normalize a frontmatter `links` entry (string | { to_id, title, resolved, taint }) → object.
function normLink(l) {
  if (typeof l === 'string') return { to_id: l, title: l, resolved: undefined };
  return { to_id: l.to_id || l.id || l.target, title: l.title || l.to_id || l.id, resolved: l.resolved, taint: l.taint };
}

export function Graph({ ctx }) {
  const { DataTable, Button, Skeleton, EmptyState, Input } = H;
  const [entry, setEntry] = useState('');
  const focusId = ctx.focusId;

  const { data, error, loading, reload } = useAsync(async () => {
    if (!focusId) return null;
    const [note, backlinks] = await Promise.all([api.getNote(focusId), api.getBacklinks(focusId)]);
    const outbound = ((note.frontmatter && note.frontmatter.links) || []).map(normLink);
    return { note, backlinks, outbound };
  }, [focusId, ctx.liveTick]);

  if (!focusId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <Head crumb="Graph" title="Link graph & backlinks" sub="Associative memory — wikilinks as a graph. Open a note (or enter its id) to focus the graph on it." />
        <div style={{ ...panel, padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ width: 260 }}><Input mono placeholder="note id (e.g. N-01J…)" value={entry} onChange={(e) => setEntry(e.target.value)} style={{ width: '100%' }} /></span>
          <Button tone="primary" onClick={() => entry.trim() && ctx.setFocus(entry.trim())}>Focus</Button>
        </div>
        <EmptyState glyph="◇" title="No focus note">Open a note from the Corpus, then this graph centers on it and its wikilinks.</EmptyState>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}><Skeleton variant="block" height={320} /></div>;
  if (error) return <div style={{ padding: 24 }}><ErrorView error={error} action={<Button tone="secondary" onClick={reload}>Retry</Button>} /></div>;

  const { note, backlinks, outbound } = data;
  const focusTaint = (note.taint && note.taint.effective) || 'clean';

  // Build the node/edge sets. Focus centered; backlink sources point IN; outbound targets point OUT.
  const nodes = [{ id: note.id, title: (note.frontmatter && note.frontmatter.title) || note.id, taint: focusTaint, focus: true }];
  const edges = [];
  const seen = new Set([note.id]);
  backlinks.forEach((b) => {
    if (!seen.has(b.note_id)) { nodes.push({ id: b.note_id, title: b.title, taint: b.taint }); seen.add(b.note_id); }
    edges.push([b.note_id, note.id]);
  });
  outbound.forEach((o) => {
    if (!o.to_id) return;
    if (!seen.has(o.to_id)) { nodes.push({ id: o.to_id, title: o.title, taint: o.taint || 'clean', ghost: o.resolved === false }); seen.add(o.to_id); }
    edges.push([note.id, o.to_id]);
  });

  const backCols = [
    { key: 'note', header: '← From', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>{r.title}</span> },
    { key: 'type', header: 'Type', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.type}</span> },
    { key: 'taint', header: 'Provenance', align: 'right', render: (r) => <TaintBadge level={r.taint} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head crumb="Graph" title={(note.frontmatter && note.frontmatter.title) || note.id}
        sub="Effective-taint propagation is visible here: an ⚠ UNTRUSTED neighbor is why a focus node's taint is raised."
        right={<div style={{ display: 'flex', gap: 8 }}><Button tone="ghost" size="compact" onClick={() => ctx.setFocus(null)}>change focus</Button><Button tone="secondary" size="compact" onClick={() => ctx.openNote(note.id)}>open in editor →</Button></div>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <LinkGraph nodes={nodes} edges={edges} onOpen={(id) => ctx.openNote(id)} />
        <div style={{ ...panel, padding: 12 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Backlinks</div>
          {backlinks.length
            ? <DataTable columns={backCols} rows={backlinks} rowKey="note_id" onRowClick={(r) => ctx.openNote(r.note_id)} reflow={false} />
            : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', padding: '8px 4px' }}>No backlinks. Use <code style={mono}>[[wikilinks]]</code> in other notes to build associative memory.</div>}
          {outbound.length ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ ...eyebrow, marginBottom: 6 }}>Outbound →</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {outbound.map((o, i) => (
                  <button key={i} onClick={() => o.to_id && ctx.openNote(o.to_id)} title={o.to_id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-control)', cursor: 'pointer',
                      background: 'var(--surface-inset)', border: '1px solid ' + (o.resolved === false ? 'var(--border-default)' : 'var(--border-strong)'),
                      color: o.resolved === false ? 'var(--text-disabled)' : 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 12 }}>
                    {o.title}{o.resolved === false ? <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>ghost</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
