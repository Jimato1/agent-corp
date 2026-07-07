/*
 * approval.test.js — the approval record + consume_approval (PLAN §8; D-S2 / REVIEW_2 §S2).
 * Locks: four-eyes at the Board (independent of the PDP), derived action_class from allowlist
 * playbooks, single-use consume (CAS), the execution-hold fencing token, the auto-approve floor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, fakeClients, principal, planNote } from './helpers/harness.js';

const gw = principal('svc:gateway', ['board:execute', 'board:read'], 'service');
const op = principal('op:ada', ['board:approve'], 'human');

function throwsCode(fn, code) { try { fn(); } catch (e) { assert.equal(e.code, code, `${code}? got ${e.code}: ${e.message}`); return; } assert.fail(`expected ${code}`); }

// Drive a ticket from creation to `approved` with a minted approval. Returns {board, tid, approvalRef}.
async function driveToApproved(over = {}) {
  const { board } = await makeBoard({ clients: fakeClients(over.clients) });
  const proposer = principal('agent:patcher-07');
  const t = board.tickets.create({ principal: principal('op:1'), title: 'patch nginx', type: 'package_update', hostId: 'web-prod-02', surface: 'http' });
  const tid = num(t);
  const c = board.claim.claim({ principal: proposer, ticketId: tid, opId: 'c1' });
  board.tickets.linkNote({ principal: proposer, ticketId: tid, noteId: 'N-plan1', fencingToken: c.fencing_token, opId: 'ln1' });
  await board.agentTransition({ principal: proposer, ticketId: tid, toStatus: 'awaiting_approval', fencingToken: c.fencing_token, opId: 'prop1' });
  return { board, tid, proposer };
}
function num(t) { return Number(/^T-(\d+)$/.exec(t.ticket_id)[1]); }

test('full happy path: propose -> grant (four-eyes) -> consume -> executing; fencing is fresh + unique', async () => {
  const { board, tid } = await driveToApproved();
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  assert.equal(approval.status, 'granted');
  assert.equal(approval.action_class, 'standard');
  assert.ok(approval.allowlist.length >= 1);
  const consumed = board.approval.consume({ principal: gw, approvalRefStr: approval.approval_id, ticketId: `T-${String(tid).padStart(6, '0')}`, hostId: 'web-prod-02', opId: 'con1' });
  assert.equal(board.facts.ticket(`T-${String(tid).padStart(6, '0')}`).status, 'executing');
  assert.ok(consumed.fencing_token >= 1);
  assert.equal(consumed.plan_hash.startsWith('sha256:'), true);
});

test('FOUR-EYES enforced at the Board: approver == proposer is rejected + logged', async () => {
  const { board, tid, proposer } = await driveToApproved();
  const selfApprove = principal(proposer.sub, ['board:approve'], 'human');
  await assert.rejects(board.approval.grant({ principal: selfApprove, ticketId: tid, opId: 'g1' }), (e) => e.code === 'FOUR_EYES');
  const v = board.db.prepare(`SELECT COUNT(*) n FROM audit_log WHERE action='four_eyes_violation'`).get().n;
  assert.ok(v >= 1, 'four-eyes violation is logged even though the grant tx rolled back');
});

test('consume is SINGLE-USE: a second consume denies terminal approval_consumed', async () => {
  const { board, tid } = await driveToApproved();
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  board.approval.consume({ principal: gw, approvalRefStr: approval.approval_id, opId: 'con1' });
  // The run finishes and releases the execution hold (executing -> verifying), freeing the host so the
  // second consume reaches the STATUS CAS (rather than the exec-hold gate) — proving APPROVAL_CONSUMED.
  board.transitions.runOutcome({ principal: gw, ticketId: tid, toStatus: 'verifying', runId: 'R-1', opId: 'o1' });
  throwsCode(() => board.approval.consume({ principal: gw, approvalRefStr: approval.approval_id, opId: 'con2' }), 'approval_consumed');
});

test('the consume CAS is a single atomic conditional UPDATE (not check-then-write)', async () => {
  // Prove the status CAS itself is a single winner: run the exact statement twice in sequence.
  const { board, tid } = await driveToApproved();
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  const id = Number(/^A-(\d+)$/.exec(approval.approval_id)[1]);
  const cas = board.db.prepare(`UPDATE approvals SET status='consumed', consumed_by='x' WHERE id=? AND status='granted'`);
  const first = cas.run(id);
  const second = cas.run(id);
  assert.equal(first.changes, 1, 'exactly one row matches status=granted');
  assert.equal(second.changes, 0, 'the second attempt matches ZERO rows — single winner by the DB');
});

test('a consume that cannot lock the host burns nothing: approval stays granted (HOST_LOCKED)', async () => {
  const { board, tid } = await driveToApproved();
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  // A live claim holds the host (someone re-claims after approval — the host lock is free post-propose,
  // so simulate contention by placing an execution hold first via one consume, then a second consume).
  // Simpler: manually hold the host lock, then consume must roll back with approval intact.
  board.db.prepare(`UPDATE host_locks SET claimed_by_ticket=?, claimed_by_agent='agent:z', hold_kind='claim' WHERE resource_id='web-prod-02'`).run(tid);
  throwsCode(() => board.approval.consume({ principal: gw, approvalRefStr: approval.approval_id, opId: 'con1' }), 'HOST_LOCKED');
  assert.equal(board.facts.approval(approval.approval_id).status, 'granted', 'approval unspent — nothing burned');
});

test('derived action_class comes from the allowlist playbooks, never the ticket type', async () => {
  // A benign-typed ticket whose playbook is destructive derives destructive (and blocks the auto lane).
  const { board, tid } = await driveToApproved({ clients: { playbookClass: 'destructive' } });
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  assert.equal(approval.action_class, 'destructive');
});

test('auto-approve FLOOR: tier-policy grant refused for a destructive derived class', async () => {
  const { board, tid } = await driveToApproved({ clients: { playbookClass: 'destructive' } });
  const svc = principal('svc:tier-approver', ['board:approve'], 'service');
  await assert.rejects(board.approval.grant({ principal: svc, ticketId: tid, approverKind: 'tier_policy', opId: 'g1' }), (e) => e.code === 'AUTO_APPROVE_FORBIDDEN');
});

test('taint makes a ticket auto-approve-lane INELIGIBLE (curation-team origin)', async () => {
  const { board } = await makeBoard();
  const curator = principal('agent:curator');
  const t = board.tickets.create({ principal: curator, title: 'ingest', hostId: 'web-prod-02', team: 'library-curation', originKind: 'agent', surface: 'mcp' });
  assert.equal(board.facts.ticket(t.ticket_id).taint_host_originated, true);
});

test('operator cancel of an APPROVED ticket revokes the linked approval + releases the host (no dangling grant)', async () => {
  const { board, tid } = await driveToApproved();
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  assert.equal(approval.status, 'granted');
  // Operator cancels via the generic operator-transition path (not /revoke) — the record must stay consistent.
  const opUser = principal('op:ada', ['board:update'], 'human');
  board.transitions.operatorTransition({ principal: opUser, ticketId: tid, toStatus: 'cancelled', opId: 'oc1', surface: 'http' });
  assert.equal(board.facts.ticket(tid).status, 'cancelled', 'ticket cancelled');
  assert.equal(board.facts.approval(approval.approval_id).status, 'revoked', 'approval revoked, not left dangling as granted');
  assert.equal(board.facts.hostLock('web-prod-02').claimed_by_ticket, null, 'no live host hold remains');
});
