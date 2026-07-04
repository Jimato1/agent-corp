/*
 * api/http.js — the internal REST surface (PLAN §9.1). The MCP adapter and the UI both consume
 * THIS API — two views, one state. No UI-private store exists.
 *
 * Auth: RS baseline on every endpoint (auth §1). Scope→endpoint map enforced server-side (PLAN §8).
 * Errors: BusinessError → ERR_HTTP status + structured { code, ... }; AuthError handled in rs.js.
 * SSE (/api/events): terminates at the presenting token's exp and carries event ids for replay.
 */
import express from 'express';
import { BusinessError } from '../errors.js';
import { ERR, SCOPES } from '../constants.js';
import { config } from '../config.js';

export function buildApp({ service, rs, budget, remote, reconciler, emitter }) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.disable('x-powered-by');

  const wrap = (fn) => async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) {
        const status = out && out.code === ERR.ALREADY_APPLIED ? 200 : 200;
        res.status(status).json(out);
      }
    } catch (e) {
      if (e instanceof BusinessError) {
        return res.status(e.httpStatus).json(e.toStructured());
      }
      // AuthError from inner service (e.g. svc token) — surface its status.
      if (e && e.httpStatus) return res.status(e.httpStatus).json({ error: e.code, message: e.message });
      req.log?.error?.(e);
      return res.status(500).json({ code: 'INTERNAL', message: 'internal error' });
    }
  };

  const R = rs.requireScope.bind(rs);
  const budgetMw = budget.middleware();

  // --- health & metadata (edge-internal liveness) ---------------------------
  app.get('/healthz', (req, res) => {
    const gh = remote.health();
    const healthy = remote.healthy();
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      index_last_reconcile_ms: reconciler.lastReconcileMs,
      git: gh,
    });
  });
  app.get('/.well-known/oauth-protected-resource', (req, res) => res.json(rs.metadata()));

  // --- reads (notes:read / notes:search) ------------------------------------
  app.get('/api/notes/:id', R(SCOPES.READ), budgetMw, wrap((req) => service.readNote(req.params.id)));
  app.get('/api/notes/:id/backlinks', R(SCOPES.READ), budgetMw, wrap((req) => ({ backlinks: service.listBacklinks(req.params.id) })));
  app.get('/api/notes/:id/taint', R(SCOPES.READ), budgetMw, wrap((req) => service.taint(req.params.id)));
  app.get('/api/search', R(SCOPES.SEARCH), budgetMw, wrap((req) => ({
    results: service.search({
      query: req.query.query || req.query.q || '',
      type: req.query.type,
      tag: req.query.tag,
      ticket_id: req.query.ticket_id,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    }),
  })));

  // --- writes (notes:append) ------------------------------------------------
  app.post('/api/notes', R(SCOPES.APPEND), budgetMw, wrap((req) =>
    service.createNote({ ...req.body, principal: req.principal }),
  ));
  app.post('/api/notes/:id/append', R(SCOPES.APPEND), budgetMw, wrap((req) =>
    service.appendNote({ ...req.body, note_id: req.params.id, principal: req.principal }),
  ));
  app.post('/api/notes/:id/links', R(SCOPES.APPEND), budgetMw, wrap((req) =>
    service.linkNotes({ ...req.body, from_id: req.params.id, principal: req.principal }),
  ));

  // --- overwrite + admin (notes:write — operator/maintenance only) ----------
  app.put('/api/notes/:id', R(SCOPES.WRITE), budgetMw, wrap((req) =>
    service.updateNote({ ...req.body, note_id: req.params.id, principal: req.principal }),
  ));
  app.post('/api/admin/reindex', R(SCOPES.WRITE), budgetMw, wrap(() => service.reindex()));

  // --- SSE live refresh (notes:read) ----------------------------------------
  app.get('/api/events', rs.authOnly(), (req, res) => {
    if (!req.principal.scopes.includes(SCOPES.READ)) {
      return res.status(403).json({ error: 'insufficient_scope', scope: SCOPES.READ });
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    let seq = 0;
    const send = (event, data) => {
      res.write(`id: ${++seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const onNote = (d) => send('note', d);
    const onAudit = (d) => send('audit', d);
    emitter.on('note', onNote);
    emitter.on('audit', onAudit);
    const hb = setInterval(() => res.write(': hb\n\n'), 15000);
    if (hb.unref) hb.unref();

    // RS-baseline: terminate the stream at the presenting token's exp (client reconnects fresh).
    let expTimer = null;
    if (req.principal.exp) {
      const ms = req.principal.exp * 1000 - Date.now();
      if (ms > 0) {
        expTimer = setTimeout(() => {
          send('session', { reason: 'token_exp' });
          res.end();
        }, ms);
        if (expTimer.unref) expTimer.unref();
      }
    }
    req.on('close', () => {
      clearInterval(hb);
      if (expTimer) clearTimeout(expTimer);
      emitter.off('note', onNote);
      emitter.off('audit', onAudit);
    });
  });

  return app;
}
