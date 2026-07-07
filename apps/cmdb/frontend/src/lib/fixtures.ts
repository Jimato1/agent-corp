// lib/fixtures.ts — the OFFLINE fallback, mapped from the Helm CMDB kit's
// cm-data.jsx demo data (plus the UI_SPEC worked examples) into the real
// backend contract shapes. Used ONLY when the live API is unreachable, so the
// console stays fully viewable offline (the shell marks it clearly as demo
// data). The live API is always the primary path.

import type {
  CatalogRow,
  DecisionLog,
  DiscoveredAgent,
  EscalationOutbox,
  FleetResponse,
  HostFact,
  HostRecord,
  JwksStatus,
  PolicyChangeLog,
  ProposeResult,
  SandboxPool,
  SuitePosture,
  TaskTypeRow,
  TierRow,
  VerdictTraceResult,
  WazuhSyncStatus,
} from './types';

// -- Suite posture -----------------------------------------------------------

export const FIXTURE_POSTURE: SuitePosture = {
  kill_level: 'G0',
  confirmed: 0,
  pending: 0,
  draining: 0,
  policy_head: '9f3a2c',
  policy_age: '0.4s',
  step_up_fresh: true,
  operator: 'operator:ada',
  gate_degraded: false,
};

// -- Fleet -------------------------------------------------------------------

export const FIXTURE_FLEET: FleetResponse = {
  total: 21,
  as_of: '8s',
  hosts: [
    { host_id: 'nas-01', criticality: 'tier0', class: 'managed', window_state: 'closed', mode: 'ask', wazuh_state: 'synced', wazuh_age: '3m', lifecycle: 'active' },
    { host_id: 'web-04', criticality: 'tier2', class: 'managed', window_state: 'in_window', window_detail: '01:42', mode: 'auto', wazuh_state: 'synced', wazuh_age: '2m', lifecycle: 'active' },
    { host_id: 'db-02', criticality: 'tier1', class: 'managed', window_state: 'freeze_active', mode: 'ask', wazuh_state: 'stale', wazuh_age: '41m', lifecycle: 'stale' },
    { host_id: 'mail-03', criticality: 'unpolicied', class: 'managed', window_state: 'deny_no_policy', mode: null, wazuh_state: 'synced', wazuh_age: '1m', lifecycle: 'needs_tiering' },
    { host_id: 'app-11', criticality: 'tier2', class: 'managed', window_state: 'closed', mode: 'ask', wazuh_state: 'synced', wazuh_age: '5m', lifecycle: 'active' },
    { host_id: 'cache-02', criticality: 'tier3', class: 'managed', window_state: 'in_window', window_detail: '03:10', mode: 'auto', wazuh_state: 'synced', wazuh_age: '4m', lifecycle: 'active' },
    { host_id: 'sbx-01', criticality: null, class: 'disposable', window_state: 'na', mode: 'auto*', wazuh_state: 'not_enrolled', lifecycle: 'active' },
    { host_id: 'sbx-02', criticality: null, class: 'disposable', window_state: 'na', mode: 'auto*', wazuh_state: 'not_enrolled', lifecycle: 'active' },
  ],
};

// -- Host detail (nas-01, the UI_SPEC §5.2 worked example) -------------------

