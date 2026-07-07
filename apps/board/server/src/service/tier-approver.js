/*
 * service/tier-approver.js — svc:tier-approver as an INTERNAL Board process (D-15; PLAN §13).
 *
 * Registered but NON-ACTIVATABLE until auth's compiled HOLDER_ALLOWED_KINDS[board:approve] admits
 * kind=service. Ships behind BOARD_TIER_APPROVER_ENABLED (default OFF) — until auth's kind-table
 * change lands, ALL approvals are operator-granted (a safe degradation; the human gate stays
 * universal). When enabled it auto-clears awaiting_approval tickets by calling approval.grant with
 * approver_kind='tier_policy' — which the grant path already gates by the auto-approve floor (§8.2):
 * destructive/irreversible derived class, tainted inputs, or no fresh in-window auto verdict all
 * REFUSE the tier path, so a mis-fired tier-approver can never launder a destructive plan.
 */
import { STATES, APPROVER_KIND } from '../constants.js';

export class TierApprover {
  constructor({ db, approval, guardrails, config, clock, logger }) {
    this.db = db;
    this.approval = approval;
    this.guardrails = guardrails;
    this.config = config;
    this.clock = clock;
    this.log = logger;
    this.sub = 'svc:tier-approver';
    this._timer = null;
  }

  enabled() {
    return this.config.tierApproverEnabled;
  }

  /** One pass: try auto-tier grant on each awaiting_approval ticket. Fail-safe (any refusal is fine). */
  async sweep() {
    if (!this.enabled()) return { granted: 0, skipped: 'disabled' };
    if (this.guardrails.destructiveFrozen()) return { granted: 0, skipped: 'kill_frozen' }; // G1 halts the auto-lane
    const rows = this.db.prepare(`SELECT id, taint_host_originated FROM tickets WHERE status = 'awaiting_approval'`).all();
    let granted = 0;
    for (const r of rows) {
      // Curation/host-originated taint => never auto-lane eligible; skip early (grant would refuse anyway).
      if (r.taint_host_originated) continue;
      try {
        await this.approval.grant({ principal: { sub: this.sub, kind: 'service' }, ticketId: r.id, approverKind: APPROVER_KIND.TIER_POLICY, surface: 'internal' });
        granted++;
      } catch (e) {
        // AUTO_APPROVE_FORBIDDEN / DEP_UNAVAILABLE / FOUR_EYES etc. are expected — leave for the operator.
      }
    }
    return { granted };
  }

  start(intervalMs = 15000) {
    if (!this.enabled() || this._timer) return;
    this._timer = setInterval(() => this.sweep().catch((e) => this.log?.warn?.('tier_approver_sweep_failed', { err: String(e) })), intervalMs);
    if (this._timer.unref) this._timer.unref();
  }
  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
}
