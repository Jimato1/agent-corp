/* Helm — Agent Runtime · the engine room (one screen), wired to LIVE /api/runtime/*.
 *
 * Adapted from the Helm reference kit (context/design/handoff/.../ui_kits/agent-runtime/
 * ar-app.jsx): SAME components, SAME panel order, SAME tokens — the mock data + posture
 * toggle are replaced by live fetches and the honest states derived from real values.
 *
 * The false-green rule (UI_SPEC §4.9) is enforced against REAL data: a model whose
 * provenance the runtime cannot confirm gets NO Verified badge (halt-gold CANNOT
 * CONFIRM); an unreachable TPM renders CANNOT CONFIRM KEY SEAL; a stale supervisor
 * beat flips the surface to safe-stopped. Commanded-kill (F) and outage-quiesce (G)
 * render differently and are never conflated. There is no kill trigger here.
 */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, PrincipalRef, DataTable, TierBadge, StatusPill,
          FreshnessStamp, HaltBand, HonestState, PrintedAbsence, Button } = H;
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };

  const API = '/api/runtime';
  async function getJSON(path) {
    const r = await fetch(API + path, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(path + ' -> ' + r.status);
    return r.json();
  }

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

  function Bar({ pct, warn }) {
    return <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-inset)', overflow: 'hidden', width: 220 }}>
      <div style={{ width: pct + '%', height: '100%', background: warn ? 'var(--state-amber)' : 'var(--text-secondary)' }} />
    </div>;
  }

  /* EngineHeadroom — PENDING-SIZING: when the read is not a measured value (no GPU
     source in sandbox), obey the false-green rule and show an honest estimate/unknown,
     never a fabricated healthy number. */
  function EngineHeadroom({ headroom }) {
    if (!headroom || headroom.measured === false) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
            decode-stream knee C ≈ {headroom ? headroom.knee_c_estimate : '—'} (estimate — PENDING-SIZING)
          </div>
          <FreshnessStamp age="source: supervisor · not measured" state="halt"
            reading="cannot confirm headroom — GPU sizing (gap-1.2) not yet run" />
        </div>
      );
    }
    const used = headroom.vram_used_gb, total = headroom.vram_total_gb;
    const pct = total ? Math.round((used / total) * 100) : 0;
    const warn = headroom.decode_streams != null && headroom.decode_streams >= (headroom.knee_c_estimate - 2);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', width: 60 }}>VRAM</span>
          <Bar pct={pct} warn={warn} />
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{used} / {total} GB</span>
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
          decode streams {headroom.decode_streams} / knee C≈{headroom.knee_c_estimate} · TPM sign queue depth {headroom.tpm_sign_queue_depth}
        </div>
        <FreshnessStamp age={"source: " + headroom.source} state="live" />
      </div>
    );
  }

  /* TPMSealStatus — hardware key-custody HEALTH only, never keys. Unconfirmable seal
     = halt-gold CANNOT CONFIRM, never green (UI_SPEC §4.2). */
  function TPMSealStatus({ custody }) {
    if (!custody || custody.can_confirm_seal === false) {
      const why = !custody ? 'status unavailable'
        : (custody.provider === 'none' ? 'no PKCS#11 provider' : '/dev/tpmrm0 unreadable / not TPM-attested');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>
            ⚠ CANNOT CONFIRM KEY SEAL — {why}; treat custody as UNVERIFIED
          </div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>
            provider {custody ? custody.provider : '—'} · sealed {custody ? custody.sealed_count : '—'} · soft {custody ? custody.soft_count : '—'} · <span style={{ color: 'var(--text-disabled)' }}>[ never shows keys ]</span>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill tone="verified" glyph="●" size="sm">/dev/tpmrm0 REACHABLE</StatusPill>
          <StatusPill tone={custody.pcr_seal_bound ? 'verified' : 'attn'} glyph="●" size="sm">PCR seal {custody.pcr_seal_bound ? 'BOUND' : 'UNBOUND'}</StatusPill>
          <StatusPill tone="verified" glyph="✔" size="sm">attest {custody.attest_result.toUpperCase()}</StatusPill>
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>
          agents sealed {custody.sealed_count} fixedTPM · {custody.soft_count} soft-key · <span style={{ color: 'var(--text-disabled)' }}>[ never shows keys ]</span>
        </div>
      </div>
    );
  }

  function ModelRow(m) { return m; }

  function App() {
    const [data, setData] = React.useState(null);
    const [err, setErr] = React.useState(null);

    React.useEffect(() => {
      let live = true;
      async function tick() {
        try {
          const [status, models, headroom, custody, drain] = await Promise.all([
            getJSON('/status'), getJSON('/models'), getJSON('/headroom'),
            getJSON('/keys/custody'), getJSON('/drain'),
          ]);
          if (live) { setData({ status, models: models.models, sigstore: models.sigstore_gate_armed, headroom, custody, drain }); setErr(null); }
        } catch (e) { if (live) setErr(e.message); }
      }
      tick();
      const iv = setInterval(tick, 5000);
      return () => { live = false; clearInterval(iv); };
    }, []);

    // Loading / dependency-down (Pattern D) — honest, never a fabricated green.
    if (!data) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', color: 'var(--halt-gold-ink)', fontFamily: 'var(--font-ui)' }}>
          {err ? ('⚠ CANNOT CONFIRM FRESHNESS — status source unreachable (' + err + '); treating as safe-stopped')
               : 'Loading engine-room status…'}
        </div>
      );
    }

    const drainState = data.drain.drain_state;                 // active|draining|drained|quiescing|quiesced
    const outage = data.drain.quiesced_by_outage === true;     // (G)
    const kill = !outage && drainState !== 'active';           // (F) commanded
    const posture = outage ? 'outage' : (kill ? 'kill' : 'nominal');

    const cols = [
      { key: 'role', header: 'logical role', render: (m) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{m.role}</span> },
      { key: 'model', header: 'model / digest', render: (m) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{m.model_id} {String(m.digest).slice(0, 6)}…</span> },
      { key: 'prov', header: 'provenance', render: (m) => m.provenance_verified
          ? <TierBadge tier="verified" label="VERIFIED" />
          : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>⚠ CANNOT CONFIRM</span> },
      { key: 'quant', header: 'quant', render: (m) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{m.quant}</span> },
      { key: 'state', header: 'loaded', render: (m) => m.online
          ? <StatusPill tone="verified" glyph="●" size="sm">ONLINE</StatusPill>
          : <StatusPill tone="halt" glyph="⛊" size="sm">NOT ADMITTED</StatusPill> },
    ];

    const items = [{ group: 'Engine room' }, { key: 'status', label: 'Status', icon: '◉', active: true, onClick: () => {} }];
    const sigstoreArmed = data.sigstore === true;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="agent-runtime" posture={kill ? 'kill' : 'nominal'} items={items} collapsed={false} onToggle={() => {}} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Agent Runtime" identity="the workforce (engine room)"
            systemState={kill ? <StatusPill tone="halt" glyph="▮▮" size="sm">G1 FREEZE</StatusPill>
                       : outage ? <StatusPill tone="halt" glyph="⛊" size="sm">SAFE-STOPPED</StatusPill>
                       : <StatusPill tone="neutral" glyph="●" size="sm">G0 NOMINAL</StatusPill>}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <PrincipalRef kind="operator" id="operator:ada" />
              <Button tone="secondary" size="compact">MC fleet ▸</Button>
              <KillMirror engaged={kill} href="#" />
            </span>
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
              {kill ? <div style={{ margin: '16px 0' }}>
                <HaltBand mode="kill" confirmed={0} pending={0} draining={1} readOnly reviewHref="#" reviewLabel="MC fleet"
                  message={"Commanded kill (epoch " + data.drain.epoch + "). drain_state → " + drainState + ". Drain compliance is client-side defense-in-depth; the hard stop is enforced at the Gateway chokepoint and auth revocation, not here."} />
              </div> : null}
              {outage ? <div style={{ margin: '16px 0' }}>
                <HaltBand mode="safe-stopped"
                  message="This is the safety system working, not an outage of the console. STILL TRUE: no new claims; sealed keys unusable off-host; existing kill epochs enforced. Drain posture: QUIESCED_BY_OUTAGE — inferred, not commanded."
                  stillTrue={["no new claims", "sealed keys unusable off-host", "existing kill epochs enforced"]} />
              </div> : null}

              <Panel title="Runtime instance"
                right={<FreshnessStamp age={"supervisor · reconciled=" + data.status.reconciled} state={data.status.reconciled ? 'live' : 'halt'}
                        reading={data.status.reconciled ? undefined : 'kill epoch not reconciled — pre-claim gate SHUT (fail-closed boot)'} />}>
                <div style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span>{data.status.runtime_instance_id}</span>
                  <span>roster {data.status.roster.length} agents</span>
                  <span>drain_state {posture === 'kill' ? <span style={{ color: 'var(--state-violet-ink)' }}>{drainState}</span>
                    : posture === 'outage' ? <span style={{ color: 'var(--state-violet-ink)' }}>QUIESCED_BY_OUTAGE</span>
                    : <span style={{ color: 'var(--state-green)' }}>● ACTIVE</span>}</span>
                  <span>kill epoch {data.status.kill_epoch}</span>
                </div>
                <PrintedAbsence glyph="🔒" tag="engine room only">
                  <strong>This runtime holds NO host credentials · cannot approve or execute work.</strong>
                </PrintedAbsence>
              </Panel>

              <Panel title="Model stack & provenance"
                right={<span style={{ ...mono, fontSize: 11, color: sigstoreArmed ? 'var(--text-muted)' : 'var(--halt-gold-ink)' }}>
                  Sigstore load-gate: {sigstoreArmed ? '⛊ ARMED · fail-closed' : '⚠ CANNOT CONFIRM — verifiers not wired (fail-closed)'}
                </span>}>
                <DataTable columns={cols} rows={data.models} rowKey="role" reflow={false} />
              </Panel>

              <Panel title="Local-compute headroom"><EngineHeadroom headroom={data.headroom} /></Panel>
              <Panel title="Key-custody · TPM seal health"><TPMSealStatus custody={data.custody} /></Panel>

              <Panel title="Drain / kill compliance (client half)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)' }}>
                    commanded posture {kill ? 'stopping' : (outage ? 'outage-quiesce' : 'G0')} · drain_state {drainState}. MC owns actuation.
                  </div>
                  {kill ? <HonestState confirmed={0} pending={0} draining={1} drainingDetail={data.status.runtime_instance_id + ' — draining'} /> : null}
                  <PrintedAbsence glyph="⛊" tag="no trigger here">
                    <strong>No global kill actuator lives here.</strong> The hard stop is at the Gateway chokepoint + auth revocation; this surface is the client half.
                  </PrintedAbsence>
                </div>
              </Panel>
            </div>
          </main>
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
