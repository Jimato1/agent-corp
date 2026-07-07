/*
 * consume-worker.mjs — one worker thread that opens the SHARED on-disk Board DB with its OWN
 * better-sqlite3 connection and calls the REAL board.approval.consume() path against a single
 * approval. Multiple of these race concurrently; SQLite (WAL + BEGIN IMMEDIATE + busy_timeout)
 * serializes writers so exactly one wins. Result (200 | 409+code) is posted back to the main thread.
 */
import { workerData, parentPort, isMainThread } from 'node:worker_threads';

// This file lives under test/ so `node --test` discovers it. It is NOT a test — it is only meaningful
// when spawned as a Worker. Guard so a standalone discovery run is a harmless no-op.
if (!isMainThread && workerData) {
  // config.js reads env at import — set the shared DB + dev-auth BEFORE importing anything that reads it.
  process.env.BOARD_DB_PATH = workerData.dbPath;
  process.env.BOARD_DEV_UNSAFE_NO_AUTH = 'true';
  process.env.BOARD_DISABLE_SWEEPS = 'true';
  process.env.NODE_ENV = 'test';
  process.env.BOARD_LOG_LEVEL = 'error';

  const { config } = await import('../../src/config.js');
  const { openDb } = await import('../../src/db/schema.js');
  const { BoardService } = await import('../../src/board-service.js');
  const { systemClock } = await import('../../src/clock.js');
  const { EventEmitter } = await import('node:events');

  const db = openDb(workerData.dbPath); // OWN connection to the shared file
  const board = new BoardService({
    db, clock: systemClock(), config, emitter: new EventEmitter(),
    clients: { notes: {}, cmdb: {}, chat: { postEscalation: async () => {} } },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
  });

  const gw = { sub: 'svc:gateway', kind: 'service', scopes: ['board:execute'] };
  // Barrier: spin until the release instant so all workers hit consume as simultaneously as possible.
  while (Date.now() < workerData.startAt) { /* busy-wait to the shared start instant */ }

  let result;
  try {
    const r = board.approval.consume({ principal: gw, approvalRefStr: workerData.approvalRef, opId: `con-${workerData.idx}` });
    result = { ok: true, fencing_token: r.fencing_token };
  } catch (e) {
    result = { ok: false, code: e.code || 'ERR', message: e.message };
  }
  db.close();
  parentPort.postMessage(result);
}
