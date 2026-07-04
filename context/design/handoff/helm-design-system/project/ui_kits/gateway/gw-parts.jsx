/* Helm — Gateway · app-specific components. Exposed as window.GWParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { StatusPill, TicketRef, PrincipalRef, FenceState, TierBadge } = H;
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  const STATE = {
    executing: ['interactive', '⧗', 'EXECUTING'], verifying: ['attention', '✔', 'VERIFYING'], frozen: ['halt', '▮▮', 'FROZEN G1'],
    failed: ['danger', '✕', 'FAILED'], idle: ['neutral', '●', 'IDLE'], draining: ['draining', '⇉', 'DRAINING'],
  };
  function statePill(s, size) { const m = STATE[s] || STATE.idle; return <StatusPill tone={m[0]} glyph={m[1]} size={size}>{m[2]}</StatusPill>; }

  /* SoDChainStrip — four-check (+caller) segregation-of-duties evidence. Read-only. */
  const CHECKS = [
    { n: 0, name: 'CALLER', ev: 'token aud=gateway · cnf DPoP✔ · introspect · ep4471' },
    { n: 1, name: 'BOARD', ev: 'consume_approval [apr-…]→executing · plan_hash sha256:9f… ✔ · allowlist 3/3' },
    { n: 2, name: 'CMDB', ev: 'verdict permit [dec-…] · policy a1b2 · window ✔' },
    { n: 3, name: 'VAULT', ev: 'cred cred://hosts/host-db-01/root · lse-…⧗ · SSH-CA TTL 11m · plaintext: never here' },
    { n: 4, name: 'MUTEX', ev: '🔒 gen47 · pg advisory lock · fence>46 ✔' },
  ];
  function SoDChainStrip({ full, sod, reject, fence }) {
    const passCount = reject ? (sod ? sod.length : 0) : 5;
    return (
      <div style={{ ...panel, padding: full ? 14 : 0, background: full ? 'var(--surface-inset)' : 'transparent', border: full ? '1px solid var(--border-default)' : 0 }}>
        {full ? <div style={{ ...eyebrow, marginBottom: 8 }}>Segregation-of-duties chain · reconstructed from audit</div> : null}
        {!full ? (
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>SoD <span style={{ color: reject ? 'var(--danger-red)' : 'var(--state-green)' }}>{reject ? '✕' : '✔✔✔✔'}</span>{!reject ? <span style={{ color: 'var(--text-muted)' }}> appr·pol·cred·mtx</span> : <span style={{ color: 'var(--danger-text)' }}> {reject}</span>}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CHECKS.map((c) => {
              const failed = reject && c.n === passCount - 1;
              const notReached = reject && c.n >= passCount;
              return (
                <div key={c.n} style={{ display: 'flex', gap: 8, ...mono, fontSize: 12, color: notReached ? 'var(--text-disabled)' : 'var(--text-secondary)' }}>
                  <span style={{ color: notReached ? 'var(--text-disabled)' : failed ? 'var(--danger-red)' : 'var(--state-green)', width: 14 }}>{notReached ? '—' : failed ? '✕' : '✔'}</span>
                  <span style={{ color: 'var(--text-muted)', width: 70 }}>{c.n} {c.name}</span>
                  <span style={{ flex: 1 }}>{notReached ? 'not reached' : failed ? reject : c.ev}</span>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--border-strong)', marginTop: 4, paddingTop: 8, display: 'flex', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ fontVariantEmoji: 'text' }}>🔒</span> SoD is enforced in Gateway code, not here. This screen displays evidence; no control can skip, relax, or re-order a check.
            </div>
          </div>
        )}
      </div>
    );
  }

  /* RunConsole — streaming machine-output tail (mono terminal). */
  function RunConsole({ task, lines, stale }) {
    return (
      <div style={{ ...panel, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-raised)' }}>
          <span style={eyebrow}>Console</span><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{task} · ⟳ 0.4s</span>
          {stale ? <span style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)' }}>⚠ CANNOT CONFIRM live output — treating as safe-stopped</span> : null}
        </div>
        <div style={{ background: 'var(--surface-backdrop)', padding: 12, ...mono, fontSize: 12, lineHeight: '19px', color: stale ? 'var(--text-muted)' : 'var(--ink-secondary)', minHeight: 90 }}>
          {(lines || []).map((l, i) => <div key={i}>{l}</div>)}
          {!stale ? <div><span style={{ color: 'var(--signal-cyan)' }}>▏</span> (streaming — Last-Event-ID 00461)</div> : null}
        </div>
      </div>
    );
  }

  /* SandboxEvidenceView — tier-0 evidence: input UNTRUSTED vs evidence VERIFIED. */
  function SandboxEvidenceView({ run }) {
    return (
      <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TicketRef id={run.ticket} href="#" /><span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{run.profile}</span>
          <StatusPill tone={run.exit === 0 ? 'verified' : 'danger'} glyph={run.exit === 0 ? '✔' : '✕'} size="sm">exit {run.exit}</StatusPill>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>env: {run.env}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12 }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ color: 'var(--text-muted)' }}>input_ref</span><span style={mono}>{run.input}</span><TierBadge tier="untrusted" label="curation-ingested" /></span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ color: 'var(--text-muted)' }}>evidence</span><TierBadge tier="verified" label="sandbox-verified · gateway-delivered" /></span>
        </div>
        <div style={{ background: 'var(--surface-backdrop)', borderRadius: 6, padding: 10, ...mono, fontSize: 12, color: 'var(--ink-secondary)' }}>{run.transcript}</div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>target: fresh podman container · no suite networks · no creds</div>
      </div>
    );
  }

  window.GWParts = { statePill, SoDChainStrip, RunConsole, SandboxEvidenceView, eyebrow, mono, panel };
})();
