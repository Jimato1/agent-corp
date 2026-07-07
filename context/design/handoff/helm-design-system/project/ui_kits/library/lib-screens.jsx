/* Helm — Library · screens (6). Exposed as window.LBScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.LB_DATA;
  const P = window.LBParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, FreshnessStamp, Button, DangerAction, PrintedAbsence, ErrorState } = H;
  const { tierBadge, Untrusted, VerChip, CoverChip, DocReadingPane, ScopeResolver, AdmissionDiff, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>{crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}</div>{right}</div>;
  }
  // Factory (not a module-scope element): creating an element at eval time would
  // fire React.createElement before StatusPill is in scope in the shared bundle.
  const adminTag = () => <StatusPill tone="neutral" glyph="◐" size="sm">library:admin · operator only</StatusPill>;

  /* 1 · Corpus Search */
  function Search({ ctx }) {
    const [sel, setSel] = React.useState(D.DOCS[0]);
    const cols = [
      { key: 'tier', header: 'Tier', render: (d) => tierBadge(d.tier) },
      { key: 'doc', header: 'Doc › heading', render: (d) => <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>{d.heading}</span><span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>{d.id}</span></span> },
      { key: 'ver', header: 'Ver', render: (d) => <VerChip ver={d.ver} /> },
      { key: 'cover', header: 'Cover', render: (d) => <CoverChip covered={d.covered} /> },
      { key: 'taint', header: 'Taint', render: () => <Untrusted /> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', minHeight: 0 }}>
        <Head title="Corpus search" sub="The corporate reference shelf. Every hit carries its trust envelope inline — tier, version scope, evidence coverage, and the curation-ingested taint." right={<FreshnessStamp age="0.3s ago" />} />
        <ScopeResolver />
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
          <div style={{ minHeight: 0, overflow: 'auto' }}>
            <DataTable columns={cols} rows={D.DOCS} rowKey="id" focusedKey={sel && sel.id} onRowClick={(d) => { setSel(d); ctx && ctx.setDoc && ctx.setDoc(d); }} />
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>retrieval_mode: hybrid · RRF-fused · tier is a badge, NOT a sort key · source: index @corpus a9c… 0.3s</div>
          </div>
          <div style={{ ...panel, overflow: 'hidden', display: 'flex', minHeight: 280 }}><DocReadingPane doc={sel} /></div>
        </div>
      </div>
    );
  }

  /* 2 · Doc / Provenance Inspector */
  function Inspector({ doc, ctx }) {
    const d = doc || D.DOCS[0];
    const attCell = (r) => r.att === 'gateway_delivered' ? <StatusPill tone="verified" glyph="✔" size="sm">gateway_delivered</StatusPill>
      : r.att === 'agent_asserted' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><StatusPill tone="attention" glyph="◑" size="sm">agent_asserted</StatusPill><span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>🔒 ✕ never gates</span></span>
      : <StatusPill tone="neutral" glyph="◐" size="sm">operator_review</StatusPill>;
    const cols = [
      { key: 'when', header: 'When', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.when}</span> },
      { key: 'kind', header: 'Kind', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.kind}</span> },
      { key: 'att', header: 'Attestation', render: attCell },
      { key: 'run', header: 'Run / sources', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.run}</span> },
      { key: 'bound', header: 'Content-bound', render: (r) => r.bound === 'match' ? <span style={{ color: 'var(--state-green)', ...mono, fontSize: 11 }}>✔ sha match</span> : r.bound ? <span style={{ color: 'var(--halt-gold-ink)', ...mono, fontSize: 11 }}>⚠ stale</span> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
      { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.outcome === 'never gates' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{r.outcome}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
        <button onClick={() => ctx.goto('search')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>‹ Search</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TicketRef id={d.id} /><span style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</span>
          <StatusPill tone="verified" glyph="●" size="sm">ADMITTED</StatusPill>{tierBadge(d.tier)}<Untrusted />
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>proposed_by <PrincipalRef kind="agent" id={d.proposedBy} /></span>{d.admittedBy ? <span>admitted_by <PrincipalRef kind="operator" id={d.admittedBy} /></span> : null}{d.ticket ? <TicketRef id={d.ticket} href="#" /> : null}
          <span style={mono}>applies_to: {d.appliesTo} · last_verified {d.lastVerified}</span>
        </div>
        <div style={{ ...panel, padding: 14 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Evidence ledger · append-only</div>
          {d.ledger.length ? <DataTable columns={cols} rows={d.ledger} rowKey="when" reflow={false} /> : <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No evidence rows.</span>}
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>chain-verify: <StatusPill tone="verified" glyph="✔" size="sm">Gateway audit chain confirmed</StatusPill> <span style={{ color: 'var(--text-disabled)' }}>(stale ⇒ ⚠ CANNOT CONFIRM, gold — never green)</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>Chunk / coverage map</div>
            {d.body.map(([h, , cov], i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', ...mono, fontSize: 12 }}><span style={{ color: cov ? 'var(--state-green)' : 'var(--state-amber-ink)' }}>{cov ? '▣ covered' : '▢ UNCOVERED'}</span><span style={{ color: 'var(--text-secondary)' }}>#{i} {h}</span></div>)}
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>sources: {d.sources}</div>
          </div>
          <div style={{ ...panel, overflow: 'hidden', display: 'flex', minHeight: 260 }}><DocReadingPane doc={d} /></div>
        </div>
      </div>
    );
  }

  /* 3 · Ingestion Review Queue */
  function Ingestion() {
    const [view, setView] = React.useState(null);
    const cols = [
      { key: 'tier', header: 'Tier', render: (r) => tierBadge(r.tier) },
      { key: 'id', header: 'Doc', render: (r) => <TicketRef id={r.id} /> },
      { key: 'proposedBy', header: 'Proposed by', render: (r) => <PrincipalRef kind="agent" id={r.proposedBy} /> },
      { key: 'ticket', header: 'Ticket', render: (r) => <TicketRef id={r.ticket} href="#" /> },
      { key: 'distinctness', header: 'Distinctness', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>{r.distinctness} ⚠</span> },
      { key: 'age', header: 'Age', align: 'right', render: (r) => <FreshnessStamp age={r.age} /> },
      { key: 'diff', header: '', render: (r) => <Button tone="ghost" size="compact" onClick={() => setView(r)}>view ▸</Button> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="library:admin" title="Ingestion review · tier-2 admission gate" sub="Library's OWN admission gate — a distinct queue with distinct authority (item id is doc_id, not a Board ticket). agent-asserted evidence is never auto-admit-eligible." right={adminTag()} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusPill tone="neutral" size="sm">switching: NORMAL</StatusPill><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>batch cap 10</span>
          <span style={{ flex: 1 }} />
          <DangerAction label="Admit selected" glyph="⚠" variant="outline" title="Admit 2 docs" consequence="Adds trusted content to the shelf every agent reads. Bulk-approve is capped at 10." direction="more" typedIntent="ADMIT" stepUp auditNote="Echoes batch size + the doc_ids." confirmLabel="Admit" />
          <DangerAction label="Reject selected" glyph="⚠" variant="outline" title="Reject selected" consequence="Rejects the selected proposals." direction="less" confirmLabel="Reject" />
        </div>
        <DataTable columns={cols} rows={D.INGEST} rowKey="id" />
        {D.INGEST.filter((r) => !r.eligible).map((r) => (
          <PrintedAbsence key={r.id} glyph="🔒" tag="content-bound gate">
            <strong>{r.id} is NOT admit-eligible.</strong> {r.note} — no affordance, no MCP bypass path.
          </PrintedAbsence>
        ))}
        {view ? (
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>AdmissionDiff · {view.id}</div>
            <AdmissionDiff doc={view} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
              <DangerAction label="Reject" glyph="⚠" variant="outline" title={`Reject ${view.id}`} consequence="Rejects this proposal." direction="less" confirmLabel="Reject" />
              <DangerAction label="Admit → cross-referenced" glyph="⚠" variant="solid" title={`Admit ${view.id}`} consequence="Admits to cross-referenced tier. Distinctness raises priority, never confers trust." direction="more" typedIntent={view.id} stepUp confirmLabel="Admit" />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  /* 4 · Spot-Audit Stream */
  function SpotAudit() {
    const cols = [
      { key: 'tier', header: 'Tier', render: () => tierBadge('sandbox-verified') },
      { key: 'id', header: 'Doc', render: (r) => <TicketRef id={r.id} /> },
      { key: 'run', header: 'Run / harness', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.run}</span> },
      { key: 'covered', header: 'Covered', render: (r) => <span style={{ ...mono, fontSize: 12, color: r.coveredOk ? 'var(--state-green)' : 'var(--state-amber-ink)' }}>{r.coveredOk ? '▣' : '▢'} {r.covered}{!r.coveredOk ? ' ⚠' : ''}</span> },
      { key: 'admittedBy', header: 'Admitted by', render: (r) => <PrincipalRef kind="service" id={r.admittedBy} /> },
      { key: 'act', header: 'Audit', render: (r) => <div style={{ display: 'flex', gap: 6 }}><Button tone="ghost" size="compact">Confirm ok</Button><DangerAction label="Reject" glyph="⚠" variant="outline" size="compact" title={`Reject ${r.id}`} consequence="Rejects an already-admitted doc (synchronous index removal); trips tightened switching. If the origin cluster contains admitted docs, a second confirm gates cluster quarantine." direction="more" typedIntent={r.id} stepUp confirmLabel="Reject" /></div> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="library:admin" title="Tier-1 spot-audit · auto-admissions" sub="Auditing already-admitted docs, not gating. Uncovered-heavy rows surface prominently — the anti-tier-riding cue." right={<StatusPill tone="attention" glyph="▲" size="sm">TIGHTENED · 100% · harness_version change</StatusPill>} />
        <DataTable columns={cols} rows={D.SPOTAUDIT} rowKey="id" />
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>sample rate: 100% (young) — steady 5% · ANSI-Z1.4 switching · never green (tightened is an audit posture, not health)</div>
      </div>
    );
  }

  /* 5 · Collections & Lifecycle */
  function Collections() {
    const cols = [
      { key: 'id', header: 'Doc', render: (r) => <TicketRef id={r.id} /> },
      { key: 'status', header: 'Status', render: (r) => r.status === 'current' ? <StatusPill tone="verified" glyph="●" size="sm">current</StatusPill> : <StatusPill tone="draining" glyph="⇉" size="sm">superseded</StatusPill> },
      { key: 'appliesTo', header: 'applies_to', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.appliesTo}</span> },
      { key: 'lastVerified', header: 'last_verified', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.lastVerified}</span> },
      { key: 'flag', header: 'Flag', render: (r) => r.status === 'superseded' ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.flag}</span> : <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>▲ {r.flag}</span> },
      { key: 'act', header: '', render: (r) => r.action ? <DangerAction label={r.action} glyph="⚠" variant="outline" size="compact" title={`${r.action} ${r.id}`} consequence="Preserves evidence history; mints/links a new lineage doc, never edits bytes. No delete capability exists." direction="more" typedIntent={r.action.toUpperCase()} stepUp confirmLabel={r.action} /> : null },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="library:admin" title="Collections & lifecycle" sub="Retirement is operator-decided, never automatic deletion. Retire/Supersede preserve evidence history — never a body edit, never a delete." right={adminTag()} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{D.COLLECTIONS.map((c) => <StatusPill key={c} tone="neutral" size="sm">{c}</StatusPill>)}<Button tone="secondary" size="compact">+ New collection</Button></div>
        <DataTable columns={cols} rows={D.LIFECYCLE} rowKey="id" />
        <PrintedAbsence glyph="🔒" tag="not a capability">
          <strong>There is no delete affordance anywhere.</strong> Deletion is not a capability — supersession preserves lineage.
        </PrintedAbsence>
      </div>
    );
  }

  /* 6 · Index Status */
  function IndexStatus() {
    const I = D.INDEX;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1080 }}>
        <Head crumb="library:admin" title="Index status" sub="The named home of the Library's degraded modes. Corpus↔index consistency uses the false-green rule — an index that leads corpus shows serving-suspended in gold, never a green OK." right={adminTag()} />
        <div style={{ ...panel, padding: 14, ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>model_id: {I.model} · digest {I.digest} · dim {I.dim} <span style={{ color: 'var(--state-amber-ink)' }}>(PENDING-SIZING)</span> · chunker {I.chunker}</div>
          <div>corpus HEAD {I.head} <span style={{ color: 'var(--state-green)' }}>✔</span> · index_meta.corpus_commit {I.head} <span style={{ color: 'var(--state-green)' }}>✔ (ancestor-or-equal)</span> · built_at {I.builtAt} ⟳</div>
        </div>
        <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={eyebrow}>Health / degraded modes</div>
          {I.degraded.map((g, i) => <ErrorState key={i} pattern="D" title={g.text.split(' — ')[0]}>{g.text.split(' — ')[1]}</ErrorState>)}
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>pending_embed: {I.pendingEmbed} docs — served from FTS half, vectors queued (retrieval_mode: partial)</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔ corpus↔index consistent · nightly integrity sweep: last 03:00 ✔</div>
        </div>
        <div style={{ ...panel, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={eyebrow}>Rebuild</span><span style={{ flex: 1 }} />
          <DangerAction label="Full reindex (destroy + rebuild)" glyph="⚠" variant="solid" title="Full reindex" consequence="Suspends vector+FTS serving until rebuild completes; stale results withheld, not served. Proves the rebuildable invariant." direction="more" irreversible typedIntent="REINDEX" stepUp confirmLabel="Reindex" />
        </div>
      </div>
    );
  }

  window.LBScreens = { Search, Inspector, Ingestion, SpotAudit, Collections, IndexStatus };
})();
