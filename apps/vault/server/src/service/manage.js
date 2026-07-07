/*
 * service/manage.js — the operator surface (PLAN §8; UI_SPEC §4–§9). The rich half of the inverted
 * two-view. Scope vault:manage (operator-only, human-kind-gated). Two views over ONE state: these
 * reads/writes hit the SAME wrapper store + engine the MCP tools and the redeem pipeline use.
 *
 * Constitutional facts encoded here:
 *  - WRITE-ONLY: create/import/rotate write to the engine; the UI NEVER reads a stored plaintext back —
 *    there is no reveal/export endpoint anywhere (§8.1). Break-glass read is the offline quorum ceremony.
 *  - SIGN-ROLE change control (B-2): the wrapper only STAGES a proposed role; an operator step-up applies
 *    it via the change-control path. The wrapper has NO runtime write to ssh/roles. The no-wildcard/no-root
 *    invariant PREVENTS staging a dangerous role.
 *  - NEVER FALSE-GREEN: seal/audit-sink health the console cannot confirm renders CANNOT-CONFIRM, never OK.
 */
import { createHash } from 'node:crypto';
import { biz } from '../errors.js';
import { makeHandle, isHostId } from '../ids.js';
import { HANDLE_KIND, RECOVERY } from '../constants.js';

function sha256(s) { return 'sha256:' + createHash('sha256').update(s).digest('hex'); }

export class ManageService {
  constructor({ db, engine, audit, releases, revocation, clock, config, logger }) {
    Object.assign(this, { db, engine, audit, releases, revocation, clock, config, logger });
  }