export const FIXTURE_HOSTS: Record<string, HostRecord> = {
  'nas-01': {
    host_id: 'nas-01',
    criticality: 'tier0',
    class: 'managed',
    lifecycle: 'active',
    bound_by: 'operator:ada',
    bound_at: '2026-06-30',
    wazuh_agent_id: '007',
    posture: {
      window_state: 'closed',
      window_detail: 'CLOSED',
      next_open: 'Sun 22:00 Europe/Oslo',
      reason: 'not_in_window',
      policy_version: '9f3a2c',
      is_head: true,
      modes: [
        { action_class: 'package_update', mode: 'ask' },
        { action_class: 'config_change', mode: 'ask' },
        { action_class: 'service_restart', mode: 'ask' },
        { action_class: 'reboot', mode: 'ask', floor: true },
        { action_class: 'kernel_update', mode: 'ask', floor: true },
        { action_class: 'destructive', mode: 'ask', floor: true },
      ],
    },
    policy: {
      criticality: 'tier0',
      snapshot_capability: 'btrfs',
      on_window_close: 'abort_and_rollback',
      windows: [
        { window_id: 'w-sun-night', kind: 'allow', rrule: 'FREQ=WEEKLY;BYDAY=SU;BYHOUR=22;BYMINUTE=0', tz: 'Europe/Oslo', duration_s: 14400, label: 'Sunday maintenance' },
        { window_id: 'f-quarter-end', kind: 'freeze', rrule: 'FREQ=MONTHLY;BYMONTHDAY=-1', tz: 'Europe/Oslo', duration_s: 86400, label: 'Quarter-end freeze' },
      ],
    },
  },
};

export const FIXTURE_FACTS: Record<string, HostFact[]> = {
  'nas-01': [
    { key: 'os_family', value: 'linux', provenance: 'host_originated' },
    { key: 'arch', value: 'x86_64', provenance: 'host_originated' },
    { key: 'eol_date', value: '2028-04', provenance: 'operator' },
    { key: 'snapshot_capability', value: 'btrfs', provenance: 'policy', note: 'POLICY — see right' },
    { key: 'wazuh.agent_id', value: '007', provenance: 'operator' },
  ],
};

// -- Tiers -------------------------------------------------------------------

export const FIXTURE_TIERS: TierRow[] = [
  {
    tier: 'tier0',
    health_check_timeout_s: 300, ssh_wait_timeout_s: 60,
    defaults: [
      { action_class: 'package_update', mode: 'ask' },
      { action_class: 'reboot', mode: 'deny', floor: true },
      { action_class: 'destructive', mode: 'deny', floor: true },
    ],
  },
  {
    tier: 'tier1',
    health_check_timeout_s: 300, ssh_wait_timeout_s: 60,
    defaults: [
      { action_class: 'package_update', mode: 'ask' },
      { action_class: 'config_change', mode: 'ask' },
      { action_class: 'destructive', mode: 'deny', floor: true },
    ],
  },
  {
    tier: 'tier2',
    health_check_timeout_s: 180, ssh_wait_timeout_s: 45,
    defaults: [
      { action_class: 'package_update', mode: 'auto' },
      { action_class: 'config_change', mode: 'ask' },
      { action_class: 'destructive', mode: 'deny', floor: true },
    ],
  },
  {
    tier: 'tier3',
    health_check_timeout_s: 120, ssh_wait_timeout_s: 30,
    defaults: [
      { action_class: 'package_update', mode: 'auto' },
      { action_class: 'service_restart', mode: 'auto' },
      { action_class: 'destructive', mode: 'deny', floor: true },
    ],
  },
  {
    tier: 'unpolicied',
    health_check_timeout_s: null, ssh_wait_timeout_s: null,
    sentinel: true,
    defaults: [{ action_class: '*', mode: 'deny' }],
  },
];

// -- Task-type registry ------------------------------------------------------

export const FIXTURE_TASK_TYPES: TaskTypeRow[] = [
  { type_key: 'patch_debian', title: 'Debian package update', destructive: true, reversible: true, action_class: 'package_update', external_verifier: 'wazuh_states_disappearance', verification_window_s: 300 },
  { type_key: 'reboot_host', title: 'Reboot host', destructive: true, reversible: false, action_class: 'reboot', external_verifier: 'ssh_probe', verification_window_s: 600 },
  { type_key: 'sbx_pytest', title: 'Sandbox pytest run', destructive: false, reversible: true, action_class: 'sandbox_exec', external_verifier: 'exit_code', verification_window_s: 120 },
];

// -- Runbook catalog ---------------------------------------------------------

