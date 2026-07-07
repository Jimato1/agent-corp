/*
 * harness.js — test wiring for the Vault wrapper.
 *
 * CRITICAL ORDERING (mirrors the Board reference kit): config.js reads process.env at module-eval. This
 * harness sets every VAULT_ env var at its OWN top level (importing only node builtins) and DEFERS every
 * config-consuming module to DYNAMIC import inside makeVault(). devUnsafe mode lets us drive the SAME
 * pipeline with injected fakes: the redeem checks are never bypassed, only their inputs are stubbed.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'));
process.env.VAULT_DEV_UNSAFE_NO_AUTH = 'true';
process.env.VAULT_DB_PATH = path.join(tmpRoot, 'vault.db');
process.env.VAULT_DISABLE_SWEEPS = 'true';
process.env.NODE_ENV = 'test';
process.env.VAULT_LOG_LEVEL = process.env.VAULT_LOG_LEVEL || 'error';

export const paths = { tmpRoot };
export const CLOCK_START = 1_700_000_000_000;

/** A configurable fake OpenBao engine implementing the redeem() contract. */
export function fakeEngine({ result, throwKind } = {}) {
  const calls = [];
  return {
    calls,
    async redeem(req) {
      calls.push(req);
      if (throwKind) { const { EngineError } = engineMod; throw new EngineError(throwKind); }
      if (req.kind === 'ssh-ca') return { kind: 'ssh-ca', signed_cert: 'ssh-cert-DATA', metadata: { ttl: '10m', valid_principals: req.principals, key_id: req.ticketId }, engineRequestId: 'ob-req-1' };
      return { kind: 'kv', plaintext: (result ?? { password: 's3cret' }), metadata: {}, engineRequestId: 'ob-req-1' };
    },
    async writeKv() { return { ok: true }; },
    async rotateKv() { return { offbox_acked: true }; },
    async sealStatus() { return { sealed: false, unsealed: true, raw: {} }; },
  };
}
let engineMod;

/** A configurable fake Board facts client. */
export function fakeBoard(overrides = {}) {
  const state = {
    approval: { exists: true, status: 'consumed', consumed_by: 'svc:gateway', ticket_id: 'T-000123', ticket_status: 'executing', host_id: 'nas-01', plan_hash: 'sha256:aa', action_class: 'destructive', consumed_at: CLOCK_START, granted_at: CLOCK_START, run_id: 'R-1' },
    ticket: { exists: true, status: 'executing', claimed_by: 'agent:patcher-07', host_id: 'nas-01' },
    hostLock: { exists: true, resource_id: 'nas-01', lock_generation: 4, claimed_by_ticket: 'T-000123', hold_kind: 'execution', lease_expires_at: CLOCK_START + 600000 },
    unreachable: false,
    ...overrides,
  };
  const guard = async (v) => { if (state.unreachable) { const { BoardUnreachable } = boardMod; throw new BoardUnreachable('board down'); } return v; };
  return {
    state,
    async approval() { return guard(state.approval); },
    async ticket() { return guard(state.ticket); },
    async hostLock() { return guard(state.hostLock); },
  };
}
let boardMod;

/** A configurable fake WORM sink. ackAll=false makes the dual-sink gate fail closed. */
export function fakeWorm({ ackAll = true, head = null } = {}) {
  return { shipped: [], async ship(rec) { this.shipped.push(rec); return ackAll; }, async head() { return head; } };
}

export async function makeVault({ engine, board, worm, chat } = {}) {
  const { config } = await import('../../src/config.js');
  const { openDb } = await import('../../src/db/schema.js');
  const { fakeClock } = await import('../../src/clock.js');
  const { ResourceServer } = await import('../../src/auth/rs.js');
  const { RevocationChecker } = await import('../../src/auth/introspect.js');
  const { buildServices } = await import('../../src/wire.js');
  engineMod = await import('../../src/engine/openbao.js');
  boardMod = await import('../../src/clients/board.js');
  const { log } = await import('../../src/logging.js');

  const db = openDb(config.dbPath + '.' + Math.random().toString(36).slice(2));
  const clock = fakeClock(CLOCK_START);
  const rs = new ResourceServer();
  const revocation = new RevocationChecker({ clock });
  const eng = engine || fakeEngine();
  const brd = board || fakeBoard();
  const wrm = worm || fakeWorm();
  const cht = chat || { posts: [], async postExfilEscalation(p) { this.posts.push(p); return true; } };
  const services = buildServices({ db, rs, revocation, engine: eng, board: brd, worm: wrm, chat: cht, clock, config, logger: log });
  return { services, db, clock, rs, revocation, engine: eng, board: brd, worm: wrm, chat: cht, config };
}

/** Seed a handle projection row directly (bypasses the engine write). */
export function seedHandle(db, { handle = 'cred://hosts/nas-01/admin-login', host_id = 'nas-01', name = 'admin-login', kind = 'kv', openbao_ref, requires_approval_class = 'destructive', ssh_principal = null } = {}) {
  const ref = openbao_ref || (kind === 'ssh-ca' ? `gateway-${host_id}` : `kv/data/hosts/${host_id}/${name}`);
  db.prepare(`INSERT INTO handles (handle, host_id, name, kind, openbao_ref, description, requires_approval_class, recovery, ssh_principal, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(handle, host_id, name, kind, ref, 'seed', requires_approval_class, 'console-only', ssh_principal, new Date(CLOCK_START).toISOString());
  return handle;
}

/** Seed a pending release row directly. */
export function seedRelease(db, { release_id = 'rel-01HX0000000000000000000000', handle = 'cred://hosts/nas-01/admin-login', host_id = 'nas-01', ticket_id = 'T-000123', sub = 'agent:patcher-07', status = 'pending', expires_at = CLOCK_START + 86_400_000 } = {}) {
  db.prepare(`INSERT INTO releases (release_id, handle, host_id, ticket_id, requested_by_sub, request_op_id, status, created_at, expires_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(release_id, handle, host_id, ticket_id, sub, 'reqop', status, new Date(CLOCK_START).toISOString(), expires_at);
  return release_id;
}

/** A valid Gateway holder-claims object (devUnsafe: rs.validateHolderRedeem consumes claims directly). */
export function gatewayClaims(over = {}) {
  return { sub: 'svc:gateway', aud: 'vault', scope: 'vault:read-credential', cnf: { 'x5t#S256': 'THUMB' }, jti: 'jti-1', exp: Math.floor(CLOCK_START / 1000) + 120, ...over };
}

/** A valid redeem ctx + req pair for the happy path. */
export function redeemCtxReq({ claims, req } = {}) {
  const ctx = { channelOk: true, channelCn: 'svc:gateway', channelThumbprint: 'THUMB', token: 'dev', tokenClaims: claims || gatewayClaims() };
  const body = { release_id: 'rel-01HX0000000000000000000000', ticket_id: 'T-000123', approval_id: 'A-000045', host_id: 'nas-01', plan_hash: 'sha256:aa', run_id: 'R-1', op_id: 'op-1', ...req };
  return { ctx, req: body };
}

export function principal(sub = 'op:ada', scopes = ['vault:manage'], kind) {
  const k = kind || (sub.startsWith('svc:') ? 'service' : sub.startsWith('agent:') ? 'agent' : 'human');
  return { sub, display: sub, kind: k, scopes };
}
