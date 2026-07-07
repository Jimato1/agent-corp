/*
 * config.js — environment + DEPLOYMENT.md conformance (PLAN §1/§17).
 *
 * DEPLOYMENT §2/§5: service/DNS/audience `board`; internal port 8080; network `edge` only; volume
 * `board_data`; env prefix BOARD_; auth resolved at auth:8089; CORS allowlist for mc.<domain>.
 * The Board DB is CANONICAL (ARCH §10) — tickets, approvals, host_locks, ceremony_events, audit_log
 * are NOT rebuildable. Backup is in-process (§16). Numbers here are policy (finalized after gap-1.2,
 * PLAN §4/§21) — the guard STRUCTURE is final, the defaults are operator knobs.
 */

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}
function intEnv(name, fallback) {
  const v = env(name, undefined);
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`config: ${name} must be an integer, got ${JSON.stringify(v)}`);
  return n;
}
function boolEnv(name, fallback) {
  const v = env(name, undefined);
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

export const config = {
  // DEPLOYMENT §2 — suite convention, board serves on 8080; no host ports.
  port: intEnv('BOARD_PORT', 8080),
  // Canonical store (ARCH §10). Backups land beside it (§16).
  dbPath: env('BOARD_DB_PATH', '/data/board.db'),
  backupDir: env('BOARD_BACKUP_DIR', '/data/backups'),
  backupTarget: env('BOARD_BACKUP_TARGET', undefined), // off-box copy target (daily); existence non-optional in prod

  // Auth RS baseline (auth-apps-tokens-scopes.md §1). auth resolves at auth:8089 (DEPLOYMENT §4).
  authIssuer: env('BOARD_AUTH_ISSUER', 'https://auth.local'),
  authJwksUrl: env('BOARD_AUTH_JWKS_URL', 'http://auth:8089/.well-known/jwks.json'),
  authBudgetApiUrl: env('BOARD_AUTH_BUDGET_URL', 'http://auth:8089/budget/admission'),
  authRevocationsUrl: env('BOARD_AUTH_REVOCATIONS_URL', 'http://auth:8089/revocations'),
  jwksPollSeconds: intEnv('BOARD_JWKS_POLL_S', 30),
  selfAudience: 'board', // aud == board, exactly (never a wildcard)
  // Kill-epoch mirror poll + staleness bound. Past the bound, destructive paths (grant/consume) fail
  // closed (auth contract §1). Enforced only when a revocations URL is configured (never in dev/test).
  killPollMs: intEnv('BOARD_KILL_POLL_MS', 5000),
  killStalenessMs: intEnv('BOARD_KILL_STALENESS_MS', 30000),

  // CORS allowlist for MC's browser-direct operator console (PLAN §17; board-mc-console.md).
  mcOrigin: env('BOARD_MC_ORIGIN', 'https://mc.local'),

  // Board-as-client identity (PLAN §13 ask #4): fetch pinned plan bytes + effective taint from Notes;
  // post escalations to Chat. svc:board — client-credentials, notes:read + chat:post.
  notesBaseUrl: env('BOARD_NOTES_URL', 'http://notes:8080'),
  chatBaseUrl: env('BOARD_CHAT_URL', 'http://chat:8080'),
  cmdbBaseUrl: env('BOARD_CMDB_URL', 'http://cmdb:8080'),
  clientTimeoutMs: intEnv('BOARD_CLIENT_TIMEOUT_MS', 250), // live-check budget (auth §2)

  // Wazuh kickoff webhook — static HMAC over the RAW body (ratified D-9). Never logged.
  wazuhHmacSecret: env('BOARD_WAZUH_HMAC_SECRET', undefined),

  // The Library curation team label (§9 rule 3): tickets created by agents on this team are tainted
  // (they process external web content) and are auto-approve-lane ineligible.
  curationTeamLabel: env('BOARD_CURATION_TEAM', 'library-curation'),

  // --- Lease / heartbeat / reaper (PLAN §4 — policy, not schema; starting defaults) ---
  leaseTtlMs: intEnv('BOARD_LEASE_TTL_MS', 5 * 60 * 1000), // ~5 min
  reaperSweepMs: intEnv('BOARD_REAPER_SWEEP_MS', 30 * 1000), // 30s
  watchdogSweepMs: intEnv('BOARD_WATCHDOG_SWEEP_MS', 10 * 1000), // 10s ceremony watchdog
  wallClockCapMs: intEnv('BOARD_WALL_CLOCK_CAP_MS', 60 * 60 * 1000), // default per-ticket max (A1 max_renewal_cap)

  // --- Outage-aware reaper population gate (gap 4.4, D-12) ---
  fleetSize: intEnv('BOARD_FLEET_SIZE', 20), // operator-configured denominator; kept truthful (PLAN §20.5)
  outageGateMinAgents: intEnv('BOARD_OUTAGE_GATE_MIN_AGENTS', 4), // min-population floor
  outageGateThreshold: Number(env('BOARD_OUTAGE_GATE_THRESHOLD', '0.4')), // 40% interim default (PENDING D-12)
  outageWindowMs: intEnv('BOARD_OUTAGE_WINDOW_MS', 2 * 60 * 1000),

  // --- Guardrails (PLAN §11) ---
  wipGlobalCap: intEnv('BOARD_WIP_GLOBAL_CAP', 8),
  wipPerAgentCap: intEnv('BOARD_WIP_PER_AGENT_CAP', 1),
  lineageMaxDepth: intEnv('BOARD_LINEAGE_MAX_DEPTH', 3),

  // --- Ceremony parameters (PROVISIONAL pending gap-1.2 sizing; PLAN §14.2/§20.10) ---
  ceremonyRoundCap: intEnv('BOARD_CEREMONY_ROUND_CAP', 3),
  ceremonyTimeboxMs: intEnv('BOARD_CEREMONY_TIMEBOX_MS', 30 * 60 * 1000), // 30 min wall-clock
  ceremonyLightweightRoundCap: intEnv('BOARD_CEREMONY_LIGHTWEIGHT_ROUND_CAP', 1),
  // Minimum independent drafters before any cross-talk (anti-anchoring; PLAN §14.2). PROVISIONAL — the
  // roster size is a gap-1.2 sizing measurement; 2 is the interim floor.
  ceremonyMinRoster: intEnv('BOARD_CEREMONY_MIN_ROSTER', 2),

  // svc:tier-approver (D-15): registered but NON-ACTIVATABLE until auth's HOLDER_ALLOWED_KINDS admits
  // kind=service (PLAN §13). Ships disabled-by-default — until then ALL approvals are operator-granted.
  tierApproverEnabled: boolEnv('BOARD_TIER_APPROVER_ENABLED', false),

  // Backup cadence (§16).
  backupIntervalMs: intEnv('BOARD_BACKUP_INTERVAL_MS', 60 * 60 * 1000), // hourly
  backupRetention: intEnv('BOARD_BACKUP_RETENTION', 48),
  // RESTORE mode — an EXPLICIT operator action, not every boot. When set, index.js runs the §16
  // restore-consistency reconciliation (revoke granted approvals, requeue leases, time-seed the
  // fencing floor, escalate in-flight huddles) BEFORE serving traffic. A normal restart must NOT set
  // this (flooring generations would spuriously fence live holders). Cleared after one boot.
  restoreReconcile: boolEnv('BOARD_RESTORE_RECONCILE', false),

  // Dev/test escape hatch: allow boot + principal-from-header without a real auth (NEVER in prod).
  devUnsafeNoAuth: boolEnv('BOARD_DEV_UNSAFE_NO_AUTH', false),
  // Disable in-process sweeps (reaper/watchdog/cron/backup) — tests drive them deterministically.
  disableSweeps: boolEnv('BOARD_DISABLE_SWEEPS', false),
  localConcurrencyCeiling: intEnv('BOARD_LOCAL_CONCURRENCY', 64),
  staticDir: env('BOARD_STATIC_DIR', undefined),
  env: env('NODE_ENV', 'production'),
};

export function assertBootRequirements() {
  const problems = [];
  if (config.env === 'production') {
    if (config.devUnsafeNoAuth) problems.push('BOARD_DEV_UNSAFE_NO_AUTH must not be set in production.');
    if (!config.wazuhHmacSecret)
      problems.push('BOARD_WAZUH_HMAC_SECRET is unset. The Wazuh kickoff webhook authenticates by HMAC over the raw body (D-9); refusing to serve the event kickoff surface without it.');
    if (!config.backupTarget)
      problems.push('BOARD_BACKUP_TARGET is unset. The Board DB is CANONICAL (ARCH §10) and MUST have a stated off-box backup destination.');
  }
  if (problems.length) throw new Error('BOOT FAILURE:\n  - ' + problems.join('\n  - '));
}