export const FIXTURE_CATALOG: CatalogRow[] = [
  { playbook_key: 'patch_debian', action_class: 'package_update', risk_class: 'medium', applicable_tiers: 'tier1-3', rollback_declared: true, rollback_method: 'snapshot', duration_estimate_s: 480, sandbox_eligible: false },
  { playbook_key: 'reboot_host', action_class: 'reboot', risk_class: 'high', applicable_tiers: 'tier2-3', rollback_declared: false, rollback_method: 'none', duration_estimate_s: 300, sandbox_eligible: false },
  { playbook_key: 'sbx_pytest', action_class: 'sandbox_exec', risk_class: 'low', applicable_tiers: '—', rollback_declared: false, rollback_method: 'n/a', duration_estimate_s: 120, sandbox_eligible: true },
];

// -- Sandbox pool ------------------------------------------------------------

export const FIXTURE_SANDBOX: SandboxPool = {
  enabled: true,
  as_of: '5s',
  slots: [
    { host_id: 'sbx-01', class: 'disposable', vault_creds: 'none', verdict: 'permit', verdict_basis: 'sandbox_carve_out' },
    { host_id: 'sbx-02', class: 'disposable', vault_creds: 'none', verdict: 'permit', verdict_basis: 'sandbox_carve_out' },
  ],
};

// -- Discovery ---------------------------------------------------------------

export const FIXTURE_DISCOVERED: DiscoveredAgent[] = [
  { wazuh_agent_id: '013', reported_name: 'web-05', reported_os: 'linux', group_suggestion: 'web' },
  { wazuh_agent_id: '014', reported_name: '??', reported_os: 'unknown', group_suggestion: null },
  { wazuh_agent_id: '021', reported_name: 'cache-02', reported_os: 'linux', group_suggestion: 'cache' },
];

export const FIXTURE_WAZUH_SYNC: WazuhSyncStatus = {
  ok: true,
  stale: false,
  scopes: ['agent:read', 'syscollector:read', 'group:read'],
  version: '4.14.2',
  last_poll: '4m',
};

// -- Dry-run / VerdictTrace (nas-01 · kernel_update · at freeze) -------------

export const FIXTURE_TRACE: VerdictTraceResult = {
  verdict: 'deny',
  host_id: 'nas-01',
  action_class: 'kernel_update',
  at: '2026-07-05 23:30 Oslo',
  policy_version: '9f3a2c',
  evaluated_at: '2026-07-05T23:30:00+02:00',
  valid_until: 'evaluated_at + 60s',
  signed: false,
  effective_close: 'start of freeze (raw close 02:00)',
  reason: ['freeze_active(f-quarter-end)'],
  steps: [
    { ok: true, label: 'host resolved (nas-01)' },
    { ok: true, label: 'snapshot healthy · policy_version 9f3a2c = HEAD' },
    { ok: true, label: 'action_class ∈ enum(7)' },
    { ok: true, label: 'clock healthy (offset 0.3s, NTP-synced)' },
    { ok: true, note: true, label: 'class fork: managed → window algebra' },
    { ok: true, label: 'allow window w-sun-night covers T', detail: 'grace zone open' },
    { ok: false, label: 'freeze f-quarter-end also covers T', detail: 'deny-overrides' },
    { ok: false, note: true, label: 'deny-overrides: effective_close = start of freeze → NOT cleanly in-window' },
  ],
};

// -- History (policy change log) ---------------------------------------------

export const FIXTURE_HISTORY: PolicyChangeLog = {
  chain_state: 'intact',
  remote: 'git@…/cmdb_policy.git',
  local_head_on_remote: true,
  head_behind_tip: false,
  rows: [
    { seq: 3, ts: '12:04:11', who: 'operator:ada', who_kind: 'operator', edit_kind: 'snapshot_cap', target: 'nas-01', weakening: true, diff_hash: '7c1e…a90', git_commit: '9f3a2c', ok: true },
    { seq: 2, ts: '09:15:02', who: 'operator:ada', who_kind: 'operator', edit_kind: 'break_glass', target: 'db-02', weakening: true, diff_hash: '2b40…f11', git_commit: 'a6597c', ok: true },
    { seq: 1, ts: '08:50:44', who: 'operator:ben', who_kind: 'operator', edit_kind: 'add_freeze', target: 'web-04', weakening: false, diff_hash: 'b21f…03', git_commit: '81ac2d', ok: true },
  ],
};

