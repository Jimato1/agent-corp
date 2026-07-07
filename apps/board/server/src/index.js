/*
 * index.js — service boot. API-first wiring (PLAN §18): store + state-machine core -> claim/fence/lease
 * -> facts -> approval/consume -> kickoffs -> ceremony -> tier-approver + kill -> MCP -> UI.
 *
 * The Board DB is CANONICAL: a RESTORE (explicit operator action, BOARD_RESTORE_RECONCILE=1) runs the
 * §16 restore-consistency reconciliation BEFORE serving. A normal restart does NOT (that would floor
 * generations and spuriously fence live holders).
 */
import { EventEmitter } from 'node:events';
import { config, assertBootRequirements } from './config.js';
import { log } from './logging.js';
import { systemClock } from './clock.js';
import { openDb } from './db/schema.js';
import { BoardService } from './board-service.js';
import { NotesClient, CmdbClient, ChatClient } from './clients/index.js';
import { ResourceServer } from './auth/rs.js';
import { BudgetMiddleware } from './auth/budget.js';
import { buildApp } from './api/http.js';
import { mountMcp } from './mcp/server.js';
import { mountStatic } from './api/static.js';
import { Sweeps } from './service/sweeps.js';

export async function bootstrap() {
  assertBootRequirements();

  const clock = systemClock();
  const db = openDb(config.dbPath);
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  // svc:board is a client of Notes/CMDB/Chat (PLAN §13 ask #4/#5). Token provider is wired to auth's
  // client-credentials flow at deploy time; null in dev (upstream calls then fail-closed on the SoD path).
  const tokenProvider = async () => null; // TODO(deploy): svc:board client-assertion -> auth token
  const clients = {
    notes: new NotesClient({ config, tokenProvider }),
    cmdb: new CmdbClient({ config, tokenProvider }),
    chat: new ChatClient({ config, tokenProvider, logger: log }),
  };

  const board = new BoardService({ db, clock, config, emitter, clients, logger: log });

  // §16 restore reconciliation — explicit operator action only.
  if (config.restoreReconcile) {
    board.backup.reconcileOnBoot();
    log.warn('restore_reconcile_ran', {});
  }

  const rs = new ResourceServer();
  const budget = new BudgetMiddleware();
  const app = buildApp({ board, rs, budget, emitter });
  mountMcp(app, { board, rs });
  mountStatic(app);

  const sweeps = new Sweeps({ board, config, clock, logger: log });
  sweeps.start();
  board.backup.start();
  board.tierApprover.start();

  const server = app.listen(config.port, () => {
    log.info('board_listening', { port: config.port, mcp_spec: '2025-11-25', tier_approver: config.tierApproverEnabled });
  });

  const shutdown = async () => {
    sweeps.stop();
    board.backup.stop();
    board.tierApprover.stop();
    server.close();
    db.close();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return { app, server, board, db, sweeps, shutdown };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
  bootstrap().catch((e) => {
    log.error('boot_failed', { err: String(e.stack || e) });
    process.exit(1);
  });
}
