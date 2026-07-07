/*
 * CORR-3 — spec ceremony vocabulary ONLY. The Stage-1 invented set (drafting/cross-talk/converged/
 * escalated) is dead. append_note with a non-spec display_phase is a VALIDATION business error; each
 * of the seven spec phases is accepted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ERR, CEREMONY_PHASES } from '../src/constants.js';
import { makeService, principal } from './helpers/harness.js';

const P = principal('ag:tester', ['notes:append']);

test('a non-spec display_phase → VALIDATION (invented vocabulary is dead)', async () => {
  const { service, db } = await makeService();
  const created = await service.createNote({ type: 'research', title: 'phase probe', op_id: 'sp-1', principal: P });
  for (const dead of ['drafting', 'cross-talk', 'converged', 'escalated']) {
    await assert.rejects(
      service.appendNote({ note_id: created.note_id, section: 'Findings', content: 'x', display_phase: dead, op_id: `sp-bad-${dead}`, principal: P }),
      (e) => {
        assert.equal(e.code, ERR.VALIDATION);
        return true;
      },
    );
  }
  db.close();
});

test('every spec ceremony phase is accepted as a display_phase', async () => {
  const { service, db } = await makeService();
  const created = await service.createNote({ type: 'research', title: 'phase ok', op_id: 'sp-ok-0', principal: P });
  let i = 0;
  for (const phase of CEREMONY_PHASES) {
    const r = await service.appendNote({ note_id: created.note_id, section: 'Findings', content: `note ${phase}`, display_phase: phase, op_id: `sp-ok-${++i}`, principal: P });
    assert.equal(r.ok, true);
  }
  assert.deepEqual(CEREMONY_PHASES, ['triage', 'recon', 'planning', 'adversarial_review', 'backlog', 'execute', 'retro']);
  db.close();
});
