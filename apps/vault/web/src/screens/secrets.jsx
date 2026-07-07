// screens/secrets.jsx — Secrets Manager (UI_SPEC §4). The write-only surface: create / import / rotate
// KV secrets and read rotation metadata — but the console NEVER displays a stored plaintext back, by
// construction (§4.2). Everywhere a reveal/export/show-plaintext control would sit there is instead the
// printed constitutional ABSENCE (§4.7 destructive-absence rule: PrintedAbsence, a fact, not a greyed
// toggle). Rotate is a DangerAction → ConfirmFriction (full). States: loaded · loading(skeleton) ·
// empty · Pattern R (a submitted write failed) · Pattern D gold (engine sealed → list renders, writes
// safe-stopped) · stop-engaged (kill → confirm states new issuance halted).
import { H, panel, mono, eyebrow, Head, PollStamp, TableSkeleton, ScreenError, SafeStopBanner, degradedPosture, usePoll, classifyError } from '../ui.jsx';
import { vault, newOpId } from '../api.js';
import { SecretWriteForm } from '../parts.jsx';
const { DataTable, StatusPill, TierBadge, DangerAction, PrintedAbsence, Button, EmptyState } = H;

const asRows = (d) => (d && (d.handles || d.rows)) || (Array.isArray(d) ? d : []);
const host = (s) => s.host_id || s.host || '—';
const rotDue = (s) => s.rotation_due || s.due || '';
const lastWrite = (s) => s.last_write || s.lastWrite || '—';
const versionsOf = (s) => s.versions || [];

