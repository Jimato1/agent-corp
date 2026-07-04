/*
 * CORR-2 — the display-only frontmatter firewall / "frontmatter is NOT a Board trigger".
 *
 * A note written with a display_phase carries `ceremony_phase_display` in the canonical FILE (it is
 * decoration for a human eyeball), but that field NEVER appears in: the index row, a search result,
 * a read response, or the taint object — and there is no column to read it back from. Convergence
 * signals come from the Board API, never from frontmatter. This proves the firewall structurally.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeService, principal } from './helpers/harness.js';

test('display_phase lives in the file but is never read back (CORR-2 firewall)', async () => {
  const { service, repo, db, corpus } = await makeService();
  const p = principal('ag:tester', ['notes:append', 'notes:read']);

  const created = await service.createNote({
    type: 'research',
    title: 'Firewall probe note',
    provenance: 'agent',
    op_id: 'op-fw-1',
    principal: p,
  });
  const id = created.note_id;

  // Append into a real section carrying a VALID spec ceremony phase as the display mirror.
  await service.appendNote({
    note_id: id,
    section: 'Findings',
    content: 'grounded finding text',
    display_phase: 'recon', // spec phase → written to ceremony_phase_display mirror
    op_id: 'op-fw-2',
    principal: p,
  });

  // (1) It IS in the canonical file.
  const row = repo.getNote(id);
  const raw = await corpus.readByPath(row.path);
  assert.match(raw, /ceremony_phase_display:\s*recon/, 'display mirror must be persisted in the file');

  // (2) It is NOT in the read response frontmatter.
  const read = await service.readNote(id);
  assert.equal(read.frontmatter.ceremony_phase_display, undefined, 'read response must not surface the display mirror');
  assert.equal('ceremony_phase_display' in read.frontmatter, false);

  // (3) It is NOT a column on the index table — there is structurally nothing to read back.
  const cols = db.prepare('PRAGMA table_info(note)').all().map((c) => c.name);
  assert.ok(!cols.includes('ceremony_phase_display'), 'no display column on note');
  assert.ok(!cols.includes('ticket_status_display'), 'no display column on note');

  // (4) It is NOT in the index row object.
  assert.equal('ceremony_phase_display' in row, false);

  // (5) It is NOT in a search result.
  const hits = service.search({ query: 'grounded finding', limit: 10 });
  assert.ok(hits.length >= 1);
  for (const h of hits) assert.equal('ceremony_phase_display' in h, false);

  // (6) It is NOT in the taint object (which is what the Board lane-eligibility check consumes).
  const t = service.taint(id);
  assert.deepEqual(Object.keys(t).sort(), ['effective', 'own', 'tainted_via']);
  assert.equal('ceremony_phase_display' in t, false);

  db.close();
});
