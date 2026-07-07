/* Helm — Mission Control · data model
   Sample fleet, queues, dependencies, anchors, budgets, edge, settings, and the
   kill-switch mirror. Every figure that would be mirrored/streamed in the real
   app carries a `source`/`as-of` so screens can honor the false-green rule.
   Exposed as window.MC_DATA. */
(function () {
  const EPOCH = 4471;

  const DEPENDENCIES = [
    { key: 'auth',    label: 'auth',    ok: true, age: '0.3s' },
    { key: 'board',   label: 'board',   ok: true, age: '2s' },
    { key: 'gateway', label: 'gateway', ok: true, age: '1.1s' },
    { key: 'runtime', label: 'runtime', ok: true, age: '0.8s' },
    { key: 'redis',   label: 'redis',   ok: true, age: '0.6s' },
  ];

  // Fleet roster. liveness: live | suspect | draining | drained | quiesced
  const AGENTS = [
    { sub: 'agent:patcher-07', model: 'patcher@qwen3-32b', session: 's-9f3a',
      liveness: 'suspect', phi: 7.2, hb: '9.4s', step: 41, ticket: 'T-000123',
      fence: { gen: 46, lease: '00:03', hb: '9.4s', state: 'superseded', supBy: 47 },
      budget: { rate: 12, rateTrip: true, conc: [3, 4], cooldown: '42s', cooldownTrip: true, lifetime: 61 },
      flags: [{ type: 'SUPERSEDED', detail: 'gen46 SUPERSEDED by gen47' }], depth: 2, cap: 4, trips: '2 (rate)' },

    { sub: 'agent:indexer-02', model: 'indexer@qwen3-14b', session: 's-2b71',
      liveness: 'live', phi: 1.1, hb: '0.6s', step: 12, ticket: 'T-000217',
      fence: { gen: 47, lease: '04:12', hb: '0.6s', state: 'held' },
      budget: { rate: 34, conc: [3, 4], cooldown: 'idle', lifetime: 22 },
      flags: [{ type: 'NO-PROGRESS', detail: 'longest-since-progress 14m', presizing: true }], depth: 1, cap: 4, trips: '0' },

    { sub: 'agent:sre-01', model: 'sre@qwen3-32b', session: 's-1c40',
      liveness: 'live', phi: 2.0, hb: '0.9s', step: 7, ticket: 'T-000210',
      fence: { gen: 51, lease: '01:44', hb: '0.9s', state: 'held' },
      budget: { rate: 70, conc: [2, 4], cooldown: '18s', cooldownTrip: true, lifetime: 40 },
      flags: [{ type: 'FAIL×3', detail: 'consecutive-failure 3 · cooldown' }], depth: 0, cap: 4, trips: '1 (cooldown)' },

    { sub: 'agent:librarian-3', model: 'librarian@qwen3-14b', session: 's-77aa',
      liveness: 'draining', phi: 0.4, hb: '1.2s', step: null, ticket: null,
      fence: { gen: 19, lease: '—', hb: '1.2s', state: 'held' },
      budget: { rate: 4, conc: [0, 4], cooldown: 'idle', lifetime: 61 }, flags: [], depth: 0, cap: 4, trips: '0' },

    { sub: 'agent:recon-05', model: 'recon@qwen3-14b', session: 's-04d2',
      liveness: 'drained', phi: null, hb: '—', step: null, ticket: null,
      fence: null, budget: { rate: 0, conc: [0, 4], cooldown: 'idle', lifetime: 12 }, flags: [], depth: 0, cap: 4, trips: '0' },

    { sub: 'agent:summarizer-9', model: 'summarizer@qwen3-14b', session: 's-51e8',
      liveness: 'live', phi: 0.8, hb: '0.5s', step: 3, ticket: 'T-000210',
      fence: { gen: 8, lease: '05:00', hb: '0.5s', state: 'held' },
      budget: { rate: 20, conc: [1, 4], cooldown: 'idle', lifetime: 18 }, flags: [], depth: 1, cap: 4, trips: '0' },

    { sub: 'agent:deployer-2', model: 'deployer@qwen3-32b', session: 's-9a12',
      liveness: 'live', phi: 1.5, hb: '0.7s', step: 2, ticket: 'T-000221',
      fence: { gen: 52, lease: '01:03', hb: '0.7s', state: 'held' },
      budget: { rate: 55, conc: [2, 4], cooldown: 'idle', lifetime: 44 }, flags: [], depth: 4, cap: 4, trips: '0' },

    { sub: 'agent:archivist-5', model: 'archivist@qwen3-14b', session: 's-6f5c',
      liveness: 'live', phi: 0.6, hb: '0.9s', step: 5, ticket: 'T-000255',
      fence: { gen: 19, lease: '04:44', hb: '0.9s', state: 'held' },
      budget: { rate: 9, conc: [1, 4], cooldown: 'idle', lifetime: 8 }, flags: [], depth: 1, cap: 4, trips: '0' },
  ];

  const QUEUE = [
    { id: 'T-000123', gate: 'awaiting_approval', prov: 'untrusted', provNote: 'host-orig (Wazuh alert fields)',
      proposer: 'agent:patcher-07', tier: 'tier2', age: '4m', stale: true, reason: 'patch 3 hosts',
      entry: 1, ceremony: 'planning→adversarial ✓',
      plan: { line: 'Patch CVE-2026-1234 on web-01/02/03 · canary web-03 first · rollback: snapshot',
              radius: '3 hosts, tier-2, in-window 02:00–04:00', verify: 'Wazuh active→solved' } },
    { id: 'T-000210', gate: 'awaiting_approval', prov: 'single', provNote: 'single-source',
      proposer: 'agent:sre-01', tier: 'tier3', age: '1m', reason: 'restart svc', entry: 1, ceremony: 'planning ✓',
      plan: { line: 'Restart web-api on host-07 (graceful drain 30s)', radius: '1 service, tier-3', verify: 'health 200 ×3' } },
    { id: 'T-000217', gate: 'needs_review', prov: 'verified', provNote: 'gateway-delivered',
      proposer: 'agent:indexer-02', tier: 'tier2', age: '9m', stale: true, reason: 'index report', entry: 1, ceremony: 'planning→verify ✓',
      plan: { line: 'Reindex shard 12 complete — 4.1M docs, 0 errors', radius: 'read-only artifact', verify: 'checksum match' } },
    { id: 'T-000188', gate: 'escalated', prov: 'agent-authored', provNote: 'agent-authored',
      proposer: 'agent:recon-05', tier: 'tier1', age: '22m', stale: true, reason: 'board_escalation', entry: 1, ceremony: 'planning ✓',
      plan: { line: 'Recon plan escalated by the Board for a human gate', radius: 'plan only', verify: '—' } },
    { id: 'T-000221', gate: 'awaiting_approval', prov: 'verified', provNote: 'gateway-delivered',
      proposer: 'agent:deployer-2', tier: 'tier2', age: '30s', reason: 'rollout gate', entry: 1, ceremony: 'planning→adversarial ✓',
      plan: { line: 'Promote canary to 100% of prod fleet (8 hosts)', radius: '8 hosts, tier-2', verify: 'error-rate < 0.1% for 5m' } },
  ];

  const ANCHORS = [
    { at: '09:44:02', chain: 'gw-main', seq: 4471, hash: '3af9…c1', status: 'retained' },
    { at: '09:38:40', chain: 'gw-main', seq: 4470, hash: 'b1c7…9f', status: 'retained' },
    { at: '09:35:20', chain: 'gw-main', seq: 4469, hash: '77de…20', status: 'retained' },
    { at: '09:31:11', chain: 'gw-main', seq: 4468, hash: '—', status: 'gap' },
  ];

  const EDGE = [
    { app: 'auth',    rps: '142/s', ok: '99.7%', p95: '38ms', authz: 'allow 96% · deny 3% · fail-closed 0', cert: '61d', scrub: '0.0%' },
    { app: 'board',   rps: '88/s',  ok: '99.9%', p95: '52ms', authz: 'allow 98% · deny 2%', cert: '61d', scrub: '0.1%' },
    { app: 'gateway', rps: '210/s', ok: '99.4%', p95: '71ms', authz: 'allow 91% · deny 6% · fail-closed 1', cert: '20d', scrub: '0.4%' },
    { app: 'notes',   rps: '31/s',  ok: '100%',  p95: '29ms', authz: 'allow 99% · redirect 1%', cert: '61d', scrub: '0.0%' },
  ];

  const KILL = {
    level: 'G0', epoch: EPOCH, ageAuth: '0.3s',
    l1: { label: 'L1 (identity, auth)', status: 'enforced', age: '0.3s' },
    l2: { label: 'L2 (physical, gateway)', status: 'confirmed', age: '1.1s', prov: 'AUTH-DIRECT' },
  };

  const SETTINGS = {
    suppress_fraction: '40%', suppress_window: '60s', phi_threshold: '8', noisy_net_phi: '12',
    progress_budget_patcher: 'UNSET',
    silences: [{ sub: 'agent:noisy-1', ttl: '2h' }],
    filters: ['tier-1 destructive', 'needs_review mine'],
  };

  window.MC_DATA = {
    EPOCH, DEPENDENCIES, AGENTS, QUEUE, ANCHORS, EDGE, KILL, SETTINGS,
    counts: {
      online: AGENTS.filter((a) => a.liveness === 'live' || a.liveness === 'suspect').length,
      wedged: 1, zombie: AGENTS.filter((a) => a.fence && a.fence.state === 'superseded').length,
      awaiting: QUEUE.filter((q) => q.gate === 'awaiting_approval').length,
      needsReview: QUEUE.filter((q) => q.gate === 'needs_review').length,
      escalated: QUEUE.filter((q) => q.gate === 'escalated').length,
    },
  };
})();