export function Secrets({ shell }) {
  const { data, error, loading, ageMs, reload } = usePoll(vault.handles);
  const [form, setForm] = React.useState(false);
  const [sel, setSel] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [writeErr, setWriteErr] = React.useState(null);
  const [flash, setFlash] = React.useState('');

  const rows = asRows(data);
  const degraded = degradedPosture(data);
  const writesBlocked = !!degraded || shell.safeStop;
  const selected = sel && rows.find((r) => r.handle === sel);

  React.useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 4000); return () => clearTimeout(t); }, [flash]);

  async function submitWrite(payload) {
    setSubmitting(true); setWriteErr(null);
    try {
      await vault.writeKv(payload, newOpId());
      setFlash('Secret written'); setForm(false); reload();
    } catch (e) {
      // Pattern R (red): the operator's own fixable write error. Attach the offending field if the
      // backend named one (duplicate name w/ policy conflict, invalid host_id, engine write rejected).
      if (classifyError(e) === 'D') { setWriteErr(null); reload(); }
      else { e.field = e.body && e.body.field; setWriteErr(e); }
    } finally { setSubmitting(false); }
  }
  async function doRotate(handle) {
    try { await vault.rotate(handle, newOpId()); setFlash(`Rotation started · ${handle}`); reload(); }
    catch (e) { setWriteErr(e); }
  }

  const cols = [
    { key: 'handle', header: 'Handle', mono: true, render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{s.handle}</span> },
    { key: 'host', header: 'Host', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{host(s)}</span> },
    { key: 'kind', header: 'Kind', render: (s) => <StatusPill tone="neutral" size="sm">{s.kind || 'kv'}</StatusPill> },
    { key: 'class', header: 'Approval class', render: (s) => (s.requires_approval_class || s.approvalClass) ? <TierBadge tier="single" label={s.requires_approval_class || s.approvalClass} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    { key: 'rotation', header: 'Rotation', render: (s) => <span style={{ ...mono, fontSize: 12, color: rotDue(s) ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{s.rotation || 'manual'} {rotDue(s) ? `▲ ${rotDue(s)}` : ''}</span> },
    { key: 'lastWrite', header: 'Last write', align: 'right', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{lastWrite(s)}</span> },
  ];

  // Pattern D (gold) with NO local rows to show → full screen safe-stop; otherwise render the list and
  // gate writes with the in-screen SafeStopBanner (list is a wrapper-DB read; §4.3).
  if (error && classifyError(error) === 'D' && !rows.length) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Secrets manager" sub="This surface can create and rotate secrets; it cannot read one back." />
      <ScreenError error={error} title="Secrets store safe-stopped" onRetry={reload}
        stillTrue={['no plaintext exposed', 'existing certs valid to TTL', 'writes queue/deny until the engine unseals — see Status / DR']} />
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Secrets manager"
        sub="Static credentials (NAS admin, switch enable, API keys) live here; the fleet's shell access is SSH-CA signed and needs no stored password. This surface can create and rotate secrets — it can never read one back."
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PollStamp ageMs={ageMs} />
          <Button tone="primary" disabled={writesBlocked} onClick={() => { setWriteErr(null); setForm(true); }}>+ New KV secret</Button>
          <Button tone="secondary" disabled={writesBlocked} onClick={() => { setWriteErr(null); setForm(true); }}>Import</Button>
        </div>} />

      {/* §4.2 — the write-only constitutional absence: a printed fact with a 🔒 glyph and NO control. */}
      <PrintedAbsence glyph="⛊" tag="write-only by construction">
        <strong>There is no reveal, export, or show-plaintext path here.</strong> This surface can create
        and rotate secrets; it cannot read one back. Break-glass read is an offline 3-of-5 quorum ceremony,
        never a web action.
      </PrintedAbsence>

      {writesBlocked ? <SafeStopBanner
        dependency={degraded ? degraded.dependency : (shell.killed ? `kill engaged (${shell.killLevel})` : 'vault engine sealed / unreachable')}
        stillTrue={['no plaintext exposed', 'existing certs valid to their TTL']}
        todo="writes and rotation queue/deny until the engine unseals — see Status / DR ▸" /> : null}

      {flash ? <div style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔ {flash}</div> : null}
      {form ? <SecretWriteForm onClose={() => setForm(false)} onSubmit={submitWrite} submitting={submitting} error={writeErr} /> : null}

      {loading && !rows.length
        ? <TableSkeleton rows={6} />
        : rows.length
          ? <DataTable columns={cols} rows={rows} rowKey="handle" focusedKey={sel || undefined} onRowClick={(s) => setSel(s.handle)} />
          : <EmptyState glyph="⛨" title="No secrets stored"
              action={<Button tone="primary" disabled={writesBlocked} onClick={() => setForm(true)}>+ New KV secret</Button>} />}

      {/* Non-D read failure = Pattern R on the query (rare for this list). */}
      {error && classifyError(error) !== 'D' && rows.length === 0 && !loading
        ? <ScreenError error={error} title="Couldn't load handles" onRetry={reload} /> : null}

      {selected ? (
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={eyebrow}>Detail · {host(selected)}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>host_id {host(selected)} · requires_approval_class: {selected.requires_approval_class || selected.approvalClass || '—'} · recovery: {selected.recovery || '—'}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Rotation policy: {selected.rotation || 'manual'}{selected.post_redemption_rotate ? ' · post-redemption-rotate: on' : ''}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Versions (metadata): {versionsOf(selected).length ? versionsOf(selected).join(' · ') : '— (SSH-CA, no KV value)'} <span style={{ color: 'var(--text-disabled)' }}>[ no value shown, ever ]</span></div>
          {(selected.kind || 'kv') === 'kv' ? (
            <div><DangerAction label="Rotate now" glyph="⚠" variant="solid" size="compact" disabled={writesBlocked}
              title={`Rotate ${selected.handle}`}
              consequence={`Moves versions; irreversible for the prior value. Not complete until the new version is durably off-box.${shell.killed ? ` NOTE: kill ${shell.killLevel} is engaged — new issuance is halted; rotation of stored KV metadata still writes.` : ''}`}
              direction="more" irreversible typedIntent="ROTATE" stepUp
              auditNote="Shows the off-box snapshot ack; writes a tamper-evident row."
              confirmLabel="Rotate" onConfirm={() => doRotate(selected.handle)} onEscapeToHalt={() => { window.location.hash = '#/status'; }} /></div>
          ) : (
            <PrintedAbsence glyph="⛊" tag="ssh-ca">SSH-CA credential — no stored KV value; shell access is CA-signed per redemption, nothing to rotate here.</PrintedAbsence>
          )}
        </div>
      ) : null}
    </div>
  );
}
