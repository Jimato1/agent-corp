/*
 * CORR-7 scope enforcement (server-side) + the update_note UNFENCED exemption, exercised over the
 * REAL REST surface. create/append/link require notes:append; update_note (PUT) requires notes:write;
 * an agent lacking write is refused; and update_note needs NO fencing token even on a ticket-bound
 * note (its holders — operator/maintenance — are never Board lease-holders).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeService, FakeBoard } from './helpers/harness.js';

const passthroughBudget = { middleware: () => (_req, _res, next) => next() };

async function startApp() {
  const board = new FakeBoard({ generation: 1, provenance: 'agent' });
  const built = await makeService({ board });
  const { buildApp } = await import('../src/api/http.js');
  const { ResourceServer } = await import('../src/auth/rs.js');
  const rs = new ResourceServer(); // dev-unsafe: principal from X-Dev-* headers
  const app = buildApp({ service: built.service, rs, budget: passthroughBudget, remote: built.remote, reconciler: built.reconciler, emitter: built.emitter });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const req = (method, p, { scopes = 'notes:read', sub = 'ag:tester', body } = {}) =>
    fetch(base + p, {
      method,
      headers: { 'content-type': 'application/json', 'x-dev-sub': sub, 'x-dev-scopes': scopes },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { built, server, req };
}

test('create requires notes:append; a read-only agent is refused', async () => {
  const { built, server, req } = await startApp();
  const denied = await req('POST', '/api/notes', { scopes: 'notes:read', body: { type: 'general', title: 'x', op_id: 'sc-1' } });
  assert.equal(denied.status, 403);
  const ok = await req('POST', '/api/notes', { scopes: 'notes:append', body: { type: 'general', title: 'ok note', op_id: 'sc-2' } });
  assert.equal(ok.status, 200);
  const j = await ok.json();
  assert.match(j.note_id, /^N-/);
  server.close();
  built.db.close();
});

test('update_note requires notes:write; an append-only agent is refused', async () => {
  const { built, server, req } = await startApp();
  const created = await req('POST', '/api/notes', { scopes: 'notes:append', body: { type: 'general', title: 'to update', op_id: 'sc-3' } });
  const { note_id } = await created.json();

  const denied = await req('PUT', `/api/notes/${note_id}`, { scopes: 'notes:append', body: { content: '# updated body', op_id: 'sc-4' } });
  assert.equal(denied.status, 403, 'notes:append must not satisfy notes:write');

  const ok = await req('PUT', `/api/notes/${note_id}`, { scopes: 'notes:write', sub: 'op:maint', body: { content: '# updated body', op_id: 'sc-5' } });
  assert.equal(ok.status, 200);
  server.close();
  built.db.close();
});

test('update_note is UNFENCED even on a ticket-bound note (the exemption)', async () => {
  const { built, server, req } = await startApp();
  // Create a ticket-bound note the fenced way (append scope + valid fence gen 1).
  const created = await built.service.createNote({
    type: 'plan', title: 'ticket bound plan', ticket_id: 'T-700',
    fencing_token: 1, op_id: 'sc-6', principal: { sub: 'ag:tester', display: 'ag:tester', scopes: ['notes:append'] },
  });
  const readsBefore = built.board.leaseReads;

  // PUT it with notes:write and NO fencing token — must succeed (exemption), and touch NO Board read.
  const put = await req('PUT', `/api/notes/${created.note_id}`, { scopes: 'notes:write', sub: 'op:maint', body: { content: '# operator overwrite', op_id: 'sc-7' } });
  assert.equal(put.status, 200, 'update_note must not require a fence');
  assert.equal(built.board.leaseReads, readsBefore, 'unfenced update must not read the Board');
  server.close();
  built.db.close();
});
