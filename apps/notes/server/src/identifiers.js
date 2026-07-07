/*
 * identifiers.js — Notes mints exactly one cross-app ID: note_id.
 * IDENTIFIERS.md: `N-` + 26-char ULID; immutable; set at creation; survives renames; opaque.
 * Path is the human handle, id is the machine handle (PLAN §2.1).
 */
import { ulid } from 'ulid';
import { NOTE_ID_PREFIX, NOTE_ID_RE, TICKET_ID_RE } from './constants.js';

export function mintNoteId() {
  return NOTE_ID_PREFIX + ulid();
}

export function isNoteId(v) {
  return typeof v === 'string' && NOTE_ID_RE.test(v);
}

// Board ticket ids are foreign & opaque — we only validate SHAPE, never fabricate (IDENTIFIERS.md).
export function isTicketIdShape(v) {
  return typeof v === 'string' && TICKET_ID_RE.test(v);
}

// A filesystem-safe slug for the human path handle. Never parsed for meaning; id is authoritative.
export function slugify(title) {
  const base = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'untitled';
}
