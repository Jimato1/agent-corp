/*
 * core/plan-parse.js — extract the machine-readable playbook-invocation list from a plan-slice note.
 *
 * The planning-note template (joint contract board-notes-ceremony.md, §19) mandates a FENCED,
 * machine-readable section. Format frozen by the Board producer side:
 *
 *   ```board-allowlist
 *   [
 *     { "playbook_key": "nginx.upgrade",   "params": { "version": "1.27.3" }, "host_id": "web-prod-02" },
 *     { "playbook_key": "service.restart", "params": { "unit": "nginx" },      "host_id": "web-prod-02" }
 *   ]
 *   ```
 *
 * A plan that cannot be allowlisted cannot be approved (§8.1). This parser is used as a GATE at
 * proposal; at grant the SAME parse runs over the EXACT hashed bytes (never over a cached copy) so the
 * allowlist rows and plan_hash bind to one identical byte sequence (§2.5).
 */
import { ERR } from '../constants.js';
import { biz } from '../errors.js';

const FENCE = /```board-allowlist\s*\n([\s\S]*?)\n```/;

export function parsePlaybookInvocations(bytes) {
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes || '');
  const m = FENCE.exec(text);
  if (!m) throw biz(ERR.PLAN_UNPARSEABLE, 'plan slice has no ```board-allowlist``` invocation list');
  let arr;
  try {
    arr = JSON.parse(m[1]);
  } catch {
    throw biz(ERR.PLAN_UNPARSEABLE, 'board-allowlist block is not valid JSON');
  }
  if (!Array.isArray(arr) || arr.length === 0) throw biz(ERR.PLAN_UNPARSEABLE, 'board-allowlist must be a non-empty array');
  return arr.map((inv, i) => {
    if (!inv || typeof inv.playbook_key !== 'string' || !inv.playbook_key) {
      throw biz(ERR.PLAN_UNPARSEABLE, `invocation ${i} missing playbook_key`);
    }
    return { seq: i + 1, playbook_key: inv.playbook_key, params: inv.params ?? {}, host_id: inv.host_id ?? null };
  });
}
