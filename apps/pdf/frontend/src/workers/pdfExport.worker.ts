// workers/pdfExport.worker.ts — off-main-thread pdf-lib assembly for the client
// export path (files < 150 MB, OQ#12). Produces edited bytes; the SPA then POSTs
// them to /api/jobs/finalize for the canonical normalize + linearize pass.

import { assembleFromPlan, mergePdfs, type PlanEntry } from '../lib/pdflib';

export type ExportRequest =
  | { id: number; type: 'assemble'; bytes: ArrayBuffer; plan: PlanEntry[] }
  | { id: number; type: 'merge'; sources: ArrayBuffer[] };

export type ExportResponse =
  | { id: number; ok: true; bytes: ArrayBuffer }
  | { id: number; ok: false; error: string };

self.onmessage = async (e: MessageEvent<ExportRequest>) => {
  const req = e.data;
  try {
    let out: Uint8Array;
    if (req.type === 'assemble') {
      out = await assembleFromPlan(req.bytes, req.plan);
    } else {
      out = await mergePdfs(req.sources);
    }
    // Copy into a fresh ArrayBuffer so it can be transferred cleanly.
    const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
    const res: ExportResponse = { id: req.id, ok: true, bytes: buf };
    (self as unknown as Worker).postMessage(res, [buf]);
  } catch (err) {
    const res: ExportResponse = { id: req.id, ok: false, error: err instanceof Error ? err.message : 'worker_failed' };
    (self as unknown as Worker).postMessage(res);
  }
};
