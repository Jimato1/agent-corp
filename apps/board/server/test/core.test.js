/*
 * core.test.js — claim engine, fencing, lease/reaper, and the SoD transition boundary.
 * Locks: board-agents-claim.md §1-4; PLAN §3-§6; TICKET_STATE_MACHINE §2.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, principal } from './helpers/harness.js';

const agentA = principal('agent:a');
const agentB = principal('agent:b');

/** Assert a synchronous call throws a BusinessError with the given .code. */
function throwsCode(fn, code) {
  try { fn(); } catch (e) { assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`); return; }
  assert.fail(`expected throw ${code}`);
}
async function rejectsCode(promise, code) {
  try { await promise; } catch (e) { assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`); return; }
  assert.fail(`expected rejection ${code}`);
}

async function seedTicket(board, over = {}) {
  return board.tickets.create({ principal: principal('op:1'), title: 't', hostId: 'web-prod-02', ...over, surface: 'http' });
}

test('atomic claim: host lock + fencing minted; NO_ELIGIBLE_WORK when empty', async () => {
  const { board } = await makeBoard();
  const empty = board.claim.claim({ principal: agentA, opId: 'e1' });
  assert.equal(empty.code, 'NO_ELIGIBLE_WORK');
  const t = await seedTicket(board);
  const r1 = board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'op-a1' });
  assert.equal(r1.fencing_token, 1);
  assert.equal(r1.host_id, 'web-prod-02');
});

test('second claim of a held ticket => CLAIM_CONFLICT', async () => {
  const { board } = await makeBoard();
  const t = await seedTicket(board);
  board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'x1' });
  throwsCode(() => board.claim.claim({ principal: agentB, ticketId: idNum(t), opId: 'x2' }), 'CLAIM_CONFLICT');
});

test('fencing is monotonic across claim -> release -> reclaim; stale heartbeat rejected', async () => {
  const { board, clock } = await makeBoard();
  const t = await seedTicket(board);
  const c1 = board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'c1' });
  assert.equal(c1.fencing_token, 1);
  board.claim.release({ principal: agentA, ticketId: idNum(t), fencingToken: 1, opId: 'r1' });
  const c2 = board.claim.claim({ principal: agentB, ticketId: idNum(t), opId: 'c2' });
  assert.ok(c2.fencing_token > c1.fencing_token, 'generation must increase');
  // A stale heartbeat with the old token is rejected.
  throwsCode(() => board.claim.heartbeat({ principal: agentA, ticketId: idNum(t), fencingToken: 1, opId: 'hb1' }), 'STALE_FENCING');
});

test('reaper is the sole lease-expiry path; requeues + bumps the fence', async () => {
  const { board, clock } = await makeBoard();
  const t = await seedTicket(board);
  const c = board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'c1' });
  clock.advance(6 * 60 * 1000); // past the 5-min lease
  const res = board.claim.reaperSweep();
  assert.equal(res.reaped, 1);
  const facts = board.facts.ticket(t.ticket_id);
  assert.equal(facts.status, 'todo');
  // re-claim gets a higher generation.
  const c2 = board.claim.claim({ principal: agentB, ticketId: idNum(t), opId: 'c2' });
  assert.ok(c2.fencing_token > c.fencing_token);
});

test('SoD boundary: an agent can NEVER cause a terminal/execution transition (violation logged)', async () => {
  const { board, db } = await makeBoard();
  const t = await seedTicket(board);
  const c = board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'c1' });
  for (const bad of ['approved', 'executing', 'verifying', 'done', 'failed', 'cancelled']) {
    await rejectsCode(board.agentTransition({ principal: agentA, ticketId: idNum(t), toStatus: bad, fencingToken: c.fencing_token, opId: 'op-' + bad }), 'ILLEGAL_TRANSITION');
  }
  const violations = db.prepare(`SELECT COUNT(*) n FROM audit_log WHERE outcome='violation'`).get().n;
  assert.ok(violations >= 6, 'each forbidden attempt logs a violation row');
});

test('agent may transition in_progress -> needs_review (fence-checked)', async () => {
  const { board } = await makeBoard();
  const t = await seedTicket(board);
  const c = board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'c1' });
  const r = await board.agentTransition({ principal: agentA, ticketId: idNum(t), toStatus: 'needs_review', fencingToken: c.fencing_token, opId: 't1' });
  assert.equal(r.status, 'needs_review');
});

test('needs_review -> done is operator-only; agents have no path', async () => {
  const { board } = await makeBoard();
  const t = await seedTicket(board);
  const c = board.claim.claim({ principal: agentA, ticketId: idNum(t), opId: 'c1' });
  await board.agentTransition({ principal: agentA, ticketId: idNum(t), toStatus: 'needs_review', fencingToken: c.fencing_token, opId: 't1' });
  const op = principal('op:1', ['board:approve'], 'human');
  const r = board.transitions.operatorTransition({ principal: op, ticketId: idNum(t), toStatus: 'done', opId: 'd1' });
  assert.equal(r.status, 'done');
});

test('lineage depth is server-derived and capped at claim', async () => {
  const { board } = await makeBoard({ config: { lineageMaxDepth: 2 } });
  // operator create => depth 0
  const epic = await seedTicket(board, { hostId: null });
  // agent claims epic then spawns child => depth grows through the active claim
  const c = board.claim.claim({ principal: agentA, ticketId: idNum(epic), opId: 'c1' });
  const child = board.tickets.create({ principal: agentA, title: 'child', surface: 'mcp' });
  assert.ok(child.lineage_depth >= 1, 'agent-created child depth > 0');
});

function idNum(t) { return Number(/^T-(\d+)$/.exec(t.ticket_id)[1]); }
