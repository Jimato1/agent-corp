/*
 * db/tx.js — the write-transaction discipline (D-14). better-sqlite3 is synchronous, so a transaction
 * body CANNOT await: no network I/O ever happens inside a write transaction. The redeem pipeline does
 * all its network work (introspect, Board facts, engine op, WORM ack) OUTSIDE any tx; the DB tx is used
 * only for the atomic release CAS + the local audit-row append.
 */
export function makeTx(db) {
  return {
    immediate(fn) {
      return db.transaction(fn).immediate();
    },
  };
}
