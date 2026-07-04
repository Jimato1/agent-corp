/* Helm — Agent Runtime · the engine room (one screen). Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, PrincipalRef, DataTable, TierBadge, StatusPill, FreshnessStamp, HaltBand, HonestState, PrintedAbsence, Button } = H;
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };

  const MODELS = [
    { role: 'adversarial-reviewer', model: 'qwen 9c3f…', prov: 'verified', quant: 'Q6_K', state: 'online' },
    { role: 'scrum-master', model: 'llama a71b…', prov: 'verified', quant: 'Q5_K_M', state: 'online' },
    { role: 'hands-pool', model: 'mist 4d0e…', prov: 'verified', quant: 'Q4_K_M', state: 'online' },
    { role: 'embed (TEI, Library)', model: 'qwen3 77ac…', prov: 'verified', quant: 'FP16', state: 'online' },
  ];

  function Panel({ title, right, children }) {
    return (
      <div style={{ borderTop: '1px solid var(--border-default)', padding: '18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={eyebrow}>{title}</div>{right}
        </div>
        {children}
      </div>
    );
  }

  /* EngineHeadroom — VRAM / decode-stream / TPM-queue gauges. Neutral fill; attn near knee. */
  function Bar({ pct, warn }) {
    return <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-inset)', overflow: 'hidden', width: 220 }}>
      <div style={{ width: pct + '%', height: '100%', background: warn ? 'var(--state-amber)' : 'var(--text-secondary)' }} />
    </div>;
  }
  function EngineHeadroom({ stale }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', width: 60 }}>VRAM</span><Bar pct={80} /><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>38.6 / 48.0 GB</span>
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>decode streams 11 / knee C≈14 · TPM sign queue depth 2 (serialized)</div>
        <FreshnessStamp age="source: supervisor · as-of 3s" state={stale ? 'halt' : 'live'} reading={stale ? 'cannot confirm headroom' : undefined} />
      </div>
    );
  }

  /* TPMSealStatus — hardware key-custody health. Shows health only, never keys. */
  function TPMSealStatus({ unknown }) {
    if (unknown) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>⚠ CANNOT CONFIRM KEY SEAL — /dev/tpmrm0 unreadable (as-of 47s); treat custody as UNVERIFIED</div>
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill tone="verified" glyph="●" size="sm">/dev/tpmrm0 REACHABLE</StatusPill>
          <StatusPill tone="verified" glyph="●" size="sm">PCR seal BOUND</StatusPill>
          <StatusPill tone="verified" glyph="✔" size="sm">attest CERTIFIED</StatusPill>
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>agents sealed 15 fixedTPM · 3 soft-key · <span style={{ color: 'var(--text-disabled)' }}>[ never shows keys ]</span> · as-of 5s</div>
      </div>
    );
  }

  function App() {
    const [posture, setPosture] = React.useState('nominal'); // nominal | kill | outage
    const kill = posture === 'kill';
    const outage = posture === 'outage';

    const cols = [
      { key: 'role', header: 'logical role', render: (m) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{m.role}</span> },
      { key: 'model', header: 'model / digest', render: (m) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{m.model}</span> },
      { key: 'prov', header: 'provenance', render: (m) => <TierBadge tier="verified" label="VERIFIED" /> },
      { key: 'quant', header: 'quant', render: (m) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{m.quant}</span> },
      { key: 'state', header: 'loaded', render: (m) => <StatusPill tone="verified" glyph="●" size="sm">ONLINE</StatusPill> },
    ];

    const items = [{ group: 'Engine room' }, { key: 'status', label: 'Status', icon: '◉', active: true, onClick: () => {} }];

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="agent-runtime" posture={kill ? 'kill' : 'nominal'} items={items} collapsed={false} onToggle={() => {}} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Agent Runtime" identity="the workforce (engine room)"
            systemState={kill ? <StatusPill tone="halt" glyph="▮▮" size="sm">G1 FREEZE</StatusPill> : outage ? <StatusPill tone="halt" glyph="⛊" size="sm">SAFE-STOPPED</StatusPill> : <StatusPill tone="neutral" glyph="●" size="sm">G0 NOMINAL</StatusPill>}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><PrincipalRef kind="operator" id="operator:ada" /><Button tone="secondary" size="compact">MC fleet ▸</Button><KillMirror engaged={kill} href="#" /></span>
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
              {kill ? <div style={{ margin: '16px 0' }}><HaltBand mode="kill" confirmed={2} pending={0} draining={1} drainingDetail="rt-9f2a — 1 agent past last reversible instant" readOnly reviewHref="#" reviewLabel="MC fleet" message="Commanded kill. drain_state ● ACTIVE → ⇉ DRAINING → DRAINED. Drain compliance is client-side defense-in-depth; the hard stop is enforced at the Gateway chokepoint and auth revocation, not here." /></div> : null}
              {outage ? <div style={{ margin: '16px 0' }}><HaltBand mode="safe-stopped" message="This is the safety system working, not an outage of the console. STILL TRUE: no new claims; sealed keys unusable off-host; existing kill epochs enforced. Drain posture: QUIESCED_BY_OUTAGE — inferred, not commanded." stillTrue={["no new claims", "sealed keys unusable off-host", "existing kill epochs enforced"]} /></div> : null}

              <Panel title="Runtime instance" right={<FreshnessStamp age="supervisor · fresh 4.1s" state={outage ? 'halt' : 'live'} reading={outage ? 'cannot confirm freshness' : undefined} />}>
                <div style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span>rt-9f2a…</span><span>roster 18 agents</span>
                  <span>drain_state {kill ? <span style={{ color: 'var(--state-violet-ink)' }}>⇉ DRAINING</span> : outage ? <span style={{ color: 'var(--state-violet-ink)' }}>QUIESCED_BY_OUTAGE</span> : <span style={{ color: 'var(--state-green)' }}>● ACTIVE</span>}</span>
                </div>
                <PrintedAbsence glyph="🔒" tag="engine room only"><strong>This runtime holds NO host credentials · cannot approve or execute work.</strong></PrintedAbsence>
              </Panel>

              <Panel title="Model stack & provenance" right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>Sigstore load-gate: ⛊ ARMED · fail-closed · last verify ⟳ 6s</span>}>
                <DataTable columns={cols} rows={MODELS} rowKey="role" reflow={false} />
              </Panel>

              <Panel title="Local-compute headroom"><EngineHeadroom stale={outage} /></Panel>
              <Panel title="Key-custody · TPM seal health"><TPMSealStatus unknown={outage} /></Panel>

              <Panel title="Drain / kill compliance (client half)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)' }}>commanded posture {kill ? 'G1' : 'G0'} · {kill ? 'draining' : 'not draining'}. MC owns actuation.</div>
                  {kill ? <HonestState confirmed={2} pending={0} draining={1} drainingDetail="rt-9f2a — 1 agent finishing" /> : null}
                  <PrintedAbsence glyph="⛊" tag="no trigger here"><strong>No global kill actuator lives here.</strong> The hard stop is at the Gateway chokepoint + auth revocation; this surface is the client half.</PrintedAbsence>
                </div>
              </Panel>
            </div>
          </main>
        </div>
        <div style={{ position: 'fixed', bottom: 14, right: 14, zIndex: 2000, display: 'flex', gap: 6 }}>
          {['nominal', 'kill', 'outage'].map((p) => (
            <button key={p} onClick={() => setPosture(p)} style={{ height: 28, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-strong)', background: posture === p ? 'var(--surface-control)' : 'var(--surface-raised)', color: posture === p ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}>{p === 'nominal' ? 'G0' : p === 'kill' ? '▮▮ kill' : '⛊ outage'}</button>
          ))}
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
