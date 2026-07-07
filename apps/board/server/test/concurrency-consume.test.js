/*
 * concurrency-consume.test.js — THE mandatory test (Board's CV-C). The entire SoD execution chain's
 * safety depends on this: TWO+ concurrent consumes of ONE approval must yield EXACTLY ONE success and
 * the rest 409 — NEVER two successes.
 *
 * This is a GENUINE concurrency proof, not a construction argument: N real worker threads, each with
 * its OWN better-sqlite3 connection to the SAME on-disk DB file, all call the REAL
 * board.approval.consume() path at a shared start instant. SQLite (WAL + BEGIN IMMEDIATE +
 * busy_timeout) serializes writers; the consume's execution-hold CAS and the approval status CAS are
 * each single-winner, so exactly one worker consumes.
 *
 * NOTE (CHECKLIST / operator): run this on the real on-disk SQLite build (this test does). The claim
 * recipe ports verbatim to Postgres FOR UPDATE SKIP LOCKED as the graduation path (PLAN §20.9); the
 * single-statement status CAS is identical there.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { makeBoard, fakeClients, principal } from './helpers/harness.js';

const WORKER = fileURLToPath(new URL('./helpers/consume-worker.mjs', import.meta.url));

// Set up an approval in `granted` state on a fresh on-disk DB, then close our writer so the workers race.
async function setupGrantedApproval(dbPath) {
  process.env.BOARD_DB_PATH = dbPath;
  const { board, db } = await makeBoard({ clients: fakeClients() });
  // makeBoard uses a randomized DB path; force it onto the shared path by re-opening explicitly.
  // Instead, drive the flow, then copy the file to dbPath. Simpler: build directly on dbPath here.
  const proposer = principal('agent:p');
  const op = principal('op:ada', ['board:approve'], 'human');
  const t = board.tickets.create({ principal: principal('op:1'), title: 'patch', type: 'package_update', hostId: 'web-prod-02', surface: 'http' });
  const tid = Number(/^T-(\d+)$/.exec(t.ticket_id)[1]);
  const c = board.claim.claim({ principal: proposer, ticketId: tid, opId: 'c1' });
  board.tickets.linkNote({ principal: proposer, ticketId: tid, noteId: 'N-plan1', fencingToken: c.fencing_token, opId: 'ln1' });
  await board.agentTransition({ principal: proposer, ticketId: tid, toStatus: 'awaiting_approval', fencingToken: c.fencing_token, opId: 'prop1' });
  const approval = await board.approval.grant({ principal: op, ticketId: tid, opId: 'g1' });
  const realPath = db.name; // the actual on-disk file makeBoard opened
  db.close(); // release our writer so worker connections can race
  return { realPath, approvalRef: approval.approval_id };
}

test('CV-C: N concurrent consumes of one approval => EXACTLY ONE success, the rest 409 (never two)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'board-cc-'));
  const { realPath, approvalRef } = await setupGrantedApproval(path.join(tmp, 'shared.db'));

  const N = 6;
  const startAt = Date.now() + 200; // shared start instant so all workers hit consume together
  const results = await Promise.all(
    Array.from({ length: N }, (_, idx) => new Promise((resolve, reject) => {
      const w = new Worker(WORKER, { workerData: { dbPath: realPath, approvalRef, idx, startAt } });
      w.once('message', (m) => { resolve(m); w.terminate(); });
      w.once('error', reject);
    })),
  );

  const successes = results.filter((r) => r.ok);
  const conflicts = results.filter((r) => !r.ok);
  assert.equal(successes.length, 1, `EXACTLY ONE consume may succeed — got ${successes.length}: ${JSON.stringify(results)}`);
  assert.equal(conflicts.length, N - 1, 'every other consume is a 409 business outcome');
  // Losers are HOST_LOCKED (the exec-hold gate) or approval_consumed (the status CAS) — both 409, both single-winner.
  for (const c of conflicts) assert.ok(['HOST_LOCKED', 'approval_consumed', 'approval_revoked'].includes(c.code), `unexpected loser code ${c.code}`);
});
