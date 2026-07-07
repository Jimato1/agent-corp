/*
 * api/http.js — the HTTP surface (PLAN §7/§8/§9/§10/§11/§15). The MCP adapter and the browser UI are
 * BOTH siblings of this over the one service layer (two views, one state). Scope + kind gates on every
 * endpoint (auth §1); facts reads are Cache-Control: no-store (§7 — staleness weakens SoD checks);
 * the Wazuh webhook authenticates by HMAC over the RAW body (D-9), not a bearer.
 *
 * The SoD boundary is rendered as ABSENCE: there is NO operator affordance for consume_approval
 * (Gateway-only), for approved->executing/verifying/done (Gateway/Board-automatic), or for clearing
 * taint (raise-only). consume_approval lives under board:execute (svc:gateway kind-gated) only.
 */
import express from 'express';
import { BusinessError } from '../errors.js';
import { SCOPES, ACTION_CLASS, ERR, STATES, APPROVER_KIND } from '../constants.js';
import { config } from '../config.js';

export function buildApp({ board, rs, budget, emitter }) {
  const app = express();
  app.disable('x-powered-by');

  // CORS allowlist for MC's browser-direct operator console (PLAN §17). Same-origin UI needs nothing.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin === config.mcOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
      if (req.method === 'OPTIONS') return res.status(204).end();
    }
    next();
  });

  // Wazuh webhook needs the RAW body for HMAC — mount raw BEFORE json (D-9).
  app.post('/hooks/wazuh', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const out = await board.kickoffs.wazuhWebhook({ rawBody: req.body, signature: req.headers['x-wazuh-signature'] || req.headers['x-hub-signature-256'] });
      res.status(202).json(out);
    } catch (e) { sendErr(res, e); }
  });

  app.use(express.json({ limit: '2mb' }));

  const R = (scope) => rs.requireScope(scope);
  const B = (cls) => budget.middleware(cls);
  const wrap = (fn) => async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.status(200).json(out);
    } catch (e) { sendErr(res, e); }
  };
  const noStore = (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); };
  const P = (req) => req.principal;

  // --- health & metadata -------------------------------------------------------------------------
  app.get('/healthz', (req, res) => res.json({ status: 'ok', mcp_spec: '2025-11-25' }));
  app.get('/.well-known/oauth-protected-resource', (req, res) => res.json(rs.metadata()));

  // --- facts read surface (§7) — board:read; Cache-Control: no-store ------------------------------
  app.get('/facts/ticket/:id', R(SCOPES.READ), noStore, wrap((req) => board.facts.ticket(req.params.id)));
  app.get('/facts/approval/:id', R(SCOPES.READ), noStore, wrap((req) => board.facts.approval(req.params.id)));
  app.get('/facts/host-lock/:host', R(SCOPES.READ), noStore, wrap((req) => board.facts.hostLock(req.params.host)));
  app.get('/facts/escalations', R(SCOPES.READ), noStore, wrap((req) => board.facts.escalations(Number(req.query.since) || 0)));
  app.get('/facts/violations', R(SCOPES.READ), noStore, wrap((req) => board.facts.violations(Number(req.query.since) || 0)));
  app.get('/facts/lineage/:id', R(SCOPES.READ), noStore, wrap((req) => board.facts.lineage(req.params.id)));
  app.get('/facts/holds', R(SCOPES.READ), noStore, wrap(() => board.facts.holds()));
  app.get('/facts/wip', R(SCOPES.READ), noStore, wrap(() => board.facts.wip()));
  app.get('/facts/kill', R(SCOPES.READ), noStore, wrap(() => board.facts.killPosture()));

  // --- reads for the UI (board:read) --------------------------------------------------------------
  app.get('/api/tickets/:id', R(SCOPES.READ), noStore, wrap((req) => {
    const t = board.getTicket(req.params.id);
    if (!t) throw new BusinessError(ERR.NOT_FOUND, 'ticket not found');
    return t;
  }));
  app.get('/api/queue', R(SCOPES.READ), noStore, wrap((req) => board.query({
    status: req.query.status, team: req.query.team, hostId: req.query.host_id, parentId: req.query.parent_id, phase: req.query.phase,
    limit: req.query.limit, cursor: req.query.cursor,
  })));
  app.get('/api/approvals/:id', R(SCOPES.READ), noStore, wrap((req) => {
    const a = board.getApproval(req.params.id);
    if (!a) throw new BusinessError(ERR.NOT_FOUND, 'approval not found');
    return a;
  }));
  app.get('/api/tickets/:id/huddle', R(SCOPES.READ), noStore, wrap((req) => board.ceremony.huddleState(req.params.id) ?? { open: false }));

  // --- claim / lease / fence (board:claim) --------------------------------------------------------
  app.post('/api/claim', R(SCOPES.CLAIM), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.claim.claim({
    principal: P(req), ticketId: req.body.ticket_id ? parseNum(req.body.ticket_id) : null, team: req.body.team, type: req.body.type, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/heartbeat', R(SCOPES.CLAIM), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.claim.heartbeat({
    principal: P(req), ticketId: parseNum(req.params.id), fencingToken: req.body.fencing_token, progressNote: req.body.progress_note, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/release', R(SCOPES.CLAIM), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.claim.release({
    principal: P(req), ticketId: parseNum(req.params.id), fencingToken: req.body.fencing_token, reason: req.body.reason, opId: req.body.op_id, surface: 'http',
  })));

  // --- agent transition (board:update) ------------------------------------------------------------
  app.post('/api/tickets/:id/transition', R(SCOPES.UPDATE), B(ACTION_CLASS.PROPOSE), wrap((req) => board.agentTransition({
    principal: P(req), ticketId: parseNum(req.params.id), toStatus: req.body.to_status, fencingToken: req.body.fencing_token, reason: req.body.reason, opId: req.body.op_id, surface: 'http',
  })));

  // --- create / update / link / deps (board:propose / board:update) -------------------------------
  app.post('/api/tickets', R(SCOPES.PROPOSE), B(ACTION_CLASS.PROPOSE), wrap((req) => board.tickets.create({
    principal: P(req), title: req.body.title, type: req.body.type, body: req.body.body, hostId: req.body.host_id, parentId: req.body.parent_id, team: req.body.team, opId: req.body.op_id, surface: 'http',
  })));
  app.patch('/api/tickets/:id', R(SCOPES.UPDATE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.tickets.update({
    principal: P(req), ticketId: parseNum(req.params.id), field: req.body.field, value: req.body.value, fencingToken: req.body.fencing_token, expectedVersion: req.body.expected_version, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/notes', R(SCOPES.UPDATE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.tickets.linkNote({
    principal: P(req), ticketId: parseNum(req.params.id), noteId: req.body.note_id, fencingToken: req.body.fencing_token, role: req.body.role, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/deps', R(SCOPES.UPDATE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.tickets.addDependency({
    principal: P(req), ticketId: parseNum(req.params.id), dependsOnId: req.body.depends_on_id, opId: req.body.op_id, surface: 'http',
  })));

  // --- ceremony (board:run-ceremony) --------------------------------------------------------------
  app.post('/api/tickets/:id/ceremony/triage', R(SCOPES.RUN_CEREMONY), B(ACTION_CLASS.PROPOSE), wrap((req) => board.ceremony.triage({ principal: P(req), ticketId: parseNum(req.params.id), opId: req.body.op_id, surface: 'http' })));
  app.post('/api/tickets/:id/ceremony/phase', R(SCOPES.RUN_CEREMONY), B(ACTION_CLASS.PROPOSE), wrap((req) => board.ceremony.transitionPhase({ principal: P(req), ticketId: parseNum(req.params.id), toPhase: req.body.to_phase, fencingToken: req.body.fencing_token, opId: req.body.op_id, surface: 'http' })));
  app.post('/api/tickets/:id/ceremony/statement', R(SCOPES.RUN_CEREMONY), B(ACTION_CLASS.PROPOSE), wrap((req) => board.ceremony.statement({ principal: P(req), ticketId: parseNum(req.params.id), kind: req.body.kind, noteId: req.body.note_id, noteRev: req.body.note_rev, opId: req.body.op_id, surface: 'http' })));
  app.post('/api/tickets/:id/ceremony/decompose', R(SCOPES.RUN_CEREMONY), B(ACTION_CLASS.PROPOSE), wrap((req) => board.ceremony.decompose({ principal: P(req), ticketId: parseNum(req.params.id), children: req.body.children, opId: req.body.op_id, surface: 'http' })));

  // --- approval decision (operator, board:approve) — the Board-owned RECORD ------------------------
  app.post('/api/tickets/:id/approve', R(SCOPES.APPROVE), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.approval.grant({
    principal: P(req), ticketId: parseNum(req.params.id), approverKind: APPROVER_KIND.OPERATOR, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/reject', R(SCOPES.APPROVE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.transitions.operatorTransition({
    principal: P(req), ticketId: parseNum(req.params.id), toStatus: STATES.CANCELLED, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/revoke', R(SCOPES.APPROVE), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.approval.revoke({
    principal: P(req), ticketId: parseNum(req.params.id), opId: req.body.op_id, surface: 'http',
  })));

  // --- Gateway (board:execute — svc:gateway kind-gated) -------------------------------------------
  // consume_approval — THE single-use atomic transition into the execution window.
  app.post('/api/approvals/:id/consume', R(SCOPES.EXECUTE), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.approval.consume({
    principal: P(req), approvalRefStr: req.params.id, ticketId: req.body.ticket_id, hostId: req.body.host_id, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/outcome', R(SCOPES.EXECUTE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.transitions.runOutcome({
    principal: P(req), ticketId: parseNum(req.params.id), toStatus: req.body.to_status, runId: req.body.run_id, opId: req.body.op_id, surface: 'http',
  })));
  app.post('/api/tickets/:id/verification', R(SCOPES.EXECUTE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.kickoffs.submitVerification({
    principal: P(req), ticketId: parseNum(req.params.id), result: req.body.result, evidence: req.body.evidence, opId: req.body.op_id, surface: 'http',
  })));

  // --- operator lifecycle transitions (human) -----------------------------------------------------
  app.post('/api/tickets/:id/operator-transition', R(SCOPES.APPROVE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.transitions.operatorTransition({
    principal: P(req), ticketId: parseNum(req.params.id), toStatus: req.body.to_status, expectedVersion: req.body.expected_version, reason: req.body.reason, opId: req.body.op_id, surface: 'http',
  })));

  // --- policy-plane writes (board:admin — operator + svc:mc) --------------------------------------
  app.put('/api/policy/wip', R(SCOPES.ADMIN), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.tx.immediate(() => {
    board.guardrails.setWipCap(req.body.scope, req.body.subject ?? null, Number(req.body.cap));
    board.audit.record({ actor_sub: P(req).sub, surface: 'http', action: 'set_wip', fields_changed: req.body });
    return { ok: true };
  })));
  app.put('/api/policy/lineage', R(SCOPES.ADMIN), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.tx.immediate(() => {
    board.guardrails.setLineageDepth(Number(req.body.max_depth));
    board.audit.record({ actor_sub: P(req).sub, surface: 'http', action: 'set_lineage', fields_changed: req.body });
    return { ok: true };
  })));
  app.post('/api/tickets/:id/clear-quarantine', R(SCOPES.ADMIN), B(ACTION_CLASS.SOD_CRITICAL), wrap((req) => board.tickets.clearQuarantine({ principal: P(req), ticketId: parseNum(req.params.id), hostId: req.body.host_id, opId: req.body.op_id, surface: 'http' })));
  app.post('/api/tickets/:id/clear-hold', R(SCOPES.ADMIN), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.claim.clearOutageHold(parseNum(req.params.id))));

  // --- A2 break-glass birth (svc:auth kind-gated create) ------------------------------------------
  app.post('/api/breakglass', R(SCOPES.AUTH_CREATE), B(ACTION_CLASS.WRITE_BENIGN), wrap((req) => board.kickoffs.breakglassReviewTicket({ principal: P(req), title: req.body.title, body: req.body.body, opId: req.body.op_id, surface: 'http' })));

  // --- SSE live stream (board:read) — one feed for UI + MC (§15) ----------------------------------
  app.get('/api/events', rs.authOnly(), (req, res) => {
    if (!req.principal.scopes.includes(SCOPES.READ)) return res.status(403).json({ error: 'insufficient_scope', scope: SCOPES.READ });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    let seq = Number(req.headers['last-event-id']) || 0;
    const send = (event, data) => res.write(`id: ${++seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const onTicket = (d) => send('ticket', d);
    const onCeremony = (d) => send('ceremony', d);
    const onEscalation = (d) => send('escalation', d);
    emitter.on('ticket', onTicket); emitter.on('ceremony', onCeremony); emitter.on('escalation', onEscalation);
    const hb = setInterval(() => res.write(': hb\n\n'), 15000);
    if (hb.unref) hb.unref();
    let expTimer = null;
    if (req.principal.exp) {
      const ms = req.principal.exp * 1000 - Date.now();
      if (ms > 0) { expTimer = setTimeout(() => { send('session', { reason: 'token_exp' }); res.end(); }, ms); if (expTimer.unref) expTimer.unref(); }
    }
    req.on('close', () => { clearInterval(hb); if (expTimer) clearTimeout(expTimer); emitter.off('ticket', onTicket); emitter.off('ceremony', onCeremony); emitter.off('escalation', onEscalation); });
  });

  return app;
}

function parseNum(v) {
  if (v == null) return null;
  const m = /^T-(\d+)$/.exec(String(v));
  if (m) return Number.parseInt(m[1], 10);
  const n = Number.parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function sendErr(res, e) {
  if (e instanceof BusinessError) return res.status(e.httpStatus).json(e.toStructured());
  if (e && e.httpStatus) return res.status(e.httpStatus).json({ error: e.code, message: e.message });
  return res.status(500).json({ code: 'INTERNAL', message: 'internal error' });
}
