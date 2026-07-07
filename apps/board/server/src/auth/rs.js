/*
 * auth/rs.js — OAuth 2.1 Resource Server baseline (auth-apps-tokens-scopes.md §1; PLAN §1/§13).
 *
 * Local JWKS validation (poll <=30s + on unknown kid); iss per RFC 9207; aud == board EXACTLY
 * (single-valued, no wildcard); RFC 9728 protected-resource metadata + WWW-Authenticate; principal
 * derived ONLY from the validated token (never a forwarded header). The Board carries KIND-GATED
 * scopes (holder-scope shape, auth §8): board:execute is svc:gateway-only (kind=service), board:approve
 * is human/service-only — enforced here in addition to the coarse scope check. The Board additionally
 * enforces four-eyes + transition authority in the service layer (two independent enforcement points).
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { AuthError } from '../errors.js';
import { SCOPES, SCOPES_SUPPORTED, KIND } from '../constants.js';

// Holder-scope kind gates (auth §8; PLAN §13). A scope may require a specific principal kind.
const HOLDER_ALLOWED_KINDS = {
  [SCOPES.EXECUTE]: new Set([KIND.SERVICE]), // svc:gateway ONLY
  [SCOPES.APPROVE]: new Set([KIND.HUMAN, KIND.SERVICE]), // operator + svc:tier-approver (service admitted at auth Stage-5)
  [SCOPES.ADMIN]: new Set([KIND.HUMAN, KIND.SERVICE]), // operator + svc:mc (caps only)
};

export class ResourceServer {
  constructor() {
    this.jwks = config.devUnsafeNoAuth
      ? null
      : createRemoteJWKSet(new URL(config.authJwksUrl), { cooldownDuration: config.jwksPollSeconds * 1000, cacheMaxAge: config.jwksPollSeconds * 1000 });
  }

  metadata() {
    return {
      resource: `https://${config.selfAudience}`,
      authorization_servers: [config.authIssuer],
      scopes_supported: SCOPES_SUPPORTED,
      bearer_methods_supported: ['header'],
    };
  }

  async verify(token) {
    if (config.devUnsafeNoAuth) return null;
    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer: config.authIssuer, audience: config.selfAudience });
      if (Array.isArray(payload.aud) && payload.aud.length !== 1) throw new AuthError(401, 'invalid_token', 'multi-valued aud rejected', this.#challenge('invalid_token'));
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

  requireScope(scope) {
    return async (req, res, next) => {
      try {
        const principal = await this.#authenticate(req);
        if (!principal.scopes.includes(scope)) {
          throw new AuthError(403, 'insufficient_scope', `requires ${scope}`, { 'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${scope}"` });
        }
        // holder-scope kind gate (defense-in-depth alongside auth's PDP).
        const kinds = HOLDER_ALLOWED_KINDS[scope];
        if (kinds && !kinds.has(principal.kind)) {
          throw new AuthError(403, 'insufficient_scope', `scope ${scope} not permitted for kind=${principal.kind}`, { 'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${scope}"` });
        }
        req.principal = principal;
        next();
      } catch (e) {
        this.#sendAuthError(res, e);
      }
    };
  }

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
    if (config.devUnsafeNoAuth) {
      const sub = req.headers['x-dev-sub'] || 'op:dev';
      const scopes = String(req.headers['x-dev-scopes'] || 'board:read board:claim board:propose board:update board:approve board:run-ceremony').split(/\s+/).filter(Boolean);
      const kind = req.headers['x-dev-kind'] || inferKind(sub);
      return { sub, display: sub, scopes, kind };
    }
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) throw new AuthError(401, 'missing_token', 'bearer token required', this.#challenge('missing_token'));
    const claims = await this.verify(m[1]);
    const scopes = String(claims.scope || '').split(/\s+/).filter(Boolean);
    const kind = claims.kind || claims.principal_kind || inferKind(claims.sub);
    return { sub: claims.sub, display: claims.name || claims.preferred_username || claims.sub, scopes, kind, jti: claims.jti, exp: claims.exp };
  }

  #sendAuthError(res, e) {
    if (e instanceof AuthError) {
      for (const [k, v] of Object.entries(e.headers || {})) res.setHeader(k, v);
      return res.status(e.httpStatus).json({ error: e.code, message: e.message });
    }
    return res.status(500).json({ error: 'internal', message: 'auth failure' });
  }
}

// Fallback kind inference from sub prefix (auth is authoritative; this is a dev/last-resort guess).
function inferKind(sub) {
  const s = String(sub || '');
  if (s.startsWith('svc:')) return KIND.SERVICE;
  if (s.startsWith('agent:')) return KIND.AGENT;
  return KIND.HUMAN;
}
