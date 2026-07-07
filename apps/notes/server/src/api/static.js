/*
 * api/static.js — serve the built web SPA (web/dist) from the SAME service that serves the REST +
 * MCP surfaces, so "both surfaces behind the proxy at notes.<domain>" holds (DEPLOYMENT §1/§2).
 *
 * This is a thin, read-only static mount. It is mounted AFTER the API/MCP routes in index.js, and its
 * SPA fallback deliberately declines the API/MCP/health namespaces so an unknown /api path still 404s
 * as JSON rather than returning index.html. If the dist dir is absent (e.g. server-only dev, or the
 * proxy serves the SPA instead) the mount is a no-op — the API keeps working.
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// server/src/api → up to apps/notes → web/dist. Overridable for the container image layout.
const DEFAULT_DIST = path.resolve(HERE, '../../../web/dist');

/** Namespaces owned by the API/MCP/health surfaces — never served the SPA shell. */
const RESERVED = ['/api', '/mcp', '/healthz', '/.well-known'];

export function mountStatic(app, { distDir = process.env.NOTES_STATIC_DIR || DEFAULT_DIST } = {}) {
  const indexHtml = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    return false; // no build present — API-only; proxy may serve the SPA
  }
  // Hashed asset files: long-lived cache. index.html: always revalidated.
  app.use(express.static(distDir, { index: false, maxAge: '1h', fallthrough: true }));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (RESERVED.some((p) => req.path === p || req.path.startsWith(p + '/'))) return next();
    res.sendFile(indexHtml);
  });
  return true;
}
