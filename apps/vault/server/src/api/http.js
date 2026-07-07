/*
 * api/http.js — the EDGE HTTP surface (PLAN §8/§10). Served on the `edge` network (config.port). Hosts:
 *   - the operator manage API (/manage/*), scope vault:manage (operator-only, human-kind-gated)
 *   - health + RFC 9728 metadata
 * The MCP surface is mounted separately (mountMcp). The redeem endpoint is NOT here — it lives on the
 * creds mTLS listener (api/redeem.js), physically unreachable from edge (§4 header).
 *
 * Every action re-validates the operator's live token wrapper-side (never header-trust; auth §1 Rule 3).
 * Manage reads are Cache-Control: no-store where they mirror live safety state.
 */
import express from 'express';
import { BusinessError } from '../errors.js';
import { SCOPES, ACTION_CLASS } from '../constants.js';

export function buildApp({ services, rs, budget }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  const M = () => rs.requireScope(SCOPES.MANAGE); // operator-only, human-kind-gated
  const B = (cls) => budget.middleware(cls);
  const noStore = (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); };
  const P = (req) => req.principal;
  const wrap = (fn) => async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.status(200).json(out);
    } catch (e) { sendErr(res, e); }
  };

  const { manage, releases } = services;

  // --- health & metadata --------------------------------------------------------------------------
  app.get('/healthz', (req, res) => res.json({ status: 'ok', mcp_spec: '2025-11-25' }));
  app.get('/.well-known/oauth-protected-resource', (req, res) => res.json(rs.metadata()));

  // --- Secrets Manager (§4) — write-only; NO read-back endpoint exists anywhere -------------------
  app.get('/manage/handles', M(), noStore, wrap(() => ({ handles: services.handles.listAll() })));
  app.get('/manage/handles/:handle(*)', M(), noStore, wrap((req) => services.handles.detail(req.params.handle)));
  app.post('/manage/kv', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => manage.createKv({
    principal: P(req), hostId: req.body.host_id, name: req.body.name, value: req.body.value,
    description: req.body.description, rotationPolicy: req.body.rotation_policy, recovery: req.body.recovery,
  })));
  app.post('/manage/handles/:handle(*)/rotate', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => manage.rotateKv({ principal: P(req), handle: req.params.handle })));

  // --- Host Onboarding (§5) -----------------------------------------------------------------------
  app.get('/manage/hosts', M(), noStore, wrap(() => ({ hosts: manage.listHosts() })));
  app.post('/manage/hosts', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => manage.registerHost({ principal: P(req), hostId: req.body.host_id, recovery: req.body.recovery })));
  app.post('/manage/hosts/:id/signrole/stage', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => manage.stageSignRole({ principal: P(req), hostId: req.params.id, allowedUsers: req.body.allowed_users, validPrincipals: req.body.valid_principals })));
  app.post('/manage/hosts/:id/signrole/apply', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => manage.applySignRole({ principal: P(req), hostId: req.params.id, diffHash: req.body.diff_hash, stepUpVerified: req.body.step_up_verified })));

  // --- Access Audit (§6) --------------------------------------------------------------------------
  app.get('/manage/audit', M(), noStore, wrap((req) => manage.auditQuery({ host: req.query.host, ticket: req.query.ticket, sub: req.query.sub, outcome: req.query.outcome })));
  app.get('/manage/audit/exfil', M(), noStore, wrap(() => manage.auditExfil()));
  app.get('/manage/audit/chain', M(), noStore, wrap(() => manage.chainStatus()));
  app.post('/manage/audit/chain/verify', M(), noStore, wrap(() => manage.verifyChain()));

  // --- Releases (§7) ------------------------------------------------------------------------------
  app.get('/manage/releases', M(), noStore, wrap((req) => ({ releases: releases.list({ host: req.query.host, ticket: req.query.ticket, status: req.query.status }), as_of: new Date().toISOString() })));
  app.post('/manage/releases/:release_id/revoke', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => ({ revoked: releases.revokeById(req.params.release_id, P(req).sub), note: 'pending release revoked; issued certs remain valid to TTL/KRL' })));

  // --- Status / DR (§8) ---------------------------------------------------------------------------
  app.get('/manage/status', M(), noStore, wrap(() => manage.status()));

  // --- Change Control (§9) — gate-weakening edits behind full ConfirmFriction ---------------------
  app.get('/manage/change-control/diff', M(), noStore, wrap((req) => manage.changeControlDiff({ edit: req.query.edit, from: req.query.from, to: req.query.to })));
  app.post('/manage/change-control/apply', M(), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => manage.changeControlApply({ principal: P(req), edit: req.body.edit, from: req.body.from, to: req.body.to, diffHash: req.body.diff_hash, stepUpVerified: req.body.step_up_verified })));

  return app;
}

function sendErr(res, e) {
  if (e instanceof BusinessError) return res.status(e.httpStatus).json(e.toStructured());
  if (e && e.httpStatus) return res.status(e.httpStatus).json({ code: e.code, message: e.message });
  return res.status(500).json({ code: 'internal', message: 'internal error' });
}
