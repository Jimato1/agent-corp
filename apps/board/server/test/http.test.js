/*
 * http.test.js — the HTTP surface contract (PLAN §7/§8/§12/§13): scope + kind gates, facts no-store,
 * consume_approval as board:execute (svc:gateway kind-gated), the SoD boundary rendered as ABSENCE.
 * Boots the REAL express app over an ephemeral port and drives it with fetch (two views, one state).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, fakeClients } from './helpers/harness.js';

let server, base, board;

before(async () => {
  const { config } = await import('../src/config.js');
  const { ResourceServer } = await import('../src/auth/rs.js');
  const { BudgetMiddleware } = await import('../src/auth/budget.js');
  const { buildApp } = await import('../src/api/http.js');
  const made = await makeBoard({ clients: fakeClients() });
  board = made.board;
  const app = buildApp({ board, rs: new ResourceServer(), budget: new BudgetMiddleware(), emitter: made.emitter });
  await new Promise((res) => { server = app.listen(0, res); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server && server.close());

function hdr(scopes, kind = 'human', sub = 'op:dev') {
  return { 'content-type': 'application/json', 'x-dev-sub': sub, 'x-dev-kind': kind, 'x-dev-scopes': scopes };
}

test('facts reads are Cache-Control: no-store (staleness weakens SoD checks)', async () => {
  const r = await fetch(`${base}/facts/ticket/T-999999`, { headers: hdr('board:read') });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const j = await r.json();
  assert.equal(j.exists, false);
});

test('consume_approval is board:execute + kind=service ONLY (a human token is 403)', async () => {
  const r = await fetch(`${base}/api/approvals/A-000001/consume`, { method: 'POST', headers: hdr('board:execute', 'human', 'op:dev'), body: '{}' });
  assert.equal(r.status, 403, 'kind=human may not hold board:execute');
});

test('the SoD boundary: an agent transition to a terminal state is 409 ILLEGAL_TRANSITION', async () => {
  // create + claim
  const c = await fetch(`${base}/api/tickets`, { method: 'POST', headers: hdr('board:propose', 'agent', 'agent:a'), body: JSON.stringify({ title: 't', host_id: 'h9', op_id: 'c-1' }) });
  const t = await c.json();
  const claim = await fetch(`${base}/api/claim`, { method: 'POST', headers: hdr('board:claim', 'agent', 'agent:a'), body: JSON.stringify({ ticket_id: t.ticket_id, op_id: 'cl-1' }) });
  const cl = await claim.json();
  const r = await fetch(`${base}/api/tickets/${t.ticket_id}/transition`, { method: 'POST', headers: hdr('board:update', 'agent', 'agent:a'), body: JSON.stringify({ to_status: 'done', fencing_token: cl.fencing_token, op_id: 'tr-1' }) });
  assert.equal(r.status, 409);
  const j = await r.json();
  assert.equal(j.code, 'ILLEGAL_TRANSITION');
});

test('missing scope => 403 insufficient_scope; missing token path is dev-bypassed only in test', async () => {
  const r = await fetch(`${base}/api/claim`, { method: 'POST', headers: hdr('board:read', 'agent', 'agent:a'), body: '{}' });
  assert.equal(r.status, 403);
});

test('healthz + protected-resource metadata advertise the board audience + scopes', async () => {
  const h = await (await fetch(`${base}/healthz`)).json();
  assert.equal(h.mcp_spec, '2025-11-25');
  const m = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json();
  assert.ok(m.scopes_supported.includes('board:execute'));
  assert.equal(m.resource, 'https://board');
});
