/*
 * service.js — NotesService: the ONE core over which the MCP surface and the UI are siblings
 * (two views, one state — PLAN §1/§9). Every mutating op is: fence (if ticket-bound) → hygiene →
 * atomic write → git commit (sub trailer) → remote push notify → synchronous reconcile → audit.
 *
 * All six corrections converge here:
 *   CORR-1 reconcile-after-write keeps the index a live projection of the canonical files.
 *   CORR-2 reads return readable() (display-only firewall); display_phase writes are decoration.
 *   CORR-3 deliberation sections/display_phase use spec phases (validated against CEREMONY_PHASES).
 *   CORR-4 every commit carries the token-derived `sub` trailer as the audit join key.
 *   CORR-5 every commit notifies the RemoteManager for debounced off-box push.
 *   CORR-6 ticket-bound create/append/link validate the fence UNCACHED, fail-closed; update is exempt.
 */
import { promises as fs } from 'node:fs';
import {
  ERR,
  CEREMONY_PHASES,
  NOTE_TYPES,
  PROVENANCE,
} from './constants.js';
import { BusinessError } from './errors.js';
import { mintNoteId, isNoteId, isTicketIdShape, slugify } from './identifiers.js';
import * as corpus from './storage/corpus.js';
import { parse, serialize, readable, withDisplayPhase } from './storage/frontmatter.js';
import { instantiate, findSection } from './storage/templates.js';
import { scanForSecrets } from './storage/hygiene.js';
import { floorForProvenance, resolveOwnTaint, isDowngrade, rank } from './storage/taint.js';
import { search as ftsSearch } from './index/search.js';
import { log } from './logging.js';

export class NotesService {
  constructor({ db, repo, gitService, remote, reconciler, fenceValidator, boardClient, emitter }) {
    this.db = db;
    this.repo = repo;
    this.git = gitService;
    this.remote = remote;
    this.reconciler = reconciler;
    this.fence = fenceValidator;
    this.board = boardClient;
    this.emitter = emitter;
    this.mutex = new corpus.KeyedMutex();
  }

