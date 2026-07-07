// screens/change.jsx — Change Control (UI_SPEC §9.1). The SINGLE place any gate-weakening edit happens:
// TTL raises, principal widening, audit-sink change, release-TTL raise, sign-role edits, CA rotation,
// config-as-code. Every such edit is the FULL ConfirmFriction ceremony (§5.1): diff rendered BEFORE
// confirm → typed-intent → auth Tier-2 live step-up → diff-hash-bound confirm token → tamper-evident
// audit row. The confirm token is bound to the exact sha256 shown; a changed diff invalidates it.
// States: loaded (diff shown) · loading(skeleton) · empty (no pending edits) · Pattern R (apply rejected
// — stale diff-hash / step-up lapsed) · Pattern D gold (auth step-up or engine unreachable) · stop-
// engaged (kill ≥ G1 → gate-weakening apply refused; the consequence names the active kill level).
import { H, panel, mono, eyebrow, Head, ScreenError, classifyError } from '../ui.jsx';
import { vault, newOpId } from '../api.js';
const { Input, Button, DangerAction, EmptyState, Skeleton } = H;

export function ChangeControl({ shell }) {
  const [edit, setEdit] = React.useState('');
  const [state, setState] = React.useState({ loading: false, diff: null, err: null }); // diff = {hash, lines, label, consequence, gate_weakening}
  const [applyErr, setApplyErr] = React.useState(null);
  const [flash, setFlash] = React.useState('');

  async function propose() {
    if (!edit.trim()) return;
    setState({ loading: true, diff: null, err: null }); setApplyErr(null); setFlash('');
    try {
      const r = await vault.changeDiff(edit.trim());
      setState({ loading: false, diff: r, err: null });
    } catch (e) { setState({ loading: false, diff: null, err: e }); }
  }
  async function apply() {
    setApplyErr(null);
    try {
      await vault.applyChange({ edit: edit.trim(), diff_hash: state.diff && (state.diff.hash || state.diff.diff_hash) }, newOpId());
      setFlash('Edit applied — tamper-evident row written to Access Audit'); setState({ loading: false, diff: null, err: null }); setEdit('');
    } catch (e) { setApplyErr(e); }
  }

  const diff = state.diff;
  const hash = diff && (diff.hash || diff.diff_hash);
  const lines = (diff && (diff.lines || diff.diff)) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
      <Head title="Change control"
        sub="The single place any gate-weakening edit happens — TTL raises, principal widening, sink changes, CA rotation. Every edit is the full ceremony: rendered diff → typed-intent → step-up → diff-hash-bound token → tamper-evident audit row."
        right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>pending edits: {diff ? 1 : 0}</span>} />

      <div style={{ ...panel, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Input label="Propose edit (descriptor)" mono value={edit} onChange={(e) => setEdit(e.target.value)} placeholder="raise-ssh-ttl:30m" style={{ flex: 1, minWidth: 260 }} />
        <Button tone="primary" disabled={!edit.trim() || state.loading} onClick={propose}>{state.loading ? 'Rendering diff…' : '+ Render diff'}</Button>
      </div>

      {flash ? <div style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔ {flash}</div> : null}

      {state.loading
        ? <div style={{ ...panel, padding: 16 }}><Skeleton variant="text" lines={4} /></div>
        : state.err
          ? <ScreenError error={state.err} title={classifyError(state.err) === 'D' ? 'Cannot render diff — dependency safe-stopped' : 'Invalid edit descriptor'}
              stillTrue={classifyError(state.err) === 'D' ? ['policy is unchanged until an edit is applied'] : undefined} onRetry={propose} />
          : diff
            ? (
              <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={eyebrow}>Proposed edit — {diff.label || edit}</div>
                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '10px 14px', ...mono, fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Diff (hash {hash || 'sha256:—'})</div>
                  {lines.length
                    ? lines.map((ln, i) => <div key={i} style={{ color: String(ln).startsWith('-') ? 'var(--danger-text)' : String(ln).startsWith('+') ? 'var(--state-green-ink)' : 'var(--text-secondary)' }}>{ln}</div>)
                    : <div style={{ color: 'var(--text-muted)' }}>(diff body not provided by server)</div>}
                  {diff.gate_weakening !== false ? <div style={{ color: 'var(--state-amber-ink)', marginTop: 6 }}>⚠ GATE-WEAKENING — this widens a gate; it moves the system toward more real-world action.</div> : null}
                </div>
                <div style={{ background: 'var(--danger-bg)', border: '1px solid #5A2420', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '19px', color: 'var(--danger-text)' }}>
                  ⚠ Consequence — {diff.consequence || 'moves the system TOWARD MORE real-world action; irreversible for artifacts already produced under the new setting.'} Live kill level: {shell.killLevel && shell.killed ? shell.killLevel : 'G0'}.
                </div>
                {applyErr ? <ScreenError error={applyErr}
                  title={classifyError(applyErr) === 'D' ? 'Apply deferred — cannot re-authenticate / engine sealed' : 'The diff changed or your step-up lapsed'}
                  stillTrue={classifyError(applyErr) === 'D' ? ['policy is unchanged', 're-authenticate / unseal, then re-open to confirm the current diff'] : undefined} /> : null}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DangerAction label="Apply edit" glyph="⚠" variant="solid" disabled={shell.killed}
                    title={`Apply — ${diff.label || edit}`}
                    consequence={`Confirm the EXACT diff shown (${hash || 'sha256:—'}). A changed diff invalidates this token.${shell.killed ? ` Kill ${shell.killLevel} is engaged — this gate-weakening apply is REFUSED under the active kill level.` : ''}`}
                    direction="more" irreversible typedIntent={diff.typed_intent || edit.trim()} stepUp
                    auditNote={`Diff-hash-bound (${hash || 'sha256:—'}); writes a tamper-evident audit row visible in Access Audit.`}
                    confirmLabel="Apply edit" onConfirm={apply} onEscapeToHalt={() => { window.location.hash = '#/status'; }} />
                </div>
              </div>
            )
            : <EmptyState glyph="⚖" title="No pending edits"
                action={<span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Any gate-weakening change to TTLs, principals, sinks, or config lands here behind step-up.</span>} />}
    </div>
  );
}
