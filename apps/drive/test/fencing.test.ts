/* THE CRUX (adversarial-review finding #1): fencing is ENFORCED, not merely recorded.
   board-agents-claim.md §3 + IDENTIFIERS fencing row: "Drive: per-ticket local high-water-mark
   staleness check" — a token generated but never checked provides no safety. These tests prove
   Drive actually rejects a stale echo, requires an echo from agents, exempts human/service, and
   raises the high-water. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness, agentToken, humanIdentity, putArtifact } from './helpers.js';

test('agent write with a fresh fencing token commits and raises the high-water', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const r = await putArtifact(h, tok, { ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'op-1', fencing_token: 5 });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.seq, 1);
    const fence = h.ctx.db.prepare(`SELECT max_fence FROM ticket_fences WHERE ticket_id = 'T-000123'`).get() as { max_fence: number };
    assert.equal(fence.max_fence, 5);
  } finally {
    h.close();
  }
});

test('STALE fencing token is REJECTED (the enforced reject-stale check)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    // Establish high-water at gen 7.
    const ok = await putArtifact(h, tok, { ticket_id: 'T-000200', logical_name: 'a.bin', op_id: 'op-a', fencing_token: 7 });
    assert.equal(ok.status, 201);
    // A stale writer at gen 6 must be rejected with STALE_FENCING.
    const stale = await putArtifact(h, tok, { ticket_id: 'T-000200', logical_name: 'a.bin', op_id: 'op-b', fencing_token: 6 });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'STALE_FENCING');
    // The stale rejection is audit-journaled.
    const audited = h.ctx.db.prepare(`SELECT COUNT(*) c FROM audit_log WHERE action = 'stale_fence_rejected' AND ticket_id = 'T-000200'`).get() as { c: number };
    assert.ok(audited.c >= 1, 'stale_fence_rejected must be audited');
    // High-water is unchanged; no zombie version overwrote the pointer.
    const fence = h.ctx.db.prepare(`SELECT max_fence FROM ticket_fences WHERE ticket_id = 'T-000200'`).get() as { max_fence: number };
    assert.equal(fence.max_fence, 7);
    const versions = h.ctx.db.prepare(`SELECT COUNT(*) c FROM artifact_versions WHERE ticket_id = 'T-000200'`).get() as { c: number };
    assert.equal(versions.c, 1, 'the stale write must not have produced a version');
  } finally {
    h.close();
  }
});

test('equal-generation echo is accepted (legitimate same-lease write)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    await putArtifact(h, tok, { ticket_id: 'T-000300', logical_name: 'a.bin', op_id: 'op-a', fencing_token: 4 });
    const same = await putArtifact(h, tok, { ticket_id: 'T-000300', logical_name: 'a.bin', op_id: 'op-b', fencing_token: 4 });
    assert.equal(same.status, 201);
    assert.equal(same.body.seq, 2);
  } finally {
    h.close();
  }
});

test('agent write WITHOUT a fencing token is rejected (required echo)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const reg = await h.app.inject({
      method: 'POST',
      url: '/api/artifacts',
      headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ ticket_id: 'T-000400', logical_name: 'a.bin', op_id: 'op-x' }),
    });
    assert.equal(reg.statusCode, 409);
    assert.equal(reg.json().error.code, 'FENCING_REQUIRED');
  } finally {
    h.close();
  }
});

test('human/operator principals are EXEMPT from fencing (they hold no Board lease)', async () => {
  const h = makeHarness();
  try {
    const ident = await humanIdentity('op:ada');
    const reg = await h.app.inject({
      method: 'POST',
      url: '/api/artifacts',
      headers: { 'x-auth-identity': ident, 'content-type': 'application/json' },
      payload: JSON.stringify({ ticket_id: 'T-000500', logical_name: 'a.bin', op_id: 'op-h' }),
    });
    assert.equal(reg.statusCode, 201, JSON.stringify(reg.json()));
    const uploadId = reg.json().upload_id;
    const put = await h.app.inject({ method: 'PUT', url: `/api/uploads/${uploadId}`, headers: { 'x-auth-identity': ident, 'content-type': 'application/octet-stream' }, payload: Buffer.from('operator upload') });
    assert.equal(put.statusCode, 201);
    // The version records fencing_token = NULL for the exempt principal.
    const v = h.ctx.db.prepare(`SELECT fencing_token FROM artifact_versions WHERE ticket_id = 'T-000500'`).get() as { fencing_token: number | null };
    assert.equal(v.fencing_token, null);
  } finally {
    h.close();
  }
});
