/*
 * index.js — service boot. API-first wiring (PLAN §15): core → MCP → UI (UI is a separate build).
 *
 * Boot order encodes CORR-5: assertBootRequirements() REFUSES to boot with no git remote. A
 * boot-time ls-remote failure is degraded-visible (serves, /healthz red), NOT refuse-boot, so the
 * corpus stays available if the backup target is down (PLAN §2.3).
 */
import { EventEmitter } from 'node:events';
import { config, assertBootRequirements } from './config.js';
import { log } from './logging.js';
import * as corpus from './storage/corpus.js';
import { openDb } from './index/db.js';
import { Repo } from './index/repo.js';
import { GitService } from './git/repo.js';
import { RemoteManager } from './git/remote.js';
import { Reconciler } from './index/reconcile.js';
import { FenceValidator } from './board/fencing.js';
import { BoardClient } from './board/client.js';
import { NotesService } from './service.js';
import { ResourceServer } from './auth/rs.js';
import { BudgetMiddleware } from './auth/budget.js';
import { buildApp } from './api/http.js';
import { mountMcp } from './mcp/server.js';
import { mountStatic } from './api/static.js';

export async function bootstrap() {
  // CORR-5 — refuse to boot without a configured off-box remote (ARCH §10).
  assertBootRequirements();

  await corpus.ensureLayout();
  const git = new GitService();
  await git.ensureRepo();

  const remote = new RemoteManager();
  await remote.configureRemote();
  const reachable = await remote.probe(); // degraded-visible on failure (does NOT refuse boot)
  if (reachable) await remote.checkDivergence();

  const freshDb = !corpus.dbExists();
  const db = openDb();
  const repo = new Repo(db);
  const emitter = new EventEmitter();
  const reconciler = new Reconciler({ db, repo, gitService: git, corpusPath: config.corpusPath, emitter });
  await reconciler.reconcileAll({ full: freshDb }); // CORR-1: rebuild the index from files at boot

  const boardClient = new BoardClient();
  const fenceValidator = new FenceValidator({ boardClient, repo });
  const service = new NotesService({ db, repo, gitService: git, remote, reconciler, fenceValidator, boardClient, emitter });

  const rs = new ResourceServer();
  const budget = new BudgetMiddleware();
  const app = buildApp({ service, rs, budget, remote, reconciler, emitter });
  mountMcp(app, { service, rs, budget });
  mountStatic(app); // serve the built web SPA (web/dist) as a sibling of REST+MCP over one state

  reconciler.start(); // watcher — correctness backstop for external edits

  const server = app.listen(config.port, () => {
    log.info('notes_listening', { port: config.port, remote_reachable: remote.remoteReachable, mcp_spec: '2025-11-25' });
  });

  const shutdown = async () => {
    await reconciler.stop();
    server.close();
    db.close();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return { app, server, service, repo, db, reconciler, remote, shutdown };
}

// Boot when run directly.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
  bootstrap().catch((e) => {
    log.error('boot_failed', { err: String(e.stack || e) });
    process.exit(1);
  });
}
