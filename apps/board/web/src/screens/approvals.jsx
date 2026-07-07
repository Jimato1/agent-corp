// Approval Queue + Decision (UI_SPEC §6). Board owns the approval RECORD; MC owns the canonical review
// QUEUE — this is a Board-scoped FILTER of that anatomy, not a parallel design. The decision is written
// browser-direct to the Board under the operator's session. Approve = DangerAction + full ConfirmFriction
// (diff-hash-bound to plan_hash, step-up); four-eyes renders as a PRINTED CONSTITUTIONAL ABSENCE.
import { board, newOpId } from '../api.js';
import { H, statePill, taintBadge, ErrorNotice, mono, eyebrow, panel } from '../ui.jsx';
const { DataTable, TicketRef, PrincipalRef, StatusPill, FreshnessStamp, Button, DangerAction, PrintedAbsence } = H;

export function Approvals({ selectedId, onOpen, killed, bump }) {
  if (selectedId) return <ApprovalDecision id={selectedId} killed={killed} onBack={() => onOpen(null)} />;
  return <ApprovalQueue onOpen={onOpen} bump={bump} />;
}

function ApprovalQueue({ onOpen, bump }) {
  const [rows, setRows] = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    board.queue('awaiting_approval').then((r) => live && setRows(r.items)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [bump]);
  if (error) return <ErrorNotice error={error} />;
  if (!rows) return <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Loading…</div>;
  const cols = [
    { key: 'id', header: 'Ticket', render: (t) => <TicketRef id={t.ticket_id} /> },
    { key: 'gate', header: 'Gate', render: () => <StatusPill tone="attention" glyph="▲" size="sm">awaiting_approval</StatusPill> },
    { key: 'proposer', header: 'Proposer', render: (t) => <PrincipalRef kind="agent" id={t.proposer_id} /> },
    { key: 'taint', header: 'Provenance', render: (t) => taintBadge(t.taint_host_originated) },
    { key: 'host', header: 'Host', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{t.host_id || '—'}</span> },
    { key: 'link', header: '', render: () => <span style={{ ...mono, fontSize: 11, color: 'var(--signal-cyan)' }}>/review ↗</span> },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <div><span style={eyebrow}>Approval queue</span>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>A Board-scoped filter of Mission Control's canonical review queue. The grant is written browser-direct under your session (MC holds no standing approve credential).</div>
      </div>
      {rows.length ? <DataTable columns={cols} rows={rows} rowKey="ticket_id" onRowClick={(t) => onOpen(t.ticket_id)} />
        : <div style={{ ...panel, padding: 16, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>No plans awaiting your approval. Plans appear here when an agent proposes a destructive change.</div>}
    </div>
  );
}

function ApprovalDecision({ id, killed, onBack }) {
  const [t, setT] = React.useState(null);
  const [approval, setApproval] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [fourEyes, setFourEyes] = React.useState(false);
  const [done, setDone] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    board.ticket(id).then((x) => live && setT(x)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [id]);

  if (error) return <ErrorNotice error={error} />;
  if (!t) return <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Loading…</div>;

  const approve = async () => {
    try { const a = await board.approve(id, newOpId()); setApproval(a); setDone('approved'); }
    catch (e) { if (e.code === 'FOUR_EYES') setFourEyes(true); else setError(e); }
  };
  const reject = async () => { try { await board.reject(id, newOpId()); setDone('rejected'); } catch (e) { setError(e); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
      <button onClick={onBack} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to queue</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <TicketRef id={t.ticket_id} /><span style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Approve plan on {t.host_id}</span>{statePill(t.status)}
      </div>
      <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>action_class is <b style={{ color: 'var(--text-primary)' }}>derived from the allowlist playbooks</b> (worst across invocations) — never from the ticket type · lane: {t.lane}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>four-eyes: proposer <PrincipalRef kind="agent" id={t.proposer_id} /> · you (operator, from your session)</div>

      {t.taint_host_originated ? (
        <div style={{ background: 'var(--state-amber-wash)', border: '1px solid #7A5A1E', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--state-amber-ink)' }}>
          ⚠ <b>UNTRUSTED · host-originated</b> → auto-approve lane INELIGIBLE. The plan text is adversarial input; a human decides. Taint is server-owned — no control clears it here.
        </div>
      ) : null}

      <div style={{ ...panel, padding: 14 }}>
        <span style={eyebrow}>Plan slice — Notes rev pinned, plan_hash bound</span>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>note {t.plan_note_id || '—'} @ {t.plan_note_rev || '—'} · <a href="#" style={{ color: 'var(--text-link)' }}>open in Notes ↗</a> (rendered read-only)</div>
      </div>

      {done === 'approved' ? (
        <div style={{ ...panel, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}><StatusPill tone="verified" glyph="✔">Approval minted</StatusPill><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{approval?.approval_id} · action_class {approval?.action_class} · consumed_by pending</span></div>
      ) : done === 'rejected' ? (
        <div style={{ ...panel, padding: 16 }}><StatusPill tone="danger" glyph="✕">Plan rejected</StatusPill></div>
      ) : (
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {killed ? (
            <PrintedAbsence glyph="⛊" why="G1 FREEZE-DESTRUCTIVE — approval minting is suspended suite-wide; existing approvals are honored, no new grants. The Board hosts no kill actuator." tag="suspended by stop">
              <strong>Approval minting is suspended while the kill-switch is engaged.</strong>
            </PrintedAbsence>
          ) : fourEyes ? (
            <PrintedAbsence glyph="🔒" why="Four-eyes requires a different approver than the proposer/claimer. This cannot be done here by construction (enforced at the Board independent of the PDP)." tag="by construction">
              <strong>You proposed this plan — four-eyes requires a different approver.</strong>
            </PrintedAbsence>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1 }} />
            <Button tone="secondary" onClick={reject}>Reject plan</Button>
            {!killed && !fourEyes ? (
              <DangerAction label="Approve & mint record" glyph="⚠" variant="solid" title={`Approve ${t.ticket_id}`}
                consequence={<>This mints an approval that permits Gateway execution on <strong>{t.host_id}</strong>. It moves the system toward MORE real-world action.</>}
                direction="more" irreversible typedIntent={t.ticket_id} stepUp
                auditNote={`The confirm token is diff-hash-bound to the plan_hash. This writes a Board approval record.`}
                confirmLabel="Approve" onConfirm={approve} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
