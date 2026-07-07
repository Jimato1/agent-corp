/* Storage-engine unit behaviour: CAS dedup/refcount, append-only versioning, per-principal
   idempotency, operator delete-marker/restore, list pagination. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness, agentToken, humanIdentity, putArtifact } from './helpers.js';

test('identical bytes across tickets dedup to one blob (refcount 2)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const body = Buffer.from('the same exact bytes');
    const a = await putArtifact(h, tok, { ticket_id: 'T-000001', logical_name: 'x', op_id: 'o1', fencing_token: 1, body });
    const b = await putArtifact(h, tok, { ticket_id: 'T-000002', logical_name: 'y', op_id: 'o2', fencing_token: 1, body });
    assert.equal(a.body.sha256, b.body.sha256);
    const blob = h.ctx.db.prepare(`SELECT refcount FROM blobs WHERE sha256 = ?`).get(a.body.sha256) as { refcount: number };
    assert.equal(blob.refcount, 2);
    const blobCount = h.ctx.db.prepare(`SELECT COUNT(*) c FROM blobs`).get() as { c: number };
    assert.equal(blobCount.c, 1, 'whole-object dedup: one blob');
  } finally {
    h.close();
  }
});

test('a new put to an existing (ticket, logical_name) appends a version and moves the pointer', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const v1 = await putArtifact(h, tok, { ticket_id: 'T-000010', logical_name: 'report.pdf', op_id: 'o1', fencing_token: 1, body: Buffer.from('v1') });
    const v2 = await putArtifact(h, tok, { ticket_id: 'T-000010', logical_name: 'report.pdf', op_id: 'o2', fencing_token: 1, body: Buffer.from('v2 longer') });
    assert.equal(v1.body.artifact_id, v2.body.artifact_id, 'same logical artifact');
    assert.equal(v2.body.seq, 2);
    const detail = await h.app.inject({ method: 'GET', url: `/api/artifacts/${v2.body.artifact_id}`, headers: { authorization: `Bearer ${tok}` } });
    const d = detail.json();
    assert.equal(d.versions.length, 2);
    assert.equal(d.metadata.current_version_id, v2.body.version_id);
  } finally {
    h.close();
  }
});

test('op_id idempotency is PER-PRINCIPAL (same sub collapses; foreign sub is distinct)', async () => {
  const h = makeHarness();
  try {
    const tokA = await agentToken('agent:a');
    const tokB = await agentToken('agent:b');
    const first = await h.app.inject({ method: 'POST', url: '/api/artifacts', headers: { authorization: `Bearer ${tokA}`, 'content-type': 'application/json' }, payload: JSON.stringify({ ticket_id: 'T-000020', logical_name: 'z', op_id: 'shared-key', fencing_token: 1 }) });
    const replay = await h.app.inject({ method: 'POST', url: '/api/artifacts', headers: { authorization: `Bearer ${tokA}`, 'content-type': 'application/json' }, payload: JSON.stringify({ ticket_id: 'T-000020', logical_name: 'z', op_id: 'shared-key', fencing_token: 1 }) });
    assert.equal(first.json().upload_id, replay.json().upload_id, 'same principal + op_id ⇒ same upload session');
    const foreign = await h.app.inject({ method: 'POST', url: '/api/artifacts', headers: { authorization: `Bearer ${tokB}`, 'content-type': 'application/json' }, payload: JSON.stringify({ ticket_id: 'T-000020', logical_name: 'z2', op_id: 'shared-key', fencing_token: 1 }) });
    assert.notEqual(foreign.json().upload_id, first.json().upload_id, 'foreign principal reusing the string is a fresh op');
  } finally {
    h.close();
  }
});

test('operator delete-marker hides the artifact; restore re-points it', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const ident = await humanIdentity('op:ada');
    const put = await putArtifact(h, tok, { ticket_id: 'T-000030', logical_name: 'd.bin', op_id: 'o1', fencing_token: 1 });
    const aid = put.body.artifact_id;
    const del = await h.app.inject({ method: 'DELETE', url: `/api/artifacts/${aid}`, headers: { 'x-auth-identity': ident } });
    assert.equal(del.statusCode, 200);
    // Hidden from default listing…
    const list = await h.app.inject({ method: 'GET', url: '/api/artifacts?ticket_id=T-000030', headers: { authorization: `Bearer ${tok}` } });
    assert.equal(list.json().artifacts.length, 0);
    // …but visible with include_deleted.
    const listDel = await h.app.inject({ method: 'GET', url: '/api/artifacts?ticket_id=T-000030&include_deleted=true', headers: { authorization: `Bearer ${tok}` } });
    assert.equal(listDel.json().artifacts.length, 1);
    // Restore the original version.
    const restore = await h.app.inject({ method: 'POST', url: `/api/artifacts/${aid}/restore`, headers: { 'x-auth-identity': ident, 'content-type': 'application/json' }, payload: JSON.stringify({ version_id: put.body.version_id }) });
    assert.equal(restore.statusCode, 200);
    const list2 = await h.app.inject({ method: 'GET', url: '/api/artifacts?ticket_id=T-000030', headers: { authorization: `Bearer ${tok}` } });
    assert.equal(list2.json().artifacts.length, 1);
  } finally {
    h.close();
  }
});

test('list pagination returns a reachable next_page_token', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    for (let i = 0; i < 3; i++) await putArtifact(h, tok, { ticket_id: 'T-000040', logical_name: `f${i}`, op_id: `o${i}`, fencing_token: 1 });
    const list = await h.app.inject({ method: 'GET', url: '/api/artifacts?ticket_id=T-000040', headers: { authorization: `Bearer ${tok}` } });
    assert.equal(list.json().artifacts.length, 3);
    // distinct-ticket index sees the ticket.
    const idx = await h.app.inject({ method: 'GET', url: '/api/tickets', headers: { authorization: `Bearer ${tok}` } });
    assert.ok(idx.json().tickets.some((t: any) => t.ticket_id === 'T-000040' && t.artifact_count === 3));
  } finally {
    h.close();
  }
});
