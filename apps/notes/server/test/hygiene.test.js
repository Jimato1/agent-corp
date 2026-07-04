/*
 * Hygiene deny-scan (PLAN §11.4) — secret-material content is rejected with HYGIENE_REJECT, and the
 * rejection log line NEVER contains the matched content (only pattern class, offsets, salted hash).
 * Otherwise the scan itself would copy the credential into the very logs the Vault contract bans.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ERR } from '../src/constants.js';
import { makeService, principal } from './helpers/harness.js';

const P = principal('ag:tester', ['notes:append']);

test('a private-key block → HYGIENE_REJECT with NO matched content in the log line', async () => {
  const { service, db } = await makeService();

  const SECRET_MARKER = 'ZZTOPSECRETMATERIALZZ';
  const secretBody = [
    'Here is a leaked key I should not be storing:',
    '-----BEGIN PRIVATE KEY-----',
    `MIIEvQIBADANBgkqhkiG9w0BAQEFAASC${SECRET_MARKER}Kg==`,
    '-----END PRIVATE KEY-----',
  ].join('\n');

  // Capture the structured log line the hygiene rejection emits (it writes to stderr at warn).
  const captured = [];
  const origWrite = process.stderr.write;
  process.stderr.write = (chunk, ...rest) => {
    captured.push(String(chunk));
    return true;
  };

  try {
    await assert.rejects(
      service.createNote({ type: 'general', title: 'leaky note', initial_content: secretBody, op_id: 'hy-1', principal: P }),
      (e) => {
        assert.equal(e.code, ERR.HYGIENE_REJECT);
        return true;
      },
    );
  } finally {
    process.stderr.write = origWrite;
  }

  const logs = captured.join('');
  const rejectLine = captured.find((l) => l.includes('hygiene_reject'));
  assert.ok(rejectLine, 'a hygiene_reject line must be emitted');
  // Metadata is present…
  assert.match(rejectLine, /"pattern_class":"private_key_block"/);
  assert.match(rejectLine, /"salted_hash":/);
  // …but the matched content / the secret is NEVER in the logs.
  assert.ok(!logs.includes('BEGIN PRIVATE KEY'), 'matched header must not appear in logs');
  assert.ok(!logs.includes(SECRET_MARKER), 'secret material must not appear in logs');

  db.close();
});
