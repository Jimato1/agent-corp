/*
 * releases.test.js — the powerless release lifecycle (§5.2): preconditions, conflict-collapse, status
 * bare-enum, revoke, cold-start unconditional revoke, TTL sweep.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, fakeBoard, seedHandle, principal } from './helpers/harness.js';

test('request_release: happy path stages a pending, non-redeemable rel-ULID', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const out = await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' });
  assert.match(out.release_id, /^rel-[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.equal(out.status, 'pending');
});

test('request_release: non-claimant → 403 not_claimant', async () => {
  const v = await makeVault({ board: fakeBoard({ ticket: { exists: true, status: 'in_progress', claimed_by: 'agent:someone-else', host_id: 'nas-01' } }) });
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await assert.rejects(v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' }), (e) => e.code === 'not_claimant' && e.httpStatus === 403);
});

test('request_release: handle host != ticket host → 403 host_mismatch', async () => {
  const v = await makeVault();
  seedHandle(v.db, { handle: 'cred://hosts/other-host/x', host_id: 'other-host', name: 'x' });
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await assert.rejects(v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/other-host/x', opId: 'op-a' }), (e) => e.code === 'host_mismatch');
});

test('request_release: terminal ticket → 403 ticket_terminal', async () => {
  const v = await makeVault({ board: fakeBoard({ ticket: { exists: true, status: 'done', claimed_by: 'agent:patcher-07', host_id: 'nas-01' } }) });
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await assert.rejects(v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' }), (e) => e.code === 'ticket_terminal');
});

test('request_release: Board unreachable → 503 board_unreachable (fail-closed)', async () => {
  const v = await makeVault({ board: fakeBoard({ unreachable: true }) });
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await assert.rejects(v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' }), (e) => e.code === 'board_unreachable' && e.httpStatus === 503);
});

test('conflict-collapse: a second request for (ticket, handle) returns the EXISTING pending release', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const a = await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' });
  const b = await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-b' });
  assert.equal(a.release_id, b.release_id, 'same singleton — no slot-squat');
});

test('release_status: bare enum only (no redeemer identity, no timestamps)', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const { release_id } = await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' });
  const s = v.services.releases.releaseStatus(release_id);
  assert.deepEqual(Object.keys(s), ['status']);
  assert.equal(s.status, 'pending');
});

test('revokeById: pending → revoked; revoking a terminal is a no-op', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const { release_id } = await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' });
  assert.equal(v.services.releases.revokeById(release_id, 'op:ada'), true);
  assert.equal(v.services.releases.getRelease(release_id).status, 'revoked');
  assert.equal(v.services.releases.revokeById(release_id, 'op:ada'), false);
});

test('revokeByTicket: revokes all pending for a ticket (G-4)', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedHandle(v.db, { handle: 'cred://hosts/nas-01/enable', name: 'enable' });
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'o1' });
  await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/enable', opId: 'o2' });
  const out = v.services.releases.revokeByTicket('T-000123', 'svc:gateway');
  assert.equal(out.revoked, 2);
});

test('cold-start unconditionally revokes all pending (§7.4)', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' });
  const n = v.services.releases.revokeAllPendingOnColdStart();
  assert.equal(n, 1);
});

test('sweepExpired: pending past TTL → expired', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  await v.services.releases.requestRelease({ principal: p, ticketId: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', opId: 'op-a' });
  v.clock.advance(v.config.releaseTtlMs + 1000);
  assert.equal(v.services.releases.sweepExpired(), 1);
});
