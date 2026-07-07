// lib/api.ts — the SINGLE API client. Every /api call goes through here.
// Same-origin: the proxy's forward-auth injects identity, so the SPA never
// handles a token — it only sends `credentials: 'include'`.
//
// Error discipline (drives the sacred R/D split in the UI):
//   - a non-2xx with a JSON/So body → ApiError carrying status + parsed body.
//     4xx = a LOCAL, operator-fixable error → screens render Pattern R (red).
//   - a network/fetch failure (status 0) or a 503 dependency-down → the system
//     safe-stopped → screens render Pattern D (gold band). NEVER a red error.

import type {
  AckBulkResult,
  AckResult,
  Broadcast,
  BroadcastsResponse,
  Envelope,
  HealthResponse,
  HealthSignal,
  NotificationsPage,
} from './types';

const BASE = '/api';

/** A structured API error carrying the HTTP status + parsed body so screens can
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
    // status 0 = fetch/network failure; 502/503/504 = dependency failed closed.
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

// -- Notifications -----------------------------------------------------------

export interface ListNotificationsParams {
  kind?: string;
  min_priority?: number;
  agent_id?: string;
  ticket_id?: string;
  acked?: boolean;
  /** A notification_id cursor — return items after it. */
  since?: string;
  limit?: number;
}

/** GET /api/notifications — history page (cursor-paginated). */
export async function listNotifications(params: ListNotificationsParams = {}): Promise<NotificationsPage> {
  const q = new URLSearchParams();
  if (params.kind) q.set('kind', params.kind);
  if (params.min_priority != null) q.set('min_priority', String(params.min_priority));
  if (params.agent_id) q.set('agent_id', params.agent_id);
  if (params.ticket_id) q.set('ticket_id', params.ticket_id);
  if (params.acked != null) q.set('acked', String(params.acked));
  if (params.since) q.set('since', params.since);
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return request<NotificationsPage>(`/notifications${qs ? `?${qs}` : ''}`);
}

/** GET /api/notifications/{id} — a single envelope (the deep-link landing). */
export async function getNotification(id: string): Promise<Envelope> {
  return request<Envelope>(`/notifications/${encodeURIComponent(id)}`);
}

/** POST /api/notifications/{id}/ack — acknowledge one (a light confirm). */
export async function ackNotification(id: string): Promise<AckResult> {
  return request<AckResult>(`/notifications/${encodeURIComponent(id)}/ack`, { method: 'POST' });
}

/** POST /api/notifications/ack — acknowledge everything up to a sequence. */
export async function ackBulk(upToSeq: number, kind?: string): Promise<AckBulkResult> {
  return request<AckBulkResult>('/notifications/ack', {
    method: 'POST',
    body: JSON.stringify(kind ? { up_to_seq: upToSeq, kind } : { up_to_seq: upToSeq }),
  });
}

// -- Broadcasts --------------------------------------------------------------

/** GET /api/broadcasts?active=true — the operator→fleet advisories. */
export async function listBroadcasts(activeOnly = false): Promise<Broadcast[]> {
  const qs = activeOnly ? '?active=true' : '';
  const res = await request<BroadcastsResponse>(`/broadcasts${qs}`);
  return res.broadcasts;
}

export interface PostBroadcastInput {
  body: string;
  priority: number;
  expires_at?: string;
}

/** POST /api/broadcasts — post a new advisory (a light confirm). */
export async function postBroadcast(input: PostBroadcastInput): Promise<Broadcast> {
  return request<Broadcast>('/broadcasts', { method: 'POST', body: JSON.stringify(input) });
}

/** POST /api/broadcasts/{id}/revoke — withdraw an active advisory (DangerAction, light, toward LESS). */
export async function revokeBroadcast(id: string): Promise<Broadcast> {
  return request<Broadcast>(`/broadcasts/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
}

// -- Health ------------------------------------------------------------------

/** GET /api/health/signals — the doorbell's own liveness rows. */
export async function getHealthSignals(): Promise<HealthSignal[]> {
  const res = await request<HealthResponse>('/health/signals');
  return res.signals;
}

/** The absolute URL of the SSE feed (EventSource opens this directly). A cursor
 *  can be passed as `?since=`; on reconnect the browser also sends Last-Event-ID. */
export function feedUrl(since?: string): string {
  return `${BASE}/feed${since ? `?since=${encodeURIComponent(since)}` : ''}`;
}
