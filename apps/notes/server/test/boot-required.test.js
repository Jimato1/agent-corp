/*
 * CORR-5 — a configured git remote is BOOT-REQUIRED. A local-only .git is a build failure, not a
 * style choice (ARCH §10 / PLAN §2.3). This file deliberately does NOT import the harness (which sets
 * the remote); it drives config.assertBootRequirements() directly, using cache-busted imports so each
 * assertion reads a fresh config against the current environment.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('assertBootRequirements REFUSES to boot with no git remote configured', async () => {
  delete process.env.NOTES_GIT_REMOTE_URL;
  const cfg = await import('../src/config.js?case=unset');
  assert.equal(cfg.config.gitRemoteUrl, undefined);
  assert.throws(() => cfg.assertBootRequirements(), /NOTES_GIT_REMOTE_URL|build failure|BOOT FAILURE/);
});

test('assertBootRequirements passes once a remote is configured', async () => {
  process.env.NOTES_GIT_REMOTE_URL = 'https://git.example.com/agent-corp/notes-corpus.git';
  const cfg = await import('../src/config.js?case=set');
  assert.equal(cfg.config.gitRemoteUrl, 'https://git.example.com/agent-corp/notes-corpus.git');
  assert.doesNotThrow(() => cfg.assertBootRequirements());
});
