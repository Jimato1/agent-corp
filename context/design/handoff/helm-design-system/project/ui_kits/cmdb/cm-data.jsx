/* Helm — CMDB · data. Exposed as window.CM_DATA.
   The policy plane: fleet inventory + the rules that decide "may this host be
   touched right now?" — and the console where the operator authors that policy. */
(function () {
  const FLEET = [
    { host: 'nas-01', tier: 'tier0', cls: 'managed', window: 'CLOSED', mode: 'ask', wazuh: 'SYNCED ⟳3m', wazuhStale: false, lifecycle: 'active' },
    { host: 'web-04', tier: 'tier2', cls: 'managed', window: 'IN-WINDOW 01:42', mode: 'auto', wazuh: 'SYNCED ⟳2m', wazuhStale: false, lifecycle: 'active' },
    { host: 'db-02', tier: 'tier1', cls: 'managed', window: 'FREEZE-ACTIVE', mode: 'ask', wazuh: 'STALE ⟳41m', wazuhStale: true, lifecycle: 'stale' },
    { host: 'sbx-01', tier: null, cls: 'disposable', window: 'n/a', mode: 'auto*', wazuh: 'not enrolled', wazuhStale: false, lifecycle: 'active' },
    { host: 'mail-03', tier: 'unpolicied', cls: 'managed', window: 'deny(no_policy)', mode: '—', wazuh: 'SYNCED ⟳1m', wazuhStale: false, lifecycle: 'needs-tiering' },
  ];

  const HOST = {
    host: 'nas-01', tier: 'tier0', cls: 'managed', lifecycle: 'active',
    window: 'CLOSED · next opens Sun 22:00 Europe/Oslo', reason: 'not_in_window', policyVersion: '9f3a2c',
    modes: 'package_update ask · config_change ask · reboot ask(floor)',
    facts: [ ['os_family', 'linux', 'untrusted'], ['arch', 'x86_64', 'untrusted'], ['eol_date', '2028-04', 'operator'], ['wazuh.agent_id', '007', 'operator'] ],
  };

  const TIERS = [
    { tier: 'tier0', defaults: 'package_update ask · reboot 🔒 floor', hcTimeout: 300, sshWait: 60 },
    { tier: 'tier1', defaults: 'package_update ask · config_change ask', hcTimeout: 300, sshWait: 60 },
    { tier: 'tier2', defaults: 'package_update auto · config_change ask', hcTimeout: 180, sshWait: 45 },
    { tier: 'tier3', defaults: 'package_update auto · restart auto', hcTimeout: 120, sshWait: 30 },
    { tier: 'unpolicied', defaults: 'always deny (sentinel)', hcTimeout: '—', sshWait: '—' },
  ];

  const TASKS = [
    { key: 'patch_debian', destructive: true, reversible: true, cls: 'package_update', verifier: 'wazuh', vwin: 300 },
    { key: 'reboot_host', destructive: true, reversible: false, cls: 'reboot', verifier: 'ssh_probe', vwin: 600 },
    { key: 'sbx_pytest', destructive: false, reversible: true, cls: 'sandbox_exec', verifier: 'exit_code', vwin: 120 },
  ];

  const CATALOG = [
    { key: 'patch_debian', cls: 'package_update', risk: 'medium', tiers: 'tier1-3', rollback: true, method: 'snapshot', sandbox: false },
    { key: 'reboot_host', cls: 'reboot', risk: 'high', tiers: 'tier2-3', rollback: false, method: 'none', sandbox: false },
    { key: 'sbx_pytest', cls: 'sandbox_exec', risk: 'low', tiers: '—', rollback: false, method: 'n/a', sandbox: true },
  ];

  const SANDBOX = [ { host: 'sbx-01', cls: 'disposable', creds: 'none', verdict: 'permit · sandbox_carve_out' } ];

  const DISCOVERY = [
    { agent: '013', name: 'web-05', os: 'linux', group: 'web ~suggestion', },
    { agent: '021', name: 'cache-02', os: 'linux', group: 'cache ~suggestion' },
  ];

  const HISTORY = [
    { ts: '12:04:11', who: 'operator:ada', kind: 'operator', edit: 'snapshot_cap', target: 'nas-01', weakening: true, hash: '7c1e…a90', commit: '9f3a2c', ok: true },
    { ts: '08:50:44', who: 'operator:ben', kind: 'operator', edit: 'add_freeze', target: 'web-04', weakening: false, hash: 'b21f…03', commit: '81ac2d', ok: true },
  ];

  const DECISIONS = [
    { at: '12:04:02', aud: 'gateway', host: 'nas-01', cls: 'kernel_update', verdict: 'deny', jti: 'dec-77f2', pv: '9f3a2c', basis: 'freeze_active' },
    { at: '12:03:40', aud: 'gateway', host: 'web-04', cls: 'package_update', verdict: 'permit', jti: 'dec-77e9', pv: '9f3a2c', basis: 'in_window' },
    { at: '12:02:55', aud: 'mcp', host: 'db-02', cls: 'reboot', verdict: 'ask', jti: 'dec-77dd', pv: '9f3a2c', basis: 'tier_default' },
  ];

  const ESCALATIONS = [
    { kind: 'needs_tiering', target: 'mail-03', state: 'delivered', link: 'mc/review/T-000481' },
    { kind: 'window_ambiguity', target: 'db-02', state: 'queued', link: 'awaiting Board mint' },
    { kind: 'break_glass_posthoc', target: 'db-02', state: 'delivered', link: 'mc/review/T-000480' },
  ];

  window.CM_DATA = { FLEET, HOST, TIERS, TASKS, CATALOG, SANDBOX, DISCOVERY, HISTORY, DECISIONS, ESCALATIONS };
})();
