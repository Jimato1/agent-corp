/* Helm — Library · app-specific components. Exposed as window.LBParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { TierBadge, StatusPill, PrincipalRef, Input } = H;
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  const TMAP = { 'sandbox-verified': ['verified', 'Sandbox-verified'], 'cross-referenced': ['corroborated', 'Cross-referenced'], 'single-source': ['single', 'Single-source'], 'agent-authored': ['single', 'Agent-authored'] };
  function tierBadge(tier) { const m = TMAP[tier] || ['single', tier]; return <TierBadge tier={m[0]} label={m[1]} />; }
  function Untrusted() { return <TierBadge tier="untrusted" label="curation-ingested" />; }
  function VerChip({ ver }) {
    const col = ver === 'exact' ? 'var(--text-secondary)' : ver === 'unverified' ? 'var(--halt-gold-ink)' : 'var(--state-amber-ink)';
    return <span style={{ ...mono, fontSize: 11, color: col }}>{ver}</span>;
  }
  function CoverChip({ covered }) {
    return covered ? <span style={{ ...mono, fontSize: 11, color: 'var(--state-green)' }}>▣ cov</span> : <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>▢ unc</span>;
  }

  /* DocReadingPane — Workshop paper body with per-chunk evidence-coverage shading. */
  function DocReadingPane({ doc }) {
    if (!doc) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Select a result to read.</div>;
    return (
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--paper-page)' }}>
        <article style={{ maxWidth: 640, margin: '0 auto', padding: '32px 36px 60px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--paper-ink-muted)', marginBottom: 8 }}>{doc.appliesTo}</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, lineHeight: '34px', fontWeight: 600, color: 'var(--paper-ink)', margin: '0 0 20px' }}>{doc.title}</h1>
          {doc.body.map(([h, p, cov], i) => (
            <div key={i} style={{ marginBottom: 18, position: 'relative', paddingLeft: 16 }}>
              <span style={{ position: 'absolute', left: 0, top: 4, color: cov ? 'var(--paper-hairline)' : '#B58900', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cov ? '' : '▢'}</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--paper-ink)', margin: '0 0 6px' }}>{h}</h2>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: '25px', color: 'var(--paper-ink)', margin: 0, background: cov ? 'var(--paper-inset)' : 'transparent', padding: cov ? '4px 8px' : 0, borderRadius: 4 }}>{p}</p>
              {!cov ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#8a5a00', marginTop: 3 }}>not execution-covered</div> : null}
            </div>
          ))}
        </article>
      </div>
    );
  }

  /* ScopeResolver — host_id XOR target_* + honest version_scope + include_unverified. */
  function ScopeResolver() {
    const [scope, setScope] = React.useState('host');
    const [unver, setUnver] = React.useState(false);
    return (
      <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input icon="⌕" placeholder="how to extend an lvm volume…   /" style={{ width: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={eyebrow}>scope</span>
          {[['host', 'host_id [host_9f2…]'], ['target', 'target: os·distro·ver·arch']].map(([k, label]) => (
            <button key={k} onClick={() => setScope(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 0, cursor: 'pointer', color: scope === k ? 'var(--signal-cyan-ink)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{scope === k ? '◉' : '○'} {label}</button>
          ))}
          <span style={{ color: 'var(--text-disabled)' }}>|</span>
          <span>version_scope: <span style={{ color: 'var(--state-green)' }}>✔ exact</span> (CMDB fresh 1.2s)</span>
          <span>k [8]</span>
          <button onClick={() => setUnver((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 0, cursor: 'pointer', color: unver ? 'var(--signal-cyan-ink)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{unver ? '☑' : '☐'} include_unverified</button>
        </div>
      </div>
    );
  }

  /* AdmissionDiff — quarantine body vs source markdown + frontmatter delta. */
  function AdmissionDiff({ doc }) {
    return (
      <div style={{ background: 'var(--paper-page)', borderRadius: 'var(--radius-panel)', padding: 16, ...mono, fontSize: 12, lineHeight: '19px', color: 'var(--paper-ink)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--paper-ink-muted)', marginBottom: 8 }}>{doc.id} · gnu.org vs quarantine body</div>
        <div style={{ background: '#DDF0E0', color: '#1E5B32', padding: '1px 6px', borderRadius: 3 }}>+ lvextend -r resizes the fs in one step</div>
        <div style={{ background: '#F3DADA', color: '#7A2420', padding: '1px 6px', borderRadius: 3, marginTop: 3, textDecoration: 'line-through' }}>− also works on thin pools without caveat</div>
        <div style={{ color: '#8a5a00', marginTop: 8 }}>sources: 3 clusters (~heuristic distinctness — NOT a verified-independence badge)</div>
      </div>
    );
  }

  window.LBParts = { tierBadge, Untrusted, VerChip, CoverChip, DocReadingPane, ScopeResolver, AdmissionDiff, eyebrow, mono, panel };
})();
