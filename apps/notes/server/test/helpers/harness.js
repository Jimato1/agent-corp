/*
 * harness.js — test wiring for the Notes core.
 *
 * CRITICAL ORDERING: config.js reads process.env at module-evaluation time, and it is a process
 * singleton. So this harness sets every NOTES_ env var at its OWN module top-level (statically
 * importing ONLY node builtins, none of which touch config), and defers every config-consuming
 * module to DYNAMIC import inside makeService() — which runs after the env is in place. A test file
 * may statically import pure modules (constants.js, errors.js) but must obtain the live service
 * through makeService().
 *
 * Remote push is faked: isomorphic-git's push transport is smart-HTTP only (no file://), and CORR-5
 * boot-required-remote is about NOTES_GIT_REMOTE_URL being *configured*, not about a live push. Git
 * commits, reconcile, FTS, taint and the audit projection all run for real against a temp corpus.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';

// ---- unique temp layout for THIS test process (node --test runs one process per file) ----------
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-test-'));
const corpusPath = path.join(tmpRoot, 'corpus');
const dbPath = path.join(tmpRoot, 'index', 'notes.db');

process.env.NOTES_DEV_UNSAFE_NO_AUTH = 'true';
process.env.NOTES_CORPUS_PATH = corpusPath;
process.env.NOTES_DB_PATH = dbPath;
// Present so config.assertBootRequirements() is satisfied; never actually pushed (fake remote).
process.env.NOTES_GIT_REMOTE_URL = 'file://' + path.join(tmpRoot, 'remote.git').replace(/\\/g, '/');
process.env.NOTES_PUSH_DEBOUNCE_MS = '3600000'; // 1h — never fire a real push timer during a test
process.env.NOTES_LOG_LEVEL = process.env.NOTES_LOG_LEVEL || 'warn';
process.env.NODE_ENV = 'test';

export const paths = { tmpRoot, corpusPath, dbPath };

/** A remote that records commits but performs no network I/O (see file-header rationale). */
export function fakeRemote() {
  return {
    commits: [],
    notifyCommit(sha) {
      this.commits.push(sha);
    },
    remoteReachable: true,
    healthy() {
      return true;
    },
    health() {
      return { remote_reachable: true, git_push_lag_seconds: 0, last_pushed_commit: this.commits.at(-1) || null, degraded: false };
    },
  };
}

/** A configurable stand-in for BoardClient. Counts reads so tests can prove the fence is UNCACHED. */
export class FakeBoard {
  constructor({ exists = true, generation = 1, provenance = 'agent' } = {}) {
    this.exists = exists;
    this.generation = generation;
    this.provenance = provenance;
    this.throwLease = false;
    this.leaseReads = 0;
    this.factReads = 0;
  }
  async currentFenceGeneration(_ticketId) {
    this.leaseReads++;
    if (this.throwLease) throw new Error('board unreachable');
    if (!this.exists) return { exists: false, generation: null };
    return { exists: true, generation: this.generation };
  }
  async ticketFacts(_ticketId) {
    this.factReads++;
    if (!this.exists) return { exists: false, provenance: null };
    return { exists: true, provenance: this.provenance };
  }
}

/**
 * Build a fully-wired NotesService over the temp corpus. `board` defaults to a fresh FakeBoard.
 * Returns every collaborator so tests can assert against the index directly.
 */
export async function makeService({ board = new FakeBoard() } = {}) {
  const corpus = await import('../../src/storage/corpus.js');
  const { openDb } = await import('../../src/index/db.js');
  const { Repo } = await import('../../src/index/repo.js');
  const { GitService } = await import('../../src/git/repo.js');
  const { Reconciler } = await import('../../src/index/reconcile.js');
  const { FenceValidator } = await import('../../src/board/fencing.js');
  const { NotesService } = await import('../../src/service.js');

  await corpus.ensureLayout();
  const git = new GitService();
  await git.ensureRepo();

  const db = openDb();
  const repo = new Repo(db);
  const emitter = new EventEmitter();
  const reconciler = new Reconciler({ db, repo, gitService: git, corpusPath, emitter });
  await reconciler.reconcileAll({ full: true });

  const remote = fakeRemote();
  const fenceValidator = new FenceValidator({ boardClient: board, repo });
  const service = new NotesService({ db, repo, gitService: git, remote, reconciler, fenceValidator, boardClient: board, emitter });

  return { service, repo, db, git, reconciler, emitter, remote, board, corpus, corpusPath, dbPath };
}

/** Reopen the same on-disk DB with a fresh connection + repo + reconciler (rebuild-drill helper). */
export async function reopenIndex(git) {
  const { openDb } = await import('../../src/index/db.js');
  const { Repo } = await import('../../src/index/repo.js');
  const { Reconciler } = await import('../../src/index/reconcile.js');
  const db = openDb();
  const repo = new Repo(db);
  const reconciler = new Reconciler({ db, repo, gitService: git, corpusPath, emitter: null });
  return { db, repo, reconciler };
}

/** Delete the sqlite DB files on disk — the "rm notes.db" step of the rebuild drill. */
export function rmDbFiles() {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbPath + suffix);
    } catch {
      /* absent is fine */
    }
  }
}

/** A principal object as the RS would derive it from a validated token. */
export function principal(sub, scopes = ['notes:read', 'notes:search', 'notes:append', 'notes:write']) {
  return { sub, display: sub, scopes };
}
