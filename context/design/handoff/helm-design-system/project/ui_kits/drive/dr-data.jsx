/* Helm — Drive · data. Exposed as window.DR_DATA.
   Artifact store keyed by originating ticket; provenance + honest verification. */
(function () {
  const GROUPS = [
    { ticket: 'T-000123', verify: 'verified', count: 4, size: '1.2 GiB', lastWrite: '2m', source: 'board',
      artifacts: [
        { name: 'report.pdf', seq: 'v3', mime: 'pdf', size: '4.1 MB', createdBy: 'agent:patcher-07', kind: 'agent', tier: 'verified', when: '2m', fence: { gen: 47, state: 'held' } },
        { name: 'report.preview.pdf', seq: 'v1', mime: 'pdf', size: '3.9 MB', createdBy: 'svc:drive', kind: 'service', tier: 'derived', when: '2m', fence: null },
        { name: 'metrics.csv', seq: 'v2', mime: 'text/csv', size: '84 KB', createdBy: 'agent:patcher-07', kind: 'agent', tier: 'verified', when: '4m', fence: { gen: 47, state: 'held' } },
        { name: 'diagram.png', seq: 'v1', mime: 'image/png', size: '220 KB', createdBy: 'agent:patcher-07', kind: 'agent', tier: 'verified', when: '5m', fence: { gen: 47, state: 'held' } },
      ] },
    { ticket: 'T-000119', verify: 'unverified_pending', count: 2, size: '512 KB', lastWrite: '18m', source: 'board', note: 'Board unreachable; recheck queued',
      artifacts: [ { name: 'export.json', seq: 'v1', mime: 'application/json', size: '512 KB', createdBy: 'agent:indexer-02', kind: 'agent', tier: 'single-source', when: '18m', fence: { gen: 31, state: 'held' } } ] },
    { ticket: 'T-000101', verify: 'verified_absent', count: 1, size: '2.1 MB', lastWrite: '3h', source: 'board', note: 'delete-marked → Admin escalation queue',
      artifacts: [ { name: 'report-old.pdf', seq: 'v1', mime: 'pdf', size: '2.1 MB', createdBy: 'agent:x-09', kind: 'agent', tier: 'single-source', when: '3h', fence: { gen: 46, state: 'superseded', supBy: 47 } } ] },
  ];

  const DETAIL = {
    ticket: 'T-000123', name: 'report.pdf', mime: 'pdf', sha: '3f9a…c1', tier: 'verified', createdBy: 'agent:patcher-07',
    versions: [
      { seq: 'v3', when: '2m ago', who: 'agent:patcher-07', kind: 'agent', hash: '3f9a…c1', fence: { gen: 47, state: 'held' }, current: true },
      { seq: 'v2', when: '40m ago', who: 'operator:ada', kind: 'operator', hash: 'a1b2…9c', fence: null },
      { seq: 'v1', when: '1h ago', who: 'agent:patcher-07', kind: 'agent', hash: '77aa…02', fence: { gen: 46, state: 'superseded', supBy: 47 } },
    ],
  };

  const HEALTH = { watermark: [71, 90], backup: '6h ago', backupStale: false, verify: 'scrub clean 2d', journals: 'closed' };
  const ABSENT = [ { ticket: 'T-000101', name: 'report-old.pdf', by: 'agent:x-09', reason: 'ticket_not_found' } ];
  const GC = { phase1: '3 temps swept · 1 orphan past grace', chains: 12, refcount0: 8, reclaim: '4.2 GiB' };
  const AUDIT = [
    { at: '12:04:11Z', who: 'operator:ada', kind: 'operator', verb: 'gc_purge', target: '8 blobs', outcome: 'done' },
    { at: '11:58:02Z', who: 'agent:patcher-07', kind: 'agent', verb: 'stale_fence_rejected', target: 'T-000123', outcome: 'STALE_FENCING' },
    { at: '11:40:19Z', who: 'operator:ada', kind: 'operator', verb: 'delete_mark', target: 'report-old.pdf', outcome: 'done' },
  ];

  window.DR_DATA = { GROUPS, DETAIL, HEALTH, ABSENT, GC, AUDIT };
})();
