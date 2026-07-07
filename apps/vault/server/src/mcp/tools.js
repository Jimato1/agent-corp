/*
 * mcp/tools.js — the near-empty agent surface (PLAN §5.1; contract §1). EXACTLY FOUR tools, all
 * vault:reference, all flat/low-arity/enum-or-string (D-17 schema ceiling; Vault is not spike-gated but
 * inherits it). The whitelist IS the surface.
 *
 * STRUCTURALLY ABSENT — NOT REGISTERED, by construction: any read/export/reveal/unwrap/rotate/sign tool;
 * the redeem endpoint (different network); the manage API. There is NO path by which an agent obtains
 * plaintext or redeems a handle. Enforcement is the per-call scope check + the physically absent
 * registration (RESEARCH §7). Business outcomes are isError structured content, never JSON-RPC errors.
 */
import { z } from 'zod';
import { BusinessError } from '../errors.js';

const opId = z.string().min(1).max(128);

export const TOOL_DEFS = {
  'vault_list_handles': {
    description: 'List credential handles (+ non-secret metadata) that a claimed ticket\'s host legitimately needs. Host-scoped via Board facts. Returns references only — never a secret value.',
    input: { ticket_id: z.string() },
  },
  'vault_describe_handle': {
    description: 'Describe one handle: {handle, host_id, kind, description, requires_approval_class}. No rotation/version markers, no timestamps, no value.',
    input: { handle: z.string() },
  },
  'vault_request_release': {
    description: 'Stage a powerless, NON-REDEEMABLE release (rel-…) for a handle on a ticket you have claimed. Returns {release_id, status:"pending", expires_at}. The release cannot be redeemed by you — only the Gateway redeems, under a consumed Board approval.',
    input: { ticket_id: z.string(), handle: z.string(), op_id: opId },
  },
  'vault_release_status': {
    description: 'Read a release\'s lifecycle status: pending | redeemed | expired | revoked. No redeemer identity, no timestamps.',
    input: { release_id: z.string() },
  },
};

export function makeHandlers({ handles, releases }, principal) {
  const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
  const guard = (fn) => async (args) => {
    try {
      const data = await fn(args);
      return ok(data);
    } catch (e) {
      if (e instanceof BusinessError) return { content: [{ type: 'text', text: e.code }], isError: true, structuredContent: e.toStructured() };
      throw e;
    }
  };
  return {
    'vault_list_handles': guard((a) => handles.listForTicket(a.ticket_id)),
    'vault_describe_handle': guard((a) => handles.describe(a.handle)),
    'vault_request_release': guard((a) => releases.requestRelease({ principal, ticketId: a.ticket_id, handle: a.handle, opId: a.op_id })),
    'vault_release_status': guard((a) => releases.releaseStatus(a.release_id)),
  };
}
