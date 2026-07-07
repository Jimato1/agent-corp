// screens/audit.jsx — Access Audit (UI_SPEC §6). The append-only redemption / denial ledger — the
// truth of who redeemed what, when, and every denial. There is NO AuditInspector Helm component: this
// screen COMPOSES it from DataTable + PrincipalRef / TicketRef / TierBadge / FreshnessStamp (§6, §11).
//   • Exfiltration-signal pin (agent-shaped denials) at the top — machine reason verbatim, a first-
//     class escalation (§6.2). svc:gateway is the ONLY legitimate redeemer; any agent:* / "no cert"
//     redemption is anomalous by definition.
//   • Chain status: local HEAD vs off-box WORM HEAD, shown continuously.
//   • Chain-verify obeys the false-green prohibition (§4.9): ✔ VERIFIED only on a fresh success;
//     ⚠ CANNOT CONFIRM in halt-gold when stale / WORM unfetchable; ✕ CHAIN BROKEN in red ONLY for a
//     real detected break. A stale verify NEVER renders green.
// Read-only always — no row is editable; corrections are new rows; there is no acknowledge that mutates.
import { H, panel, mono, eyebrow, Head, PollStamp, TableSkeleton, ScreenError, usePoll, classifyError, fmtAge } from '../ui.jsx';
import { vault, newOpId } from '../api.js';
const { DataTable, TicketRef, PrincipalRef, StatusPill, TierBadge, Button, EmptyState } = H;

const asRows = (d, key) => (d && (d[key] || d.rows)) || (Array.isArray(d) ? d : []);

