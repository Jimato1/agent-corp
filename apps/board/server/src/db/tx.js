/*
 * db/tx.js — the write-transaction discipline (PLAN §1; D-14).
 *
 * Every claim / consume / transition / grant opens with BEGIN IMMEDIATE (the write lock is grabbed
 * up front — the documented SQLITE_BUSY trap is BEGIN DEFERRED upgrading mid-transaction). better-
 * sqlite3 is synchronous, so a transaction body cannot `await`: NO network I/O ever happens inside a
 * write transaction (cross-app fetches complete BEFORE the tx, with an in-tx re-verify of pinned
 * inputs — §8.2). SSE events are collected during the tx and flushed only AFTER commit.
 */
export function makeTx(db, emitter) {
  return {
    /**
     * Run `fn(ctx)` inside a BEGIN IMMEDIATE transaction. `ctx.emit(type, data)` queues an SSE event
     * that is flushed to the emitter only if the transaction COMMITS. A throw rolls everything back
     * (including any op_id row and audit intent) and discards queued events.
     */
    immediate(fn) {
      const events = [];
      const ctx = { emit: (type, data) => events.push([type, data]) };
      const result = db.transaction(() => fn(ctx)).immediate();
      if (emitter) for (const [t, d] of events) emitter.emit(t, d);
      return result;
    },
  };
}
