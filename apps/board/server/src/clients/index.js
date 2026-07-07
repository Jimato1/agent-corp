/*
 * clients/index.js — the Board as a CLIENT of other apps (PLAN §13 ask #4/#5; §8.2/§14.1).
 *
 * The grant path (§8.2) and triage (§14.1) fetch live facts from Notes and CMDB BEFORE the write
 * transaction (no network I/O under the writer lock, §1). Every fetch has a short timeout (auth's
 * live-check budget) and fails CLOSED on the SoD-critical path — a Notes/CMDB outage means approvals
 * cannot be granted (correct direction; benign work continues). Chat posts are best-effort.
 *
 * All three are fully injectable so tests substitute deterministic fakes. `tokenProvider()` yields the
 * svc:board bearer (auth client-credentials); null in dev-unsafe mode.
 */
import { ERR } from '../constants.js';
import { biz } from '../errors.js';

async function getJson(fetchImpl, url, { token, timeoutMs, method = 'GET', body } = {}) {
  const headers = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  const r = await fetchImpl(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) {
    const err = new Error(`upstream ${r.status} ${url}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export class NotesClient {
  constructor({ config, fetchImpl = globalThis.fetch, tokenProvider = async () => null } = {}) {
    this.config = config;
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider;
  }
  /** Exact pinned-revision bytes for plan_hash (§8.2). `rev` omitted => latest (proposal pins it).
   *  Fail-closed on outage (SoD path). */
  async getRevisionBytes(noteId, rev) {
    try {
      const token = await this.tokenProvider();
      const q = rev != null ? `?rev=${encodeURIComponent(rev)}` : '';
      const j = await getJson(this.fetch, `${this.config.notesBaseUrl}/api/notes/${encodeURIComponent(noteId)}${q}`, { token, timeoutMs: this.config.clientTimeoutMs });
      // Contract (board-notes-ceremony.md, to freeze): GET revision bytes by (note_id, rev).
      return { bytes: j.raw ?? j.body ?? j.content ?? '', rev: j.rev ?? rev };
    } catch (e) {
      throw biz(ERR.DEP_UNAVAILABLE, 'Notes unavailable — approval minting fails closed', { dep: 'notes', status: e.status });
    }
  }
  /** Notes-computed transitive effective taint for the pinned plan note (§9). Fail-closed. */
  async getEffectiveTaint(noteId, rev) {
    try {
      const token = await this.tokenProvider();
      const j = await getJson(this.fetch, `${this.config.notesBaseUrl}/api/notes/${encodeURIComponent(noteId)}/taint?rev=${encodeURIComponent(rev)}`, { token, timeoutMs: this.config.clientTimeoutMs });
      return { effective: !!(j.effective ?? j.effective_taint), sources: j.sources ?? [] };
    } catch (e) {
      throw biz(ERR.DEP_UNAVAILABLE, 'Notes taint unavailable — approval minting fails closed', { dep: 'notes', status: e.status });
    }
  }
}

export class CmdbClient {
  constructor({ config, fetchImpl = globalThis.fetch, tokenProvider = async () => null } = {}) {
    this.config = config;
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider;
  }
  async #get(pathAndQuery) {
    const token = await this.tokenProvider();
    return getJson(this.fetch, `${this.config.cmdbBaseUrl}${pathAndQuery}`, { token, timeoutMs: this.config.clientTimeoutMs });
  }
  /** Task-type registry: reversibility, rollback path, external-verifier binding, externally-sourced. */
  async taskTypeRegistry(type) {
    return this.#get(`/v1/task-types/${encodeURIComponent(type)}`);
  }
  async hostTier(hostId) {
    return this.#get(`/v1/hosts/${encodeURIComponent(hostId)}/policy`);
  }
  /** playbook -> catalog class binding + novelty attrs (§8.2 derived-class floor; §14.1 S4). */
  async playbookClass(playbookKey) {
    return this.#get(`/v1/playbooks/${encodeURIComponent(playbookKey)}`);
  }
  /** Signed CMDB verdict (cmdb-gateway-verdict-token.md; aud=board for the tier path). */
  async verdict({ hostId, actionClass }) {
    return this.#get(`/v1/verdict?host_id=${encodeURIComponent(hostId)}&action_class=${encodeURIComponent(actionClass)}&aud=board`);
  }
  /** Operator-confirmed agent.id -> host_id mapping (§10.1). null => unmapped (quarantine). */
  async agentToHost(agentId) {
    try {
      const j = await this.#get(`/v1/wazuh-agents/${encodeURIComponent(agentId)}`);
      return j.host_id ?? null;
    } catch {
      return null; // unmapped/unreachable => quarantine (never fabricate host identity)
    }
  }
}

export class ChatClient {
  constructor({ config, fetchImpl = globalThis.fetch, tokenProvider = async () => null, logger } = {}) {
    this.config = config;
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider;
    this.log = logger;
  }
  /** Best-effort escalation notification (A1 trips, quarantines, fleet anomaly). Never blocks work. */
  async postEscalation(payload) {
    try {
      const token = await this.tokenProvider();
      await getJson(this.fetch, `${this.config.chatBaseUrl}/api/notifications`, {
        token, timeoutMs: this.config.clientTimeoutMs, method: 'POST',
        body: { kind: 'escalation', ...payload },
      });
    } catch (e) {
      this.log?.warn?.('chat_escalation_failed', { err: String(e.message || e) });
    }
  }
}

// Null clients for dev/tests when a real upstream isn't wired — grant/triage will DEP_UNAVAILABLE
// (fail-closed), which tests assert explicitly.
export function nullClients() {
  const unavailable = () => { throw biz(ERR.DEP_UNAVAILABLE, 'no upstream configured'); };
  return {
    notes: { getRevisionBytes: unavailable, getEffectiveTaint: unavailable },
    cmdb: { taskTypeRegistry: unavailable, hostTier: unavailable, playbookClass: unavailable, verdict: unavailable, agentToHost: async () => null },
    chat: { postEscalation: async () => {} },
  };
}
