/* RS-baseline enforcement (auth-apps-tokens-scopes.md §1/§8) + the byte-handoff being
   auth-covered (PLAN §2.2 — no capability URLs; every byte request carries the caller's own
   credential and is validated locally). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness, agentToken, wrongAudToken, putArtifact } from './helpers.js';

test('UNAUTHENTICATED blob access is denied (401 + WWW-Authenticate bootstrap)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const put = await putArtifact(h, tok, { ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'op-1', fencing_token: 1 });
    const aid = put.body.artifact_id;
    // No Authorization header ⇒ byte fetch must be refused.
    const res = await h.app.inject({ method: 'GET', url: `/api/artifacts/${aid}/content` });
    assert.equal(res.statusCode, 401);
    assert.match(res.headers['www-authenticate'] as string, /resource_metadata=/);
  } finally {
    h.close();
  }
});

test('a specific version content URL is also auth-gated (no capability URL bypass)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const put = await putArtifact(h, tok, { ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'op-1', fencing_token: 1 });
    const vid = put.body.version_id;
    const anon = await h.app.inject({ method: 'GET', url: `/api/versions/${vid}/content` });
    assert.equal(anon.statusCode, 401);
    // With a valid drive:read token it succeeds — the credential, not a URL secret, is the gate.
    const ok = await h.app.inject({ method: 'GET', url: `/api/versions/${vid}/content`, headers: { authorization: `Bearer ${tok}` } });
    assert.equal(ok.statusCode, 200);
  } finally {
    h.close();
  }
});

test('wrong-audience token is rejected (aud == drive, single-valued)', async () => {
  const h = makeHarness();
  try {
    const tok = await wrongAudToken();
    const res = await h.app.inject({ method: 'GET', url: '/api/tickets', headers: { authorization: `Bearer ${tok}` } });
    assert.equal(res.statusCode, 401);
  } finally {
    h.close();
  }
});

test('missing scope is 403 insufficient_scope (read-only token cannot write)', async () => {
  const h = makeHarness();
  try {
    const readOnly = await agentToken('agent:reader', 'drive:read');
    const reg = await h.app.inject({
      method: 'POST',
      url: '/api/artifacts',
      headers: { authorization: `Bearer ${readOnly}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'op-1', fencing_token: 1 }),
    });
    assert.equal(reg.statusCode, 403);
    assert.equal(reg.json().error.code, 'INSUFFICIENT_SCOPE');
  } finally {
    h.close();
  }
});

test('an agent cannot reach operator-only routes (delete-marker / restore / GC)', async () => {
  const h = makeHarness();
  try {
    const tok = await agentToken();
    const put = await putArtifact(h, tok, { ticket_id: 'T-000123', logical_name: 'a.bin', op_id: 'op-1', fencing_token: 1 });
    const aid = put.body.artifact_id;
    const del = await h.app.inject({ method: 'DELETE', url: `/api/artifacts/${aid}`, headers: { authorization: `Bearer ${tok}` } });
    assert.equal(del.statusCode, 403, 'agent must not reach the operator delete-marker route');
    const gc = await h.app.inject({ method: 'POST', url: '/api/admin/gc', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, payload: '{"confirm":"PURGE"}' });
    assert.equal(gc.statusCode, 403, 'agent must not reach GC');
  } finally {
    h.close();
  }
});
