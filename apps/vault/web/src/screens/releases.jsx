// screens/releases.jsx — Releases (UI_SPEC §7). The live table of powerless `rel-`+ULID shadows that
// agents stage after claiming a ticket; the Gateway redeems them under a CONSUMED approval. Operator
// Revoke = DangerAction, but because revoke moves the system TOWARD LESS action it uses the LIGHT
// ConfirmFriction (single confirm, calm) — carrying the mandatory honesty carve-out: revoking the
// PENDING release stops NEW redemption; an SSH cert already signed dies only by TTL / a KRL push. The
// live HonestState triad (confirmed · pending · draining) is echoed so the operator never reads a false
// "revoked everywhere" while a redemption is mid-flight. States: loaded · loading · empty · Pattern R
// (already terminal) · Pattern D gold (store/engine unreachable) · stop-engaged (revoke still allowed).
import { H, mono, Head, PollStamp, TableSkeleton, ScreenError, SafeStopBanner, degradedPosture, usePoll, classifyError } from '../ui.jsx';
import { vault, newOpId } from '../api.js';
const { DataTable, TicketRef, PrincipalRef, StatusPill, DangerAction, HonestState, Button, EmptyState, Input } = H;

const asRows = (d) => (d && (d.releases || d.rows)) || (Array.isArray(d) ? d : []);
const rid = (r) => r.release_id || r.id;

function StatusPillFor({ status }) {
  if (status === 'pending') return <StatusPill tone="attention" glyph="◐" size="sm">pending</StatusPill>;
  if (status === 'redeemed') return <StatusPill tone="verified" glyph="✔" size="sm">redeemed</StatusPill>;
  if (status === 'expired') return <StatusPill tone="neutral" glyph="⊘" size="sm">expired</StatusPill>;
  return <StatusPill tone="danger" glyph="⛒" size="sm">revoked</StatusPill>;
}

export function Releases({ shell }) {
  const [filters, setFilters] = React.useState({ host: '', ticket: '', status: '' });
  const fetcher = React.useCallback(() => vault.releases(filters), [filters.host, filters.ticket, filters.status]);
  const { data, error, loading, ageMs, reload } = usePoll(fetcher, { deps: [filters.host, filters.ticket, filters.status] });
  const [opErr, setOpErr] = React.useState(null);
  const [flash, setFlash] = React.useState('');
  const [aftermath, setAftermath] = React.useState(null); // live HonestState echo of the last revoke

  const rows = asRows(data);
  const degraded = degradedPosture(data);
  const storeDown = !!degraded;
  React.useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 4000); return () => clearTimeout(t); }, [flash]);

  async function revoke(r) {
    setOpErr(null);
    try {
      const res = await vault.revokeRelease(rid(r), newOpId());
      // Never assert "revoked everywhere": show the true triad from the fan-out result.
      setAftermath({ confirmed: res.confirmed ?? 1, pending: res.pending ?? 0, draining: res.draining ?? 0, detail: res.draining_detail || res.draining_of });
      setFlash(`Revoked ${rid(r)} (pending release only)`); reload();
    } catch (e) { setOpErr(e); }
  }

  const setF = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));
  const cols = [
    { key: 'id', header: 'Release', render: (r) => <TicketRef id={rid(r)} truncate /> },
    { key: 'handle', header: 'Handle', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.handle}</span> },
    { key: 'ticket', header: 'Ticket', render: (r) => <TicketRef id={r.ticket || r.ticket_id} href="#" /> },
    { key: 'by', header: 'Requested by', render: (r) => <PrincipalRef kind="agent" id={r.by || r.requested_by} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusPillFor status={r.status} /> },
    { key: 'expires', header: 'Expires', align: 'right', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.expires || r.expires_in || '—'}</span> },
    { key: 'act', header: '', render: (r) => r.status === 'pending'
        ? <DangerAction label="Revoke" glyph="⚠" variant="outline" size="compact" intensity="light"
            title={`Revoke ${rid(r)}`}
            consequence={`Revokes the PENDING release only. An SSH cert already signed for this ticket remains valid until its TTL / a KRL push — revoking here does not recall it.${shell.killed ? ` (Kill ${shell.killLevel} is engaged — new redemptions are already refused suite-wide; toward-less-action revoke is still allowed.)` : ''}`}
            direction="less" honest={{ confirmed: 1, pending: 1, draining: 0 }} confirmLabel="Revoke"
            onConfirm={() => revoke(r)} onEscapeToHalt={() => { window.location.hash = '#/status'; }} />
        : null },
  ];

  if (error && classifyError(error) === 'D' && !rows.length) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Releases" sub="The powerless release shadows agents stage." />
      <ScreenError error={error} title="Release store / engine unreachable — safe-stopped" onRetry={reload}
        stillTrue={['releases are powerless without a live redemption', 'existing certs age out by TTL']} />
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Releases"
        sub="Agents stage a powerless release_id here after claiming a ticket; the Gateway redeems it under a consumed approval. Revoke moves toward less action (light confirm) but never reads a false 'revoked everywhere'."
        right={<PollStamp ageMs={ageMs} />} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Input label="host" mono value={filters.host} onChange={setF('host')} style={{ width: 130 }} />
        <Input label="ticket" mono value={filters.ticket} onChange={setF('ticket')} style={{ width: 150 }} />
        <Input label="status" value={filters.status} onChange={setF('status')} placeholder="pending" style={{ width: 130 }} />
      </div>

      {storeDown ? <SafeStopBanner dependency={degraded.dependency}
        stillTrue={['releases are powerless without a live redemption', 'existing certs age out by TTL']} todo="revoke and refresh resume when the store returns" /> : null}
      {flash ? <div style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔ {flash}</div> : null}
      {opErr ? <ScreenError error={opErr} title={classifyError(opErr) === 'D' ? 'Revoke safe-stopped' : 'Nothing to revoke'}
        stillTrue={classifyError(opErr) === 'D' ? ['the release is powerless regardless'] : undefined} /> : null}

      {/* live aftermath of the last revoke — all three slots ALWAYS shown (never a false "all stopped") */}
      {aftermath ? <HonestState confirmed={aftermath.confirmed} pending={aftermath.pending} draining={aftermath.draining} drainingDetail={aftermath.detail} /> : null}

      {loading && !rows.length
        ? <TableSkeleton rows={5} />
        : rows.length
          ? <DataTable columns={cols} rows={rows.map((r) => ({ ...r, _k: rid(r) }))} rowKey="_k" />
          : <EmptyState glyph="⇥" title="No active releases"
              action={<span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Agents stage a powerless release_id here after claiming a ticket; the Gateway redeems it under a consumed approval.</span>} />}
    </div>
  );
}
