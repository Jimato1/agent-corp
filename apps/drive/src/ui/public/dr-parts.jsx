/* The three Drive-specific parts (PreviewSurface, DiskWatermarkMeter, UploadDropzone) + the two
   shared render helpers (tierBadge, verifyPill) and style objects — reproduced from the FROZEN
   Helm Drive kit spec. Every shared entity is a §4/§5/§6 component from the bundle; these three are
   the only app-specific widgets (each genuinely domain-unique per UI_SPEC §4). */
(function () {
  const DS = window.HelmDesignSystem_f4cb26;
  const { TierBadge, StatusPill, Button } = DS;
  const h = React.createElement;

  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  const TMAP = { verified: ['verified', 'verified'], derived: ['corroborated', '~derived'], 'single-source': ['single', 'single-source'] };
  function tierBadge(t) { const m = TMAP[t] || ['single', t]; return h(TierBadge, { tier: m[0], label: m[1] }); }

  function verifyPill(v) {
    if (v === 'verified') return h(StatusPill, { tone: 'verified', glyph: '✔', size: 'sm' }, 'VERIFIED');
    if (v === 'unverified_pending') return h(StatusPill, { tone: 'attention', glyph: '◐', size: 'sm' }, 'UNVERIFIED_PENDING');
    return h(StatusPill, { tone: 'danger', glyph: '⛒', size: 'sm' }, 'VERIFIED_ABSENT');
  }

  // ── PreviewSurface: sniffed-allowlist media/doc viewer; embeds the pdf app; degraded=gold safe-stop.
  function PreviewSurface(props) {
    const a = props.artifact || {}; const degraded = props.degraded;
    const mime = a.mime || '';
    const isImg = mime.indexOf('image/') === 0;
    const isText = mime === 'text/plain' || mime === 'text/csv';
    const isPdf = mime === 'pdf' || mime === 'application/pdf';
    const allow = isImg || isText || isPdf;

    if (degraded) {
      return h('div', { style: Object.assign({}, panel, { background: 'var(--halt-gold-wash)', border: '1px solid var(--halt-gold-edge)', padding: 24, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', height: '100%' }) },
        h('div', { style: { fontSize: 26, color: 'var(--halt-gold)' } }, '⛊'),
        h('div', { style: { color: 'var(--halt-gold-ink)', fontWeight: 600 } }, 'Preview unavailable — pdf renderer is down'),
        h('div', { style: { color: 'var(--halt-gold-ink)', maxWidth: '46ch', textAlign: 'center' } },
          'This is the renderer safe-stopping, not a lost file. ',
          h('strong', null, 'Still true:'), ' the original bytes are intact — Download still works.'));
    }

    const footer = h('div', { style: { borderTop: '1px solid var(--border-default)', background: 'var(--surface-raised)', padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center' } },
      h('span', { style: eyebrow }, 'Provenance'), tierBadge(a.tier),
      h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)', fontSize: 12 }) }, 'sniffed ' + mime + ' · CSP:sandbox'));

    let body;
    if (!allow) {
      body = h('div', { style: { padding: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' } },
        h('div', { style: { fontSize: 22 } }, '⬇'),
        h('div', null, 'Download only — ' + mime),
        h('div', { style: Object.assign({}, mono, { color: 'var(--text-muted)', fontSize: 12 }) }, 'nosniff · CSP: sandbox · attachment-default'),
        h(Button, { tone: 'secondary', size: 'compact', icon: '↓', onClick: props.onDownload }, 'Download'));
      return h('div', { style: Object.assign({}, panel, { height: '100%' }) }, body);
    }
    if (isText) {
      body = h('div', { style: { background: 'var(--paper-page)', color: 'var(--paper-ink)', fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: '28px', padding: 20, flex: 1, overflow: 'auto' } }, props.text || '(text preview streams from the artifact bytes)');
    } else if (isImg) {
      body = h('div', { style: { background: 'var(--surface-backdrop)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h('div', { style: Object.assign({}, mono, { color: 'var(--text-muted)' }) }, a.name || 'image'));
    } else {
      body = h('div', { style: { background: 'var(--surface-backdrop)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 } },
        props.src
          ? h('iframe', { title: 'pdf', src: props.src, style: { width: '100%', height: '100%', border: 'none', background: 'var(--paper-page)' } })
          : h('div', { style: { background: 'var(--paper-page)', color: 'var(--paper-ink)', width: 240, height: 300, boxShadow: 'var(--shadow-dialog)', fontFamily: 'var(--font-serif)', padding: 16 } }, a.name || 'document'));
    }
    return h('div', { style: Object.assign({}, panel, { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }) }, body, footer);
  }

  // ── DiskWatermarkMeter: fill-vs-threshold gauge; false-green rule (never green over the watermark).
  function DiskWatermarkMeter(props) {
    const used = props.used, watermark = props.watermark;
    const over = used >= watermark;
    const near = used > watermark - 20;
    const fill = over ? 'var(--halt-gold)' : (near ? 'var(--state-amber)' : 'var(--signal-cyan)');
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
      h('span', { style: eyebrow }, 'disk'),
      h('div', { style: { position: 'relative', height: 10, background: 'var(--surface-inset)', borderRadius: 5 } },
        h('div', { style: { width: Math.min(100, used) + '%', height: '100%', background: fill, borderRadius: 5 } }),
        h('div', { style: { position: 'absolute', top: -2, bottom: -2, left: watermark + '%', width: 2, background: 'var(--danger-red)' } })),
      h('span', { style: Object.assign({}, mono, { fontSize: 12, color: over ? 'var(--halt-gold-ink)' : 'var(--text-secondary)' }) },
        used + '% / ' + watermark + '%' + (over ? '  ▲ over watermark' : '')));
  }

  // ── UploadDropzone: streaming multi-file target; per-file StatePill; POST-intent → PUT flow.
  function UploadDropzone(props) {
    const files = props.files || [];
    const inputRef = React.useRef(null);
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', {
        onClick: function () { inputRef.current && inputRef.current.click(); },
        style: { border: '1.5px dashed var(--border-strong)', background: 'var(--surface-inset)', borderRadius: 6, padding: 20, textAlign: 'center', cursor: 'pointer' },
      }, h('div', { style: { fontSize: 20 } }, '↑'), h('div', { style: { color: 'var(--text-secondary)' } }, 'Drag files here, or click to browse')),
      h('input', { ref: inputRef, type: 'file', style: { display: 'none' }, onChange: function (e) { props.onFiles && props.onFiles(Array.prototype.slice.call(e.target.files)); } }),
      files.map(function (f, i) {
        var pill;
        if (f.state === 'committed') pill = h(StatusPill, { tone: 'verified', glyph: '✔', size: 'sm' }, 'committed');
        else if (f.state === 'failed') pill = h(StatusPill, { tone: 'danger', glyph: '✕', size: 'sm' }, 'failed');
        else pill = h(StatusPill, { tone: 'interactive', glyph: '⧗', size: 'sm' }, 'streaming');
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('span', { style: Object.assign({}, mono, { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }) }, f.name),
          h('div', { style: { width: 120, height: 6, background: 'var(--surface-inset)', borderRadius: 3 } },
            h('div', { style: { width: (f.pct || 0) + '%', height: '100%', borderRadius: 3, background: f.state === 'committed' ? 'var(--state-green)' : 'var(--signal-cyan)' } })),
          pill);
      }));
  }

  window.DRParts = { PreviewSurface, DiskWatermarkMeter, UploadDropzone, tierBadge, verifyPill, styles: { eyebrow, mono, panel } };
})();
