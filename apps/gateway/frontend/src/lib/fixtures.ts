// lib/fixtures.ts — the OFFLINE fallback, drawn directly from the UI_SPEC §4–§10
// worked wireframes into the real backend contract shapes. Used ONLY when the
// live API is unreachable, so the console stays fully viewable offline (the
// shell + each screen mark it clearly as demo data). The live API is always the
// primary path.

import type {
  AuditResponse,
  CatalogResponse,
  ConsoleEvent,
  GatewayPosture,
  HaltStatus,
  HostsResponse,
  OrphanResponse,
  RunDetail,
  RunSummary,
  RunsResponse,
  SandboxEvidence,
  SandboxResponse,
} from './types';

// -- Posture / halt-status ---------------------------------------------------
// Default demo posture is G0 nominal. Flip FIXTURE_HALT.level to 'G1' to preview
// the engaged states in the shell + S4.

export const FIXTURE_HALT: HaltStatus = {
  epoch_seen: 4471,
  level: 'G0',
  in_flight_runs: 2,
  last_dispatch_refused_at: null,
  sig: 'ed25519:9f3a…b1',
  confirmed: 0,
  pending: 0,
  draining: 0,
  auth_epoch: 4471,
  auth_epoch_age: '0.3s',
  auth_epoch_stale: false,
  own_stale: false,
  operator: 'operator:ada',
  step_up_fresh: true,
};

/** The engaged (G1) halt-status used by S4's "engaged" preview + the aftermath
 *  triad worked example. Never referenced unless a live read returns G1. */
export const FIXTURE_HALT_ENGAGED: HaltStatus = {
  ...FIXTURE_HALT,
  level: 'G1',
  in_flight_runs: 1,
  last_dispatch_refused_at: '12:04:09',
  confirmed: 2,
  pending: 0,
  draining: 1,
  draining_detail: 'R-01HZ… host-nas-01 · dpkg step · will finish + log',
};

export const FIXTURE_POSTURE: GatewayPosture = {
  kill_level: FIXTURE_HALT.level,
  epoch_seen: FIXTURE_HALT.epoch_seen,
  in_flight_runs: FIXTURE_HALT.in_flight_runs,
  auth_epoch: FIXTURE_HALT.auth_epoch,
  auth_epoch_age: FIXTURE_HALT.auth_epoch_age,
  auth_epoch_stale: false,
  confirmed: FIXTURE_HALT.confirmed,
  pending: FIXTURE_HALT.pending,
  draining: FIXTURE_HALT.draining,
  last_refuse: FIXTURE_HALT.last_dispatch_refused_at,
  operator: 'operator:ada',
  step_up_fresh: true,
  own_stale: false,
};

// -- Runs (S1 cards + S2) ----------------------------------------------------

const RUN_DB01: RunSummary = {
  run_id: 'R-01HX9QK4M2',
  host_id: 'host-db-01',
  ticket_id: 'T-000482',
  executor: 'agent:patcher-07',
  state: 'executing',
  action_class: 'kernel_update',
  fence: { gen: 47, lease_remaining: '04:12', heartbeat: '0.8s' },
  sod_ticks: ['ok', 'ok', 'ok', 'ok'],
  task_line: 'apt-get dist-upgrade…',
  task_index: '6/9',
  op_id: '0h2Xq…',
};

const RUN_WEB03: RunSummary = {
  run_id: 'R-01HYB1T7P0',
  host_id: 'host-web-03',
  ticket_id: 'T-000501',
  executor: 'agent:patcher-02',
  state: 'verifying',
  action_class: 'package_update',
  fence: { gen: 51, lease_remaining: '02:03', heartbeat: '1.1s' },
  sod_ticks: ['ok', 'ok', 'ok', 'ok'],
  task_line: 'awaiting post-scan',
  wazuh_note: 'Wazuh poll: 2/5 pairs gone',
  op_id: '0h2Yr…',
};

const RUN_NAS01: RunSummary = {
  run_id: 'R-01HZC3W9Q1',
  host_id: 'host-nas-01',
  ticket_id: 'T-000467',
  executor: 'agent:patcher-04',
  state: 'failed',
  fail_reason: 'halted',
  action_class: 'reboot',
  fence: { gen: 39, lease_remaining: '—', heartbeat: '—' },
  sod_ticks: ['ok', 'ok', 'ok', 'ok'],
  task_line: 'run halted at task boundary',
  op_id: '0h2Zs…',
};

export const FIXTURE_RUNS: RunsResponse = {
  runs: [RUN_DB01, RUN_WEB03, RUN_NAS01],
  fresh_ms: 480,
};

export const FIXTURE_HOSTS: HostsResponse = {
  hosts: [
    { host_id: 'host-db-01', state: 'executing', run: RUN_DB01 },
    { host_id: 'host-web-03', state: 'verifying', run: RUN_WEB03 },
    { host_id: 'host-nas-01', state: 'idle', last_ticket: 'T-000467', last_done_at: '—', run: RUN_NAS01 },
    { host_id: 'host-mail-02', state: 'idle', last_ticket: 'T-000455', last_done_at: '11:04' },
  ],
  fresh_ms: 480,
};

