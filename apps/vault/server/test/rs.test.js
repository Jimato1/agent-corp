/*
 * rs.test.js — the §8-pin holder validation (steps 4–6a) as a standalone unit, plus the scope/kind gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, gatewayClaims } from './helpers/harness.js';

async function validate(v, claims) {
  return v.rs.validateHolderRedeem(claims, { channelThumbprint: 'THUMB' });
}

test('valid gateway claims → returns the validated holder', async () => {
  const v = await makeVault();
  const h = await validate(v, gatewayClaims());
  assert.equal(h.sub, 'svc:gateway');
  assert.ok(h.scopes.includes('vault:read-credential'));
});

test('rejects wrong aud / multi-aud / missing scope / wrong sub / missing cnf — each in code', async () => {
  const v = await makeVault();
  const cases = [
    [gatewayClaims({ aud: 'board' }), 'invalid_token'],
    [gatewayClaims({ aud: ['vault', 'x'] }), 'invalid_token'],
    [gatewayClaims({ scope: 'vault:reference' }), 'insufficient_scope'],
    [gatewayClaims({ sub: 'agent:x' }), 'not_gateway'],
    [(() => { const c = gatewayClaims(); delete c.cnf; return c; })(), 'invalid_token'],
  ];
  for (const [claims, code] of cases) {
    await assert.rejects(validate(v, claims), (e) => e.name === 'RedeemError' && e.code === code, `expected ${code}`);
  }
});

test('scope gate: vault:manage requires human kind; a service principal is refused', async () => {
  const v = await makeVault();
  // Build a tiny express app with a manage-scoped route and drive it with dev headers.
  const express = (await import('express')).default;
  const app = express();
  app.get('/x', v.rs.requireScope('vault:manage'), (req, res) => res.json({ ok: true }));
  const http = await import('node:http');
  const srv = http.createServer(app).listen(0);
  const port = srv.address().port;
  try {
    // service kind with vault:manage → refused (human-kind-gated)
    const r1 = await fetch(`http://127.0.0.1:${port}/x`, { headers: { 'x-dev-sub': 'svc:x', 'x-dev-kind': 'service', 'x-dev-scopes': 'vault:manage' } });
    assert.equal(r1.status, 403);
    // operator (human) with vault:manage → allowed
    const r2 = await fetch(`http://127.0.0.1:${port}/x`, { headers: { 'x-dev-sub': 'op:ada', 'x-dev-kind': 'human', 'x-dev-scopes': 'vault:manage' } });
    assert.equal(r2.status, 200);
  } finally { srv.close(); }
});
