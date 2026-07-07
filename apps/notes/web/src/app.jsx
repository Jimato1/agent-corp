// app.jsx — the Notes shell + router. Keeps the Helm shell (NavRail / AppHeader / KillMirror) and
// drives every screen from LIVE data. Notes is NOT in the kill chain and hosts no actuator: the
// HaltBand is read-only and only ever a SAFE-STOP mirror of a dependency Notes can observe (git/index
// degraded via /healthz); the header carries a read-only KillMirror. Live refresh rides one SSE
// stream (useEvents): note events bump a tick screens refetch on; audit events feed S6; a session
// event ends the stream honestly.
import { api } from './api.js';
import { H } from './parts/common.jsx';
import { useEvents } from './useEvents.js';
import { useAsync, ErrorView } from './parts/ui.jsx';
import { Corpus } from './screens/Corpus.jsx';
import { Editor } from './screens/Editor.jsx';
import { Deliberation } from './screens/Deliberation.jsx';
import { Graph } from './screens/Graph.jsx';
import { Review } from './screens/Review.jsx';
import { History } from './screens/History.jsx';

const { useState, useCallback, useRef } = window.React;
const { NavRail, AppHeader, KillMirror, HaltBand, Skeleton, Button } = H;

const AUDIT_CAP = 200;

function NewNoteModal({ onClose, onCreated }) {
  const { Input, Button: B } = H;
  const [type, setType] = useState('research');
  const [title, setTitle] = useState('');
  const [ticket, setTicket] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const create = async () => {
    if (!title.trim()) { setErr('A title is required.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await api.createNote({ type, title: title.trim(), ...(ticket.trim() ? { ticket_id: ticket.trim() } : {}) });
      onCreated(res.note_id);
    } catch (e) {
      setErr((e && e.message) || 'Create failed.');
      setBusy(false);
    }
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>New note</div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ height: 34, padding: '0 10px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border-strong)', background: 'var(--surface-inset)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
            {['research', 'plan', 'retro', 'deliberation', 'checkpoint', 'general'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
        <Input label="Ticket (optional)" mono placeholder="T-000123" value={ticket} onChange={(e) => setTicket(e.target.value)} style={{ width: '100%' }} />
        {err ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--danger-text)' }}>{err}</div> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <B tone="ghost" onClick={onClose}>Cancel</B>
          <B tone="primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</B>
        </div>
      </div>
    </div>
  );
}

// The note dispatcher: one fetch to pick the render (deliberation → thread view, else editor). The
// chosen screen manages its own live data (so it refreshes on the SSE tick).
function NoteRoute({ noteId, ctx }) {
  const { data, error, loading, reload } = useAsync(() => api.getNote(noteId), [noteId]);
  if (loading) return <div style={{ padding: 40 }}><Skeleton variant="text" lines={8} /></div>;
  if (error) return <div style={{ padding: 24 }}><ErrorView error={error} action={<Button tone="secondary" onClick={reload}>Retry</Button>} /></div>;
  const type = data.frontmatter && data.frontmatter.type;
  return type === 'deliberation' ? <Deliberation noteId={noteId} ctx={ctx} /> : <Editor noteId={noteId} ctx={ctx} />;
}

export function App() {
  const [route, setRoute] = useState('corpus');
  const [noteId, setNoteId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [view, setView] = useState('paper');
  const [collapsed, setCollapsed] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const auditRef = useRef([]);
  const [auditFeed, setAuditFeed] = useState([]);

  const events = useEvents({
    onNote: () => setLiveTick((t) => t + 1),
    onAudit: (d) => {
      if (!d) return;
      const row = { note_id: d.note_id, sub: d.sub, tool: d.tool, at: Date.now() };
      auditRef.current = [row, ...auditRef.current].slice(0, AUDIT_CAP);
      setAuditFeed(auditRef.current);
      setLiveTick((t) => t + 1);
    },
  });

  const goto = useCallback((r) => setRoute(r), []);
  const openNote = useCallback((id) => { if (!id) return; setNoteId(id); setFocusId(id); setRoute('note'); }, []);
  const setFocus = useCallback((id) => { setFocusId(id); }, []);

  // Suite posture Notes can honestly observe: a degraded git/index dependency → read-only SAFE-STOP.
  const { data: health } = useAsync(() => api.health().catch(() => null), [liveTick]);
  const git = (health && health.git) || {};
  const safeStop = !!(git.degraded || git.remote_reachable === false);

  const ctx = { route, goto, openNote, focusId, setFocus, view, setView, liveTick, events, auditFeed, newNote: () => setShowNew(true) };

  const items = [
    { group: 'Library' },
    { key: 'corpus', label: 'Corpus', icon: '▤', active: route === 'corpus' || route === 'note', onClick: () => goto('corpus') },
    { key: 'graph', label: 'Graph', icon: '◇', active: route === 'graph', onClick: () => goto('graph') },
    { key: 'review', label: 'Review', icon: '◈', active: route === 'review', onClick: () => goto('review') },
    { key: 'history', label: 'History', icon: '⛓', active: route === 'history', onClick: () => { if (noteId) setRoute('history'); else { setFocusId(null); setRoute('corpus'); } } },
  ];

  let screen = null; let framed = false;
  if (route === 'corpus') screen = <Corpus ctx={ctx} />;
  else if (route === 'note' && noteId) { screen = <NoteRoute noteId={noteId} ctx={ctx} />; framed = true; }
  else if (route === 'graph') screen = <Graph ctx={ctx} />;
  else if (route === 'review') screen = <Review ctx={ctx} />;
  else if (route === 'history' && noteId) screen = <History noteId={noteId} ctx={ctx} />;
  else screen = <Corpus ctx={ctx} />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="notes" posture={safeStop ? 'safe-stop' : 'nominal'} items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="/mc" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="Notes" identity="external memory & work product">
          <KillMirror engaged={false} href="/mc" />
        </AppHeader>

        {/* read-only SAFE-STOP mirror (Notes hosts no actuator). Only when a dependency Notes can
            observe failed closed — a rebuildable index / git remote outage, NOT a red error. */}
        {safeStop ? (
          <HaltBand mode="safe-stop" readOnly reviewHref="/mc" reviewLabel="Open Mission Control"
            stillTrue={[
              'The canonical markdown corpus on disk and in git is intact.',
              'Reads by id still work; search/link indexes are rebuildable and regenerating.',
              'Notes is not in the kill chain — this is a mirror, cleared on MC/auth.',
            ]}
            message="A Notes dependency (git remote / index) is degraded — this read surface safe-stopped honestly." />
        ) : null}

        {events.sessionEnded ? (
          <div style={{ padding: '10px 18px', background: 'var(--state-amber-wash, rgba(180,140,0,0.10))', borderBottom: '1px solid var(--state-amber-ink)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>Session ended — re-authenticate to resume the live stream. Your unsaved edits are preserved locally.</span>
            <Button tone="secondary" size="compact" onClick={events.reconnect}>Reconnect</Button>
          </div>
        ) : null}

        {framed
          ? <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{screen}</div>
          : <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>}
      </div>

      {showNew ? <NewNoteModal onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); openNote(id); }} /> : null}
    </div>
  );
}
