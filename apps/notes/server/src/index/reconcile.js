/*
 * index/reconcile.js — the correctness backstop that makes the index REBUILDABLE (CORR-1).
 *
 * PLAN §4.3/§4.4:
 *   - Full scan-and-reconcile: walk the corpus, diff (path,mtime,hash) against `note`, apply,
 *     rebuild FTS on drift. Runs at boot, after any git HEAD change the service didn't make, and
 *     on demand (POST /api/admin/reindex). Idempotent by content hash.
 *   - Rebuild proof: rm notes.db → boot → full reindex → identical query results.
 *
 * The audit projection + fence floor are rebuilt from GIT TRAILERS (CORR-4), so authorship and the
 * fencing high-water survive `rm notes.db`. Display-only frontmatter is never mirrored (CORR-2).
 */
import chokidar from 'chokidar';
import path from 'node:path';
import { parse, readable } from '../storage/frontmatter.js';
import { floorForProvenance, resolveOwnTaint } from '../storage/taint.js';
import * as corpus from '../storage/corpus.js';
import { truncateIndex } from './db.js';
import { log } from '../logging.js';

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;
const TURN_MARKER_RE = /<!--\s*turn\b[^>]*\bisolated=(true|false)[^>]*-->/i;

export class Reconciler {
  constructor({ db, repo, gitService, corpusPath, emitter }) {
    this.db = db;
    this.repo = repo;
    this.git = gitService;
    this.corpusPath = corpusPath;
    this.emitter = emitter;
    this.watcher = null;
    this.lastReconcileMs = null;
  }

  /** Parse a raw file into the index row shape (canonical projection only — CORR-2). */
  #rowFromFile(relPath, raw, mtimeMs, size) {
    const { fm, body } = parse(raw);
    const canon = readable(fm); // firewall: no display-only fields reach the index
    // own taint = frontmatter provenance_taint, floored by provenance origin, monotonic on re-scan.
    const structuralFloor = floorForProvenance(canon.provenance || 'agent');
    const own = resolveOwnTaint({
      existing: canon.provenance_taint || 'clean',
      structuralFloor,
    });
    return {
      id: canon.id,
      path: relPath,
      title: canon.title ?? null,
      type: canon.type ?? 'general',
      tags: JSON.stringify(canon.tags || []),
      ticket_id: canon.ticket ?? null,
      provenance: canon.provenance ?? 'agent',
      provenance_taint: own,
      authored_by: JSON.stringify(canon.authored_by || []),
      created: canon.created ?? null,
      updated: canon.updated ?? null,
      content_hash: corpus.sha256(raw),
      mtime: mtimeMs,
      size,
      body,
    };
  }

  /** Extract wikilinks from a body, tagging each with the isolation state of its enclosing turn. */
  #extractLinks(body) {
    const out = [];
    let isolated = false;
    for (const line of body.split('\n')) {
      const tm = line.match(TURN_MARKER_RE);
      if (tm) isolated = tm[1].toLowerCase() === 'true';
      WIKILINK_RE.lastIndex = 0;
      let m;
      while ((m = WIKILINK_RE.exec(line))) out.push({ target_text: m[1].trim(), isolated });
    }
    return out;
  }

  async reconcileFile(relPath) {
    let raw, st;
    try {
      raw = await corpus.readByPath(relPath);
      st = await import('node:fs').then((fsm) => fsm.promises.stat(corpus.resolveAbs(relPath)));
    } catch {
      // file gone → drop from index by path
      const existing = this.repo.getNoteByPath(relPath);
      if (existing) {
        this.repo.deleteNote(existing.id);
        this.emitter?.emit('note', { kind: 'delete', id: existing.id, path: relPath });
      }
      return;
    }
    const row = this.#rowFromFile(relPath, raw, st.mtimeMs, st.size);
    if (!row.id) {
      log.warn('reconcile_missing_id', { path: relPath });
      return;
    }
    this.repo.upsertNote(row);
    this.repo.setLinks(row.id, this.#extractLinks(row.body));
    if (row.title) this.repo.backResolveDangling(row.id, row.title);
    this.emitter?.emit('note', { kind: 'upsert', id: row.id, path: relPath });
  }

  /** Full walk + rebuild. This is the CORR-1 rebuild path. */
  async reconcileAll({ full = false } = {}) {
    if (full) truncateIndex(this.db);
    const seenPaths = new Set();
    for await (const f of corpus.walkMarkdown()) {
      seenPaths.add(f.relPath);
      await this.reconcileFile(f.relPath);
    }
    // Drop notes whose files vanished (only meaningful on incremental; full already truncated).
    if (!full) {
      for (const n of this.repo.allNotes()) {
        if (!seenPaths.has(n.path)) this.repo.deleteNote(n.id);
      }
    }
    await this.rebuildAudit();
    this.lastReconcileMs = Date.now();
    log.info('reconcile_complete', { full, notes: seenPaths.size });
  }

  /** Rebuild the audit projection + fence floor from git trailers (CORR-4 rebuildable). */
  async rebuildAudit() {
    const rows = await this.git.readAuditTrailers({ limit: 20000 });
    const tx = this.db.transaction((items) => {
      this.db.prepare('DELETE FROM audit').run();
      this.db.prepare('DELETE FROM fence_floor').run();
      for (const r of items) {
        this.repo.appendAudit(r);
        if (r.ticket_id && r.fence != null && r.fence !== '') {
          const gen = Number(r.fence);
          if (Number.isInteger(gen)) this.repo.raiseFenceFloor(r.ticket_id, gen);
        }
      }
    });
    tx(rows.reverse()); // oldest → newest so seq order matches history
  }

  /** Watcher (PLAN §4.3): watch directories, atomic-aware. Full reconcile on external HEAD change. */
  start() {
    const notesDir = path.join(this.corpusPath, 'notes');
    this.watcher = chokidar.watch(notesDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      followSymlinks: false,
    });
    const onFsEvent = (abs) => {
      const rel = path.posix.join('notes', path.relative(notesDir, abs).split(path.sep).join('/'));
      if (rel.endsWith('.md')) this.reconcileFile(rel).catch((e) => log.error('watch_reconcile_err', { err: String(e) }));
    };
    this.watcher.on('add', onFsEvent).on('change', onFsEvent).on('unlink', onFsEvent);
    log.info('watcher_started', { dir: notesDir });
  }

  async stop() {
    if (this.watcher) await this.watcher.close();
  }
}
