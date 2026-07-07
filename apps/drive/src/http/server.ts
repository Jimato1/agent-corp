/**
 * The one shared HTTP API (PLAN §4). Both surfaces sit on this — the MCP tools are siblings over
 * the same Store, never downstream of the UI. RS-baseline auth on every route; typed errors;
 * audit on state changes. Byte-handoff is authenticated by the caller's own credential on Drive's
 * own endpoints (PLAN §2.2 — NO signed URLs).
 */
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import type { AppContext } from '../context.js';
import { DriveError } from '../lib/errors.js';
import { requireScope } from '../auth/rs.js';
import type { Principal } from '../lib/principal.js';
import { MimeSniffer } from '../lib/mime.js';
import { stagingPath } from '../storage/cas.js';
import { sendContent } from './download.js';
import { gcPhase2, gcPreview } from '../storage/gc.js';

const FLUSH_BYTES = 8 * 1024 * 1024;

export function buildServer(ctx: AppContext): FastifyInstance {
  const app = Fastify({
    logger: false,
    exposeHeadRoutes: false, // we register explicit HEAD handlers on the content routes
    bodyLimit: ctx.config.limits.maxBytes + 1024 * 1024, // upload route streams manually; JSON stays small
  });

  // Pass raw stream through for non-JSON bodies (the upload PUT). JSON keeps the built-in parser.
  app.addContentTypeParser('*', (_req, payload, done) => done(null, payload));

  // ── auth helper ──
  async function authenticate(req: FastifyRequest): Promise<Principal> {
    const auth = req.headers['authorization'];
    if (auth) return ctx.rs.verifyBearer(auth);
    const identity = req.headers['x-auth-identity'];
    if (typeof identity === 'string') return ctx.rs.verifyHumanIdentity(identity);
    throw new DriveError('UNAUTHENTICATED', 'no bearer token or verified identity');
  }

  function requireHuman(p: Principal): void {
    if (p.kind !== 'human') throw new DriveError('FORBIDDEN', 'operator-only route (human principal kind required)');
  }

  // ── error mapping ──
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof DriveError) {
      if (err.code === 'UNAUTHENTICATED') {
        reply.header('WWW-Authenticate', `Bearer resource_metadata="${ctx.config.publicOrigin}/.well-known/oauth-protected-resource"`);
      }
      reply.code(err.httpStatus).send({ error: err.toStructured() });
      return;
    }
    // Fastify body-limit / parse errors etc.
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = status === 500 ? 'internal error' : (err as Error).message;
    reply.code(status).send({ error: { code: 'INTERNAL', message } });
  });

  // ── RFC 9728 protected-resource metadata (401 bootstrap) ──
  app.get('/.well-known/oauth-protected-resource', async () => ({
    resource: ctx.config.publicOrigin,
    authorization_servers: [ctx.config.auth.issuer],
    scopes_supported: ['drive:read', 'drive:write'],
    bearer_methods_supported: ['header'],
  }));

  // ── healthz (edge-internal; no auth) ──
  app.get('/api/healthz', async () => ctx.store.health());

  // ── register put intent (POST /api/artifacts) ──
  app.post('/api/artifacts', async (req, reply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:write');
    await ctx.budget.check(p, 'write-benign');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const res = ctx.store.register(p, {
      ticket_id: String(body['ticket_id'] ?? ''),
      logical_name: String(body['logical_name'] ?? ''),
      op_id: String(body['op_id'] ?? ''),
      fencing_token: (body['fencing_token'] as number | string | null | undefined) ?? null,
      mime_hint: (body['mime_hint'] as string | undefined) ?? null,
      note_id: (body['note_id'] as string | undefined) ?? null,
      expected_sha256: (body['expected_sha256'] as string | undefined) ?? null,
    });
    // Fire-and-forget live ticket check when the dependency is wired (degraded default otherwise).
    void maybeCheckTicket(ctx, res.ticket_state, res.artifact_id ? String(body['ticket_id']) : '');
    const origin = p.viaIdentityHeader ? ctx.config.publicOrigin : ctx.config.internalOrigin;
    reply.code(201).send({
      artifact_id: res.artifact_id,
      upload_id: res.upload_id,
      upload_url: `${origin}/api/uploads/${res.upload_id}`,
      ticket_state: res.ticket_state,
      expires_policy: res.expires_policy,
    });
  });

  // ── the out-of-band byte stream (PUT /api/uploads/:id) ──
  app.put('/api/uploads/:id', async (req, reply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:write');
    const uploadId = (req.params as { id: string }).id;
    const u = ctx.store.getUpload(uploadId);
    if (!u) throw new DriveError('NOT_FOUND', 'no such upload');
    ctx.store.requireOwner(p, u); // same-principal
    if (u.state === 'committed' && u.result_version_id) {
      // idempotent replay of a dropped-stream retry ⇒ return the prior result.
      reply.code(201).send(ctx.store.commit(p, uploadId, { sha256: '', sizeBytes: 0, mimeSniffed: '', originalName: '' }));
      return;
    }
    if (u.state === 'expired') throw new DriveError('UPLOAD_EXPIRED', 'upload session expired');
    if (u.state !== 'pending') throw new DriveError('UPLOAD_STATE', `upload is ${u.state}`);

    ctx.store.assertUnderWatermark(); // pre-check at start
    ctx.budget.ceiling.acquire(); // acquired immediately before the try that releases it (no leak window)
    const maxBytes = ctx.config.limits.maxBytes;
    const stream = req.body as Readable;
    let total = 0;
    let charged = 0;
    let out: ReturnType<typeof createWriteStream> | undefined;
    try {
      const tmp = stagingPath(ctx.store.layout, uploadId);
      out = createWriteStream(tmp);
      const hash = createHash('sha256');
      const sniffer = new MimeSniffer();
      for await (const chunk of stream) {
        const buf = chunk as Buffer;
        total += buf.length;
        if (total > maxBytes) throw new DriveError('OVER_SIZE_CAP', 'artifact exceeds size cap', { cap: maxBytes });
        hash.update(buf);
        sniffer.update(buf);
        if (!out.write(buf)) await once(out, 'drain');
        if (total - charged >= FLUSH_BYTES) {
          ctx.store.assertUnderWatermark(); // continuous in-flight watermark
          ctx.store.chargeQuota(p.sub, total - charged); // staged bytes charged (§10.3)
          charged = total;
          ctx.store.touchUpload(uploadId, charged); // keep sweeper off a live stream
        }
      }
      out.end();
      await finished(out);
      if (total - charged > 0) {
        ctx.store.assertUnderWatermark();
        ctx.store.chargeQuota(p.sub, total - charged);
        charged = total;
        ctx.store.touchUpload(uploadId, charged);
      }
      const originalName = (typeof req.headers['x-original-name'] === 'string' && (req.headers['x-original-name'] as string)) || u.logical_name;
      const res = ctx.store.commit(p, uploadId, {
        sha256: hash.digest('hex'),
        sizeBytes: total,
        mimeSniffed: sniffer.result(),
        originalName,
      });
      reply.code(201).send(res);
    } catch (e) {
      out?.destroy();
      // persist what we charged so abort releases exactly that, then abort (release + discard).
      try {
        ctx.store.touchUpload(uploadId, charged);
        ctx.store.abortUpload(p, uploadId);
      } catch {
        /* best-effort cleanup */
      }
      throw e;
    } finally {
      ctx.budget.ceiling.release();
    }
  });

  // ── abort a pending upload ──
  app.delete('/api/uploads/:id', async (req, reply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:write');
    ctx.store.abortUpload(p, (req.params as { id: string }).id);
    reply.code(204).send();
  });

  // ── list by ticket ──
  app.get('/api/artifacts', async (req, reply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:read');
    await ctx.budget.check(p, 'read');
    const q = req.query as Record<string, string | undefined>;
    if (!q['ticket_id']) throw new DriveError('MALFORMED_ID', 'ticket_id query param required');
    const opts: { page_token?: string; include_deleted?: boolean } = { include_deleted: q['include_deleted'] === 'true' };
    if (q['page_token']) opts.page_token = q['page_token'];
    reply.send(ctx.store.listByTicket(q['ticket_id'], opts));
  });

  // ── distinct-ticket index (UI recent view — UI_SPEC §7 delta) ──
  app.get('/api/tickets', async (req, reply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:read');
    await ctx.budget.check(p, 'read');
    const q = req.query as Record<string, string | undefined>;
    const opts: { page_token?: string } = {};
    if (q['page_token']) opts.page_token = q['page_token'];
    reply.send(ctx.store.listTickets(opts));
  });

  // ── artifact metadata + version history ──
  app.get('/api/artifacts/:id', async (req, reply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:read');
    await ctx.budget.check(p, 'read');
    const a = ctx.store.getArtifact((req.params as { id: string }).id);
    if (!a) throw new DriveError('NOT_FOUND', 'no such artifact');
    reply.send(a);
  });

  // ── content bytes (current version) GET/HEAD ──
  const contentHandler = (byVersion: boolean) => async (req: FastifyRequest, reply: FastifyReply) => {
    const p = await authenticate(req);
    requireScope(p, 'drive:read'); // authenticated — no capability URLs, blobs never addressable by hash
    await ctx.budget.check(p, 'read');
    const isHead = req.method === 'HEAD';
    const params = req.params as { id?: string; vid?: string };
    const c = byVersion ? ctx.store.resolveVersionContent(params.vid!) : ctx.store.resolveContent(params.id!, (req.query as { version_id?: string }).version_id);
    ctx.store.audit(p, 'read', { artifact_id: params.id ?? null, version_id: c.version_id });
    return sendContent(req, reply, ctx.store.layout, c, isHead);
  };
  app.get('/api/artifacts/:id/content', contentHandler(false));
  app.head('/api/artifacts/:id/content', contentHandler(false));
  app.get('/api/versions/:vid/content', contentHandler(true));
  app.head('/api/versions/:vid/content', contentHandler(true));

  // ── operator delete-marker (human-only) ──
  app.delete('/api/artifacts/:id', async (req, reply) => {
    const p = await authenticate(req);
    requireHuman(p);
    requireScope(p, 'drive:write');
    reply.send(ctx.store.deleteMarker(p, (req.params as { id: string }).id));
  });

  // ── operator restore (human-only) ──
  app.post('/api/artifacts/:id/restore', async (req, reply) => {
    const p = await authenticate(req);
    requireHuman(p);
    requireScope(p, 'drive:write');
    const body = (req.body ?? {}) as { version_id?: string };
    if (!body.version_id) throw new DriveError('MALFORMED_ID', 'version_id required');
    ctx.store.restore(p, (req.params as { id: string }).id, body.version_id);
    reply.code(200).send({ ok: true });
  });

  // ── GC preview (operator-only) ──
  app.get('/api/admin/gc', async (req, reply) => {
    const p = await authenticate(req);
    requireHuman(p);
    reply.send(gcPreview(ctx.store));
  });

  // ── audit-log read (operator-only; append-only, mutations + denials) ──
  app.get('/api/admin/audit', async (req, reply) => {
    const p = await authenticate(req);
    requireHuman(p);
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 100), 500);
    const rows = ctx.store.db
      .prepare(`SELECT ts, principal, principal_kind, action, ticket_id, artifact_id, version_id, outcome FROM audit_log ORDER BY id DESC LIMIT ?`)
      .all(limit);
    reply.send({ entries: rows });
  });

  // ── GC purge (operator-only + Tier-2 step-up; the ONE fail-closed destructive route) ──
  app.post('/api/admin/gc', async (req, reply) => {
    const p = await authenticate(req);
    requireHuman(p);
    requireScope(p, 'drive:write');
    await ctx.budget.check(p, 'destructive'); // fail-closed when budget/auth unreachable
    await ctx.budget.requireStepUp(p); // uncached Tier-2 live re-check; fail-closed on any doubt
    const body = (req.body ?? {}) as { confirm?: string };
    if (body.confirm !== 'PURGE') throw new DriveError('CONFLICT', 'typed-intent PURGE required');
    reply.send(gcPhase2(ctx.store, p));
  });

  return app;
}

async function maybeCheckTicket(ctx: AppContext, currentState: string, ticket_id: string): Promise<void> {
  if (!ctx.board.active || !ticket_id || currentState === 'verified') return;
  try {
    const result = await ctx.board.checkTicket(ticket_id);
    ctx.board.record(ctx.store, ticket_id, result);
  } catch {
    /* degraded — flagged, never fatal */
  }
}
