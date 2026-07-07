/*
 * templates.js — per-type structured templates (PLAN §5).
 *
 * Templates constrain agent output (ARCH §3 scaffolding) without putting schema intelligence in
 * the model. `create_note(type)` instantiates the section headers; `append_note(section)` targets
 * a header. The `deliberation` template uses the SPEC ceremony vocabulary 1:1 (CORR-3, PLAN §7.1).
 *
 * These defaults are versioned in the corpus at `.templates/<type>.md` and are operator-editable;
 * this module is the built-in fallback used when the corpus copy is absent.
 */
import { CEREMONY_PHASES } from '../constants.js';

const H2 = (s) => `## ${s}`;

export const TEMPLATE_SECTIONS = {
  research: ['Objective', 'What I did', 'Findings', 'Open questions', 'Next step'],
  plan: ['Goal', 'Approach', 'Steps', 'Risks', 'Rollback'],
  retro: ['What happened (git + external before/after)', 'Lessons', 'Feed-forward to recon'],
  // CORR-3: deliberation sections are EXACTLY the seven spec phases, in order, nothing added.
  deliberation: CEREMONY_PHASES.slice(),
  checkpoint: [], // RESERVED (agent-runtime C12) — opaque until that contract freezes.
  general: [],
};

/** Build the initial body for a new note of `type`, optionally seeding user content. */
export function instantiate(type, initialContent) {
  const sections = TEMPLATE_SECTIONS[type] || [];
  if (type === 'deliberation') {
    // Match the UI_SPEC S3 structure: planning carries the anti-anchoring subsections.
    const lines = [];
    for (const phase of sections) {
      lines.push(H2(phase));
      if (phase === 'planning') {
        lines.push('### Independent positions');
        lines.push('### Joint discussion');
      }
      lines.push('');
    }
    return (initialContent ? initialContent.trimEnd() + '\n\n' : '') + lines.join('\n');
  }
  const body = sections.map((s) => `${H2(s)}\n`).join('\n');
  if (initialContent && sections.length === 0) return String(initialContent);
  return (sections.length ? body + '\n' : '') + (initialContent ? String(initialContent) : '');
}

/** Locate the [start,end) line span of a `## Section` (or `### Section`) header's content. */
export function findSection(body, section) {
  const lines = body.split('\n');
  const re = new RegExp(`^#{2,3}\\s+${escapeRe(section)}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{2,3}\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end, lines };
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
