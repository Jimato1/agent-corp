// lib/types.ts — the PINNED backend contract shapes plus the client error type.
// These mirror the Chat backend HTTP API exactly (see README.md → API map).

export type AgentKind = 'agent' | 'service' | 'operator';
export type NotificationKind = 'escalation' | 'needs_review' | 'done';
export type SourceSystem = 'board' | 'mc' | 'notes';
export type SourceKind = 'ticket' | 'review' | 'note';

/** A template-derived deep-link into Mission Control. The ONLY live link on a
 *  notification — always captioned "(target wins)". `pending` = the grant is not
 *  yet live, so the link falls back (honest, never a fabricated destination). */
export interface DeepLink {
  url: string;
  label: string;
  caption: string;
  pending: boolean;
}

/** A single agent→operator notification (the doorbell's atom). */
export interface Envelope {
  notification_id: string;
  created_at: string;
  agent_id: string;
  agent_kind: AgentKind;
  kind: NotificationKind;
  priority: number;
  title: string;
  body: string;
  /** Server-sanitized markdown→HTML. Render via dangerouslySetInnerHTML from
   *  THIS field only (allowlist markdown; raw HTML + remote images stripped;
   *  links already neutralized to dead text). Never render raw `body` as HTML. */
  body_html: string;
  tags: string[];
  ticket_id: string | null;
  fencing_token: string | null;
  source_system: SourceSystem | null;
  source_kind: SourceKind | null;
  source_id: string | null;
  deep_link: DeepLink | null;
  repeat_count: number;
  last_seen_at: string;
  acked_at: string | null;
  acked_by: string | null;
  resolved_at: string | null;
  resolved_source: string | null;
}

export type BroadcastState = 'active' | 'expired' | 'revoked';

/** A soft operator→fleet advisory. It does not stop, gate, or command any agent. */
export interface Broadcast {
  broadcast_id: string;
  created_at: string;
  created_by: string;
  body: string;
  body_html: string;
  priority: number;
  expires_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  state: BroadcastState;
}

/** One row of the doorbell's own liveness (the false-green prohibition binds
 *  hardest here). `ok:false` + `pending:true` = honest amber ▲, never a red
 *  error, never a fabricated green. */
export interface HealthSignal {
  key: string;
  icon: string;
  label: string;
  ok: boolean;
  pending?: boolean;
  detail: string;
  source: string;
}

// -- API response envelopes --------------------------------------------------

export interface NotificationsPage {
  notifications: Envelope[];
  next_cursor: string | null;
}

export interface BroadcastsResponse {
  broadcasts: Broadcast[];
}

export interface HealthResponse {
  signals: HealthSignal[];
}

export interface AckResult {
  notification_id: string;
  acked_at: string;
  acked_by: string;
}

export interface AckBulkResult {
  acked_count: number;
}

// -- SSE event payloads ------------------------------------------------------

export interface AckEvent {
  notification_id: string;
  acked_at: string;
  acked_by: string;
}
