// lib/types.ts — the typed contract for the Gateway operator console.
// The UI reads the SAME state the MCP agent surface writes (two views, one
// state — UI_SPEC §12). Every shape here maps to a §12 endpoint. The Gateway is
// fail-closed: any figure that cannot be served honestly degrades to a STALE /
// SAFE-STOPPED / CANNOT-CONFIRM reading — it NEVER fabricates a healthy green.

// -- Kill / posture ----------------------------------------------------------

export type KillLevel = 'G0' | 'G1' | 'G2';

/** GET /api/halt-status — the tuple auth reads DIRECTLY as the sole
 *  L2-CONFIRMED source (§7). The UI renders the exact same tuple, plus the
 *  aftermath triad + the auth L1 epoch mirror it cross-checks against. */
export interface HaltStatus {
  epoch_seen: number;
  level: KillLevel;
  in_flight_runs: number;
  last_dispatch_refused_at: string | null;
  /** signature over the halt-status payload (own truth, not a mirror). */
  sig: string;
  // aftermath triad (HonestState §4.8) — all three always present
  confirmed: number;
  pending: number;
  draining: number;
  draining_detail?: string;
  // auth L1 epoch mirror (FreshnessStamp)
  auth_epoch: number;
  auth_epoch_age?: string;
  auth_epoch_stale?: boolean;
  /** true when the Gateway cannot confirm its OWN halt liveness → Pattern D. */
  own_stale?: boolean;
  // session (forward-auth) context the shell renders
  operator?: string;
  step_up_fresh?: boolean;
}

/** The shell-level posture the GatewayProvider owns (derived from HaltStatus +
 *  the offline flag). Drives the header SYSTEM STATE, the read-only HaltBand,
 *  the KillMirror, and the step-up cue. */
export interface GatewayPosture {
  kill_level: KillLevel;
  epoch_seen: number;
  in_flight_runs: number;
  auth_epoch: number;
  auth_epoch_age?: string;
  auth_epoch_stale?: boolean;
  confirmed: number;
  pending: number;
  draining: number;
  draining_detail?: string;
  last_refuse?: string | null;
  operator?: string;
  step_up_fresh: boolean;
  /** Gateway can't confirm its own halt liveness → SAFE-STOPPED (Pattern D). */
  own_stale?: boolean;
}

// -- Runs / hosts (S1, S2) ---------------------------------------------------

export type RunState =
  | 'preflight'
  | 'executing'
  | 'verifying'
  | 'health_check'
  | 'rolling_back'
  | 'needs_review'
  | 'failed'
  | 'done';

/** A killed run ALWAYS reports failed(halted); the reason enum is shown verbatim. */
export type FailReason =
  | 'halted'
  | 'rolled_back'
  | 'unrecoverable'
  | 'host_unreachable'
  | 'orphaned'
  | 'window_closed'
  | 'credential_denied'
  | 'PLAN_HASH_MISMATCH';

/** Machine reason on a rejected preflight (the hostile-model telemetry, §5). */
export type RejectReason =
  | 'NO_APPROVED_TICKET'
  | 'STALE_FENCE'
  | 'FLOOR_VIOLATION'
  | 'WINDOW_MUST_FIT'
  | 'ALLOWLIST_MISMATCH'
  | 'UNKNOWN_PLAYBOOK'
  | 'PLAN_HASH_MISMATCH'
  | 'CREDENTIAL_DENIED';

/** action_class ∈ {destructive, kernel_update, reboot} carries the warning chip. */
export type ActionClass =
  | 'package_update'
  | 'kernel_update'
  | 'reboot'
  | 'service_restart'
  | 'health_probe'
  | 'sandbox_exec'
  | string;

/** The real-world resource lock (FenceState §4.4): mutex generation + lease
 *  countdown + heartbeat; SUPERSEDED marks a zombie that lost its mutex. */
