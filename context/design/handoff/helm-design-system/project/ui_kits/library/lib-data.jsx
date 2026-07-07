/* Helm — Library · data. Exposed as window.LB_DATA.
   A curated RAG corpus: cited, tier-tagged, version-correct reference docs. */
(function () {
  const DOCS = [
    { id: 'lib-01J1QZ', title: 'lvextend — LVM2 2.03', heading: 'lvextend › Growing a volume', tier: 'sandbox-verified', ver: 'exact', covered: true, status: 'current',
      proposedBy: 'agent:curator-03', admittedBy: 'operator:ada', ticket: 'T-000123', lastVerified: '2026-07-01', appliesTo: 'linux/ubuntu 24.04·22.04 amd64',
      body: [ ['Growing a volume', 'Use lvextend to grow a logical volume, then grow the filesystem. Verify with lvdisplay.', true], ['lvextend flags', 'The -r flag resizes the filesystem in the same step on supported types.', true], ['Also works on…', 'This section claims lvextend also works on thin pools without caveat.', false] ],
      ledger: [
        { when: '07-02 14:10', kind: 'sandbox', att: 'gateway_delivered', run: 'R-00A9 hv-3f2c9a', bound: 'match', outcome: 'satisfies gate' },
        { when: '07-01 09:22', kind: 'crossref', att: 'agent_asserted', run: '3 origins ~heur', bound: null, outcome: 'never gates' },
        { when: '06-30 —', kind: 'operator', att: 'operator_review', run: '—', bound: null, outcome: 'admitted' },
      ], sources: 'gnu.org (~heuristic origin-cluster) · git history ▸' },
    { id: 'lib-01H2AA', title: 'LVM2 — Resize', heading: 'LVM2 › Resize', tier: 'cross-referenced', ver: 'exact', covered: false, status: 'current', proposedBy: 'agent:curator-07', admittedBy: 'operator:ada', ticket: 'T-000123', lastVerified: '2026-06-28', appliesTo: 'linux/ubuntu 24.04 amd64', body: [['Resize', 'Cross-referenced resize procedure.', false]], ledger: [], sources: 'kernel.org · man7.org' },
    { id: 'lib-01G3BB', title: 'blog: "just run lvextend"', heading: 'blog › "just run lvextend"', tier: 'single-source', ver: '~approximate', covered: false, status: 'current', proposedBy: 'agent:curator-03', admittedBy: null, ticket: null, lastVerified: '—', appliesTo: 'linux (unverified)', body: [['Just run…', 'A single blog asserting a one-liner. Treat with suspicion.', false]], ledger: [], sources: 'random-blog.example' },
    { id: 'lib-01F4CC', title: 'note-derived resize', heading: 'note › derived', tier: 'agent-authored', ver: 'exact', covered: false, status: 'current', proposedBy: 'agent:curator-03', admittedBy: null, ticket: null, lastVerified: '—', appliesTo: 'linux/ubuntu 24.04', body: [['Derived', 'Agent-authored from a note — never gates.', false]], ledger: [], sources: 'note N-01J2AA' },
  ];
  const byId = {}; DOCS.forEach((d) => { byId[d.id] = d; });

  const INGEST = [
    { id: 'lib-01K5DD', tier: 'cross-referenced', proposedBy: 'agent:curator-03', ticket: 'T-000341', distinctness: '3 origins ~heur', age: '2h', eligible: true },
    { id: 'lib-01L6EE', tier: 'cross-referenced', proposedBy: 'agent:curator-07', ticket: 'T-000341', distinctness: '3 origins ~heur', age: '2h', eligible: true },
    { id: 'lib-01M7FF', tier: 'single-source', proposedBy: 'agent:curator-03', ticket: 'T-000355', distinctness: '1 origin (agent-picked ⚠)', age: '4h', eligible: false, note: 'agent-asserted sandbox evidence present → content-bound gate' },
  ];

  const SPOTAUDIT = [
    { id: 'lib-01N8GG', run: 'R-00B2 hv-3f2c9a', covered: '4/5', coveredOk: true, admittedBy: 'svc:sandbox-auto' },
    { id: 'lib-01P9HH', run: 'R-00B4 hv-3f2c9a', covered: '2/6', coveredOk: false, admittedBy: 'svc:sandbox-auto' },
  ];

  const LIFECYCLE = [
    { id: 'lib-01Q0II', status: 'current', appliesTo: 'ubuntu 22.04 amd64', lastVerified: '2025-11-02', flag: 'past valid_until', action: 'Retire' },
    { id: 'lib-01R1JJ', status: 'current', appliesTo: 'ubuntu 20.04 amd64', lastVerified: '2025-08-14', flag: 'distro EOL (CMDB)', action: 'Supersede' },
    { id: 'lib-01S2KK', status: 'superseded', appliesTo: 'ubuntu 24.04 amd64', lastVerified: '2026-06-30', flag: 'superseded_by lib-01T…', action: null },
  ];

  const COLLECTIONS = ['cli-reference', 'distro-guides', 'advisories'];

  const INDEX = { model: 'qwen3-emb-0.6b', digest: '9c1f…', dim: 1024, chunker: 'cc-2a7…', head: 'a9c…', builtAt: '2s ago',
    degraded: [
      { kind: 'semantic', text: 'SEMANTIC RETRIEVAL DEGRADED — agent-runtime unreachable · serving lexical-only' },
      { kind: 'durability', text: 'DURABILITY DEGRADED — corpus push 12 min behind · retrying · admissions record locally (canon)' },
    ], pendingEmbed: 3 };

  window.LB_DATA = { DOCS, byId, INGEST, SPOTAUDIT, LIFECYCLE, COLLECTIONS, INDEX };
})();