  // ---- idempotency (op_id replay collapse — PLAN §6/§4.2) --------------------
  #replay(opId) {
    if (!opId) return null;
    const prior = this.repo.getOp(opId);
    if (!prior) return null;
    try {
      return { replayed: true, ...JSON.parse(prior.result) };
    } catch {
      // degraded honestly after a rebuild (PLAN §4.2): detection without the exact payload.
      return { replayed: true, code: ERR.ALREADY_APPLIED, commit_sha: prior.commit_sha };
    }
  }
  #recordOp(opId, sub, result, commitSha) {
    if (opId) this.repo.putOp(opId, sub, result, commitSha, new Date().toISOString());
  }

  // ---- reads (CORR-2 firewall applied) --------------------------------------
  async readNote(id) {
    if (!isNoteId(id)) throw new BusinessError(ERR.VALIDATION, 'bad note_id');
    const row = this.repo.getNote(id);
    if (!row) throw new BusinessError(ERR.NOT_FOUND, 'no such note', { id });
    const raw = await corpus.readByPath(row.path);
    const { fm, body } = parse(raw);
    const taint = this.repo.taint(id);
    const audit = this.repo.auditForNote(id);
    // response = body + CANONICAL frontmatter only (readable()) + content_hash + commit_sha + taint
    return {
      id,
      path: row.path,
      frontmatter: readable(fm),
      body,
      content_hash: corpus.sha256(raw),
      commit_sha: audit[0]?.commit_sha || (await this.git.headOid()),
      taint,
    };
  }

  listBacklinks(id) {
    if (!isNoteId(id)) throw new BusinessError(ERR.VALIDATION, 'bad note_id');
    const rows = this.repo.backlinks(id);
    return rows.map((r) => ({
      note_id: r.id,
      title: r.title,
      type: r.type,
      taint: this.repo.taint(r.id).effective,
    }));
  }

  search(params) {
    return ftsSearch(this.db, this.repo, params);
  }

  taint(id) {
    if (!isNoteId(id)) throw new BusinessError(ERR.VALIDATION, 'bad note_id');
    if (!this.repo.getNote(id)) throw new BusinessError(ERR.NOT_FOUND, 'no such note', { id });
    return this.repo.taint(id);
  }

  // ---- create_note ----------------------------------------------------------
  async createNote({ type, title, ticket_id, initial_content, provenance, fencing_token, op_id, principal }) {
    const replay = this.#replay(op_id);
    if (replay) return replay;
    if (!NOTE_TYPES.includes(type)) throw new BusinessError(ERR.VALIDATION, `unknown type: ${type}`);
    if (!title || typeof title !== 'string') throw new BusinessError(ERR.VALIDATION, 'title required');
    if (provenance && !PROVENANCE.includes(provenance)) throw new BusinessError(ERR.VALIDATION, 'bad provenance');
    if (ticket_id && !isTicketIdShape(ticket_id)) throw new BusinessError(ERR.VALIDATION, 'bad ticket_id shape');

    // CORR-6: ticket-bound create MUST present a valid fence (uncached, fail-closed).
    let structuralFloor = 'clean';
    if (ticket_id) {
      await this.fence.validateFence(ticket_id, fencing_token);
      // Structural taint floor from ticket lineage (Board provenance). Fail-safe: floor to
      // host_originated if the provenance read fails (raise, never lower).
      try {
        const facts = await this.board.ticketFacts(ticket_id);
        if (!facts.exists) throw new BusinessError(ERR.TICKET_UNKNOWN, 'ticket not found', { ticket_id });
        structuralFloor = floorForProvenance(facts.provenance || 'host_originated');
      } catch (e) {
        if (e instanceof BusinessError) throw e;
        structuralFloor = 'host_originated';
        log.warn('ticket_provenance_unreadable_floor_raised', { ticket_id });
      }
    }

    const body = instantiate(type, initial_content);
    const hy = scanForSecrets(body);
    if (!hy.ok) {
      log.hygieneReject({ sub: principal.sub, noteId: null, patternClass: hy.patternClass, offsets: hy.offsets, saltedHash: hy.saltedHash });
      throw new BusinessError(ERR.HYGIENE_REJECT, 'secret-material shape detected', { pattern_class: hy.patternClass });
    }

    const id = mintNoteId();
    const own = resolveOwnTaint({ structuralFloor, declared: taintFromProvenance(provenance) });
    const nowIso = new Date().toISOString();
    const fm = {
      id,
      type,
      title,
      created: nowIso,
      updated: nowIso,
      ...(ticket_id ? { ticket: ticket_id } : {}),
      tags: [],
      provenance: provenance || (structuralFloor === 'host_originated' ? 'host_originated' : (principal.sub.startsWith('op:') ? 'operator' : 'agent')),
      provenance_taint: own,
      authored_by: [principal.sub],
    };
    const relPath = corpus.deriveNewPath(type, slugify(title), id);
    const fileText = serialize(fm, body);

    const result = await this.mutex.run(id, async () => {
      await corpus.writeAtomic(relPath, fileText);
      const sha = await this.git.commitFile(relPath, {
        summary: `create ${type} "${title}"`,
        tool: 'create_note',
        principal,
        trailers: { 'Note-Id': id, Ticket: ticket_id, 'Op-Id': op_id, Fence: fencing_token },
      });
      this.remote.notifyCommit(sha); // CORR-5
      await this.reconciler.reconcileFile(relPath); // CORR-1: index reflects immediately
      this.#audit({ sub: principal.sub, tool: 'create_note', note_id: id, ticket_id, op_id, fence: fencing_token, commit_sha: sha, ts: nowIso });
      return { ok: true, note_id: id, path: relPath, content_hash: corpus.sha256(fileText), commit_sha: sha };
    });
    this.#recordOp(op_id, principal.sub, result, result.commit_sha);
    return result;
  }

  // ---- append_note ----------------------------------------------------------
  async appendNote({ note_id, section, content, content_provenance, display_phase, fencing_token, op_id, principal, isolated }) {
    const replay = this.#replay(op_id);
    if (replay) return replay;
    if (!isNoteId(note_id)) throw new BusinessError(ERR.VALIDATION, 'bad note_id');
    if (!section || typeof section !== 'string') throw new BusinessError(ERR.VALIDATION, 'section required');
    if (content == null) throw new BusinessError(ERR.VALIDATION, 'content required');
    if (content_provenance && !PROVENANCE.includes(content_provenance)) throw new BusinessError(ERR.VALIDATION, 'bad content_provenance');
    // CORR-3: display_phase (if provided) MUST be a spec ceremony phase.
    if (display_phase && !CEREMONY_PHASES.includes(display_phase)) {
      throw new BusinessError(ERR.VALIDATION, `display_phase must be a spec ceremony phase, got ${display_phase}`);
    }

    const row = this.repo.getNote(note_id);
    if (!row) throw new BusinessError(ERR.NOT_FOUND, 'no such note', { id: note_id });
    const ticketId = row.ticket_id;

    // CORR-6: append on a ticket-bound note MUST present a valid fence (uncached, fail-closed).
    if (ticketId) await this.fence.validateFence(ticketId, fencing_token);

    const hy = scanForSecrets(content);
    if (!hy.ok) {
      log.hygieneReject({ sub: principal.sub, noteId: note_id, patternClass: hy.patternClass, offsets: hy.offsets, saltedHash: hy.saltedHash });
      throw new BusinessError(ERR.HYGIENE_REJECT, 'secret-material shape detected', { pattern_class: hy.patternClass });
    }

    const result = await this.mutex.run(note_id, async () => {
      const raw = await corpus.readByPath(row.path);
      let { fm, body } = parse(raw);
      const loc = findSection(body, section);
      if (!loc) throw new BusinessError(ERR.SECTION_UNKNOWN, `section not found: ${section}`, { section });

      // Service-written turn marker: token-derived sub, never caller-supplied (PLAN §7.2).
      const nowIso = new Date().toISOString();
      const marker = row.type === 'deliberation'
        ? `<!-- turn sub=${principal.sub} ts=${nowIso} isolated=${!!isolated} -->\n`
        : '';
      const insert = `\n${marker}${content}\n`;
      const lines = loc.lines.slice();
      lines.splice(loc.end, 0, insert.replace(/\n$/, ''));
      body = lines.join('\n');

      // taint raise (raise-only) from content_provenance
      const declared = taintFromProvenance(content_provenance);
      if (declared) {
        const next = resolveOwnTaint({ existing: fm.provenance_taint || 'clean', declared });
        fm.provenance_taint = next;
      }
      // authored_by accrues the sub (display/join convenience; authority is the trailer)
      fm.authored_by = Array.from(new Set([...(fm.authored_by || []), principal.sub]));
      fm.updated = nowIso;
      // CORR-2: display_phase updates the WRITE-ONLY mirror only. Never read back.
      if (display_phase) fm = withDisplayPhase(fm, display_phase);

      const fileText = serialize(fm, body);
      await corpus.writeAtomic(row.path, fileText);
      const sha = await this.git.commitFile(row.path, {
        summary: `append §${section}`,
        tool: 'append_note',
        principal,
        trailers: { 'Note-Id': note_id, Ticket: ticketId, 'Op-Id': op_id, Fence: fencing_token },
      });
      this.remote.notifyCommit(sha);
      await this.reconciler.reconcileFile(row.path);
      this.#audit({ sub: principal.sub, tool: 'append_note', note_id, ticket_id: ticketId, op_id, fence: fencing_token, commit_sha: sha, ts: nowIso });
      return { ok: true, note_id, content_hash: corpus.sha256(fileText), commit_sha: sha };
    });
    this.#recordOp(op_id, principal.sub, result, result.commit_sha);
    return result;
  }

  // ---- link_notes -----------------------------------------------------------
  async linkNotes({ from_id, to_id, fencing_token, op_id, principal }) {
    const replay = this.#replay(op_id);
    if (replay) return replay;
    if (!isNoteId(from_id) || !isNoteId(to_id)) throw new BusinessError(ERR.VALIDATION, 'bad note id');
    const from = this.repo.getNote(from_id);
    const to = this.repo.getNote(to_id);
    if (!from || !to) throw new BusinessError(ERR.NOT_FOUND, 'link endpoint not found');

    // CORR-6: if EITHER note is ticket-bound, links rewire the huddle grounding graph → fenced.
    const ticketId = from.ticket_id || to.ticket_id;
    if (ticketId) await this.fence.validateFence(ticketId, fencing_token);

    const result = await this.mutex.run(from_id, async () => {
      const raw = await corpus.readByPath(from.path);
      let { fm, body } = parse(raw);
      const wl = `[[${to.title}]]`;
      let loc = findSection(body, 'Links');
      if (!loc) {
        body = body.replace(/\s*$/, '') + `\n\n## Links\n- ${wl}\n`;
      } else {
        const lines = loc.lines.slice();
        lines.splice(loc.end, 0, `- ${wl}`);
        body = lines.join('\n');
      }
      fm.links = Array.from(new Set([...(fm.links || []), to.title]));
      fm.updated = new Date().toISOString();
      const fileText = serialize(fm, body);
      await corpus.writeAtomic(from.path, fileText);
      const sha = await this.git.commitFile(from.path, {
        summary: `link → ${to_id}`,
        tool: 'link_notes',
        principal,
        trailers: { 'Note-Id': from_id, Ticket: ticketId, 'Op-Id': op_id, Fence: fencing_token },
      });
      this.remote.notifyCommit(sha);
      await this.reconciler.reconcileFile(from.path);
      this.#audit({ sub: principal.sub, tool: 'link_notes', note_id: from_id, ticket_id: ticketId, op_id, fence: fencing_token, commit_sha: sha, ts: fm.updated });
      return { ok: true, from_id, to_id, commit_sha: sha };
    });
    this.#recordOp(op_id, principal.sub, result, result.commit_sha);
    return result;
  }

  // ---- update_note (notes:write; UNFENCED by exemption — CORR-6) -------------
  async updateNote({ note_id, content, expected_hash, op_id, principal }) {
    const replay = this.#replay(op_id);
    if (replay) return replay;
    if (!isNoteId(note_id)) throw new BusinessError(ERR.VALIDATION, 'bad note_id');
    if (content == null) throw new BusinessError(ERR.VALIDATION, 'content required');
    const row = this.repo.getNote(note_id);
    if (!row) throw new BusinessError(ERR.NOT_FOUND, 'no such note', { id: note_id });

    const result = await this.mutex.run(note_id, async () => {
      const raw = await corpus.readByPath(row.path);
      // CAS precondition (PLAN §9.2).
      if (expected_hash && corpus.sha256(raw) !== expected_hash) {
        throw new BusinessError(ERR.PRECONDITION_HASH, 'note changed since read', { note_id });
      }
      const prev = parse(raw);
      const next = parse(withFrontmatterPreserved(content, prev.fm));
      // TAINT_DOWNGRADE guard (raise-only, PLAN §2.2c): frontmatter cannot lower provenance_taint.
      const prevT = prev.fm.provenance_taint || 'clean';
      const nextT = next.fm.provenance_taint || 'clean';
      if (isDowngrade(prevT, nextT)) {
        throw new BusinessError(ERR.TAINT_DOWNGRADE, 'provenance is raise-only; cannot lower here', { prev: prevT, next: nextT });
      }
      const hy = scanForSecrets(next.body);
      if (!hy.ok) {
        log.hygieneReject({ sub: principal.sub, noteId: note_id, patternClass: hy.patternClass, offsets: hy.offsets, saltedHash: hy.saltedHash });
        throw new BusinessError(ERR.HYGIENE_REJECT, 'secret-material shape detected', { pattern_class: hy.patternClass });
      }
      next.fm.updated = new Date().toISOString();
      next.fm.authored_by = Array.from(new Set([...(prev.fm.authored_by || []), principal.sub]));
      const fileText = serialize(next.fm, next.body);
      await corpus.writeAtomic(row.path, fileText);
      const sha = await this.git.commitFile(row.path, {
        summary: 'overwrite note',
        tool: 'update_note',
        principal,
        trailers: { 'Note-Id': note_id, Ticket: row.ticket_id, 'Op-Id': op_id },
      });
      this.remote.notifyCommit(sha);
      await this.reconciler.reconcileFile(row.path);
      this.#audit({ sub: principal.sub, tool: 'update_note', note_id, ticket_id: row.ticket_id, op_id, fence: null, commit_sha: sha, ts: next.fm.updated });
      return { ok: true, note_id, content_hash: corpus.sha256(fileText), commit_sha: sha };
    });
    this.#recordOp(op_id, principal.sub, result, result.commit_sha);
    return result;
  }

  async reindex() {
    await this.reconciler.reconcileAll({ full: true });
    return { ok: true, reindexed: true };
  }

  #audit(row) {
    this.repo.appendAudit({ ts: row.ts, sub: row.sub, tool: row.tool, note_id: row.note_id, ticket_id: row.ticket_id || null, op_id: row.op_id || null, fence: row.fence != null ? String(row.fence) : null, commit_sha: row.commit_sha });
    this.emitter?.emit('audit', { note_id: row.note_id, sub: row.sub, tool: row.tool });
  }
}

function taintFromProvenance(p) {
  if (!p) return undefined;
  return floorForProvenance(p) === 'host_originated' ? 'host_originated' : undefined;
}

// Operator overwrites carry a full body; the immutable canonical frontmatter (id/type/created/
// ticket/provenance) is preserved from the prior file so a UI PUT of body text can't drop it.
function withFrontmatterPreserved(content, prevFm) {
  const parsed = parse(content);
  const merged = { ...parsed.fm };
  for (const k of ['id', 'type', 'created', 'ticket']) if (prevFm[k] !== undefined) merged[k] = prevFm[k];
  // provenance/taint may only be raised (guarded by caller); preserve prior as the floor.
  if (prevFm.provenance !== undefined && merged.provenance === undefined) merged.provenance = prevFm.provenance;
  if (prevFm.provenance_taint !== undefined) {
    const incoming = merged.provenance_taint;
    merged.provenance_taint = incoming && rank(incoming) > rank(prevFm.provenance_taint) ? incoming : prevFm.provenance_taint;
  }
  return serialize(merged, parsed.body);
}
