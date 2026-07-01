// pdf-forge flow E — all frames + Canvas. → window.PFE.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFE = window.PFE, DATA = window.PFE_DATA;
  const { Rail, WorkFrame, Icon, MONO, EYE, JobCard } = PFW;
  const { Button, Toast, Switch, SegmentedControl } = DS;
  const DW = 1320, DH = 820;
  const FR = (window.PFE_FRAMES = window.PFE_FRAMES || []);
  const railFor = (op) => <Rail items={DATA.ops} active={op} />;
  const aesNote = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...MONO, fontSize: 11, color: 'var(--ink-500)' }}><Icon name="shield" size={13} /> AES-256 · R=6</span>;

  // E1 encrypt form
  FR.push({ id: 'E1', w: DW, h: DH, title: 'Encrypt · form', note: 'user password (required) + optional owner + permission toggles',
    el: <WorkFrame rail={railFor('encrypt')} board={<PFE.CenterWell><PFE.PreviewSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="encrypt">
        <PFE.PasswordField label="User password" required value="open-sesame" hint="Needed to open the file" />
        <PFE.PasswordField label="Owner password" value="master-key" hint="Optional · controls permissions" />
        <div><span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 }}>Permissions</span><PFE.PermToggles /></div>
        {aesNote}
      </PFE.EInspector>} /> });

  // E2 decrypt form (locked sheet)
  FR.push({ id: 'E2', w: DW, h: DH, title: 'Decrypt · form', note: 'locked-sheet placeholder · single open-password field + eye toggle',
    el: <WorkFrame rail={railFor('decrypt')} board={<PFE.CenterWell><PFE.LockedSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="decrypt"><PFE.PasswordField label="Open password" required value="letmein" hint="The password this PDF asks for" /></PFE.EInspector>} /> });

  // E3 permissions form (disclaimer)
  FR.push({ id: 'E3', w: DW, h: DH, title: 'Permissions · form', note: 'persistent advisory disclaimer above the toggle group',
    el: <WorkFrame rail={railFor('permissions')} board={<PFE.CenterWell><PFE.PreviewSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="permissions">
        <PFE.AdvisoryDisclaimer />
        <PFE.PermToggles />
        <PFE.PasswordField label="Owner password" value="master-key" hint="Optional · locks the permission set" />
      </PFE.EInspector>} /> });

  // E3b permissions submit warning
  FR.push({ id: 'E3b', w: DW, h: DH, title: 'Permissions · owner-only warning', note: 'no user password → advisory escalation (submit still allowed)',
    el: <WorkFrame rail={railFor('permissions')} board={<PFE.CenterWell><PFE.PreviewSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="permissions">
        <PFE.AdvisoryDisclaimer />
        <PFE.PermToggles />
        <PFE.SubmitWarn>No user password set — this file will open for anyone.</PFE.SubmitWarn>
      </PFE.EInspector>} /> });

  // E4 in-progress (hero)
  FR.push({ id: 'E4', w: DW, h: DH, title: 'In-progress · the press', note: 'worksurface dims · amber sweep + spinner · Running — pikepdf → finalize',
    el: <WorkFrame rail={railFor('encrypt')} board={<PFE.CenterWell><PFE.PreviewSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="encrypt" submitProcessing>
        <PFE.PasswordField label="User password" required value="open-sesame" />
      </PFE.EInspector>}
      overlay={<PFE.PressOverlay phase="Running — pikepdf" />} /> });

  // E5 wrong password (motion)
  FR.push({ id: 'E5', w: DW, h: DH, title: 'Wrong password · shake', note: 'err border + shake · value preserved · focus returns to field',
    el: <WorkFrame rail={railFor('decrypt')} board={<PFE.CenterWell><PFE.LockedSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="decrypt">
        <PFE.PasswordField label="Open password" required value="letmein" error="That password didn't unlock this PDF. Check it and try again." code="wrong_password" />
        <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>↳ field shakes once on submit (motion)</span>
      </PFE.EInspector>} /> });

  // E5rm wrong password (reduced motion)
  FR.push({ id: 'E5rm', w: 700, h: 420, title: 'Wrong password · reduced-motion', note: 'color only — no shake · focus rings still render',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-800)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={EYE}>Decrypt · reduced-motion</span>
      <PFE.PasswordField label="Open password" required value="letmein" error="That password didn't unlock this PDF. Check it and try again." code="wrong_password" />
      <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>↳ color only — no shake; retries are unlimited, nothing kept on failure</span>
    </div> });

  // E6 submit errors catalog
  FR.push({ id: 'E6', w: 680, h: 500, title: 'Submit errors', note: 'sanitized message + small mono code · never an HTTP number',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <PFE.ErrorBannerE kind="file_too_large" /><PFE.ErrorBannerE kind="not_a_pdf" /><PFE.ErrorBannerE kind="bad_pdf_structure" /><PFE.ErrorBannerE kind="queue_full" /><PFE.ErrorBannerE kind="disk_full" />
    </div> });

  // E7 success encrypt
  FR.push({ id: 'E7', w: DW, h: DH, title: 'Success · Encrypt', note: '"Encrypted with AES-256 — now needs its password to open."',
    el: <WorkFrame rail={railFor('encrypt')} board={<PFE.CenterWell><PFE.PreviewSheet name={DATA.input.name} /></PFE.CenterWell>}
      inspector={<PFE.EInspector op="encrypt" artifact={<PFE.SuccessRow op="encrypt" />} />}
      overlay={<div style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 30 }}><Toast status="ok" title="Encrypted">{DATA.results.encrypt.filename}</Toast></div>} /> });

  // E8 success decrypt
  FR.push({ id: 'E8', w: 700, h: 300, title: 'Success · Decrypt', note: '"Unlocked — the password has been removed."',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-800)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}><span style={EYE}>Result · decrypt</span><PFE.SuccessRow op="decrypt" /></div> });

  // E9 success permissions (echoes disclaimer)
  FR.push({ id: 'E9', w: 700, h: 340, title: 'Success · Permissions', note: 'artifact row beneath the echoed advisory disclaimer',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-800)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}><span style={EYE}>Result · permissions</span><PFE.SuccessRow op="permissions" /></div> });

  // E10 blocked submit + reveal
  FR.push({ id: 'E10', w: 700, h: 360, title: 'Blocked submit + reveal', note: 'client-side block (blank user pw) · eye toggle reveals the value',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-800)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><span style={EYE}>Client-side block</span><div style={{ marginTop: 8 }}><PFE.PasswordField label="User password" required value="" error="Set a user password — without one there's nothing to unlock." /></div></div>
      <div><span style={EYE}>Revealed (eye toggled)</span><div style={{ marginTop: 8 }}><PFE.PasswordField label="User password" required revealed value="open-sesame" hint="Never printed anywhere but here" /></div></div>
    </div> });

  // ---- mobile ----
  function EmTop({ op }) { return <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)' }}><DS.IconButton label="Menu"><Icon name="menu" /></DS.IconButton><span style={{ display: 'inline-flex', color: 'var(--press-400)' }}><Icon name={PFE.OPICON[op]} size={16} /></span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', flex: 1 }}>{PFE.OP[op]}</span></div>; }
  const phone = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' };
  function MiniSheet({ name, locked }) {
    return <div style={{ flex: 1, minHeight: 0, margin: 12, borderRadius: 'var(--r-panel)', background: 'var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: 150, height: 212, background: locked ? 'linear-gradient(160deg,#f0f0ec,#e2e2db)' : 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: '0 2px 10px rgba(5,7,10,.5)', display: 'grid', placeItems: 'center', color: '#8a9098' }}>{locked ? <Icon name="lock" size={24} sw={1.6} /> : null}</div>
    </div>;
  }
  function BottomSheet({ children }) { return <div style={{ flex: 'none', background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center' }} />{children}</div>; }

  FR.push({ id: 'Em1', w: 390, h: 800, title: 'Mobile · Encrypt form', note: 'inspector → bottom sheet',
    el: <div style={phone}><EmTop op="encrypt" /><MiniSheet name={DATA.input.name} /><BottomSheet>
      <PFE.PasswordField label="User password" required value="open-sesame" />
      <PFE.PasswordField label="Owner password" value="master-key" />
      <Switch label="Allow copying (extract)" />
      <Button variant="primary" size="lg" block leftIcon={<Icon name="lock" size={15} />}>Encrypt</Button>
    </BottomSheet></div> });

  FR.push({ id: 'Em2', w: 390, h: 800, title: 'Mobile · wrong password', note: 'field error + preserved value in the bottom sheet',
    el: <div style={phone}><EmTop op="decrypt" /><MiniSheet name={DATA.input.name} locked /><BottomSheet>
      <PFE.PasswordField label="Open password" required value="letmein" error="That password didn't unlock this PDF." code="wrong_password" />
      <Button variant="primary" size="lg" block leftIcon={<Icon name="unlock" size={15} />}>Unlock</Button>
    </BottomSheet></div> });

  // INV
  function InvRow({ sample, name, note }) { return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid var(--sub-700)' }}><div style={{ width: 150, flex: 'none', display: 'flex', justifyContent: 'center' }}>{sample}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{name}</span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>{note}</span></div></div>; }
  FR.push({ id: 'INV', w: 900, h: 520, title: 'Component inventory', note: 'the parts flow E composes',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <InvRow name="Masked password field + eye" note="mono dots · show/hide toggle · error border + shake + wrong_password code" sample={<div style={{ width: 130 }}><PFE.PasswordField value="secret" /></div>} />
      <InvRow name="Permission toggle group" note="printing None/Low/High + modify/copy/annotate switches (press-blue on)" sample={<DS.Switch defaultChecked />} />
      <InvRow name="Advisory disclaimer" note="persistent warn-gold block · echoed on the permissions success row" sample={<DS.StatusPill status="warn">advisory</DS.StatusPill>} />
      <InvRow name="Locked-sheet placeholder" note="protected input — lock glyph, faces unrendered + caption" sample={<span style={{ width: 44, height: 62, background: 'linear-gradient(160deg,#f0f0ec,#e2e2db)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', display: 'grid', placeItems: 'center', color: '#8a9098' }}><Icon name="lock" size={16} sw={1.6} /></span>} />
      <InvRow name="Amber press readout" note="Running — pikepdf → finalize · spinner (progress:null) not a bar" sample={<DS.StatusPill status="proc">pikepdf</DS.StatusPill>} />
      <InvRow name="Success artifact row" note="op-specific copy · Download focused (encrypt/decrypt/permissions)" sample={<span style={{ color: 'var(--ok-500)' }}><Icon name="check" size={20} sw={2.4} /></span>} />
    </div> });

  // NOTES
  function NoteSec({ title, children }) { return <div style={{ marginBottom: 15 }}><span style={{ ...EYE, display: 'block', marginBottom: 7 }}>{title}</span><div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-700)', lineHeight: '19px' }}>{children}</div></div>; }
  const M = ({ children }) => <span style={MONO}>{children}</span>;
  FR.push({ id: 'NOTES', w: 760, h: 520, title: 'Interaction notes', note: 'whole-document crypto · careful password UX',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <NoteSec title="Password UX">Fields are mono, masked as dots, with a show/hide eye toggle. Encrypt needs a <b>user password</b> (blank is blocked client-side — never reaches the server). A revealed value is never printed anywhere but the field.</NoteSec>
      <NoteSec title="Wrong password">On <M>wrong_password</M> (immediate 422, or a sanitized failed job) the field gets the err border + a one-shot shake (color-only under reduced-motion), <b>focus returns to the field, and the dots are preserved</b> so a typo is a one-char fix. Retries are unlimited; nothing is kept server-side on failure.</NoteSec>
      <NoteSec title="Advisory permissions">The warn-gold disclaimer is persistent in the Permissions form and <b>echoed on the success row</b>. Owner-only perms with no user password escalate to an inline "this file will open for anyone" warning — advisory, submit still allowed.</NoteSec>
      <NoteSec title="Lifecycle">Submit → <M>POST /api/jobs/&#123;encrypt|decrypt|permissions&#125;</M> → 202 + <M>Location</M> → the worksurface dims and the amber press runs (phase <b>Running — pikepdf</b> → <b>finalize</b>, <M>progress:null</M> ⇒ spinner). On <M>succeeded</M> → green check + toast + artifact row (Download focused). Encrypt applies AES-256 in the finalize save.</NoteSec>
      <NoteSec title="No undo">A committed crypto job has no client undo — Decrypt conceptually reverses Encrypt (with the password), but there is no undo button. Multi-select / drag are N/A (whole-document op).</NoteSec>
    </div> });

  window.PFE.Canvas = function Canvas() { return <PFW.CanvasLayout frames={window.PFE_FRAMES} />; };
})();
