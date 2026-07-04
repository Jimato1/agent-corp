/**
 * Entrypoint. Boot order: load config → create context → reconcile the index from journals
 * (idempotent) → start the continuous phase-1 sweeper → serve both surfaces (HTTP API + MCP) and
 * the Helm UI on one port. DEPLOYMENT §2/§5: service `drive`, internal port 8080, edge only.
 */
import { loadConfig } from './config.js';
import { createContext } from './context.js';
import { buildServer } from './http/server.js';
import { registerMcp } from './mcp/server.js';
import { registerUi } from './ui/static.js';
import { reconcileOnBoot } from './storage/maintenance.js';
import { phase1Sweep } from './storage/gc.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const ctx = createContext(config);

  // Reconcile the rebuildable index from the canonical journals (crash-safety; §3.3/§3.4).
  const rec = reconcileOnBoot(ctx.store);
  // eslint-disable-next-line no-console
  console.log(`[drive] index reconciled: replayed=${rec.replayed} tornTails=${rec.tornTails}`);

  const app = buildServer(ctx);
  registerMcp(app, ctx);
  registerUi(app);

  // Continuous phase-1 staging sweep (never touches an open stream — DB-state driven).
  const sweeper = setInterval(() => {
    try {
      phase1Sweep(ctx.store);
    } catch {
      /* best-effort */
    }
  }, 60_000);
  sweeper.unref?.();

  await app.listen({ host: '0.0.0.0', port: config.port });
  // eslint-disable-next-line no-console
  console.log(`[drive] listening on :${config.port} (aud=${config.auth.audience}); board check ${config.board.apiUrl ? 'live' : 'degraded'}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[drive] fatal', err);
  process.exit(1);
});
