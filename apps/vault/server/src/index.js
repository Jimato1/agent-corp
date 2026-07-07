/*
 * index.js — service boot. API-first wiring (PLAN §13): OpenBao/unsealer are external (config-as-code in
 * openbao/); this process is the thin wrapper. Two listeners:
 *   - EDGE  (config.port, `edge` network): manage UI/API + MCP + health/metadata.
 *   - CREDS (config.redeemBind, `creds` network, mTLS): POST /redeem + /releases/revoke ONLY.
 * The creds listener is a SEPARATE server bound to the creds interface so the redeem seam cannot be
 * routed to from edge (§4 header, MI-8, §3.5 caveat 5).
 *
 * Cold-start (§7.4): unconditionally revoke pending releases; run the M-4 restore detector (local vs WORM
 * HEAD) BEFORE serving /redeem — a divergence mass-revokes + escalates; an unfetchable WORM HEAD keeps
 * /redeem CLOSED (D-16a posture).
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import express from 'express';
import { config, assertBootRequirements } from './config.js';
import { log } from './logging.js';
import { systemClock } from './clock.js';
import { openDb } from './db/schema.js';
import { ResourceServer } from './auth/rs.js';
import { BudgetMiddleware } from './auth/budget.js';
import { RevocationChecker } from './auth/introspect.js';
import { BoardClient } from './clients/board.js';
import { WormSink } from './clients/worm.js';
import { ChatClient } from './clients/chat.js';
import { OpenBaoEngine } from './engine/openbao.js';
import { buildServices } from './wire.js';
import { buildApp } from './api/http.js';
import { buildRedeemRouter } from './api/redeem.js';
import { mountMcp } from './mcp/server.js';
import { mountStatic } from './api/static.js';

async function buildEngineDispatcher() {
  if (!config.engineClientCertFile) return undefined;
  try {
    const { Agent } = await import('undici'); // Node-bundled; mTLS client cert for the engine hop
    return new Agent({ connect: { ca: fs.readFileSync(config.engineCaFile), cert: fs.readFileSync(config.engineClientCertFile), key: fs.readFileSync(config.engineClientKeyFile) } });
  } catch (e) {
    log.warn('engine_dispatcher_unavailable', { err: String(e.message || e) });
    return undefined; // CANNOT-VERIFY-IN-SANDBOX: the real engine hop needs mTLS; documented in CHECKLIST
  }
}

export async function bootstrap() {
  assertBootRequirements();

  const clock = systemClock();
  const db = openDb(config.dbPath);

  // svc:vault client identity (auth client-credentials). null in dev (SoD reads then fail-closed).
  const tokenProvider = async () => null; // TODO(deploy): svc:vault client-assertion -> auth token

  const rs = new ResourceServer();
  const revocation = new RevocationChecker({ clock });
  const board = new BoardClient({ tokenProvider });
  const worm = new WormSink();
  const chat = new ChatClient({ tokenProvider, logger: log });
  const engine = new OpenBaoEngine({ clock, dispatcher: await buildEngineDispatcher() });

  const services = buildServices({ db, rs, revocation, engine, board, worm, chat, clock, config, logger: log });

  // Cold-start reconciliation (§7.4) BEFORE serving the creds surface.
  const revoked = services.releases.revokeAllPendingOnColdStart();
  const restore = await services.audit.detectRestoreOnBoot();
  const state = { redeemOpen: !restore.wormUnavailable };
  if (restore.restore) {
    services.releases.revokeAllPendingOnColdStart();
    chat.postExfilEscalation({ reason: 'restore_detected', sub: 'svc:vault', ticket_id: null }).catch(() => {});
    log.warn('restore_detected', { worm_head: restore.wormHead, local: restore.local });
  }
  if (restore.wormUnavailable) log.warn('redeem_closed_worm_unavailable', {});
  log.info('cold_start', { pending_revoked: revoked, restore: restore.restore, redeem_open: state.redeemOpen });

  // --- EDGE listener -----------------------------------------------------------------------------
  const budgetEdge = new BudgetMiddleware({ ceiling: config.localConcurrencyCeiling });
  const app = buildApp({ services, rs, budget: budgetEdge });
  mountMcp(app, { services, rs });
  mountStatic(app);
  const edgeServer = http.createServer(app);
  edgeServer.listen(config.port, () => log.info('vault_edge_listening', { port: config.port, mcp_spec: '2025-11-25' }));

  // --- CREDS listener (mTLS, Gateway-only) -------------------------------------------------------
  const budgetCreds = new BudgetMiddleware({ ceiling: config.redeemConcurrencyCeiling });
  const credsApp = express();
  credsApp.disable('x-powered-by');
  credsApp.use((req, res, next) => { if (!state.redeemOpen) return res.status(503).json({ code: 'audit_unavailable', retry: 'later' }); next(); });
  credsApp.use(buildRedeemRouter({ redeem: services.redeem, releases: services.releases, budget: budgetCreds, audit: services.audit, logger: log }));

  let credsServer;
  const [bindHost, bindPortStr] = (config.redeemBind || `0.0.0.0:${config.redeemPort}`).split(':');
  const bindPort = Number(bindPortStr || config.redeemPort);
  if (config.credsServerCertFile && !config.devUnsafeNoAuth) {
    // mTLS: require + verify the Gateway's client cert against the suite-internal CA (ARCH §11).
    const tlsOpts = {
      cert: fs.readFileSync(config.credsServerCertFile),
      key: fs.readFileSync(config.credsServerKeyFile),
      ca: fs.readFileSync(config.credsCaFile),
      requestCert: true,
      rejectUnauthorized: true, // no client cert / bad chain => TLS handshake fails (never reaches step 0 with a pass)
    };
    credsServer = https.createServer(tlsOpts, credsApp);
  } else {
    // dev/test: plain HTTP on loopback; channel facts come from the x-creds-* stub headers.
    credsServer = http.createServer(credsApp);
  }
  credsServer.listen(bindPort, bindHost, () => log.info('vault_creds_listening', { host: bindHost, port: bindPort, mtls: !!config.credsServerCertFile }));

  // --- background sweeps --------------------------------------------------------------------------
  revocation.startPolling();
  let sweepTimer = null;
  if (!config.disableSweeps) {
    sweepTimer = setInterval(() => { try { services.releases.sweepExpired(); } catch (e) { log.warn('sweep_failed', { err: String(e) }); } }, 60 * 1000);
    if (sweepTimer.unref) sweepTimer.unref();
  }

  const shutdown = () => { revocation.stop(); if (sweepTimer) clearInterval(sweepTimer); edgeServer.close(); credsServer.close(); db.close(); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return { app, credsApp, edgeServer, credsServer, services, db, shutdown, state };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
  bootstrap().catch((e) => { log.error('boot_failed', { err: String(e.stack || e) }); process.exit(1); });
}
