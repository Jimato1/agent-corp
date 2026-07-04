/* Helm — Vault · app-specific components. Exposed as window.VTParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { Input, Button, PrintedAbsence, FreshnessStamp, StatusPill } = H;
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  /* SecretWriteForm — the write-only KV surface; the value is never echoed back. */
  function SecretWriteForm({ onClose }) {
    return (
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={eyebrow}>New KV secret · write-only</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input label="host_id" mono placeholder="nas-01" style={{ width: 150 }} />
          <Input label="name" placeholder="admin-login" style={{ flex: 1, minWidth: 160 }} />
        </div>
        <Input label="Value (masked · never echoed after submit)" type="password" placeholder="••••••••••••" style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input label="Rotation" defaultValue="90d" style={{ width: 110 }} />
          <Input label="recovery" defaultValue="provider-console" style={{ width: 180 }} />
        </div>
        <PrintedAbsence glyph="🔒" tag="no read-back">
          <strong>This surface can write a secret; it can never read one back.</strong> There is no reveal, export, or show-plaintext path.
        </PrintedAbsence>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button tone="ghost" onClick={onClose}>Cancel</Button>
          <Button tone="primary" onClick={onClose}>Write secret</Button>
        </div>
      </div>
    );
  }

  /* SignRoleStager — stages a powerless proposed SSH sign-role; apply is a full ceremony. */
  function SignRoleStager({ host, onApply }) {
    return (
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={eyebrow}>Stage sign-role · {host}</div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>allowed_users: [ svc-deploy ] · default_user: (empty — pinned)</div>
          <div>valid_principals (templated): svc-deploy · no wildcards · allow_empty=false</div>
        </div>
        <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', ...mono, fontSize: 12 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Proposed role diff (hash sha256:9f2c…)</div>
          <div style={{ color: 'var(--state-green-ink)' }}>+ ssh/roles/gateway-{host} allowed_users=svc-deploy valid_principals…</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button tone="secondary" size="compact">Stage proposal</Button>
          {onApply}
        </div>
      </div>
    );
  }

  /* SealChainPanel — the crown-jewels register; every figure obeys the false-green rule. */
  function Tile({ title, children }) {
    return <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}><div style={eyebrow}>{title}</div>{children}</div>;
  }
  function SealChainPanel({ status, sealUnknown }) {
    const s = status;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        <Tile title="Engine seal">
          {sealUnknown
            ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>⚠ CANNOT CONFIRM SEAL — engine unreachable; treat as UNVERIFIED</div>
            : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>● {s.seal}</div>}
          <FreshnessStamp age={`engine · ${s.sealAge}`} state={sealUnknown ? 'halt' : 'live'} reading={sealUnknown ? 'seal unknown' : undefined} />
        </Tile>
        <Tile title="Unsealer"><div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-primary)' }}>● {s.unsealer}</div><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>seal-token TTL {s.sealTokenTtl} ✔</span></Tile>
        <Tile title="Recovery quorum"><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{s.quorum}</span><span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>last quorum-test {s.quorumTest}</span></Tile>
        <Tile title="Audit sinks">{sealUnknown ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--halt-gold-ink)' }}>⚠ one sink down — safe-stopped</span> : <><span style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔✔ {s.sinks}</span><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>engine-stream xcorr live</span></>}</Tile>
        <Tile title="Kill level (from auth)"><StatusPill tone="neutral" glyph="●" size="sm">{s.kill}</StatusPill><FreshnessStamp age="0.4s" /></Tile>
        <Tile title="Backups"><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{s.backup}</span><span style={{ ...mono, fontSize: 11, color: 'var(--state-green)' }}>VAULT_SNAPSHOT_DEST reachable ✔</span></Tile>
      </div>
    );
  }

  window.VTParts = { SecretWriteForm, SignRoleStager, SealChainPanel, eyebrow, mono, panel };
})();
