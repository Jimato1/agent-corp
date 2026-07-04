/*
 * board/fencing.js — CORR-6: fencing validation on ticket-bound writes.
 *
 * ============================ CORR-6 (uncached echo-and-reject-stale) ============================
 * board-agents-claim.md §3 + IDENTIFIERS.md fencing row + PLAN §6/§9.3:
 *   Any mutating call on a TICKET-BOUND note (create_note(ticket_id=…), append_note, link_notes)
 *   must echo the Board-minted fencing token. Notes validates it via a LIVE, UNCACHED Board read
 *   and hard-rejects stale tokens (STALE_FENCE).
 *
 *   The plan REMOVED a proposed ≤5s staleness cache as an unauthorized unilateral weakening of the
 *   FROZEN contract's "receiving server rejects stale tokens." This module keeps it UNCACHED. There
 *   is no cache, no TTL, no memoization of the Board generation — every fenced write does a fresh
 *   read. (Comment is load-bearing: reintroducing a cache here regresses CORR-6.)
 *
 *   Defense-in-depth: Notes ALSO tracks the highest generation ever accepted per ticket (a Notes-
 *   side monotonic floor, persisted in fence_floor) and rejects anything lower regardless of what
 *   the Board read returns.
 *
 *   FAIL-CLOSED: Board unreachable ⇒ the fenced write is rejected FENCE_UNVERIFIABLE. An
 *   unverifiable fence protects the record. Unfenced (non-ticket) writes are unaffected.
 * ==============================================================================================
 *
 * Explicit exemption (PLAN §6): update_note / PUT (the notes:write surface) is UNFENCED — its
 * holders (operator UI, maintenance principals) are never Board lease-holders. Granting notes:write
 * to a lease-holding agent role would void this exemption and is disallowed (constants: WRITE not in
 * any agent role). The exemption is enforced by NOT calling validateFence on the update path.
 */
import { BusinessError } from '../errors.js';
import { ERR } from '../constants.js';

export class FenceValidator {
  constructor({ boardClient, repo }) {
    this.board = boardClient;
    this.repo = repo;
  }

  /**
   * Validate a presented fencing token for a ticket-bound write.
   * @throws BusinessError(FENCE_REQUIRED | STALE_FENCE | FENCE_UNVERIFIABLE)
   * On success, RAISES the Notes-side monotonic floor to the accepted generation.
   */
  async validateFence(ticketId, presentedToken) {
    if (presentedToken == null || presentedToken === '') {
      throw new BusinessError(ERR.FENCE_REQUIRED, 'ticket-bound write requires a fencing token', { ticket_id: ticketId });
    }
    const presented = Number(presentedToken);
    if (!Number.isInteger(presented) || presented < 0) {
      throw new BusinessError(ERR.STALE_FENCE, 'malformed fencing token', { ticket_id: ticketId });
    }

    // (1) Notes-side monotonic floor — reject anything below the highest ever accepted.
    const floor = this.repo.fenceFloor(ticketId);
    if (presented < floor) {
      throw new BusinessError(ERR.STALE_FENCE, 'fencing token below monotonic floor', {
        ticket_id: ticketId,
        presented,
        floor,
      });
    }

    // (2) LIVE, UNCACHED Board read of the current generation. Fail-closed on unreachability.
    let current;
    try {
      current = await this.board.currentFenceGeneration(ticketId); // NO CACHE — CORR-6
    } catch {
      throw new BusinessError(ERR.FENCE_UNVERIFIABLE, 'Board unreachable — ticket-bound write fails closed', {
        ticket_id: ticketId,
      });
    }
    if (!current.exists || current.generation == null) {
      throw new BusinessError(ERR.STALE_FENCE, 'no active lease for ticket', { ticket_id: ticketId });
    }
    if (presented !== current.generation) {
      throw new BusinessError(ERR.STALE_FENCE, 'fencing token is not the current generation', {
        ticket_id: ticketId,
        presented,
        current: current.generation,
      });
    }

    // Accepted — raise the monotonic floor (survives DB rebuild via audit trailers).
    this.repo.raiseFenceFloor(ticketId, presented);
    return { generation: presented };
  }
}
