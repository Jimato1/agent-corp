/*
 * logging.js — structured stdout logging (JSON lines; MC's log shipper tails it, D-10).
 *
 * The wrapper's own logs NEVER contain response bodies (§4.1 egress-scan invariant): no plaintext,
 * no signed cert, no secret value ever reaches this stream. Denied redemptions are ALSO first-class
 * audit rows + escalations (§6.3) — this is only the operational log.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.VAULT_LOG_LEVEL || 'info'] ?? 20;

function emit(level, event, fields) {
  if ((LEVELS[level] ?? 20) < threshold) return;
  const line = { level, event, ts: new Date().toISOString(), ...fields };
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(line) + '\n');
}

export const log = {
  debug: (event, fields = {}) => emit('debug', event, fields),
  info: (event, fields = {}) => emit('info', event, fields),
  warn: (event, fields = {}) => emit('warn', event, fields),
  error: (event, fields = {}) => emit('error', event, fields),
};
