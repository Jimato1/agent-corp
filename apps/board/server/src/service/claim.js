/*
 * service/claim.js — THE claim engine (FROZEN contract board-agents-claim.md §1-3; PLAN §3-§5).
 *
 * ONE atomic transaction (BEGIN IMMEDIATE) per claim: status-guarded CAS todo->in_progress + resource
 * (host) lock + lease grant + Board-minted MONOTONIC per-resource fencing token (lock_generation),
 * with dependency-readiness, WIP caps, lineage cap, ceremony gate, and kill level all enforced
 * inside the claim. Failures are BUSINESS OUTCOMES (isError structured content), never protocol
 * errors. Delivery is at-least-once; every consumer keys idempotency on (ticket_id, fencing_token, op_id).
 *
 * The Board is the SINGLE fencing minter. lock_generation is incremented on every acquisition (claim
 * or execution hold) AND every release (reap, voluntary, outcome) — never decremented, never reset.
 * The mutex is DATA (D-14): a lock is acquirable ONLY when claimed_by_ticket IS NULL; expired leases
 * are freed EXCLUSIVELY by the reaper (holder-guarded) — there is NO steal-at-claim branch, so the
 * claim/steal/reap triangle cannot race.
 */
import { STATES, ERR, CHILD_CLASS, KILL } from '../constants.js';
import { biz } from '../errors.js';

const PHASE_RANK = `CASE %COL% WHEN 'triage' THEN 0 WHEN 'recon' THEN 1 WHEN 'planning' THEN 2
  WHEN 'adversarial_review' THEN 3 WHEN 'backlog' THEN 4 WHEN 'execute' THEN 5 WHEN 'retro' THEN 6 ELSE -1 END`;

// A prerequisite is satisfied when the blocker reached a non-blocking terminal (done or cancelled).
const DEPS_READY = `NOT EXISTS (
  SELECT 1 FROM ticket_deps d JOIN tickets b ON b.id = d.depends_on_id
  WHERE d.ticket_id = t.id AND b.status NOT IN ('done','cancelled'))`;

// Ceremony gate scoped exactly to the spec's child-execution ticket (§3): execution children need
// parent phase >= backlog; recon children need parent phase >= recon; general children ungated.
const CEREMONY_GATE = `(
  t.child_class = 'general'
  OR (t.child_class = 'recon' AND (${PHASE_RANK.replace('%COL%', 'p.ceremony_phase')}) >= 1)
  OR (t.child_class = 'execution' AND (${PHASE_RANK.replace('%COL%', 'p.ceremony_phase')}) >= 4))`;

const HOST_FREE = `(t.host_id IS NULL OR hl.claimed_by_ticket IS NULL)`;

