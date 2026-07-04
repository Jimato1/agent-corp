/* Helm — auth UI kit (the reference implementation)
   The identity gateway. Hosts the identity-layer stop + per-principal
   revocation and a READ-ONLY mirror of the global kill level (Mission Control
   owns global actuation). Instrument archetype. Home of the canonical
   Audit / Provenance Inspector. */

const H = window.HelmDesignSystem_f4cb26;
const {
  NavRail, AppHeader, KillMirror, StopActuator, DataTable, TicketRef,
  PrincipalRef, TierBadge, Button, StatusPill, DangerAction, PrintedAbsence,
  FreshnessStamp, ErrorState,
} = H;

const PRINCIPALS = [
  { id: 'operator:ada',      kind: 'operator', status: 'active',   tier: 'verified',     seen: 'live',    sessions: 2 },
  { id: 'agent:patcher-07',  kind: 'agent',    status: 'active',   tier: 'verified',     seen: '12s ago', sessions: 1 },
  { id: 'svc:tier-approver', kind: 'service',  status: 'active',   tier: 'verified',     seen: '3s ago',  sessions: 4 },
  { id: 'agent:migrator-1',  kind: 'agent',    status: 'active',   tier: 'untrusted',    seen: '1m ago',  sessions: 1 },
  { id: 'operator:sam',      kind: 'operator', status: 'active',   tier: 'single',       seen: '44m ago', sessions: 0 },
  { id: 'agent:crawler-3',   kind: 'agent',    status: 'active',   tier: 'single',       seen: '1m ago',  sessions: 1 },
  { id: 'svc:legacy-sync',   kind: 'service',  status: 'disabled', tier: 'single',       seen: '8d ago',  sessions: 0 },
  { id: 'svc:webhook-in',    kind: 'service',  status: 'revoked',  tier: 'untrusted',    seen: '2h ago',  sessions: 0 },
];

const AUDIT = [
  { t: '03:14:02', who: 'operator:sam',       kind: 'operator', action: 'break_glass',   target: 'vault:prod',  outcome: 'granted',  tier: 'single',       chain: 'cannot-confirm' },
  { t: '03:12:55', who: 'svc:tier-approver',  kind: 'service',  action: 'approve',       target: 'T-000221',    outcome: 'recorded', tier: 'verified',     chain: 'ok' },
  { t: '03:11:40', who: 'agent:migrator-1',   kind: 'agent',    action: 'request_grant', target: 'db:users',    outcome: 'refused',  tier: 'corroborated', chain: 'ok' },
  { t: '03:09:18', who: 'operator:ada',       kind: 'operator', action: 'revoke',        target: 'svc:webhook-in', outcome: 'done',  tier: 'verified',     chain: 'ok' },
  { t: '03:02:10', who: 'agent:patcher-07',   kind: 'agent',    action: 'mint_token',    target: 'host-04',     outcome: 'issued',   tier: 'verified',     chain: 'ok' },
];

const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

function statusPill(s) {
  if (s === 'revoked') return <StatusPill tone="danger" glyph="⛒" size="sm">Revoked</StatusPill>;
  if (s === 'disabled') return <StatusPill tone="neutral" glyph="◼" size="sm">Disabled</StatusPill>;
  return <StatusPill tone="verified" glyph="✔" size="sm">Active</StatusPill>;
}

/* ---------- Principals ---------- */
function Principals({ onOpen }) {
  const columns = [
    { key: 'id', header: 'Principal', render: (p) => <PrincipalRef kind={p.kind} id={p.id} status={p.status === 'active' ? 'active' : p.status} /> },
    { key: 'kind', header: 'Kind', render: (p) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.kind}</span> },
    { key: 'status', header: 'Status', render: (p) => statusPill(p.status) },
    { key: 'tier', header: 'Last attestation', render: (p) => <TierBadge tier={p.tier} /> },
    { key: 'sessions', header: 'Sessions', align: 'right', sortable: true, sortValue: (p) => p.sessions, render: (p) => p.sessions },
    { key: 'seen', header: 'Last seen', align: 'right', render: (p) => <FreshnessStamp age={p.seen === 'live' ? undefined : p.seen} state="live" /> },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Principals</h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>Every identity in the suite — resolved from the auth platform, never a bare display name.</p>
      </div>
      <DataTable columns={columns} rows={PRINCIPALS} rowKey="id" onRowClick={onOpen} />
    </div>
  );
}

/* ---------- Principal detail ---------- */
function PrincipalDetail({ p, onBack, onRevoked }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
      <button onClick={onBack} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to principals</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PrincipalRef kind={p.kind} id={p.id} status={p.status === 'active' ? 'active' : p.status} />
        {statusPill(p.status)}
        <TierBadge tier={p.tier} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{ ...panel, padding: 16 }}>
          <div style={eyebrow}>Active sessions</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{p.sessions}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>last seen {p.seen}</div>
        </div>
        <div style={{ ...panel, padding: 16 }}>
          <div style={eyebrow}>Kind</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 6, textTransform: 'capitalize' }}>{p.kind}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.kind === 'agent' ? 'An autonomous worker' : p.kind === 'operator' ? 'A human at the helm' : 'A platform service'}</div>
        </div>
      </div>

      <PrintedAbsence why="Segregation of duties is enforced at issuance; this console cannot relax it.">
        <strong>This surface cannot let a principal approve its own work.</strong>
      </PrintedAbsence>
      <PrintedAbsence glyph="⛊" why="auth stores only verifiers; the raw credential is never held.">
        <strong>auth never displays a principal's stored credential.</strong>
      </PrintedAbsence>

      <div style={{ ...panel, padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={eyebrow}>Identity actions</span>
        <span style={{ flex: 1 }} />
        <Button tone="secondary">Rotate keys</Button>
        {p.status === 'revoked'
          ? <StatusPill tone="danger" glyph="⛒">Already revoked</StatusPill>
          : <DangerAction
              label="Revoke principal" glyph="⛔" variant="solid"
              title={`Revoke ${p.id}`}
              consequence={<>This <strong>revokes</strong> {p.id} and kills its {p.sessions} session(s). It moves the system toward LESS action.</>}
              direction="less" typedIntent={p.id} stepUp
              auditNote="Writes a tamper-evident audit row."
              confirmLabel="Revoke" onConfirm={() => onRevoked(p.id)} />}
      </div>
    </div>
  );
}

