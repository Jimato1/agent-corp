/*
 * hygiene.js — write-path secret-material deny-scan (PLAN §11.4).
 *
 * Binding data-hygiene rule (vault-gateway-redemption.md §1): reject obvious credential material.
 * `release_id` (rel-…) and `cred://` handles are EXPLICITLY ALLOWED — powerless by contract.
 *
 * CRITICAL (PLAN §11.4): the rejection carries pattern class + offsets + a SALTED HASH only. The
 * matched content is NEVER returned, logged, or persisted — otherwise the scan itself would copy
 * the credential into the very logs the Vault contract bans it from. Best-effort defense-in-depth.
 */
import { createHmac } from 'node:crypto';

// Per-process salt so a hash cannot be dictionary-reversed across deployments.
const SALT = process.env.NOTES_HYGIENE_SALT || 'notes-hygiene-ephemeral';

const PATTERNS = [
  { cls: 'openbao_token', re: /\b[sb]\.[A-Za-z0-9]{24,}\b/g }, // Vault/OpenBao service/batch token shapes
  { cls: 'hvs_token', re: /\bhv[sb]\.[A-Za-z0-9._-]{20,}\b/g },
  { cls: 'private_key_block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { cls: 'aws_access_key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { cls: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { cls: 'generic_secret_assignment', re: /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["']?[^\s"']{12,}/gi },
];

// Powerless handles that are explicitly allowed to appear in note content.
const ALLOWLIST = [/\bcred:\/\/[^\s)]+/g, /\brel-[0-9A-HJKMNP-TV-Z]{26}\b/g];

function stripAllowed(text) {
  let t = text;
  for (const re of ALLOWLIST) t = t.replace(re, ' ');
  return t;
}

/**
 * Scan content. Returns { ok: true } or { ok: false, patternClass, offsets, saltedHash }.
 * The offending substring is hashed, never surfaced.
 */
export function scanForSecrets(content) {
  const text = stripAllowed(String(content));
  for (const { cls, re } of PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) {
      const saltedHash = createHmac('sha256', SALT).update(m[0]).digest('hex').slice(0, 16);
      return { ok: false, patternClass: cls, offsets: [m.index, m.index + m[0].length], saltedHash };
    }
  }
  return { ok: true };
}
