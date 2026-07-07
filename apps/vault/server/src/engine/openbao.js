/*
 * engine/openbao.js — the OpenBao engine client. This is LAYER 2 of the two independent enforcement
 * layers (PLAN §2.1): the wrapper performs the credential read/sign using the GATEWAY'S OWN presented
 * JWT — not a wrapper-owned credential — so the engine independently re-validates iss/aud/sub/scope/exp
 * against auth's JWKS before any credential path is readable. A wrapper bug alone cannot leak plaintext.
 *
 * Per redemption, in order:
 *   1. POST auth/jwt/login (role `gateway-redeemer`) presenting the Gateway's at+jwt → a login token
 *      (num_uses=2, ttl 90s, policy `redeem-login`). jti single-use is enforced HERE (B-1): a captured
 *      Gateway JWT cannot mint multiple redeem child tokens within its exp window.
 *   2. Mint ONE per-host child token templated to EXACTLY `read kv/data/hosts/<host_id>/*` OR
 *      `update ssh/sign/gateway-<host_id>` (never both), with num_uses=1 and the 90s TTL outer bound.
 *      <host_id> is the D-4-VERIFIED request host — never anything the token carries.
 *   3. With the child token: KV read OR SSH sign (ephemeral per-run public key in; server-derived
 *      non-empty valid_principals; key_id=<ticket_id>; release-scoped TTL). OpenBao re-verifies the JWT.
 *
 * CANNOT-VERIFY-IN-SANDBOX: real seal/unseal, mTLS to the engine, and the JWT round-trip need a live
 * OpenBao 2.5.x on the data_vault network with the bootstrap config applied. Tests inject a FakeEngine
 * implementing redeem() with the same contract. Every failure is classified: `denied` (terminal — the
 * two layers disagreed, always anomalous → escalate) vs `sealed`/`unavailable` (retryable 503).
 */
import { config } from '../config.js';
import { HANDLE_KIND } from '../constants.js';

export class EngineError extends Error {
  constructor(kind, message) { super(message || kind); this.name = 'EngineError'; this.kind = kind; } // 'denied' | 'sealed' | 'unavailable'
}

/** jti single-use guard on auth/jwt/login (B-1). A presented Gateway JWT logs in at most once per exp. */
class JtiGuard {
  constructor(clock) { this.clock = clock || { now: () => Date.now() }; this.seen = new Map(); }
  check(jti, exp) {
    if (!jti) return; // no jti => cannot single-use guard; caller's token validation already required the pin
    const now = this.clock.now();
    // prune
    for (const [k, e] of this.seen) if (e * 1000 < now) this.seen.delete(k);
    if (this.seen.has(jti)) throw new EngineError('denied', 'jti replay on auth/jwt/login');
    this.seen.set(jti, exp || Math.floor(now / 1000) + 120);
  }
}

export class OpenBaoEngine {
  constructor({ clock, dispatcher } = {}) {
    this.jti = new JtiGuard(clock);
    this.dispatcher = dispatcher; // undici Agent carrying the wrapper's mTLS client cert (built at boot)
  }

  async #call(path, { method = 'GET', token, body } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers['X-Vault-Token'] = token;
    let r;
    try {
      r = await fetch(`${config.openbaoAddr}${path}`, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
        dispatcher: this.dispatcher, signal: AbortSignal.timeout(2000),
      });
    } catch (e) {
      throw new EngineError('unavailable', `engine fetch failed: ${String(e.message || e)}`);
    }
    if (r.status === 503) throw new EngineError('sealed', 'engine sealed/standby (503)');
    if (r.status === 403 || r.status === 400) throw new EngineError('denied', `engine rejected (${r.status})`);
    if (!r.ok) throw new EngineError('unavailable', `engine ${r.status}`);
    return r.json();
  }

  /**
   * @param req { gatewayJwt, jti, exp, kind, hostId, kvPath|signRole, sshPublicKey, ticketId, principals, ttl }
   * @returns { kind, plaintext?|signed_cert?, metadata, engineRequestId }
   */
  async redeem(req) {
    this.jti.check(req.jti, req.exp);

    // 1. Login with the Gateway's own JWT (layer-2 independence).
    const login = await this.#call('/v1/auth/jwt/login', {
      method: 'POST', body: { role: 'gateway-redeemer', jwt: req.gatewayJwt },
    });
    const loginToken = login?.auth?.client_token;
    if (!loginToken) throw new EngineError('denied', 'no login token');

    // 2. Mint ONE per-host child token templated to exactly the one capability this handle needs.
    const policyName = req.kind === HANDLE_KIND.SSH_CA ? `child-ssh-${req.hostId}` : `child-kv-${req.hostId}`;
    const child = await this.#call('/v1/auth/token/create', {
      method: 'POST', token: loginToken,
      body: { policies: [policyName], num_uses: 1, ttl: '90s', no_default_policy: true, renewable: false },
    });
    const childToken = child?.auth?.client_token;
    if (!childToken) throw new EngineError('denied', 'no child token');

    // 3. The single read or single sign, bounded by <host_id> (num_uses=1, TTL outer bound).
    if (req.kind === HANDLE_KIND.SSH_CA) {
      const out = await this.#call(`/v1/ssh/sign/gateway-${req.hostId}`, {
        method: 'POST', token: childToken,
        body: {
          public_key: req.sshPublicKey,        // ephemeral per-run; never stored
          valid_principals: req.principals,     // server-derived, non-empty (never free request input)
          key_id: req.ticketId,                 // host auth-log correlation (contract §2)
          ttl: req.ttl || config.sshCertTtl,
        },
      });
      return { kind: HANDLE_KIND.SSH_CA, signed_cert: out?.data?.signed_key, metadata: { ttl: req.ttl || config.sshCertTtl, valid_principals: req.principals, key_id: req.ticketId }, engineRequestId: out?.request_id };
    }
    // KV read.
    const out = await this.#call(`/v1/${req.kvPath}`, { token: childToken });
    const value = out?.data?.data; // KV v2 nesting
    if (value == null) throw new EngineError('denied', 'kv path empty/denied');
    return { kind: HANDLE_KIND.KV, plaintext: value, metadata: {}, engineRequestId: out?.request_id };
  }

  /** Seal-state probe for the status surface (§8.2). null => CANNOT CONFIRM (rendered halt-gold, never green). */
  async sealStatus() {
    try {
      const j = await this.#call('/v1/sys/seal-status');
      return { sealed: !!j.sealed, unsealed: !j.sealed, raw: j };
    } catch (e) {
      return null; // unknown — the caller renders "CANNOT CONFIRM", never a fabricated green
    }
  }
}
