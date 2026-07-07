/*
 * config.js — environment + DEPLOYMENT.md conformance.
 *
 * DEPLOYMENT.md: service/DNS/audience `notes`; internal port 8080; network `edge` only;
 * ONE volume `notes_data` (corpus at /data/corpus = git repo w/ remote; index at /data/index
 * OUTSIDE the repo); env prefix NOTES_; auth resolved at auth:8089.
 *
 * CORR-5 (configured git remote): NOTES_GIT_REMOTE_URL is BOOT-REQUIRED. A local-only .git is
 * a build failure (ARCH §10). Enforcement of the *refuse-to-boot* rule lives in git/remote.js +
 * index.js; this module surfaces the value and the fail-loud check helper.
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

export const config = {
  // DEPLOYMENT §2: suite convention — notes serves on 8080.
  port: intEnv('NOTES_PORT', 8080),
  // DEPLOYMENT §5 layout. Corpus is the git repo root; index sits OUTSIDE it (PLAN §2.1).
  corpusPath: env('NOTES_CORPUS_PATH', '/data/corpus'),
  dbPath: env('NOTES_DB_PATH', '/data/index/notes.db'),

  // CORR-5 — git remote. BOOT-REQUIRED. index.js refuses to serve if unset.
  gitRemoteUrl: env('NOTES_GIT_REMOTE_URL', undefined),
  gitRemoteName: env('NOTES_GIT_REMOTE_NAME', 'origin'),
  gitBranch: env('NOTES_GIT_BRANCH', 'main'),
  // Push cadence (PLAN §2.3): debounce ≤60s; ERROR + degraded health past the lag alarm.
  pushDebounceMs: intEnv('NOTES_PUSH_DEBOUNCE_MS', 60_000),
  pushLagAlarmSeconds: intEnv('NOTES_PUSH_LAG_ALARM_S', 15 * 60),
  // Git remote credentials are deploy-time secrets, never note-visible (PLAN §2.3).
  gitRemoteUser: env('NOTES_GIT_REMOTE_USER', undefined),
  gitRemoteToken: env('NOTES_GIT_REMOTE_TOKEN', undefined),
  // Author display email is a documented-as-meaningless constant (PLAN §3.2). sub joins via trailer.
  gitAuthorEmail: env('NOTES_GIT_AUTHOR_EMAIL', 'agent@notes.local'),
  gitCommitterName: env('NOTES_GIT_COMMITTER_NAME', 'notes-service'),

  // Auth RS baseline (auth-apps-tokens-scopes.md §1). auth resolves at auth:8089 (DEPLOYMENT §4).
  authIssuer: env('NOTES_AUTH_ISSUER', 'https://auth.local'),
  authJwksUrl: env('NOTES_AUTH_JWKS_URL', 'http://auth:8089/.well-known/jwks.json'),
  authIntrospectUrl: env('NOTES_AUTH_INTROSPECT_URL', 'http://auth:8089/introspect'),
  authBudgetApiUrl: env('NOTES_AUTH_BUDGET_URL', 'http://auth:8089/budget/admission'),
  jwksPollSeconds: intEnv('NOTES_JWKS_POLL_S', 30),
  selfAudience: 'notes', // aud == notes, exactly (never a wildcard)

  // Board seam (PLAN §9.3). Notes holds svc:notes (client-credentials, board:read only).
  boardBaseUrl: env('NOTES_BOARD_URL', 'http://board:8080'),
  authTokenUrl: env('NOTES_AUTH_TOKEN_URL', 'http://auth:8089/oauth/token'),
  svcClientId: env('NOTES_SVC_CLIENT_ID', 'svc:notes'),
  svcClientKeyPath: env('NOTES_SVC_CLIENT_KEY', undefined), // asymmetric client-assertion key
  boardReadTimeoutMs: intEnv('NOTES_BOARD_TIMEOUT_MS', 250), // live-check timeout (auth §2)

  // Per-note size cap (PLAN §11.10) — markdown only.
  maxNoteBytes: intEnv('NOTES_MAX_NOTE_BYTES', 1024 * 1024),

  // Budget middleware local concurrency ceiling (auth §1 — Redis-independent always-available bound).
  localConcurrencyCeiling: intEnv('NOTES_LOCAL_CONCURRENCY', 32),

  // Mechanical draft-isolation variant (PLAN §7.3) — dormant by default until the Board↔Notes
  // contract ratifies it. When false, isolation is procedural (no Notes read-surface elision).
  mechanicalDraftIsolation: env('NOTES_MECHANICAL_ISOLATION', 'false') === 'true',

  // Dev/test escape hatch: allow boot without a real auth/board (never in prod).
  devUnsafeNoAuth: env('NOTES_DEV_UNSAFE_NO_AUTH', 'false') === 'true',
  env: env('NODE_ENV', 'production'),
};

export function assertBootRequirements() {
  const problems = [];
  // CORR-5: local-only .git is a build failure.
  if (!config.gitRemoteUrl) {
    problems.push(
      'NOTES_GIT_REMOTE_URL is unset. A local-only .git is a build failure (ARCH §10 / PLAN §2.3). ' +
        'The Notes corpus MUST push to an off-box remote; refusing to boot.',
    );
  }
  if (problems.length) {
    throw new Error('BOOT FAILURE:\n  - ' + problems.join('\n  - '));
  }
}
