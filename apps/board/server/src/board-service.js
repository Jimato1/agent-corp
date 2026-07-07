/*
 * board-service.js — the ONE core the three faces share (PLAN §0). The MCP surface, the HTTP/UI
 * surface, and the internal processes (reaper, watchdog, cron, tier-approver) all call THIS service
 * over one SQLite store. Two views, one state.
 *
 * Composition root: constructs every engine with a shared { db, tx, clock, audit, guardrails, clients }
 * and dependency-injects them. Nothing here holds business logic — it wires and delegates.
 */
import { makeTx } from './db/tx.js';
import { Audit } from './service/audit.js';
import { Guardrails } from './service/guardrails.js';
import { ClaimEngine } from './service/claim.js';
import { ApprovalEngine } from './service/approval.js';
import { Transitions } from './service/transitions.js';
import { Tickets } from './service/tickets.js';
import { Facts } from './service/facts.js';
import { Kickoffs } from './service/kickoffs.js';
import { Ceremony } from './service/ceremony.js';
import { TierApprover } from './service/tier-approver.js';
import { Backup } from './service/backup.js';

export class BoardService {
  constructor({ db, clock, config, emitter, clients, logger }) {
    this.db = db;
    this.clock = clock;
    this.config = config;
    this.emitter = emitter;
    this.clients = clients;
    this.log = logger;

    this.tx = makeTx(db, emitter);
    const notify = (payload) => { try { clients.chat.postEscalation(payload); } catch { /* best-effort */ } };

    this.audit = new Audit({ db, clock });
    this.guardrails = new Guardrails({ db, clock, config });
    this.guardrails.seedDefaults();

    this.claim = new ClaimEngine({ db, tx: this.tx, clock, audit: this.audit, guardrails: this.guardrails, config, notify });
    this.tickets = new Tickets({ db, tx: this.tx, clock, audit: this.audit, config });
    this.approval = new ApprovalEngine({ db, tx: this.tx, clock, audit: this.audit, guardrails: this.guardrails, claim: this.claim, clients, config });
    this.transitions = new Transitions({ db, tx: this.tx, clock, audit: this.audit, claim: this.claim, approval: this.approval });
    this.facts = new Facts({ db });
    this.kickoffs = new Kickoffs({ db, tx: this.tx, clock, audit: this.audit, tickets: this.tickets, clients, config, notify });
    this.ceremony = new Ceremony({ db, tx: this.tx, clock, audit: this.audit, tickets: this.tickets, claim: this.claim, clients, config, notify });
    this.tierApprover = new TierApprover({ db, approval: this.approval, guardrails: this.guardrails, config, clock, logger });
    this.backup = new Backup({ db, clock, config, audit: this.audit, logger });
  }

  // --- convenience passthroughs used by both surfaces ---------------------------------------------
  getTicket(ref) { return this.tickets.get(ref); }
  getApproval(ref) { return this.approval.getApproval(ref); }
  query(args) { return this.tickets.query(args); }

  // agent-caused transition also couples the huddle pause on -> blocked (mid-huddle lifecycle, §14.2).
  async agentTransition(args) {
    const res = await this.transitions.agentTransition(args);
    if (args.toStatus === 'blocked') { try { this.ceremony.pause(args.ticketId, 'blocked'); } catch { /* no huddle */ } }
    return res;
  }
}
