/*
 * clients/worm.js — the off-box WORM sink (D-16b: a hardened log host, NOT Drive object-lock, NOT a SIEM).
 *
 * Append-only receiver whose credentials the suite host does NOT hold (Vault-host root cannot rewrite it).
 * Transport is ACK-BASED by design: HTTPS POST with a required 2xx ack + mTLS client cert. Plain TCP/UDP
 * syslog has no application ack and drops silently (RESEARCH §6) — never used. The audit service treats a
 * missing 2xx as "sink did not ack" and the dual-sink gate fails the redemption CLOSED (D-16a).
 *
 * Injectable fetch so tests substitute a deterministic ack/no-ack fake.
 */
import { config } from '../config.js';

export class WormSink {
  constructor({ fetchImpl = globalThis.fetch } = {}) {
    this.fetch = fetchImpl;
  }

  /** POST one audit record. Resolves true ONLY on a 2xx ack; false on any non-ack / error / timeout. */
  async ship(record) {
    if (config.devUnsafeNoAuth && !config.wormSinkUrl) return true; // dev without a sink configured
    if (!config.wormSinkUrl) return false; // prod without a sink => cannot ack => fail-closed
    try {
      const r = await this.fetch(config.wormSinkUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(config.clientTimeoutMs),
      });
      return !!(r && r.status >= 200 && r.status < 300);
    } catch {
      return false;
    }
  }

  /** Fetch the WORM sink's last-acked chain HEAD (M-4 restore detector). Returns {seq,row_hash} or null. */
  async head() {
    if (!config.wormSinkUrl) return null;
    try {
      const r = await this.fetch(`${config.wormSinkUrl.replace(/\/$/, '')}/head`, { signal: AbortSignal.timeout(config.clientTimeoutMs) });
      if (!r || !r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }
}
