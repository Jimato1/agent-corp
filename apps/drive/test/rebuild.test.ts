/* Blobs + journals are CANONICAL; the SQLite index is provably rebuildable (PLAN §3.4/§9.3).
   Commit artifacts, blow away the index rows, rebuild from the journals, and confirm the index
   is reconstructed and `drive verify` passes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness, agentToken, putArtifact } from './helpers.js';
import { rebuildIndex, verify } from '../src/storage/maintenance.js';

test('rebuild-index reconstructs the SQLite index from the canonical journals', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    await putArtifact(h, tok, { ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'o1', fencing_token: 1, body: Buffer.from('alpha') });
    await putArtifact(h, tok, { ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'o2', fencing_token: 2, body: Buffer.from('beta longer') });
    await putArtifact(h, tok, { ticket_id: 'T-000124', logical_name: 'b.bin', op_id: 'o3', fencing_token: 1, body: Buffer.from('gamma') });

    const before = h.ctx.db.prepare(`SELECT COUNT(*) c FROM artifact_versions`).get() as { c: number };
    assert.equal(before.c, 3);

    // Simulate total index loss (the rebuildable part): drop every derived row.
    for (const t of ['artifact_versions', 'artifacts', 'blobs', 'ticket_fences']) {
      h.ctx.db.prepare(`DELETE FROM ${t}`).run();
    }
    assert.equal((h.ctx.db.prepare(`SELECT COUNT(*) c FROM artifact_versions`).get() as { c: number }).c, 0);

    // Rebuild purely from journals + blob tree.
    const r = rebuildIndex(h.ctx.store);
    assert.ok(r.replayed >= 3, 'journal events replayed');

    const after = h.ctx.db.prepare(`SELECT COUNT(*) c FROM artifact_versions`).get() as { c: number };
    assert.equal(after.c, 3, 'all versions reconstructed');
    // Pointer moved to the latest version of the multi-version artifact.
    const art = h.ctx.db.prepare(`SELECT current_version_id FROM artifacts WHERE ticket_id = 'T-000123'`).get() as { current_version_id: string };
    const seq = h.ctx.db.prepare(`SELECT seq FROM artifact_versions WHERE version_id = ?`).get(art.current_version_id) as { seq: number };
    assert.equal(seq.seq, 2, 'current pointer resolves to the highest seq');
    // Fencing high-water restored on replay.
    const fence = h.ctx.db.prepare(`SELECT max_fence FROM ticket_fences WHERE ticket_id = 'T-000123'`).get() as { max_fence: number };
    assert.equal(fence.max_fence, 2);

    // verify() reconciles rows↔blobs both directions with hashes.
    const report = verify(h.ctx.store, { fullHash: true });
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.hash_failures.length, 0);
    assert.equal(report.rows_missing_blob.length, 0);
  } finally {
    h.close();
  }
});
