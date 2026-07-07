/*
 * clients/chat.js — the §6.3 exfiltration-signal escalation (best-effort). A denial whose validated/
 * parsed sub is agent-class, or any request reaching /redeem without a Gateway channel cert, raises an
 * ACTIVE escalation (not just a log line): a Chat notification from svc:vault (chat:post).
 *
 * The grant (svc:vault -> chat -> chat:post) is an ASK (§12); if declined, the fallback is the
 * `violations` feed on the status surface (MC polls it). Either way the denial is in BOTH audit sinks —
 * this escalation NEVER blocks or gates a redemption decision. Injectable + fail-silent.
 */
import { config } from '../config.js';

export class ChatClient {
  constructor({ fetchImpl = globalThis.fetch, tokenProvider = async () => null, logger } = {}) {
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider;
    this.log = logger;
    this.enabled = !!config.chatBaseUrl && !config.devUnsafeNoAuth;
  }

  async postExfilEscalation(payload) {
    if (!this.enabled) return false;
    try {
      const token = await this.tokenProvider();
      const headers = { 'content-type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      const r = await this.fetch(`${config.chatBaseUrl}/api/notifications`, {
        method: 'POST', headers,
        body: JSON.stringify({ kind: 'escalation', severity: 'high', source: 'svc:vault', ...payload }),
        signal: AbortSignal.timeout(config.clientTimeoutMs),
      });
      return !!(r && r.ok);
    } catch (e) {
      this.log?.warn?.('chat_escalation_failed', { err: String(e.message || e) });
      return false; // fallback = the violations feed on the status surface (MC-polled)
    }
  }
}
