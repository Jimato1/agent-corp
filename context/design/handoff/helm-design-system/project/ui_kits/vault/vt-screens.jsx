/* Helm — Vault · screens (6). Exposed as window.VTScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.VT_DATA;
  const P = window.VTParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, TierBadge, FreshnessStamp, HonestState, Button, DangerAction, ConfirmFriction, PrintedAbsence } = H;
  const { SecretWriteForm, SignRoleStager, SealChainPanel, eyebrow, mono, panel } = P;

  function Head({ title, sub, right }) {
    return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div><h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}</div>{right}</div>;
  }

  /* 1 · Secrets Manager */
  function Secrets() {
    const [form, setForm] = React.useState(false);
    const [sel, setSel] = React.useState(D.SECRETS[0]);
    const cols = [
      { key: 'handle', header: 'Handle', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{s.handle}</span> },
      { key: 'host', header: 'Host', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{s.host}</span> },
      { key: 'kind', header: 'Kind', render: (s) => <StatusPill tone="neutral" size="sm">{s.kind}</StatusPill> },
      { key: 'rotation', header: 'Rotation', render: (s) => <span style={{ ...mono, fontSize: 12, color: s.due ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{s.rotation} {s.due}</span> },
      { key: 'lastWrite', header: 'Last write', align: 'right', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{s.lastWrite}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Secrets manager" sub="This surface can create and rotate secrets; it cannot read one back." right={<div style={{ display: 'flex', gap: 8 }}><Button tone="primary" onClick={() => setForm(true)}>+ New KV secret</Button><Button tone="secondary">Import</Button></div>} />
        <PrintedAbsence glyph="⛊" tag="write-only by construction">
          <strong>There is no reveal, export, or show-plaintext path here.</strong> Break-glass read is an offline 3-of-5 quorum ceremony, never a web action.
        </PrintedAbsence>
        {form ? <SecretWriteForm onClose={() => setForm(false)} /> : null}
        <DataTable columns={cols} rows={D.SECRETS} rowKey="handle" focusedKey={sel.handle} onRowClick={setSel} />
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={eyebrow}>Detail · {sel.host}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>host_id {sel.host} · requires_approval_class: {sel.approvalClass}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Versions (metadata): {sel.versions.length ? sel.versions.join(' · ') : '— (SSH-CA, no KV value)'} <span style={{ color: 'var(--text-disabled)' }}>[ no value shown, ever ]</span></div>
          {sel.kind === 'kv' ? <div><DangerAction label="Rotate now" glyph="⚠" variant="solid" size="compact" title={`Rotate ${sel.handle}`} consequence="Moves versions; irreversible for the prior value. Not complete until the new version is durably off-box." direction="more" irreversible typedIntent="ROTATE" stepUp auditNote="Shows the off-box snapshot ack; writes a tamper-evident row." confirmLabel="Rotate" /></div> : null}
        </div>
      </div>
    );
  }

  /* 2 · Host Onboarding */
  function Hosts() {
    const cols = [
      { key: 'host', header: 'Host', render: (h) => <TicketRef id={h.host} /> },
      { key: 'role', header: 'SSH sign-role', render: (h) => h.role ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{h.role} {h.roleOk ? '✔' : '⧗'}</span> : <span style={{ color: 'var(--text-disabled)' }}>— (none)</span> },
      { key: 'principals', header: 'Principals', render: (h) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{h.principals}</span> },
      { key: 'caKeys', header: 'CA-keys', render: (h) => <span style={{ ...mono, fontSize: 11, color: h.caKeys.includes('▲') ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{h.caKeys}</span> },
      { key: 'state', header: 'State', render: (h) => h.state === 'ready' ? <StatusPill tone="verified" glyph="●" size="sm">READY</StatusPill> : h.state === 'staged' ? <StatusPill tone="attention" glyph="◐" size="sm">STAGED</StatusPill> : <StatusPill tone="neutral" glyph="◼" size="sm">NEW</StatusPill> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Host onboarding" sub="SSH sign-role stager. A wildcard / root / allow_empty role is prevented from staging by a continuous invariant check." right={<Button tone="primary">+ Register host</Button>} />
        <DataTable columns={cols} rows={D.HOSTS} rowKey="host" />
        <SignRoleStager host="sw-core" onApply={<DangerAction label="Apply (operator step-up)" glyph="⚠" variant="solid" size="compact" title="Apply sign-role gateway-sw-core" consequence="This is the gate-defining act. You confirm the exact sha256 diff shown." direction="more" typedIntent="APPLY-ROLE" stepUp auditNote="Diff-hash-bound; writes a tamper-evident row." confirmLabel="Apply" />} />
        <div style={{ ...panel, padding: 14, ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ ...eyebrow, marginBottom: 6 }}>TrustedUserCAKeys snippet (copy)</div>
          @cert-authority *.fleet ssh-ed25519 AAAA…CApub · key_id correlates to &lt;ticket_id&gt;
          <div style={{ color: 'var(--state-amber-ink)', marginTop: 6 }}>Reminder: enforced/monitored NTP — clock skew silently extends cert validity.</div>
        </div>
      </div>
    );
  }

  /* 3 · Access Audit */
  function Audit() {
    const exfilCols = [
      { key: 'ts', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
      { key: 'sub', header: 'Sub', render: (r) => r.kind ? <PrincipalRef kind={r.kind} id={r.sub} /> : <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)' }}>{r.sub}</span> },
      { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)' }}>✕ {r.outcome}</span> },
      { key: 'ticket', header: 'Ticket', render: (r) => r.ticket ? <TicketRef id={r.ticket} href="#" /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    ];
    const cols = [
      { key: 'ts', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
      { key: 'sub', header: 'Who', render: (r) => <PrincipalRef kind={r.kind} id={r.sub} /> },
      { key: 'action', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.action}</code> },
      { key: 'target', header: 'Target', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.target}</span> },
      { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.ok ? 'var(--state-green)' : 'var(--danger-text)' }}>{r.ok ? '✔ ' : '✕ '}{r.outcome}</span> },
      { key: 'sinks', header: 'Sinks', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>{r.sinks}</span> },
      { key: 'prov', header: 'Prov', render: (r) => r.prov ? <TierBadge tier="corroborated" label={r.prov} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Access audit" sub="The redemption / denial ledger. svc:gateway is the only legitimate redeemer — any agent or 'no cert' redemption is anomalous by definition." />
        <div style={{ ...panel, padding: 14, borderColor: '#5A4A1E', background: 'var(--state-amber-wash)' }}>
          <div style={{ ...eyebrow, color: 'var(--state-amber-ink)', marginBottom: 8 }}>⚑ Exfiltration signal — agent-shaped denials (pinned) · 3 in last 24h</div>
          <DataTable columns={exfilCols} rows={D.EXFIL} rowKey="ts" reflow={false} />
        </div>
        <div style={{ ...panel, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>local HEAD seq 44,812 · WORM HEAD 44,812 ✔ matched 0.6s</span>
          <span style={{ flex: 1 }} /><StatusPill tone="verified" glyph="✔" size="sm">CHAIN VERIFIED</StatusPill>
        </div>
        <DataTable columns={cols} rows={D.LEDGER} rowKey="ts" reflow={false} />
      </div>
    );
  }

  /* 4 · Releases */
  function Releases() {
    const cols = [
      { key: 'id', header: 'Release', render: (r) => <TicketRef id={r.id} /> },
      { key: 'handle', header: 'Handle', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.handle}</span> },
      { key: 'ticket', header: 'Ticket', render: (r) => <TicketRef id={r.ticket} href="#" /> },
      { key: 'by', header: 'Requested by', render: (r) => <PrincipalRef kind="agent" id={r.by} /> },
      { key: 'status', header: 'Status', render: (r) => r.status === 'pending' ? <StatusPill tone="attention" glyph="◐" size="sm">pending</StatusPill> : r.status === 'redeemed' ? <StatusPill tone="verified" glyph="✔" size="sm">redeemed</StatusPill> : <StatusPill tone="danger" glyph="⛒" size="sm">revoked</StatusPill> },
      { key: 'expires', header: 'Expires', align: 'right', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.expires}</span> },
      { key: 'act', header: '', render: (r) => r.status === 'pending' ? <DangerAction label="Revoke" glyph="⚠" variant="outline" size="compact" intensity="light" title={`Revoke ${r.id}`} consequence="Revokes the PENDING release only. An SSH cert already signed for this ticket remains valid until its TTL / a KRL push — revoking here does not recall it." direction="less" honest={{ confirmed: 1, pending: 1, draining: 0 }} confirmLabel="Revoke" /> : null },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Releases" sub="The powerless release_id shadows agents stage. Revoke moves toward less action (light confirm), but never reads a false 'revoked everywhere'." />
        <DataTable columns={cols} rows={D.RELEASES} rowKey="id" />
      </div>
    );
  }

  /* 5 · Status / DR */
  function Status() {
    const [sealUnknown, setSealUnknown] = React.useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Status / DR — crown jewels" sub="The false-green discipline is the point of this screen: seal-unknown → gold, never a fabricated green." right={<Button tone="ghost" size="compact" onClick={() => setSealUnknown((v) => !v)}>{sealUnknown ? '↺ engine reachable (demo)' : '⚠ engine unreachable (demo)'}</Button>} />
        <SealChainPanel status={D.STATUS} sealUnknown={sealUnknown} />
        <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={eyebrow}>CA &amp; break-glass</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>Suite-internal CA fingerprint {D.STATUS.caFingerprint} · rotation runbook ▸</div>
          <PrintedAbsence glyph="⛊" tag="non-exportable"><strong>SSH CA signing key: inside barrier, non-exportable.</strong></PrintedAbsence>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>Per-host break-glass last-verified: {D.STATUS.breakGlass}</div>
        </div>
      </div>
    );
  }

  /* 6 · Change Control */
  function ChangeControl() {
    const [open, setOpen] = React.useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <Head title="Change control" sub="The single place any gate-weakening edit happens — TTL raises, principal widening, sink changes. Every edit is the full ceremony." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>pending edits: 1</span>} />
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={eyebrow}>Proposed edit — raise VAULT_SSH_CERT_TTL 10m → 30m</div>
          <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '10px 14px', ...mono, fontSize: 12 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Diff (hash sha256:c1a4…)</div>
            <div style={{ color: 'var(--danger-text)' }}>- ssh_cert_ttl: 10m</div>
            <div style={{ color: 'var(--state-green-ink)' }}>+ ssh_cert_ttl: 30m <span style={{ color: 'var(--state-amber-ink)' }}>⚠ GATE-WEAKENING — widens the window a signed cert is valid</span></div>
          </div>
          <div style={{ background: 'var(--danger-bg)', border: '1px solid #5A2420', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '19px', color: 'var(--danger-text)' }}>
            ⚠ Consequence — moves the system TOWARD MORE real-world action: any cert signed after apply is valid 3× longer; a compromised cert's blast-window triples. Irreversible for certs already signed under the new TTL.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <DangerAction label="Apply edit" glyph="⚠" variant="solid" title="Apply — raise SSH cert TTL" consequence="Confirm the exact diff shown. A changed diff invalidates this token." direction="more" irreversible typedIntent="raise-ssh-ttl" stepUp auditNote="Diff-hash-bound; writes a tamper-evident audit row." confirmLabel="Apply edit" />
          </div>
        </div>
      </div>
    );
  }

  window.VTScreens = { Secrets, Hosts, Audit, Releases, Status, ChangeControl };
})();
