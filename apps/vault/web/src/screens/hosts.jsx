// screens/hosts.jsx — Host Onboarding (UI_SPEC §5). Register a host from a CMDB host_id, STAGE a
// *proposed* per-host SSH sign-role (powerless — the wrapper never writes ssh/roles directly), then an
// operator step-up APPLIES it via the change-control path (DangerAction → ConfirmFriction full, diff-
// hash-bound + tamper-evident row). Emits the TrustedUserCAKeys provisioning snippet + NTP reminder.
// A wildcard / root / allow_empty role is prevented from staging by the continuous invariant check
// (SignRoleStager, red Pattern-R block). States: loaded · loading · empty · Pattern R (register/stage
// rejected) · Pattern D gold (CMDB unreachable / engine sealed) · stop-engaged (apply refused under kill).
import { H, panel, mono, eyebrow, Head, PollStamp, TableSkeleton, ScreenError, SafeStopBanner, degradedPosture, usePoll, classifyError } from '../ui.jsx';
import { vault, newOpId } from '../api.js';
import { SignRoleStager } from '../parts.jsx';
const { DataTable, TicketRef, StatusPill, Button, Input, EmptyState } = H;

const asRows = (d) => (d && (d.hosts || d.rows)) || (Array.isArray(d) ? d : []);
const hid = (h) => h.host_id || h.host;
const caKeysOf = (h) => h.ca_keys || h.caKeys || '—';

function StatePill({ state }) {
  if (state === 'ready') return <StatusPill tone="verified" glyph="●" size="sm">READY</StatusPill>;
  if (state === 'staged') return <StatusPill tone="attention" glyph="◐" size="sm">STAGED</StatusPill>;
  return <StatusPill tone="neutral" glyph="◼" size="sm">NEW</StatusPill>;
}

