/*
 * clients/board.js — Vault as a client of the Board facts (PIP) surface (D-4 §4.3;
 * context/CONTRACTS/board-consumers-facts-read.md). svc:vault holds board:read.
 *
 * This is the load-bearing INDEPENDENCE: the Vault does NOT trust the Gateway's assertion about the
 * approval — it re-reads the Board itself (live, Cache-Control: no-store) at redeem time. A Board outage
 * or timeout fails the redemption CLOSED (the ruled direction; same posture as D-16a).
 *
 * Every value the Board serves is live (in-process PK read), never request-supplied (contract invariant 1).
 * Injectable fetch + tokenProvider so tests substitute deterministic fakes.
 */
import { config } from '../config.js';

class BoardUnreachable extends Error {
  constructor(msg, status) { super(msg); this.name = 'BoardUnreachable'; this.status = status; }
}

export class BoardClient {
  constructor({ fetchImpl = globalThis.fetch, tokenProvider = async () => null } = {}) {
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider;
  }

  async #get(pathAndQuery) {
    const token = await this.tokenProvider();
    const headers = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    let r;
    try {
      r = await this.fetch(`${config.boardFactsUrl}${pathAndQuery}`, { headers, signal: AbortSignal.timeout(config.clientTimeoutMs) });
    } catch (e) {
      throw new BoardUnreachable(`board fetch failed: ${String(e.message || e)}`);
    }
    if (!r || !r.ok) throw new BoardUnreachable(`board ${r ? r.status : 'no-response'} ${pathAndQuery}`, r && r.status);
    return r.json();
  }

  /** GET /facts/approval/{approval_id} — the D-4 redeem predicate source (contract §Endpoints). */
  async approval(approvalId) {
    return this.#get(`/facts/approval/${encodeURIComponent(approvalId)}`);
  }

  /** GET /facts/ticket/{ticket_id} — request-release preconditions + the B-4 "still executing" check. */
  async ticket(ticketId) {
    return this.#get(`/facts/ticket/${encodeURIComponent(ticketId)}`);
  }

  /** GET /facts/host-lock/{host_id} — the B-4 execution-hold authority (hold_kind='execution'). */
  async hostLock(hostId) {
    return this.#get(`/facts/host-lock/${encodeURIComponent(hostId)}`);
  }
}

export { BoardUnreachable };
