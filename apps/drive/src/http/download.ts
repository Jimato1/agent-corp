/**
 * Download header matrix (PLAN §4.1) — the stored-XSS boundary + range/cache correctness.
 * Every byte response carries: sniffed Content-Type (never request-derived), nosniff,
 * attachment-by-default (inline only for the safe sniffed allowlist), and an asset CSP.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream } from 'node:fs';
import { blobPath, type CasLayout } from '../storage/cas.js';
import { isInlineAllowed } from '../lib/mime.js';

export interface ResolvedContent {
  sha256: string;
  mime: string;
  size: number;
  original_name: string;
  version_id: string;
  immutable: boolean;
}

/** RFC 5987 filename* — sanitized; original_name is metadata only, never a filesystem path. */
function contentDisposition(originalName: string, inline: boolean): string {
  const fallback = originalName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').slice(0, 200) || 'download';
  const encoded = encodeURIComponent(originalName).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${inline ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/** Parse a single-range `bytes=start-end` request. Returns null for no/invalid/multi range (⇒ 200). */
function parseRange(header: string | undefined, size: number): { start: number; end: number } | 'unsatisfiable' | null {
  if (!header || !header.startsWith('bytes=')) return null;
  const spec = header.slice('bytes='.length);
  if (spec.includes(',')) return null; // multi-range not supported ⇒ 200 full
  const m = /^(\d*)-(\d*)$/.exec(spec.trim());
  if (!m) return null;
  const [, s, e] = m;
  let start: number;
  let end: number;
  if (s === '') {
    // suffix range: last N bytes
    const n = Number(e);
    if (!n) return 'unsatisfiable';
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(s);
    end = e === '' ? size - 1 : Number(e);
  }
  if (start > end || start >= size) return 'unsatisfiable';
  if (end >= size) end = size - 1;
  return { start, end };
}

/** Apply the full header matrix and stream (or, for HEAD, headers only).
 *  Returns the reply.send() result — the caller MUST `return` this so the async handler's
 *  promise resolves only after the stream is consumed (else the body is dropped). */
export function sendContent(req: FastifyRequest, reply: FastifyReply, l: CasLayout, c: ResolvedContent, isHead: boolean): FastifyReply {
  const etag = `"sha256:${c.sha256}"`;
  const inline = isInlineAllowed(c.mime);

  // Always-on safety headers (every byte response).
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Content-Security-Policy', "default-src 'none'; sandbox");
  reply.header('Content-Type', c.mime);
  reply.header('Content-Disposition', contentDisposition(c.original_name, inline));
  reply.header('Accept-Ranges', 'bytes');
  reply.header('ETag', etag);
  reply.header('Cache-Control', c.immutable ? 'private, immutable, max-age=31536000' : 'private, no-cache');

  // Conditional GET.
  const inm = req.headers['if-none-match'];
  if (inm && inm === etag) {
    return reply.code(304).send();
  }

  // Range handling (honor If-Range: only apply range when the validator still matches).
  const ifRange = req.headers['if-range'];
  const rangeAllowed = !ifRange || ifRange === etag;
  const range = rangeAllowed ? parseRange(req.headers['range'], c.size) : null;

  if (range === 'unsatisfiable') {
    return reply.header('Content-Range', `bytes */${c.size}`).code(416).send();
  }

  const path = blobPath(l, c.sha256);
  if (range) {
    const len = range.end - range.start + 1;
    reply.code(206);
    reply.header('Content-Range', `bytes ${range.start}-${range.end}/${c.size}`);
    reply.header('Content-Length', String(len));
    if (isHead) return reply.send();
    return reply.send(createReadStream(path, { start: range.start, end: range.end }));
  }

  reply.code(200);
  reply.header('Content-Length', String(c.size));
  if (isHead) return reply.send();
  return reply.send(createReadStream(path));
}
