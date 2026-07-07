/*
 * auth/introspect.js — the destructive-exec LIVE revocation check (PLAN §4.1 step 7; auth §8 step 7).
 *
 * "destructive-exec (gateway:execute, Vault redeem) → pushed denylist AND uncached POST /introspect
 *  (RFC 7662; auth answers active:false on any doubt, including its own Redis loss). ~250ms timeout →
 *  DENY." Kill level >= G1 arrives via this channel and via the JWKS-epoch — either denies.
 *
 * Two independent bites, both fail-closed IN CODE:
 *   (a) pushed denylist (jti/sub/kid/kill-level) — a short-poll mirror; a hit → 403 revoked.
 *   (b) uncached introspect — never cached, ~250ms budget; active:false → 403 revoked; timeout/error → 503.
 * Everything injectable so tests substitute deterministic fakes; NEVER trusts the caller.
 */
import { config } from '../config.js';
import { RedeemError } from '../errors.js';
import { REDEEM } from '../constants.js';

export class RevocationChecker {
  constructor({ fetchImpl = globalThis.fetch, clock } = {}) {
    this.fetch = fetchImpl;
    this.clock = clock;
    // pushed-denylist mirror (auth is authoritative; this is the fast local bite). Settable by tests.
    this.denied_jti = new Set();
    this.denied_sub = new Set();
    this.killLevel = 'G0';
    this.epoch = 0;
    this._timer = null;
  }

  setDenylist({ denied_jti = [], denied_sub = [], kill_level = 'G0', epoch = 0 } = {}) {
    this.denied_jti = new Set(denied_jti);
    this.denied_sub = new Set(denied_sub);
    this.killLevel = kill_level;
    this.epoch = Math.max(this.epoch, epoch); // monotonic — a stale epoch never un-does a higher one
  }

  startPolling() {
    if (config.devUnsafeNoAuth || !config.authRevocationsUrl || config.disableSweeps) return;
    const poll = async () => {
      try {
        const r = await this.fetch(config.authRevocationsUrl, { signal: AbortSignal.timeout(config.clientTimeoutMs) });
        if (r && r.ok) this.setDenylist(await r.json());
      } catch { /* keep last-known; introspect (b) is the authoritative bite regardless */ }
    };
    poll();
    this._timer = setInterval(poll, Math.min(config.jwksPollSeconds, 30) * 1000);
    if (this._timer.unref) this._timer.unref();
  }
  stop() { if (this._timer) clearInterval(this._timer); }

  /**
   * The step-7 live check. Returns the revocation_check_ts (epoch ms) used by the step-12 drift bound.
   * Throws RedeemError(REVOKED) or RedeemError(AUTH_UNREACHABLE) — both fail-closed, in code.
   */
  async liveCheckRedeem({ token, jti, sub }) {
    // (a) pushed denylist — cheap local bite. Kill >= G1 denies (terminal — the Gateway's OWN kill channel
    //     governs retry; a Vault 403 is never how the Gateway learns kill — G-7).
    if (this.killLevel && this.killLevel !== 'G0') throw new RedeemError(REDEEM.REVOKED, { kill: this.killLevel });
    if (jti && this.denied_jti.has(jti)) throw new RedeemError(REDEEM.REVOKED, { by: 'jti' });
    if (sub && this.denied_sub.has(sub)) throw new RedeemError(REDEEM.REVOKED, { by: 'sub' });

    // (b) uncached introspect — never skipped, never cached. ~250ms timeout → DENY (503 fail-closed).
    if (config.devUnsafeNoAuth) return this.clock ? this.clock.now() : Date.now();
    let active = false;
    try {
      const r = await this.fetch(config.authIntrospectUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `token=${encodeURIComponent(token)}&token_type_hint=access_token`,
        signal: AbortSignal.timeout(config.clientTimeoutMs),
      });
      if (!r || !r.ok) throw new Error(`introspect ${r ? r.status : 'no-response'}`);
      const j = await r.json();
      active = j && j.active === true; // auth answers active:false on ANY doubt (incl its own Redis loss)
    } catch {
      throw new RedeemError(REDEEM.AUTH_UNREACHABLE); // 503 — fail-closed retry-later (bounded backoff)
    }
    if (!active) throw new RedeemError(REDEEM.REVOKED, { by: 'introspect' });
    return this.clock ? this.clock.now() : Date.now();
  }
}
