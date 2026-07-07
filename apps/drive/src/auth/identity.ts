/**
 * Production verifier for the proxy-signed X-Auth-Identity header (human/browser session).
 * The proxy's forward-auth already gated the route; Drive additionally derives the operator
 * principal from the VERIFIED signature here (never the advisory header — auth §1/§8.6 R3).
 *
 * Wired from config: a JWKS URL in production (DRIVE_IDENTITY_HEADER_JWKS_URL), or the HS256 dev
 * signer in an isolated build. If neither is configured the human surface is unavailable and
 * fails CLOSED (verifyHumanIdentity throws) — a deploy MUST set the JWKS URL.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Config } from '../config.js';
import type { IdentityClaims } from './rs.js';

function toClaims(payload: JWTPayload): IdentityClaims | null {
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) return null;
  const c: IdentityClaims = { sub };
  if (typeof payload['scope'] === 'string') c.scope = payload['scope'] as string;
  if (typeof payload['auth_time'] === 'number') c.auth_time = payload['auth_time'] as number;
  return c;
}

export function makeIdentityVerifier(config: Config): ((headerValue: string) => Promise<IdentityClaims | null>) | undefined {
  const opts = { issuer: config.auth.issuer, audience: config.auth.audience, clockTolerance: 60 } as const;

  if (config.auth.identityHeaderJwksUrl) {
    const jwks = createRemoteJWKSet(new URL(config.auth.identityHeaderJwksUrl));
    return async (headerValue: string) => {
      try {
        const { payload } = await jwtVerify(headerValue, jwks, opts);
        return toClaims(payload);
      } catch {
        return null;
      }
    };
  }

  if (config.auth.devHs256Secret) {
    const key = new TextEncoder().encode(config.auth.devHs256Secret);
    return async (headerValue: string) => {
      try {
        const { payload } = await jwtVerify(headerValue, key, opts);
        return toClaims(payload);
      } catch {
        return null;
      }
    };
  }

  return undefined; // no verifier configured ⇒ human UI fails closed until a deploy wires one
}
