/* Regression coverage for the HIGH verification finding: the production human-UI auth path must be
   wired from config (X-Auth-Identity verifier), so a browser session actually reaches the shared
   state — "two views, one state". Plus the Helm UI static assets must be served. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarnessConfigWired, humanIdentity } from './helpers.js';

test('a browser X-Auth-Identity request reaches the shared state (verifier wired from config, not tests)', async () => {
  const h = makeHarnessConfigWired();
  try {
    const ident = await humanIdentity('op:ada', 'drive:read drive:write');
    // The operator browser presents X-Auth-Identity (no Bearer) — exactly like the proxy forward-auth.
    const res = await h.app.inject({ method: 'GET', url: '/api/tickets', headers: { 'x-auth-identity': ident } });
    assert.equal(res.statusCode, 200, 'human UI must not 401 when the identity verifier is config-wired');
    assert.ok(Array.isArray(res.json().tickets));
  } finally {
    h.close();
  }
});

test('an unsigned/forged X-Auth-Identity is rejected (never trust the advisory header)', async () => {
  const h = makeHarnessConfigWired();
  try {
    const res = await h.app.inject({ method: 'GET', url: '/api/tickets', headers: { 'x-auth-identity': 'not-a-real-jws' } });
    assert.equal(res.statusCode, 401);
  } finally {
    h.close();
  }
});

test('the Helm UI shell + design-system assets are served', async () => {
  const h = makeHarnessConfigWired();
  try {
    const index = await h.app.inject({ method: 'GET', url: '/' });
    assert.equal(index.statusCode, 200);
    assert.match(String(index.headers['content-type']), /text\/html/);
    assert.match(index.body, /HelmDesignSystem_f4cb26|_ds_bundle\.js/);

    const styles = await h.app.inject({ method: 'GET', url: '/ui-assets/styles.css' });
    assert.equal(styles.statusCode, 200);
    assert.match(String(styles.headers['content-type']), /text\/css/);

    const bundle = await h.app.inject({ method: 'GET', url: '/ui-assets/_ds_bundle.js' });
    assert.equal(bundle.statusCode, 200);

    const app = await h.app.inject({ method: 'GET', url: '/app/dr-api.jsx' });
    assert.equal(app.statusCode, 200);

    // Path-traversal guard on the static server.
    const evil = await h.app.inject({ method: 'GET', url: '/ui-assets/..%2f..%2f..%2fpackage.json' });
    assert.ok(evil.statusCode === 403 || evil.statusCode === 404);
  } finally {
    h.close();
  }
});
