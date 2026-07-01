// lib/api.ts — the SINGLE API client. Every /api call goes through here
// (submit job, poll status, download result, cancel). No scattered fetch().
// Mirrors docs/API.md. Privacy note: this is the ONLY module that reaches the
// network; client-side ops (preview, page edits, quick text) never call it.

import type { ApiErrorEnvelope, Job, JobOp } from './types';

const BASE = '/api';

/** A structured API error carrying the machine `code` clients branch on. */
export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  requestId?: string;
  retryAfter?: number;

  constructor(code: string, message: string, status: number, opts: { details?: Record<string, unknown>; requestId?: string; retryAfter?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = opts.details;
    this.requestId = opts.requestId;
    this.retryAfter = opts.retryAfter;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const retryAfterRaw = res.headers.get('Retry-After');
  const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;
  let body: ApiErrorEnvelope | null = null;
  try {
    body = (await res.json()) as ApiErrorEnvelope;
  } catch {
    /* non-JSON error body */
  }
  const e = body?.error;
  return new ApiError(
    e?.code ?? 'http_error',
    e?.message ?? `Request failed (${res.status})`,
    e?.status ?? res.status,
    { details: e?.details, requestId: e?.request_id, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined },
  );
}

export interface SubmitJobInput {
  op: JobOp;
  /** One or more input files (field name `file`). */
  files: File[] | Blob[];
  /** Op params serialized into the `options` JSON part. */
  options?: Record<string, unknown>;
  /** Suggested output filename (kept only for Content-Disposition). */
  filename?: string;
  signal?: AbortSignal;
}

/** POST /api/jobs/{op} — multipart submit → 202 + job descriptor. */
export async function submitJob({ op, files, options, filename, signal }: SubmitJobInput): Promise<Job> {
  const form = new FormData();
  for (const f of files) {
    form.append('file', f, filename ?? (f instanceof File ? f.name : 'input.pdf'));
  }
  if (options) form.append('options', JSON.stringify(options));

  const res = await fetch(`${BASE}/jobs/${op}`, { method: 'POST', body: form, signal });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as Job;
}

/** GET /api/jobs/{id} — poll target; returns the current descriptor. */
export async function getJob(id: string, signal?: AbortSignal): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${id}`, { signal });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as Job;
}

const TERMINAL = new Set(['succeeded', 'failed', 'expired', 'canceled']);

export interface PollOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onTick?: (job: Job) => void;
}

/** Poll GET /api/jobs/{id} (~1.5s) until the job reaches a terminal state. */
export async function pollUntilTerminal(id: string, { intervalMs = 1500, signal, onTick }: PollOptions = {}): Promise<Job> {
  for (;;) {
    const job = await getJob(id, signal);
    onTick?.(job);
    if (TERMINAL.has(job.state)) return job;
    await delay(intervalMs, signal);
  }
}

/** GET /api/jobs/{id}/result — fetch the primary artifact as a Blob. */
export async function fetchResult(id: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${BASE}/jobs/${id}/result`, { signal });
  if (!res.ok) throw await toApiError(res);
  return await res.blob();
}

/** GET /api/jobs/{id}/result/{index} — fetch one artifact of a multi-file job. */
export async function fetchArtifact(id: string, index: number, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${BASE}/jobs/${id}/result/${index}`, { signal });
  if (!res.ok) throw await toApiError(res);
  return await res.blob();
}

/** DELETE /api/jobs/{id} — cancel a running job or discard terminal artifacts. */
export async function cancelJob(id: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${id}`, { method: 'DELETE', signal });
  if (!res.ok && res.status !== 404) throw await toApiError(res);
}

/** GET /api/health — trivial liveness probe. */
export async function health(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trigger a browser download for a Blob (used after fetchResult). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
