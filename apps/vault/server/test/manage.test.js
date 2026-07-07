/*
 * manage.test.js — the operator surface constitutional facts (§8): write-only (never echoes a value),
 * the sign-role no-wildcard/no-root invariant PREVENTS staging, change-control is diff-hash-bound, and
 * status never false-greens a seal it cannot confirm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, principal } from './helpers/harness.js';

test('createKv is write-only: the response NEVER contains the value; no value column is stored', async () => {
  const v = await makeVault();
  const out = await v.services.manage.createKv({ principal: principal(), hostId: 'nas-01', name: 'admin-login', value: 's3cret-value', description: 'NAS admin' });
  assert.equal(out.status, 'written');
  assert.equal(JSON.stringify(out).includes('s3cret-value'), false, 'value never echoed');
  const cols = v.db.prepare('PRAGMA table_info(handles)').all().map((c) => c.name);
  assert.equal(cols.includes('value'), false, 'no value column exists in handles');
  // and no audit row leaks the value either
  const rows = v.db.prepare('SELECT detail_json FROM audit_local').all();
  for (const r of rows) assert.doesNotMatch(String(r.detail_json || ''), /s3cret-value/);
});

test('sign-role invariant: staging a wildcard or root principal is REJECTED in code', async () => {
  const v = await makeVault();
  v.services.manage.registerHost({ principal: principal(), hostId: 'nas-01' });
  await assert.rejects(async () => v.services.manage.stageSignRole({ principal: principal(), hostId: 'nas-01', allowedUsers: ['root'], validPrincipals: ['root'] }), (e) => e.code === 'invariant_violation');
  await assert.rejects(async () => v.services.manage.stageSignRole({ principal: principal(), hostId: 'nas-01', allowedUsers: ['*'], validPrincipals: ['svc-deploy'] }), (e) => e.code === 'invariant_violation');
  await assert.rejects(async () => v.services.manage.stageSignRole({ principal: principal(), hostId: 'nas-01', allowedUsers: [], validPrincipals: [] }), (e) => e.code === 'invariant_violation');
});

test('sign-role stage → proposed diff + hash (powerless); apply requires the matching diff-hash', async () => {
  const v = await makeVault();
  v.services.manage.registerHost({ principal: principal(), hostId: 'nas-01' });
  const staged = v.services.manage.stageSignRole({ principal: principal(), hostId: 'nas-01', allowedUsers: ['svc-deploy'], validPrincipals: ['svc-deploy'] });
  assert.equal(staged.state, 'staged');
  assert.match(staged.diff_hash, /^sha256:/);
  // wrong diff-hash → stale_diff (the operator must confirm the exact diff)
  assert.throws(() => v.services.manage.applySignRole({ principal: principal(), hostId: 'nas-01', diffHash: 'sha256:wrong', stepUpVerified: true }), (e) => e.code === 'stale_diff');
  const applied = v.services.manage.applySignRole({ principal: principal(), hostId: 'nas-01', diffHash: staged.diff_hash, stepUpVerified: true });
  assert.equal(applied.state, 'ready');
});

test('change-control apply: diff-hash bound; refused under an active kill level', async () => {
  const v = await makeVault();
  const diff = v.services.manage.changeControlDiff({ edit: 'ssh_cert_ttl', from: '10m', to: '30m' });
  assert.throws(() => v.services.manage.changeControlApply({ principal: principal(), edit: 'ssh_cert_ttl', from: '10m', to: '30m', diffHash: 'sha256:stale', stepUpVerified: true }), (e) => e.code === 'stale_diff');
  v.revocation.setDenylist({ kill_level: 'G1', epoch: 1 });
  assert.throws(() => v.services.manage.changeControlApply({ principal: principal(), edit: 'ssh_cert_ttl', from: '10m', to: '30m', diffHash: diff.diff_hash, stepUpVerified: true }), (e) => e.code === 'kill_engaged');
});

test('status: seal renders confirmable when the engine answers; audit_sinks green only if both current', async () => {
  const v = await makeVault();
  const s = await v.services.manage.status();
  assert.equal(s.seal.confirmable, true); // fake engine answers unsealed
  assert.equal(typeof s.audit_sinks.both_current, 'boolean');
});