export class ClaimEngine {
  constructor({ db, tx, clock, audit, guardrails, config, notify }) {
    this.db = db;
    this.tx = tx;
    this.clock = clock;
    this.audit = audit;
    this.guardrails = guardrails;
    this.config = config;
    this.notify = notify || (() => {});

    this._getTicket = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
    this._candidate = db.prepare(`
      SELECT t.* FROM tickets t
      LEFT JOIN host_locks hl ON hl.resource_id = t.host_id
      LEFT JOIN tickets p ON p.id = t.parent_id
      WHERE t.status = 'todo' AND t.quarantine = 0 AND t.held = 0
        AND ${DEPS_READY} AND ${CEREMONY_GATE} AND ${HOST_FREE}
        AND t.lineage_depth <= @maxDepth
        AND (@team IS NULL OR t.team = @team)
        AND (@type IS NULL OR t.type = @type)
      ORDER BY t.priority ASC, t.created_at ASC
      LIMIT 1`);
    this._depsReady = db.prepare(`SELECT ${DEPS_READY.replace(/t\.id/g, '@tid')} AS ready`);
    this._parentPhase = db.prepare(`SELECT ceremony_phase FROM tickets WHERE id = ?`);
    this._lockGet = db.prepare(`SELECT * FROM host_locks WHERE resource_id = ?`);
    this._lockAcquire = db.prepare(`
      INSERT INTO host_locks (resource_id, resource_kind, claimed_by_ticket, claimed_by_agent, hold_kind, lease_expires_at, lock_generation)
      VALUES (@rid, @rkind, @tid, @sub, 'claim', @exp, 1)
      ON CONFLICT(resource_id) DO UPDATE SET
        claimed_by_ticket = @tid, claimed_by_agent = @sub, hold_kind = 'claim', lease_expires_at = @exp,
        lock_generation = host_locks.lock_generation + 1
      WHERE host_locks.claimed_by_ticket IS NULL
      RETURNING lock_generation`);
    this._ticketClaim = db.prepare(`
      UPDATE tickets SET status = 'in_progress', claimed_by = @sub, claimed_at = @iso,
        lease_expires_at = @exp, lease_renewals = 0, fencing_token = @gen, version = version + 1, updated_at = @iso
      WHERE id = @tid AND status = 'todo' AND quarantine = 0 AND held = 0`);
    this._lockReleaseHolder = db.prepare(`
      UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL,
        lease_expires_at = NULL, lock_generation = lock_generation + 1
      WHERE resource_id = @rid AND claimed_by_ticket = @tid`);
    this._heartbeatLock = db.prepare(`UPDATE host_locks SET lease_expires_at = @exp WHERE resource_id = @rid AND claimed_by_ticket = @tid`);
    this._heartbeatTicket = db.prepare(`UPDATE tickets SET lease_expires_at = @exp, lease_renewals = lease_renewals + 1, updated_at = @iso WHERE id = @tid`);
    this._releaseTicket = db.prepare(`UPDATE tickets SET status = 'todo', claimed_by = NULL, claimed_at = NULL, lease_expires_at = NULL, fencing_token = NULL, updated_at = @iso WHERE id = @tid AND status = 'in_progress'`);
    this._reapExpired = db.prepare(`SELECT hl.*, t.wall_clock_cap_at, t.status AS tstatus, t.held AS held FROM host_locks hl
      JOIN tickets t ON t.id = hl.claimed_by_ticket
      WHERE hl.hold_kind = 'claim' AND hl.lease_expires_at IS NOT NULL`);
  }

  resourceIdFor(ticket) {
    return ticket.host_id ? ticket.host_id : `ticket:${ticket.id}`;
  }
  resourceKindFor(ticket) {
    return ticket.host_id ? 'host' : 'ticket';
  }

  currentGeneration(resourceId) {
    const row = this._lockGet.get(resourceId);
    return row ? row.lock_generation : 0;
  }

