/**
 * Backup & DR for the CANONICAL blobs + journals (PLAN §9, ARCHITECTURE §10 — non-optional).
 * Journal-first ordering so the captured journals never reference a blob the snapshot lacks:
 *   1. mark backup_in_progress (GC BOTH phases suspended for the window — gc.ts checks this)
 *   2. VACUUM INTO db/backup snapshot (consistent point-in-time DB copy)
 *   3. restic backup ordered journal/ → db/backup/ → blobs/  (off-suite-host repo)
 * Retention 7 daily / 4 weekly / 6 monthly; weekly `drive verify` + `restic check`.
 * Backup age + last-verify are surfaced in /healthz so a silently-failing backup is loud.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import type { AppContext } from '../context.js';

export interface BackupResult {
  snapshotPath: string;
  resticRan: boolean;
  resticExit: number | null;
  note: string;
}

export function runBackup(ctx: AppContext): BackupResult {
  const { store, layout, config } = ctx;
  const setFlag = (v: string) => store.db.prepare(`INSERT INTO meta (key, value) VALUES ('backup_in_progress', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(v);
  setFlag('1');
  try {
    // (2) consistent DB snapshot; snapshots journal_watermark with it for free.
    const snapshotPath = join(layout.backupDir, 'drive-snapshot.sqlite3');
    store.db.prepare(`VACUUM INTO ?`).run(snapshotPath);

    // (3) restic backup, journal → db/backup → blobs (off-box). Only when a repo is configured.
    let resticRan = false;
    let resticExit: number | null = null;
    let note = 'DB snapshot written';
    if (config.backup.repo) {
      const env = { ...process.env, RESTIC_REPOSITORY: config.backup.repo } as NodeJS.ProcessEnv;
      if (config.backup.passwordFile) env['RESTIC_PASSWORD_FILE'] = config.backup.passwordFile;
      const r = spawnSync('restic', ['backup', layout.journalDir, layout.backupDir, layout.blobs], { env, encoding: 'utf8' });
      resticRan = true;
      resticExit = r.status;
      note = r.status === 0 ? 'restic snapshot ok' : `restic exit ${r.status}: ${r.stderr?.slice(0, 200) ?? ''}`;
    } else {
      note = 'DRIVE_BACKUP_REPO unset — local DB snapshot only; off-box restic pending operator input (§15.4)';
    }

    store.db.prepare(`INSERT INTO meta (key, value) VALUES ('last_backup_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(store.clock.iso());
    return { snapshotPath, resticRan, resticExit, note };
  } finally {
    setFlag('0');
  }
}
