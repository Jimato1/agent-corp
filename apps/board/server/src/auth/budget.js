/*
 * auth/budget.js — per-`sub` budget middleware (auth §1; DEPLOYMENT §3 — RSes never open auth's Redis;
 * shared dimensions reached via auth's budget-check/admission API). Always-available in-process
 * concurrency ceiling + the shared-dimension check.
 *
 * The Board DOES register sod-critical/destructive classes (grant, consume). For those, budget-API
 * unreachable => 503 FAIL-CLOSED (auth §6). For benign/read classes => allow-with-local-bounds.
 */
import { config } from '../config.js';
import { ACTION_CLASS } from '../constants.js';

const FAIL_CLOSED = new Set([ACTION_CLASS.SOD_CRITICAL]);

export class BudgetMiddleware {
  constructor({ fetchImpl = globalThis.fetch } = {}) {
    this.fetch = fetchImpl;
    this.inflight = new Map();
  }

  middleware(actionClass = ACTION_CLASS.WRITE_BENIGN) {
    return async (req, res, next) => {
      const sub = req.principal?.sub || 'anonymous';
      const cur = this.inflight.get(sub) || 0;
      if (cur >= config.localConcurrencyCeiling) return res.status(429).json({ error: 'budget', message: 'per-principal concurrency ceiling' });
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
        if (r && r.status === 429) return res.status(429).json({ error: 'budget', message: 'shared budget exhausted' });
      } catch {
        if (FAIL_CLOSED.has(actionClass)) return res.status(503).json({ error: 'budget_unavailable', message: 'sod-critical class fails closed when budget API unreachable' });
        /* benign/read: allow-with-local-bounds */
      }
      next();
    };
  }
}
