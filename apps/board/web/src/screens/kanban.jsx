// Lifecycle Kanban (UI_SPEC §4). Column-per-state over the 11-state superset + blocked swimlane +
// terminal archive. Live via SSE; each card is composed entirely of shared Helm components.
import { board } from '../api.js';
import { toCard, ErrorNotice, mono, eyebrow } from '../ui.jsx';
import { LifecycleKanban, COLUMNS } from '../parts.jsx';

const STATUSES = ['todo', 'in_progress', 'awaiting_approval', 'approved', 'executing', 'verifying', 'needs_review', 'blocked', 'done', 'failed', 'cancelled'];

export function Kanban({ onOpen, bump }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    Promise.all(STATUSES.map((s) => board.queue(s).then((r) => [s, r.items]).catch(() => [s, []])))
      .then((pairs) => { if (!live) return; setData(Object.fromEntries(pairs)); setError(null); })
      .catch((e) => live && setError(e));
    return () => { live = false; };
  }, [bump]);

  if (error) return <ErrorNotice error={error} />;
  if (!data) return <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Loading…</div>;

  const byCol = {};
  for (const col of COLUMNS) byCol[col.key] = col.statuses.flatMap((s) => (data[s] || []).map(toCard));
  const archive = [...(data.done || []), ...(data.failed || []), ...(data.cancelled || [])].map(toCard);
  const blocked = (data.blocked || []).map(toCard);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={eyebrow}>Lifecycle</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>source: board · live</span>
      </div>
      <LifecycleKanban byCol={byCol} archive={archive} blocked={blocked} onOpen={onOpen} />
    </div>
  );
}
