/*
 * ceremony.test.js — the deliberation layer (PLAN §14; TICKET_STATE_MACHINE §3; D-1/D-2).
 * Locks: deterministic 3-lane triage (Board-fetched signals), ceremony_events as SOLE phase authority,
 * the server-side watchdog (fires regardless of agent activity), grounded-dissent + veto guards.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, fakeClients, principal } from './helpers/harness.js';

const sm = principal('agent:sm', ['board:run-ceremony', 'board:claim', 'board:propose']);
function num(t) { return Number(/^T-(\d+)$/.exec(t.ticket_id)[1]); }
function throwsCode(fn, code) { try { fn(); } catch (e) { assert.equal(e.code, code, `${code}? got ${e.code}: ${e.message}`); return; } assert.fail(`expected ${code}`); }

test('D-2 triage: all-four-hard => straight_to_execute; a critical tier => full', async () => {
  const straight = await makeBoard({ clients: fakeClients({ tier: 'low', registry: { reversible: true, rollback_path: true, verifier_present: true, known_runbook: true } }) });
  const e1 = straight.board.tickets.create({ principal: principal('op:1'), title: 'epic', type: 'package_update', hostId: 'h1', surface: 'http' });
  const r1 = await straight.board.ceremony.triage({ principal: sm, ticketId: num(e1), opId: 'tr1' });
  assert.equal(r1.lane, 'straight_to_execute');

  const crit = await makeBoard({ clients: fakeClients({ tier: 'critical', registry: { reversible: true, rollback_path: true, verifier_present: true, known_runbook: true } }) });
  const e2 = crit.board.tickets.create({ principal: principal('op:1'), title: 'epic', type: 'package_update', hostId: 'h1', surface: 'http' });
  const r2 = await crit.board.ceremony.triage({ principal: sm, ticketId: num(e2), opId: 'tr2' });
  assert.equal(r2.lane, 'full');
});

test('D-2 triage: an unfetchable signal (no type) => full (fail-safe)', async () => {
  const { board } = await makeBoard();
  const e = board.tickets.create({ principal: principal('op:1'), title: 'epic', hostId: 'h1', surface: 'http' }); // no type
  const r = await board.ceremony.triage({ principal: sm, ticketId: num(e), opId: 'tr1' });
  assert.equal(r.lane, 'full');
});

test('ceremony_events is the SOLE phase authority; the ticket column is a rebuildable projection', async () => {
  const { board, db } = await makeBoard({ clients: fakeClients({ tier: 'critical' }) });
  const e = board.tickets.create({ principal: principal('op:1'), title: 'epic', type: 'package_update', hostId: 'h1', surface: 'http' });
  board.claim.claim({ principal: sm, ticketId: num(e), opId: 'c1' });
  await board.ceremony.triage({ principal: sm, ticketId: num(e), opId: 'tr1' });
  board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'recon', opId: 'p1' });
  const events = db.prepare(`SELECT event_kind, to_phase FROM ceremony_events WHERE ticket_id = ? ORDER BY id`).all(num(e));
  assert.ok(events.some((x) => x.event_kind === 'triage_decision'));
  assert.ok(events.some((x) => x.to_phase === 'recon'));
  // The projection column matches the log (rebuildable from it).
  assert.equal(board.getTicket(e.ticket_id).ceremony_phase, 'recon');
});

test('D-1 watchdog: a timebox-expired huddle trips A1 board_escalation regardless of agent activity', async () => {
  const { board, clock } = await makeBoard({ clients: fakeClients({ tier: 'critical' }) });
  const e = board.tickets.create({ principal: principal('op:1'), title: 'epic', type: 'package_update', hostId: 'h1', surface: 'http' });
  board.claim.claim({ principal: sm, ticketId: num(e), opId: 'c1' });
  await board.ceremony.triage({ principal: sm, ticketId: num(e), opId: 'tr1' });
  board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'recon', opId: 'p1' });
  board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'planning', opId: 'p2' }); // opens huddle
  clock.advance(31 * 60 * 1000); // past the 30-min timebox
  const res = board.ceremony.watchdogSweep();
  assert.equal(res.trips, 1);
  const t = board.getTicket(e.ticket_id);
  assert.equal(t.status, 'needs_review');
  assert.equal(t.machine_reason, 'timebox_expired');
});

test('D-1: cross-talk requires independent positions first; dissent must cite a recon note; veto blocks backlog', async () => {
  const { board } = await makeBoard({ clients: fakeClients({ tier: 'critical' }) });
  const e = board.tickets.create({ principal: principal('op:1'), title: 'epic', type: 'package_update', hostId: 'h1', surface: 'http' });
  board.claim.claim({ principal: sm, ticketId: num(e), opId: 'c1' });
  await board.ceremony.triage({ principal: sm, ticketId: num(e), opId: 'tr1' });
  board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'recon', opId: 'p1' });
  // a recon child with a linked note (for grounded dissent)
  const recon = board.tickets.create({ principal: sm, title: 'recon', parentId: num(e), childClass: 'recon', originKind: 'agent', surface: 'mcp' });
  board.db.prepare(`INSERT INTO ticket_notes (ticket_id, note_id, role, linked_at, linked_by) VALUES (?, 'N-recon1', 'recon', 't', 'agent:r')`).run(num(recon));
  board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'planning', opId: 'p2' });

  const po = principal('agent:po'); const ar = principal('agent:ar');
  // cross-talk before positions is rejected
  throwsCode(() => board.ceremony.statement({ principal: ar, ticketId: num(e), kind: 'dissent', noteId: 'N-recon1', opId: 's0' }), 'OUT_OF_ORDER_STATEMENT');
  // independent positions
  board.ceremony.statement({ principal: po, ticketId: num(e), kind: 'position', noteId: 'N-po', opId: 's1' });
  board.ceremony.statement({ principal: ar, ticketId: num(e), kind: 'position', noteId: 'N-ar', opId: 's2' });
  // ungrounded dissent (uncited) rejected; grounded dissent (recon note) accepted
  throwsCode(() => board.ceremony.statement({ principal: ar, ticketId: num(e), kind: 'dissent', noteId: 'N-nope', opId: 's3' }), 'DISSENT_UNGROUNDED');
  board.ceremony.statement({ principal: ar, ticketId: num(e), kind: 'dissent', noteId: 'N-recon1', opId: 's4' });
  board.ceremony.statement({ principal: ar, ticketId: num(e), kind: 'veto', noteId: 'N-recon1', opId: 's5' });
  board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'adversarial_review', opId: 'p3' });
  // veto blocks backlog
  throwsCode(() => board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'backlog', opId: 'p4' }), 'VETO_UNRESOLVED');
  // only the same AR (not the PO) may clear the veto
  throwsCode(() => board.ceremony.statement({ principal: po, ticketId: num(e), kind: 'veto_clear', noteId: 'N-po', opId: 's6' }), 'NOT_ROSTER');
  board.ceremony.statement({ principal: ar, ticketId: num(e), kind: 'veto_clear', noteId: 'N-ar', opId: 's7' });
  // PO decision-of-record, then backlog converges
  board.ceremony.statement({ principal: po, ticketId: num(e), kind: 'decision', noteId: 'N-dec', opId: 's8' });
  const r = board.ceremony.transitionPhase({ principal: sm, ticketId: num(e), toPhase: 'backlog', opId: 'p5' });
  assert.equal(r.phase, 'backlog');
});
