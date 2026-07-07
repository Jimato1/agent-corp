/*
 * auth/budget.js — shared per-`sub` budget middleware (auth §1 / PLAN §8).
 *
 * Four dimensions keyed by `sub` in the shared budget surface + a Redis-independent in-process
 * concurrency ceiling. Notes registers NO sod-critical/destructive classes, so the whole surface
 * is benign: budget-API unreachable ⇒ ALLOW-WITH-LOCAL-BOUNDS (never fail-closed here — there is no
 * fail-closed class in Notes). DEPLOYMENT §3: RSes never open auth's Redis; they reach shared
 * dimensions via auth's budget-check/admission API. This module binds behind a seam that can point
 * at either transport (auth §11.1 parked resolution) — default is the admission API.
 */
import { config } from '../config.js';

export class BudgetMiddleware {
  constructor({ fetchImpl = globalThis.fetch } = {}) {
    this.fetch = fetchImpl;
    this.inflight = new Map(); // sub → count (always-available local ceiling)
  }

  middleware() {
    return async (req, res, next) => {
      const sub = req.principal?.sub || 'anonymous';
      const cur = this.inflight.get(sub) || 0;
      if (cur >= config.localConcurrencyCeiling) {
        return res.status(429).json({ error: 'budget', message: 'per-principal concurrency ceiling' });
      }
      this.inflight.set(sub, cur + 1);
      res.on('finish', () => {
        const n = (this.inflight.get(sub) || 1) - 1;
        if (n <= 0) this.inflight.delete(sub);
        else this.inflight.set(sub, n);
      });

      // Advisory shared-dimension check. Unreachable ⇒ benign allow (Notes has no fail-closed class).
      try {
        const r = await this.fetch(config.authBudgetApiUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sub, action_class: 'write-benign' }),
          signal: AbortSignal.timeout(config.boardReadTimeoutMs),
        });
        if (r && r.status === 429) return res.status(429).json({ error: 'budget', message: 'shared budget exhausted' });
      } catch {
        /* allow-with-local-bounds — benign class, never fail-closed */
      }
      next();
    };
  }
}