  // --- claim (both claim_next and targeted) --------------------------------------------------------
  claim({ principal, ticketId = null, role, team = null, type = null, opId, surface = 'mcp', traceparent }) {
    const sub = principal.sub;
    const requestHash = JSON.stringify({ op: 'claim', ticketId, team, type });
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(sub, opId, requestHash);
      if (dedup.replay) {
        // claim replay: re-verify current ownership; never assert affirmatively-stale ownership (§2.8).
        return this._replayClaim(dedup.response, sub);
      }
      // Kill G2: no new claims.
      if (this.guardrails.claimsQuiesced()) throw biz(ERR.QUIESCED, 'G2 quiesce-all — no new claims');

      let ticket;
      if (ticketId != null) {
        ticket = this._selectTargeted(ticketId, sub, team);
      } else {
        // claim_next: WIP gate first so an at-cap agent gets WIP_CAP, not NO_ELIGIBLE_WORK.
        const wip = this.guardrails.wipOk({ sub, team });
        if (!wip.ok) throw biz(ERR.WIP_CAP, `WIP cap (${wip.scope})`, { scope: wip.scope, cap: wip.cap });
        ticket = this._candidate.get({ maxDepth: this.guardrails.maxLineageDepth(), team, type });
        if (!ticket) return { code: ERR.NO_ELIGIBLE_WORK };
        // Re-check WIP against the candidate's team (per_team cap).
        const wip2 = this.guardrails.wipOk({ sub, team: ticket.team });
        if (!wip2.ok) throw biz(ERR.WIP_CAP, `WIP cap (${wip2.scope})`, { scope: wip2.scope, cap: wip2.cap });
      }
      return this._doClaim(ctx, ticket, principal, opId, requestHash, surface, traceparent);
    });
  }

  _selectTargeted(ticketId, sub, team) {
    const t = this._getTicket.get(ticketId);
    if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found', { ticket_id: ticketId });
    if (t.status !== STATES.TODO || t.quarantine || t.held) {
      throw biz(ERR.CLAIM_CONFLICT, 'ticket not claimable', { current_owner: t.claimed_by, ticket_version: t.version, status: t.status });
    }
    // dependency-ready
    const ready = this._depsReady.get({ tid: ticketId }).ready;
    if (!ready) throw biz(ERR.DEP_UNMET, 'unmet dependency');
    // ceremony gate
    if (t.parent_id && (t.child_class === CHILD_CLASS.EXECUTION || t.child_class === CHILD_CLASS.RECON)) {
      const parentPhase = this._parentPhase.get(t.parent_id)?.ceremony_phase;
      const floor = t.child_class === CHILD_CLASS.EXECUTION ? 4 : 1;
      if (rankOf(parentPhase) < floor) throw biz(ERR.CLAIM_CONFLICT, 'ceremony gate: parent phase too early', { child_class: t.child_class, parent_phase: parentPhase });
    }
    // lineage
    if (t.lineage_depth > this.guardrails.maxLineageDepth()) {
      throw biz(ERR.LINEAGE_CAP, 'lineage depth over cap', { lineage_depth: t.lineage_depth, cap: this.guardrails.maxLineageDepth() });
    }
    // WIP
    const wip = this.guardrails.wipOk({ sub, team: t.team ?? team });
    if (!wip.ok) throw biz(ERR.WIP_CAP, `WIP cap (${wip.scope})`, { scope: wip.scope, cap: wip.cap });
    return t;
  }

  _doClaim(ctx, ticket, principal, opId, requestHash, surface, traceparent) {
    const sub = principal.sub;
    const iso = this.clock.iso();
    const exp = this.clock.now() + this.config.leaseTtlMs;
    const rid = this.resourceIdFor(ticket);
    // 1. Acquire the resource lock (guarded WHERE claimed_by_ticket IS NULL). Zero rows => host busy.
    const acq = this._lockAcquire.get({ rid, rkind: this.resourceKindFor(ticket), tid: ticket.id, sub, exp });
    if (!acq) throw biz(ERR.HOST_LOCKED, 'resource lock held', { host_id: ticket.host_id, resource_id: rid });
    const gen = acq.lock_generation;
    // 2. CAS the ticket. Zero rows => lost race.
    const upd = this._ticketClaim.run({ sub, iso, exp, gen, tid: ticket.id });
    if (upd.changes === 0) throw biz(ERR.CLAIM_CONFLICT, 'lost claim race', { ticket_id: ticket.id });
    // 3. Set wall-clock cap if unset (max-renewal watchdog input).
    if (!ticket.wall_clock_cap_at) {
      this.db.prepare(`UPDATE tickets SET wall_clock_cap_at = ? WHERE id = ?`).run(this.clock.now() + this.config.wallClockCapMs, ticket.id);
    }
    const response = { ticket_id: ticket.id, host_id: ticket.host_id, fencing_token: gen, lease_expires_at: exp, ticket_version: ticket.version + 1 };
    this.audit.record({ actor_sub: sub, surface, action: 'claim', ticket_id: ticket.id, from_state: 'todo', to_state: 'in_progress', op_id: opId, fencing_token: gen, traceparent });
    this.audit.recordOp(sub, opId, requestHash, response);
    ctx.emit('ticket', { ticket_id: ticket.id, action: 'claim', status: 'in_progress' });
    return response;
  }

  _replayClaim(stored, sub) {
    // Ownership re-check: if the lease was reaped/re-granted since, don't assert stale ownership.
    const t = this._getTicket.get(stored.ticket_id);
    if (!t || t.claimed_by !== sub || t.fencing_token !== stored.fencing_token) {
      throw biz(ERR.STALE_FENCING, 'claim replay: lease no longer held', { ticket_id: stored.ticket_id });
    }
    return stored;
  }

  // --- heartbeat -----------------------------------------------------------------------------------
  heartbeat({ principal, ticketId, fencingToken, progressNote, opId, surface = 'mcp' }) {
    const sub = principal.sub;
    const requestHash = JSON.stringify({ op: 'heartbeat', ticketId, fencingToken });
    return this.tx.immediate(() => {
      const dedup = this.audit.checkOp(sub, opId, requestHash);
      const t = this._getTicket.get(ticketId);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found', { ticket_id: ticketId });
      const rid = this.resourceIdFor(t);
      const lock = this._lockGet.get(rid);
      // Reaped (freed) or re-granted => the ticket is not yours (crash-restart rule).
      if (!lock || lock.claimed_by_ticket !== ticketId || lock.claimed_by_agent !== sub) {
        throw biz(ERR.STALE_FENCING, 'heartbeat: lease no longer held', { ticket_id: ticketId });
      }
      if (fencingToken != null && Number(fencingToken) !== lock.lock_generation) {
        throw biz(ERR.STALE_FENCING, 'heartbeat: stale fencing token', { ticket_id: ticketId, current: lock.lock_generation });
      }
      if (dedup.replay) return dedup.response; // already beat with this op_id; ownership re-checked above
      const exp = this.clock.now() + this.config.leaseTtlMs;
      this._heartbeatLock.run({ rid, tid: ticketId, exp });
      this._heartbeatTicket.run({ tid: ticketId, exp, iso: this.clock.iso() });
      if (progressNote) this.db.prepare(`UPDATE meta SET v = ? WHERE k = ?`).run(String(progressNote).slice(0, 2000), `progress:${ticketId}`);
      const response = { ticket_id: ticketId, fencing_token: lock.lock_generation, lease_expires_at: exp };
      this.audit.recordOp(sub, opId, requestHash, response);
      return response;
    });
  }

  // --- voluntary release (amendment A-VR; frozen contract §4) ---------------------------------------
  release({ principal, ticketId, fencingToken, reason, opId, surface = 'mcp' }) {
    const sub = principal.sub;
    const requestHash = JSON.stringify({ op: 'release', ticketId, fencingToken });
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(sub, opId, requestHash);
      if (dedup.replay) return dedup.response;
      const t = this._getTicket.get(ticketId);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found', { ticket_id: ticketId });
      const rid = this.resourceIdFor(t);
      const lock = this._lockGet.get(rid);
      if (!lock || lock.claimed_by_ticket !== ticketId || lock.claimed_by_agent !== sub) throw biz(ERR.NOT_HOLDER, 'not the lease holder');
      if (fencingToken != null && Number(fencingToken) !== lock.lock_generation) throw biz(ERR.STALE_FENCING, 'stale fencing token', { current: lock.lock_generation });
      this._releaseTicket.run({ tid: ticketId, iso: this.clock.iso() });
      this._lockReleaseHolder.run({ rid, tid: ticketId }); // generation++ immediately (a released token must never remain live)
      this.db.prepare(`UPDATE tickets SET version = version + 1, updated_at = ? WHERE id = ?`).run(this.clock.iso(), ticketId);
      const response = { ticket_id: ticketId, status: 'todo', released: true };
      this.audit.record({ actor_sub: sub, surface, action: 'release', ticket_id: ticketId, from_state: 'in_progress', to_state: 'todo', op_id: opId, fields_changed: { reason } });
      this.audit.recordOp(sub, opId, requestHash, response);
      ctx.emit('ticket', { ticket_id: ticketId, action: 'release', status: 'todo' });
      return response;
    });
  }

  // --- the reaper (sole lease-expiry path) + outage-aware population gate (§4) ----------------------
  reaperSweep() {
    return this.tx.immediate((ctx) => {
      const now = this.clock.now();
      const locks = this._reapExpired.all();
      const expired = locks.filter((l) => l.held === 0 && l.lease_expires_at < now && l.tstatus === STATES.IN_PROGRESS);
      const liveWallCapped = locks.filter((l) => l.held === 0 && l.lease_expires_at >= now && l.wall_clock_cap_at && l.wall_clock_cap_at < now && l.tstatus === STATES.IN_PROGRESS);

      // Max-renewal / wall-clock cap fires ONLY on a LIVE lease (A1 board_escalation, §4). An expired
      // lease is the reaper's to requeue — the two sweeps never race to different outcomes on one ticket.
      for (const l of liveWallCapped) {
        this._escalateA1(ctx, l.claimed_by_ticket, 'max_renewal_cap', l.resource_id);
      }

      if (expired.length === 0) return { reaped: 0, wall_capped: liveWallCapped.length, held: 0 };

      // Outage-aware population gate (gap 4.4). Drain/kill window bypasses entirely (two-wires rule).
      if (!this.guardrails.inDrainWindow()) {
        const windowStart = now - this.config.outageWindowMs;
        const inWindowAgents = new Set(locks.filter((l) => (l.lease_expires_at ?? 0) >= windowStart).map((l) => l.claimed_by_agent).filter(Boolean));
        if (inWindowAgents.size >= this.config.outageGateMinAgents) {
          const expiredAgents = new Set(expired.map((l) => l.claimed_by_agent).filter(Boolean));
          const fraction = expiredAgents.size / Math.max(1, this.config.fleetSize);
          if (fraction > this.config.outageGateThreshold) {
            // TRIP: hold (do not requeue), file ONE fleet-level anomaly. Held tickets never silently requeue.
            const held = [];
            for (const l of expired) {
              this.db.prepare(`UPDATE tickets SET held = 1, held_reason = 'fleet_outage_hold', updated_at = ? WHERE id = ?`).run(this.clock.iso(), l.claimed_by_ticket);
              held.push(l.claimed_by_ticket);
            }
            this.audit.record({ surface: 'internal', action: 'fleet_outage_hold', outcome: 'ok', fields_changed: { held_count: held.length, fraction, fleet_size: this.config.fleetSize } });
            ctx.emit('escalation', { kind: 'fleet_anomaly', held_count: held.length, fraction });
            this.notify({ type: 'fleet_anomaly', held_count: held.length, fraction });
            return { reaped: 0, wall_capped: liveWallCapped.length, held: held.length, outage_hold: true };
          }
        }
      }

      // Normal reap: one atomic requeue per expired lease (contract §2).
      let reaped = 0;
      const reapedIds = [];
      for (const l of expired) {
        const rel = this._lockReleaseHolder.run({ rid: l.resource_id, tid: l.claimed_by_ticket }); // generation++
        if (rel.changes === 0) continue; // state moved under us => no-op (never clobber a lock we don't own)
        this._releaseTicket.run({ tid: l.claimed_by_ticket, iso: this.clock.iso() });
        this.db.prepare(`UPDATE tickets SET version = version + 1, updated_at = ? WHERE id = ?`).run(this.clock.iso(), l.claimed_by_ticket);
        this.audit.record({ surface: 'internal', action: 'reap', ticket_id: l.claimed_by_ticket, from_state: 'in_progress', to_state: 'todo', fencing_token: l.lock_generation + 1 });
        ctx.emit('ticket', { ticket_id: l.claimed_by_ticket, action: 'reap', status: 'todo' });
        reaped++;
        reapedIds.push(l.claimed_by_ticket);
      }
      return { reaped, reaped_ids: reapedIds, wall_capped: liveWallCapped.length, held: 0 };
    });
  }

  // A1 board_escalation: in_progress -> needs_review (watchdog-only; carries machine_reason). Releases lock.
  _escalateA1(ctx, ticketId, reason, resourceId) {
    const t = this._getTicket.get(ticketId);
    if (!t || t.status !== STATES.IN_PROGRESS) return;
    this.db.prepare(`UPDATE tickets SET status = 'needs_review', machine_reason = ?, claimed_by = NULL, lease_expires_at = NULL, fencing_token = NULL, version = version + 1, updated_at = ? WHERE id = ?`)
      .run(reason, this.clock.iso(), ticketId);
    if (resourceId) this._lockReleaseHolder.run({ rid: resourceId, tid: ticketId });
    this.audit.record({ surface: 'internal', action: 'board_escalation', ticket_id: ticketId, from_state: 'in_progress', to_state: 'needs_review', fields_changed: { machine_reason: reason } });
    ctx.emit('escalation', { kind: 'board_escalation', ticket_id: ticketId, machine_reason: reason });
    this.notify({ type: 'board_escalation', ticket_id: ticketId, machine_reason: reason });
  }

  /** Operator/auto clear of an outage hold — per-ticket fencing re-check, then requeue (§4). */
  clearOutageHold(ticketId) {
    return this.tx.immediate((ctx) => {
      const t = this._getTicket.get(ticketId);
      if (!t || !t.held) return { cleared: false };
      const rid = this.resourceIdFor(t);
      this._lockReleaseHolder.run({ rid, tid: ticketId }); // generation++ (fencing re-check on re-entry)
      this.db.prepare(`UPDATE tickets SET held = 0, held_reason = NULL, status = 'todo', claimed_by = NULL, lease_expires_at = NULL, fencing_token = NULL, version = version + 1, updated_at = ? WHERE id = ?`).run(this.clock.iso(), ticketId);
      this.audit.record({ surface: 'internal', action: 'clear_outage_hold', ticket_id: ticketId, to_state: 'todo' });
      ctx.emit('ticket', { ticket_id: ticketId, action: 'clear_hold', status: 'todo' });
      return { cleared: true };
    });
  }
}

function rankOf(phase) {
  return { triage: 0, recon: 1, planning: 2, adversarial_review: 3, backlog: 4, execute: 5, retro: 6 }[phase] ?? -1;
}
