// lib/pdflib.ts — pdf-lib helpers for the CLIENT write path (files < 150 MB).
// Reorder/rotate/delete are applied here to produce edited bytes; small merge
// uses copyPages. Runs off-main-thread (workers/pdfExport.worker.ts). Above the
// threshold, byte assembly is routed to the pikepdf backend instead (D7).

import { PDFDocument, degrees } from 'pdf-lib';

/** One output page: which source page to copy, and its absolute rotation. */
export interface PlanEntry {
  sourceIndex: number; // 0-based index into the source document
  rotation: number; // absolute rotation in degrees (0/90/180/270)
}

/**
 * Assemble edited bytes from a single source document and an ordered plan.
 * Deleted pages are simply absent from the plan; reordering is the plan order;
 * rotation is applied as an ABSOLUTE page rotation (per research).
 */
export async function assembleFromPlan(sourceBytes: ArrayBuffer | Uint8Array, plan: PlanEntry[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(sourceBytes, { ignoreEncryption: false });
  const out = await PDFDocument.create();
  const indices = plan.map((p) => p.sourceIndex);
  const copied = await out.copyPages(src, indices);
  copied.forEach((page, i) => {
    page.setRotation(degrees(normalizeRotation(plan[i].rotation)));
    out.addPage(page);
  });
  return out.save();
}

/** Small client-side merge: concatenate multiple PDFs in order. */
export async function mergePdfs(sources: (ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of sources) {
    const doc = await PDFDocument.load(bytes);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** Small client-side split: extract a set of page ranges into one PDF. */
export async function extractRange(sourceBytes: ArrayBuffer | Uint8Array, zeroBasedIndices: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(sourceBytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, zeroBasedIndices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

function normalizeRotation(deg: number): number {
  const n = ((deg % 360) + 360) % 360;
  return n;
}
