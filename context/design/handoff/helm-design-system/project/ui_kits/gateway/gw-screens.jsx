/* Helm — Gateway · screens (7). Exposed as window.GWScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.GW_DATA;
  const P = window.GWParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, FenceState, TierBadge, HaltBand, HonestState, FreshnessStamp, Button, DangerAction, ReviewChip, PrintedAbsence } = H;
  const { statePill, SoDChainStrip, RunConsole, SandboxEvidenceView, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>{crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}</div>{right}</div>;
  }

  /* S1 · Live Execution Monitor */
  function Monitor({ ctx }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Live execution" sub="What is running on which host, right now, and is every run inside its four-check envelope. The Gateway starts nothing on its own." right={<FreshnessStamp age="fresh 480ms" />} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {D.RUNS.map((r, i) => (
            <div key={i} style={{ ...panel, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, cursor: r.id ? 'pointer' : 'default' }} onClick={() => r.id && ctx.openRun(r)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span style={{ ...mono, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{r.host}</span>{statePill(r.state, 'sm')}
              </div>
              {r.id ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><TicketRef id={r.id} /><TicketRef id={r.ticket} href="#" /></div> : null}
              {r.by ? <PrincipalRef kind="agent" id={r.by} /> : null}
              {r.cls ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>class: {r.cls}</span>{r.destructive ? <TierBadge tier="untrusted" label="destructive" /> : null}</div> : null}
              {r.fence ? <FenceState gen={r.fence.gen} lease={r.fence.lease} heartbeat={r.fence.hb} state={r.fence.state} /> : null}
              {r.sod ? <SoDChainStrip sod={r.sod} reject={r.reject} /> : null}
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.task}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* S2 · Run Detail + SoD Proof */
  function RunDetail({ run, ctx }) {
    const r = run;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <button onClick={() => ctx.goto('monitor')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Monitor</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TicketRef id={r.id} />{statePill(r.state, 'sm')}<span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>host {r.host}</span><FreshnessStamp age="0.4s" />
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <TicketRef id={r.ticket} href="#" /><PrincipalRef kind="agent" id={r.by} /><span>class {r.cls}{r.destructive ? ' ⚠' : ''}</span><span>op_id …</span>
        </div>
        <SoDChainStrip full sod={r.sod} reject={r.reject} />
        <RunConsole task="task 6/9" lines={['TASK [patch_debian: apt-get dist-upgrade] changed']} stale={ctx.posture === 'kill'} />
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>health-check: pending · rollback path: snapshot (available)</div>
      </div>
    );
  }

  /* S3 · Audit Trail */
  function Audit() {
    const cols = [
      { key: 'seq', header: 'Seq', align: 'right', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{r.seq}</span> },
      { key: 'at', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.at}</span> },
      { key: 'who', header: 'Who', render: (r) => <PrincipalRef kind={r.kind} id={r.who} /> },
      { key: 'verb', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.verb}</code> },
      { key: 'target', header: 'Target', render: (r) => <TicketRef id={r.target} /> },
      { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.ok ? 'var(--text-secondary)' : 'var(--danger-text)' }}>{r.outcome}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
        <Head title="Audit chain" sub="Append-only, hash-chained, Ed25519-signed per-command forensic log. Only a completed successful walk is green; a detected break is red; everything between is gold." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>chain_id gw-main · 41,802 records · ⟳1.2s</span>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ ...panel, padding: 14 }}><div style={{ ...eyebrow, marginBottom: 6 }}>Chain-verify</div><StatusPill tone="verified" glyph="✔" size="sm">VERIFIED seq 41500→41802 · 302 records · Ed25519 · 1.9s</StatusPill></div>
          <div style={{ ...panel, padding: 14 }}><div style={{ ...eyebrow, marginBottom: 6 }}>MC anchor status</div><StatusPill tone="verified" glyph="✔" size="sm">IN SYNC · HEAD 41800 · MC ack 41800</StatusPill></div>
        </div>
        <DataTable columns={cols} rows={D.AUDIT} rowKey="seq" reflow={false} />
      </div>
    );
  }

  /* S4 · Kill-switch Status */
  function KillStatus({ ctx }) {
    const K = D.KILL;
    const engaged = ctx.posture === 'kill';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <Head title="Kill-switch · L2 physical stop" sub="The Gateway IS the L2 physical stop and its confirmation is the sole legitimate L2-CONFIRMED source auth reads directly. The trigger is not here — it deep-links out." />
        {engaged ? <HaltBand mode="kill" confirmed={K.confirmed} pending={K.pending} draining={K.draining} pendingCountdown="0:00" drainingDetail={K.drainDetail} readOnly reviewHref="#" reviewLabel="Halt console (MC)" message="Gateway refuses all new dispatch + new Vault redemptions. In-flight runs cancel at next safe task boundary." /> : null}
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={eyebrow}>L2 confirmation · this Gateway — auth reads directly</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>epoch_seen {K.epoch} · level {engaged ? K.level : 'G0'} · in_flight {engaged ? K.inFlight : 0} · refuse {engaged ? K.refuseAt : '—'}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>signed halt-status <span style={{ color: 'var(--state-green)' }}>✔</span> · ⟳ own truth, not a mirror</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>auth L1 epoch (mirror) {K.epoch} <span style={{ color: 'var(--state-green)' }}>✔0.3s</span> · in sync</div>
        </div>
        <div style={{ ...panel, padding: 16 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Halted-run aftermath</div>
          <HonestState confirmed={engaged ? K.confirmed : 0} pending={engaged ? K.pending : 0} draining={engaged ? K.draining : 0} drainingDetail={engaged ? K.drainDetail : undefined} />
        </div>
        <PrintedAbsence glyph="⛊" tag="not here">
          <strong>No kill trigger lives here.</strong> The actuator deep-links to Mission Control / auth.
        </PrintedAbsence>
        <div style={{ display: 'flex', gap: 10 }}><Button tone="secondary" size="compact">Halt console (MC) →</Button><Button tone="secondary" size="compact">auth safe_stopped console →</Button></div>
      </div>
    );
  }

  /* S5 · Catalog Registry */
  function Catalog() {
    const cols = [
      { key: 'key', header: 'key', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{r.key}</span> },
      { key: 'ver', header: 'ver', render: (r) => <span style={{ ...mono, fontSize: 12, color: r.state === 'pending' ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{r.ver}{r.state === 'pending' ? '▲' : ''}</span> },
      { key: 'sha', header: 'content_sha256', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.sha}</span> },
      { key: 'cls', header: 'class', render: (r) => <StatusPill tone="neutral" size="sm">{r.cls}</StatusPill> },
      { key: 'rollback', header: 'rollback', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.rollback}</span> },
      { key: 'sig', header: 'sig', render: (r) => r.sig === 'pending' ? <StatusPill tone="attention" glyph="⧗" size="sm">PENDING</StatusPill> : <span style={{ color: 'var(--state-green)', ...mono, fontSize: 11 }}>✔ ed</span> },
      { key: 'act', header: '', render: (r) => r.state === 'pending' ? <DangerAction label="Review & apply" glyph="⚠" variant="solid" size="compact" title={`Promote ${r.key} ${r.ver}`} consequence={<>Applies the exact sha256 diff shown. Direction: MORE real-world action.</>} direction="more" irreversible blastRadius="12 hosts have patch_debian in an open allowlist" typedIntent="PROMOTE" stepUp auditNote="Diff-hash-bound; writes a tamper-evident audit row." confirmLabel="Promote" /> : null },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
        <Head title="Playbook catalog" sub="The one operator write path. Change control is diff-hash-bound, step-up gated, and writes a tamper-evident audit row." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>6 active · 1 pending change</span>} />
        <DataTable columns={cols} rows={D.CATALOG} rowKey={'key'} reflow={false} />
        <PrintedAbsence glyph="🔒" tag="operator-only">
          <strong>Agents cannot write the catalog by any path.</strong> This is an operator-only, step-up gate.
        </PrintedAbsence>
      </div>
    );
  }

  /* S6 · Sandbox Runs */
  function Sandbox() {
    const [sel, setSel] = React.useState(D.SANDBOX[0]);
    const cols = [
      { key: 'id', header: 'run', render: (r) => <TicketRef id={r.id} /> },
      { key: 'ticket', header: 'ticket', render: (r) => <TicketRef id={r.ticket} href="#" /> },
      { key: 'profile', header: 'profile', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.profile}</span> },
      { key: 'exit', header: 'exit', render: (r) => <span style={{ ...mono, fontSize: 12, color: r.exit === 0 ? 'var(--state-green)' : 'var(--danger-red)' }}>{r.exit === 0 ? '✔0' : '✕' + r.exit}</span> },
      { key: 'finished', header: 'finished', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.finished}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
        <Head title="Sandbox runs · tier-0" sub="Tier-0 sandbox evidence = external verification for the Library's admission gate. No host parameter exists anywhere here (the non-leak guarantee)." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>harness hv-4c1a…9d20</span>} />
        <DataTable columns={cols} rows={D.SANDBOX} rowKey="id" focusedKey={sel.id} onRowClick={setSel} reflow={false} />
        <SandboxEvidenceView run={sel} />
      </div>
    );
  }

  /* S7 · Orphan Reconciliation */
  function Orphans({ ctx }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <Head title="Orphan reconciliation" sub="After a Gateway crash mid-run the Board hold persists deliberately (the host may have been touched). The Gateway never auto-resumes a half-run." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>1 orphan · 0 auto-resolvable</span>} />
        {D.ORPHANS.map((o) => (
          <div key={o.id} style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <TicketRef id={o.id} /><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>host {o.host}</span><StatusPill tone="attention" glyph="⧗" size="sm">executing@crash</StatusPill>
            </div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}><TicketRef id={o.ticket} href="#" /><PrincipalRef kind="agent" id={o.by} /><span>crashed {o.crashed}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Board hold:</span><FenceState gen={o.hold} state="held" advisory /><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>NOT reaper-eligible (orphan)</span></div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>read-only probe: {o.probe}</div>
            <ReviewChip state="escalated" reason={o.reason} href="#" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <DangerAction label="Request fresh credential + probe" glyph="⚠" variant="solid" title={`Re-redeem ${o.id}`} consequence="Mints a fresh minimal-TTL release for a READ-ONLY probe. It moves toward touching a host again." direction="more" typedIntent="PROBE" stepUp confirmLabel="Request" />
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>never auto-resumes a half-run — truthful terminal</span>
            </div>
          </div>
        ))}
        <PrintedAbsence glyph="🔒" tag="by construction"><strong>The Gateway never auto-resumes a half-run.</strong></PrintedAbsence>
      </div>
    );
  }

  window.GWScreens = { Monitor, RunDetail, Audit, KillStatus, Catalog, Sandbox, Orphans };
})();
