/*
 * auth/budget.js — per-`sub` budget middleware (auth §1; DEPLOYMENT §3 — RSes never open auth's Redis;
 * shared dimensions reached via auth's budget-check/admission API). Always-available in-process
 * concurrency ceiling + the shared-dimension check.
 *
 * PLAN §9 / M-11: the creds surface (/redeem, /releases/revoke) carries at minimum the Redis-independent
 * in-process CONCURRENCY CEILING (destructive-exec "often 1"; here 1–2 in-flight per sub) so a looping/
 * compromised Gateway cannot amplify against auth's introspect, the Board, or the fail-closed WORM chain.
 * The MCP + manage surfaces carry the standard local ceiling.
 */
import { config } from '../config.js';
import { ACTION_CLASS } from '../constants.js';

const FAIL_CLOSED = new Set([ACTION_CLASS.DESTRUCTIVE_EXEC]);

export class BudgetMiddleware {
  constructor({ fetchImpl = globalThis.fetch, ceiling = config.localConcurrencyCeiling } = {}) {
    this.fetch = fetchImpl;
    this.ceiling = ceiling;
    this.inflight = new Map();
  }

  middleware(actionClass = ACTION_CLASS.WRITE_BENIGN) {
    return async (req, res, next) => {
      const sub = req.principal?.sub || 'anonymous';
      const cur = this.inflight.get(sub) || 0;
      if (cur >= this.ceiling) return res.status(429).json({ code: 'budget', message: 'per-principal concurrency ceiling', retry: 'budget' });
      this.inflight.set(sub, cur + 1);
      res.on('finish', () => {
        const n = (this.inflight.get(sub) || 1) - 1;
        if (n <= 0) this.inflight.delete(sub); else this.inflight.set(sub, n);
      });
      if (config.devUnsafeNoAuth) return next();
      try {
        const r = await this.fetch(config.authBudgetApiUrl, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sub, action_class: actionClass }), signal: AbortSignal.timeout(config.clientTimeoutMs),
        });
        if (r && r.status === 429) return res.status(429).json({ code: 'budget', message: 'shared budget exhausted', retry: 'budget' });
      } catch {
        if (FAIL_CLOSED.has(actionClass)) return res.status(503).json({ code: 'budget_unavailable', message: 'destructive-exec class fails closed when budget API unreachable', retry: 'later' });
        /* benign/read: allow-with-local-bounds */
      }
      next();
    };
  }
}
