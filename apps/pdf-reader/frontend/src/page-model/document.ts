// page-model/document.ts — load a File into the in-memory model, entirely in
// the browser (zero upload). Keeps the raw bytes for the client export path.

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf, readPageAspects } from '../lib/pdfjs';
import { makePage, type Page } from './pageModel';

export interface LoadedDocument {
  name: string;
  size: number;
  /** Raw source bytes (kept for the pdf-lib export path). */
  bytes: ArrayBuffer;
  /** Live pdf.js document (for on-demand thumbnail/preview rendering). */
  doc: PDFDocumentProxy;
  pages: Page[];
}

export class NotAPdfError extends Error {
  code = 'not_a_pdf';
  constructor() {
    super("That file didn't open as a PDF.");
    this.name = 'NotAPdfError';
  }
}

/** Read a dropped/selected File into the page model. Never touches the network. */
export async function openDocument(file: File): Promise<LoadedDocument> {
  const bytes = await file.arrayBuffer();
  let doc: PDFDocumentProxy;
  try {
    // pdf.js takes ownership of the passed buffer; hand it a copy so `bytes`
    // stays intact for the export worker.
    ({ doc } = await loadPdf(bytes.slice(0)));
  } catch {
    throw new NotAPdfError();
  }
  const aspects = await readPageAspects(doc);
  const pages: Page[] = aspects.map((a) => makePage(a.pageNumber - 1, a.pageNumber, a.aspect));
  return { name: file.name, size: file.size, bytes, doc, pages };
}
