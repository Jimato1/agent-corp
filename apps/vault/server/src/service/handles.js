/*
 * service/handles.js — the handle read surface shared by the MCP tools (§5.1) and the operator UI (§8).
 * Handles are the ONLY thing agents ever see: powerless references + non-secret metadata. No value column
 * exists anywhere in this app's storage — the plaintext lives ONLY in OpenBao.
 */
import { biz } from '../errors.js';
import { RELEASE_ERR } from '../constants.js';
import { BoardUnreachable } from '../clients/board.js';

export class HandleService {
  constructor({ db, board }) {
    this.db = db;
    this.board = board;
  }

  #row(handle) {
    return this.db.prepare('SELECT * FROM handles WHERE handle = ? AND retired_at IS NULL').get(handle);
  }

  /** MCP `vault_list_handles(ticket_id)` — host-scoped via Board facts host_id (§5.1). */
  async listForTicket(ticketId) {
    let facts;
    try { facts = await this.board.ticket(ticketId); }
    catch (e) { if (e instanceof BoardUnreachable) throw biz(RELEASE_ERR.BOARD_UNREACHABLE.http, RELEASE_ERR.BOARD_UNREACHABLE.code, 'board unreachable'); throw e; }
    if (!facts || !facts.exists) throw biz(404, 'ticket_not_found', 'ticket not found');
    if (!facts.host_id) return { ticket_id: ticketId, host_id: null, handles: [] };
    const rows = this.db.prepare('SELECT handle, host_id, kind, description, requires_approval_class FROM handles WHERE host_id = ? AND retired_at IS NULL').all(facts.host_id);
    return { ticket_id: ticketId, host_id: facts.host_id, handles: rows };
  }

  /** MCP `vault_describe_handle(handle)` — NO rotation/version markers, NO timestamps (recon minimization). */
  describe(handle) {
    const r = this.#row(handle);
    if (!r) throw biz(404, 'unknown_handle', 'unknown handle');
    return { handle: r.handle, host_id: r.host_id, kind: r.kind, description: r.description, requires_approval_class: r.requires_approval_class };
  }

  /** Manage: full projection (metadata only — NEVER a value). */
  listAll() {
    return this.db.prepare('SELECT handle, host_id, name, kind, description, requires_approval_class, rotation_policy, recovery, created_at FROM handles WHERE retired_at IS NULL ORDER BY handle').all();
  }

  /** Manage detail: rotation policy + recovery + class (KV metadata versions come from the engine — §8.1). */
  detail(handle) {
    const r = this.#row(handle);
    if (!r) throw biz(404, 'unknown_handle', 'unknown handle');
    return {
      handle: r.handle, host_id: r.host_id, name: r.name, kind: r.kind, description: r.description,
      requires_approval_class: r.requires_approval_class, rotation_policy: r.rotation_policy ? JSON.parse(r.rotation_policy) : null,
      recovery: r.recovery, ssh_principal: r.ssh_principal, created_at: r.created_at,
      // versions are KV v2 metadata read from the engine (CANNOT-VERIFY-IN-SANDBOX); never values.
    };
  }
}
