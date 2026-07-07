/*
 * logging.js — structured stdout logging (JSON lines).
 *
 * PLAN §4.2: denied/rejected calls go ONLY to stdout (MC's log shipper, D-10). They are
 * deliberately NOT index-rebuildable — git holds every *state change*; denials are not state.
 * PLAN §11.4: a hygiene rejection log line NEVER contains the matched content — pattern class,
 * sub, note_id, offsets, and a salted hash only. Nothing here ever logs a note body or a secret.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.NOTES_LOG_LEVEL || 'info'] ?? 20;

function emit(level, event, fields) {
  if ((LEVELS[level] ?? 20) < threshold) return;
  const line = { level, event, ...fields };
  // No timestamp via Date.now here would break determinism in tests; callers pass ts when needed.
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(line) + '\n');
}

export const log = {
  debug: (event, fields = {}) => emit('debug', event, fields),
  info: (event, fields = {}) => emit('info', event, fields),
  warn: (event, fields = {}) => emit('warn', event, fields),
  error: (event, fields = {}) => emit('error', event, fields),

  // Denial audit (stdout only; not index-rebuildable — PLAN §4.2).
  denial: (fields) => emit('warn', 'denial', fields),

  // Hygiene rejection — matched content is NEVER included (PLAN §11.4).
  hygieneReject: ({ sub, noteId, patternClass, offsets, saltedHash }) =>
    emit('warn', 'hygiene_reject', { sub, note_id: noteId, pattern_class: patternClass, offsets, salted_hash: saltedHash }),
};
