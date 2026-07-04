/* Test harness: builds an isolated Drive context (temp data dir, in-memory-adjacent SQLite,
   HS256 dev signer) + token minting for agent/human/service principals. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { loadConfig, type Config } from '../src/config.js';
import { createContext, closeContext, type AppContext } from '../src/context.js';
import { buildServer } from '../src/http/server.js';
import { registerMcp } from '../src/mcp/server.js';
import { registerUi } from '../src/ui/static.js';
import type { IdentityClaims } from '../src/auth/rs.js';

export const ISSUER = 'https://auth.test';
export const SECRET = 'drive-test-secret-please';
const KEY = new TextEncoder().encode(SECRET);

export interface Harness {
  ctx: AppContext;
  app: ReturnType<typeof buildServer>;
  dir: string;
  close(): void;
}

export function testConfig(dir: string, over: Partial<Config> = {}): Config {
  const base = loadConfig({
    DRIVE_DATA_DIR: dir,
    DRIVE_DB_PATH: join(dir, 'db', 'drive.sqlite3'),
    DRIVE_AUTH_ISSUER: ISSUER,
    DRIVE_AUDIENCE: 'drive',
    DRIVE_AUTH_JWKS_URL: '',
    DRIVE_BUDGET_API_URL: '',
    DRIVE_BOARD_API_URL: '',
    DRIVE_INTERNAL_ORIGIN: 'http://drive:8080',
    DRIVE_PUBLIC_ORIGIN: 'https://drive.test',
  } as NodeJS.ProcessEnv);
  return { ...base, ...over };
}

export async function verifyIdentityHeader(headerValue: string): Promise<IdentityClaims | null> {
  const { jwtVerify } = await import('jose');
  try {
    const { payload } = await jwtVerify(headerValue, KEY, { issuer: ISSUER, audience: 'drive' });
    const c: IdentityClaims = { sub: String(payload.sub) };
    if (typeof payload['scope'] === 'string') c.scope = payload['scope'] as string;
    if (typeof payload['auth_time'] === 'number') c.auth_time = payload['auth_time'] as number;
    return c;
  } catch {
    return null;
  }
}

export function makeHarness(over: Partial<Config> = {}, fetchImpl?: typeof fetch): Harness {
  const dir = mkdtempSync(join(tmpdir(), 'drive-test-'));
  const config = testConfig(dir, over);
  const ctx = createContext(config, {
    authDeps: { hs256Key: KEY, verifyIdentity: verifyIdentityHeader },
    ...(fetchImpl ? { fetchImpl } : {}),
  });
  const app = buildServer(ctx);
  registerMcp(app, ctx);
  return {
    ctx,
    app,
    dir,
    close() {
      closeContext(ctx);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Harness that wires the X-Auth-Identity verifier from CONFIG (via makeIdentityVerifier), exactly
 * as production boot does — NOT via a test-injected verifier. This is the path that was the HIGH
 * verification finding (dangling config knob → human UI 401s). Uses the HS256 dev signer branch.
 */
export function makeHarnessConfigWired(): Harness {
  const dir = mkdtempSync(join(tmpdir(), 'drive-test-'));
  const config = testConfig(dir);
  config.auth.devHs256Secret = SECRET; // makeIdentityVerifier picks the HS256 branch
  // Only inject the bearer key; verifyIdentity is left for createContext to wire from config.
  const ctx = createContext(config, { authDeps: { hs256Key: KEY } });
  const app = buildServer(ctx);
  registerMcp(app, ctx);
  registerUi(app);
  return { ctx, app, dir, close() { closeContext(ctx); rmSync(dir, { recursive: true, force: true }); } };
}

export async function agentToken(sub = 'agent:patcher-07', scope = 'drive:read drive:write'): Promise<string> {
  return new SignJWT({ scope }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub).setIssuer(ISSUER).setAudience('drive').setIssuedAt().setExpirationTime('5m').sign(KEY);
}

export async function serviceToken(sub = 'svc:drive', scope = 'drive:read'): Promise<string> {
  return new SignJWT({ scope }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub).setIssuer(ISSUER).setAudience('drive').setIssuedAt().setExpirationTime('5m').sign(KEY);
}

/** X-Auth-Identity header value for a human operator (signed like the proxy would). */
export async function humanIdentity(sub = 'op:ada', scope = 'drive:read drive:write', authTime?: number): Promise<string> {
  const b = new SignJWT({ scope, ...(authTime ? { auth_time: authTime } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience('drive')
    .setIssuedAt()
    .setExpirationTime('5m');
  return b.sign(KEY);
}

/** Foreign-audience token (aud != drive) for negative tests. */
export async function wrongAudToken(sub = 'agent:x'): Promise<string> {
  return new SignJWT({ scope: 'drive:read' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub).setIssuer(ISSUER).setAudience('board').setIssuedAt().setExpirationTime('5m').sign(KEY);
}

/** Register + stream + commit one artifact via the HTTP API; returns the commit result. */
export async function putArtifact(
  h: Harness,
  token: string,
  args: { ticket_id: string; logical_name: string; op_id: string; fencing_token?: number | string; body?: Buffer | string; contentType?: string },
): Promise<{ status: number; body: any; upload_id?: string }> {
  const reg = await h.app.inject({
    method: 'POST',
    url: '/api/artifacts',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ ticket_id: args.ticket_id, logical_name: args.logical_name, op_id: args.op_id, fencing_token: args.fencing_token }),
  });
  if (reg.statusCode !== 201) return { status: reg.statusCode, body: reg.json() };
  const uploadId = reg.json().upload_id as string;
  const put = await h.app.inject({
    method: 'PUT',
    url: `/api/uploads/${uploadId}`,
    headers: { authorization: `Bearer ${token}`, 'content-type': args.contentType ?? 'application/octet-stream' },
    payload: args.body ?? Buffer.from('hello-artifact-bytes'),
  });
  return { status: put.statusCode, body: put.json(), upload_id: uploadId };
}
