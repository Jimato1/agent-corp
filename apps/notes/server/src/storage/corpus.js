/*
 * corpus.js — the canonical filesystem store. Markdown files are TRUTH (root invariant).
 *
 * PLAN §2.1 / §9.2 / §11.6:
 *   - Atomic write-then-rename WITHIN the corpus filesystem; the Notes service is the ONLY writer.
 *   - The write surface addresses notes by `id`; the service derives the path (canonicalized,
 *     confined to the corpus root). Path traversal / symlink escape are rejected.
 *   - Serialized single-writer: all writes funnel through a per-note queue (no CRDT).
 *   - Per-note size cap (markdown only); artifacts belong to Drive.
 */
import { promises as fs } from 'node:fs';
import fssync from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { ERR } from '../constants.js';
import { BusinessError } from '../errors.js';

const CORPUS = config.corpusPath;
const NOTES_DIR = 'notes';
const TEMPLATES_DIR = '.templates';

export function sha256(content) {
  return 'sha256:' + createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Resolve a corpus-relative path to an absolute path, refusing any escape from the root. */
export function resolveAbs(relPath) {
  const abs = path.resolve(CORPUS, relPath);
  const root = path.resolve(CORPUS) + path.sep;
  if (abs !== path.resolve(CORPUS) && !abs.startsWith(root)) {
    throw new BusinessError(ERR.VALIDATION, `path escapes corpus root: ${relPath}`);
  }
  return abs;
}

/** Reject symlinks anywhere in the note's directory chain (PLAN §11.6). */
async function assertNoSymlink(abs) {
  let cur = abs;
  const root = path.resolve(CORPUS);
  while (cur.length >= root.length) {
    try {
      const st = await fs.lstat(cur);
      if (st.isSymbolicLink()) throw new BusinessError(ERR.VALIDATION, `symlink rejected in corpus: ${cur}`);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (cur === root) break;
    cur = path.dirname(cur);
  }
}

export async function ensureLayout() {
  await fs.mkdir(path.join(CORPUS, NOTES_DIR), { recursive: true });
  await fs.mkdir(path.join(CORPUS, TEMPLATES_DIR), { recursive: true });
  await fs.mkdir(path.dirname(config.dbPath), { recursive: true });
}

export function deriveNewPath(type, slug, id) {
  // path is the human handle; a short id suffix keeps it collision-free & rename-stable.
  const shortId = id.slice(-6).toLowerCase();
  return path.posix.join(NOTES_DIR, type, `${slug}-${shortId}.md`);
}

export async function readByPath(relPath) {
  const abs = resolveAbs(relPath);
  return fs.readFile(abs, 'utf8');
}

export async function exists(relPath) {
  try {
    await fs.access(resolveAbs(relPath));
    return true;
  } catch {
    return false;
  }
}

/** Atomic write-then-rename within the corpus fs. Enforces the size cap. */
export async function writeAtomic(relPath, content) {
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > config.maxNoteBytes) {
    throw new BusinessError(ERR.TOO_LARGE, `note exceeds ${config.maxNoteBytes} bytes (${bytes})`);
  }
  const abs = resolveAbs(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await assertNoSymlink(abs);
  const tmp = abs + '.tmp-' + randomBytes(6).toString('hex');
  await fs.writeFile(tmp, content, { encoding: 'utf8', mode: 0o644 });
  await fs.rename(tmp, abs); // atomic within the same filesystem
  return { path: relPath, bytes, hash: sha256(content) };
}

/** Move a note (rename) — path changes, id does not (index re-resolves by id). */
export async function movePath(fromRel, toRel) {
  const fromAbs = resolveAbs(fromRel);
  const toAbs = resolveAbs(toRel);
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  await assertNoSymlink(toAbs);
  await fs.rename(fromAbs, toAbs);
}

/** Walk the corpus and yield every markdown file with (relPath, mtimeMs, size). Reconcile source. */
export async function* walkMarkdown() {
  const root = path.join(CORPUS, NOTES_DIR);
  async function* rec(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (e.code === 'ENOENT') return;
      throw e;
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) continue; // never follow symlinks during scan
      if (ent.isDirectory()) {
        yield* rec(abs);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        const st = await fs.stat(abs);
        yield { relPath: path.posix.join(NOTES_DIR, path.relative(root, abs).split(path.sep).join('/')), mtimeMs: st.mtimeMs, size: st.size };
      }
    }
  }
  yield* rec(root);
}

export function corpusRoot() {
  return CORPUS;
}
export function dbExists() {
  return fssync.existsSync(config.dbPath);
}

/* -------- KeyedMutex: serialized single-writer per note (PLAN §9.2) -------- */
export class KeyedMutex {
  #chains = new Map();
  async run(key, fn) {
    const prev = this.#chains.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((r) => (release = r));
    const chained = prev.then(() => gate);
    this.#chains.set(key, chained);
    try {
      await prev;
      return await fn();
    } finally {
      release();
      // Best-effort cleanup so the map doesn't grow unbounded (only if we're still the tail).
      queueMicrotask(() => {
        if (this.#chains.get(key) === chained) this.#chains.delete(key);
      });
    }
  }
}
