#!/usr/bin/env node
/*
 * rebuild-drill.js — CORR-1 PROOF that the index is 100% rebuildable from the markdown files.
 *
 * PLAN §4.4 / §10 (Stage-7 exit criterion, runnable from Stage 4):
 *   snapshot a fixed query battery → `rm notes.db` → boot → full reindex → identical results.
 *   The battery covers search, backlinks, taint reads, and the audit projection vs git trailers.
 *
 * Exit 0 = the DB carried no information the files + git couldn't regenerate. Exit 1 = divergence
 * (the markdown-is-truth invariant would be violated). Runs standalone against config paths.
 */
import fs from 'node:fs';
import { config } from '../config.js';
import { openDb } from '../index/db.js';
import { Repo } from '../index/repo.js';
import { GitService } from '../git/repo.js';
import { Reconciler } from '../index/reconcile.js';
import { search as ftsSearch } from '../index/search.js';

function battery(db, repo) {
  const notes = db.prepare('SELECT id, path, title, type, provenance_taint FROM note ORDER BY id').all();
  const taints = notes.map((n) => ({ id: n.id, ...repo.taint(n.id) }));
  const backlinks = notes.map((n) => ({ id: n.id, back: repo.backlinks(n.id).map((b) => b.id).sort() }));
  const searches = ['canary', 'reboot OR patch', 'wazuh*'].map((q) => ({
    q,
    hits: ftsSearch(db, repo, { query: q, limit: 25 }).map((r) => ({ id: r.note_id, taint: r.taint })),
  }));
  const audit = db.prepare('SELECT sub, tool, note_id, ticket_id, fence, commit_sha FROM audit ORDER BY commit_sha, tool, note_id').all();
  // fence_floor is also rebuilt from git trailers (CORR-6 monotonic floor survives `rm notes.db`).
  const fenceFloor = db.prepare('SELECT ticket_id, max_generation FROM fence_floor ORDER BY ticket_id').all();
  return { notes, taints, backlinks, searches, audit, fenceFloor };
}

async function main() {
  const git = new GitService();

  // 1. snapshot from the current (live) index
  let db = openDb();
  let repo = new Repo(db);
  const before = battery(db, repo);
  db.close();

  // 2. rm the DB — the ultimate recovery (PLAN §4.1)
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(config.dbPath + suffix);
    } catch {}
  }

  // 3. boot a fresh DB + FULL reindex from files + git trailers
  db = openDb();
  repo = new Repo(db);
  const reconciler = new Reconciler({ db, repo, gitService: git, corpusPath: config.corpusPath, emitter: null });
  await reconciler.reconcileAll({ full: true });
  const after = battery(db, repo);
  db.close();

  // 4. compare
  const a = JSON.stringify(before);
  const b = JSON.stringify(after);
  if (a === b) {
    console.log('REBUILD DRILL PASS — index fully regenerated from files + git; results identical.');
    process.exit(0);
  }
  console.error('REBUILD DRILL FAIL — divergence after rebuild:');
  const bk = Object.keys(before);
  for (const k of bk) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) console.error(`  diverged: ${k}`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error('rebuild-drill error:', e);
  process.exit(2);
});
