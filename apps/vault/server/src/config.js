/*
 * config.js — environment + DEPLOYMENT.md conformance (PLAN §1; DEPLOYMENT §1/§2/§3a/§5).
 *
 * Vault is the thin wrapper (service/DNS/audience `vault`, internal port 8080). It joins THREE networks:
 * `edge` (UI/MCP), `creds` (the redeem endpoint ONLY — mTLS to the Gateway), `data_vault` (to the
 * OpenBao engine + unsealer). auth resolves at auth:8089 (DEPLOYMENT §4). Env prefix VAULT_ (§5) — but
 * NEVER the literal VAULT_ADDR (collides with HashiCorp-client convention); pinned names per PLAN §1.
 *
 * The redeem endpoint is served on a SEPARATE listener bound to the `creds` interface (VAULT_REDEEM_BIND)
 * so it CANNOT be routed to from edge (§4 header / MI-8) — the wrapper refuses to boot if that bind is
 * unset/0.0.0.0/equal to the edge address in production.
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
  // DEPLOYMENT §2 — suite convention: vault serves on 8080 (edge); no host ports.
  port: intEnv('VAULT_PORT', 8080),

  // The creds-interface redeem listener (§4 header, MI-8). mTLS, Gateway-only. Never reachable from edge.
  redeemBind: env('VAULT_REDEEM_BIND', undefined), // e.g. 10.x.x.x:8443 on the `creds` subnet
  redeemPort: intEnv('VAULT_REDEEM_PORT', 8443),
  // Suite-internal offline CA (M-7 / G-5) — the creds-hop mTLS trust anchor + the Gateway's client cert.
  credsCaFile: env('VAULT_CREDS_CA_FILE', undefined),
  credsServerCertFile: env('VAULT_CREDS_SERVER_CERT_FILE', undefined),
  credsServerKeyFile: env('VAULT_CREDS_SERVER_KEY_FILE', undefined),
  gatewayClientCn: env('VAULT_GATEWAY_CLIENT_CN', 'svc:gateway'), // the CN/SAN identifying the Gateway on the creds cert

  // Canonical wrapper store (ARCH §10): audit_local (append-only, hash-chained) + releases (operational).
  dbPath: env('VAULT_DB_PATH', '/data/vault.db'),
  backupDir: env('VAULT_BACKUP_DIR', '/data/backups'),
  snapshotDest: env('VAULT_SNAPSHOT_DEST', undefined), // off-box, non-suite engine raft-snapshot dest (§7.3)

  // Auth RS baseline (auth-apps-tokens-scopes.md §1/§8). auth resolves at auth:8089 (DEPLOYMENT §4).
  authIssuer: env('VAULT_AUTH_ISSUER', 'https://auth.local'),
  authJwksUrl: env('VAULT_AUTH_JWKS_URL', 'http://auth:8089/.well-known/jwks.json'),
  authIntrospectUrl: env('VAULT_AUTH_INTROSPECT_URL', 'http://auth:8089/introspect'), // uncached, destructive-exec (§8 step 7)
  authRevocationsUrl: env('VAULT_AUTH_REVOCATIONS_URL', 'http://auth:8089/revocations'), // pushed denylist
  authBudgetApiUrl: env('VAULT_AUTH_BUDGET_URL', 'http://auth:8089/budget/admission'),
  jwksPollSeconds: intEnv('VAULT_JWKS_POLL_S', 30),
  selfAudience: 'vault', // aud == vault, exactly, single-valued (§8 pin)
  driftBoundMs: intEnv('VAULT_DRIFT_BOUND_MS', 1000), // §8 step 8 D=1s

  // svc:vault as a client of the Board facts (PIP) surface (D-4 §4.3; board-consumers-facts-read.md).
  boardFactsUrl: env('VAULT_BOARD_FACTS_URL', 'http://board:8080'),
  clientTimeoutMs: intEnv('VAULT_CLIENT_TIMEOUT_MS', 250), // auth live-check budget (auth §2)

  // OpenBao engine + unsealer (data_vault only; DEPLOYMENT §3a). NEVER the literal VAULT_ADDR (PLAN §1).
  openbaoAddr: env('VAULT_OPENBAO_ADDR', 'https://vault_openbao:8200'), // data_vault alias (M-8 path pin)
  unsealerAddr: env('VAULT_UNSEALER_ADDR', 'https://vault_unsealer:8200'),
  engineCaFile: env('VAULT_ENGINE_CA_FILE', undefined), // suite-internal CA for the engine mTLS listener
  engineClientCertFile: env('VAULT_ENGINE_CLIENT_CERT_FILE', undefined), // ONLY the wrapper holds this
  engineClientKeyFile: env('VAULT_ENGINE_CLIENT_KEY_FILE', undefined),
  wrapperRoleId: env('VAULT_WRAPPER_ROLE_ID', undefined), // AppRole secret-zero (metadata/write path only)
  wrapperSecretIdFile: env('VAULT_WRAPPER_SECRET_ID_FILE', undefined),

  // Off-box WORM sink — hardened log host (D-16b). Dual-sink fail-closed audit (D-16a).
  wormSinkUrl: env('VAULT_WORM_SINK_URL', undefined),
  wormMtlsCertFile: env('VAULT_WORM_CERT_FILE', undefined),
  wormMtlsKeyFile: env('VAULT_WORM_KEY_FILE', undefined),

  // Credential brokering knobs.
  sshCertTtl: env('VAULT_SSH_CERT_TTL', '10m'), // band 5–15 min, sized to one run (§3.3 / contract §2)
  releaseTtlMs: intEnv('VAULT_RELEASE_TTL_MS', 24 * 60 * 60 * 1000), // pending-release TTL (§5.2), 24h
  redeemWindowMs: intEnv('VAULT_REDEEM_WINDOW_MS', 15 * 60 * 1000), // W — binds FIRST redemption only (B-4)

  // Escalation route for the §6.3 exfiltration signal. Best-effort; fallback is the violations feed.
  chatBaseUrl: env('VAULT_CHAT_URL', 'http://chat:8080'),

  // Concurrency ceilings (auth §1 in-process). destructive-exec "often 1"; 1–2 in-flight per sub on /redeem.
  redeemConcurrencyCeiling: intEnv('VAULT_REDEEM_CONCURRENCY', 2),
  localConcurrencyCeiling: intEnv('VAULT_LOCAL_CONCURRENCY', 64), // MCP + manage surfaces

  // Dev/test escape hatch: boot + principal-from-header without a real auth (NEVER in prod). Also lets
  // the creds channel accept an x-creds-client-cn stub in place of a real peer cert (tests only).
  devUnsafeNoAuth: boolEnv('VAULT_DEV_UNSAFE_NO_AUTH', false),
  disableSweeps: boolEnv('VAULT_DISABLE_SWEEPS', false),
  staticDir: env('VAULT_STATIC_DIR', undefined),
  env: env('NODE_ENV', 'production'),
};

/**
 * Boot requirements (PLAN §4 header / MI-8 / D-16). In production the wrapper REFUSES TO BOOT unless the
 * segregation-critical wiring is present: the creds bind is a real non-edge address; the WORM sink and
 * snapshot destination exist (canonical-store DR, ARCH §10); the engine mTLS material is configured.
 */
