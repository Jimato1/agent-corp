// lib/api.ts — the SINGLE API client. Every /api/v1 call goes through here.
// Same-origin: the proxy's forward-auth injects identity, so the SPA never
// handles a token — it only sends `credentials: 'include'`.
//
// Error discipline (drives the sacred R/D split in the UI):
//   - a non-2xx with a body → ApiError carrying status + parsed body.
//     4xx = a LOCAL, operator-fixable error → screens render Pattern R (red).
//   - a network/fetch failure (status 0) or a 502/503/504 dependency-down → the
//     system safe-stopped → screens render Pattern D (halt-gold band). NEVER red.
//
// CMDB is fail-closed: any read that cannot be served honestly degrades the
// figure (STALE / SAFE-STOPPED), it never fabricates a healthy green state.

import type {
  ConfirmResult,
  DecisionLog,
  DiscoveryResponse,
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
  CatalogRow,
  VerdictTraceResult,
  WazuhSyncStatus,
} from './types';

const BASE = '/api/v1';

/** A structured API error carrying HTTP status + parsed body so screens can
 *  choose Pattern R (local, 4xx) vs Pattern D (dependency-down / network). */
export class ApiError extends Error {
  status: number;
  code: string;
  body: unknown;
  /** True when this represents a dependency outage / network failure (Pattern D),
   *  not an operator-fixable local error (Pattern R). */
  isDependency: boolean;

  constructor(message: string, status: number, opts: { code?: string; body?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = opts.code ?? (status === 0 ? 'network_error' : `http_${status}`);
    this.body = opts.body;
    this.isDependency = status === 0 || status === 502 || status === 503 || status === 504;
  }
}

interface ErrorBodyShape {
  error?: { code?: string; message?: string };
  message?: string;
  detail?: string;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  let message = `Request failed (${res.status})`;
  let code: string | undefined;
  try {
    body = await res.json();
    const b = body as ErrorBodyShape;
    message = b?.error?.message ?? b?.message ?? b?.detail ?? message;
    code = b?.error?.code;
  } catch {
    /* non-JSON error body — keep the default message */
  }
  return new ApiError(message, res.status, { code, body });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
      ...init,
    });
  } catch (e) {
    // A fetch rejection is a network failure — Pattern D.
    throw new ApiError(e instanceof Error ? e.message : 'Network request failed', 0);
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// -- Suite posture (header mirror + honest-state echo) -----------------------

/** GET /api/v1/posture — the read-only suite posture (mirrored from auth/MC)
 *  plus CMDB's own gate health (drives the SAFE-STOPPED band). */
export async function getPosture(): Promise<SuitePosture> {
  return request<SuitePosture>('/posture');
}

// -- Fleet / hosts -----------------------------------------------------------

export interface FleetParams {
  tier?: string;
  class?: string;
  window?: string;
}

/** GET /api/v1/hosts — the fleet projection index. */
export async function listFleet(params: FleetParams = {}): Promise<FleetResponse> {
  const q = new URLSearchParams();
  if (params.tier) q.set('tier', params.tier);
  if (params.class) q.set('class', params.class);
  if (params.window) q.set('window', params.window);
  const qs = q.toString();
  return request<FleetResponse>(`/hosts${qs ? `?${qs}` : ''}`);
}

/** GET /api/v1/hosts/<id> — the host record + live-evaluated posture + policy. */
export async function getHost(hostId: string): Promise<HostRecord> {
  return request<HostRecord>(`/hosts/${encodeURIComponent(hostId)}`);
}

/** GET /api/v1/hosts/<id>/facts — the rebuildable inventory-facts mirror. */
export async function getHostFacts(hostId: string): Promise<HostFact[]> {
  const r = await request<{ facts: HostFact[] }>(`/hosts/${encodeURIComponent(hostId)}/facts`);
  return r.facts;
}

// -- Dry-run / explain -------------------------------------------------------

export interface ExplainParams {
  host_id: string;
  action_class: string;
  at?: string;
}

/** GET /api/v1/explain — the advisory UNSIGNED verdict + decision path. */
export async function explain(p: ExplainParams): Promise<VerdictTraceResult> {
  const q = new URLSearchParams({ host_id: p.host_id, action_class: p.action_class });
  if (p.at) q.set('at', p.at);
  return request<VerdictTraceResult>(`/explain?${q.toString()}`);
}

// -- Registries --------------------------------------------------------------

export async function listTiers(): Promise<TierRow[]> {
  return (await request<{ tiers: TierRow[] }>('/tiers')).tiers;
}
export async function listTaskTypes(): Promise<TaskTypeRow[]> {
  return (await request<{ task_types: TaskTypeRow[] }>('/task-types')).task_types;
}
export async function listCatalog(): Promise<CatalogRow[]> {
  return (await request<{ catalog: CatalogRow[] }>('/catalog')).catalog;
}

// -- Sandbox -----------------------------------------------------------------

export async function getSandboxPool(): Promise<SandboxPool> {
  return request<SandboxPool>('/sandbox/pool');
}

// -- Discovery / Wazuh -------------------------------------------------------

export async function listDiscovered(): Promise<DiscoveryResponse> {
  return request<DiscoveryResponse>('/discovered');
}
export async function getWazuhSyncStatus(): Promise<WazuhSyncStatus> {
  return request<WazuhSyncStatus>('/wazuh/sync-status');
}

// -- History / decisions / escalations ---------------------------------------

export async function getPolicyChangeLog(): Promise<PolicyChangeLog> {
  return request<PolicyChangeLog>('/policy-change-log');
}
export async function getVerdictJwks(): Promise<JwksStatus> {
  return request<JwksStatus>('/verdict-jwks');
}

export interface DecisionFilters {
  host_id?: string;
  action_class?: string;
  verdict?: string;
  policy_version?: string;
}
export async function getDecisionLog(f: DecisionFilters = {}): Promise<DecisionLog> {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v && q.set(k, v));
  const qs = q.toString();
  return request<DecisionLog>(`/decision-log${qs ? `?${qs}` : ''}`);
}

