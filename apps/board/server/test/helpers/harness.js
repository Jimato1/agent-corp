/*
 * harness.js — test wiring for the Board core.
 *
 * CRITICAL ORDERING: config.js reads process.env at module-eval (a process singleton). This harness
 * sets every BOARD_ env var at its OWN top level (importing only node builtins) and DEFERS every
 * config-consuming module to DYNAMIC import inside makeBoard(). Time is a fakeClock so lease/timebox
 * sweeps advance deterministically. Upstreams (Notes/CMDB/Chat) are deterministic fakes.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'board-test-'));
process.env.BOARD_DEV_UNSAFE_NO_AUTH = 'true';
process.env.BOARD_DB_PATH = path.join(tmpRoot, 'board.db');
process.env.BOARD_BACKUP_DIR = path.join(tmpRoot, 'backups');
process.env.BOARD_DISABLE_SWEEPS = 'true';
process.env.NODE_ENV = 'test';
process.env.BOARD_LOG_LEVEL = process.env.BOARD_LOG_LEVEL || 'error';

export const paths = { tmpRoot };

// A plan-slice note body carrying the fenced board-allowlist block the grant/propose path parses.
export function planNote(invocations = [{ playbook_key: 'nginx.upgrade', params: { version: '1.27' }, host_id: 'web-prod-02' }]) {
  return '# Plan\n\n```board-allowlist\n' + JSON.stringify(invocations, null, 2) + '\n```\n';
}

export function fakeClients({ noteBytes = planNote(), effectiveTaint = false, playbookClass = 'standard', tier = 'low', verdict = { approval_mode: 'auto', in_window: true, decision_id: 'cmdb-dec-1' }, registry = { reversible: true, rollback_path: true, verifier_present: true, known_runbook: true }, agentHost = null } = {}) {
  const chat = { posts: [], postEscalation: async (p) => { chat.posts.push(p); } };
  return {
    notes: {
      getRevisionBytes: async (_id, rev) => ({ bytes: typeof noteBytes === 'function' ? noteBytes() : noteBytes, rev: rev ?? 'r1' }),
      getEffectiveTaint: async () => ({ effective: effectiveTaint, sources: [] }),
    },
    cmdb: {
      taskTypeRegistry: async () => registry,
      hostTier: async () => ({ tier }),
      playbookClass: async () => ({ action_class: playbookClass }),
      verdict: async () => verdict,
      agentToHost: async () => agentHost,
    },
    chat,
  };
}

export async function makeBoard({ clients, clockStart = 1_700_000_000_000, config: cfgOverride } = {}) {
  const { config } = await import('../../src/config.js');
  const { openDb } = await import('../../src/db/schema.js');
  const { BoardService } = await import('../../src/board-service.js');
  const { fakeClock } = await import('../../src/clock.js');
  if (cfgOverride) Object.assign(config, cfgOverride);
  const db = openDb(config.dbPath + '.' + Math.random().toString(36).slice(2)); // fresh DB per makeBoard
  const clock = fakeClock(clockStart);
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  const board = new BoardService({ db, clock, config, emitter, clients: clients || fakeClients(), logger: silentLog() });
  return { board, db, clock, emitter, config };
}

export function principal(sub, scopes, kind) {
  const k = kind || (sub.startsWith('svc:') ? 'service' : sub.startsWith('agent:') ? 'agent' : 'human');
  return { sub, display: sub, kind: k, scopes: scopes || ['board:read', 'board:claim', 'board:propose', 'board:update', 'board:run-ceremony'] };
}

function silentLog() {
  const noop = () => {};
  return { debug: noop, info: noop, warn: noop, error: noop };
}
