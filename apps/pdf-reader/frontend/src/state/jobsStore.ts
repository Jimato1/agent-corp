// state/jobsStore.ts — the active server-job state machine (the amber press).
// One job at a time in v1's single-flow UI: submit → poll → succeeded/failed.

import { create } from 'zustand';
import { ApiError, cancelJob, fetchResult, pollUntilTerminal, saveBlob, submitJob } from '../lib/api';
import type { Job, JobOp } from '../lib/types';

export type PressPhase = 'idle' | 'processing' | 'success' | 'error';

interface JobsState {
  phase: PressPhase;
  job: Job | null;
  detail: string;
  code: string;
  message: string;
  abort: AbortController | null;

  run: (input: { op: JobOp; files: File[] | Blob[]; options?: Record<string, unknown>; filename?: string; detail?: string }) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
  download: () => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  phase: 'idle',
  job: null,
  detail: '',
  code: '',
  message: '',
  abort: null,

  run: async ({ op, files, options, filename, detail }) => {
    get().abort?.abort();
    const abort = new AbortController();
    set({ phase: 'processing', detail: detail ?? '', code: '', message: '', job: null, abort });
    try {
      const submitted = await submitJob({ op, files, options, filename, signal: abort.signal });
      set({ job: submitted });
      const final = await pollUntilTerminal(submitted.id, {
        signal: abort.signal,
        onTick: (j) => set({ job: j, detail: describe(j) }),
      });
      if (final.state === 'succeeded') {
        set({ phase: 'success', job: final, detail: describe(final) });
      } else if (final.state === 'canceled') {
        set({ phase: 'idle', job: final });
      } else {
        set({ phase: 'error', job: final, code: final.error?.code ?? 'engine_error', message: final.error?.message ?? 'Job failed' });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        set({ phase: 'idle' });
        return;
      }
      const apiErr = err instanceof ApiError ? err : null;
      set({
        phase: 'error',
        code: apiErr?.code ?? 'network_error',
        message: apiErr?.message ?? 'Could not reach the server.',
      });
    }
  },

  cancel: async () => {
    const { abort, job } = get();
    abort?.abort();
    if (job && (job.state === 'queued' || job.state === 'running')) {
      try { await cancelJob(job.id); } catch { /* best-effort */ }
    }
    set({ phase: 'idle', abort: null });
  },

  reset: () => { get().abort?.abort(); set({ phase: 'idle', job: null, detail: '', code: '', message: '', abort: null }); },

  download: async () => {
    const { job } = get();
    if (!job || job.state !== 'succeeded' || !job.result) return;
    const blob = await fetchResult(job.id);
    saveBlob(blob, job.result.filename);
  },
}));

function describe(job: Job): string {
  if (job.input) {
    return `${job.input.filename} · ${job.input.bytes.toLocaleString('en-US')} B`;
  }
  return job.stage ?? job.state;
}
