/*
 * service/guardrails.js — WIP caps, lineage caps, kill epoch (PLAN §11).
 *
 * WIP + lineage are enforced INSIDE the claim transaction (§3) — a claim that would breach any cap
 * fails atomically. The kill epoch mirrors auth's revocation channel (killswitch-chain.md): G1
 * freeze-destructive (approval mint + consume suspended), G2 quiesce-all (also no new claims). The
 * MC-read WIP write surface lives here (svc:mc / operator, board:admin).
 */
import { KILL } from '../constants.js';

export class Guardrails {
  constructor({ db, clock, config }) {
    this.db = db;
    this.clock = clock;
    this.config = config;
    this._wipCountAgent = db.prepare(`SELECT COUNT(*) n FROM tickets WHERE claimed_by = ? AND status = 'in_progress'`);
    this._wipCountGlobal = db.prepare(`SELECT COUNT(*) n FROM tickets WHERE status = 'in_progress'`);
    this._wipCountTeam = db.prepare(`SELECT COUNT(*) n FROM tickets WHERE team = ? AND status = 'in_progress'`);
    this._wipGet = db.prepare(`SELECT cap FROM wip_policy WHERE scope = ? AND (subject IS ? OR subject = ?)`);
    this._lineage = db.prepare(`SELECT max_depth FROM lineage_policy WHERE id = 1`);
    this._authGet = db.prepare(`SELECT last_epoch, level, drain_window_started_at, updated_at FROM auth_state WHERE id = 1`);
    this._authSet = db.prepare(`UPDATE auth_state SET last_epoch = ?, level = ?, drain_window_started_at = ?, updated_at = ? WHERE id = 1`);
    this._wipUpsert = db.prepare(`INSERT INTO wip_policy (scope, subject, cap) VALUES (?, ?, ?)
      ON CONFLICT(scope, subject) DO UPDATE SET cap = excluded.cap`);
    this._lineageSet = db.prepare(`UPDATE lineage_policy SET max_depth = ? WHERE id = 1`);
  }

  /** Seed operator-env WIP defaults if none configured (so a fresh DB has a global cap). */
  seedDefaults() {
    const existing = this.db.prepare(`SELECT COUNT(*) n FROM wip_policy`).get();
    if (existing.n === 0) {
      this._wipUpsert.run('global', null, this.config.wipGlobalCap);
      this._wipUpsert.run('per_agent', null, this.config.wipPerAgentCap);
    }
  }

  cap(scope, subject) {
    // per-subject override wins over the scope-wide (subject NULL) default.
    if (subject != null) {
      const specific = this.db.prepare(`SELECT cap FROM wip_policy WHERE scope = ? AND subject = ?`).get(scope, subject);
      if (specific) return specific.cap;
    }
    const dflt = this.db.prepare(`SELECT cap FROM wip_policy WHERE scope = ? AND subject IS NULL`).get(scope);
    return dflt ? dflt.cap : null;
  }

  /** Returns {ok:true} or {ok:false, code, detail}. Call inside the claim tx (reads live counts). */
  wipOk({ sub, team }) {
    const globalCap = this.cap('global', null);
    if (globalCap != null && this._wipCountGlobal.get().n >= globalCap) return { ok: false, scope: 'global', cap: globalCap };
    const agentCap = this.cap('per_agent', sub);
    if (agentCap != null && this._wipCountAgent.get(sub).n >= agentCap) return { ok: false, scope: 'per_agent', cap: agentCap };
    if (team) {
      const teamCap = this.cap('per_team', team);
      if (teamCap != null && this._wipCountTeam.get(team).n >= teamCap) return { ok: false, scope: 'per_team', cap: teamCap };
    }
    return { ok: true };
  }

  maxLineageDepth() {
    return this._lineage.get()?.max_depth ?? this.config.lineageMaxDepth;
  }

  // --- kill epoch -------------------------------------------------------------------------------
  killState() {
    return this._authGet.get() || { last_epoch: 0, level: KILL.G0, drain_window_started_at: null };
  }
  killLevel() {
    return this.killState().level;
  }
  /** G1: freeze-destructive (grant/consume suspended). G2: also no new claims. */
  destructiveFrozen() {
    const l = this.killLevel();
    return l === KILL.G1 || l === KILL.G2;
  }
  claimsQuiesced() {
    return this.killLevel() === KILL.G2;
  }
  inDrainWindow() {
    const s = this.killState();
    return s.level !== KILL.G0 && s.drain_window_started_at != null;
  }

  /** Past the revocation-staleness bound, destructive paths fail closed (auth contract §1). Enforced
   *  only when a revocations mirror is configured (never in dev/test — no poller runs there). */
  killMirrorStale(nowMs) {
    if (!this.config.authRevocationsUrl || this.config.devUnsafeNoAuth) return false;
    const s = this.killState();
    if (!s.updated_at) return true;
    return nowMs - Date.parse(s.updated_at) > this.config.killStalenessMs;
  }
  markKillSynced() {
    this._authSet.run(this.killState().last_epoch, this.killState().level, this.killState().drain_window_started_at ?? null, this.clock.iso());
  }

  /** Apply a kill-epoch update from the auth:revocations mirror. Monotonic: a lower epoch never wins. */
  applyKill({ epoch, level }) {
    const cur = this.killState();
    if (epoch != null && epoch < cur.last_epoch) return { applied: false, current: cur };
    const drainStart = level !== KILL.G0 && cur.level === KILL.G0 ? this.clock.now() : cur.drain_window_started_at;
    this._authSet.run(epoch ?? cur.last_epoch, level ?? cur.level, level === KILL.G0 ? null : drainStart, this.clock.iso());
    return { applied: true };
  }

  setWipCap(scope, subject, cap) {
    this._wipUpsert.run(scope, subject ?? null, cap);
  }
  setLineageDepth(depth) {
    this._lineageSet.run(depth);
  }
}
