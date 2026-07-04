/**
 * OAuth 2.1 Resource-Server baseline — consumed VERBATIM from auth-apps-tokens-scopes.md §1/§2/§8:
 *   - local JWKS validation (reject any kid not in the currently-served JWKS), verify iss + aud==drive
 *     (single-valued), exp/nbf within ≤60s skew, coarse scope enforced per route/tool.
 *   - principal derived ONLY from the validated token OR the proxy-verified X-Auth-Identity
 *     signature — NEVER an advisory/forwarded header (§1, §8.6 Rule 3).
 *   - on 401 the caller sends WWW-Authenticate: Bearer resource_metadata=… (see http/server).
 *
 * Drive holds no holder scope; a fully-compromised Drive principal can only add flagged
 * artifacts and read artifacts (SoD posture for a Standard app). The one destructive route (GC)
 * additionally requires the auth Tier-2 live re-check (auth §8 step 7 / PLAN §7) — see budget.ts.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { Config } from '../config.js';
import { DriveError } from '../lib/errors.js';
import { kindOfSub, type Principal } from '../lib/principal.js';

export interface AuthDeps {
  /** Resolve the verification key(s). Injectable for tests. */
  getKey?: JWTVerifyGetKey;
  /** Symmetric key for the isolated-build HS256 test signer (never production). */
  hs256Key?: Uint8Array;
  /** Verifier for the signed X-Auth-Identity header (human/browser). */
  verifyIdentity?: (headerValue: string) => Promise<IdentityClaims | null>;
}

export interface IdentityClaims {
  sub: string;
  scope?: string;
  auth_time?: number;
}

const CLOCK_SKEW_SEC = 60;

export class Rs {
  private remoteJwks?: ReturnType<typeof createRemoteJWKSet>;
  constructor(
    private readonly config: Config,
    private readonly deps: AuthDeps = {},
  ) {
    if (!deps.getKey && !deps.hs256Key && config.auth.jwksUrl) {
      try {
        this.remoteJwks = createRemoteJWKSet(new URL(config.auth.jwksUrl));
      } catch {
        this.remoteJwks = undefined;
      }
    }
  }

  /** Validate a Bearer token and return a Principal, or throw UNAUTHENTICATED. */
  async verifyBearer(authorization: string | undefined): Promise<Principal> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new DriveError('UNAUTHENTICATED', 'missing bearer token');
    }
    const token = authorization.slice('Bearer '.length).trim();
    let payload: JWTPayload;
    try {
      const verifyOpts = {
        issuer: this.config.auth.issuer,
        audience: this.config.auth.audience, // aud == drive, single-valued
        clockTolerance: CLOCK_SKEW_SEC,
      } as const;
      if (this.deps.getKey) {
        ({ payload } = await jwtVerify(token, this.deps.getKey, verifyOpts));
      } else if (this.deps.hs256Key) {
        ({ payload } = await jwtVerify(token, this.deps.hs256Key, verifyOpts));
      } else if (this.remoteJwks) {
        ({ payload } = await jwtVerify(token, this.remoteJwks, verifyOpts));
      } else {
        throw new Error('no verification key configured');
      }
    } catch (e) {
      throw new DriveError('UNAUTHENTICATED', `token validation failed: ${(e as Error).message}`);
    }
    // aud must be exactly the single self audience (reject multi-valued, §8 rule).
    const aud = payload.aud;
    if (Array.isArray(aud)) {
      if (aud.length !== 1 || aud[0] !== this.config.auth.audience) throw new DriveError('UNAUTHENTICATED', 'aud must be single-valued == drive');
    } else if (aud !== this.config.auth.audience) {
      throw new DriveError('UNAUTHENTICATED', 'aud mismatch');
    }
    const sub = String(payload.sub ?? '');
    if (!sub) throw new DriveError('UNAUTHENTICATED', 'no sub');
    const scopes = parseScopes(payload['scope']);
    return { sub, kind: kindOfSub(sub), scopes, viaIdentityHeader: false };
  }

  /**
   * Verify the proxy-signed X-Auth-Identity header (human/browser session). The proxy's
   * forward-auth already gated the route; Drive additionally derives the principal from the
   * verified signature, never the advisory header. Returns a human Principal or throws.
   */
  async verifyHumanIdentity(headerValue: string | undefined): Promise<Principal> {
    if (!headerValue) throw new DriveError('UNAUTHENTICATED', 'no verified identity');
    if (!this.deps.verifyIdentity) throw new DriveError('UNAUTHENTICATED', 'identity-header verification not configured');
    const claims = await this.deps.verifyIdentity(headerValue);
    if (!claims || !claims.sub) throw new DriveError('UNAUTHENTICATED', 'identity signature invalid');
    const p: Principal = {
      sub: claims.sub,
      kind: kindOfSub(claims.sub),
      scopes: parseScopes(claims.scope),
      viaIdentityHeader: true,
    };
    if (claims.auth_time) p.authTime = claims.auth_time;
    return p;
  }
}

function parseScopes(raw: unknown): Set<string> {
  if (typeof raw !== 'string') return new Set();
  return new Set(raw.split(/\s+/).filter(Boolean));
}

/** Coarse scope gate (§1 "enforce coarse scope"). Throws INSUFFICIENT_SCOPE on a miss. */
export function requireScope(p: Principal, scope: string): void {
  if (!p.scopes.has(scope)) {
    throw new DriveError('INSUFFICIENT_SCOPE', `missing required scope: ${scope}`, { required: scope });
  }
}
