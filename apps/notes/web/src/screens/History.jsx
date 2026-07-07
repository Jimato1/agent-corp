// S6 — Provenance & History Inspector (Instrument; the AuditInspector family in both modes). The
// read-only truth of where a note came from and who touched it.
//
// HONESTY: the full append-only audit projection is rebuilt SERVER-SIDE from git-commit trailers and
// is not exposed as a REST list in this build. This surface shows (a) the latest commit, (b) the live
// audit tail observed on the SSE channel this session, and (c) a chain-verify that — per the §7.2
// false-green rule — is NEVER rendered green when it cannot be fully confirmed. Denied/rejected calls
// are not here (they live in stdout logs only). Provenance mode is fully live.
import { api } from '../api.js';
import { H, mono, eyebrow, panel, TaintBadge } from '../parts/common.jsx';
import { Head, useAsync, ErrorView, SegToggle } from '../parts/ui.jsx';

const { useState } = window.React;

function principalKind(sub) {
  if (!sub) return 'agent';
  if (sub.startsWith('operator:') || sub.startsWith('op:')) return 'operator';
  if (sub.startsWith('svc:') || sub.startsWith('service:')) return 'service';
  return 'agent';
}

export function History({ noteId, ctx }) {
  const { DataTable, Skeleton, StatusPill, PrincipalRef, FreshnessStamp, PrintedAbsence, Button } = H;
  const [mode, setMode] = useState('audit');
  const { data, error, loading, reload } = useAsync(async () => {
    const [note, health] = await Promise.all([api.getNote(noteId), api.health().catch(() => null)]);
    return { note, health };
  }, [noteId, ctx.liveTick]);

  if (loading) return <div style={{ padding: 24 }}><Skeleton variant="table" rows={5} /></div>;
  if (error) return <div style={{ padding: 24 }}><ErrorView error={error} action={<Button tone="secondary" onClick={reload}>Retry</Button>} /></div>;

  const { note, health } = data;
  const fm = note.frontmatter || {};
  const git = (health && health.git) || {};
  // Chain-verify can NEVER be confirmed green from this read surface (the full trailer projection is
  // not exposed over REST) — and is degraded regardless if git is unhealthy. Gold, never green/red.
  const gitDegraded = git.degraded || git.remote_reachable === false || (typeof git.git_push_lag_seconds === 'number' && git.git_push_lag_seconds > 60);

  // Live audit tail for THIS note, observed on the SSE channel this session (client-observed times).
  const feed = (ctx.auditFeed || []).filter((r) => r.note_id === note.id);

  const cols = [
    { key: 'at', header: 'Time (observed)', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.at).toISOString().replace('.000', '')}</span> },
    { key: 'who', header: 'Who', render: (r) => <PrincipalRef kind={principalKind(r.sub)} id={r.sub} href={`/mc/agents/${encodeURIComponent(r.sub)}`} /> },
    { key: 'action', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.tool}</code> },
    { key: 'outcome', header: 'Outcome', align: 'right', render: () => <StatusPill tone="verified" glyph="✔" size="sm">ok</StatusPill> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1080 }}>
      <Head crumb="History" title={fm.title || note.id}
        sub="Read-only truth of where this note came from and who touched it. A stale or failed chain-verify is never rendered green."
        right={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <FreshnessStamp age={gitDegraded ? 'unverified' : 'live'} state={gitDegraded ? 'halt' : 'live'} reading="git remote reachability + push lag from /healthz" />
          <SegToggle options={['audit', 'provenance']} value={mode} onChange={setMode} />
        </div>} />

      {mode === 'audit' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...panel, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <span style={{ ...eyebrow }}>latest commit</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{note.commit_sha || '—'}</span>
            <span style={{ ...eyebrow }}>authors</span>
            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>{(fm.authored_by || []).map((a) => <PrincipalRef key={a} kind={principalKind(a)} id={a} href={`/mc/agents/${encodeURIComponent(a)}`} />)}</span>
          </div>

          {/* Chain-verify — GOLD "cannot confirm", never green (§7.2). */}
          <div style={{ background: 'var(--state-amber-wash, rgba(180,140,0,0.10))', border: '1px solid var(--state-amber-ink)', borderRadius: 'var(--radius-panel)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)', fontWeight: 600 }}>⚠ CANNOT CONFIRM</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
              The append-only audit chain is rebuilt server-side from git-commit trailers and is not exposed over REST on this build — so this surface cannot render a verified-green chain. {gitDegraded ? 'git is also degraded (remote lag/unreachable).' : ''} Treat as UNVERIFIED.
            </span>
          </div>

          <div style={{ ...eyebrow }}>live audit tail (this session, via SSE)</div>
          {feed.length
            ? <DataTable columns={cols} rows={feed.map((r, i) => ({ ...r, _key: i }))} rowKey="_key" reflow={false} />
            : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', padding: '6px 2px' }}>No edits observed on the live channel yet this session. Historical rows require the server-side git-trailer projection.</div>}
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>state-changes only · denied/rejected calls are not recorded here (they live in stdout logs)</div>
        </div>
      ) : (
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <TaintBadge level={note.taint.own} /><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>own</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
            <TaintBadge level={note.taint.effective} /><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>effective</span>
          </div>
          {(note.taint.tainted_via || []).length
            ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>
                tainted_via: {note.taint.tainted_via.map((v) => (
                  <a key={v} href="#" onClick={(e) => { e.preventDefault(); ctx.openNote(v); }} style={{ ...mono, color: 'var(--state-amber-ink)', marginRight: 8 }}>{v} ⚠</a>
                ))}
              </div>
            : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>No transitive taint — own = effective.</div>}
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
            provenance: <span style={mono}>{fm.provenance || '—'}</span> · structural floor from ticket lineage applies server-side.
          </div>
          <PrintedAbsence glyph="🔒" tag="read-only">Provenance is display-of-truth — there is no correction control here.</PrintedAbsence>
        </div>
      )}
    </div>
  );
}
