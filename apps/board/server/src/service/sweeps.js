/*
 * service/sweeps.js — the in-process periodic processes (PLAN §1/§4/§11/§16).
 *
 *   - reaper (default 30s): the SOLE lease-expiry path + outage gate. Reaped tickets running a huddle
 *     get a pause ceremony event (mid-huddle lifecycle coupling, §14.2).
 *   - watchdog (default 10s): the D-1 ceremony watchdog (timebox/round-cap/veto/dissent trips).
 *   - kill poll: mirror auth:revocations -> auth_state (killswitch-chain.md).
 *   - node-cron: scheduled kickoffs (noOverlap); dedup via UNIQUE spawn_key in Board data.
 *   - backup: hourly hot snapshot.
 *   - tier-approver: flag-gated auto-tier grant sweep.
 *
 * Disabled entirely when config.disableSweeps (tests drive them deterministically).
 */
import cron from 'node-cron';
import { KILL } from '../constants.js';

export class Sweeps {
  constructor({ board, config, clock, logger }) {
    this.board = board;
    this.config = config;
    this.clock = clock;
    this.log = logger;
    this.timers = [];
    this.cronJobs = [];
  }

  // Reaper + huddle-pause coupling in one pass (the reaper returns reaped ids).
  reaperTick() {
    const res = this.board.claim.reaperSweep();
    for (const id of res.reaped_ids || []) {
      try { this.board.ceremony.pause(id, 'reaped'); } catch { /* no huddle */ }
    }
    return res;
  }
  watchdogTick() {
    return this.board.ceremony.watchdogSweep();
  }

  async killPollTick() {
    if (!this.config.authRevocationsUrl || this.config.devUnsafeNoAuth) return;
    try {
      const r = await fetch(this.config.authRevocationsUrl, { signal: AbortSignal.timeout(this.config.clientTimeoutMs) });
      if (!r.ok) return; // leave auth_state stale -> killMirrorStale trips fail-closed
      const j = await r.json();
      const level = j.level || (j.killed ? KILL.G2 : KILL.G0);
      this.board.guardrails.applyKill({ epoch: j.epoch, level });
      this.board.guardrails.markKillSynced();
    } catch {
      /* unreachable -> mirror goes stale -> destructive paths fail closed (§11) */
    }
  }

  start() {
    if (this.config.disableSweeps) return;
    const add = (fn, ms) => {
      const t = setInterval(() => { try { const r = fn(); if (r?.catch) r.catch(() => {}); } catch (e) { this.log?.warn?.('sweep_error', { err: String(e) }); } }, ms);
      if (t.unref) t.unref();
      this.timers.push(t);
    };
    add(() => this.reaperTick(), this.config.reaperSweepMs);
    add(() => this.watchdogTick(), this.config.watchdogSweepMs);
    add(() => this.killPollTick(), this.config.killPollMs);

    // node-cron scheduled kickoffs — one job per schedule trigger, noOverlap.
    this._installCron();
  }

  _installCron() {
    const triggers = this.board.db.prepare(`SELECT ticket_id, cron_expr FROM standing_triggers WHERE trigger_kind = 'schedule' AND cron_expr IS NOT NULL`).all();
    for (const t of triggers) {
      if (!cron.validate(t.cron_expr)) { this.log?.warn?.('bad_cron', { ticket_id: t.ticket_id, cron: t.cron_expr }); continue; }
      const job = cron.schedule(t.cron_expr, () => {
        const period = new Date(this.clock.now()).toISOString().slice(0, 13); // hour-bucket period key
        try { this.board.kickoffs.fireScheduled(t.ticket_id, period); } catch (e) { this.log?.warn?.('cron_fire_failed', { err: String(e) }); }
      }, { noOverlap: true });
      this.cronJobs.push(job);
    }
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    for (const j of this.cronJobs) j.stop();
    this.timers = [];
    this.cronJobs = [];
  }
}
