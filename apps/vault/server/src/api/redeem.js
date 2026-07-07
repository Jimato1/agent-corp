/*
 * api/redeem.js — the creds-interface router (PLAN §4). Served ONLY on the creds mTLS listener
 * (VAULT_REDEEM_BIND), never on edge (§4 header, MI-8, §3.5 caveat 5). Two routes:
 *   POST /redeem            — the SoD seam (RedeemService pipeline)
 *   POST /releases/revoke   — the kill-chain "revoke outstanding leases" duty (G-4)
 *
 * STEP 0 (channel/cert) lives HERE: the request must have arrived over mTLS with a client cert that
 * chains to the suite-internal CA and identifies the Gateway; the cert's SHA-256 thumbprint is the value
 * the token's cnf.x5t#S256 must equal (§4.5). In devUnsafe the harness supplies these via headers so the
 * reject-path tests exercise the SAME code — the checks are never bypassed, only their inputs are stubbed.
 */
import express from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { RedeemError } from '../errors.js';
import { REDEEM, ACTION_CLASS } from '../constants.js';
import { config } from '../config.js';

const RedeemReq = z.object({
  release_id: z.string(),
  ticket_id: z.string(),
  approval_id: z.string(),
  host_id: z.string(),
  plan_hash: z.string(),
  run_id: z.string().optional(),
  op_id: z.string().min(1).max(128),
  ssh_public_key: z.string().optional(),
  traceparent: z.string().optional(),
}).strict();

/** Extract the verified channel facts from the mTLS peer cert (prod) or the dev stub (tests). */
function channelFacts(req) {
  if (config.devUnsafeNoAuth) {
    const cn = req.headers['x-creds-client-cn'] || null;
    const thumb = req.headers['x-creds-thumbprint'] || null;
    return { channelOk: cn === config.gatewayClientCn, channelCn: cn, channelThumbprint: thumb };
  }
  const sock = req.socket;
  if (!sock || typeof sock.getPeerCertificate !== 'function' || !sock.authorized) return { channelOk: false, channelCn: null, channelThumbprint: null };
  const cert = sock.getPeerCertificate(true);
  if (!cert || !cert.raw) return { channelOk: false, channelCn: null, channelThumbprint: null };
  const cn = cert.subject?.CN || null;
  const sanOk = (cert.subjectaltname || '').includes(config.gatewayClientCn);
  const cnOk = cn === config.gatewayClientCn || sanOk;
  const thumb = createHash('sha256').update(cert.raw).digest('base64url'); // x5t#S256 (base64url, unpadded)
  return { channelOk: !!cnOk, channelCn: cn, channelThumbprint: thumb };
}

export function buildRedeemRouter({ redeem, releases, budget, audit, logger }) {
  const router = express.Router();
  router.use(express.json({ limit: '256kb' }));

  // Concurrency ceiling on the creds surface (auth §1 / M-11): key on the cert-verified Gateway principal.
  const ceiling = budget.middleware(ACTION_CLASS.DESTRUCTIVE_EXEC);
  const withPrincipal = (req, res, next) => { req.principal = { sub: config.gatewayClientCn, kind: 'service' }; next(); };

  router.post('/redeem', withPrincipal, ceiling, async (req, res) => {
    const ctx = { ...channelFacts(req), token: req.headers['authorization']?.replace(/^Bearer\s+/i, '') || 'dev' };
    if (config.devUnsafeNoAuth) {
      try { ctx.tokenClaims = req.headers['x-dev-claims'] ? JSON.parse(req.headers['x-dev-claims']) : (req.body.__claims || null); } catch { ctx.tokenClaims = null; }
    }
    // shape validation (cheap, before any expensive check). Strip the dev-only __claims stub first.
    const rawBody = { ...(req.body || {}) };
    delete rawBody.__claims;
    const parsed = RedeemReq.safeParse(rawBody);
    if (!parsed.success) return res.status(REDEEM.BAD_REQUEST.http).json({ code: REDEEM.BAD_REQUEST.code, retry: REDEEM.BAD_REQUEST.retry });
    try {
      const out = await redeem.redeem({ ctx, req: parsed.data });
      return res.status(out.http).json(out.body);
    } catch (e) {
      if (e instanceof RedeemError) return res.status(e.httpStatus).json(e.body());
      logger?.error?.('redeem_internal', { err: String(e.stack || e) });
      return res.status(500).json({ code: 'internal', retry: 'later' });
    }
  });

  // G-4: revoke all pending releases for a ticket (kill-chain / Gateway). Honesty carve-out: this revokes
  // PENDING releases only; an already-issued SSH cert dies only by TTL/KRL (contract §4).
  router.post('/releases/revoke', withPrincipal, ceiling, (req, res) => {
    const ch = channelFacts(req);
    if (!ch.channelOk) return res.status(403).json({ code: 'not_gateway_channel', retry: 'never' });
    const ticketId = req.body?.ticket_id;
    if (!ticketId) return res.status(400).json({ code: 'bad_request', retry: 'never' });
    const out = releases.revokeByTicket(ticketId, config.gatewayClientCn);
    return res.status(200).json({ ...out, note: 'pending releases revoked; issued certs remain valid to TTL/KRL' });
  });

  return router;
}