export function assertBootRequirements() {
  const problems = [];
  if (config.env === 'production') {
    if (config.devUnsafeNoAuth) problems.push('VAULT_DEV_UNSAFE_NO_AUTH must not be set in production.');
    if (!config.redeemBind || config.redeemBind.startsWith('0.0.0.0'))
      problems.push('VAULT_REDEEM_BIND must be a specific `creds`-interface address (never unset or 0.0.0.0). The redeem endpoint must not be routable from edge (§4 header, MI-8).');
    if (!config.credsCaFile || !config.credsServerCertFile || !config.credsServerKeyFile)
      problems.push('creds-hop mTLS material (VAULT_CREDS_CA_FILE / _SERVER_CERT_FILE / _SERVER_KEY_FILE) is required — the Vault→Gateway hop is mutually authenticated (ARCH §11, contract §5).');
    if (!config.engineCaFile || !config.engineClientCertFile || !config.engineClientKeyFile)
      problems.push('OpenBao engine mTLS client material (VAULT_ENGINE_CA_FILE / _CLIENT_CERT_FILE / _CLIENT_KEY_FILE) is required — only the wrapper may reach the engine listener (§2.2).');
    if (!config.wormSinkUrl)
      problems.push('VAULT_WORM_SINK_URL is unset. Redemption fails closed on auditability (D-16a); an off-box WORM sink is mandatory (D-16b, contract §6).');
    if (!config.snapshotDest)
      problems.push('VAULT_SNAPSHOT_DEST is unset. OpenBao storage is a CANONICAL special-regime store (ARCH §10) and MUST have a stated off-box snapshot destination (§7.3).');
  }
  if (problems.length) throw new Error('BOOT FAILURE:\n  - ' + problems.join('\n  - '));
}
