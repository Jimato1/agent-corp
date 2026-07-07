// LinkGraph.jsx — the wikilink/backlink canvas (UI_SPEC §4, S4). Domain-unique (DESIGN_SYSTEM §8
// sanctions "a wikilink graph"): notes as nodes, wikilinks as directed edges, EFFECTIVE taint on
// each node (a second place taint propagation is visible — an ⚠ UNTRUSTED neighbor is WHY a focus
// node's effective taint is raised). Nodes are laid out on a simple deterministic radial around the
// focus (no physics dependency). The LIST half is the shared DataTable, never a fork.
import { panel } from './common.jsx';

// nodes: [{ id, title, taint, focus }]  edges: [[fromId, toId]]
export function LinkGraph({ nodes, edges, onOpen }) {
  const glyph = (t) => (t === 'host_originated' || t === 'untrusted' ? '⚠' : t === 'clean' ? '◑' : '◑');
  const col = (t) => (t === 'host_originated' || t === 'untrusted' ? 'var(--state-amber-ink)' : 'var(--state-amber-ink)');

  // Deterministic radial layout: focus centered, neighbors on a ring. Keeps the canvas dependency-free.
  const focusIdx = Math.max(0, nodes.findIndex((n) => n.focus));
  const placed = nodes.map((n, i) => {
    if (i === focusIdx || n.focus) return { ...n, x: 50, y: 48 };
    const others = nodes.filter((_, j) => j !== focusIdx).length || 1;
    const rank = nodes.slice(0, i).filter((_, j) => j !== focusIdx).length;
    const angle = (2 * Math.PI * rank) / others - Math.PI / 2;
    return { ...n, x: 50 + Math.cos(angle) * 34, y: 48 + Math.sin(angle) * 36 };
  });
  const byId = {};
  placed.forEach((n) => { byId[n.id] = n; });

  return (
    <div style={{ position: 'relative', height: 320, ...panel, overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <marker id="nt-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--border-strong)" />
          </marker>
        </defs>
        {edges.map(([a, b], i) => {
          const na = byId[a]; const nb = byId[b];
          if (!na || !nb) return null;
          return (
            <line key={i} x1={na.x + '%'} y1={na.y + '%'} x2={nb.x + '%'} y2={nb.y + '%'}
              stroke="var(--border-strong)" strokeWidth="1" markerEnd="url(#nt-arr)" />
          );
        })}
      </svg>
      {placed.map((n) => (
        <button key={n.id} onClick={() => onOpen && onOpen(n.id)} title={n.id}
          style={{
            position: 'absolute', left: n.x + '%', top: n.y + '%', transform: 'translate(-50%,-50%)',
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px',
            borderRadius: 'var(--radius-control)', cursor: 'pointer', maxWidth: '46%',
            background: n.focus ? 'var(--signal-cyan-wash)' : 'var(--surface-inset)',
            border: '1px solid ' + (n.focus ? 'var(--signal-cyan)' : 'var(--border-strong)'),
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 12, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title || n.id}</span>
          <span style={{ color: col(n.taint), flex: 'none' }}>{glyph(n.taint)}</span>
        </button>
      ))}
    </div>
  );
}