export async function getEscalations(): Promise<EscalationOutbox> {
  return request<EscalationOutbox>('/escalations');
}

// -- Writes (human-only) -----------------------------------------------------
// `cmdb:write-policy` HOLDER scope for the ceremony; `cmdb:manage` for benign ops.

/** The write-path target files the ceremony can edit. `key` is the policy-file
 *  key for that kind (host_id / tier name / type_key / playbook_key / 'pool'). */
export type ProposeTargetKind = 'host' | 'tier' | 'task_type' | 'catalog' | 'sandbox_pool';

/** POST /api/v1/policy/propose body — EXACTLY these four fields (the backend
 *  rejects extras). `frontmatter` is the FULL new YAML-frontmatter object for
 *  the target policy file (not a partial patch). */
export interface ProposeInput {
  target_kind: ProposeTargetKind;
  key: string;
  action: 'upsert' | 'delete';
  frontmatter: Record<string, unknown>;
}

/** POST /api/v1/policy/propose — Phase 1: compute typed diff + classification +
 *  blast radius; returns a diff-hash-bound, single-use confirm_token (TTL 5m). */
export async function proposePolicy(input: ProposeInput): Promise<ProposeResult> {
  return request<ProposeResult>('/policy/propose', { method: 'POST', body: JSON.stringify(input) });
}

/** POST /api/v1/break-glass — mints an emergency window / freeze override. Returns
 *  the SAME propose-result shape as /policy/propose; the operator then confirms via
 *  /policy/confirm with typed_intent = the returned expected_intent. */
export interface BreakGlassInput {
  host_id: string;
  minutes: number;
  overrides_freeze: boolean;
  tzid: string;
}
export async function breakGlass(input: BreakGlassInput): Promise<ProposeResult> {
  return request<ProposeResult>('/break-glass', { method: 'POST', body: JSON.stringify(input) });
}

export interface ConfirmInput {
  confirm_token: string;
  typed_intent: string;
  diff_hash: string;
}

/** POST /api/v1/policy/confirm — Phase 2: validate holder token + live-check +
 *  typed-intent + fresh step-up + diff-hash match → commit → push → snapshot
 *  swap → hash-chained change-log row. */
export async function confirmPolicy(input: ConfirmInput): Promise<ConfirmResult> {
  return request<ConfirmResult>('/policy/confirm', { method: 'POST', body: JSON.stringify(input) });
}

// -- Benign ops (cmdb:manage; light ConfirmFriction) -------------------------

export async function triggerSync(): Promise<void> {
  return request<void>('/sync/trigger', { method: 'POST' });
}
// NOTE: there is NO benign /discovered/{id}/bind or /drift/ack endpoint — a Wazuh
// bind is gate-weakening and routes through the propose→confirm ceremony
// (target_kind:'host', action:'upsert' at the unpolicied sentinel). See Discovery.tsx.
export async function resendEscalation(id: string): Promise<void> {
  return request<void>(`/escalations/${encodeURIComponent(id)}/resend`, { method: 'POST' });
}
/** POST /api/v1/sandbox/pool/disable — the operator's sandbox KILL KNOB
 *  (instant, ceremony-free TIGHTENING → every sandbox verdict deny). */
export async function disableSandboxPool(): Promise<void> {
  return request<void>('/sandbox/pool/disable', { method: 'POST' });
}