// -- Run detail (S2) — the full four-check + Check-0 chain --------------------

export const FIXTURE_RUN_DETAIL: RunDetail = {
  ...RUN_DB01,
  health_check: 'pending',
  rollback_path: 'snapshot (available)',
  checks: [
    {
      n: 0,
      name: 'CALLER',
      status: 'ok',
      summary: 'token aud=gateway · cnf DPoP ✔ · introspect 210ms',
      detail: 'epoch 4471',
    },
    {
      n: 1,
      name: 'BOARD',
      status: 'ok',
      summary: 'consume_approval → executing',
      detail: 'plan_hash sha256:9f… ✔ matches · allowlist 3/3 bound',
      evidence_id: 'apr-01HX7Q…',
    },
    {
      n: 2,
      name: 'CMDB',
      status: 'ok',
      summary: 'verdict permit · policy_version a1b2',
      detail: 'window closes 02:40 · must-fit ✔ (est 6m ×2 fits)',
      evidence_id: 'dec-01HX7R…',
    },
    {
      n: 3,
      name: 'VAULT',
      status: 'current',
      summary: 'cred by handle cred://hosts/host-db-01/root',
      detail: 'SSH-CA cert key_id=T-000482 · TTL 11m · plaintext: never here',
      evidence_id: 'lse-01HX7S…',
    },
    {
      n: 4,
      name: 'MUTEX',
      status: 'current',
      summary: 'gen 47 · Board hold + pg advisory lock',
      detail: 'fence > 46 ✔',
    },
  ],
};

/** A rejected-preflight run (S2 "Loaded (rejected preflight)" state): the first
 *  failing check is red ✕ with its machine reason; downstream checks greyed. */
export const FIXTURE_RUN_REJECTED: RunDetail = {
  run_id: 'R-01HX7ZZ0AA',
  host_id: 'host-x-02',
  ticket_id: 'T-000499',
  executor: 'agent:patcher-11',
  state: 'failed',
  fail_reason: 'orphaned',
  rejected: true,
  action_class: 'package_update',
  fence: { gen: 12, superseded: true },
  sod_ticks: ['ok', 'ok', 'rejected', 'not_reached'],
  rollback_path: 'n/a (never dispatched)',
  checks: [
    { n: 0, name: 'CALLER', status: 'ok', summary: 'token aud=gateway · cnf DPoP ✔', detail: 'epoch 4471' },
    { n: 1, name: 'BOARD', status: 'ok', summary: 'consume_approval → approved', evidence_id: 'apr-01HX7T…' },
    {
      n: 2,
      name: 'CMDB',
      status: 'rejected',
      summary: 'stale fence rejected at policy check',
      detail: 'the host mutex generation moved under this run',
      reason: 'STALE_FENCE',
    },
    { n: 3, name: 'VAULT', status: 'not_reached', summary: '— not reached' },
    { n: 4, name: 'MUTEX', status: 'not_reached', summary: '— not reached' },
  ],
};

// -- Run console events (S2 · §8.2) — replayed offline to simulate the tail ---

export const FIXTURE_CONSOLE: ConsoleEvent[] = [
  { id: '00457', kind: 'task', text: 'TASK [patch_debian : snapshot rootfs]', task_index: '4/9', result: 'ok' },
  { id: '00458', kind: 'task', text: 'TASK [patch_debian : apt-get update]', task_index: '5/9', result: 'ok' },
  { id: '00459', kind: 'task', text: 'TASK [patch_debian : apt-get dist-upgrade]', task_index: '6/9', result: 'changed' },
  { id: '00460', kind: 'output', text: '  > 47 upgraded, 0 newly installed, 0 to remove …' },
  { id: '00461', kind: 'cursor', text: '(streaming — Last-Event-ID 00461)', task_index: '6/9' },
];

// -- Audit (S3) --------------------------------------------------------------

