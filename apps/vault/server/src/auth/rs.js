/*
 * auth/rs.js — OAuth 2.1 Resource Server baseline (auth-apps-tokens-scopes.md §1) + the §8-PIN holder
 * validation the redeem pipeline runs VERBATIM (PLAN §4.1 steps 1–6).
 *
 * Local JWKS validation (poll <=30s + on unknown kid); iss per RFC 9207; aud == vault EXACTLY (single-
 * valued, multi-valued rejected); principal derived ONLY from the validated token (never a forwarded
 * header — auth §8.6 Rule 3). The near-empty MCP surface (vault:reference) and the operator UI
 * (vault:manage, human-kind-gated) both use requireScope(); the creds redeem endpoint uses
 * validateHolderRedeem() which additionally pins sub == svc:gateway and REQUIRES the cnf proof.
 *
 * Design principle (PLAN §6): the redeeming caller may be a weak/hostile model. Every check REJECTS IN
 * CODE with a precise, machine-only deny reason — never trust the caller to self-police, never downgrade.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { AuthError, RedeemError } from '../errors.js';
import { SCOPES, SCOPES_SUPPORTED, HOLDER_ALLOWED_KINDS, KIND, GATEWAY_SUB, REDEEM } from '../constants.js';

function inferKind(sub) {
  const s = String(sub || '');
  if (s.startsWith('svc:')) return KIND.SERVICE;
  if (s.startsWith('agent:')) return KIND.AGENT;
  if (s.startsWith('op:') || s.startsWith('operator:')) return KIND.HUMAN;
  return KIND.HUMAN;
}

export class ResourceServer {
  constructor({ jwks } = {}) {
    this.jwks = jwks
      || (config.devUnsafeNoAuth
        ? null
        : createRemoteJWKSet(new URL(config.authJwksUrl), {
            cooldownDuration: config.jwksPollSeconds * 1000,
            cacheMaxAge: config.jwksPollSeconds * 1000,
          }));
  }

  metadata() {
    return {
      resource: `https://${config.selfAudience}`,
      authorization_servers: [config.authIssuer],
      scopes_supported: SCOPES_SUPPORTED,
      bearer_methods_supported: ['header'],
    };
  }

  #challenge(error, hint) {
    const meta = `${config.authIssuer}/.well-known/oauth-protected-resource`;
    let v = `Bearer resource_metadata="${meta}", error="${error}"`;
    if (hint) v += `, error_description="${hint}"`;
    return { 'WWW-Authenticate': v };
  }

  /** Signature + iss + exp/nbf (<=60s skew). Returns raw claims. Throws AuthError(invalid_token). */
  async #verifySig(token) {
    if (config.devUnsafeNoAuth) return null;
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: config.authIssuer,
      clockTolerance: 60, // <=60s skew (§8 step 3)
    });
    return payload;
  }

  /** Full RS verify for the edge surfaces (MCP + manage). aud==vault single-valued; sub present. */
  async verify(token) {
    if (config.devUnsafeNoAuth) return null;
    let claims;
    try {
      claims = await this.#verifySig(token);
    } catch (e) {
      throw new AuthError(401, 'invalid_token', String(e.message || e), this.#challenge('invalid_token'));
    }
    const aud = claims.aud;
    if (Array.isArray(aud) ? (aud.length !== 1 || aud[0] !== config.selfAudience) : aud !== config.selfAudience)
      throw new AuthError(401, 'invalid_token', 'aud must equal vault, single-valued', this.#challenge('invalid_token'));
    if (!claims.sub) throw new AuthError(401, 'invalid_token', 'missing sub', this.#challenge('invalid_token'));
    return claims;
  }

  async #authenticate(req) {
    if (config.devUnsafeNoAuth) {
      const sub = req.headers['x-dev-sub'] || 'op:dev';
      const scopes = String(req.headers['x-dev-scopes'] || 'vault:manage').split(/\s+/).filter(Boolean);
      const kind = req.headers['x-dev-kind'] || inferKind(sub);
      return { sub, display: sub, scopes, kind };
    }
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) throw new AuthError(401, 'missing_token', 'bearer token required', this.#challenge('missing_token'));
    const claims = await this.verify(m[1]);
    const scopes = String(claims.scope || '').split(/\s+/).filter(Boolean);
    const kind = claims.kind || claims.principal_kind || inferKind(claims.sub);
    return { sub: claims.sub, display: claims.name || claims.sub, scopes, kind, jti: claims.jti, exp: claims.exp };
  }

  authOnly() {
    return async (req, res, next) => {
      try { req.principal = await this.#authenticate(req); next(); }
      catch (e) { this.#sendAuthError(res, e); }
    };
  }

  /** Scope + holder-kind gate (defense-in-depth). vault:manage is human-only; vault:reference agents+op. */
  requireScope(scope) {
    return async (req, res, next) => {
      try {
        const principal = await this.#authenticate(req);
        if (!principal.scopes.includes(scope))
          throw new AuthError(403, 'insufficient_scope', `requires ${scope}`, { 'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${scope}"` });
        const kinds = HOLDER_ALLOWED_KINDS[scope];
        if (kinds && !kinds.has(principal.kind))
          throw new AuthError(403, 'insufficient_scope', `scope ${scope} not permitted for kind=${principal.kind}`, { 'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${scope}"` });
        req.principal = principal;
        next();
      } catch (e) { this.#sendAuthError(res, e); }
    };
  }

  #sendAuthError(res, e) {
    if (e instanceof AuthError) {
      for (const [k, v] of Object.entries(e.headers || {})) res.setHeader(k, v);
      return res.status(e.httpStatus).json({ error: e.code, message: e.message });
    }
    return res.status(500).json({ error: 'internal', message: 'auth failure' });
  }

  /**
   * THE redeem holder validation — PLAN §4.1 steps 1–6, auth §8 steps 1–6 VERBATIM. Throws a typed
   * RedeemError (never a generic error) so the pipeline emits the precise, machine-only deny reason.
   *
   *  1. kid ∈ served JWKS + signature (createRemoteJWKSet enforces the kid + refetch-on-unknown-kid)
   *  2. iss equality (RFC 9207)     3. exp/nbf <=60s skew        4. aud == vault, single-valued
   *  5. scope ∋ vault:read-credential   6. sub == svc:gateway    6a. cnf proof verified (mTLS x5t#S256)
   *
   * @param token  the bearer at+jwt
   * @param channelThumbprint  the SHA-256 (base64url) of the Gateway's creds-client cert from THIS mTLS
   *        hop — the value cnf.x5t#S256 must equal (§4.5). Null only in devUnsafe.
   * @returns validated { sub, scopes, jti, exp, kid, cnf }
   */
  async validateHolderRedeem(token, { channelThumbprint } = {}) {
    if (config.devUnsafeNoAuth) {
      // Test/dev: derive the "validated" principal from headers-substituted claims the harness injects.
      // Still enforces the shape checks below against the injected claims so reject-path tests are real.
      const claims = token; // in devUnsafe the caller passes a claims object directly (test harness)
      return this.#applyHolderChecks(claims, channelThumbprint, { dev: true });
    }
    let claims;
    try {
      claims = await this.#verifySig(token); // steps 1–3 (kid/sig/iss/exp)
    } catch {
      throw new RedeemError(REDEEM.INVALID_TOKEN); // 401 — re-mint
    }
    return this.#applyHolderChecks(claims, channelThumbprint, { dev: false });
  }

  #applyHolderChecks(claims, channelThumbprint, { dev }) {
    if (!claims || typeof claims !== 'object') throw new RedeemError(REDEEM.INVALID_TOKEN);
    // step 4 — aud == vault, single-valued (multi-valued = reject)
    const aud = claims.aud;
    const audOk = Array.isArray(aud) ? aud.length === 1 && aud[0] === config.selfAudience : aud === config.selfAudience;
    if (!audOk) throw new RedeemError(REDEEM.INVALID_TOKEN);
    // step 5 — scope ∋ vault:read-credential (audience↔holder binding already holds: aud==vault)
    const scopes = String(claims.scope || '').split(/\s+/).filter(Boolean);
    if (!scopes.includes(SCOPES.READ_CREDENTIAL)) throw new RedeemError(REDEEM.INSUFFICIENT_SCOPE);
    // step 6 — sub == svc:gateway (bound_subject; audience alone is insufficient — agents may carry aud=vault)
    if (claims.sub !== GATEWAY_SUB) throw new RedeemError(REDEEM.NOT_GATEWAY);
    // step 6a — cnf proof MANDATORY (no proof, no validity, never downgrade). mTLS x5t#S256 on this hop.
    const cnf = claims.cnf;
    if (!cnf || typeof cnf !== 'object') throw new RedeemError(REDEEM.INVALID_TOKEN);
    const boundThumb = cnf['x5t#S256'];
    if (!boundThumb) {
      // A DPoP-only (jkt) token cannot be proven on the mTLS creds hop without a DPoP proof header seam.
      // v1 binds mTLS (§4.5); reject anything we cannot verify here rather than downgrade.
      throw new RedeemError(REDEEM.INVALID_TOKEN);
    }
    if (!dev) {
      if (!channelThumbprint || boundThumb !== channelThumbprint) throw new RedeemError(REDEEM.INVALID_TOKEN);
    }
    return { sub: claims.sub, scopes, jti: claims.jti, exp: claims.exp, kid: claims.kid, cnf };
  }
}
