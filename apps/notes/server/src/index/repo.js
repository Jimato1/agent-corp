/*
 * repo.js — data-access over the rebuildable index. Domain queries used by the service + API.
 *
 * Every value returned here originates from the canonical files (via reconcile) — the DB is a
 * projection. Display-only frontmatter is absent by schema (CORR-2), so no query can surface it.
 */
import { effectiveTaint } from '../storage/taint.js';

export class Repo {
  constructor(db) {
    this.db = db;
    this.s = {
      upsertNote: db.prepare(`
        INSERT INTO note (id,path,title,type,tags,ticket_id,provenance,provenance_taint,authored_by,created,updated,content_hash,mtime,size,body)
        VALUES (@id,@path,@title,@type,@tags,@ticket_id,@provenance,@provenance_taint,@authored_by,@created,@updated,@content_hash,@mtime,@size,@body)
        ON CONFLICT(id) DO UPDATE SET
          path=@path,title=@title,type=@type,tags=@tags,ticket_id=@ticket_id,provenance=@provenance,
          provenance_taint=@provenance_taint,authored_by=@authored_by,created=@created,updated=@updated,
          content_hash=@content_hash,mtime=@mtime,size=@size,body=@body`),
      getById: db.prepare(`SELECT * FROM note WHERE id=?`),
      getByPath: db.prepare(`SELECT * FROM note WHERE path=?`),
      allIdsPaths: db.prepare(`SELECT id, path, content_hash, mtime FROM note`),
      deleteById: db.prepare(`DELETE FROM note WHERE id=?`),
      idForText: db.prepare(`SELECT id FROM note WHERE title=? COLLATE NOCASE LIMIT 1`),

      clearLinks: db.prepare(`DELETE FROM link WHERE from_id=?`),
      insLink: db.prepare(`INSERT INTO link (from_id,to_id,target_text,resolved,isolated) VALUES (?,?,?,?,?)`),
      linksFrom: db.prepare(`SELECT to_id FROM link WHERE from_id=? AND resolved=1`),
      backlinks: db.prepare(`
        SELECT n.* FROM link l JOIN note n ON n.id=l.from_id
        WHERE l.to_id=? AND l.resolved=1 AND l.isolated=0`),
      outbound: db.prepare(`SELECT target_text, to_id, resolved, isolated FROM link WHERE from_id=?`),
      resolveDangling: db.prepare(`UPDATE link SET to_id=?, resolved=1 WHERE resolved=0 AND target_text=?`),
      ownTaintAll: db.prepare(`SELECT id, provenance_taint FROM note`),

      fenceFloor: db.prepare(`SELECT max_generation FROM fence_floor WHERE ticket_id=?`),
      raiseFence: db.prepare(`
        INSERT INTO fence_floor (ticket_id,max_generation) VALUES (?,?)
        ON CONFLICT(ticket_id) DO UPDATE SET max_generation=MAX(max_generation,excluded.max_generation)`),

      getOp: db.prepare(`SELECT * FROM op_dedup WHERE op_id=?`),
      putOp: db.prepare(`INSERT OR REPLACE INTO op_dedup (op_id,sub,result,commit_sha,ts) VALUES (?,?,?,?,?)`),

      appendAudit: db.prepare(`
        INSERT INTO audit (ts,sub,tool,note_id,ticket_id,op_id,fence,commit_sha)
        VALUES (@ts,@sub,@tool,@note_id,@ticket_id,@op_id,@fence,@commit_sha)`),
      auditForNote: db.prepare(`SELECT * FROM audit WHERE note_id=? ORDER BY seq DESC`),
    };
  }

  getNote(id) {
    return this.s.getById.get(id) || null;
  }
  getNoteByPath(p) {
    return this.s.getByPath.get(p) || null;
  }
  allNotes() {
    return this.s.allIdsPaths.all();
  }
  deleteNote(id) {
    this.s.deleteById.run(id);
  }

  upsertNote(row) {
    this.s.upsertNote.run(row);
  }

  /** Replace a note's outbound links; resolve targets by title, and back-resolve danglers to it. */
  setLinks(fromId, links) {
    this.s.clearLinks.run(fromId);
    for (const l of links) {
      const target = this.s.idForText.get(l.target_text);
      const toId = target ? target.id : null;
      this.s.insLink.run(fromId, toId, l.target_text, toId ? 1 : 0, l.isolated ? 1 : 0);
    }
  }
  backResolveDangling(noteId, title) {
    if (title) this.s.resolveDangling.run(noteId, title);
  }

  backlinks(id) {
    return this.s.backlinks.all(id);
  }
  outbound(id) {
    return this.s.outbound.all(id);
  }

  /** own + effective taint (CORR transitive). tainted_via returns note ids that raised it. */
  taint(id) {
    const rows = this.s.ownTaintAll.all();
    const ownMap = new Map(rows.map((r) => [r.id, r.provenance_taint || 'clean']));
    const linkStmt = this.s.linksFrom;
    const ownOf = (nid) => ownMap.get(nid) || 'clean';
    const linksOf = (nid) => linkStmt.all(nid).map((r) => r.to_id).filter(Boolean);
    const own = ownOf(id);
    const { effective, tainted_via } = effectiveTaint(id, ownOf, linksOf);
    return { own, effective, tainted_via };
  }

  fenceFloor(ticketId) {
    const r = this.s.fenceFloor.get(ticketId);
    return r ? r.max_generation : 0;
  }
  raiseFenceFloor(ticketId, generation) {
    this.s.raiseFence.run(ticketId, generation);
  }

  getOp(opId) {
    return this.s.getOp.get(opId) || null;
  }
  putOp(opId, sub, result, commitSha, ts) {
    this.s.putOp.run(opId, sub, JSON.stringify(result), commitSha, ts);
  }

  appendAudit(row) {
    this.s.appendAudit.run(row);
  }
  auditForNote(id) {
    return this.s.auditForNote.all(id);
  }
}
