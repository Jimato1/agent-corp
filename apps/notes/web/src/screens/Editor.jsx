// S2 — Note Editor (Workshop content pane in the Instrument shell). Left: the REAL Milkdown Crepe
// editor (markdown = truth). Right: the metadata rail — a composition of SHARED components only.
//
// Save = PUT /api/notes/:id { content, expected_hash } (CAS). This is the notes:write surface (the
// operator session, not an agent). Business outcomes are shown honestly:
//   PRECONDITION_HASH → Pattern-R stale buffer   HYGIENE_REJECT → Pattern-R (pattern class only)
//   TAINT_DOWNGRADE   → Pattern-R                 FENCE_UNVERIFIABLE → Pattern-D GOLD save treatment
// Taint is display-of-truth, READ-ONLY — a printed 🔒 absence, NEVER an editable control.
// ticket-status / ceremony_phase render as a muted 'mirror · authority: Board', never a StatePill.
import { api, mcReviewHref, mcAgentHref } from '../api.js';
import { H, mono, eyebrow, TaintBadge } from '../parts/common.jsx';
import { useAsync, ErrorView, SegToggle, classifyError } from '../parts/ui.jsx';
import { NoteEditor } from '../parts/NoteEditor.jsx';

const { useState, useRef, useEffect } = window.React;

function Row({ k, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 8, alignItems: 'start' }}>
      <span style={{ ...eyebrow, fontSize: 10 }}>{k}</span>
      <div>{children}</div>
    </div>
  );
}

