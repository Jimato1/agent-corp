// lib/types.ts — the CMDB console contract shapes (over the SAME state the MCP
// surface + the Gateway's binding /v1/decision serve — two views, one state).
// Shapes are kept TOLERANT (most fields optional) so a backend that omits or
// renames a field never blanks the whole console — the UI degrades per figure.

// -- Enumerations ------------------------------------------------------------

/** Host criticality tier — a POLICY classification, NOT provenance.
 *  `unpolicied` is the always-deny sentinel. Rendered by `CriticalityTier`,
 *  never by TierBadge. */
export type CriticalityTierId = 'tier0' | 'tier1' | 'tier2' | 'tier3' | 'unpolicied';

/** Host class. `disposable` = the tier-0 sandbox carve-out. */
export type HostClass = 'managed' | 'disposable';

/** Per-action_class evaluated mode. `deny` is fail-closed / floor. */
export type Mode = 'auto' | 'ask' | 'deny' | 'manual';

/** A PDP verdict outcome. NEVER green in the UI (green = external verification). */
export type Verdict = 'permit' | 'ask' | 'deny';

export type WindowState =
  | 'in_window'
  | 'closed'
  | 'freeze_active'
  | 'deny_no_policy'
  | 'na';

export type Lifecycle = 'active' | 'stale' | 'needs_tiering' | 'retired';

/** Provenance of a resolved fact (drives TierBadge). Wazuh Syscollector facts
 *  are `host_originated` = adversarial input (ARCHITECTURE §12). */
export type FactProvenance = 'host_originated' | 'operator' | 'policy';

/** The seven action classes the PDP forks on (enum(7)). */
export type ActionClass =
  | 'package_update'
  | 'config_change'
  | 'service_restart'
  | 'reboot'
  | 'kernel_update'
  | 'destructive'
  | 'sandbox_exec';

// -- Fleet / hosts -----------------------------------------------------------

/** A projection row for the fleet list (GET /v1/hosts). */
export interface HostRow {
  host_id: string;
  criticality: CriticalityTierId | null;
  class: HostClass;
  window_state: WindowState;
  window_detail?: string | null;
  mode?: string | null;
  wazuh_state?: 'synced' | 'stale' | 'not_enrolled' | null;
  wazuh_age?: string | null;
  lifecycle: Lifecycle;
}

export interface FleetResponse {
  hosts: HostRow[];
  total?: number;
  as_of?: string | null;
}

/** A resolved inventory fact (GET /v1/hosts/<id>/facts). */
export interface HostFact {
  key: string;
  value: string;
  provenance: FactProvenance;
  note?: string | null;
}

/** The live-evaluated posture panel (same evaluate() code path as the Gateway). */
export interface EvaluatedPosture {
  window_state: WindowState;
  window_detail?: string | null;
  next_open?: string | null;
  reason?: string | null;
  policy_version: string;
  is_head?: boolean;
  /** action_class -> mode, with a `floor` flag where the destructive-never-auto
   *  floor pins the cell. */
  modes: { action_class: ActionClass | string; mode: Mode; floor?: boolean }[];
  /** True when evaluate() could not run (snapshot down) → treat as deny. */
  unavailable?: boolean;
}

/** The editable policy half (canonical YAML/markdown, edited via the ceremony). */
export interface HostPolicy {
  criticality: CriticalityTierId | null;
  snapshot_capability?: string | null;
  on_window_close?: 'abort_and_rollback' | 'complete' | 'abort' | string | null;
  windows?: MaintenanceWindow[];
  overrides?: { action_class: string; mode: Mode }[];
}

export interface MaintenanceWindow {
  window_id: string;
  kind: 'allow' | 'freeze' | 'break_glass';
  rrule: string;
  tz: string;
  duration_s: number;
  label?: string | null;
  expires_at?: string | null;
}

export interface HostRecord {
  host_id: string;
  criticality: CriticalityTierId | null;
  class: HostClass;
  lifecycle: Lifecycle;
  posture: EvaluatedPosture;
  policy: HostPolicy;
  bound_by?: string | null;
  bound_at?: string | null;
  wazuh_agent_id?: string | null;
}

// -- Registries --------------------------------------------------------------

export interface TierRow {
  tier: CriticalityTierId;
  defaults: { action_class: string; mode: Mode; floor?: boolean }[];
  health_check_timeout_s: number | null;
  ssh_wait_timeout_s: number | null;
  sentinel?: boolean;
}

export interface TaskTypeRow {
  type_key: string;
  title?: string | null;
  destructive: boolean;
  reversible: boolean;
  action_class: string;
  external_verifier?: string | null;
  verification_window_s?: number | null;
}

export interface CatalogRow {
  playbook_key: string;
  action_class: string;
  risk_class: string;
  applicable_tiers: string;
  rollback_declared: boolean;
  rollback_method?: string | null;
  duration_estimate_s?: number | null;
  sandbox_eligible: boolean;
}

// -- Sandbox -----------------------------------------------------------------

export interface SandboxSlot {
  host_id: string;
  class: 'disposable';
  vault_creds: 'none';
  verdict: Verdict;
  verdict_basis: string;
  config_error?: string | null;
}

