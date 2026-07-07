/**
 * Minimal dependency-free static file server for the Drive human UI (Helm). Serves
 * src/ui/public/** and the copied Helm assets (styles.css, tokens/, _ds_bundle.js) under /ui-assets.
 * Behind the edge the proxy forward-auth already gated the human route (PLAN §2.2 / DEPLOYMENT §1).
 */
import type { FastifyInstance } from 'fastify';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const CT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const here = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(here, 'public');
const ASSETS_DIR = join(here, 'public', 'ui-assets');

function serveFile(reply: import('fastify').FastifyReply, baseDir: string, rel: string): void {
  // Path-traversal guard: normalized path must stay within baseDir.
  const target = normalize(join(baseDir, rel));
  if (!target.startsWith(normalize(baseDir))) {
    reply.code(403).send('forbidden');
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    reply.code(404).send('not found');
    return;
  }
  reply.header('Content-Type', CT[extname(target)] ?? 'application/octet-stream');
  reply.send(createReadStream(target));
}

export function registerUi(app: FastifyInstance): void {
  // The SPA shell.
  app.get('/', (_req, reply) => serveFile(reply, PUBLIC_DIR, 'index.html'));
  // App scripts (dr-*.jsx, app.jsx).
  app.get('/app/:file', (req, reply) => serveFile(reply, PUBLIC_DIR, (req.params as { file: string }).file));
  // Helm design-system assets (copied at build): styles.css, tokens/*, _ds_bundle.js.
  app.get('/ui-assets/*', (req, reply) => serveFile(reply, ASSETS_DIR, (req.params as Record<string, string>)['*'] ?? ''));
}

export { PUBLIC_DIR, ASSETS_DIR };
