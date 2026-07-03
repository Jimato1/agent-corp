// lib/pdfjs.ts — pdf.js setup + render helpers. All rendering is CLIENT-side
// (zero upload, SCOPE §5a). Hardened per research/security-homelab:
// isEvalSupported:false, enableScripting:false. pdf.js is ESM-only (v4+); Vite
// bundles the worker from the pdfjs-dist package (no CDN).

import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
// Vite resolves this to a bundled, same-origin worker URL.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface LoadedPdf {
  doc: PDFDocumentProxy;
  numPages: number;
}

/** Load a PDF from bytes entirely in-browser. `data` is transferred/copied to
 *  the worker; pass a copy if you still need the original ArrayBuffer. */
export async function loadPdf(data: ArrayBuffer | Uint8Array): Promise<LoadedPdf> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const task = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    // @ts-expect-error — enableScripting is a valid runtime param (hardening).
    enableScripting: false,
    disableAutoFetch: true,
  });
  const doc = await task.promise;
  return { doc, numPages: doc.numPages };
}

/** Portrait ISO fallback (w/h) when a page reports no viewport. */
export const ISO_PORTRAIT = 210 / 297;

export interface PageInfo {
  pageNumber: number;
  /** Intrinsic aspect (w/h) at the page's own rotation=0. */
  aspect: number;
}

/** Read every page's aspect ratio without rasterizing (fast, for board layout). */
export async function readPageAspects(doc: PDFDocumentProxy): Promise<PageInfo[]> {
  const out: PageInfo[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    out.push({ pageNumber: i, aspect: vp.height ? vp.width / vp.height : ISO_PORTRAIT });
    page.cleanup();
  }
  return out;
}

/** Render one page to a PNG data URL at a target CSS width (device-pixel aware). */
export async function renderPageToDataUrl(
  doc: PDFDocumentProxy,
  pageNumber: number,
  targetWidth: number,
): Promise<{ dataUrl: string; aspect: number }> {
  const page: PDFPageProxy = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const aspect = base.height ? base.width / base.height : ISO_PORTRAIT;
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const scale = (targetWidth * dpr) / base.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');

  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, aspect };
}

/** Extract text from one page (client quick text — zero upload). */
export async function extractPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((it) => ('str' in it ? it.str : ''))
    .join(' ');
  page.cleanup();
  return text;
}

/** Extract text across the whole document (client quick text). */
export async function extractAllText(doc: PDFDocumentProxy): Promise<string> {
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    parts.push(await extractPageText(doc, i));
  }
  return parts.join('\n\n');
}
