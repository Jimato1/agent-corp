/**
 * Drive-minted identifiers (IDENTIFIERS.md rows):
 *   artifact_id = UUIDv7 (time-ordered), opaque outward.
 *   version_id  = opaque PK of the append-only version chain (UUIDv7; opaque).
 *   upload_id   = ephemeral, never registered (UUIDv7).
 * Drive NEVER mints another app's ids (ticket_id=Board, note_id=Notes, release_id=Vault).
 */
import { randomBytes } from 'node:crypto';

/**
 * RFC 9562 UUIDv7: 48-bit big-endian Unix-ms timestamp, 4-bit version (7),
 * 12 bits rand_a, 2-bit variant (0b10), 62 bits rand_b. Time-ordered.
 */
export function uuidv7(nowMs: number = Date.now()): string {
  const bytes = randomBytes(16);
  const ts = BigInt(nowMs);
  // 48-bit timestamp into bytes[0..5]
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);
  // version 7 in high nibble of byte 6
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // variant 0b10 in high bits of byte 8
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function artifactId(): string {
  return uuidv7();
}
export function versionId(): string {
  return uuidv7();
}
export function uploadId(): string {
  return uuidv7();
}

/** Unique journal event id (for idempotent replay). */
export function eventId(): string {
  return uuidv7();
}

const TICKET_RE = /^T-\d{6,}$/;

/** ticket_id format gate — hard, always (PLAN §2.1). Board mints `T-`+zero-padded int. */
export function isValidTicketId(s: unknown): s is string {
  return typeof s === 'string' && TICKET_RE.test(s);
}

/** note_id is stored opaquely and never validated (IDENTIFIERS: Opaque). Length-guard only. */
export function isPlausibleNoteId(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0 && s.length <= 128;
}
