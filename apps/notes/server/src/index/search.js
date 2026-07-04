/*
 * search.js — FTS5 query as a scoped TOOL, never a context dump (PLAN §6/§9.1).
 *
 * Returns rows of { note_id, path, title, snippet(≤~64 tokens, bm25-ranked), score, taint(effective) }
 * — NEVER bodies. The taint marker travels with every retrieved snippet (ARCH §12): a snippet is
 * retrieved content entering agent context.
 *
 * FTS input is parameterized and restricted to a SANITIZED MATCH subset (phrase, AND/OR/NOT,
 * prefix `*`). Raw column-filter / NEAR grammar is NOT exposed (PLAN §6/§11.5).
 */

/** Sanitize a user query into a safe FTS5 MATCH expression. */
export function sanitizeMatch(query) {
  const raw = String(query || '').trim();
  if (!raw) return '';
  // Tokenize on whitespace; keep quoted phrases; allow AND/OR/NOT keywords and trailing '*'.
  const tokens = [];
  const re = /"[^"]*"|\S+/g;
  let m;
  while ((m = re.exec(raw))) {
    let t = m[0];
    if (/^"[^"]*"$/.test(t)) {
      tokens.push(t); // quoted phrase — safe as-is
      continue;
    }
    const upper = t.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
      tokens.push(upper);
      continue;
    }
    // Strip everything except word chars, hyphen, and a single trailing prefix star.
    const star = t.endsWith('*');
    const cleaned = t.replace(/[^\p{L}\p{N}_-]/gu, '');
    if (!cleaned) continue;
    tokens.push('"' + cleaned + '"' + (star ? '*' : ''));
  }
  // Never leave a dangling boolean operator.
  while (tokens.length && ['AND', 'OR', 'NOT'].includes(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(' ');
}

export function search(db, repo, { query, type, tag, ticket_id, limit = 10 }) {
  const lim = Math.min(Math.max(1, limit | 0), 25); // ≤25 (PLAN §6)
  const match = sanitizeMatch(query);

  const filters = [];
  const params = {};
  if (type) {
    filters.push('n.type = @type');
    params.type = type;
  }
  if (ticket_id) {
    filters.push('n.ticket_id = @ticket_id');
    params.ticket_id = ticket_id;
  }
  if (tag) {
    filters.push("EXISTS (SELECT 1 FROM json_each(n.tags) WHERE value = @tag)");
    params.tag = tag;
  }
  // NOTE: there is deliberately NO status / ceremony-phase filter (PLAN §6/§2.2b) — that state
  // lives on the Board and is never a display copy we would read back.

  let rows;
  if (match) {
    const where = ['notes_fts MATCH @match', ...filters].join(' AND ');
    rows = db
      .prepare(
        `SELECT n.id AS note_id, n.path, n.title,
                snippet(notes_fts, 1, '', '', '…', 32) AS snippet,
                bm25(notes_fts) AS score
         FROM notes_fts JOIN note n ON n.rowid = notes_fts.rowid
         WHERE ${where}
         ORDER BY score LIMIT @limit`,
      )
      .all({ ...params, match, limit: lim });
  } else {
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    rows = db
      .prepare(
        `SELECT n.id AS note_id, n.path, n.title,
                substr(n.body,1,180) AS snippet, 0 AS score
         FROM note n ${where} ORDER BY n.updated DESC LIMIT @limit`,
      )
      .all({ ...params, limit: lim });
  }

  return rows.map((r) => ({
    note_id: r.note_id,
    path: r.path,
    title: r.title,
    snippet: r.snippet,
    score: r.score,
    taint: repo.taint(r.note_id).effective, // effective taint travels with the snippet
  }));
}
