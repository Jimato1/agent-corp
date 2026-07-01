// lib/exportClient.ts — a promise wrapper around pdfExport.worker.
// Keeps a single worker instance and correlates requests by id.

import type { ExportRequest, ExportResponse } from '../workers/pdfExport.worker';
import type { PlanEntry } from './pdflib';

// Distributive Omit so each variant of the ExportRequest union keeps its own props.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/pdfExport.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<ExportResponse>) => {
      const res = e.data;
      const entry = pending.get(res.id);
      if (!entry) return;
      pending.delete(res.id);
      if (res.ok) entry.resolve(res.bytes);
      else entry.reject(new Error(res.error));
    };
  }
  return worker;
}

function post(req: DistributiveOmit<ExportRequest, 'id'>, transfer: Transferable[]): Promise<ArrayBuffer> {
  const id = ++seq;
  const w = getWorker();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ ...req, id } as ExportRequest, transfer);
  });
}

/** Assemble edited bytes (reorder/rotate/delete) off the main thread. */
export function exportAssemble(bytes: ArrayBuffer, plan: PlanEntry[]): Promise<ArrayBuffer> {
  const copy = bytes.slice(0);
  return post({ type: 'assemble', bytes: copy, plan }, [copy]);
}

/** Merge multiple PDFs client-side off the main thread. */
export function exportMerge(sources: ArrayBuffer[]): Promise<ArrayBuffer> {
  const copies = sources.map((b) => b.slice(0));
  return post({ type: 'merge', sources: copies }, copies);
}