export function Hosts({ shell }) {
  const { data, error, loading, ageMs, reload } = usePoll(vault.hosts);
  const [reg, setReg] = React.useState(false);
  const [regHost, setRegHost] = React.useState('');
  const [selHost, setSelHost] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [opErr, setOpErr] = React.useState(null);
  const [flash, setFlash] = React.useState('');
  const [diffHash, setDiffHash] = React.useState(null);

  const rows = asRows(data);
  const degraded = degradedPosture(data);
  const writesBlocked = !!degraded || shell.safeStop;
  const selected = (selHost && rows.find((r) => hid(r) === selHost)) || rows.find((r) => r.state !== 'ready');

  React.useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 4000); return () => clearTimeout(t); }, [flash]);

  async function registerHost() {
    setBusy(true); setOpErr(null);
    try { await vault.registerHost({ host_id: regHost.trim() }, newOpId()); setFlash(`Registered ${regHost.trim()}`); setReg(false); setRegHost(''); reload(); }
    catch (e) { setOpErr(e); } finally { setBusy(false); }
  }
  async function stage(payload) {
    if (!selected) return;
    setBusy(true); setOpErr(null);
    try { const r = await vault.stageSignRole(hid(selected), payload, newOpId()); setDiffHash(r.diff_hash || r.hash || null); setFlash('Sign-role proposal staged (powerless)'); reload(); }
    catch (e) { setOpErr(e); } finally { setBusy(false); }
  }
  async function apply() {
    if (!selected) return;
    try { await vault.applySignRole(hid(selected), { diff_hash: diffHash }, newOpId()); setFlash(`Applied sign-role gateway-${hid(selected)}`); reload(); }
    catch (e) { setOpErr(e); }
  }

  const cols = [
    { key: 'host', header: 'Host', render: (h) => <TicketRef id={hid(h)} /> },
    { key: 'role', header: 'SSH sign-role', render: (h) => h.role ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{h.role} {h.roleOk || h.role_ok ? '✔' : '⧗'}</span> : <span style={{ color: 'var(--text-disabled)' }}>— (none)</span> },
    { key: 'principals', header: 'Principals (pinned)', render: (h) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{h.principals || '—'}</span> },
    { key: 'ntp', header: 'NTP', render: (h) => <span style={{ ...mono, fontSize: 12, color: (h.ntp && h.ntp !== 'ok') ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>{h.ntp || '—'}</span> },
    { key: 'ca', header: 'CA-keys provisioned', render: (h) => <span style={{ ...mono, fontSize: 11, color: String(caKeysOf(h)).includes('▲') ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{caKeysOf(h)}</span> },
    { key: 'state', header: 'State', render: (h) => <StatePill state={h.state} /> },
  ];

  if (error && classifyError(error) === 'D' && !rows.length) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Host onboarding" sub="Register a host and stage its SSH sign-role." />
      <ScreenError error={error} title="Onboarding safe-stopped — CMDB / engine unreachable" onRetry={reload}
        stillTrue={['existing sign-roles unchanged', 'staging is powerless anyway', 'apply is deferred until the engine unseals / CMDB returns']} />
    </div>;
  }

  const applyNode = (
    <H.DangerAction label="Apply (operator step-up)" glyph="⚠" variant="solid" size="compact" disabled={writesBlocked || !diffHash}
      title={`Apply sign-role gateway-${selected ? hid(selected) : '<host>'}`}
      consequence={`The gate-defining act. You confirm the EXACT sha256 diff shown (${diffHash || 'stage first to compute the hash'}); a changed diff invalidates this token.${shell.killed ? ` Kill ${shell.killLevel} is engaged — this gate-weakening-class change is HALTED under the active kill level.` : ''}`}
      direction="more" typedIntent="APPLY-ROLE" stepUp
      auditNote={`Diff-hash-bound (${diffHash || 'sha256:—'}); writes a tamper-evident audit row (ARCHITECTURE §12 policy-plane change control).`}
      confirmLabel="Apply" onConfirm={apply} onEscapeToHalt={() => { window.location.hash = '#/status'; }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Host onboarding"
        sub="A wildcard / root / allow_empty role is prevented from staging by a continuous invariant check. Staging is powerless; only an operator step-up applies a role via the change-control path."
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><PollStamp ageMs={ageMs} /><Button tone="primary" disabled={writesBlocked} onClick={() => { setOpErr(null); setReg(true); }}>+ Register host</Button></div>} />

      {writesBlocked ? <SafeStopBanner dependency={degraded ? degraded.dependency : (shell.killed ? `kill engaged (${shell.killLevel})` : 'CMDB / engine unreachable')}
        stillTrue={['existing sign-roles unchanged', 'staging is powerless']} todo="apply is deferred until the engine unseals / CMDB returns" /> : null}

      {flash ? <div style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔ {flash}</div> : null}
      {opErr ? <ScreenError error={opErr} title={classifyError(opErr) === 'D' ? 'Operation safe-stopped' : 'Rejected'} /> : null}

      {reg ? (
        <div style={{ ...panel, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Input label="host_id (validated against CMDB)" mono value={regHost} onChange={(e) => setRegHost(e.target.value)} placeholder="db-02" style={{ width: 220 }} />
          <Button tone="primary" disabled={!regHost.trim() || busy} onClick={registerHost}>{busy ? 'Registering…' : 'Register'}</Button>
          <Button tone="ghost" onClick={() => setReg(false)}>Cancel</Button>
        </div>
      ) : null}

      {loading && !rows.length
        ? <TableSkeleton rows={4} />
        : rows.length
          ? <DataTable columns={cols} rows={rows.map((h) => ({ ...h, _k: hid(h) }))} rowKey="_k" focusedKey={selected ? hid(selected) : undefined} onRowClick={(h) => setSelHost(hid(h))} />
          : <EmptyState glyph="⊞" title="No hosts onboarded"
              action={<Button tone="primary" disabled={writesBlocked} onClick={() => setReg(true)}>+ Register host</Button>} />}

      {rows.length ? <SignRoleStager host={selected ? hid(selected) : null} staged={selected && selected.state === 'staged' ? selected : null} diffHash={diffHash} onStage={stage} staging={busy} applyNode={applyNode} /> : null}

      <div style={{ ...panel, padding: 14, ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
        <div style={{ ...eyebrow, marginBottom: 6 }}>TrustedUserCAKeys snippet (copy) — provision once per host before first redemption</div>
        <code
          role="button" tabIndex={0}
          onClick={(e) => { try { navigator.clipboard.writeText(e.currentTarget.textContent); setFlash('Snippet copied'); } catch { /* clipboard unavailable */ } }}
          style={{ cursor: 'copy', display: 'block', color: 'var(--text-primary)' }}>
          @cert-authority *.fleet  ssh-ed25519 AAAA…CApub   key_id correlates to &lt;ticket_id&gt;
        </code>
        <div style={{ color: 'var(--state-amber-ink)', marginTop: 6 }}>Reminder: enforced/monitored NTP — clock skew silently extends cert validity.</div>
      </div>
    </div>
  );
}
