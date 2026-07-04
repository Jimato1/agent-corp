/* Helm — Vault · data. Exposed as window.VT_DATA.
   Secrets custody: create/rotate authority but NEVER read a secret back. */
(function () {
  const SECRETS = [
    { handle: 'cred://hosts/nas-01/admin-login', host: 'nas-01', kind: 'kv', rotation: '90d', due: '▲ due 3d', lastWrite: '2026-06-30', approvalClass: 'root', versions: ['v7 2026-06-30', 'v6 2026-03-31', 'v5 2025-12-31'] },
    { handle: 'cred://hosts/sw-core/enable', host: 'sw-core', kind: 'kv', rotation: 'manual', due: '', lastWrite: '2026-05-11', approvalClass: 'admin', versions: ['v2 2026-05-11'] },
    { handle: 'cred://hosts/nas-01/root', host: 'nas-01', kind: 'ssh-ca', rotation: 'CA-signed', due: '', lastWrite: '—', approvalClass: 'root', versions: [] },
  ];

  const HOSTS = [
    { host: 'nas-01', role: 'gateway-nas-01', roleOk: true, principals: 'root', ntp: 'ok', caKeys: '✔ 2026-06-01', state: 'ready' },
    { host: 'sw-core', role: 'gateway-sw-core', roleOk: false, principals: 'svc-deploy', ntp: 'ok', caKeys: '▲ not yet', state: 'staged' },
    { host: 'db-02', role: null, principals: '—', ntp: '—', caKeys: '—', state: 'new' },
  ];

  const EXFIL = [
    { ts: '2026-07-03 09:14', sub: 'agent:recon-04', kind: 'agent', outcome: '403 not_gateway', ticket: 'T-000512' },
    { ts: '2026-07-03 02:41', sub: '(no channel cert)', kind: null, outcome: '403 not_gateway_channel', ticket: null },
  ];
  const LEDGER = [
    { ts: '07-03 09:20:11', sub: 'svc:gateway', kind: 'service', action: 'redeem', target: 'T-000123·nas-01', outcome: 'CONFIRMED', ok: true, sinks: '✔✔', prov: 'gateway-delivered' },
    { ts: '07-03 08:55:03', sub: 'svc:gateway', kind: 'service', action: 'redeem', target: 'T-000120·db-02', outcome: 'approval_not_consumed', ok: false, sinks: '✔✔', prov: null },
    { ts: '07-03 08:40:20', sub: 'svc:gateway', kind: 'service', action: 'sign_cert', target: 'T-000118·sw-core', outcome: 'CONFIRMED', ok: true, sinks: '✔✔', prov: 'gateway-delivered' },
  ];

  const RELEASES = [
    { id: 'rel-01HX9K', handle: 'cred://hosts/nas-01/root', ticket: 'T-000123', by: 'agent:patcher-07', status: 'pending', expires: '23:41:12' },
    { id: 'rel-01HX8Z', handle: 'cred://hosts/db-02/admin', ticket: 'T-000120', by: 'agent:recon-05', status: 'redeemed', expires: '—' },
    { id: 'rel-01HX7Q', handle: 'cred://hosts/sw-core/enable', ticket: 'T-000118', by: 'agent:patcher-09', status: 'revoked', expires: '—' },
  ];

  const STATUS = {
    seal: 'UNSEALED', sealAge: '1s', unsealer: 'healthy', sealTokenTtl: '21d',
    quorum: '3-of-5 shares · escrowed offline', quorumTest: '2026-06-15 ▲',
    sinks: 'local + WORM current', kill: 'G0', backup: 'raft snapshot age 6h ✔',
    caFingerprint: 'SHA256:1a2b…9f', breakGlass: 'nas-01 2026-06-20 ✔ · db-02 2026-04-02 ▲ overdue',
  };

  window.VT_DATA = { SECRETS, HOSTS, EXFIL, LEDGER, RELEASES, STATUS };
})();
