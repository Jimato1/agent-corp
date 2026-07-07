/*
 * mcp.test.js — the near-empty agent surface (§5.1). EXACTLY four tools; no reveal/export/redeem/rotate
 * tool exists by construction; handles carry no value; request_release returns a powerless rel-ULID.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, seedHandle, principal } from './helpers/harness.js';
import { TOOL_DEFS, makeHandlers } from '../src/mcp/tools.js';

test('exactly four tools, and none is a reveal/export/redeem/rotate/sign tool', async () => {
  const names = Object.keys(TOOL_DEFS);
  assert.deepEqual(names.sort(), ['vault_describe_handle', 'vault_list_handles', 'vault_release_status', 'vault_request_release']);
  const forbidden = /reveal|export|redeem|unwrap|rotate|sign|plaintext|read_secret/i;
  for (const n of names) assert.doesNotMatch(n, forbidden, `tool ${n} must not be a plaintext/redeem surface`);
});

test('describe_handle returns metadata only — never a value or timestamps', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const handlers = makeHandlers(v.services, p);
  const res = await handlers['vault_describe_handle']({ handle: 'cred://hosts/nas-01/admin-login' });
  const data = res.structuredContent;
  assert.deepEqual(Object.keys(data).sort(), ['description', 'handle', 'host_id', 'kind', 'requires_approval_class']);
  assert.equal('value' in data, false);
});

test('list_handles is host-scoped via Board facts; request_release yields a powerless rel-ULID', async () => {
  const v = await makeVault();
  seedHandle(v.db);
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const handlers = makeHandlers(v.services, p);
  const list = await handlers['vault_list_handles']({ ticket_id: 'T-000123' });
  assert.equal(list.structuredContent.host_id, 'nas-01');
  assert.ok(list.structuredContent.handles.length >= 1);
  const rel = await handlers['vault_request_release']({ ticket_id: 'T-000123', handle: 'cred://hosts/nas-01/admin-login', op_id: 'op-1' });
  assert.match(rel.structuredContent.release_id, /^rel-/);
  assert.equal(rel.structuredContent.status, 'pending');
});

test('a business failure is isError structured content, never a thrown protocol error', async () => {
  const v = await makeVault();
  const p = principal('agent:patcher-07', ['vault:reference'], 'agent');
  const handlers = makeHandlers(v.services, p);
  const res = await handlers['vault_describe_handle']({ handle: 'cred://hosts/nope/none' });
  assert.equal(res.isError, true);
  assert.equal(res.structuredContent.code, 'unknown_handle');
});
