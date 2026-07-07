/*
 * git/repo.js — the git audit trail. One commit per mutating core-API call (PLAN §3.1).
 *
 * ============================ CORR-4 (authorship bound to auth `sub`) ============================
 * PLAN §3.2 / IDENTIFIERS.md (every audit log's "who" joins on `sub`):
 *   - The AUTHORITATIVE binding is a machine-readable commit-message TRAILER block. `Sub:` is THE
 *     join key. Synthetic role emails do NOT join — so author.email is a fixed, documented-as-
 *     meaningless constant (agent@notes.local) and the `sub` is deliberately NOT encoded into it
 *     (IDENTIFIERS.md rule 3: no composite IDs with parsing expectations).
 *   - `sub` is derived ONLY from the validated token on the API call (never a client field/header).
 *   - The SQLite `audit` table is a rebuildable projection of these trailers (git log --format).
 * ==============================================================================================
 */
import git from 'isomorphic-git';
import fs from 'node:fs';
import { config } from '../config.js';

const DIR = config.corpusPath;

export class GitService {
  constructor({ dir = DIR } = {}) {
    this.dir = dir;
    this.fs = fs;
  }

  async ensureRepo() {
    try {
      await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
    } catch {
      await git.init({ fs: this.fs, dir: this.dir, defaultBranch: config.gitBranch });
    }
  }

  /**
   * Stage `relPath` and commit with an author/committer + a trailer block.
   * @param principal { sub, display } — sub is the audit join key (CORR-4), token-derived only.
   * @param trailers  { Note-Id, Ticket, Op-Id, Tool, Fence } — Sub is injected from principal.sub.
   * Returns the commit sha.
   */
  async commitFile(relPath, { summary, tool, principal, trailers = {} }) {
    await git.add({ fs: this.fs, dir: this.dir, filepath: relPath });
    const message = buildMessage(summary, tool, principal, trailers);
    const author = {
      // display name is cosmetic; the join happens on the Sub: trailer, never on author fields.
      name: principal.display || principal.sub,
      email: config.gitAuthorEmail, // fixed, documented-as-meaningless constant (PLAN §3.2)
    };
    const committer = { name: config.gitCommitterName, email: config.gitAuthorEmail };
    const sha = await git.commit({ fs: this.fs, dir: this.dir, message, author, committer });
    return sha;
  }

  async headOid() {
    try {
      return await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
    } catch {
      return null;
    }
  }

  /** Read every commit's trailers — the rebuild source for the audit projection (PLAN §4.2). */
  async readAuditTrailers({ limit = 5000 } = {}) {
    let commits;
    try {
      commits = await git.log({ fs: this.fs, dir: this.dir, depth: limit });
    } catch {
      return [];
    }
    return commits
      .map((c) => {
        const t = parseTrailers(c.commit.message);
        if (!t.Sub) return null; // only service-authored state-changes carry the Sub trailer
        return {
          ts: new Date(c.commit.author.timestamp * 1000).toISOString(),
          sub: t.Sub,
          tool: t.Tool || null,
          note_id: t['Note-Id'] || null,
          ticket_id: t.Ticket || null,
          op_id: t['Op-Id'] || null,
          fence: t.Fence || null,
          commit_sha: c.oid,
        };
      })
      .filter(Boolean);
  }
}

function buildMessage(summary, tool, principal, trailers) {
  const head = `${tool}: ${summary}`.slice(0, 100);
  const lines = [head, ''];
  // Sub is FIRST and MANDATORY — the join key (CORR-4).
  lines.push(`Sub: ${principal.sub}`);
  for (const key of ['Note-Id', 'Ticket', 'Op-Id', 'Fence']) {
    if (trailers[key] != null) lines.push(`${key}: ${trailers[key]}`);
  }
  lines.push(`Tool: ${tool}`);
  return lines.join('\n') + '\n';
}

const TRAILER_RE = /^([A-Za-z][A-Za-z-]*):\s?(.*)$/;
function parseTrailers(message) {
  const out = {};
  const lines = String(message).split('\n');
  for (const line of lines) {
    const m = line.match(TRAILER_RE);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
