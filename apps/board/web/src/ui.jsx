// ui.jsx — the ONE Helm binding + shared render helpers (ports the Board reference kit bd-parts.jsx).
// Every shared entity is rendered through its canonical Helm component; nothing is redrawn.
export const H = window.HelmDesignSystem_f4cb26;
if (!H) throw new Error('window.HelmDesignSystem_f4cb26 missing — /helm/_ds_bundle.js must load first.');

const { StatusPill, TierBadge } = H;

export const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
export const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
export const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

const STATE_MAP = {
  todo: { tone: 'neutral', glyph: '○' },
  in_progress: { tone: 'interactive', glyph: '◐' },
  awaiting_approval: { tone: 'attention', glyph: '▲' },
  approved: { tone: 'verified', glyph: '✔' },
  executing: { tone: 'interactive', glyph: '▸' },
  verifying: { tone: 'attention', glyph: '⧗' },
  needs_review: { tone: 'attention', glyph: '◈' },
  done: { tone: 'verified', glyph: '✔' },
  failed: { tone: 'danger', glyph: '✕' },
  cancelled: { tone: 'neutral', glyph: '⊘' },
  blocked: { tone: 'attention', glyph: '⚠' },
};
export function statePill(state, size) {
  const m = STATE_MAP[state] || STATE_MAP.todo;
  return <StatusPill tone={m.tone} glyph={m.glyph} size={size}>{state}</StatusPill>;
}
export function taintBadge(taint) {
  // Board renders the server-decided fact; it never decides it (UI_SPEC §4.3).
  return <TierBadge tier={taint ? 'untrusted' : 'single'} />;
}
export function LaneBadge({ lane }) {
  if (!lane) return null;
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 6px', borderRadius: 999, ...mono, fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--border-strong)', background: 'var(--bg-control)' }}>lane:{lane}</span>;
}

// Map a server ticket -> the shape the reference cards expect.
export function toCard(t) {
  return {
    id: t.ticket_id, title: t.title, type: t.type, priority: `P${t.priority}`, state: t.status,
    claimedBy: t.claimed_by, epic: t.parent_id, lane: t.lane, taint: t.taint_host_originated,
    reviewReason: t.machine_reason,
    fence: t.fencing_token ? { gen: t.fencing_token, lease: t.lease_expires_at ? fmtLease(t.lease_expires_at) : undefined, state: 'active' } : null,
  };
}
function fmtLease(ms) {
  const s = Math.max(0, Math.round((ms - Date.now()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Pattern R (red — the operator's own recoverable error) vs Pattern D (halt-gold — a dependency down,
// safe-stopped). A Notes/CMDB/auth outage is GOLD, never red (UI_SPEC §5.4). classify by status/code.
export function classifyError(e) {
  const depCodes = new Set(['DEP_UNAVAILABLE', 'SIGNAL_UNAVAILABLE']);
  if (e && (depCodes.has(e.code) || e.status === 503)) return 'D';
  return 'R';
}
export function ErrorNotice({ error }) {
  const pattern = classifyError(error);
  const gold = pattern === 'D';
  return (
    <div style={{ ...panel, borderColor: gold ? 'var(--halt-gold, #F2842B)' : 'var(--danger-red, #E5594E)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
      <span aria-hidden="true" style={{ color: gold ? 'var(--halt-gold, #F2842B)' : 'var(--danger-red, #E5594E)' }}>{gold ? '⛊' : '✕'}</span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>
        {gold ? 'Dependency unavailable — this fails closed (safe-stopped). ' : ''}{error.message || String(error)}{error.code ? ` (${error.code})` : ''}
      </span>
    </div>
  );
}

export function Freshness({ ageMs }) {
  const s = Math.round((ageMs || 0) / 1000);
  return <span style={{ ...mono, fontSize: 10, color: s > 10 ? 'var(--halt-gold, #F2842B)' : 'var(--text-muted)' }}>⟳ {s}s</span>;
}
