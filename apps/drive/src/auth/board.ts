/**
 * Board ticket-exists check (PLAN §2.1). Uses the svc:drive service principal (board:read).
 * DEGRADED DEFAULT until BOTH land: the svc:drive→board:read grant activates (auth §9) AND the
 * Board ticket-exists read exists (Board Stage-2). While DRIVE_BOARD_API_URL is empty, Drive
 * stays flag-always (unverified_pending) — the fail-loud-open-but-flagged pattern; a Board
 * outage must never make agents lose completed work or spin (escalation-not-spin).
 */
import type { Config } from '../config.js';
import type { Store } from '../storage/store.js';

export type TicketCheckResult = 'verified' | 'verified_absent' | 'unreachable' | 'degraded';

export class BoardClient {
  constructor(
    private readonly config: Config,
    private readonly getServiceToken: () => Promise<string | null> = async () => null,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get active(): boolean {
    return this.config.board.apiUrl !== '';
  }

  /** Live existence check. Returns 'degraded' when the dependency is not yet wired. */
  async checkTicket(ticket_id: string): Promise<TicketCheckResult> {
    if (!this.active) return 'degraded';
    const token = await this.getServiceToken();
    if (!token) return 'degraded';
    try {
      const url = `${this.config.board.apiUrl.replace(/\/$/, '')}/api/tickets/${encodeURIComponent(ticket_id)}/exists`;
      const res = await this.fetchImpl(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(1000),
      });
      if (res.status === 404) return 'verified_absent';
      if (!res.ok) return 'unreachable';
      const body = (await res.json()) as { exists?: boolean };
      return body.exists ? 'verified' : 'verified_absent';
    } catch {
      return 'unreachable';
    }
  }

  /** Persist a check result in the rebuildable ticket_checks cache. */
  record(store: Store, ticket_id: string, result: TicketCheckResult): void {
    const state = result === 'verified' ? 'verified' : result === 'verified_absent' ? 'verified_absent' : 'unverified_pending';
    const now = store.clock.iso();
    const attemptsRow = store.db.prepare(`SELECT attempts FROM ticket_checks WHERE ticket_id = ?`).get(ticket_id) as { attempts: number } | undefined;
    const attempts = (attemptsRow?.attempts ?? 0) + 1;
    const schedule = this.config.board.recheckScheduleSec;
    const idx = Math.min(attempts - 1, schedule.length - 1);
    const nextMs = store.clock.now() + (schedule[idx] ?? 86400) * 1000;
    store.db
      .prepare(
        `INSERT INTO ticket_checks (ticket_id, state, checked_at, next_check_at, attempts) VALUES (?,?,?,?,?)
         ON CONFLICT(ticket_id) DO UPDATE SET state = excluded.state, checked_at = excluded.checked_at, next_check_at = excluded.next_check_at, attempts = excluded.attempts`,
      )
      .run(ticket_id, state, now, new Date(nextMs).toISOString(), attempts);
    // Cache verified/absent onto the artifact rows so listings reflect it.
    if (state !== 'unverified_pending') {
      store.db.prepare(`UPDATE artifacts SET ticket_state = ? WHERE ticket_id = ?`).run(state, ticket_id);
    }
  }
}