export function Editor({ noteId, ctx }) {
  const { Button, FreshnessStamp, Skeleton, TicketRef, PrincipalRef, FenceState, PrintedAbsence } = H;
  const editorApi = useRef(null);
  const [saveState, setSaveState] = useState({ status: 'idle' }); // idle | saving | saved | error
  const [dirty, setDirty] = useState(false);

  // Load the note (body + canonical frontmatter + content_hash + commit_sha + taint). Re-runs on the
  // SSE live tick so the editor refreshes off the channel rather than trusting a stale buffer.
  const { data: note, error, loading, reload } = useAsync(() => api.getNote(noteId), [noteId, ctx.liveTick]);

  // Keep a live copy of the content_hash for CAS; a background reload updates it.
  const [expectedHash, setExpectedHash] = useState(null);
  useEffect(() => { if (note) setExpectedHash(note.content_hash); }, [note && note.content_hash]);

  const doSave = async () => {
    if (!editorApi.current) return;
    const content = editorApi.current.getMarkdown();
    setSaveState({ status: 'saving' });
    try {
      const res = await api.updateNote(noteId, { content, expected_hash: expectedHash });
      setExpectedHash(res.content_hash);
      setDirty(false);
      setSaveState({ status: 'saved' });
      setTimeout(() => setSaveState((s) => (s.status === 'saved' ? { status: 'idle' } : s)), 2500);
    } catch (e) {
      setSaveState({ status: 'error', error: e });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, padding: 40 }}><Skeleton variant="text" lines={8} /></div>
        <div style={{ width: 288, flex: 'none', borderLeft: '1px solid var(--border-default)', padding: 16 }}><Skeleton variant="text" lines={6} /></div>
      </div>
    );
  }
  if (error) {
    return <div style={{ padding: 24 }}><ErrorView error={error} action={<Button tone="secondary" onClick={reload}>Retry</Button>} /></div>;
  }

  const fm = note.frontmatter || {};
  const taint = note.taint || { own: 'clean', effective: 'clean', tainted_via: [] };
  const ticket = fm.ticket;
  const authors = fm.authored_by || [];
  const via = taint.tainted_via || [];
  const saveErr = saveState.status === 'error' ? saveState.error : null;
  // A ticket-bound note whose Board lease can't be confirmed fails CLOSED — GOLD save treatment (D),
  // never red. update_note itself is UNFENCED, but we still render the fail-closed honesty if it surfaces.
  const saveErrClass = saveErr ? classifyError(saveErr) : null;
  const saveGold = saveErrClass && saveErrClass.pattern === 'D';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* editor chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-raised)', flexWrap: 'wrap' }}>
        <button onClick={() => ctx.goto('corpus')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-link)' }}>‹ Corpus</button>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fm.title || note.id}</span>
        <Button tone={saveGold ? 'secondary' : 'primary'} size="compact" onClick={doSave} disabled={saveState.status === 'saving'}>
          {saveState.status === 'saving' ? 'Saving…' : saveState.status === 'saved' ? 'Saved ✓' : 'Save'}
        </Button>
        {dirty ? <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>unsaved</span> : null}
        <FreshnessStamp age={ctx.events.status === 'live' ? 'live 0.3s' : 'reconnecting'} state={ctx.events.status === 'stale' ? 'stale' : 'live'} reading="editor refreshes off the live channel" />
        <span style={{ flex: 1 }} />
        <SegToggle options={['paper', 'dark']} value={ctx.view} onChange={ctx.setView} />
      </div>

      {/* save-outcome banner (Pattern R red / Pattern D gold) */}
      {saveErr ? (
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-default)' }}>
          <ErrorView error={saveErr} action={saveErrClass.pattern === 'R' && saveErr.code === 'PRECONDITION_HASH'
            ? <Button tone="secondary" onClick={reload}>Reload newer version</Button>
            : <Button tone="secondary" onClick={() => setSaveState({ status: 'idle' })}>Dismiss</Button>} />
        </div>
      ) : null}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* THE editor: real Milkdown Crepe, storing markdown verbatim */}
        <NoteEditor noteId={note.id} initialMarkdown={note.body} view={ctx.view} apiRef={editorApi} onDirty={() => setDirty(true)} />

        {/* metadata rail — shared components only, never a bespoke redraw */}
        <div style={{ width: 288, flex: 'none', borderLeft: '1px solid var(--border-default)', background: 'var(--surface-panel)', padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={eyebrow}>Metadata</div>
          <Row k="id"><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{note.id}</span></Row>
          <Row k="type"><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{fm.type || '—'}</span></Row>
          {ticket ? <Row k="ticket"><TicketRef id={ticket} href={mcReviewHref(ticket)} /></Row> : null}

          <Row k="taint">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><TaintBadge level={taint.own} /><span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>own</span></span>
              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><TaintBadge level={taint.effective} /><span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>effective</span></span>
              {via.length ? (
                <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>
                  via: {via.map((v) => (
                    <a key={v} href="#" onClick={(e) => { e.preventDefault(); ctx.openNote(v); }} style={{ color: 'var(--state-amber-ink)', marginRight: 6 }}>{v} ⚠</a>
                  ))}
                </span>
              ) : null}
            </div>
          </Row>

          {ticket ? (
            <Row k="fence">
              {/* Display-only. The live lease/generation is enforced SERVER-SIDE on agent (append/link)
                  writes and held by the Board; this read surface renders it advisory, never authored. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <FenceState gen="—" state="held" advisory />
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>lease + generation live on the Board</span>
              </div>
            </Row>
          ) : null}

          <Row k="authors">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
              {authors.length
                ? authors.map((a) => <PrincipalRef key={a} kind={principalKind(a)} id={a} href={mcAgentHref(a)} />)
                : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
            </div>
          </Row>

          {/* ticket-status / ceremony phase: DECORATIVE MIRROR, never an authoritative StatePill (CORR-2).
              Notes never reads these back to decide anything. There is no live status field in the read
              response (display-only firewall); authority is the Board, reachable via the ticket deep-link. */}
          {ticket ? (
            <Row k="ticket-status">
              <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>see Board</span>
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>mirror · authority: Board</span>
              </span>
            </Row>
          ) : null}

          {/* The taint control's ABSENCE is a printed constitutional fact — no greyed toggle. */}
          <PrintedAbsence glyph="🔒" tag="display-of-truth">
            <strong>Taint cannot be edited here.</strong> It is display-of-truth; correcting a genuine mistag is an out-of-band, operator-only, step-up-audited path — deliberately kept off this surface.
          </PrintedAbsence>
        </div>
      </div>
    </div>
  );
}

function principalKind(sub) {
  if (sub.startsWith('operator:') || sub.startsWith('op:')) return 'operator';
  if (sub.startsWith('svc:') || sub.startsWith('service:')) return 'service';
  return 'agent';
}
