/**
 * Environment/config parsing. Every value is DRIVE_* prefixed (DEPLOYMENT §5).
 * Values default to PLAN §11 authoritative numbers so an unset env still matches spec.
 */

type Env = NodeJS.ProcessEnv;

function num(env: Env, name: string, def: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`env ${name} is not a number: ${raw}`);
  return n;
}

function str(env: Env, name: string, def = ''): string {
  const raw = env[name];
  return raw === undefined ? def : raw;
}

function bool(env: Env, name: string, def: boolean): boolean {
  const raw = env[name];
  if (raw === undefined || raw === '') return def;
  return raw === 'true' || raw === '1';
}

function csvNums(env: Env, name: string, def: number[]): number[] {
  const raw = env[name];
  if (!raw) return def;
  return raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
}

export interface Config {
  port: number;
  dataDir: string;
  dbPath: string;
  internalOrigin: string;
  publicOrigin: string;
  auth: {
    issuer: string;
    jwksUrl: string;
    audience: string;
    devHs256Secret: string;
    identityHeaderJwksUrl: string;
    budgetApiUrl: string;
    maxInflight: number;
  };
  board: {
    apiUrl: string; // empty ⇒ degraded (unverified_pending-always)
    ticketCheckTtlSec: number;
    recheckScheduleSec: number[];
  };
  limits: {
    maxBytes: number;
    uploadTtlSec: number;
    dailyBytesQuota: number;
    maxPendingUploads: number;
    diskWatermarkPct: number;
    allowExecutables: boolean;
  };
  backup: {
    repo: string;
    passwordFile: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = str(env, 'DRIVE_DATA_DIR', '/data');
  return {
    port: num(env, 'DRIVE_PORT', 8080),
    dataDir,
    dbPath: str(env, 'DRIVE_DB_PATH', `${dataDir}/db/drive.sqlite3`),
    internalOrigin: str(env, 'DRIVE_INTERNAL_ORIGIN', 'http://drive:8080'),
    publicOrigin: str(env, 'DRIVE_PUBLIC_ORIGIN', 'https://drive.example.test'),
    auth: {
      issuer: str(env, 'DRIVE_AUTH_ISSUER', 'https://auth.example.test'),
      jwksUrl: str(env, 'DRIVE_AUTH_JWKS_URL', 'http://auth:8089/.well-known/jwks.json'),
      audience: str(env, 'DRIVE_AUDIENCE', 'drive'),
      devHs256Secret: str(env, 'DRIVE_DEV_HS256_SECRET', ''),
      identityHeaderJwksUrl: str(env, 'DRIVE_IDENTITY_HEADER_JWKS_URL', ''),
      budgetApiUrl: str(env, 'DRIVE_BUDGET_API_URL', ''),
      maxInflight: num(env, 'DRIVE_MAX_INFLIGHT', 64),
    },
    board: {
      apiUrl: str(env, 'DRIVE_BOARD_API_URL', ''),
      ticketCheckTtlSec: num(env, 'DRIVE_TICKET_CHECK_TTL', 300),
      recheckScheduleSec: csvNums(env, 'DRIVE_TICKET_RECHECK_SCHEDULE', [300, 1800, 7200, 86400]),
    },
    limits: {
      maxBytes: num(env, 'DRIVE_MAX_BYTES', 5 * 1024 * 1024 * 1024),
      uploadTtlSec: num(env, 'DRIVE_UPLOAD_TTL', 900),
      dailyBytesQuota: num(env, 'DRIVE_DAILY_BYTES_QUOTA', 20 * 1024 * 1024 * 1024),
      maxPendingUploads: num(env, 'DRIVE_MAX_PENDING_UPLOADS', 4),
      diskWatermarkPct: num(env, 'DRIVE_DISK_WATERMARK_PCT', 90),
      allowExecutables: bool(env, 'DRIVE_ALLOW_EXECUTABLES', false),
    },
    backup: {
      repo: str(env, 'DRIVE_BACKUP_REPO', ''),
      passwordFile: str(env, 'DRIVE_BACKUP_PASSWORD_FILE', ''),
    },
  };
}

/** Env prefix guard — PLAN §11 says every var is DRIVE_ prefixed (plus the shared AUTH_VERIFY_*). */
export const SHARED_ENV_ALLOWED = new Set(['AUTH_VERIFY_HOST', 'AUTH_VERIFY_PORT', 'SUITE_DOMAIN']);
