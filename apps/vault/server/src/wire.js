/*
 * wire.js — construct the service graph over one shared state (used by both index.js and the tests, so
 * they exercise the SAME wiring). Two views (MCP + UI) + the creds redeem seam, all over one wrapper
 * store + engine (the §8 invariant).
 */
import { AuditService } from './service/audit.js';
import { ReleaseService } from './service/releases.js';
import { HandleService } from './service/handles.js';
import { ManageService } from './service/manage.js';
import { RedeemService } from './service/redeem.js';

export function buildServices({ db, rs, revocation, engine, board, worm, chat, clock, config, logger }) {
  const audit = new AuditService({ db, worm, clock, logger });
  const releases = new ReleaseService({ db, board, clock, audit, config, logger });
  const handles = new HandleService({ db, board });
  const manage = new ManageService({ db, engine, audit, releases, revocation, clock, config, logger });
  const redeem = new RedeemService({ db, rs, revocation, board, engine, audit, releases, chat, clock, config, logger });
  return { audit, releases, handles, manage, redeem };
}
