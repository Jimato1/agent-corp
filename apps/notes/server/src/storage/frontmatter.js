/*
 * frontmatter.js — YAML frontmatter parse/serialize with the DISPLAY-ONLY FIREWALL.
 *
 * ============================ CORR-2 (the central Notes correction) ============================
 * PLAN §2.2b / TICKET_STATE_MACHINE.md §3:
 *   Frontmatter is classified into two regimes:
 *     (a) canonical fields — the file is truth for these (read back freely).
 *     (b) display-only mirrors (ceremony_phase_display, ticket_status_display) — WRITE-ONLY.
 *         They are decoration for a human eyeball. NO API, tool, trigger, or index query EVER
 *         reads them to decide anything. Convergence/ceremony signals come from the Board API
 *         (board.ceremony_transition), NEVER from frontmatter.
 *
 *   The firewall is STRUCTURAL, not policed: `readable()` strips display-only fields, so the only
 *   value that ever leaves this module toward the index, an API read, or a search response is the
 *   canonical projection. There is literally nothing to read back. The Stage-1 design that made
 *   `status: converged` frontmatter a Board-read trigger is DEAD.
 * ==============================================================================================
 */
import yaml from 'js-yaml';
import { CANONICAL_FRONTMATTER, DISPLAY_ONLY_FRONTMATTER } from '../constants.js';

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const CANON = new Set(CANONICAL_FRONTMATTER);
const DISPLAY = new Set(DISPLAY_ONLY_FRONTMATTER);

/** Parse a raw markdown file into { fm, body }. Missing/invalid frontmatter → fm = {}. */
export function parse(raw) {
  const text = String(raw);
  const m = text.match(FM_RE);
  if (!m) return { fm: {}, body: text };
  let fm;
  try {
    fm = yaml.load(m[1]) || {};
  } catch {
    fm = {};
  }
  if (typeof fm !== 'object' || Array.isArray(fm)) fm = {};
  return { fm, body: m[2] };
}

/** Serialize { fm, body } back to a markdown file with a stable key order. */
export function serialize(fm, body) {
  // Canonical fields first (stable order), then display-only mirrors, then any extras last.
  const ordered = {};
  for (const k of CANONICAL_FRONTMATTER) if (fm[k] !== undefined) ordered[k] = fm[k];
  for (const k of DISPLAY_ONLY_FRONTMATTER) if (fm[k] !== undefined) ordered[k] = fm[k];
  for (const k of Object.keys(fm)) if (!CANON.has(k) && !DISPLAY.has(k)) ordered[k] = fm[k];
  const yamlText = yaml.dump(ordered, { lineWidth: -1, noRefs: true, sortKeys: false }).trimEnd();
  const bodyText = body == null ? '' : String(body);
  return `---\n${yamlText}\n---\n${bodyText.startsWith('\n') ? '' : ''}${bodyText}`;
}

/**
 * CORR-2 firewall gate. Returns the frontmatter with EVERY display-only field removed.
 * This is the ONLY frontmatter shape allowed to reach the index, an API response, or a search
 * result. Callers that persist (serialize) may keep the display copies; callers that *read back*
 * MUST route through here first. Enforced by construction — see index/db.js (no display columns)
 * and api/notes.js (responses built from readable()).
 */
export function readable(fm) {
  const out = {};
  for (const [k, v] of Object.entries(fm)) {
    if (DISPLAY.has(k)) continue; // structurally unreadable
    out[k] = v;
  }
  return out;
}

/** True iff a field name is a write-only display mirror (never a trigger input). */
export function isDisplayOnly(field) {
  return DISPLAY.has(field);
}

/**
 * Apply a display-phase update. Writes ceremony_phase_display ONLY. This is decoration; it does
 * not and cannot influence any decision. Returns a new fm object.
 */
export function withDisplayPhase(fm, phase) {
  return { ...fm, ceremony_phase_display: phase };
}
export function withTicketStatusDisplay(fm, status) {
  return { ...fm, ticket_status_display: status };
}
