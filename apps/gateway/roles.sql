-- gateway Postgres roles (D-8; PLAN §2). Applied at init by the operator's owner credential.
--
-- The append-only property is enforced at the GRANT level: gw_app (the runtime role) has
-- INSERT+SELECT on the append-only tables and NO update/delete/truncate. In-database
-- append-only cannot restrain a superuser (a documented PG limit) — so the app role simply
-- never has that power, and the DBA credential lives OUTSIDE the container.
--
-- gw_owner  : DDL, owns tables (migration-time only; app never connects as this).
-- gw_app    : runtime; INSERT+SELECT on append-only; state-CAS UPDATE on the mutable projections.
-- gw_anchor : SELECT on chain heads only (the anchor pusher).

CREATE ROLE gw_app    LOGIN;
CREATE ROLE gw_anchor LOGIN;

-- Append-only canonical tables: INSERT + SELECT only for gw_app (no UPDATE/DELETE/TRUNCATE).
GRANT SELECT, INSERT ON audit_chain   TO gw_app;
GRANT SELECT, INSERT ON chain_heads   TO gw_app;
GRANT SELECT, INSERT ON sandbox_runs  TO gw_app;
GRANT SELECT, INSERT ON decision_log  TO gw_app;

-- runs: INSERT + state-CAS UPDATE (guarded by the legal-transition trigger below) + SELECT.
GRANT SELECT, INSERT, UPDATE ON runs        TO gw_app;
GRANT SELECT, INSERT, UPDATE ON host_fence  TO gw_app;   -- monotonic UPDATE (trigger rejects a decrease)
GRANT SELECT, INSERT, UPDATE ON kill_state  TO gw_app;   -- monotonic epoch
GRANT SELECT, INSERT ON op_dedup            TO gw_app;

-- playbook_catalog: SELECT for the runtime; writes go through the operator step-up path only,
-- as a distinct connection role (not gw_app) — no MCP path exists.
GRANT SELECT ON playbook_catalog TO gw_app;

-- The anchor pusher reads chain heads only.
GRANT SELECT ON chain_heads TO gw_anchor;

-- host_fence monotonicity trigger (belt over the app-level guard in runs_store.py).
CREATE OR REPLACE FUNCTION reject_fence_decrease() RETURNS trigger AS $$
BEGIN
  IF NEW.fence < OLD.fence THEN
    RAISE EXCEPTION 'host_fence is monotonic: refusing decrease % -> %', OLD.fence, NEW.fence;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_host_fence_monotonic BEFORE UPDATE ON host_fence
  FOR EACH ROW EXECUTE FUNCTION reject_fence_decrease();

-- kill_state epoch monotonicity trigger.
CREATE OR REPLACE FUNCTION reject_epoch_decrease() RETURNS trigger AS $$
BEGIN
  IF NEW.epoch < OLD.epoch THEN
    RAISE EXCEPTION 'kill epoch is monotonic: refusing decrease % -> %', OLD.epoch, NEW.epoch;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kill_epoch_monotonic BEFORE UPDATE ON kill_state
  FOR EACH ROW EXECUTE FUNCTION reject_epoch_decrease();