export interface FenceInfo {
  gen: number;
  lease_remaining?: string; // "04:12"
  heartbeat?: string; // "0.8s"
  superseded?: boolean;
}

/** Collapsed SoD tick (S1 four-tick strip). */
export type SoDTick = 'ok' | 'current' | 'pending' | 'rejected' | 'not_reached';

/** One check row in the full SoD chain (S2). Check 0 is the caller; 1..4 are
 *  approval → policy → credential → mutex. */
export interface SoDCheck {
  n: number;
  name: string; // CALLER / BOARD / CMDB / VAULT / MUTEX
  status: 'ok' | 'current' | 'rejected' | 'not_reached' | 'cannot_confirm';
  summary: string;
  detail?: string;
  /** the evidence artifact this check cites, rendered as a TicketRef variant. */
  evidence_id?: string;
  /** machine reason on a rejected check. */
  reason?: RejectReason | string;
}

export interface RunSummary {
  run_id: string;
  host_id: string;
  ticket_id: string;
  executor: string; // agent:patcher-07
  state: RunState;
  fail_reason?: FailReason;
  action_class: ActionClass;
  fence: FenceInfo;
  /** four collapsed ticks: approval · policy · cred · mutex. */
  sod_ticks: SoDTick[];
  task_line?: string; // "apt-get dist-upgrade…"
  task_index?: string; // "6/9"
  /** host-originated (Wazuh-derived) posture text → UNTRUSTED TierBadge. */
  wazuh_note?: string;
  op_id?: string;
}

export interface HostRow {
  host_id: string;
  state: 'executing' | 'verifying' | 'idle' | 'frozen' | 'draining';
  run?: RunSummary;
  last_ticket?: string;
  last_done_at?: string;
  frozen_level?: KillLevel;
  /** a card that can't be confirmed renders CANNOT-CONFIRM, never a green idle. */
  cannot_confirm?: boolean;
}

export interface HostsResponse {
  hosts: HostRow[];
  fresh_ms?: number;
}

export interface RunsResponse {
  runs: RunSummary[];
  fresh_ms?: number;
}

/** GET /api/runs/{id} — one run + its reconstructed SoD-chain evidence. */
export interface RunDetail extends RunSummary {
  /** Check-0 caller + four checks, reconstructed from the audit chain. */
  checks: SoDCheck[];
  /** true when the run never dispatched (rejected preflight). */
  rejected?: boolean;
  health_check?: string; // "pending" / "healthy" / …
  rollback_path?: string; // "snapshot (available)"
  wazuh_pairs?: string; // verifying-poll readout
}

// -- RunConsole SSE (S1, S2 · §8.2) ------------------------------------------

/** One event off the audit-store SSE tail (LiveStream §5.5). `id` is the
 *  Last-Event-ID cursor; `reset` forces a REST re-sync. */
export interface ConsoleEvent {
  id: string; // "00461"
  kind: 'task' | 'output' | 'cursor' | 'end' | 'reset';
  text: string;
  task_index?: string; // "6/9"
  result?: 'ok' | 'changed' | 'failed' | 'skipped';
}

// -- Audit (S3 · AuditInspector §7.2) ----------------------------------------

export interface AuditRow {
  seq: number;
  time: string;
  who: string;
  who_kind: 'agent' | 'operator' | 'service';
  action: string; // dispatch / cred_redeem / cmdb_verdict / consume_appr …
  target: string; // ticket / run / handle / decision
  outcome: string; // executing / ok / permit / STALE_FENCE …
  outcome_tone: 'ok' | 'reject' | 'pending';
}

/** The chain-verify result — green ONLY on a completed successful walk. */
export interface ChainVerify {
  status: 'verified' | 'cannot_confirm' | 'broken';
  from_seq?: number;
  to_seq?: number;
  count?: number;
  ms?: number;
  broken_at?: number; // set only on status='broken'
}

