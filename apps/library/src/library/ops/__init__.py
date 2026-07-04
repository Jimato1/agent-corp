"""library.ops — ops.db (CANONICAL, PLAN §1.4): switching state, job history, op_id
idempotency ledger. Only what is genuinely NOT derivable from the corpus lives here;
audit-grade admission records live in the git-backed `_audit/` stream, never here.
"""
