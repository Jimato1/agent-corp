/*
 * CORR-6 — uncached fencing on ticket-bound writes, fail-closed, with a Notes-side monotonic floor.
 *
 * Covers: matching token passes; missing token → FENCE_REQUIRED; token below the floor → STALE_FENCE;
 * Board unreachable → FENCE_UNVERIFIABLE (fail-closed); the monotonic floor rejects a replayed-lower
 * token EVEN IF the Board (wrongly) returns it; and there is NO cache — two fenced writes = two
 * live Board reads.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ERR } from '../src/constants.js';
import { makeService, FakeBoard, principal } from './helpers/harness.js';

const P = principal('ag:tester', ['notes:append']);

async function rejects(promise, code) {
  await assert.rejects(promise, (e) => {
    assert.equal(e.code, code, `expected ${code}, got ${e.code}`);
    return true;
  });
}

test('matching fencing token passes; ticketFacts sets the structural floor', async () => {
  const board = new FakeBoard({ generation: 5, provenance: 'agent' });
  const { service, db } = await makeService({ board });
  const r = await service.createNote({
    type: 'research', title: 'fenced ok', ticket_id: 'T-500',
    fencing_token: 5, op_id: 'op-fx-ok', principal: P,
  });
  assert.equal(r.ok, true);
  db.close();
});

test('missing token on a ticket-bound write → FENCE_REQUIRED', async () => {
  const board = new FakeBoard({ generation: 5 });
  const { service, db } = await makeService({ board });
  await rejects(
    service.createNote({ type: 'research', title: 'no fence', ticket_id: 'T-503', op_id: 'op-fx-req', principal: P }),
    ERR.FENCE_REQUIRED,
  );
  db.close();
});

test('token below the monotonic floor → STALE_FENCE', async () => {
  const board = new FakeBoard({ generation: 5 });
  const { service, db } = await makeService({ board });
  const created = await service.createNote({
    type: 'research', title: 'floor note', ticket_id: 'T-501',
    fencing_token: 5, op_id: 'op-fx-f1', principal: P,
  });
  // floor for T-501 is now 5; a later append presenting 4 must be rejected.
  await rejects(
    service.appendNote({ note_id: created.note_id, section: 'Findings', content: 'x', fencing_token: 4, op_id: 'op-fx-f2', principal: P }),
    ERR.STALE_FENCE,
  );
  db.close();
});

test('Board unreachable → FENCE_UNVERIFIABLE (fail-closed)', async () => {
  const board = new FakeBoard({ generation: 1 });
  board.throwLease = true;
  const { service, db } = await makeService({ board });
  await rejects(
    service.createNote({ type: 'research', title: 'board down', ticket_id: 'T-502', fencing_token: 1, op_id: 'op-fx-u1', principal: P }),
    ERR.FENCE_UNVERIFIABLE,
  );
  db.close();
});

test('monotonic floor rejects a replayed-lower token EVEN IF the Board wrongly returns it', async () => {
  const board = new FakeBoard({ generation: 5 });
  const { service, db } = await makeService({ board });
  const created = await service.createNote({
    type: 'research', title: 'replay note', ticket_id: 'T-510',
    fencing_token: 5, op_id: 'op-fx-r1', principal: P,
  });
  // The Board is now buggy/compromised and echoes an OLD generation of 3.
  board.generation = 3;
  await rejects(
    service.appendNote({ note_id: created.note_id, section: 'Findings', content: 'replayed', fencing_token: 3, op_id: 'op-fx-r2', principal: P }),
    ERR.STALE_FENCE,
  );
  db.close();
});

test('fencing is UNCACHED: two fenced writes = two live Board reads', async () => {
  const board = new FakeBoard({ generation: 7 });
  const { service, db } = await makeService({ board });
  const created = await service.createNote({
    type: 'research', title: 'uncached note', ticket_id: 'T-520',
    fencing_token: 7, op_id: 'op-fx-c0', principal: P,
  });
  const baseline = board.leaseReads; // reads consumed by the create's fence check
  await service.appendNote({ note_id: created.note_id, section: 'Findings', content: 'a', fencing_token: 7, op_id: 'op-fx-c1', principal: P });
  await service.appendNote({ note_id: created.note_id, section: 'Findings', content: 'b', fencing_token: 7, op_id: 'op-fx-c2', principal: P });
  assert.equal(board.leaseReads - baseline, 2, 'each fenced write must do its own live Board read — no cache');
  db.close();
});

test('non-ticket writes are UNFENCED (no Board read at all)', async () => {
  const board = new FakeBoard({ generation: 9 });
  const { service, db } = await makeService({ board });
  await service.createNote({ type: 'general', title: 'free note', op_id: 'op-fx-free', principal: P });
  assert.equal(board.leaseReads, 0, 'a non-ticket write must never touch the Board');
  db.close();
});