export function Audit({ shell }) {
  const [filters, setFilters] = React.useState({ host: '', ticket: '', sub: '', outcome: '' });
  const fetchLedger = React.useCallback(() => vault.audit(filters), [filters.host, filters.ticket, filters.sub, filters.outcome]);
  const ledger = usePoll(fetchLedger, { deps: [filters.host, filters.ticket, filters.sub, filters.outcome] });
  const exfil = usePoll(vault.exfil);
  const chain = usePoll(vault.chain);

  const [verify, setVerify] = React.useState({ status: 'idle', at: 0, detail: null });
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const rows = asRows(ledger.data, 'audit');
  const exfilRows = asRows(exfil.data, 'exfil');
  const chainData = chain.data || {};
  const chainDown = chain.error && classifyError(chain.error) === 'D';

  async function runVerify() {
    setVerify({ status: 'verifying', at: 0, detail: null });
    try {
      const r = await vault.verifyChain(newOpId());
      // Distinguish a genuine detected break (red) from an unconfirmable verify (gold).
      if (r.broken === true || r.status === 'broken') setVerify({ status: 'broken', at: Date.now(), detail: r });
      else if (r.verified === true || r.status === 'verified') setVerify({ status: 'verified', at: Date.now(), detail: r });
      else setVerify({ status: 'cannot', at: Date.now(), detail: r }); // unconfirmed → gold, never green
    } catch (e) {
      // A dependency-down verify (WORM unreachable) is CANNOT-CONFIRM gold, not a red failure.
      setVerify({ status: 'cannot', at: Date.now(), detail: { code: e.code || e.status } });
    }
  }

  // False-green rule: a successful verify is only green while fresh (< 30s); after that it lapses to
  // CANNOT CONFIRM (gold). WORM unfetchable also forces gold.
  const verifyFresh = verify.status === 'verified' && now - verify.at < 30000;
  let chainChip;
  if (verify.status === 'broken') chainChip = <StatusPill tone="danger" glyph="✕" size="sm">CHAIN BROKEN</StatusPill>;
  else if (verifyFresh) chainChip = <StatusPill tone="verified" glyph="✔" size="sm">CHAIN VERIFIED</StatusPill>;
  else if (verify.status === 'verifying') chainChip = <StatusPill tone="interactive" glyph="⧗" size="sm">verifying…</StatusPill>;
  else if (chainDown || verify.status === 'cannot') chainChip = <StatusPill tone="halt" glyph="⚠" size="sm">CANNOT CONFIRM CHAIN</StatusPill>;
  else chainChip = <StatusPill tone="neutral" glyph="○" size="sm">not yet verified</StatusPill>;

  const exfilCols = [
    { key: 'ts', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
    { key: 'sub', header: 'Sub', render: (r) => r.kind ? <PrincipalRef kind={r.kind} id={r.sub} status={r.kind === 'agent' ? 'active' : undefined} /> : <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)' }}>{r.sub}</span> },
    { key: 'outcome', header: 'Outcome (reason verbatim)', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)' }}>✕ {r.outcome}</span> },
    { key: 'ticket', header: 'Ticket', render: (r) => r.ticket ? <TicketRef id={r.ticket} href="#" /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    { key: 'esc', header: 'Escalation', render: (r) => <span style={{ ...mono, fontSize: 11, color: r.escalation_dispatched === false ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>{r.escalation_dispatched === false ? '▲ fell back to MC feed' : '✔ dispatched · ✔✔ both sinks'}</span> },
  ];
  const cols = [
    { key: 'ts', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
    { key: 'sub', header: 'Who', render: (r) => <PrincipalRef kind={r.kind || 'service'} id={r.sub} /> },
    { key: 'action', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.action}</code> },
    { key: 'target', header: 'Target / ticket', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.target}</span> },
    { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.ok ? 'var(--state-green)' : 'var(--danger-text)' }}>{r.ok ? '✔ ' : '✕ '}{r.outcome}</span> },
    { key: 'sinks', header: 'Sinks', render: (r) => <span style={{ ...mono, fontSize: 12, color: (r.sinks === '✔✔' || r.sinks_ok) ? 'var(--state-green)' : 'var(--halt-gold-ink)' }}>{r.sinks || (r.sinks_ok ? '✔✔' : '✔–')}</span> },
    { key: 'prov', header: 'Prov', render: (r) => r.prov ? <TierBadge tier="corroborated" label={r.prov} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
  ];

  const setF = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Access audit"
        sub="The redemption / denial ledger — append-only, dual-sink, hash-chained. svc:gateway is the only legitimate redeemer; any agent or 'no cert' redemption is anomalous by definition."
        right={<PollStamp ageMs={ledger.ageMs} />} />

      {/* filters — a malformed filter is Pattern R on the control only (§6.3) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <H.Input label="host" mono value={filters.host} onChange={setF('host')} style={{ width: 130 }} />
        <H.Input label="ticket" mono value={filters.ticket} onChange={setF('ticket')} style={{ width: 150 }} />
        <H.Input label="sub" mono value={filters.sub} onChange={setF('sub')} style={{ width: 150 }} />
        <H.Input label="outcome" value={filters.outcome} onChange={setF('outcome')} style={{ width: 150 }} />
        {ledger.error && classifyError(ledger.error) === 'R' ? <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)' }}>✕ malformed filter — {ledger.error.code || ledger.error.message}</span> : null}
      </div>

      {/* §6.2 exfiltration-signal pin */}
      <div style={{ ...panel, padding: 14, borderColor: '#5A4A1E', background: 'var(--state-amber-wash)' }}>
        <div style={{ ...eyebrow, color: 'var(--state-amber-ink)', marginBottom: 8 }}>⚑ Exfiltration signal — agent-shaped denials (pinned) · {exfilRows.length} shown</div>
        {exfil.loading && !exfilRows.length
          ? <TableSkeleton rows={2} />
          : exfilRows.length
            ? <DataTable columns={exfilCols} rows={exfilRows} rowKey="ts" reflow={false} />
            : <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>No agent-shaped denials in window — the exfiltration signal is quiet.</div>}
      </div>

      {/* chain status — local HEAD vs off-box WORM HEAD, shown continuously; verify never false-green */}
      <div style={{ ...panel, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderColor: (chainDown || verify.status === 'cannot') ? 'var(--halt-gold)' : verify.status === 'broken' ? 'var(--danger-red)' : 'var(--border-default)' }}>
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
          local HEAD seq {chainData.local_seq || chainData.local_head?.seq || '—'} · row_hash {chainData.local_hash || chainData.local_head?.row_hash || '—'}
          {' │ '}
          {chainDown
            ? <span style={{ color: 'var(--halt-gold-ink)' }}>WORM HEAD ⚠ CANNOT CONFIRM (sink unreachable)</span>
            : <>WORM HEAD {chainData.worm_seq || chainData.worm_head?.seq || '—'} {chainData.matched ? '✔' : '⚠'} matched {chainData.match_age || fmtAge(chain.ageMs)}</>}
        </span>
        <span style={{ flex: 1 }} />
        {chainChip}
        {verify.status === 'broken' && verify.detail ? <span style={{ ...mono, fontSize: 11, color: 'var(--danger-text)' }}>divergence at seq {verify.detail.seq || '?'} · {verify.detail.hash || ''} · escalation dispatched</span> : null}
        <Button tone="secondary" size="compact" disabled={verify.status === 'verifying'} onClick={runVerify}>Verify chain</Button>
      </div>

      {/* full ledger */}
      {ledger.loading && !rows.length
        ? <TableSkeleton rows={8} />
        : ledger.error && classifyError(ledger.error) === 'D' && !rows.length
          ? <ScreenError error={ledger.error} title="Off-box audit sink unreachable — redemption halting fail-closed (D-16a)"
              stillTrue={['local chain intact; denials still recorded locally', 'chain HEAD CANNOT CONFIRM against WORM until the sink returns']} onRetry={ledger.reload} />
          : rows.length
            ? <DataTable columns={cols} rows={rows.map((r, i) => ({ ...r, _k: r.id || `${r.ts}-${i}` }))} rowKey="_k" reflow={false} />
            : <EmptyState glyph="▤" title="No redemptions yet"
                action={<span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Every Gateway redemption and every denial will appear here, dual-sink and hash-chained.</span>} />}

      {shell.killed ? <div style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)' }}>⛊ Kill {shell.killLevel} engaged — the ledger is read-only regardless; denials-under-kill (403 revoked) appear inline above.</div> : null}
    </div>
  );
}
