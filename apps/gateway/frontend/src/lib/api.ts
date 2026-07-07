// lib/api.ts — the SINGLE API client for the Gateway operator surface. Every
// /api call goes through here. Same-origin: the proxy's forward-auth injects the
// human principal (a `gateway`-audience UI session), so the SPA never handles a
// token — it only sends `credentials: 'include'`.
//
// Error discipline (drives the sacred R/D split — UI_SPEC §5.4):
//   - a non-2xx with a body → ApiError carrying status + parsed body.
//     4xx = a LOCAL, operator-fixable error → screens render Pattern R (red).
//   - a network/fetch failure (status 0) or a 502/503/504 dependency-down → the
//     system safe-stopped → screens render Pattern D (halt-gold band). NEVER red.
//
// The Gateway is fail-closed: any read that cannot be served honestly degrades
// the figure (STALE / SAFE-STOPPED / CANNOT-CONFIRM); it never fabricates a
// healthy green. This is the app whose whole job is to never lie about whether
// it acted or stopped.

import type {
  AuditResponse,
  CatalogResponse,
  HaltStatus,
  HostsResponse,
  OrphanResponse,
  PromoteInput,
  RunDetail,
  RunsResponse,
  SandboxEvidence,
  SandboxResponse,
  StepUpResult,
} from './types';

const BASE = '/api';

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

// -- Halt status (header mirror + S4 L2-CONFIRMED source) --------------------

/** GET /api/halt-status — the {epoch_seen, level, in_flight_runs, last refuse,
 *  sig} tuple auth reads DIRECTLY as the sole L2-CONFIRMED source. The UI
 *  renders the same tuple (own truth, not a mirror). */
export async function getHaltStatus(): Promise<HaltStatus> {
  return request<HaltStatus>('/halt-status');
}

// -- Runs / hosts (S1, S2) ---------------------------------------------------

export interface RunFilters {
  state?: string; // "active"
  host?: string;
  ticket?: string;
  agent?: string;
  class?: string;
}

/** GET /api/runs — the run list (S1). `?state=active` for the live monitor. */
export async function listRuns(f: RunFilters = {}): Promise<RunsResponse> {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v && q.set(k, v));
  const qs = q.toString();
  return request<RunsResponse>(`/runs${qs ? `?${qs}` : ''}`);
}

/** GET /api/runs/{id} — one run + reconstructed SoD-chain evidence (S2). */
export async function getRun(runId: string): Promise<RunDetail> {
  return request<RunDetail>(`/runs/${encodeURIComponent(runId)}`);
}

/** GET /api/hosts — the per-host lock / fence / health view (S1). */
export async function listHosts(): Promise<HostsResponse> {
  return request<HostsResponse>('/hosts');
}

/** The SSE URL for a run's console tail (LiveStream §5.5). Consumed by the
 *  RunConsole hook — separate from the agent's MCP task channel; it tails the
 *  AUDIT STORE. */
export function runEventsUrl(runId: string): string {
  return `${BASE}/runs/${encodeURIComponent(runId)}/events`;
}

// -- Audit (S3) --------------------------------------------------------------

export interface AuditFilters {
  run?: string;
  host?: string;
  record_type?: string;
  sub?: string;
  verify_from?: number;
}

/** GET /api/audit — the append-only chain browse + `?verify_from=seq` walk. */
export async function getAudit(f: AuditFilters = {}): Promise<AuditResponse> {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v != null && v !== '' && q.set(k, String(v)));
  const qs = q.toString();
  return request<AuditResponse>(`/audit${qs ? `?${qs}` : ''}`);
}

// -- Catalog (S5) ------------------------------------------------------------

/** GET /api/catalog — playbook versions / hashes / sigs / schemas. */
export async function getCatalog(): Promise<CatalogResponse> {
  return request<CatalogResponse>('/catalog');
}

/** POST /api/catalog — vetted change control. Diff-hash-bound ConfirmFriction
 *  full variant; tamper-evident audit row; there is NO MCP path to this write. */
export async function promoteCatalog(input: PromoteInput): Promise<StepUpResult> {
  return request<StepUpResult>('/catalog', { method: 'POST', body: JSON.stringify(input) });
}

// -- Sandbox (S6) ------------------------------------------------------------

/** GET /api/sandbox — tier-0 evidence list (+ optionally the newest detail). */
export async function getSandbox(): Promise<SandboxResponse> {
  return request<SandboxResponse>('/sandbox');
}

/** GET /api/sandbox/{run_id} — one evidence detail. */
export async function getSandboxRun(runId: string): Promise<SandboxEvidence> {
  return request<SandboxEvidence>(`/sandbox/${encodeURIComponent(runId)}`);
}

// -- Orphans (S7) ------------------------------------------------------------

/** GET /api/orphans — the Gateway-local orphan queue (non-terminal runs ⋈
 *  Board holds). NOT the canonical MC ReviewQueue. */
export async function getOrphans(): Promise<OrphanResponse> {
  return request<OrphanResponse>('/orphans');
}

/** POST /api/orphans/{run_id}/reprobe — operator-gated fresh-`release_id` +
 *  read-only probe. Step-up. Never auto-resumes a half-run. */
export async function reprobeOrphan(runId: string): Promise<StepUpResult> {
  return request<StepUpResult>(`/orphans/${encodeURIComponent(runId)}/reprobe`, { method: 'POST' });
}