export interface SandboxPool {
  enabled: boolean;
  slots: SandboxSlot[];
  as_of?: string | null;
}

// -- Discovery / Wazuh -------------------------------------------------------

export interface DiscoveredAgent {
  wazuh_agent_id: string;
  reported_name?: string | null;
  reported_os?: string | null;
  group_suggestion?: string | null;
}

export interface WazuhSyncStatus {
  ok: boolean;
  stale?: boolean;
  scopes?: string[];
  version?: string | null;
  last_poll?: string | null;
}

export interface DiscoveryResponse {
  agents: DiscoveredAgent[];
}

// -- Dry-run / VerdictTrace --------------------------------------------------

export interface TraceStep {
  ok: boolean;
  label: string;
  detail?: string | null;
  /** A pure information line (no ✔/✕ mark), e.g. a fork header. */
  note?: boolean;
}

/** GET /v1/explain — the ADVISORY, UNSIGNED verdict + decision path. */
export interface VerdictTraceResult {
  verdict: Verdict;
  host_id: string;
  action_class: string;
  at?: string | null;
  policy_version: string;
  evaluated_at?: string | null;
  valid_until?: string | null;
  reason: string[];
  steps: TraceStep[];
  effective_close?: string | null;
  /** Always false/absent — dry-run mints no JWS (mechanically unusable). */
  signed?: false;
  unavailable?: boolean;
}

// -- History / decisions -----------------------------------------------------

export interface PolicyChangeRow {
  seq: number;
  ts: string;
  who: string;
  who_kind?: 'operator' | 'service' | 'agent';
  edit_kind: string;
  target: string;
  weakening: boolean;
  diff_hash: string;
  git_commit: string;
  ok: boolean;
}

export interface PolicyChangeLog {
  rows: PolicyChangeRow[];
  chain_state?: 'intact' | 'cannot_confirm' | 'broken';
  remote?: string | null;
  local_head_on_remote?: boolean;
  head_behind_tip?: boolean;
  as_of?: string | null;
}

export interface DecisionRow {
  evaluated_at: string;
  aud: string;
  host_id: string;
  action_class: string;
  verdict: Verdict;
  decision_id: string;
  policy_version: string;
  verdict_basis: string;
}

export interface DecisionLog {
  rows: DecisionRow[];
  as_of?: string | null;
}

export interface JwksStatus {
  keys: { kid: string; alg: string; status: 'active' | 'next' | 'retiring'; not_after?: string | null }[];
}

// -- Escalation outbox -------------------------------------------------------

export type EscalationKind =
  | 'needs_tiering'
  | 'window_ambiguity'
  | 'break_glass_posthoc'
  | 'missing_from_wazuh'
  | 'policy_integrity_error'
  | 'clock_skew'
  | 'sandbox_config_error'
  | 'dst_gap_window_never_opened';

export interface EscalationRow {
  escalation_id: string;
  kind: EscalationKind | string;
  target: string;
  state: 'delivered' | 'queued';
  retry?: number | null;
  ticket_id?: string | null;
  deep_link?: string | null;
}

export interface EscalationOutbox {
  rows: EscalationRow[];
  svc_present?: boolean;
  board_intake_up?: boolean;
  as_of?: string | null;
}

// -- The centerpiece: gate-weakening ceremony (propose → confirm) ------------

export interface BlastRadiusCell {
  host: string;
  action_class: string;
  before: string;
  after: string;
}

export interface BlastRadius {
  cells_made_auto: BlastRadiusCell[];
  hosts_gain_coverage: number;
  full_shadow_warnings: string[];
}

/** The canonical before/after object diff the backend returns. `before`/`after`
 *  are the full policy frontmatter objects (null on create/delete of a side). */
export interface TypedDiff {
  target_kind: string;
  key: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reasons: string[];
}

/** POST /v1/policy/propose — Phase 1 of the ceremony. The confirm_token is
 *  single-use, TTL 5m, and BOUND to `diff_hash = sha256(rendered diff)`.
 *  Shape mirrors the backend exactly (matches the frozen contract). */
export interface ProposeResult {
  confirm_token: string;
  diff_hash: string;
  classification: { weakening: boolean; reasons: string[] };
  friction: 'full' | 'light';
  typed_diff: TypedDiff;
  blast_radius: BlastRadius;
  /** The intent string the operator must type verbatim for a weakening edit
   *  (empty string for non-weakening). The confirm MUST send exactly this. */
  expected_intent: string;
  edit_kind: string;
}

export interface ConfirmResult {
  committed: string;
  chain_seq: number;
  weakening: boolean;
  pushed: boolean | null;
  degraded: boolean;
  edit_kind: string;
}

/** The suite-posture the header mirror + honest-state echo read (from auth/MC). */
export interface SuitePosture {
  kill_level: 'G0' | 'G1' | 'G2';
  confirmed: number;
  pending: number;
  draining: number;
  policy_head: string;
  policy_age?: string | null;
  step_up_fresh: boolean;
  operator?: string | null;
  /** True when CMDB's own gate cannot serve → SAFE-STOPPED band. */
  gate_degraded?: boolean;
  gate_degraded_reason?: string | null;
}
