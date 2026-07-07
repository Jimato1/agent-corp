/*
 * redeem.test.js — the §4 redeem pipeline reject-path matrix. Proves EVERY reject fails closed IN CODE
 * with the frozen G-1 code, and that the happy path requires the full conjunction. Standing regression:
 * agent token → 403, always. The Vault re-verifies the Board itself (D-4) — it never trusts the Gateway.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, fakeEngine, fakeBoard, fakeWorm, seedHandle, seedRelease, gatewayClaims, redeemCtxReq } from './helpers/harness.js';

async function expectReject(promise, code, http) {
  await assert.rejects(promise, (e) => {
    assert.equal(e.name, 'RedeemError', `expected RedeemError, got ${e && e.name}: ${e && e.message}`);
    assert.equal(e.code, code, `expected code ${code}, got ${e.code}`);
    if (http) assert.equal(e.httpStatus, http, `expected http ${http}, got ${e.httpStatus}`);
    return true;
  });
}

test('HAPPY PATH: full conjunction → plaintext returned + release consumed single-use', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  seedRelease(v.db);
  const { ctx, req } = redeemCtxReq();
  const out = await v.services.redeem.redeem({ ctx, req });
  assert.equal(out.http, 200);
  assert.ok(out.body.plaintext, 'plaintext present');
  assert.equal(out.body.release_id, 'rel-01HX0000000000000000000000');
  // release is now redeemed (single-use)
  const r = v.services.releases.getRelease('rel-01HX0000000000000000000000');
  assert.equal(r.status, 'redeemed');
  assert.equal(r.redeemed_by, 'svc:gateway');
  // both an attempt and an outcome audit row exist
  const rows = v.db.prepare("SELECT event_type FROM audit_local WHERE ticket_id='T-000123' ORDER BY seq").all().map((x) => x.event_type);
  assert.ok(rows.includes('redeem_attempt') && rows.includes('redeem_outcome'), `audit rows: ${rows}`);
});

test('HAPPY PATH ssh-ca: returns a signed cert (never a stored password)', async () => {
  const v = await makeVault();
  seedHandle(v.db, { handle: 'cred://hosts/nas-01/root', name: 'root', kind: 'ssh-ca', ssh_principal: 'root' });
  seedRelease(v.db, { handle: 'cred://hosts/nas-01/root' });
  const { ctx, req } = redeemCtxReq({ req: { ssh_public_key: 'ssh-ed25519 AAAA...' } });
  const out = await v.services.redeem.redeem({ ctx, req });
  assert.ok(out.body.signed_cert, 'signed cert present');
  assert.equal(out.body.plaintext, undefined, 'no plaintext for ssh-ca');
  assert.equal(out.body.metadata.key_id, 'T-000123'); // key_id == ticket_id (contract §2)
});

// ---- STEP 0: channel ----------------------------------------------------------------------------
test('step0: no Gateway channel cert → 403 not_gateway_channel + exfil escalation', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedRelease(v.db);
  const { ctx, req } = redeemCtxReq();
  ctx.channelOk = false;
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'not_gateway_channel', 403);
  assert.equal(v.chat.posts.length, 1, 'exfil escalation dispatched');
});

// ---- STEPS 1–6: §8-pin token validation ---------------------------------------------------------
test('step4: wrong aud → 401 invalid_token', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  const { ctx, req } = redeemCtxReq({ claims: gatewayClaims({ aud: 'board' }) });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'invalid_token', 401);
});
test('step4: multi-valued aud → 401 invalid_token', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  const { ctx, req } = redeemCtxReq({ claims: gatewayClaims({ aud: ['vault', 'board'] }) });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'invalid_token', 401);
});
test('step5: missing vault:read-credential scope → 403 insufficient_scope', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  const { ctx, req } = redeemCtxReq({ claims: gatewayClaims({ scope: 'vault:reference' }) });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'insufficient_scope', 403);
});
test('step6: sub != svc:gateway (agent) → 403 not_gateway + exfil (THE standing regression)', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  const { ctx, req } = redeemCtxReq({ claims: gatewayClaims({ sub: 'agent:patcher-07' }) });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'not_gateway', 403);
  assert.equal(v.chat.posts.length, 1, 'agent redeem raises a first-class exfiltration signal');
});
test('step6a: missing cnf proof → 401 invalid_token (no proof, no validity, never downgrade)', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  const c = gatewayClaims(); delete c.cnf;
  const { ctx, req } = redeemCtxReq({ claims: c });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'invalid_token', 401);
});

// ---- STEP 8: release record ---------------------------------------------------------------------
test('step8: unknown release → 404 unknown_release', async () => {
  const v = await makeVault(); seedHandle(v.db); // no release seeded
  const { ctx, req } = redeemCtxReq();
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'unknown_release', 404);
});
test('step8: release already redeemed w/ different op → 403 release_not_pending (terminal, not 409)', async () => {
  const v = await makeVault(); seedHandle(v.db);
  seedRelease(v.db, { status: 'redeemed' });
  const { ctx, req } = redeemCtxReq({ req: { op_id: 'different-op' } });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'release_not_pending', 403);
});
test('step8: expired release → 410 release_expired (terminal)', async () => {
  const v = await makeVault(); seedHandle(v.db);
  seedRelease(v.db, { expires_at: 1 }); // long past → lazy-expire on read
  const { ctx, req } = redeemCtxReq();
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'release_expired', 410);
});
test('step8: release ticket mismatch → 403 release_not_pending', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db, { ticket_id: 'T-999999' });
  const { ctx, req } = redeemCtxReq(); // req ticket T-000123 != release ticket
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'release_not_pending', 403);
});

// ---- STEP 7: destructive-exec live check --------------------------------------------------------
test('step7: sub on the pushed denylist → 403 revoked', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  v.revocation.setDenylist({ denied_sub: ['svc:gateway'] });
  const { ctx, req } = redeemCtxReq();
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'revoked', 403);
});
test('step7: kill level >= G1 → 403 revoked', async () => {
  const v = await makeVault(); seedHandle(v.db); seedRelease(v.db);
  v.revocation.setDenylist({ kill_level: 'G1', epoch: 5 });
  const { ctx, req } = redeemCtxReq();
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'revoked', 403);
});

// ---- STEP 9: D-4 INDEPENDENT Board approval verification -----------------------------------------
test('step9: approval status granted (not consumed) → 403 approval_not_consumed', async () => {
  const v = await makeVault({ board: fakeBoard({ approval: { exists: true, status: 'granted', consumed_by: null, ticket_id: 'T-000123', host_id: 'nas-01', plan_hash: 'sha256:aa', action_class: 'destructive' } }) });
  seedHandle(v.db); seedRelease(v.db);
  const { ctx, req } = redeemCtxReq();
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'approval_not_consumed', 403);
});
test('step9: consumed_by != redeemer sub → 403 approval_mismatch', async () => {
  const v = await makeVault({ board: fakeBoard({ approval: { exists: true, status: 'consumed', consumed_by: 'svc:other', ticket_id: 'T-000123', ticket_status: 'executing', host_id: 'nas-01', plan_hash: 'sha256:aa', action_class: 'destructive', consumed_at: 1_700_000_000_000 } }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'approval_mismatch', 403);
});
test('step9: host_id mismatch (request vs approval) → 403 approval_mismatch', async () => {
  const v = await makeVault({ board: fakeBoard({ approval: { exists: true, status: 'consumed', consumed_by: 'svc:gateway', ticket_id: 'T-000123', ticket_status: 'executing', host_id: 'other-host', plan_hash: 'sha256:aa', action_class: 'destructive', consumed_at: 1_700_000_000_000 } }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'approval_mismatch', 403);
});
test('step9: plan_hash mismatch → 403 approval_mismatch', async () => {
  const v = await makeVault({ board: fakeBoard({ approval: { exists: true, status: 'consumed', consumed_by: 'svc:gateway', ticket_id: 'T-000123', ticket_status: 'executing', host_id: 'nas-01', plan_hash: 'sha256:DIFFERENT', action_class: 'destructive', consumed_at: 1_700_000_000_000 } }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'approval_mismatch', 403);
});
test('step9 (M-2): reversible-class approval cannot redeem a root-class handle → 403 approval_mismatch', async () => {
  const v = await makeVault({ board: fakeBoard({ approval: { exists: true, status: 'consumed', consumed_by: 'svc:gateway', ticket_id: 'T-000123', ticket_status: 'executing', host_id: 'nas-01', plan_hash: 'sha256:aa', action_class: 'standard', consumed_at: 1_700_000_000_000 } }) });
  seedHandle(v.db, { requires_approval_class: 'irreversible' }); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'approval_mismatch', 403);
});
test('step9 (B-4): first redeem past W → 403 approval_stale', async () => {
  const v = await makeVault({ board: fakeBoard({ approval: { exists: true, status: 'consumed', consumed_by: 'svc:gateway', ticket_id: 'T-000123', ticket_status: 'executing', host_id: 'nas-01', plan_hash: 'sha256:aa', action_class: 'destructive', consumed_at: 1_700_000_000_000 - 16 * 60 * 1000 } }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'approval_stale', 403);
});
test('step9: Board unreachable → 503 board_unreachable (fail-closed)', async () => {
  const v = await makeVault({ board: fakeBoard({ unreachable: true }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'board_unreachable', 503);
});

// ---- STEP 10/13: fail-closed audit gate ---------------------------------------------------------
test('step10: WORM sink does not ack → 503 audit_unavailable (D-16a fail-closed)', async () => {
  const v = await makeVault({ worm: fakeWorm({ ackAll: false }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'audit_unavailable', 503);
  // the engine was NEVER called (attempt gate is BEFORE the engine op)
  assert.equal(v.engine.calls.length, 0, 'engine not called when audit unavailable');
  // release stays pending (not consumed)
  assert.equal(v.services.releases.getRelease('rel-01HX0000000000000000000000').status, 'pending');
});

// ---- Option A: denials are fail-closed on audit (contract §6 / MI-5) ----------------------------
test('denial with WORM down → 503 audit_unavailable (never a single-sink 403), exfil still fires', async () => {
  const v = await makeVault({ worm: fakeWorm({ ackAll: false }) });
  seedHandle(v.db); seedRelease(v.db);
  // an agent-shaped token would normally be 403 not_gateway; with the off-box sink down it must be 503.
  const { ctx, req } = redeemCtxReq({ claims: gatewayClaims({ sub: 'agent:patcher-07' }) });
  await expectReject(v.services.redeem.redeem({ ctx, req }), 'audit_unavailable', 503);
  assert.equal(v.chat.posts.length, 1, 'exfil escalation still dispatched even when the off-box sink is down');
});

// ---- STEP 11: engine op -------------------------------------------------------------------------
test('step11: engine denied (two layers disagreed) → 403 engine_denied + exfil', async () => {
  const v = await makeVault({ engine: fakeEngine({ throwKind: 'denied' }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'engine_denied', 403);
  assert.equal(v.chat.posts.length, 1, 'engine-denied is anomalous → escalated');
});
test('step11: engine sealed → 503 engine_sealed (retryable)', async () => {
  const v = await makeVault({ engine: fakeEngine({ throwKind: 'sealed' }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'engine_sealed', 503);
});
test('step11: engine unavailable → 503 engine_unavailable (retryable)', async () => {
  const v = await makeVault({ engine: fakeEngine({ throwKind: 'unavailable' }) });
  seedHandle(v.db); seedRelease(v.db);
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'engine_unavailable', 503);
});

// ---- §4.4 idempotent re-release -----------------------------------------------------------------
test('re-release: same (release_id, op_id, sub) after redeem → fresh read while executing; caps at N=3', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedRelease(v.db);
  const first = redeemCtxReq();
  await v.services.redeem.redeem(first); // status → redeemed
  // three re-releases succeed (same op_id + sub, ticket executing + host lock held)
  for (let i = 0; i < 3; i++) {
    const out = await v.services.redeem.redeem(redeemCtxReq());
    assert.ok(out.body.plaintext, `re-release ${i + 1} returns a value`);
  }
  // the 4th trips the cap
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 're_release_cap', 403);
});
test('re-release: mid-run requires ticket_status==executing (B-4 live authority)', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedRelease(v.db);
  await v.services.redeem.redeem(redeemCtxReq());
  v.board.state.approval = { ...v.board.state.approval, ticket_status: 'verifying' }; // no longer executing
  await expectReject(v.services.redeem.redeem(redeemCtxReq()), 'approval_stale', 403);
});
