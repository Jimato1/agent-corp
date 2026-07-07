/*
 * audit.test.js — the dual-sink, append-only, hash-chained audit (§6). Chain verify never false-greens;
 * append-only is trigger-enforced; the M-4 restore detector fires on local-vs-WORM HEAD divergence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, fakeWorm } from './helpers/harness.js';

test('hash chain: rows link; verifyChain ok on an intact chain', async () => {
  const v = await makeVault();
  const a = v.services.audit.appendLocal({ event_type: 'manage_x', outcome: 'ok' });
  const b = v.services.audit.appendLocal({ event_type: 'manage_y', outcome: 'ok' });
  assert.ok(a.row_hash && b.row_hash);
  const rowB = v.db.prepare('SELECT * FROM audit_local WHERE seq=?').get(b.seq);
  assert.equal(rowB.prev_hash, a.row_hash, 'chain links prev→row');
  assert.equal(v.services.audit.verifyChain().ok, true);
});

test('append-only: UPDATE/DELETE on audit_local are hard-rejected by triggers', async () => {
  const v = await makeVault();
  v.services.audit.appendLocal({ event_type: 'manage_x', outcome: 'ok' });
  assert.throws(() => v.db.prepare('UPDATE audit_local SET outcome=? WHERE seq=1').run('tampered'), /append-only/);
  assert.throws(() => v.db.prepare('DELETE FROM audit_local WHERE seq=1').run(), /append-only/);
});

test('verifyChain detects a tampered row (would-be false-green prevented)', async () => {
  const v = await makeVault();
  v.services.audit.appendLocal({ event_type: 'manage_x', outcome: 'ok' });
  v.services.audit.appendLocal({ event_type: 'manage_y', outcome: 'ok' });
  // Simulate a physical tamper: a second connection drops the append-only trigger and mutates a row.
  // verifyChain must recompute the hash from current fields and detect the break — never false-green.
  const dbPath = v.db.name;
  const Database = (await import('better-sqlite3')).default;
  const raw = new Database(dbPath);
  raw.exec('DROP TRIGGER IF EXISTS audit_no_update');
  raw.prepare('UPDATE audit_local SET outcome=? WHERE seq=1').run('TAMPERED');
  raw.close();
  const res = v.services.audit.verifyChain();
  assert.equal(res.ok, false);
  assert.equal(res.brokenAt, 1);
});

test('dualSink: acked=true only when the WORM sink acks; false otherwise', async () => {
  const ok = await makeVault({ worm: fakeWorm({ ackAll: true }) });
  const r1 = await ok.services.audit.dualSink({ event_type: 'redeem_attempt', outcome: 'ok' });
  assert.equal(r1.acked, true);
  const bad = await makeVault({ worm: fakeWorm({ ackAll: false }) });
  const r2 = await bad.services.audit.dualSink({ event_type: 'redeem_attempt', outcome: 'ok' });
  assert.equal(r2.acked, false);
  // even on no-ack, the LOCAL row is still durably appended (the durable queue)
  assert.equal(bad.db.prepare('SELECT COUNT(*) c FROM audit_local').get().c, 1);
});

test('restore detector: local HEAD behind WORM HEAD → restore=true + restore_marker row', async () => {
  const v = await makeVault({ worm: fakeWorm({ head: { seq: 100, row_hash: 'sha256:worm-ahead' } }) });
  v.services.audit.appendLocal({ event_type: 'manage_x', outcome: 'ok' }); // local seq 1 << 100
  const r = await v.services.audit.detectRestoreOnBoot();
  assert.equal(r.restore, true);
  const marker = v.db.prepare("SELECT COUNT(*) c FROM audit_local WHERE event_type='restore_marker'").get().c;
  assert.equal(marker, 1);
});

test('restore detector: WORM HEAD unfetchable → wormUnavailable (redeem stays closed)', async () => {
  const v = await makeVault({ worm: fakeWorm({ head: null }) });
  const r = await v.services.audit.detectRestoreOnBoot();
  assert.equal(r.wormUnavailable, true);
  assert.equal(r.restore, false);
});

test('secret values NEVER appear in an audit row (§6.2)', async () => {
  const v = await makeVault();
  await v.services.audit.dualSink({ event_type: 'redeem_outcome', outcome: 'ok', detail_json: { kind: 'kv', engine_request_id: 'ob-1' } });
  const rows = v.db.prepare('SELECT detail_json FROM audit_local').all();
  for (const r of rows) assert.doesNotMatch(String(r.detail_json || ''), /s3cret|password/i);
});
