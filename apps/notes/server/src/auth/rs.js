/*
 * auth/rs.js — OAuth 2.1 Resource Server baseline (auth-apps-tokens-scopes.md §1-2, PLAN §8).
 *
 * Binding, verbatim: local JWKS validation (poll ≤30s + on signature failure); iss per RFC 9207;
 * aud == notes EXACTLY (single-valued, no wildcard); coarse scope enforced server-side; RFC 9728
 * protected-resource metadata + WWW-Authenticate on 401; error semantics (401 re-mint / 403
 * insufficient_scope+hint / 429 budget / 503 fail-closed). Principal derived ONLY from the
 * validated token (never an advisory/forwarded header). Notes has NO sod-critical/destructive
 * class, so its live-check degrades benign (allow-with-local-bounds) — never a false-closed.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { AuthError } from '../errors.js';
import { TOOL_SCOPES } from '../constants.js';

export class ResourceServer {
  constructor() {
    // createRemoteJWKSet caches keys and refetches on an unknown kid (the poll + signature-failure
    // channel — auth §1). cooldownDuration bounds refetch storms; ~30s matches the poll bound.
    this.jwks = config.devUnsafeNoAuth
      ? null
      : createRemoteJWKSet(new URL(config.authJwksUrl), {
          cooldownDuration: config.jwksPollSeconds * 1000,
          cacheMaxAge: config.jwksPollSeconds * 1000,
        });
  }

  metadata() {
    // RFC 9728 protected-resource metadata (auth §1).
    return {
      resource: `https://${config.selfAudience}`,
      authorization_servers: [config.authIssuer],
      scopes_supported: ['notes:read', 'notes:search', 'notes:append', 'notes:write'],
      bearer_methods_supported: ['header'],
    };
  }

  /** Verify a bearer token → validated claims (or throw AuthError with WWW-Authenticate). */
  async verify(token) {
    if (config.devUnsafeNoAuth) return null; // handled by middleware in dev-unsafe mode
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: config.authIssuer, // RFC 9207 iss check
        audience: config.selfAudience, // aud == notes exactly
      });
      if (Array.isArray(payload.aud) && payload.aud.length !== 1) {
        throw new AuthError(401, 'invalid_token', 'multi-valued aud rejected', this.#challenge('invalid_token'));
      }
      if (!payload.sub) throw new AuthError(401, 'invalid_token', 'missing sub', this.#challenge('invalid_token'));
      return payload;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError(401, 'invalid_token', String(e.message || e), this.#challenge('invalid_token'));
    }
  }

  #challenge(error, hint) {
    const meta = `${config.authIssuer}/.well-known/oauth-protected-resource`;
    let v = `Bearer resource_metadata="${meta}", error="${error}"`;
    if (hint) v += `, error_description="${hint}"`;
    return { 'WWW-Authenticate': v };
  }

  /**
   * Express middleware factory: authenticate + require `scope`. On success sets req.principal =
   * { sub, display, scopes[] } derived ONLY from the validated token.
   */
  requireScope(scope) {
    return async (req, res, next) => {
      try {
        const principal = await this.#authenticate(req);
        if (!principal.scopes.includes(scope)) {
          throw new AuthError(403, 'insufficient_scope', `requires ${scope}`, {
            'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${scope}"`,
          });
        }
        req.principal = principal;
        next();
      } catch (e) {
        this.#sendAuthError(res, e);
      }
    };
  }

  /** Authenticate without a specific scope requirement (for endpoints gated by tool later). */
  authOnly() {
    return async (req, res, next) => {
      try {
        req.principal = await this.#authenticate(req);
        next();
      } catch (e) {
        this.#sendAuthError(res, e);
      }
    };
  }

  async #authenticate(req) {
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (config.devUnsafeNoAuth) {
      // Dev/test only: principal from an explicit header, NEVER in production.
      const sub = req.headers['x-dev-sub'] || 'op:dev';
      const scopes = String(req.headers['x-dev-scopes'] || 'notes:read notes:search notes:append notes:write').split(/\s+/);
      return { sub, display: sub, scopes };
    }
    if (!m) throw new AuthError(401, 'missing_token', 'bearer token required', this.#challenge('missing_token'));
    const claims = await this.verify(m[1]);
    const scopes = String(claims.scope || '').split(/\s+/).filter(Boolean);
    // principal derived ONLY from validated token claims (auth §1: never advisory headers).
    return { sub: claims.sub, display: claims.name || claims.preferred_username || claims.sub, scopes, jti: claims.jti, exp: claims.exp };
  }

  #sendAuthError(res, e) {
    if (e instanceof AuthError) {
      for (const [k, v] of Object.entries(e.headers || {})) res.setHeader(k, v);
      return res.status(e.httpStatus).json({ error: e.code, message: e.message });
    }
    return res.status(500).json({ error: 'internal', message: 'auth failure' });
  }
}

export { TOOL_SCOPES };
