/**
 * Budget middleware + the destructive-route step-up gate.
 *
 * Transport resolved by DEPLOYMENT §3 (S5, root REVIEW #2): RSes NEVER open auth's Redis;
 * per-sub budget dimensions are reached via an auth-exposed budget-check API. Each RS keeps a
 * Redis-independent in-process concurrency ceiling as its always-available local bound.
 * auth/budget-API unreachable ⇒ benign = allow-but-locally-bounded; sod/destructive = 503
 * fail-closed (auth §6, §1). Drive's only destructive route is GC purge.
 */
import type { Config } from '../config.js';
import { DriveError } from '../lib/errors.js';
import type { Principal } from '../lib/principal.js';

export type ActionClass = 'read' | 'write-benign' | 'destructive';

/** Always-available local concurrency ceiling (never depends on Redis/auth). */
export class ConcurrencyCeiling {
  private inflight = 0;
  constructor(private readonly max: number) {}
  acquire(): void {
    if (this.inflight >= this.max) throw new DriveError('CONFLICT', 'in-process concurrency ceiling reached');
    this.inflight++;
  }
  release(): void {
    if (this.inflight > 0) this.inflight--;
  }
  get current(): number {
    return this.inflight;
  }
}

export class Budget {
  readonly ceiling: ConcurrencyCeiling;
  constructor(
    private readonly config: Config,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.ceiling = new ConcurrencyCeiling(config.auth.maxInflight);
  }

  /**
   * Per-tool-call budget check keyed by sub. Returns silently on allow; throws 429/503 on refuse.
   * Fail-open for benign classes when the budget API is unreachable; fail-closed for destructive.
   */
  async check(principal: Principal, actionClass: ActionClass): Promise<void> {
    const url = this.config.auth.budgetApiUrl;
    if (!url) {
      // No budget API configured: benign allow-but-locally-bounded; destructive fails closed.
      if (actionClass === 'destructive') {
        throw new DriveError('FORBIDDEN', 'destructive action fails closed: budget/step-up authority unreachable');
      }
      return;
    }
    try {
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sub: principal.sub, aud: this.config.auth.audience, action_class: actionClass }),
        signal: AbortSignal.timeout(250), // auth §2 live-check timeout ~250ms
      });
      if (res.status === 429) throw new DriveError('QUOTA_EXHAUSTED', 'per-principal budget exhausted');
      if (!res.ok && actionClass === 'destructive') throw new DriveError('FORBIDDEN', 'destructive budget check refused');
      // benign non-2xx (other than 429) ⇒ allow-but-locally-bounded (do not spuriously refuse reads).
    } catch (e) {
      if (e instanceof DriveError) throw e;
      // Network/timeout: benign allow, destructive fail-closed.
      if (actionClass === 'destructive') throw new DriveError('FORBIDDEN', 'destructive action fails closed: budget API unreachable');
    }
  }

  /**
   * Tier-2 live step-up re-check for the GC route (auth §8 step 7 / PLAN §7). The forwarded
   * X-Auth-Identity header is NEVER the step-up evidence — this is an uncached live call to auth.
   * Fails CLOSED (503/403) on any doubt, incl. a stale kill epoch or unreachable auth.
   */
  async requireStepUp(principal: Principal): Promise<void> {
    if (principal.kind !== 'human') {
      throw new DriveError('FORBIDDEN', 'GC purge is human-operator-only');
    }
    const base = this.config.auth.budgetApiUrl;
    if (!base) {
      // Cannot confirm step-up ⇒ fail closed (the one Drive route that does).
      throw new DriveError('FORBIDDEN', 'step-up cannot be confirmed (auth unreachable) — purge refused, fails closed');
    }
    const stepUpUrl = base.replace(/\/budget\/check$/, '/introspect');
    try {
      const res = await this.fetchImpl(stepUpUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sub: principal.sub, purpose: 'drive:gc_purge', require_fresh_auth: true }),
        signal: AbortSignal.timeout(250),
      });
      if (!res.ok) throw new DriveError('FORBIDDEN', 'step-up refused');
      const body = (await res.json()) as { active?: boolean; fresh?: boolean; kill_level?: number };
      if (body.active === false || body.fresh === false) throw new DriveError('FORBIDDEN', 'step-up not fresh — purge refused');
      if (typeof body.kill_level === 'number' && body.kill_level > 0) {
        throw new DriveError('FORBIDDEN', 'kill epoch engaged — destructive paths refused suite-wide');
      }
    } catch (e) {
      if (e instanceof DriveError) throw e;
      throw new DriveError('FORBIDDEN', 'step-up check failed closed (auth unreachable)');
    }
  }
}
