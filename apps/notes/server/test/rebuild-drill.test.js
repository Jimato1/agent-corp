/*
 * CORR-1 — the index is 100% rebuildable from the markdown files + git trailers.
 *
 * Snapshot a fixed query battery (notes, taints, backlinks, searches, audit projection, fence floor)
 * → rm notes.db → full reindex from files + git → assert byte-identical results. This is the in-test
 * twin of src/scripts/rebuild-drill.js. If anything the DB held could not be regenerated, the
 * markdown-is-truth invariant would be violated and this fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search as ftsSearch } from '../src/index/search.js';
import { makeService, reopenIndex, rmDbFiles, FakeBoard, principal } from './helpers/harness.js';

const P = principal('ag:builder', ['notes:append']);

function battery(db, repo) {
  const notes = db.prepare('SELECT id, path, title, type, provenance, provenance_taint FROM note ORDER BY id').all();
  const taints = notes.map((n) => ({ id: n.id, ...repo.taint(n.id) }));
  const backlinks = notes.map((n) => ({ id: n.id, back: repo.backlinks(n.id).map((b) => b.id).sort() }));
  const searches = ['canary', 'reboot OR patch', 'wazuh*'].map((q) => ({
    q,
    hits: ftsSearch(db, repo, { query: q, limit: 25 }).map((r) => ({ id: r.note_id, taint: r.taint })),
  }));
  const audit = db
    .prepare('SELECT sub, tool, note_id, ticket_id, fence, commit_sha FROM audit ORDER BY commit_sha, tool, note_id')
    .all();
  const floors = db.prepare('SELECT ticket_id, max_generation FROM fence_floor ORDER BY ticket_id').all();
  return { notes, taints, backlinks, searches, audit, floors };
}

test('rebuild drill: rm db → full reindex → identical (CORR-1)', async () => {
  const board = new FakeBoard({ generation: 3, provenance: 'host_originated' });
  const built = await makeService({ board });
  const { service, git } = built;

  // A small corpus that exercises every projection: a plain note, a linked note, a host-tainted
  // note, and a ticket-bound note (whose Fence trailer must rebuild the fence floor).
  const a = await service.createNote({ type: 'research', title: 'Canary reboot study', provenance: 'agent', op_id: 'rb-a', principal: P });
  const b = await service.createNote({ type: 'research', title: 'Wazuh rescan notes', provenance: 'host_originated', op_id: 'rb-b', principal: P });
  await service.linkNotes({ from_id: a.note_id, to_id: b.note_id, op_id: 'rb-link', principal: P });
  await service.createNote({
    type: 'plan', title: 'Patch rollout plan', ticket_id: 'T-900',
    fencing_token: 3, op_id: 'rb-c', principal: P,
  });

  const before = battery(built.db, built.repo);
  built.db.close();

  // rm notes.db — the ultimate recovery path.
  rmDbFiles();

  // Fresh DB + full reindex from files + git trailers ONLY.
  const re = await reopenIndex(git);
  await re.reconciler.reconcileAll({ full: true });
  const after = battery(re.db, re.repo);
  re.db.close();

  assert.deepEqual(after, before, 'every projection must regenerate identically from files + git');

  // Spot-check the load-bearing facts survived the wipe:
  assert.ok(before.notes.length === 3);
  assert.equal(after.floors.find((f) => f.ticket_id === 'T-900')?.max_generation, 3, 'fence floor rebuilt from Fence trailer');
  assert.ok(after.audit.length >= 4, 'audit projection rebuilt from Sub trailers');
});
