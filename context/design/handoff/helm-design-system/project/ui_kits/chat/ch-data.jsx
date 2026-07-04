/* Helm — Chat · data. Exposed as window.CH_DATA.
   The suite's doorbell: agent→operator notifications + soft operator→fleet broadcast. */
(function () {
  const FEED = [
    { id: 'N-01J8QZ', kind: 'escalation', prio: 5, author: 'agent:patcher-07', akind: 'agent', reason: 'board_escalation', ticket: 'T-000123', body: 'NAS reboot hung — host unreachable, cannot verify patch', age: '2m', repeat: 3, fence: { gen: 46, advisory: true }, acked: false },
    { id: 'N-01J8RA', kind: 'needs_review', prio: 4, author: 'agent:writer-03', akind: 'agent', reason: 'review_ready', ticket: 'T-000210', body: 'Research note ready: safe-patch practice for Wazuh fleet', age: '14m', repeat: 1, acked: false },
    { id: 'N-01J8SB', kind: 'done', prio: 2, author: 'svc:tier-approver', akind: 'service', reason: null, ticket: 'T-000198', body: 'Canary batch patched · Wazuh confirmed active→solved', age: '1h', repeat: 1, acked: true },
    { id: 'N-01J8TC', kind: 'done', prio: 1, author: 'agent:indexer-02', akind: 'agent', reason: null, ticket: 'T-000201', body: 'Reindex shard 12 complete — 4.1M docs, 0 errors', age: '2h', repeat: 1, acked: true },
  ];
  const byId = {}; FEED.forEach((n) => { byId[n.id] = n; });

  const BROADCAST_ACTIVE = { id: 'B-0007', prio: 3, body: 'Maintenance window opens 22:00 UTC — pause non-urgent claims', by: 'operator:ada', posted: '2h', expires: '21h' };
  const BROADCAST_HISTORY = [
    { id: 'B-0007', body: 'Maintenance window opens 22:00 UTC…', by: 'operator:ada', posted: '2h ago', expires: 'in 21h', state: 'active' },
    { id: 'B-0006', body: 'Vault rotation complete — resume normal ops', by: 'operator:ada', posted: '1d ago', expires: 'expired', state: 'expired' },
    { id: 'B-0005', body: 'Draft — do not use', by: 'operator:sam', posted: '2d ago', expires: 'revoked', state: 'revoked' },
  ];

  const HEALTH = [
    { icon: '⟳', label: 'SSE feed', ok: true, detail: 'connected · fresh 0.4s · Last-Event-ID N-01J8… ', source: 'chat' },
    { icon: '📤', label: 'push sink', ok: true, detail: 'ntfy delivering · last ok 12s · gave_up 0', source: 'outbox' },
    { icon: '🗄', label: 'DB size', ok: true, detail: '0.4 GB / 2.0 GB guard (CHAT_DB_SIZE_GUARD)', source: 'chat' },
    { icon: '💾', label: 'backup', ok: true, detail: 'last 06:00 (7h ago) · 30 dailies · 12 monthlies', source: 'chat' },
    { icon: '🔗', label: 'resolve feed', ok: false, detail: 'awaiting mc:read grant → deep-links on fallback', source: 'mc', pending: true },
  ];

  window.CH_DATA = { FEED, byId, BROADCAST_ACTIVE, BROADCAST_HISTORY, HEALTH };
})();
