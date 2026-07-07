// common.jsx — shared style tokens + tiny render helpers reused across screens/parts.
// Every VISUAL entity of consequence is a Helm shared component (window.HelmDesignSystem_f4cb26);
// these are only layout glue + the taint→TierBadge mapping (display-of-truth, never authored here).
import { taintTier } from '../api.js';

export const H = window.HelmDesignSystem_f4cb26;

export const eyebrow = {
  fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600,
};
export const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
export const panel = {
  background: 'var(--bg-card)', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-panel)',
};

// Render a note's EFFECTIVE (or own) taint as the shared TierBadge. host_originated ⇒ striped ⚠
// UNTRUSTED; clean ⇒ single-source (amber ◑) — never green (green = external verifier only).
export function TaintBadge({ level }) {
  const { TierBadge } = H;
  const { tier, label } = taintTier(level);
  return <TierBadge tier={tier} label={label} />;
}

// A wikilink chip carrying the linked note's taint marker — taint travels WITH retrieved content.
export function WikiLink({ title, taint }) {
  const untrusted = taint === 'host_originated' || taint === 'untrusted';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'baseline' }}>
      <span style={{ color: 'var(--signal-cyan-press)', borderBottom: '1px solid currentColor', fontFamily: 'inherit' }}>[[{title}]]</span>
      {untrusted
        ? <span style={{ ...mono, fontSize: 10, color: 'var(--state-amber-ink)' }}>⚠</span>
        : <span style={{ ...mono, fontSize: 10, color: 'var(--state-amber-ink)' }}>◑</span>}
    </span>
  );
}

// Turn [[wikilinks]] inside a plain paragraph into WikiLink chips (read render only).
export function renderProse(text, viaMap) {
  const parts = String(text || '').split(/(\[\[[^\]]+\]\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[\[([^\]]+)\]\]$/);
    if (m) {
      const t = viaMap && viaMap[m[1]] ? viaMap[m[1]] : 'clean';
      return <WikiLink key={i} title={m[1]} taint={t} />;
    }
    return <span key={i}>{p}</span>;
  });
}

// A tolerant relative-time formatter for ISO timestamps (frontmatter `updated`/`created`).
export function ago(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