/** Anchor status vs Mission Control (contract gateway-mc-audit-anchor.md). */
export interface AnchorStatus {
  status: 'in_sync' | 'resync_pending' | 'hole';
  last_head_pushed?: number;
  mc_acked?: number;
  age?: string;
  retention_days?: number;
}

export interface AuditResponse {
  chain_id: string;
  record_count: number;
  age?: string;
  rows: AuditRow[];
  verify: ChainVerify;
  anchor: AnchorStatus;
  /** Postgres audit store unreachable → SAFE-STOPPED (audit-write halts dispatch). */
  degraded?: boolean;
}

// -- Catalog (S5) ------------------------------------------------------------

export interface CatalogRow {
  playbook_key: string;
  version: string; // "v4"
  content_sha256: string;
  action_class: ActionClass;
  rollback: string; // snapshot / dnf_hist / none / n-a
  status: 'active' | 'pending';
  sig: string; // "ed"
  /** on a pending change row: the version it supersedes + its blast radius. */
  from_version?: string;
  blast_hosts?: number;
}

export interface CatalogResponse {
  rows: CatalogRow[];
  /** catalog store unreachable → change control unavailable-by-absence. */
  degraded?: boolean;
}

/** POST /api/catalog body — vetted, diff-hash-bound change control. */
export interface PromoteInput {
  playbook_key: string;
  to_version: string;
  content_sha256: string; // the exact diff hash the confirm binds to
  typed_intent: string;
}

// -- Sandbox (S6 · tier-0 evidence) ------------------------------------------

export interface SandboxRow {
  run_id: string;
  ticket_id: string;
  profile: string; // sbx_pytest / sbx_lint
  exit_code: number;
  harness_version: string;
  finished_at: string;
}

/** The evidence detail (SandboxEvidenceView §8.3): transcript + env fingerprint
 *  + harness attestation + the input/evidence provenance DUALITY. */
export interface SandboxEvidence {
  run_id: string;
  ticket_id: string;
  profile: string;
  exit_code: number;
  harness_version: string;
  env_fingerprint: string; // "image sha256:… · py3.12 · pytest8.2"
  input_ref: string; // "note nt-…@rev14"
  input_untrusted: boolean; // input is host/externally-originated → UNTRUSTED
  evidence_label: string; // "sandbox-verified · gateway-delivered"
  transcript_ref: string; // "blob sha256:… (in audit chain)"
  transcript: string;
  target_note: string; // "fresh podman container · no suite networks · no creds"
}

export interface SandboxResponse {
  harness_version: string;
  rows: SandboxRow[];
  selected?: SandboxEvidence;
  /** CMDB disposable-class set to deny (the operator kill knob) → policy safe-stop. */
  policy_disabled?: boolean;
  /** kill ≥ G1 → new sandbox dispatch refused. */
  frozen?: boolean;
}

// -- Orphans (S7 · Gateway-local operational queue) --------------------------

export interface OrphanRow {
  run_id: string;
  host_id: string;
  ticket_id: string;
  executor: string;
  state_at_crash: RunState;
  crashed_at: string;
  crashed_task?: string; // "mid-task 4/7"
  board_hold_gen: number;
  /** false — an orphan hold is deliberately NOT reaper-eligible. */
  reaper_eligible: boolean;
  probe_needed: boolean;
  probe_result?: string; // "host reachable ✔ · reboot marker present ⚠"
  old_lease?: string;
  lease_expired?: boolean;
  escalation_reason: string; // "orphaned"
  review_href: string; // MC /review/<ticket_id>
  chat_href?: string;
}

export interface OrphanResponse {
  rows: OrphanRow[];
  auto_resolvable: number; // always 0 — never auto-resumes
  /** Board/Vault down → probe/re-redemption safe-stopped; orphans still listed. */
  degraded?: boolean;
}

// -- Writes (operator, step-up, audit-chained) -------------------------------

export interface StepUpResult {
  ok: boolean;
  audit_seq?: number;
}
