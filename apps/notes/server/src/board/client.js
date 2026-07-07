/*
 * board/client.js — Notes' OWN outbound identity to the Board (PLAN §9.3).
 *
 * Notes holds a service principal `svc:notes` (auth-minted, client-credentials, READ-ONLY Board
 * scope `board:read`; NEVER any holder/approve/execute scope — auth §9). These are authenticated
 * calls to a bound RS (aud == board). Notes NEVER writes to the Board; escalation filing is the
 * agent's job. Notes is a store, not an actor.
 *
 * The exact Board read endpoint shapes freeze in the Board↔Notes ceremony contract (PLAN §13,
 * board-notes-ceremony.md — to write jointly at Board Stage-2). This client codes against the
 * provisional shape the plan describes; the SEMANTICS (uncached fence read, ticket existence +
 * provenance for the taint floor, phase read) are what bind. Marked PROVISIONAL-ENDPOINT-SHAPE.
 */
import { config } from '../config.js';
import { AuthError } from '../errors.js';

export class BoardClient {
  constructor({ fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
    this._token = null;
    this._tokenExpMs = 0;
  }

  /** Acquire (and cache until near-exp) the svc:notes client-credentials token. */
  async #token() {
    if (this._token && this.now() < this._tokenExpMs - 5000) return this._token;
    // client-credentials + per-principal asymmetric client assertion (auth §9 / PLAN §8).
    const assertion = await this.#clientAssertion();
    const res = await this.fetch(config.authTokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.svcClientId,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
        audience: config.boardAudience || 'board',
        scope: 'board:read',
      }),
    });
    if (!res.ok) throw new AuthError(503, 'SVC_TOKEN_FAIL', `svc:notes token mint failed (${res.status})`);
    const j = await res.json();
    this._token = j.access_token;
    this._tokenExpMs = this.now() + (j.expires_in ? j.expires_in * 1000 : 120000);
    return this._token;
  }

  async #clientAssertion() {
    // The signing key is a deploy-time secret (svcClientKeyPath). In dev-unsafe mode we skip it.
    if (config.devUnsafeNoAuth) return 'dev-unsafe-assertion';
    // Real implementation signs a JWT with the mounted private key. Kept minimal & explicit so the
    // fail-closed path is NOT stubbed: absent key ⇒ hard failure, never a silent bypass.
    const { readFile } = await import('node:fs/promises');
    const { importPKCS8, SignJWT } = await import('jose');
    if (!config.svcClientKeyPath) throw new AuthError(503, 'SVC_KEY_MISSING', 'svc:notes client key not configured');
    const pem = await readFile(config.svcClientKeyPath, 'utf8');
    const key = await importPKCS8(pem, 'EdDSA');
    return new SignJWT({})
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
      .setIssuer(config.svcClientId)
      .setSubject(config.svcClientId)
      .setAudience(config.authIssuer)
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(key);
  }

  async #get(pathname) {
    const token = await this.#token();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), config.boardReadTimeoutMs);
    try {
      const res = await this.fetch(config.boardBaseUrl + pathname, {
        headers: { authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  /**
   * CORR-6 core read: the CURRENT fencing generation for a ticket's lease — UNCACHED, live.
   * PROVISIONAL-ENDPOINT-SHAPE. Returns { generation } or throws (caller fails closed).
   */
  async currentFenceGeneration(ticketId) {
    const res = await this.#get(`/api/tickets/${encodeURIComponent(ticketId)}/lease`);
    if (res.status === 404) return { exists: false, generation: null };
    if (!res.ok) throw new AuthError(503, 'BOARD_UNREACHABLE', `Board lease read failed (${res.status})`);
    const j = await res.json();
    return { exists: true, generation: Number(j.lock_generation ?? j.generation) };
  }

  /** Ticket existence + provenance (for the structural taint floor). PROVISIONAL-ENDPOINT-SHAPE. */
  async ticketFacts(ticketId) {
    const res = await this.#get(`/api/tickets/${encodeURIComponent(ticketId)}`);
    if (res.status === 404) return { exists: false, provenance: null };
    if (!res.ok) throw new AuthError(503, 'BOARD_UNREACHABLE', `Board ticket read failed (${res.status})`);
    const j = await res.json();
    // Wazuh-spawned tickets are host-originated (board-wazuh-connector-kickoff.md §1).
    return { exists: true, provenance: j.provenance || (j.host_originated ? 'host_originated' : 'agent') };
  }

  /** Ceremony phase for mechanical draft-isolation (only if that variant is ratified). */
  async ceremonyPhase(ticketId) {
    const res = await this.#get(`/api/tickets/${encodeURIComponent(ticketId)}/ceremony`);
    if (!res.ok) throw new AuthError(503, 'BOARD_UNREACHABLE', `Board ceremony read failed (${res.status})`);
    const j = await res.json();
    return { phase: j.ceremony_phase || null };
  }
}
