/*
 * redeem-http.test.js — the creds router end-to-end (channel + pipeline over HTTP). Proves the standing
 * regression AT THE EDGE OF THE WIRE: an agent-shaped token → 403; a request without the Gateway channel
 * cert → 403; a fully valid Gateway request → 200. In devUnsafe the channel + claims are supplied via the
 * x-creds-* / x-dev-claims stub headers, exercising the SAME buildRedeemRouter code the prod listener runs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { makeVault, seedHandle, seedRelease, gatewayClaims } from './helpers/harness.js';

async function credsServer(v) {
  const { buildRedeemRouter } = await import('../src/api/redeem.js');
  const { BudgetMiddleware } = await import('../src/auth/budget.js');
  const app = express();
  app.use(buildRedeemRouter({ redeem: v.services.redeem, releases: v.services.releases, budget: new BudgetMiddleware({ ceiling: 4 }), audit: v.services.audit, logger: { warn() {}, error() {} } }));
  const srv = http.createServer(app).listen(0);
  return { srv, port: srv.address().port };
}

function body(over = {}) {
  return { release_id: 'rel-01HX0000000000000000000000', ticket_id: 'T-000123', approval_id: 'A-000045', host_id: 'nas-01', plan_hash: 'sha256:aa', run_id: 'R-1', op_id: 'op-1', ...over };
}

test('HTTP: valid Gateway request → 200 with plaintext', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedRelease(v.db);
  const { srv, port } = await credsServer(v);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-creds-client-cn': 'svc:gateway', 'x-creds-thumbprint': 'THUMB', 'x-dev-claims': JSON.stringify(gatewayClaims()) },
      body: JSON.stringify(body()),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.plaintext, 'plaintext returned');
  } finally { srv.close(); }
});

test('HTTP: agent-shaped token → 403 not_gateway (THE standing regression, over the wire)', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedRelease(v.db);
  const { srv, port } = await credsServer(v);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-creds-client-cn': 'svc:gateway', 'x-creds-thumbprint': 'THUMB', 'x-dev-claims': JSON.stringify(gatewayClaims({ sub: 'agent:patcher-07' })) },
      body: JSON.stringify(body()),
    });
    assert.equal(r.status, 403);
    const j = await r.json();
    assert.equal(j.code, 'not_gateway');
    assert.equal(j.retry, 'never');
  } finally { srv.close(); }
});

test('HTTP: no Gateway channel cert → 403 not_gateway_channel', async () => {
  const v = await makeVault();
  seedHandle(v.db); seedRelease(v.db);
  const { srv, port } = await credsServer(v);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dev-claims': JSON.stringify(gatewayClaims()) }, // no x-creds-client-cn
      body: JSON.stringify(body()),
    });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).code, 'not_gateway_channel');
  } finally { srv.close(); }
});

test('HTTP: malformed body → 400 bad_request (cheap reject, before expensive checks)', async () => {
  const v = await makeVault();
  const { srv, port } = await credsServer(v);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-creds-client-cn': 'svc:gateway', 'x-creds-thumbprint': 'THUMB', 'x-dev-claims': JSON.stringify(gatewayClaims()) },
      body: JSON.stringify({ nonsense: true }),
    });
    assert.equal(r.status, 400);
  } finally { srv.close(); }
});

test('HTTP: /releases/revoke without Gateway channel → 403', async () => {
  const v = await makeVault();
  const { srv, port } = await credsServer(v);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/releases/revoke`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticket_id: 'T-000123' }),
    });
    assert.equal(r.status, 403);
  } finally { srv.close(); }
});
