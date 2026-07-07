/* Helm — Drive · app-specific components. Exposed as window.DRParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { TierBadge, StatusPill, Button } = H;
  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  const TMAP = { verified: ['verified', 'verified'], derived: ['corroborated', '~derived'], 'single-source': ['single', 'single-source'] };
  function tierBadge(t) { const m = TMAP[t] || ['single', t]; return <TierBadge tier={m[0]} label={m[1]} />; }
  function verifyPill(v) {
    if (v === 'verified') return <StatusPill tone="verified" glyph="✔" size="sm">VERIFIED</StatusPill>;
    if (v === 'unverified_pending') return <StatusPill tone="attention" glyph="◐" size="sm">UNVERIFIED_PENDING</StatusPill>;
    return <StatusPill tone="danger" glyph="⛒" size="sm">VERIFIED_ABSENT</StatusPill>;
  }

  /* PreviewSurface — inline artifact viewer; enforces the sniffed allowlist. */
  function PreviewSurface({ artifact, degraded }) {
    if (degraded) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--surface-screen)' }}>
          <div style={{ maxWidth: 360, background: 'var(--halt-gold-wash)', border: '1px solid var(--halt-gold-edge)', borderRadius: 'var(--radius-panel)', padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 24, color: 'var(--halt-gold)' }}>⛊</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--halt-gold-ink)', margin: '6px 0' }}>Preview unavailable — pdf renderer is down</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: '18px', color: 'var(--halt-gold-ink)', opacity: 0.9 }}>This is the renderer safe-stopping, not a lost file. <b>Still true:</b> original bytes intact — Download still works.</div>
          </div>
        </div>
      );
    }
    const mime = artifact.mime;
    const isImg = mime && mime.startsWith('image/');
    const isText = mime === 'text/plain' || mime === 'text/csv';
    const isPdf = mime === 'pdf' || mime === 'application/pdf';
    const allow = isImg || isText || isPdf;
    if (!allow) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--surface-screen)' }}>
          <div style={{ ...panel, padding: 18, maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 22, color: 'var(--text-muted)' }}>⬇</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)', margin: '6px 0' }}>Download only — {mime}</div>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>nosniff · CSP: sandbox · attachment-default</div>
            <div style={{ marginTop: 10 }}><Button tone="secondary" size="compact" icon="↓">Download</Button></div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isText ? 'var(--paper-page)' : 'var(--surface-backdrop)', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {isText ? (
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: '28px', color: 'var(--paper-ink)', maxWidth: 520 }}>host,cpu,mem<br />web-01,12%,41%<br />web-02,9%,38%</div>
          ) : isImg ? (
            <div style={{ width: 200, height: 140, borderRadius: 6, background: 'repeating-conic-gradient(#2A2F38 0% 25%, #232830 0% 50%) 50% / 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', ...mono, fontSize: 11 }}>{artifact.name}</div>
          ) : (
            <div style={{ width: 240, height: 300, background: 'var(--paper-page)', borderRadius: 4, boxShadow: 'var(--shadow-dialog)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20, fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--paper-ink)' }}>{artifact.name}</div>
          )}
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-raised)' }}>
          <span style={eyebrow}>Provenance</span>{tierBadge(artifact.tier)}<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>sniffed {mime} · CSP:sandbox</span>
        </div>
      </div>
    );
  }

  /* DiskWatermarkMeter — fill-vs-threshold gauge; crossing is amber/gold, never green. */
  function DiskWatermarkMeter({ used, watermark }) {
    const over = used >= watermark;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
        <span style={eyebrow}>disk</span>
        <div style={{ position: 'relative', flex: 1, height: 10, background: 'var(--surface-inset)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: used + '%', height: '100%', background: over ? 'var(--halt-gold)' : used > watermark - 20 ? 'var(--state-amber)' : 'var(--signal-cyan)' }} />
          <div style={{ position: 'absolute', left: watermark + '%', top: -2, bottom: -2, width: 2, background: 'var(--danger-red)' }} />
        </div>
        <span style={{ ...mono, fontSize: 12, color: over ? 'var(--halt-gold-ink)' : 'var(--text-secondary)' }}>{used}% / {watermark}%</span>
      </div>
    );
  }

  /* UploadDropzone — drag-drop target with per-file streaming rows. */
  function UploadDropzone() {
    const files = [
      { name: 'report-final.pdf', state: 'committed', pct: 100 },
      { name: 'appendix.pdf', state: 'streaming', pct: 62 },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-panel)', padding: 24, textAlign: 'center', background: 'var(--surface-inset)' }}>
          <div style={{ fontSize: 22, color: 'var(--text-muted)' }}>↑</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Drag files here, or click to browse</div>
        </div>
        {files.map((f) => (
          <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{f.name}</span>
            <div style={{ width: 120, height: 6, background: 'var(--surface-inset)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: f.pct + '%', height: '100%', background: f.state === 'committed' ? 'var(--state-green)' : 'var(--signal-cyan)' }} /></div>
            {f.state === 'committed' ? <StatusPill tone="verified" glyph="✔" size="sm">committed</StatusPill> : <StatusPill tone="interactive" glyph="⧗" size="sm">streaming</StatusPill>}
          </div>
        ))}
      </div>
    );
  }

  window.DRParts = { tierBadge, verifyPill, PreviewSurface, DiskWatermarkMeter, UploadDropzone, eyebrow, mono, panel };
})();
