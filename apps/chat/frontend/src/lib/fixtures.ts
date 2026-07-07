// lib/fixtures.ts — the OFFLINE fallback, mapped from the Helm chat kit's
// ch-data.jsx demo data into the real backend contract shapes. Used ONLY when
// the live API is unreachable, so the UI stays viewable offline (the shell marks
// it clearly as demo data). The live API is always the primary path.

import { escapeHtml } from './format';
import type { Broadcast, Envelope, HealthSignal } from './types';

const now = Date.now();
const ago = (ms: number) => new Date(now - ms).toISOString();
const ahead = (ms: number) => new Date(now + ms).toISOString();
const MIN = 60_000;
const HR = 60 * MIN;

function bodyHtml(body: string): string {
  return `<p>${escapeHtml(body)}</p>`;
}

function mcFallbackLink(ticket: string | null) {
  // Pre-grant resolve seam: the mc:read grant is not yet live, so the deep-link
  // is honest-PENDING and falls back to the MC review path (target wins).
  return ticket
    ? { url: `/mc/review/${ticket}`, label: '→ mc/review', caption: '(target wins)', pending: true }
    : null;
}

export const FIXTURE_FEED: Envelope[] = [
  {
    notification_id: 'N-01J8QZ',
    created_at: ago(2 * MIN),
    agent_id: 'agent:patcher-07',
    agent_kind: 'agent',
    kind: 'escalation',
    priority: 5,
    title: 'NAS reboot hung — host unreachable',
    body: 'NAS reboot hung — host unreachable, cannot verify patch',
    body_html: bodyHtml('NAS reboot hung — host unreachable, cannot verify patch'),
    tags: ['board_escalation'],
    ticket_id: 'T-000123',
    fencing_token: '46',
    source_system: 'board',
    source_kind: 'review',
    source_id: 'T-000123',
    deep_link: mcFallbackLink('T-000123'),
    repeat_count: 3,
    last_seen_at: ago(2 * MIN),
    acked_at: null,
    acked_by: null,
    resolved_at: null,
    resolved_source: null,
  },
  {
    notification_id: 'N-01J8RA',
    created_at: ago(14 * MIN),
    agent_id: 'agent:writer-03',
    agent_kind: 'agent',
    kind: 'needs_review',
    priority: 4,
    title: 'Research note ready',
    body: 'Research note ready: safe-patch practice for Wazuh fleet',
    body_html: bodyHtml('Research note ready: safe-patch practice for Wazuh fleet'),
    tags: ['review_ready'],
    ticket_id: 'T-000210',
    fencing_token: null,
    source_system: 'board',
    source_kind: 'review',
    source_id: 'T-000210',
    deep_link: mcFallbackLink('T-000210'),
    repeat_count: 1,
    last_seen_at: ago(14 * MIN),
    acked_at: null,
    acked_by: null,
    resolved_at: null,
    resolved_source: null,
  },
  {
    notification_id: 'N-01J8SB',
    created_at: ago(1 * HR),
    agent_id: 'svc:tier-approver',
    agent_kind: 'service',
    kind: 'done',
    priority: 2,
    title: 'Canary batch patched',
    body: 'Canary batch patched · Wazuh confirmed active→solved',
    body_html: bodyHtml('Canary batch patched · Wazuh confirmed active→solved'),
    tags: [],
    ticket_id: 'T-000198',
    fencing_token: null,
    source_system: 'board',
    source_kind: 'ticket',
    source_id: 'T-000198',
    deep_link: mcFallbackLink('T-000198'),
    repeat_count: 1,
    last_seen_at: ago(1 * HR),
    acked_at: ago(50 * MIN),
    acked_by: 'operator:ada',
    resolved_at: null,
    resolved_source: null,
  },
  {
    notification_id: 'N-01J8TC',
    created_at: ago(2 * HR),
    agent_id: 'agent:indexer-02',
    agent_kind: 'agent',
    kind: 'done',
    priority: 1,
    title: 'Reindex shard 12 complete',
    body: 'Reindex shard 12 complete — 4.1M docs, 0 errors',
    body_html: bodyHtml('Reindex shard 12 complete — 4.1M docs, 0 errors'),
    tags: [],
    ticket_id: 'T-000201',
    fencing_token: null,
    source_system: 'notes',
    source_kind: 'note',
    source_id: 'T-000201',
    deep_link: mcFallbackLink('T-000201'),
    repeat_count: 1,
    last_seen_at: ago(2 * HR),
    acked_at: ago(90 * MIN),
    acked_by: 'operator:ada',
    resolved_at: null,
    resolved_source: null,
  },
];

export const FIXTURE_BROADCASTS: Broadcast[] = [
  {
    broadcast_id: 'B-0007',
    created_at: ago(2 * HR),
    created_by: 'operator:ada',
    body: 'Maintenance window opens 22:00 UTC — pause non-urgent claims',
    body_html: bodyHtml('Maintenance window opens 22:00 UTC — pause non-urgent claims'),
    priority: 3,
    expires_at: ahead(21 * HR),
    revoked_at: null,
    revoked_by: null,
    state: 'active',
  },
  {
    broadcast_id: 'B-0006',
    created_at: ago(25 * HR),
    created_by: 'operator:ada',
    body: 'Vault rotation complete — resume normal ops',
    body_html: bodyHtml('Vault rotation complete — resume normal ops'),
    priority: 2,
    expires_at: ago(1 * HR),
    revoked_at: null,
    revoked_by: null,
    state: 'expired',
  },
  {
    broadcast_id: 'B-0005',
    created_at: ago(49 * HR),
    created_by: 'operator:sam',
    body: 'Draft — do not use',
    body_html: bodyHtml('Draft — do not use'),
    priority: 1,
    expires_at: ago(40 * HR),
    revoked_at: ago(48 * HR),
    revoked_by: 'operator:sam',
    state: 'revoked',
  },
];

export const FIXTURE_HEALTH: HealthSignal[] = [
  { key: 'sse', icon: '⟳', label: 'SSE feed', ok: true, detail: 'connected · fresh 0.4s · Last-Event-ID N-01J8…', source: 'chat' },
  { key: 'push', icon: '📤', label: 'push sink', ok: true, detail: 'ntfy delivering · last ok 12s · gave_up 0', source: 'outbox' },
  { key: 'db', icon: '🗄', label: 'DB size', ok: true, detail: '0.4 GB / 2.0 GB guard (CHAT_DB_SIZE_GUARD)', source: 'chat' },
  { key: 'backup', icon: '💾', label: 'backup', ok: true, detail: 'last 06:00 (7h ago) · 30 dailies · 12 monthlies', source: 'chat' },
  { key: 'resolve', icon: '🔗', label: 'resolve feed', ok: false, pending: true, detail: 'awaiting mc:read grant → deep-links on fallback', source: 'mc' },
];