/* ---------- Identity control (auth's own stop + read-only global mirror) ---------- */
function IdentityControl({ idStop, onIdStop }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Identity control</h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>auth hosts the identity-layer stop. The global kill lives in Mission Control — shown here read-only.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{ ...panel, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={eyebrow}>Identity-layer stop · auth owns this</div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '20px', color: 'var(--text-secondary)', margin: 0 }}>Halts all token issuance and re-auth. Existing tokens still expire on their own TTL.</p>
          <StopActuator level="G1" engaged={idStop} onEngage={onIdStop} label="Hold to halt issuance" />
        </div>
        <div style={{ ...panel, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={eyebrow}>Global kill · read-only mirror</div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '20px', color: 'var(--text-secondary)', margin: 0 }}>The suite-wide posture, mirrored from Mission Control. Act on it there.</p>
          <KillMirror engaged={false} href="#" label="Nominal" />
        </div>
      </div>

      {idStop ? <ErrorState pattern="D" title="Identity issuance halted" detail="scope: auth · token minting refused"
        >The identity layer is safe-stopped by the operator. Existing tokens continue to their TTL; no new tokens are minted.</ErrorState> : null}
    </div>
  );
}

/* ---------- Audit / Provenance Inspector (canonical) ---------- */
function chainCell(c) {
  if (c === 'ok') return <StatusPill tone="verified" glyph="✔" size="sm">Chain OK</StatusPill>;
  if (c === 'cannot-confirm') return <StatusPill tone="halt" glyph="▮▮" size="sm">Cannot confirm</StatusPill>;
  return <StatusPill tone="danger" glyph="✕" size="sm">Chain broken</StatusPill>;
}
function AuditView() {
  const columns = [
    { key: 't', header: 'Time', mono: true, render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{r.t}</span> },
    { key: 'who', header: 'Who', render: (r) => <PrincipalRef kind={r.kind} id={r.who} /> },
    { key: 'action', header: 'Action', render: (r) => <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{r.action}</code> },
    { key: 'target', header: 'Target', mono: true, render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{r.target}</span> },
    { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.outcome === 'refused' ? 'var(--danger-text)' : 'var(--text-secondary)' }}>{r.outcome}</span> },
    { key: 'tier', header: 'Provenance', render: (r) => <TierBadge tier={r.tier} /> },
    { key: 'chain', header: 'Verify', render: (r) => chainCell(r.chain) },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Audit &amp; provenance</h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>Append-only. Corrections are new rows. A stale or failed verify is never green — it's gold "cannot confirm" or red "chain broken".</p>
      </div>
      <DataTable columns={columns} rows={AUDIT} rowKey="t" reflow={false} />
    </div>
  );
}

/* ---------- App shell ---------- */
function App() {
  const [route, setRoute] = React.useState('principals');
  const [collapsed, setCollapsed] = React.useState(false);
  const [openP, setOpenP] = React.useState(null);
  const [idStop, setIdStop] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const goto = (r) => { setOpenP(null); setRoute(r); };
  const openDetail = (p) => { setOpenP(p); setRoute('principal'); };
  const revoked = (id) => { setOpenP(null); setRoute('principals'); setToast(`Revoked ${id}`); setTimeout(() => setToast(null), 2600); };

  const items = [
    { group: 'Identity' },
    { key: 'principals', label: 'Principals', icon: '⬡', active: route === 'principals' || route === 'principal', onClick: () => goto('principals') },
    { key: 'control', label: 'Identity control', icon: '⛊', active: route === 'control', onClick: () => goto('control') },
    { group: 'Records' },
    { key: 'audit', label: 'Audit log', icon: '⛓', active: route === 'audit', onClick: () => goto('audit') },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="auth" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader
          appName="auth"
          identity="identity gateway · reference implementation"
          systemState={<><FreshnessStamp age="3s ago" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{PRINCIPALS.filter((p) => p.status === 'active').length} active principals</span></>}
        >
          <KillMirror engaged={false} href="#" />
        </AppHeader>
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {route === 'principals' ? <Principals onOpen={openDetail} /> : null}
          {route === 'principal' && openP ? <PrincipalDetail p={openP} onBack={() => goto('principals')} onRevoked={revoked} /> : null}
          {route === 'control' ? <IdentityControl idStop={idStop} onIdStop={() => setIdStop(true)} /> : null}
          {route === 'audit' ? <AuditView /> : null}
        </main>
      </div>
      {toast ? (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: 'var(--surface-raised)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-control)', padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--danger-text)', boxShadow: 'var(--shadow-dialog)' }}>
          ⛒ {toast}
        </div>
      ) : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