export const FIXTURE_JWKS: JwksStatus = {
  keys: [
    { kid: 'cmdb-verdict-2026-07', alg: 'EdDSA', status: 'active', not_after: '2026-10-01' },
    { kid: 'cmdb-verdict-2026-10', alg: 'EdDSA', status: 'next' },
  ],
};

// -- Decisions ---------------------------------------------------------------

export const FIXTURE_DECISIONS: DecisionLog = {
  as_of: '5s',
  rows: [
    { evaluated_at: '12:04:02', aud: 'gateway', host_id: 'nas-01', action_class: 'kernel_update', verdict: 'deny', decision_id: 'dec-77f2', policy_version: '9f3a2c', verdict_basis: 'freeze_active' },
    { evaluated_at: '12:03:40', aud: 'gateway', host_id: 'web-04', action_class: 'package_update', verdict: 'permit', decision_id: 'dec-77e9', policy_version: '9f3a2c', verdict_basis: 'in_window' },
    { evaluated_at: '12:02:55', aud: 'mcp', host_id: 'db-02', action_class: 'reboot', verdict: 'ask', decision_id: 'dec-77dd', policy_version: '9f3a2c', verdict_basis: 'tier_default' },
    { evaluated_at: '12:01:10', aud: 'gateway', host_id: 'sbx-01', action_class: 'sandbox_exec', verdict: 'permit', decision_id: 'dec-77c1', policy_version: '9f3a2c', verdict_basis: 'sandbox_carve_out' },
  ],
};

// -- Escalation outbox -------------------------------------------------------

export const FIXTURE_ESCALATIONS: EscalationOutbox = {
  svc_present: true,
  board_intake_up: true,
  as_of: '6s',
  rows: [
    { escalation_id: 'esc-01', kind: 'needs_tiering', target: 'mail-03', state: 'delivered', ticket_id: 'T-000481', deep_link: '/mc/review/T-000481' },
    { escalation_id: 'esc-02', kind: 'window_ambiguity', target: 'db-02', state: 'queued', retry: 2 },
    { escalation_id: 'esc-03', kind: 'break_glass_posthoc', target: 'db-02', state: 'delivered', ticket_id: 'T-000480', deep_link: '/mc/review/T-000480' },
    { escalation_id: 'esc-04', kind: 'sandbox_config_error', target: 'sbx-03', state: 'queued' },
  ],
};

// -- Centerpiece: a canned propose result (nas-01 snapshot none→btrfs) -------
// Used offline so the ceremony renders its full BlastRadiusPreview without a
// live /policy/propose round-trip.

export const FIXTURE_PROPOSE: ProposeResult = {
  confirm_token: 'cft_demo_0000',
  diff_hash: '7c1e…a90',
  classification: { weakening: true, reasons: ['snapshot_capability moved off none'] },
  friction: 'full',
  typed_diff: {
    target_kind: 'host',
    key: 'nas-01',
    action: 'upsert',
    before: { snapshot_capability: 'none' },
    after: { snapshot_capability: 'btrfs' },
    reasons: ['snapshot_capability moved off none'],
  },
  blast_radius: {
    cells_made_auto: [
      { host: 'nas-01', action_class: 'package_update', before: 'manual', after: 'auto' },
      { host: 'nas-01', action_class: 'config_change', before: 'ask', after: 'auto' },
      { host: 'nas-01', action_class: 'service_restart', before: 'ask', after: 'auto' },
      { host: 'nas-01', action_class: 'kernel_update', before: 'manual', after: 'auto' },
    ],
    hosts_gain_coverage: 1,
    full_shadow_warnings: [],
  },
  expected_intent: 'WEAKEN nas-01',
  edit_kind: 'snapshot_capability',
};
