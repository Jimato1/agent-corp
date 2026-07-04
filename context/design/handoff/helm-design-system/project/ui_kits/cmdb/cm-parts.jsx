/* Helm — CMDB · app-specific components. Exposed as window.CMParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { StatusPill, TicketRef, TierBadge } = H;
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  /* CriticalityTier chip — host-criticality, deliberately NOT a TierBadge. */
  function CriticalityTier({ tier }) {
    if (!tier) return <span style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>— (no tier)</span>;
    if (tier === 'unpolicied') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 11, color: 'var(--state-amber-ink)', border: '1px solid #5A4A1E', borderRadius: 4, padding: '1px 6px' }}>✦ unpolicied</span>;
    const col = { tier0: 'var(--danger-text)', tier1: 'var(--state-amber-ink)', tier2: 'var(--text-secondary)', tier3: 'var(--text-muted)' }[tier];
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 11, color: col, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '1px 6px' }}>⬢ {tier}</span>;
  }

  /* verdict outcome token — permit is NEVER green (green = external verification). */
  function Verdict({ v }) {
    if (v === 'deny') return <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)', border: '1px solid #5A2420', borderRadius: 3, padding: '0 6px' }}>deny</span>;
    if (v === 'ask') return <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)', border: '1px solid #5A4A1E', borderRadius: 3, padding: '0 6px' }}>ask</span>;
    return <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', borderRadius: 3, padding: '0 6px' }}>permit</span>;
  }

  function windowPill(w) {
    if (w === 'FREEZE-ACTIVE') return <StatusPill tone="attention" glyph="❄" size="sm">FREEZE-ACTIVE</StatusPill>;
    if (w && w.startsWith('IN-WINDOW')) return <StatusPill tone="verified" glyph="●" size="sm">{w}</StatusPill>;
    if (w === 'CLOSED') return <StatusPill tone="neutral" glyph="◼" size="sm">CLOSED</StatusPill>;
    if (w && w.startsWith('deny')) return <span style={{ ...mono, fontSize: 11, color: 'var(--danger-text)' }}>◼ {w}</span>;
    return <span style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>{w}</span>;
  }

  /* BlastRadiusPreview — the derived-effect matrix that fills the ConfirmFriction slot. */
  function BlastRadiusPreview({ cells, diff, diffHash }) {
    return (
      <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ ...eyebrow, color: 'var(--danger-text)' }}>Blast radius</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>Makes <b style={{ color: 'var(--text-primary)' }}>{cells.length}</b> (host × action_class) cells auto-executable · 1 host gains window coverage · full-shadow warnings: none</div>
        <div style={{ ...mono, fontSize: 11 }}>
          {cells.map((c, i) => <div key={i} style={{ color: 'var(--text-secondary)' }}>{c.host} · {c.cls} · <span style={{ color: 'var(--text-muted)' }}>{c.before}</span> → <span style={{ color: 'var(--state-amber-ink)' }}>{c.after}</span></div>)}
        </div>
        <div style={{ ...mono, fontSize: 11, borderTop: '1px solid var(--border-strong)', paddingTop: 6 }}>
          <div style={{ color: 'var(--danger-text)' }}>- {diff[0]}</div>
          <div style={{ color: 'var(--state-green-ink)' }}>+ {diff[1]}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>diff_hash: {diffHash} (confirm binds here)</div>
        </div>
      </div>
    );
  }

  /* VerdictTrace — the arbitrary-`at` decision-path explainer. */
  function VerdictTrace({ result }) {
    return (
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={eyebrow}>Result</span><Verdict v={result} /><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>← outcome token, NOT green</span></div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', lineHeight: '20px' }}>
          <div style={{ color: 'var(--text-muted)' }}>decision path (preconditions → class fork → window → mode):</div>
          <div><span style={{ color: 'var(--state-green)' }}>✔</span> host resolved · <span style={{ color: 'var(--state-green)' }}>✔</span> snapshot healthy · policy_version 9f3a2c = HEAD</div>
          <div><span style={{ color: 'var(--state-green)' }}>✔</span> action_class ∈ enum(7) · <span style={{ color: 'var(--state-green)' }}>✔</span> clock healthy (offset 0.3s, NTP)</div>
          <div style={{ paddingLeft: 12 }}>▸ class fork: managed → window algebra</div>
          <div style={{ paddingLeft: 24 }}><span style={{ color: 'var(--state-green)' }}>✔</span> allow window w-sun-night covers T · <span style={{ color: 'var(--danger-red)' }}>✕</span> freeze f-quarter-end also covers T</div>
          <div style={{ paddingLeft: 24, color: 'var(--text-muted)' }}>→ deny-overrides: effective_close = start of freeze → NOT cleanly in-window</div>
          <div style={{ marginTop: 4 }}>reason[]: [ <span style={{ color: 'var(--danger-text)' }}>freeze_active(f-quarter-end)</span> ] <span style={{ color: 'var(--text-muted)' }}>(CMDB-authored enum codes, never host free-text)</span></div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', paddingTop: 8 }}>policy_version 9f3a2c · valid_until = evaluated_at + 60s · NOTE: dry-run is UNSIGNED/advisory (no aud, no JWS) — mechanically unusable at the Gateway.</div>
      </div>
    );
  }

  window.CMParts = { CriticalityTier, Verdict, windowPill, BlastRadiusPreview, VerdictTrace, eyebrow, mono, panel };
})();
