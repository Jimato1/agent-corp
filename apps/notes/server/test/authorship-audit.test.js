/*
 * CORR-4 — git authorship bound to the auth `sub` via a commit TRAILER, and the audit table is a
 * rebuildable projection that JOINS on that sub. author.email is a meaningless constant; the Sub:
 * trailer is the only join key.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeService, principal } from './helpers/harness.js';

test("commit carries `Sub:` trailer; audit projection joins on it (CORR-4)", async () => {
  const { service, repo, git, db } = await makeService();
  const sub = 'ag:alice';
  const created = await service.createNote({
    type: 'research', title: 'authored note', op_id: 'au-1', principal: principal(sub, ['notes:append']),
  });
  const id = created.note_id;

  // 1) The git commit itself carries the Sub trailer (the authoritative binding).
  const trailers = await git.readAuditTrailers({ limit: 100 });
  const mine = trailers.find((t) => t.note_id === id);
  assert.ok(mine, 'a trailer row for the note must exist');
  assert.equal(mine.sub, sub, 'Sub: trailer must equal the token-derived sub');
  assert.equal(mine.commit_sha, created.commit_sha);

  // 2) The audit table row joins on the same sub.
  const rows = repo.auditForNote(id);
  assert.ok(rows.length >= 1);
  assert.equal(rows[0].sub, sub);
  assert.equal(rows[0].commit_sha, created.commit_sha);

  // 3) The join is on the trailer, not on author.email — different subs are distinguishable even
  //    though they all share the constant author email.
  const created2 = await service.createNote({
    type: 'research', title: 'other author note', op_id: 'au-2', principal: principal('op:bob', ['notes:append']),
  });
  assert.equal(repo.auditForNote(created2.note_id)[0].sub, 'op:bob');

  db.close();
});
