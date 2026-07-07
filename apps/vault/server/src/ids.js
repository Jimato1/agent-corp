/*
 * ids.js — the identifiers Vault mints/parses (context/specs/IDENTIFIERS.md, verbatim formats).
 *
 *  release_id = 'rel-' + ULID  (PINNED at Vault Stage-2). Opaque, non-redeemable, provably NOT an
 *    OpenBao token: Stage-5 invariant test presents a rel-… to any engine endpoint as a token → fails.
 *    Format is disjoint from OpenBao token formats (hvs./s./b.) by construction.
 *  handle = 'cred://hosts/<host_id>/<name>'  — a powerless application-level URI; consumers never parse
 *    it. Vault maps handle → {host_id, name} internally only.
 *  host_id — CMDB-minted lowercase DNS-safe slug; Vault stores it verbatim, never mints it.
 *  ticket_id 'T-…', approval_id 'A-…', run_id 'R-…' — foreign IDs, stored/compared verbatim (opaque).
 */
import { ulid } from 'ulid';

export function mintReleaseId() {
  return 'rel-' + ulid();
}

const REL_RE = /^rel-[0-9A-HJKMNP-TV-Z]{26}$/; // Crockford base32 ULID
export function isReleaseId(v) {
  return typeof v === 'string' && REL_RE.test(v);
}

const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/; // DNS-safe slug (IDENTIFIERS host_id)
const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const HANDLE_RE = /^cred:\/\/hosts\/([a-z0-9-]+)\/([A-Za-z0-9._-]+)$/;

export function makeHandle(hostId, name) {
  return `cred://hosts/${hostId}/${name}`;
}

/** Parse a handle into {host_id, name}, or null if malformed. Vault-internal use only. */
export function parseHandle(handle) {
  const m = HANDLE_RE.exec(String(handle || ''));
  if (!m) return null;
  const host_id = m[1];
  const name = m[2];
  if (!HOST_RE.test(host_id) || !NAME_RE.test(name)) return null;
  return { host_id, name };
}

export function isHostId(v) {
  return typeof v === 'string' && v.length <= 63 && HOST_RE.test(v);
}

/** Foreign-ID shape guards (opaque; we only sanity-check the prefix form, never fabricate). */
export function isTicketId(v) { return typeof v === 'string' && /^T-\d+$/.test(v); }
export function isApprovalId(v) { return typeof v === 'string' && /^A-\d+$/.test(v); }