export const FIXTURE_AUDIT: AuditResponse = {
  chain_id: 'gw-main',
  record_count: 41802,
  age: '1.2s',
  verify: { status: 'verified', from_seq: 41500, to_seq: 41802, count: 302, ms: 1900 },
  anchor: { status: 'in_sync', last_head_pushed: 41800, mc_acked: 41800, age: '4s', retention_days: 180 },
  rows: [
    { seq: 41802, time: '12:04:11.3', who: 'agent:patcher-07', who_kind: 'agent', action: 'dispatch', target: 'R-01HX9QK4M2', outcome: 'executing', outcome_tone: 'pending' },
    { seq: 41801, time: '12:04:10.9', who: 'svc:gateway', who_kind: 'service', action: 'cred_redeem', target: 'cred://hosts/host-db-01/root', outcome: 'ok', outcome_tone: 'ok' },
    { seq: 41800, time: '12:03:58.1', who: 'svc:gateway', who_kind: 'service', action: 'cmdb_verdict', target: 'dec-01HX7R…', outcome: 'permit', outcome_tone: 'ok' },
    { seq: 41799, time: '12:03:57.0', who: 'agent:patcher-11', who_kind: 'agent', action: 'dispatch', target: 'host-x-02', outcome: 'STALE_FENCE', outcome_tone: 'reject' },
    { seq: 41798, time: '12:03:44.2', who: 'svc:gateway', who_kind: 'service', action: 'consume_appr', target: 'apr-01HX7T…', outcome: 'executing', outcome_tone: 'ok' },
    { seq: 41797, time: '12:02:31.7', who: 'operator:ada', who_kind: 'operator', action: 'catalog_promote', target: 'patch_debian v5', outcome: 'ok', outcome_tone: 'ok' },
  ],
};

// -- Catalog (S5) ------------------------------------------------------------

export const FIXTURE_CATALOG: CatalogResponse = {
  rows: [
    { playbook_key: 'patch_debian', version: 'v4', content_sha256: '9f3a…b1', action_class: 'package_update', rollback: 'snapshot', status: 'active', sig: 'ed' },
    { playbook_key: 'patch_rhel', version: 'v3', content_sha256: '2c77…0e', action_class: 'package_update', rollback: 'dnf_hist', status: 'active', sig: 'ed' },
    { playbook_key: 'reboot_host', version: 'v2', content_sha256: 'a180…44', action_class: 'reboot', rollback: 'none', status: 'active', sig: 'ed' },
    { playbook_key: 'service_restart', version: 'v5', content_sha256: '7de1…9c', action_class: 'service_restart', rollback: 'none', status: 'active', sig: 'ed' },
    { playbook_key: 'health_probe', version: 'v3', content_sha256: '11bc…f2', action_class: 'health_probe', rollback: 'n/a', status: 'active', sig: 'ed' },
    { playbook_key: 'sbx_pytest', version: 'v2', content_sha256: '4400…aa', action_class: 'sandbox_exec', rollback: 'n/a', status: 'active', sig: 'ed' },
    { playbook_key: 'patch_debian', version: 'v5', content_sha256: 'ee02…7d', action_class: 'package_update', rollback: 'snapshot', status: 'pending', sig: 'ed', from_version: 'v4', blast_hosts: 12 },
  ],
};

// -- Sandbox (S6) ------------------------------------------------------------

const SBX_EVIDENCE: SandboxEvidence = {
  run_id: 'R-01HS4X2QAA',
  ticket_id: 'T-000733',
  profile: 'sbx_pytest',
  exit_code: 0,
  harness_version: 'hv-4c1a…9d20',
  env_fingerprint: 'image sha256:1e9b…c4 · py3.12 · pytest8.2',
  input_ref: 'note nt-01HS…@rev14',
  input_untrusted: true,
  evidence_label: 'sandbox-verified · gateway-delivered',
  transcript_ref: 'blob sha256:aa71…5f (in audit chain)',
  transcript: '===== test session starts =====\ncollected 12 items\n\ntest_render.py ............                                  [100%]\n\n===== 12 passed in 3.41s =====',
  target_note: 'fresh podman container · no suite networks · no creds mounted',
};

export const FIXTURE_SANDBOX: SandboxResponse = {
  harness_version: 'hv-4c1a…9d20',
  rows: [
    { run_id: 'R-01HS4X2QAA', ticket_id: 'T-000733', profile: 'sbx_pytest', exit_code: 0, harness_version: 'hv-4c1a…', finished_at: '11:58' },
    { run_id: 'R-01HR9P0MBB', ticket_id: 'T-000730', profile: 'sbx_lint', exit_code: 2, harness_version: 'hv-4c1a…', finished_at: '11:41' },
  ],
  selected: SBX_EVIDENCE,
};

export const FIXTURE_SANDBOX_EVIDENCE = SBX_EVIDENCE;

// -- Orphans (S7) ------------------------------------------------------------

export const FIXTURE_ORPHANS: OrphanResponse = {
  auto_resolvable: 0,
  rows: [
    {
      run_id: 'R-01HP7K1ZCC',
      host_id: 'host-fs-04',
      ticket_id: 'T-000701',
      executor: 'agent:patcher-05',
      state_at_crash: 'executing',
      crashed_at: '11:12',
      crashed_task: 'mid-task 4/7',
      board_hold_gen: 39,
      reaper_eligible: false,
      probe_needed: true,
      probe_result: 'host reachable ✔ · reboot marker present ⚠',
      old_lease: 'lse-01HP…',
      lease_expired: true,
      escalation_reason: 'orphaned',
      review_href: '#/mc/review/T-000701',
      chat_href: '#/chat',
    },
  ],
};
