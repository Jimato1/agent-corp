// components/SoDChainStrip.tsx — UI_SPEC §8.1 (app-specific, genuinely
// domain-unique). The four-check (+Check-0 caller) segregation-of-duties
// evidence render: CALLER → BOARD(approval) → CMDB(policy) → VAULT(credential)
// → MUTEX. It is the visual PROOF that "no single component reaches a
// destructive action." No other app HAS a four-holder execution chain to
// reconstruct, so this cannot be a shared component.
//
// It COMPOSES shared components and re-draws none of them: each check's verdict
// is a StatusPill (§4.5 family) and each evidence artifact is a TicketRef
// variant. Only the four-slot chain layout + the §4.7 destructive-absence
// caption are new. Collapsible to four ticks (S1) or full rows (S2).

import { PrintedAbsence, StatusPill, TicketRef } from './ds';
import type { PillTone } from './ds';
import { eyebrow, mono } from './gwparts';
import type { SoDCheck, SoDTick } from '../lib/types';

/* ── Collapsed: the four-tick strip (S1 card). approval · policy · cred · mutex.
   A rejected tick is a red ✕; a not-reached tick is greyed. */
const TICK_GLYPH: Record<SoDTick, { glyph: string; color: string }> = {
  ok: { glyph: '✔', color: 'var(--state-green)' },
  current: { glyph: '◍', color: 'var(--signal-cyan)' },
  pending: { glyph: '◐', color: 'var(--state-amber-ink)' },
  rejected: { glyph: '✕', color: 'var(--danger-red)' },
  not_reached: { glyph: '·', color: 'var(--text-disabled)' },
};

export function SoDTicks({ ticks }: { ticks: SoDTick[] }) {
  const four = [ticks[0] ?? 'not_reached', ticks[1] ?? 'not_reached', ticks[2] ?? 'not_reached', ticks[3] ?? 'not_reached'];
  const allBound = four.every((t) => t === 'ok');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>SoD</span>
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {four.map((t, i) => {
          const g = TICK_GLYPH[t] ?? TICK_GLYPH.not_reached;
          return <span key={i} style={{ color: g.color, fontFamily: 'var(--font-mono)', fontSize: 13 }} title={['approval', 'policy', 'cred', 'mutex'][i]}>{g.glyph}</span>;
        })}
      </span>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
        {allBound ? 'approval·policy·cred·mutex all bound' : 'approval·policy·cred·mutex'}
      </span>
    </div>
  );
}

/* ── Full: the reconstructed chain (S2). Each row = verdict StatusPill + summary
   + optional evidence TicketRef + secondary detail. */
function checkVerdict(status: SoDCheck['status']): { tone: PillTone; glyph: string; label: string } {
  switch (status) {
    case 'ok': return { tone: 'verified', glyph: '✔', label: 'ok' };
    case 'current': return { tone: 'interactive', glyph: '◍', label: 'current' };
    case 'rejected': return { tone: 'danger', glyph: '✕', label: 'rejected' };
    case 'cannot_confirm': return { tone: 'halt', glyph: '⚠', label: 'cannot confirm' };
    case 'not_reached':
    default: return { tone: 'neutral', glyph: '·', label: 'not reached' };
  }
}

function CheckRow({ check }: { check: SoDCheck }) {
  const v = checkVerdict(check.status);
  const notReached = check.status === 'not_reached';
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '9px 4px',
        borderTop: '1px solid var(--border-default)',
        opacity: notReached ? 0.5 : 1,
      }}
    >
      <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)', width: 58, flex: 'none' }}>
        {check.n} {check.name}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill tone={v.tone} glyph={v.glyph} size="sm">{v.label}</StatusPill>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: check.status === 'rejected' ? 'var(--danger-text)' : 'var(--text-secondary)' }}>{check.summary}</span>
          {check.evidence_id ? <TicketRef id={check.evidence_id} truncate /> : null}
          {check.reason ? <span style={{ ...mono, fontSize: 11, color: 'var(--danger-text)' }}>reason={check.reason}</span> : null}
        </div>
        {check.detail ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{check.detail}</div> : null}
      </div>
    </div>
  );
}

export function SoDChainStrip({ checks }: { checks: SoDCheck[] }) {
  const ordered = [...checks].sort((a, b) => a.n - b.n);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...eyebrow }}>Segregation-of-duties chain (reconstructed from the audit chain)</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ordered.map((c) => <CheckRow key={c.n} check={c} />)}
      </div>
      {/* §4.7 destructive-absence rule, printed VERBATIM as a constitutional fact —
          NOT a greyed toggle. No control on this page can skip, relax, or re-order
          a check; SoD is enforced in Gateway code, not here. */}
      <PrintedAbsence glyph="🔒" tag="by construction" why="This screen displays the evidence; no control on this page can skip, relax, or re-order a check.">
        <strong>SoD is enforced in Gateway code, not here.</strong> No single component — and never an agent — reaches a
        destructive action alone; four holders (Board · CMDB · Vault · Gateway) must independently agree.
      </PrintedAbsence>
    </div>
  );
}

export default SoDChainStrip;
