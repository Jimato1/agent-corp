/* Helm — CMDB · screens (13). Exposed as window.CMScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.CM_DATA;
  const P = window.CMParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, TierBadge, FreshnessStamp, Button, DangerAction, ConfirmFriction, ReviewChip, PrintedAbsence, Input } = H;
  const { CriticalityTier, Verdict, windowPill, BlastRadiusPreview, VerdictTrace, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>{crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}</div>{right}</div>;
  }
  const Reg = ({ title, sub, cols, rows, rowKey, right }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title={title} sub={sub} right={right} /><DataTable columns={cols} rows={rows} rowKey={rowKey} reflow={false} />
    </div>
  );

  /* 1 · Fleet */
  function Fleet({ ctx }) {
    const cols = [
      { key: 'host', header: 'host_id', render: (h) => <TicketRef id={h.host} /> },
      { key: 'tier', header: 'criticality', render: (h) => <CriticalityTier tier={h.tier} /> },
      { key: 'cls', header: 'class', render: (h) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{h.cls}</span> },
      { key: 'window', header: 'window-state', render: (h) => windowPill(h.window) },
      { key: 'mode', header: 'mode', render: (h) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{h.mode}</span> },
      { key: 'wazuh', header: 'Wazuh', render: (h) => <span style={{ ...mono, fontSize: 11, color: h.wazuhStale ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>{h.wazuhStale ? '▲ ' : '● '}{h.wazuh}</span> },
      { key: 'lifecycle', header: 'lifecycle', render: (h) => h.lifecycle === 'needs-tiering' ? <ReviewChip reason="needs_tiering" href="#" /> : h.lifecycle === 'stale' ? <StatusPill tone="attention" glyph="▲" size="sm">stale</StatusPill> : <StatusPill tone="verified" glyph="●" size="sm">active</StatusPill> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Fleet · 21 hosts" sub="The inventory truth-surface. criticality is the CriticalityTier chip (not a provenance TierBadge); a policy permit is never green." right={<FreshnessStamp age="as-of 8s" />} />
        <DataTable columns={cols} rows={D.FLEET} rowKey="host" onRowClick={() => ctx.goto('host')} />
      </div>
    );
  }

  /* 2 · Host detail / policy editor */
  function Host({ ctx }) {
    const h = D.HOST;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
        <button onClick={() => ctx.goto('fleet')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Fleet</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TicketRef id={h.host} /><CriticalityTier tier={h.tier} /><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{h.cls} · ● {h.lifecycle}</span>
          <span style={{ flex: 1 }} /><Button tone="secondary" size="compact" onClick={() => ctx.goto('dryrun')}>Dry-run this host →</Button>
        </div>
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 8 }}>Evaluated now · same code path as Gateway & MCP <FreshnessStamp age="as-of 0.2s" /></div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>window: <span style={{ color: 'var(--text-muted)' }}>{h.window}</span></div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>mode by action_class: {h.modes}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>reason if queried now: [ {h.reason} ] · policy_version {h.policyVersion} (= HEAD ✔)</div>
        </div>
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={eyebrow}>Facts · rebuildable mirror, NOT policy</div>
          {h.facts.map(([k, v, prov], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', width: 120 }}>{k}</span><span style={{ color: 'var(--text-secondary)' }}>{v}</span>
              {prov === 'untrusted' ? <TierBadge tier="untrusted" label="host-originated" /> : <TierBadge tier="verified" label="operator" />}
            </div>
          ))}
        </div>
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={eyebrow}>Policy · canonical YAML — editing any cell opens the ceremony</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>criticality tier: [tier0▾] · overrides (per action_class): [edit matrix]</div>
            <div>snapshot_capability: [btrfs▾] <span style={{ color: 'var(--state-amber-ink)' }}>⚠ moving away from 'none' is a GATE-WEAKENING edit</span></div>
            <div>maintenance windows: [WindowScheduleEditor] · on_window_close: [abort_and_rollback▾]</div>
          </div>
          <PrintedAbsence glyph="🔒" tag="policy veto, not trigger">
            <strong>This surface holds no lease, mutex, or approval record.</strong> CMDB is the policy VETO — it cannot approve, claim, or execute. Agents cannot write policy.
          </PrintedAbsence>
          <div><DangerAction label="Propose policy change…" glyph="⚠" variant="solid" title="Weaken policy · nas-01 · snapshot_capability none → btrfs"
            consequence={<><div style={{ marginBottom: 10 }}>This moves the system TOWARD MORE real-world action. 'btrfs' gives nas-01 in-band rollback, so snapshot-gated classes stop routing to ask/manual. Irreversible in effect until re-tightened.</div><BlastRadiusPreview cells={[{ host: 'nas-01', cls: 'package_update', before: 'manual', after: 'auto' }, { host: 'nas-01', cls: 'config_change', before: 'ask', after: 'auto' }]} diff={['snapshot_capability: none', 'snapshot_capability: btrfs']} diffHash="7c1e…a90" /></>}
            direction="more" irreversible
            honest={{ confirmed: 0, pending: 0, draining: 0 }}
            typedIntent="WEAKEN nas-01 snapshot" stepUp auditNote="Commit → push to remote → only then snapshot swap. Writes a hash-chained policy_change_log row." confirmLabel="Weaken policy" /></div>
        </div>
      </div>
    );
  }

  /* 4 · Tiers */
  function Tiers() {
    const cols = [
      { key: 'tier', header: 'Tier', render: (t) => <CriticalityTier tier={t.tier} /> },
      { key: 'defaults', header: 'action_class → mode', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{t.defaults.split('🔒').map((s, i) => i === 0 ? s : <span key={i}><span style={{ color: 'var(--text-muted)' }}>🔒{s}</span></span>)}</span> },
      { key: 'hcTimeout', header: 'health_check_timeout_s', align: 'right', render: (t) => <span style={mono}>{t.hcTimeout}</span> },
      { key: 'sshWait', header: 'ssh_wait_timeout_s', align: 'right', render: (t) => <span style={mono}>{t.sshWait}</span> },
    ];
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Tier catalog" sub="The destructive-never-auto floor cells are locked 🔒 floor — a printed impossibility, not a disabled toggle; a floor-shrink is rejected outright." />
      <DataTable columns={cols} rows={D.TIERS} rowKey="tier" reflow={false} />
    </div>;
  }

  /* 5 · Tasks */
  function Tasks() {
    const cols = [
      { key: 'key', header: 'type_key', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{t.key}</span> },
      { key: 'destructive', header: 'destructive', render: (t) => t.destructive ? '✔' : '—' },
      { key: 'reversible', header: 'reversible', render: (t) => t.reversible ? '✔' : '—' },
      { key: 'cls', header: 'action_class', render: (t) => <StatusPill tone="neutral" size="sm">{t.cls}</StatusPill> },
      { key: 'verifier', header: 'external_verifier', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{t.verifier}</span> },
      { key: 'vwin', header: 'verification_window_s', align: 'right', render: (t) => <span style={mono}>{t.vwin}</span> },
    ];
    return <Reg title="Task-type registry" sub="Board triage + auth PDP read this — a reclassification toward reversible/less-destructive is gate-weakening → ceremony." cols={cols} rows={D.TASKS} rowKey="key" />;
  }

  /* 6 · Catalog */
  function Catalog() {
    const cols = [
      { key: 'key', header: 'playbook', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{c.key}</span> },
      { key: 'cls', header: 'action_class', render: (c) => <StatusPill tone="neutral" size="sm">{c.cls}</StatusPill> },
      { key: 'risk', header: 'risk_class', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{c.risk}</span> },
      { key: 'tiers', header: 'applicable_tiers', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{c.tiers}</span> },
      { key: 'rollback', header: 'rollback_declared', render: (c) => c.rollback ? <span style={{ color: 'var(--state-green)' }}>✔ {c.method}</span> : <span style={{ color: 'var(--text-disabled)' }}>— {c.method}</span> },
      { key: 'sandbox', header: 'sandbox_eligible', render: (c) => c.sandbox ? '✔' : '—' },
    ];
    return <Reg title="Runbook-catalog policy attributes" sub="Policy attributes only (implementations are the Gateway's). A cell can go auto only while rollback_declared: true — so a rollback flip is gate-relevant → ceremony." cols={cols} rows={D.CATALOG} rowKey="key" />;
  }

  /* 7 · Sandbox + kill knob */
  function Sandbox() {
    const [enabled, setEnabled] = React.useState(true);
    const cols = [
      { key: 'host', header: 'host_id', render: (s) => <TicketRef id={s.host} /> },
      { key: 'cls', header: 'class', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>⚙ {s.cls}</span> },
      { key: 'creds', header: 'Vault creds', render: () => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>🔒 none (by construction)</span> },
      { key: 'verdict', header: 'verdict {sandbox_exec}', render: (s) => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Verdict v="permit" /><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>sandbox_carve_out</span></span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Sandbox pool · disposable class" sub="Orthogonal to tier. A policy permit is neutral, NOT green." right={<StatusPill tone={enabled ? 'verified' : 'neutral'} glyph={enabled ? '●' : '◼'} size="sm">knob: {enabled ? 'ENABLED' : 'DISABLED'}</StatusPill>} />
        <DataTable columns={cols} rows={D.SANDBOX} rowKey="host" reflow={false} />
        <div style={{ ...panel, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button tone={enabled ? 'secondary' : 'primary'} onClick={() => setEnabled((v) => !v)}>{enabled ? 'Disable sandbox pool' : 'Re-enable (→ ceremony)'}</Button>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>Disabling is an instant, ceremony-free tightening → every sandbox verdict becomes deny(sandbox_disabled).</span>
        </div>
        <PrintedAbsence glyph="⛊" tag="not a kill-switch">
          <strong>This is the policy-plane stop, not the suite kill.</strong> The global kill covers sandbox exec at the Gateway chokepoint — deep-links to MC for the global halt.
        </PrintedAbsence>
      </div>
    );
  }

  /* 8 · Discovery */
  function Discovery() {
    const cols = [
      { key: 'agent', header: 'agent_id', render: (d) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{d.agent}</span> },
      { key: 'name', header: 'reported name', render: (d) => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ ...mono, fontSize: 12 }}>"{d.name}"</span><TierBadge tier="untrusted" label="host-originated" /></span> },
      { key: 'os', header: 'os', render: (d) => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={mono}>{d.os}</span><TierBadge tier="untrusted" label="host-originated" /></span> },
      { key: 'group', header: 'group (advisory)', render: (d) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{d.group}</span> },
      { key: 'act', header: 'action', render: () => <div style={{ display: 'flex', gap: 6 }}><DangerAction label="bind…" glyph="⚠" variant="outline" size="compact" title="Bind agent" consequence="Bind is gate-weakening — a new host lands at 'unpolicied' and fires needs_tiering → Board." direction="more" typedIntent="BIND" stepUp confirmLabel="Bind" /></div> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Wazuh sync · discovery" sub="Reported names/groups are ATTACKER-INFLUENCEABLE at enrollment. Group membership is a UI-only tiering suggestion, never auto-applied." right={<FreshnessStamp age="last poll ⟳4m" />} />
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>account: agent:read syscollector:read group:read · v4.14.2 ✔ · ● OK</div>
        <DataTable columns={cols} rows={D.DISCOVERY} rowKey="agent" reflow={false} />
      </div>
    );
  }

  /* 9 · Dry-run / VerdictTrace */
  function DryRun() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
        <Head title="Explain a verdict" sub="The console half of the binding decision — the operator runs the same evaluate() at an arbitrary time, subject-free, and sees why. A deny is a valid answer, not an error." />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Input label="host_id" mono defaultValue="nas-01" style={{ width: 140 }} />
          <Input label="action_class" defaultValue="kernel_update" style={{ width: 160 }} />
          <Input label="at" defaultValue="2026-07-05 23:30 Oslo" style={{ width: 200 }} />
          <Button tone="primary">Explain</Button>
        </div>
        <VerdictTrace result="deny" />
      </div>
    );
  }

  /* 10 · Break-glass */
  function BreakGlass() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #5A2420', borderRadius: 'var(--radius-panel)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, color: 'var(--danger-red)' }}>⚠</span>
          <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--danger-text)' }}>Break-glass — emergency maintenance window</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--danger-text)', opacity: 0.85 }}>Mints ONLY a one-shot bounded window (hard cap ≤4h, auto-expiring). NEVER touches the destructive-never-auto floor.</div></div>
        </div>
        <PrintedAbsence glyph="🔒" tag="never touched"><strong>The destructive-never-auto floor is never touched by break-glass.</strong></PrintedAbsence>
        <div style={{ ...panel, padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>db-02 · emergency allow window 90m · overrides an active freeze</span>
          <span style={{ flex: 1 }} />
          <DangerAction label="Break glass" glyph="⚠" variant="solid" title="Break-glass · db-02 · emergency allow window 90m"
            consequence={<>This OVERRIDES an active freeze (allow &lt; freeze &lt; break-glass lattice). db-02 becomes cleanly-in-window 90m; 3 classes clear.</>}
            direction="more" irreversible typedIntent="OVERRIDE FREEZE db-02" stepUp auditNote="On arm: auto-files break_glass_posthoc review → Board; distinct chain row." confirmLabel="Break glass" />
        </div>
      </div>
    );
  }

  /* 11 · History */
  function History() {
    const cols = [
      { key: 'ts', header: 'ts', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
      { key: 'who', header: 'who', render: (r) => <PrincipalRef kind="operator" id={r.who} /> },
      { key: 'edit', header: 'edit_kind', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.edit}</code> },
      { key: 'target', header: 'target', render: (r) => <TicketRef id={r.target} /> },
      { key: 'weakening', header: 'weakening', render: (r) => r.weakening ? <StatusPill tone="danger" glyph="⚠" size="sm">YES</StatusPill> : <StatusPill tone="neutral" size="sm">tighten</StatusPill> },
      { key: 'hash', header: 'diff_hash', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.hash}</span> },
      { key: 'commit', header: 'git_commit', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.commit}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Policy-change history" sub="Hash-chained policy_change_log. This console can lie; the git remote cannot." right={<Button tone="secondary" size="compact">chain-verify</Button>} />
        <div style={{ ...panel, padding: 12, borderColor: '#5A4A1E', background: 'var(--state-amber-wash)', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--state-amber-ink)' }}>
          ⚠ VERIFY OUT-OF-BAND: confirm the chain by reading <code style={{ ...mono }}>git log</code> on the configured REMOTE, not here. Remote: git@…/cmdb_policy.git · local HEAD present on remote ✔
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>chain-verify: <StatusPill tone="verified" glyph="✔" size="sm">CHAIN INTACT (local)</StatusPill></div>
        <DataTable columns={cols} rows={D.HISTORY} rowKey="ts" reflow={false} />
      </div>
    );
  }

  /* 12 · Decisions */
  function Decisions() {
    const cols = [
      { key: 'at', header: 'evaluated_at', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.at}</span> },
      { key: 'aud', header: 'aud', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.aud}</span> },
      { key: 'host', header: 'host_id', render: (r) => <TicketRef id={r.host} /> },
      { key: 'cls', header: 'action_class', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.cls}</span> },
      { key: 'verdict', header: 'verdict', render: (r) => <Verdict v={r.verdict} /> },
      { key: 'jti', header: 'decision_id', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.jti}</span> },
      { key: 'basis', header: 'verdict_basis', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.basis}</span> },
    ];
    return <Reg title="Decision-log browser" sub="Canonical append-only decision_log — every issued verdict, binding + advisory. Outcome tokens are never green." cols={cols} rows={D.DECISIONS} rowKey="jti" />;
  }

  /* 13 · Escalations */
  function Escalations() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
        <Head title="Escalation outbox → Board" sub="A producer view (not the ReviewQueue). Degraded-but-honest is first-class: queued, not dropped — never a red error, never hidden." right={<FreshnessStamp age="as-of 6s" />} />
        {D.ESCALATIONS.map((e, i) => (
          <div key={i} style={{ ...panel, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ReviewChip state="escalated" reason={e.kind} href="#" /><TicketRef id={e.target} />
            {e.state === 'delivered' ? <StatusPill tone="verified" glyph="◈" size="sm">delivered</StatusPill> : <StatusPill tone="attention" glyph="◐" size="sm">queued (retry 2)</StatusPill>}
            <span style={{ flex: 1 }} /><span style={{ ...mono, fontSize: 11, color: e.state === 'delivered' ? 'var(--signal-cyan)' : 'var(--text-muted)' }}>→ {e.link}</span>
          </div>
        ))}
        <div style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>CMDB files; only MC/Board clear. Until svc:cmdb + Board intake exist, escalations sit queued locally — flagged loudly, never dropped.</div>
      </div>
    );
  }

  window.CMScreens = { Fleet, Host, Tiers, Tasks, Catalog, Sandbox, Discovery, DryRun, BreakGlass, History, Decisions, Escalations };
})();
