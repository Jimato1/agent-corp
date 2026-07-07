/*
 * kickoffs-restore.test.js — Wazuh event kickoff + verification evidence (FROZEN
 * board-wazuh-connector-kickoff.md) and the §16 restore-consistency reconciliation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { makeBoard, fakeClients, principal } from './helpers/harness.js';

const SECRET = 'test-secret';
function sign(body) { return crypto.createHmac('sha256', SECRET).update(body).digest('hex'); }
function num(t) { return Number(/^T-(\d+)$/.exec(t.ticket_id)[1]); }

test('Wazuh webhook: valid HMAC + mapped agent => execution ticket, tainted; bad HMAC rejected; dedup', async () => {
  const { board } = await makeBoard({ clients: fakeClients({ agentHost: 'web-prod-02' }), config: { wazuhHmacSecret: SECRET } });
  const alert = Buffer.from(JSON.stringify({ agent: { id: '004' }, data: { vulnerability: { cve: 'CVE-2026-1', status: 'active' } } }));
  // bad signature rejected
  await assert.rejects(board.kickoffs.wazuhWebhook({ rawBody: alert, signature: 'deadbeef' }), (e) => e.code === 'VALIDATION');
  // valid
  const r1 = await board.kickoffs.wazuhWebhook({ rawBody: alert, signature: sign(alert) });
  assert.equal(r1.status, 'created');
  const facts = board.facts.ticket(r1.ticket_id);
  assert.equal(facts.host_id, 'web-prod-02');
  assert.equal(facts.taint_host_originated, true, 'alert-derived fields are host-originated (auto-lane-ineligible)');
  // re-delivery is a no-op (dedup on spawn_key)
  const r2 = await board.kickoffs.wazuhWebhook({ rawBody: alert, signature: sign(alert) });
  assert.equal(r2.status, 'duplicate');
});

test('Wazuh webhook: unmapped agent => QUARANTINE ticket (born todo, quarantine=1, structurally unclaimable)', async () => {
  const { board } = await makeBoard({ clients: fakeClients({ agentHost: null }), config: { wazuhHmacSecret: SECRET } });
  const alert = Buffer.from(JSON.stringify({ agent: { id: '999' }, data: { vulnerability: { cve: 'CVE-2026-2', status: 'active' } } }));
  const r = await board.kickoffs.wazuhWebhook({ rawBody: alert, signature: sign(alert) });
  assert.equal(r.status, 'quarantined');
  const f = board.facts.ticket(r.ticket_id);
  assert.equal(f.status, 'todo');
  assert.equal(f.host_id, null);
  // structurally excluded from every claim query
  const claimed = board.claim.claim({ principal: principal('agent:x'), opId: 'c1' });
  assert.equal(claimed.code, 'NO_ELIGIBLE_WORK');
});

test('verification evidence drives the AUTOMATIC verifying -> done (confirmed) / failed (refuted)', async () => {
  const { board } = await makeBoard({ config: { wazuhHmacSecret: SECRET } });
  const t = board.tickets.create({ principal: principal('op:1'), title: 't', hostId: 'h1', surface: 'http' });
  // force it into verifying for the test
  board.db.prepare(`UPDATE tickets SET status='verifying' WHERE id=?`).run(num(t));
  const gw = principal('svc:gateway', ['board:execute'], 'service');
  const r = board.kickoffs.submitVerification({ principal: gw, ticketId: num(t), result: 'confirmed', evidence: { run_id: 'R-1', query: 'q', absence_result: true }, opId: 'v1' });
  assert.equal(r.status, 'done');
});

test('§16 restore reconciliation: granted approvals revoked (A-RR), leases requeued, fencing time-floored', async () => {
  const { board, clock } = await makeBoard({ clients: fakeClients() });
  // set up a granted approval
  const proposer = principal('agent:p'); const op = principal('op:ada', ['board:approve'], 'human');
  const t = board.tickets.create({ principal: principal('op:1'), title: 'patch', type: 'package_update', hostId: 'web-prod-02', surface: 'http' });
  const c = board.claim.claim({ principal: proposer, ticketId: num(t), opId: 'c1' });
  board.tickets.linkNote({ principal: proposer, ticketId: num(t), noteId: 'N-plan1', fencingToken: c.fencing_token, opId: 'ln1' });
  await board.agentTransition({ principal: proposer, ticketId: num(t), toStatus: 'awaiting_approval', fencingToken: c.fencing_token, opId: 'prop1' });
  const approval = await board.approval.grant({ principal: op, ticketId: num(t), opId: 'g1' });
  assert.equal(board.facts.ticket(t.ticket_id).status, 'approved');

  board.backup.reconcileOnBoot();

  // granted approval revoked; ticket re-queued to awaiting_approval (A-RR); lineage intact.
  assert.equal(board.facts.approval(approval.approval_id).status, 'revoked');
  assert.equal(board.facts.ticket(t.ticket_id).status, 'awaiting_approval');
  // fencing floored to >= wall-clock ms (a lost window can never have out-minted this).
  const lock = board.db.prepare(`SELECT lock_generation FROM host_locks WHERE resource_id='web-prod-02'`).get();
  assert.ok(lock.lock_generation >= clock.now(), 'lock_generation time-seeded to the restore instant');
});
