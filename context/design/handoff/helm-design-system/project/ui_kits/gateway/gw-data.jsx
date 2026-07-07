/* Helm — Gateway · data. Exposed as window.GW_DATA.
   The Hands: the only component that runs commands on real hosts. Read-first. */
(function () {
  const RUNS = [
    { id: 'R-01HX9Q', host: 'host-db-01', state: 'executing', ticket: 'T-000482', by: 'agent:patcher-07', cls: 'kernel_update', destructive: true, fence: { gen: 47, lease: '04:12', hb: '0.8s', state: 'held' }, sod: [1, 1, 1, 1], task: 'task 6/9 apt-get dist-up…', untrusted: true },
    { id: 'R-01HY2K', host: 'host-web-03', state: 'verifying', ticket: 'T-000501', by: 'agent:patcher-02', cls: 'package_update', destructive: false, fence: { gen: 51, lease: '02:03', hb: '1.1s', state: 'held' }, sod: [1, 1, 1, 1], task: 'Wazuh poll: 2/5 pairs gone' },
    { id: 'R-01HZ7M', host: 'host-nas-01', state: 'frozen', ticket: 'T-000488', by: 'agent:patcher-09', cls: 'reboot', destructive: true, fence: { gen: 40, lease: '00:44', hb: '2.0s', state: 'held' }, sod: [1, 1, 1, 1], task: 'run halted at task boundary' },
    { id: null, host: 'host-mail-02', state: 'idle', ticket: null, by: null, cls: null, destructive: false, fence: null, sod: null, task: 'no active run · last done 22m' },
    { id: 'R-01HP3F', host: 'host-x', state: 'failed', ticket: 'T-000701', by: 'agent:patcher-11', cls: 'package_update', destructive: false, sod: [0], reject: 'STALE_FENCE', task: 'rejected preflight' },
  ];
  const byId = {}; RUNS.forEach((r) => { if (r.id) byId[r.id] = r; });

  const AUDIT = [
    { seq: 41802, at: '12:04:11', who: 'agent:patcher-07', kind: 'agent', verb: 'dispatch', target: 'R-01HX', outcome: 'executing', ok: true },
    { seq: 41801, at: '12:04:10', who: 'svc:gateway', kind: 'service', verb: 'cred_redeem', target: 'cred://', outcome: 'ok', ok: true },
    { seq: 41800, at: '12:04:02', who: 'operator:ada', kind: 'operator', verb: 'catalog_promote', target: 'patch_debian v5', outcome: 'ok', ok: true },
    { seq: 41799, at: '12:03:57', who: 'agent:patcher-11', kind: 'agent', verb: 'dispatch', target: 'host-x', outcome: 'STALE_FENCE', ok: false },
  ];

  const KILL = { level: 'G1', epoch: 4471, inFlight: 1, refuseAt: '12:04:09', confirmed: 2, pending: 0, draining: 1, drainDetail: 'R-01HZ… host-nas-01 · dpkg · will finish+log' };

  const CATALOG = [
    { key: 'patch_debian', ver: 'v4', sha: '9f3a…b1', cls: 'package_update', rollback: 'snapshot', sig: 'ed', state: 'active' },
    { key: 'reboot_host', ver: 'v2', sha: 'a180…44', cls: 'reboot', rollback: 'none', sig: 'ed', state: 'active' },
    { key: 'sbx_pytest', ver: 'v2', sha: '4400…aa', cls: 'sandbox_exec', rollback: 'n/a', sig: 'ed', state: 'active' },
    { key: 'patch_debian', ver: 'v5', sha: 'ee02…7d', cls: 'package_update', rollback: 'snapshot', sig: 'pending', state: 'pending' },
  ];

  const SANDBOX = [
    { id: 'R-01HS4A', ticket: 'T-000733', profile: 'sbx_pytest', exit: 0, harness: 'hv-4c1a…', finished: '11:58', input: 'note nt-…@rev14', transcript: '===== 12 passed in 3.41s =====', env: 'image sha256:… · py3.12 · pytest8.2' },
    { id: 'R-01HR2B', ticket: 'T-000730', profile: 'sbx_lint', exit: 2, harness: 'hv-4c1a…', finished: '11:41', input: 'note nt-…@rev9', transcript: 'E501 line too long (94 > 88)', env: 'image sha256:… · py3.12 · ruff0.4' },
  ];

  const ORPHANS = [
    { id: 'R-01HP8G', host: 'host-fs-04', stateAtCrash: 'executing', ticket: 'T-000701', by: 'agent:patcher-05', crashed: '11:12 task 4/7', hold: 39, probe: 'reachable ✔ · reboot marker present ⚠', reason: 'orphaned' },
  ];

  window.GW_DATA = { RUNS, byId, AUDIT, KILL, CATALOG, SANDBOX, ORPHANS };
})();
