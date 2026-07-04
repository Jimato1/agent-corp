/**
 * Wires the one shared state (Store) + the RS baseline + budget + Board client. Both surfaces
 * (HTTP + MCP) are constructed from this single context — neither is downstream of the other.
 */
import type { Config } from './config.js';
import { openDb, type DB } from './db/db.js';
import { ensureLayout, layout, type CasLayout } from './storage/cas.js';
import { Store, systemClock, type Clock } from './storage/store.js';
import { Rs, type AuthDeps } from './auth/rs.js';
import { makeIdentityVerifier } from './auth/identity.js';
import { Budget } from './auth/budget.js';
import { BoardClient } from './auth/board.js';

export interface AppContext {
  config: Config;
  db: DB;
  layout: CasLayout;
  store: Store;
  rs: Rs;
  budget: Budget;
  board: BoardClient;
}

export interface ContextDeps {
  clock?: Clock;
  authDeps?: AuthDeps;
  fetchImpl?: typeof fetch;
  boardTokenProvider?: () => Promise<string | null>;
}

export function createContext(config: Config, deps: ContextDeps = {}): AppContext {
  const l = layout(config.dataDir);
  ensureLayout(l);
  const db = openDb(config.dbPath);
  const store = new Store(db, l, config, deps.clock ?? systemClock);
  // Wire the production X-Auth-Identity verifier from config unless a test injected one.
  // Without this the human/browser surface would 401 on every request (the verifier being a
  // dangling config knob). It still fails CLOSED when nothing is configured.
  const authDeps: AuthDeps = { ...(deps.authDeps ?? {}) };
  if (!authDeps.verifyIdentity) {
    const v = makeIdentityVerifier(config);
    if (v) authDeps.verifyIdentity = v;
  }
  const rs = new Rs(config, authDeps);
  const budget = new Budget(config, deps.fetchImpl ?? fetch);
  const board = new BoardClient(config, deps.boardTokenProvider ?? (async () => null), deps.fetchImpl ?? fetch);
  return { config, db, layout: l, store, rs, budget, board };
}

export function closeContext(ctx: AppContext): void {
  ctx.db.close();
}
