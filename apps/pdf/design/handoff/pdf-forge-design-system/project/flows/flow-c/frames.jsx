// pdf-forge flow C — all frames + Canvas. → window.PFC.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFC = window.PFC, DATA = window.PFC_DATA;
  const { Rail, WorkFrame, Icon, MONO, EYE, JobCard } = PFW;
  const { Button, IconButton, Toast, Select, Switch } = DS;
  const DW = 1320, DH = 820;
  const FR = (window.PFC_FRAMES = window.PFC_FRAMES || []);
  const railFor = (op) => <Rail items={DATA.ops} active={op} />;

  // C1 empty
  FR.push({ id: 'C1', w: DW, h: DH, title: 'Empty · compress selected', note: 'op list rail · recessed "Choose a compress input" · calm privacy',
    el: <WorkFrame rail={railFor('compress')} board={<PFC.CenterPreview empty op="compress" />} inspector={<PFC.CInspector op="compress" />} /> });

  // C2 loading (input dropped, pre-Submit)
  FR.push({ id: 'C2', w: DW, h: DH, title: 'Input dropped · client render', note: 'input sheet rendered on-device · options inline-validated · nothing uploaded',
    el: <WorkFrame rail={railFor('compress')} board={<PFC.CenterPreview input={DATA.inputs.compress} op="compress" />} inspector={<PFC.CInspector op="compress" />} /> });

  // C3 in-progress (HERO)
  FR.push({ id: 'C3', w: DW, h: DH, title: 'In-progress · the press lifecycle', note: 'worksurface dims · amber sweep + spinner (progress:null) · phase words, no %',
    el: <WorkFrame rail={railFor('compress')} board={<PFC.CenterPreview input={DATA.inputs.compress} op="compress" />}
      inspector={<PFC.CInspector op="compress" uploading submitProcessing />}
      overlay={<PFC.PressOverlay state="running" phase="Running — ghostscript" detail={`compress · ${DATA.inputs.compress.name} · ${DATA.inputs.compress.bytes} B`} />} /> });

  // C4 canceled
  FR.push({ id: 'C4', w: DW, h: DH, title: 'Canceled', note: 'DELETE /api/jobs/{id} → "Job canceled. Nothing was kept."',
    el: <WorkFrame rail={railFor('compress')} board={<PFC.CenterPreview input={DATA.inputs.compress} op="compress" />}
      inspector={<PFC.CInspector op="compress" />}
      overlay={<div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: 'rgba(8,10,14,.5)', padding: 24 }}>
        <div style={{ width: 380, display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderRadius: 'var(--r-panel)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)', boxShadow: 'var(--shadow-dialog)' }}>
          <span style={{ color: 'var(--ink-600)', display: 'inline-flex' }}><Icon name="stop" size={20} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink-700)' }}>Job canceled</span><span style={{ ...MONO, fontSize: 12, color: 'var(--ink-500)' }}>Nothing was kept.</span></div>
        </div>
      </div>} /> });

  // C5 error catalog
  FR.push({ id: 'C5', w: 680, h: 560, title: 'Error voice · server path', note: 'sanitized message + small mono code · Try again keeps your options',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <PFC.ErrorBannerC kind="file_too_large" /><PFC.ErrorBannerC kind="not_a_pdf" /><PFC.ErrorBannerC kind="bad_pdf_structure" /><PFC.ErrorBannerC kind="queue_full" /><PFC.ErrorBannerC kind="disk_full" /><PFC.ErrorBannerC kind="timeout" /><PFC.ErrorBannerC kind="engine_error" />
    </div> });

  // C6 success · savings
  FR.push({ id: 'C6', w: DW, h: DH, title: 'Success · compress savings', note: 'amber → green · scrim lifts · 5.0 MB → 1.8 MB (−64%) · Download focused',
    el: <WorkFrame rail={railFor('compress')} board={<PFC.CenterPreview input={DATA.inputs.compress} op="compress" />}
      inspector={<PFC.CInspector op="compress" artifact={<PFC.SavingsRow r={DATA.result.compress} />} />}
      overlay={<div style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 30 }}><Toast status="ok" title="Compressed">{DATA.result.compress.filename}</Toast></div>} /> });

  // C7 success · kept input (warn)
  FR.push({ id: 'C7', w: 700, h: 300, title: 'Success · kept your original', note: 'meta.kept:"input" — compression would have grown it',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-800)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={EYE}>Result · compress</span>
      <PFC.SavingsRow r={DATA.result.compressKeptInput} kept="input" />
    </div> });

  // C8 image-to-pdf tray
  FR.push({ id: 'C8', w: DW, h: DH, title: 'Image → PDF · ordered tray', note: 'tiles in page order, true aspect · per-tile remove',
    el: <WorkFrame rail={railFor('image-to-pdf')} board={<PFC.ImageTray images={DATA.images} />} inspector={<PFC.CInspector op="image-to-pdf" />} /> });

  // C9 image tray drag
  FR.push({ id: 'C9', w: DW, h: DH, title: 'Image → PDF · reordering', note: 'lifted tile (scale 1.04, tilt 1.5°) · dashed ghost · press-blue insertion bar',
    el: <WorkFrame rail={railFor('image-to-pdf')} board={<PFC.ImageTray images={DATA.images} dragging />} inspector={<PFC.CInspector op="image-to-pdf" />} /> });

  // C10 merge tray
  FR.push({ id: 'C10', w: DW, h: DH, title: 'Merge · input reorder tray', note: 'drag to set order · encrypted input shows a mono-dots password field',
    el: <WorkFrame rail={railFor('merge')} board={<PFC.CenterPreview empty op="merge" />} inspector={<PFC.CInspector op="merge" />} /> });

  // C11 reduced-motion
  function RMCol({ title, children }) { return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}><span style={EYE}>{title}</span><div style={{ flex: 1, background: 'var(--sub-700)', borderRadius: 'var(--r-panel)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', padding: 14, display: 'grid', placeItems: 'center' }}>{children}</div></div>; }
  FR.push({ id: 'C11', w: 820, h: 360, title: 'prefers-reduced-motion + focus', note: 'static amber + working… · no tilt on drag · focus rings still render',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, display: 'flex', gap: 16 }}>
      <RMCol title="Press — static"><div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-800)', border: '1px solid rgba(224,138,60,.4)' }}><span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--proc-500)' }} /><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--proc-500)' }}>working…</span><span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>Running — ghostscript</span></div></div></RMCol>
      <RMCol title="Focus — always renders"><button style={{ height: 40, padding: '0 20px', borderRadius: 'var(--r-ctl)', border: 'none', background: 'var(--press-500)', color: '#08191f', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, outline: '2px solid var(--press-500)', outlineOffset: 2, boxShadow: '0 0 0 6px rgba(31,162,196,.35)' }}>Submit</button></RMCol>
    </div> });

  // ---- mobile ----
  function CmTop() { return <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)' }}><IconButton label="Menu"><Icon name="menu" /></IconButton><span style={{ display: 'inline-flex', color: 'var(--press-400)' }}><Icon name="compress" size={16} /></span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', flex: 1 }}>Compress</span></div>; }
  const phone = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' };

  FR.push({ id: 'Cm1', w: 390, h: 800, title: 'Mobile · empty', note: 'rail → top bar · options → bottom sheet',
    el: <div style={phone}><CmTop />
      <div style={{ flex: 1, minHeight: 0, margin: 12, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ width: '100%', borderRadius: 'var(--r-panel)', border: '2px dashed var(--sub-500)', padding: '40px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><span style={{ color: 'var(--ink-600)', display: 'inline-flex' }}><Icon name="file" size={28} sw={1.6} /></span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-700)' }}>Choose a compress input</span></div>
      </div>
      <div style={{ flex: 'none', background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center' }} />
        <div><span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 }}>Preset</span><Select mono options={['screen', 'ebook', 'printer']} defaultValue="ebook" /></div>
        <PFC.PrivacyLabel />
        <Button variant="primary" size="lg" block>Submit</Button>
      </div>
    </div> });

  FR.push({ id: 'Cm2', w: 390, h: 800, title: 'Mobile · in-progress', note: 'centered amber press stays legible',
    el: <div style={phone}><CmTop />
      <div style={{ flex: 1, minHeight: 0, position: 'relative', margin: 12, borderRadius: 'var(--r-panel)', background: 'var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', display: 'grid', placeItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: 12, width: '100%' }}><JobCard state="running" phase="Running — ghostscript" detail={`${DATA.inputs.compress.name} · ${DATA.inputs.compress.human}`} jobId={DATA.jobShort} width={330} /></div>
      </div>
    </div> });

  // INV
  function InvRow({ sample, name, note }) { return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid var(--sub-700)' }}><div style={{ width: 130, flex: 'none', display: 'flex', justifyContent: 'center' }}>{sample}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{name}</span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>{note}</span></div></div>; }
  FR.push({ id: 'INV', w: 900, h: 500, title: 'Component inventory', note: 'the parts flow C composes',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <InvRow name="Op-list rail row" note="9 single-PDF ops · small icon + label · press-blue selection" sample={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 'var(--r-ctl)', background: 'var(--press-tint)', color: 'var(--press-400)', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500 }}><Icon name="compress" size={15} />Compress</span>} />
      <InvRow name="Input sheet preview" note="client-rendered paper sheet, true aspect · filename chip" sample={<span style={{ width: 44, height: 62, background: 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: 'var(--shadow-sheet-rest)', display: 'inline-block' }} />} />
      <InvRow name="Press-lifecycle readout" note="amber sweep + spinner + phase line (state+stage) + Cancel → resolves green/red" sample={<DS.StatusPill status="proc">ghostscript</DS.StatusPill>} />
      <InvRow name="Savings / artifact row" note="mono filename · tabular bytes · 5.0 MB → 1.8 MB (−64% ok) · Download" sample={<span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(75,174,126,.16)', color: 'var(--ok-500)', ...MONO, fontSize: 12, fontWeight: 600 }}>−64%</span>} />
      <InvRow name="Privacy label" note="calm 'nothing has left this machine' → flips warn 'Uploading over your LAN only'" sample={<span style={{ color: 'var(--ok-500)' }}><Icon name="lock" size={20} /></span>} />
      <InvRow name="Image tray / merge row" note="reorderable tiles + rows · lifted + insertion bar · encrypted row gets a dots field" sample={<span style={{ display: 'flex', gap: 3 }}><span style={{ width: 16, height: 22, borderRadius: 2, background: 'var(--paper-0)' }} /><span style={{ width: 16, height: 22, borderRadius: 2, background: 'var(--paper-0)' }} /></span>} />
    </div> });

  // NOTES
  function NoteSec({ title, children }) { return <div style={{ marginBottom: 15 }}><span style={{ ...EYE, display: 'block', marginBottom: 7 }}>{title}</span><div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-700)', lineHeight: '19px' }}>{children}</div></div>; }
  const M = ({ children }) => <span style={MONO}>{children}</span>;
  FR.push({ id: 'NOTES', w: 760, h: 500, title: 'Interaction notes', note: 'the press lifecycle',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <NoteSec title="Client-side until Submit">The input renders on-device via pdf.js — nothing leaves the machine until you press Submit, when the privacy label flips from calm to the warn-gold "Uploading over your LAN only".</NoteSec>
      <NoteSec title="The press lifecycle">Submit → <M>POST /api/jobs/&#123;op&#125;</M> → 202 + <M>Location</M>. The worksurface dims (scrim), a centered amber readout runs a 1.6s <M>--ease-press</M> sweep + an indeterminate spinner (<M>progress:null</M> ⇒ no bar). The phase line is <M>state</M>+<M>stage</M>: <b>Running — ghostscript</b> → <b>Running — finalize</b>. No percentage — phase words only. Cancel → <M>DELETE</M>.</NoteSec>
      <NoteSec title="Resolve">On <M>succeeded</M> amber snaps to a green check, the scrim lifts, an <M>ok-tint</M> toast appears and an artifact row reveals with Download default-focused. Compress shows the savings delta (<M>−64%</M>); <M>meta.kept:"input"</M> shows a warn "Kept your original" chip. A failed job or a 4xx/5xx becomes a red banner with a small mono code and a Try again that preserves your filled-in options.</NoteSec>
      <NoteSec title="Trays">image→pdf and merge reorder by drag: the lifted tile/row scales 1.04 + tilts 1.5°, a dashed ghost marks the origin, and a 2px press-blue insertion bar shows where it lands. Encrypted merge inputs get a mono-dots password field.</NoteSec>
      <NoteSec title="Reduced motion">Amber press becomes a static readout + cycling <M>working…</M> (no spin/sweep); drag drops the tilt/scale (insertion bar only); errors are color-only; focus rings still render.</NoteSec>
    </div> });

  window.PFC.Canvas = function Canvas() { return <PFW.CanvasLayout frames={window.PFC_FRAMES} />; };
})();
