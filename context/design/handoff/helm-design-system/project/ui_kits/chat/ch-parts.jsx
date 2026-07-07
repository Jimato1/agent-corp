/* Helm — Chat · app-specific components. Exposed as window.CHParts.
   KindBadge fuses notification kind + server-clamped priority band; gold is
   NEVER used (reserved for HaltBand) — escalations live in the attention family. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { ReviewChip, StatusPill } = H;
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  /* KindBadge — kind glyph + priority band P1–P5. Escalation = attention amber, never gold. */
  function KindBadge({ kind, prio }) {
    const map = {
      escalation: { tone: 'attention', glyph: '⚑', label: 'ESCALATION' },
      needs_review: { tone: 'attention', glyph: '◈', label: 'NEEDS_REVIEW' },
      done: { tone: 'verified', glyph: '✔', label: 'DONE' },
    };
    const m = map[kind] || map.done;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border-strong)', borderRadius: 3, padding: '0 4px' }}>P{prio}</span>
        <StatusPill tone={m.tone} glyph={m.glyph} size="sm">{m.label}</StatusPill>
      </span>
    );
  }

  window.CHParts = { KindBadge, eyebrow, mono, panel };
})();
