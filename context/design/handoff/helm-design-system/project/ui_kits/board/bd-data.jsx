/* Helm — Board · data model
   The coordination spine: tickets across the 11-state lifecycle, the Board-owned
   approval record, ceremony state, escalations, standing triggers, WIP policy,
   violations, and the (non-hash-chained) audit log. Exposed as window.BD_DATA. */
(function () {
  const EPOCH = 4471;

  // 11-state lifecycle column defs (approved+executing share the "hot" column).
  const COLUMNS = [
    { key: 'todo',              glyph: '○', label: 'todo',              total: 12 },
    { key: 'in_progress',       glyph: '◐', label: 'in_progress',      total: 7 },
    { key: 'awaiting_approval', glyph: '▲', label: 'awaiting_approval', total: 4 },
    { key: 'hot',               glyph: '✔', label: 'approved + executing', total: 3, states: ['approved', 'executing'] },
    { key: 'verifying',         glyph: '⧗', label: 'verifying',        total: 2 },
    { key: 'needs_review',      glyph: '◈', label: 'needs_review',      total: 5 },
  ];

  const T = (o) => Object.assign({ lane: 'lightweight', taint: 'single', priority: 'P2', deps: { blocks: [], blockedBy: [] } }, o);

  const TICKETS = [
    T({ id: 'T-000142', title: 'Curate Wazuh alert → remediation plan', type: 'curation', state: 'todo', lane: 'full', taint: 'untrusted', priority: 'P1', claimedBy: null, epic: 'T-000100', host: 'web-prod-02' }),
    T({ id: 'T-000150', title: 'Add rate-limit to /ingest', type: 'feature', state: 'todo', taint: 'verified', priority: 'P3', claimedBy: null, epic: 'T-000100' }),
    T({ id: 'T-000151', title: 'Rotate quarterly TLS certs', type: 'chore', state: 'todo', taint: 'verified', priority: 'P2', claimedBy: null }),

    T({ id: 'T-000118', title: 'Reindex search shard 12', type: 'task', state: 'in_progress', taint: 'single', priority: 'P2', claimedBy: 'agent:patcher-07', kind: 'agent', fence: { gen: 47, lease: '04:12', hb: '0.8s', state: 'held', holdKind: 'claim' }, epic: 'T-000100' }),
    T({ id: 'T-000131', title: 'Backfill audit index', type: 'task', state: 'in_progress', taint: 'single', priority: 'P3', claimedBy: 'agent:indexer-02', kind: 'agent', fence: { gen: 31, lease: '00:41', hb: '6.4s', state: 'aging', holdKind: 'claim' } }),

    T({ id: 'T-000097', title: 'Patch CVE-2026-1234 on web fleet', type: 'package_update', state: 'awaiting_approval', lane: 'full', taint: 'untrusted', priority: 'P1', claimedBy: 'agent:patcher-07', kind: 'agent', host: 'web-prod-02', epic: 'T-000100', spawnedBy: 'agent:patcher-07', depth: 2, cap: 4,
        plan: { notesRev: 'nt-8831@7', hash: 'sha256:9f2c…a1e0', line: 'Patch CVE-2026-1234 on web-01/02/03 · canary web-03 first · rollback: snapshot', radius: '3 hosts, tier-2, in-window 02:00–04:00', verify: 'Wazuh active→solved' },
        approval: null,
        allowlist: [
          { seq: 1, playbook: 'nginx.upgrade', params: 'sha256:a1…', host: 'web-prod-02', cls: 'standard' },
          { seq: 2, playbook: 'service.restart', params: 'sha256:b2…', host: 'web-prod-02', cls: 'standard' },
        ],
        cmdb: { mode: 'ask', inWindow: true, decision: 'cmdb-77f2', age: '3s' },
        ceremony: {
          phases: [ ['triage', 'done'], ['recon', 'done'], ['planning', 'current'], ['adversarial_review', 'todo'], ['backlog', 'todo'], ['execute', 'todo'], ['retro', 'todo'] ],
          round: [2, 3], timebox: '07:41', paused: false, veto: 'raised', dissent: 1, poDecision: 'pending',
          roster: { PO: 'agent:po-01', SM: 'agent:sm-01', SEC: 'agent:sec-03', AR: 'agent:ar-01' },
        } }),
    T({ id: 'T-000210', title: 'Restart web-api on host-07', type: 'task', state: 'awaiting_approval', lane: 'lightweight', taint: 'single', priority: 'P2', claimedBy: 'agent:sre-01', kind: 'agent', host: 'host-07',
        plan: { notesRev: 'nt-8840@2', hash: 'sha256:c4…d1', line: 'Restart web-api (graceful drain 30s)', radius: '1 service, tier-3', verify: 'health 200 ×3' },
        allowlist: [ { seq: 1, playbook: 'service.restart', params: 'sha256:c4…', host: 'host-07', cls: 'standard' } ],
        cmdb: { mode: 'ask', inWindow: true, decision: 'cmdb-77f9', age: '5s' }, approval: null }),

    T({ id: 'T-000081', title: 'Promote canary to 100%', type: 'deploy', state: 'executing', lane: 'full', taint: 'verified', priority: 'P1', claimedBy: 'agent:deployer-2', kind: 'agent', host: 'prod-fleet', fence: { gen: 48, lease: '01:03', hb: '0.7s', state: 'held', holdKind: 'execution' },
        approval: { id: 'appr-4471a', actionClass: 'standard', approver: 'operator:ada', fourEyes: 'satisfied', consumedBy: 'run-90f2', runId: 'run-90f2' } }),
    T({ id: 'T-000088', title: 'Apply migration 0042', type: 'migration', state: 'approved', lane: 'full', taint: 'verified', priority: 'P1', claimedBy: 'agent:migrator-1', kind: 'agent', host: 'db-prod-01',
        approval: { id: 'appr-4470c', actionClass: 'sod-critical', approver: 'operator:ada', fourEyes: 'satisfied', consumedBy: null, runId: null } }),

    T({ id: 'T-000076', title: 'Verify Wazuh alert resolved', type: 'verify', state: 'verifying', taint: 'single', priority: 'P2', claimedBy: 'agent:sre-01', kind: 'agent', fence: { gen: 51, lease: '01:44', hb: '1.9s', state: 'aging', holdKind: 'claim' }, host: 'nas-01' }),

    T({ id: 'T-000070', title: 'Weekly digest — human review', type: 'review', state: 'needs_review', taint: 'single', priority: 'P3', claimedBy: 'agent:summarizer-9', kind: 'agent', reviewReason: 'window_ambiguity' }),
    T({ id: 'T-000188', title: 'Recon plan escalated', type: 'plan', state: 'needs_review', taint: 'single', priority: 'P2', claimedBy: 'agent:recon-05', kind: 'agent', reviewReason: 'board_escalation' }),

    // blocked swimlane
    T({ id: 'T-000055', title: 'Enable feature flag rollout', type: 'task', state: 'blocked', taint: 'verified', priority: 'P2', claimedBy: 'agent:deployer-2', kind: 'agent', blockedReason: 'dep-unmet', deps: { blocks: [], blockedBy: ['T-000088'] } }),
    T({ id: 'T-000061', title: 'Compact log volume', type: 'chore', state: 'blocked', taint: 'single', priority: 'P3', claimedBy: 'agent:archivist-5', kind: 'agent', blockedReason: 'superseded', fence: { gen: 46, state: 'superseded', supBy: 47, holdKind: 'claim' } }),
    T({ id: 'T-000064', title: 'Rebuild CI cache', type: 'chore', state: 'blocked', taint: 'verified', priority: 'P3', claimedBy: 'agent:sre-01', kind: 'agent', blockedReason: 'held', fence: { gen: 20, lease: '—', hb: '—', state: 'held', holdKind: 'claim' } }),

    // terminal archive
    T({ id: 'T-000040', title: 'Patch staging hosts', type: 'package_update', state: 'done', taint: 'verified', priority: 'P2', claimedBy: 'agent:patcher-07', kind: 'agent' }),
    T({ id: 'T-000037', title: 'Rollout aborted — canary failed', type: 'deploy', state: 'failed', taint: 'verified', priority: 'P1', claimedBy: 'agent:deployer-2', kind: 'agent' }),
    T({ id: 'T-000033', title: 'Duplicate ticket', type: 'task', state: 'cancelled', taint: 'single', priority: 'P3', claimedBy: null }),
  ];

  const byId = {}; TICKETS.forEach((t) => { byId[t.id] = t; });

  const ESCALATIONS = [
    { kind: 'A1', ticket: 'T-000188', reason: 'timebox_expired', detail: 'huddle round 3 stalled', age: '4m' },
    { kind: 'A1', ticket: 'T-000201', reason: 'unresolved_veto', detail: 'AR veto open past cap', age: '11m' },
    { kind: 'A2', ticket: 'T-000230', reason: 'breakglass_review_ticket', detail: 'break-glass used 03:14 — human clear', age: '44m' },
    { kind: 'quarantine', ticket: 'T-000142', reason: 'unmapped_wazuh_agent', detail: 'host-originated · UNTRUSTED · confirm CMDB mapping', age: '2m' },
    { kind: 'reaper', ticket: null, reason: 'outage_gate_hold', detail: 'fleet-silence 0.62 · BOARD_FLEET_SIZE 20', age: '30s', held: 8 },
  ];

  const TRIGGERS = [
    { name: 'nightly-patch-scan', kind: 'schedule', spec: 'cron 0 2 * * *', filter: '—', child: 'patch.plan', suppress: true },
    { name: 'wazuh-critical', kind: 'event', spec: 'webhook', filter: 'severity>=12', child: 'curation', suppress: false, webhook: { hmac: 'ok', lastFire: '2m ago' } },
    { name: 'weekly-digest', kind: 'schedule', spec: 'cron 0 9 * * 1', filter: '—', child: 'digest', suppress: true },
    { name: 'manual-kickoff', kind: 'manual', spec: '—', filter: '—', child: 'any', suppress: false },
  ];

  const WIP = { global: [22, 30], perAgent: 4, perTeam: 8, lineageCap: 4 };

  const VIOLATIONS = [
    { at: '09:42:10', who: 'agent:migrator-1', kind: 'agent', verb: 'illegal_transition', target: 'T-000088', outcome: 'refused', note: 'agent tried → done' },
    { at: '09:31:44', who: 'agent:recon-05', kind: 'agent', verb: 'stale_fencing', target: 'T-000061', outcome: 'refused', note: 'write under gen46 (superseded)' },
    { at: '08:58:02', who: 'operator:sam', kind: 'operator', verb: 'four_eyes_violation', target: 'T-000210', outcome: 'refused', note: 'approver == proposer' },
  ];

  const AUDIT = [
    { at: '09:44:02', who: 'operator:ada', kind: 'operator', verb: 'approve', target: 'T-000081', outcome: 'minted', prov: 'verified' },
    { at: '09:41:20', who: 'agent:patcher-07', kind: 'agent', verb: 'claim', target: 'T-000118', outcome: 'granted', prov: 'single' },
    { at: '09:39:05', who: 'svc:board-watchdog', kind: 'service', verb: 'escalate', target: 'T-000188', outcome: 'filed', prov: 'verified' },
    { at: '09:36:41', who: 'agent:sre-01', kind: 'agent', verb: 'transition', target: 'T-000076', outcome: 'verifying', prov: 'single' },
  ];

  window.BD_DATA = { EPOCH, COLUMNS, TICKETS, byId, ESCALATIONS, TRIGGERS, WIP, VIOLATIONS, AUDIT,
    blocked: TICKETS.filter((t) => t.state === 'blocked'),
    archive: TICKETS.filter((t) => ['done', 'failed', 'cancelled'].includes(t.state)),
    ticketsIn: (col) => TICKETS.filter((t) => col.states ? col.states.includes(t.state) : t.state === col.key),
  };
})();
