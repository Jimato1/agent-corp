/*
 * mcp/tools.js — the agent surface schemas (PLAN §6), PROVISIONAL until the gap-1.3 spike PASS.
 *
 * D-17 schema-complexity ceiling: FLAT objects, no nesting, enum-biased, additionalProperties:false,
 * low-arity. Every mutating tool takes a caller-minted op_id (replays collapse). Business failures
 * are isError:true STRUCTURED results ({code}), NEVER JSON-RPC errors (board-agents-claim.md §1).
 *
 * The adapter is a THIN wrapper over NotesService (the same core the REST API uses) — sibling of
 * the UI, never its parent. Scope is enforced per-tool against the authenticated principal.
 */
import { z } from 'zod';
import { NOTE_TYPES, CEREMONY_PHASES, PROVENANCE, TOOL_SCOPES, ERR } from '../constants.js';
import { BusinessError } from '../errors.js';

const typeEnum = z.enum(NOTE_TYPES);
const provEnum = z.enum(PROVENANCE);
const phaseEnum = z.enum(CEREMONY_PHASES); // CORR-3: display_phase is a spec phase, mechanically

// Flat input shapes (zod raw shapes — the SDK derives JSON Schema with additionalProperties:false).
export const TOOL_DEFS = {
  read_note: {
    description: 'Read a note by id: body + canonical frontmatter + content_hash + commit_sha + own/effective taint.',
    input: { note_id: z.string() },
  },
  list_backlinks: {
    description: 'List notes that wikilink TO this note (backlinks). Returns id/title/type/effective-taint rows.',
    input: { note_id: z.string() },
  },
  search_notes: {
    description: 'FTS search over the corpus. Returns snippet rows with effective taint — never bodies.',
    input: {
      query: z.string(),
      type: typeEnum.optional(),
      tag: z.string().optional(),
      ticket_id: z.string().optional(),
      limit: z.number().int().min(1).max(25).optional(),
    },
  },
  create_note: {
    description: 'Create a note of a template type. fencing_token is REQUIRED when ticket_id is present.',
    input: {
      type: typeEnum,
      title: z.string(),
      ticket_id: z.string().optional(),
      initial_content: z.string().optional(),
      provenance: provEnum.optional(), // raise-only
      fencing_token: z.string().optional(), // REQUIRED when ticket_id present (enforced in service)
      op_id: z.string(),
    },
  },
  append_note: {
    description: 'Append content to a note section. fencing_token REQUIRED if the note is ticket-bound. display_phase updates the display-only mirror.',
    input: {
      note_id: z.string(),
      section: z.string(),
      content: z.string(),
      content_provenance: provEnum.optional(), // raise-only
      display_phase: phaseEnum.optional(), // spec ceremony phase only — decoration
      fencing_token: z.string().optional(),
      op_id: z.string(),
    },
  },
  link_notes: {
    description: 'Create a wikilink from one note to another. fencing_token REQUIRED if either note is ticket-bound.',
    input: {
      from_id: z.string(),
      to_id: z.string(),
      fencing_token: z.string().optional(),
      op_id: z.string(),
    },
  },
  update_note: {
    description: 'Overwrite a note (notes:write; operator/maintenance only). CAS via expected_hash. UNFENCED by exemption.',
    input: {
      note_id: z.string(),
      content: z.string(),
      expected_hash: z.string(),
      op_id: z.string(),
    },
  },
};

/** Convert a service result / BusinessError into an MCP tool result. */
export function ok(structured) {
  return { content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured };
}
export function fail(code, message, details = {}) {
  const structured = { code, message, ...details };
  return { isError: true, content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured };
}

/** Build the { name → handler } map bound to a principal (scope enforced per tool). */
export function makeHandlers(service, principal) {
  const guard = (tool, fn) => async (args) => {
    const needed = TOOL_SCOPES[tool];
    if (!principal.scopes.includes(needed)) {
      return fail('insufficient_scope', `tool ${tool} requires ${needed}`, { required: needed });
    }
    try {
      const out = await fn({ ...args, principal });
      return ok(out);
    } catch (e) {
      if (e instanceof BusinessError) return fail(e.code, e.message, e.details);
      if (e && e.httpStatus) return fail(e.code || 'DEPENDENCY', e.message); // e.g. FENCE_UNVERIFIABLE upstream
      throw e; // genuine protocol/internal error
    }
  };

  return {
    read_note: guard('read_note', ({ note_id }) => service.readNote(note_id)),
    list_backlinks: guard('list_backlinks', ({ note_id }) => ({ backlinks: service.listBacklinks(note_id) })),
    search_notes: guard('search_notes', (a) => ({ results: service.search(a) })),
    create_note: guard('create_note', (a) => service.createNote(a)),
    append_note: guard('append_note', (a) => service.appendNote(a)),
    link_notes: guard('link_notes', (a) => service.linkNotes(a)),
    update_note: guard('update_note', (a) => service.updateNote(a)),
  };
}

export { ERR };
