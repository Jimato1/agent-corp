/*
 * Transitive, raise-only provenance taint over the wikilink graph (PLAN §2.2c / ARCH §12). Effective
 * taint = own ∨ ⋁ effective(linked). The Board's auto-approve lane consumes EFFECTIVE, so a note that
 * links host-originated grounding is itself effectively host-originated.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeService, principal } from './helpers/harness.js';

const P = principal('ag:tester', ['notes:append']);

test('A links B(host_originated) ⇒ A.effective = host_originated, tainted_via = [B]', async () => {
  const { service, db } = await makeService();
  const B = await service.createNote({ type: 'research', title: 'Host alert grounding B', provenance: 'host_originated', op_id: 'tt-b', principal: P });
  const A = await service.createNote({ type: 'research', title: 'Clean analysis A', provenance: 'agent', op_id: 'tt-a', principal: P });

  // Before the link, A is clean.
  let ta = service.taint(A.note_id);
  assert.equal(ta.own, 'clean');
  assert.equal(ta.effective, 'clean');

  await service.linkNotes({ from_id: A.note_id, to_id: B.note_id, op_id: 'tt-link', principal: P });

  ta = service.taint(A.note_id);
  assert.equal(ta.own, 'clean', 'own taint is unchanged (A itself is clean)');
  assert.equal(ta.effective, 'host_originated', 'effective taint rises through the link');
  assert.deepEqual(ta.tainted_via, [B.note_id]);

  // B itself owns the taint.
  assert.equal(service.taint(B.note_id).own, 'host_originated');
  db.close();
});

test('taint is transitive: X → Y(clean) → Z(host_originated) taints X', async () => {
  const { service, db } = await makeService();
  const Z = await service.createNote({ type: 'research', title: 'Deep host source Z', provenance: 'host_originated', op_id: 'tt-z', principal: P });
  const Y = await service.createNote({ type: 'research', title: 'Middle clean Y', provenance: 'agent', op_id: 'tt-y', principal: P });
  const X = await service.createNote({ type: 'research', title: 'Top clean X', provenance: 'agent', op_id: 'tt-x', principal: P });
  await service.linkNotes({ from_id: Y.note_id, to_id: Z.note_id, op_id: 'tt-yz', principal: P });
  await service.linkNotes({ from_id: X.note_id, to_id: Y.note_id, op_id: 'tt-xy', principal: P });

  const tx = service.taint(X.note_id);
  assert.equal(tx.own, 'clean');
  assert.equal(tx.effective, 'host_originated', 'taint propagates across two hops');
  assert.deepEqual(tx.tainted_via, [Z.note_id], 'only the actual raiser (Z) is reported');
  db.close();
});