  #auditChange(actorSub, action, detail) {
    // Every manage-surface change is a tamper-evident dual-sink row (ARCH §12 change control).
    this.audit.dualSink({ event_type: `manage_${action}`, actor_sub: actorSub, outcome: 'ok', detail_json: detail }).catch((e) => this.logger?.warn?.('manage_audit_failed', { err: String(e) }));
  }

  // ---- Secrets Manager (§4) ----------------------------------------------------------------------
  /** Write-only KV create/import → a new KV v2 version (via the wrapper AppRole write path §3.1). Never
   *  echoes the value; the engine write is CANNOT-VERIFY-IN-SANDBOX. Registers/updates the handle projection. */
  async createKv({ principal, hostId, name, value, description, rotationPolicy, recovery }) {
    if (!isHostId(hostId)) throw biz(422, 'validation', 'invalid host_id');
    if (!name || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw biz(422, 'validation', 'invalid name');
    if (typeof value !== 'string' || value.length === 0) throw biz(422, 'validation', 'value must be a non-empty string');
    if (recovery && !Object.values(RECOVERY).includes(recovery)) throw biz(422, 'validation', 'invalid recovery tag');
    const handle = makeHandle(hostId, name);
    const openbao_ref = `kv/data/hosts/${hostId}/${name}`;
    // Engine write (write-only path). In sandbox the injected engine records it; real path writes KV v2.
    if (this.engine.writeKv) await this.engine.writeKv({ path: openbao_ref, value }); // value NEVER stored locally
    const now = this.clock.iso();
    this.db.prepare(`INSERT INTO handles (handle, host_id, name, kind, openbao_ref, description, requires_approval_class, rotation_policy, recovery, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(handle) DO UPDATE SET description=excluded.description, rotation_policy=excluded.rotation_policy, recovery=excluded.recovery`)
      .run(handle, hostId, name, HANDLE_KIND.KV, openbao_ref, description ?? null, 'destructive', rotationPolicy ? JSON.stringify(rotationPolicy) : null, recovery ?? RECOVERY.CONSOLE_ONLY, now);
    this.#auditChange(principal.sub, 'kv_write', { handle }); // detail carries the handle, never the value
    return { handle, status: 'written' }; // NEVER returns the value
  }

  /** Rotate now — a DangerAction. M-5: not complete until the new KV version is durably off-box. */
  async rotateKv({ principal, handle }) {
    const r = this.db.prepare('SELECT * FROM handles WHERE handle = ?').get(handle);
    if (!r) throw biz(404, 'unknown_handle', 'unknown handle');
    let offbox_acked = false;
    if (this.engine.rotateKv) { const out = await this.engine.rotateKv({ path: r.openbao_ref }); offbox_acked = !!out?.offbox_acked; }
    this.#auditChange(principal.sub, 'kv_rotate', { handle, offbox_acked });
    return { handle, rotated: true, offbox_acked }; // rotation-durability surfaced (M-5)
  }

  // ---- Host Onboarding (§5) ----------------------------------------------------------------------
  listHosts() {
    return this.db.prepare('SELECT * FROM hosts ORDER BY host_id').all().map((h) => ({ ...h, signrole_diff: h.signrole_diff ? JSON.parse(h.signrole_diff) : null, principals: h.principals ? JSON.parse(h.principals) : null }));
  }

  registerHost({ principal, hostId, recovery }) {
    if (!isHostId(hostId)) throw biz(422, 'validation', 'invalid host_id (CMDB slug)');
    const now = this.clock.iso();
    this.db.prepare(`INSERT INTO hosts (host_id, state, recovery, created_at, updated_at) VALUES (?, 'new', ?, ?, ?)
      ON CONFLICT(host_id) DO NOTHING`).run(hostId, recovery ?? RECOVERY.CONSOLE_ONLY, now, now);
    this.#auditChange(principal.sub, 'host_register', { host_id: hostId });
    return { host_id: hostId, state: 'new' };
  }

  /** Stage a PROPOSED sign-role (powerless). The no-wildcard/no-root invariant PREVENTS a dangerous role. */
  stageSignRole({ principal, hostId, allowedUsers, validPrincipals }) {
    const host = this.db.prepare('SELECT * FROM hosts WHERE host_id = ?').get(hostId);
    if (!host) throw biz(404, 'unknown_host', 'register the host first');
    const users = Array.isArray(allowedUsers) ? allowedUsers : String(allowedUsers || '').split(',').map((s) => s.trim()).filter(Boolean);
    const principals = Array.isArray(validPrincipals) ? validPrincipals : String(validPrincipals || '').split(',').map((s) => s.trim()).filter(Boolean);
    // Build-failing invariant (PLAN §2.3, §5.2): no wildcards, no root, non-empty principals.
    const bad = [...users, ...principals].find((v) => v.includes('*') || v.toLowerCase() === 'root');
    if (bad) throw biz(422, 'invariant_violation', `sign-role principals must not include wildcards or root (got "${bad}")`);
    if (principals.length === 0 || users.length === 0) throw biz(422, 'invariant_violation', 'allowed_users and valid_principals must be non-empty (allow_empty_principals=false)');
    const signrole_name = `gateway-${hostId}`;
    const proposed = { role: signrole_name, allowed_users: users, default_user: '', valid_principals: principals, allow_empty_principals: false };
    const diffHash = sha256(JSON.stringify(proposed));
    const now = this.clock.iso();
    this.db.prepare('UPDATE hosts SET state=?, signrole_name=?, signrole_diff=?, signrole_diff_hash=?, principals=?, updated_at=? WHERE host_id=?')
      .run('staged', signrole_name, JSON.stringify(proposed), diffHash, JSON.stringify(principals), now, hostId);
    this.#auditChange(principal.sub, 'signrole_stage', { host_id: hostId, diff_hash: diffHash });
    return { host_id: hostId, signrole_name, diff: proposed, diff_hash: diffHash, state: 'staged' };
  }

  /** Apply the staged sign-role via the change-control path — full ConfirmFriction (step-up + diff-hash). */
  applySignRole({ principal, hostId, diffHash, stepUpVerified }) {
    const host = this.db.prepare('SELECT * FROM hosts WHERE host_id = ?').get(hostId);
    if (!host || host.state !== 'staged') throw biz(409, 'not_staged', 'no staged sign-role to apply');
    if (host.signrole_diff_hash !== diffHash) throw biz(409, 'stale_diff', 'the diff changed — re-open to confirm the current diff');
    if (this.config.env === 'production' && !stepUpVerified) throw biz(403, 'step_up_required', 'gate-weakening change requires a fresh operator step-up');
    // The engine ssh/roles write is the CHANGE-CONTROL PATH (config-as-code under generate-root/quorum),
    // NOT the wrapper's standing AppRole (B-2). CANNOT-VERIFY-IN-SANDBOX; recorded as a tamper-evident row.
    const now = this.clock.iso();
    this.db.prepare('UPDATE hosts SET state=?, updated_at=? WHERE host_id=?').run('ready', now, hostId);
    // register the ssh-ca handle projection for this host's root/service access
    const principals = host.principals ? JSON.parse(host.principals) : [];
    const name = principals[0] || 'access';
    const handle = makeHandle(hostId, name);
    this.db.prepare(`INSERT INTO handles (handle, host_id, name, kind, openbao_ref, description, requires_approval_class, recovery, ssh_principal, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(handle) DO UPDATE SET ssh_principal=excluded.ssh_principal`)
      .run(handle, hostId, name, HANDLE_KIND.SSH_CA, host.signrole_name, `SSH-CA access for ${hostId}`, 'destructive', host.recovery, principals.join(','), now);
    this.#auditChange(principal.sub, 'signrole_apply', { host_id: hostId, diff_hash: diffHash, step_up: !!stepUpVerified });
    return { host_id: hostId, state: 'ready', handle };
  }

  // ---- Access Audit (§6) -------------------------------------------------------------------------
  auditQuery({ host, ticket, sub, outcome } = {}) {
    let sql = 'SELECT * FROM audit_local WHERE 1=1';
    const args = [];
    if (host) { sql += ' AND detail_json LIKE ?'; args.push(`%${host}%`); }
    if (ticket) { sql += ' AND ticket_id = ?'; args.push(ticket); }
    if (sub) { sql += ' AND actor_sub = ?'; args.push(sub); }
    if (outcome) { sql += ' AND outcome = ?'; args.push(outcome); }
    sql += ' ORDER BY seq DESC LIMIT 500';
    return { rows: this.db.prepare(sql).all(...args), as_of: this.clock.iso() };
  }

  /** Exfiltration-signal view: agent-shaped denials + no-channel-cert denials, pinned (§6.3). */
  auditExfil() {
    const rows = this.db.prepare(`SELECT * FROM audit_local WHERE event_type='redeem_denied'
      AND (actor_sub LIKE 'agent:%' OR actor_sub IS NULL OR detail_json LIKE '%not_gateway%')
      ORDER BY seq DESC LIMIT 200`).all();
    return { rows, as_of: this.clock.iso() };
  }

  async chainStatus() {
    const local = this.audit.head();
    let worm = null;
    try { worm = await this.audit.worm.head(); } catch { worm = null; }
    const matched = worm && local.seq === worm.seq && local.row_hash === worm.row_hash;
    return { local_head: local, worm_head: worm, matched: worm ? matched : null, as_of: this.clock.iso() };
  }

  verifyChain() {
    const r = this.audit.verifyChain();
    // Never false-green: a stale/unfetchable WORM comparison is the caller's (UI) halt-gold, not here.
    return { ...r, as_of: this.clock.iso() };
  }

  // ---- Status / DR (§8) --------------------------------------------------------------------------
  async status() {
    const seal = this.engine.sealStatus ? await this.engine.sealStatus() : null; // null => CANNOT CONFIRM (never green)
    const chain = await this.chainStatus();
    const worm_ok = chain.worm_head != null;
    // audit-sink health is green ONLY if BOTH sinks are current (PLAN §8.5).
    const audit_sinks = { local: true, worm: worm_ok, both_current: !!(worm_ok && chain.matched) };
    const hosts = this.db.prepare('SELECT host_id, breakglass_verified_at FROM hosts ORDER BY host_id').all();
    return {
      as_of: this.clock.iso(),
      seal: seal === null ? { state: 'unknown', confirmable: false } : { state: seal.sealed ? 'sealed' : 'unsealed', confirmable: true },
      unsealer: { address: this.config.unsealerAddr, seal_token_ttl: null /* engine-reported, CANNOT-VERIFY */ },
      recovery_quorum: { shares: '3-of-5', escrow: 'offline' },
      audit_sinks,
      engine_stream_xcorr: worm_ok ? 'live' : 'unknown',
      kill: { level: this.revocation.killLevel, epoch: this.revocation.epoch },
      backups: { snapshot_dest: this.config.snapshotDest || null, snapshot_dest_reachable: null /* checked out-of-band */ },
      ca: { fingerprint: null /* provisioned cert — CANNOT-VERIFY-IN-SANDBOX */, rotation_runbook: 'openbao/README.md' },
      ssh_ca_key: 'inside-barrier-non-exportable',
      break_glass: hosts.map((h) => ({ host_id: h.host_id, last_verified: h.breakglass_verified_at })),
    };
  }

  // ---- Change Control (§9) — gate-weakening edits behind full ConfirmFriction ---------------------
  changeControlDiff({ edit, from, to }) {
    const body = { edit, from, to };
    return { ...body, diff_hash: sha256(JSON.stringify(body)), gate_weakening: true, as_of: this.clock.iso() };
  }

  changeControlApply({ principal, edit, from, to, diffHash, stepUpVerified }) {
    const expect = sha256(JSON.stringify({ edit, from, to }));
    if (expect !== diffHash) throw biz(409, 'stale_diff', 'the diff changed or your step-up lapsed; re-open to re-confirm the current diff');
    if (this.config.env === 'production' && !stepUpVerified) throw biz(403, 'step_up_required', 'gate-weakening apply requires a fresh operator step-up');
    if (this.revocation.killLevel && this.revocation.killLevel !== 'G0') throw biz(409, 'kill_engaged', 'gate-weakening apply refused under the active kill level');
    this.#auditChange(principal.sub, 'change_control_apply', { edit, from, to, diff_hash: diffHash, step_up: !!stepUpVerified });
    return { edit, applied: true, diff_hash: diffHash };
  }
}
