/*
 * git/remote.js — CORR-5: the configured git remote + push cadence (ARCH §10 / PLAN §2.3).
 *
 *   - NOTES_GIT_REMOTE_URL is BOOT-REQUIRED (config.assertBootRequirements + index.js). A local-only
 *     .git is a build failure, not a style choice.
 *   - A boot-time ls-remote reachability failure starts the service in DEGRADED-VISIBLE mode
 *     (serving, /healthz red + push-lag alarm) rather than refusing boot — the corpus must not
 *     become unavailable because the backup target is down.
 *   - Push cadence: after every commit, debounced ≤60s; exponential backoff on failure.
 *   - Push-lag is a first-class health fact: git_push_lag_seconds, last_pushed_commit; past the
 *     staleness bound (default 15 min) the service logs ERROR and flags degraded health.
 *   - Boot-time `git fetch` divergence check (history rewrite on the remote is detectable) — §11.9.
 */
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'node:fs';
import { config } from '../config.js';
import { log } from '../logging.js';

export class RemoteManager {
  constructor({ dir = config.corpusPath, now = () => Date.now() } = {}) {
    this.dir = dir;
    this.fs = fs;
    this.now = now;
    this.remoteReachable = false;
    this.lastPushedCommit = null;
    this.lastPushMs = null;
    this.pendingSince = null; // ms of the earliest un-pushed commit
    this._timer = null;
    this._backoffMs = 1000;
  }

  onAuth() {
    if (config.gitRemoteToken) {
      return { username: config.gitRemoteUser || 'x-access-token', password: config.gitRemoteToken };
    }
    return {};
  }

  async configureRemote() {
    if (!config.gitRemoteUrl) throw new Error('CORR-5: NOTES_GIT_REMOTE_URL unset (build failure)');
    await git.addRemote({ fs: this.fs, dir: this.dir, remote: config.gitRemoteName, url: config.gitRemoteUrl, force: true });
  }

  /** Boot-time reachability probe (ls-remote). Failure ⇒ degraded-visible, not refuse-boot. */
  async probe() {
    try {
      await git.getRemoteInfo({ http, url: config.gitRemoteUrl, onAuth: () => this.onAuth() });
      this.remoteReachable = true;
    } catch (e) {
      this.remoteReachable = false;
      log.error('git_remote_unreachable_at_boot', { remote: config.gitRemoteUrl, err: String(e.message || e) });
    }
    return this.remoteReachable;
  }

  /** Boot-time divergence check — a rewritten remote history is a tamper signal (PLAN §11.9). */
  async checkDivergence() {
    try {
      const remote = await git.getRemoteInfo({ http, url: config.gitRemoteUrl, onAuth: () => this.onAuth() });
      const remoteHead = remote.refs?.heads?.[config.gitBranch];
      const localHead = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' }).catch(() => null);
      if (remoteHead && localHead && remoteHead !== localHead) {
        // Determine if remoteHead is an ancestor of local (normal: we're ahead) — else diverged.
        const ancestor = await git
          .isDescendent({ fs: this.fs, dir: this.dir, oid: localHead, ancestor: remoteHead, depth: -1 })
          .catch(() => false);
        if (!ancestor) log.error('git_remote_divergence', { localHead, remoteHead });
        return ancestor;
      }
      return true;
    } catch {
      return true; // can't check while unreachable — not a divergence assertion
    }
  }

  /** Called after each commit. Marks work pending and schedules a debounced push. */
  notifyCommit(sha) {
    if (this.pendingSince == null) this.pendingSince = this.now();
    this._pendingSha = sha;
    if (!this._timer) {
      this._timer = setTimeout(() => this._flush(), config.pushDebounceMs);
      if (this._timer.unref) this._timer.unref();
    }
  }

  async _flush() {
    this._timer = null;
    try {
      await git.push({
        fs: this.fs,
        http,
        dir: this.dir,
        remote: config.gitRemoteName,
        ref: config.gitBranch,
        onAuth: () => this.onAuth(),
      });
      this.remoteReachable = true;
      this.lastPushedCommit = this._pendingSha;
      this.lastPushMs = this.now();
      this.pendingSince = null;
      this._backoffMs = 1000;
    } catch (e) {
      this.remoteReachable = false;
      // Exponential backoff retry (PLAN §2.3). Off-box durability is best-effort while down.
      this._backoffMs = Math.min(this._backoffMs * 2, 5 * 60 * 1000);
      log.warn('git_push_failed', { err: String(e.message || e), retry_ms: this._backoffMs });
      this._timer = setTimeout(() => this._flush(), this._backoffMs);
      if (this._timer.unref) this._timer.unref();
    }
  }

  /** Health fact (PLAN §2.3): seconds since the earliest un-pushed commit. */
  pushLagSeconds() {
    if (this.pendingSince == null) return 0;
    return Math.floor((this.now() - this.pendingSince) / 1000);
  }
  healthy() {
    return this.remoteReachable && this.pushLagSeconds() <= config.pushLagAlarmSeconds;
  }
  health() {
    const lag = this.pushLagSeconds();
    if (lag > config.pushLagAlarmSeconds) log.error('git_push_lag_exceeded', { git_push_lag_seconds: lag });
    return {
      remote_reachable: this.remoteReachable,
      git_push_lag_seconds: lag,
      last_pushed_commit: this.lastPushedCommit,
      degraded: !this.healthy(),
    };
  }
}
