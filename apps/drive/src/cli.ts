/**
 * `drive` maintenance CLI — the canonical-store operational surface (PLAN §3.4/§9).
 *   drive verify [--full]     row↔blob reconciliation both ways + hash spot-checks
 *   drive rebuild-index       rebuild the SQLite index from journals (watermark 0)
 *   drive backup              run the journal-first backup (VACUUM INTO + restic)
 *   drive gc-sweep            phase-1 staging sweep (safe; no agent path)
 */
import { loadConfig } from './config.js';
import { createContext, closeContext } from './context.js';
import { rebuildIndex, verify } from './storage/maintenance.js';
import { phase1Sweep } from './storage/gc.js';
import { runBackup } from './backup/backup.js';

function main(): void {
  const [cmd, ...rest] = process.argv.slice(2);
  const config = loadConfig();
  const ctx = createContext(config);
  try {
    switch (cmd) {
      case 'verify': {
        const report = verify(ctx.store, { fullHash: rest.includes('--full') });
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.ok ? 0 : 1);
        break;
      }
      case 'rebuild-index': {
        const r = rebuildIndex(ctx.store);
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'backup': {
        const r = runBackup(ctx);
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case 'gc-sweep': {
        console.log(JSON.stringify(phase1Sweep(ctx.store), null, 2));
        break;
      }
      default:
        console.error('usage: drive <verify [--full] | rebuild-index | backup | gc-sweep>');
        process.exit(2);
    }
  } finally {
    closeContext(ctx);
  }
}

main();
