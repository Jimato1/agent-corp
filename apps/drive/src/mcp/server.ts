/**
 * MCP agent surface (PLAN §5) — the sibling view over the same Store, never downstream of the UI.
 * Transport: MCP Streamable HTTP, spec pin 2025-11-25 (D-14 suite pin; JSON-RPC 2.0 over POST /mcp).
 * Three flat, low-arity, all-string/enum tools inside the D-17 complexity ceiling; NO bytes cross
 * MCP (metadata + reference only). Errors are typed structured content (isError:true), NEVER bare
 * protocol errors — the board-agents-claim.md §1 business-outcome convention.
 */
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { DriveError } from '../lib/errors.js';
import { requireScope } from '../auth/rs.js';
import type { Principal } from '../lib/principal.js';

const PROTOCOL_VERSION = '2025-11-25';

const TOOLS = [
  {
    name: 'put_artifact',
    description:
      'Register a put intent for a non-markdown deliverable keyed by ticket. Returns an authenticated upload_url; PUT your file bytes to it with your own Bearer token (bytes never cross MCP). Append-only; no delete.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['ticket_id', 'filename', 'op_id', 'fencing_token'],
      properties: {
        ticket_id: { type: 'string', description: 'Board ticket id, T-###### (the artifact provenance key)' },
        filename: { type: 'string', description: 'logical name / filename-as-identity within the ticket' },
        op_id: { type: 'string', description: 'caller-minted idempotency key (per-principal)' },
        fencing_token: { type: 'string', description: 'the Board-minted lease fencing token you currently hold (required)' },
        content_type_hint: { type: 'string', description: 'optional MIME hint (display only; server sniffs the canonical type)' },
        note_id: { type: 'string', description: 'optional Notes note id to link' },
      },
    },
  },
  {
    name: 'get_artifact',
    description: 'Get one artifact\'s metadata + an authenticated download_url (bytes fetched out-of-band with your token).',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['artifact_id'],
      properties: {
        artifact_id: { type: 'string' },
        version_id: { type: 'string', description: 'optional specific version; omit for the current version' },
      },
    },
  },
  {
    name: 'list_artifacts',
    description: 'List a ticket\'s artifacts (latest version each). Provenance fields travel with every row.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['ticket_id'],
      properties: {
        ticket_id: { type: 'string' },
        page_token: { type: 'string' },
        include_deleted: { type: 'boolean' },
      },
    },
  },
] as const;

export function registerMcp(app: FastifyInstance, ctx: AppContext): void {
  app.post('/mcp', async (req, reply) => {
    const rpc = (req.body ?? {}) as { jsonrpc?: string; id?: unknown; method?: string; params?: any };
    const id = rpc.id ?? null;

    const respond = (result: unknown) => reply.send({ jsonrpc: '2.0', id, result });
    const rpcError = (code: number, message: string) => reply.send({ jsonrpc: '2.0', id, error: { code, message } });

    try {
      switch (rpc.method) {
        case 'initialize':
          return respond({
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'drive', version: '0.1.0' },
          });
        case 'tools/list':
          return respond({ tools: TOOLS });
        case 'tools/call': {
          // Authenticate the agent (Bearer, RS baseline) for the actual capability.
          const p = await ctx.rs.verifyBearer(req.headers['authorization']);
          return respond(await callTool(ctx, p, rpc.params?.name, rpc.params?.arguments ?? {}));
        }
        case 'ping':
          return respond({});
        default:
          return rpcError(-32601, `method not found: ${rpc.method}`);
      }
    } catch (e) {
      if (e instanceof DriveError && e.code === 'UNAUTHENTICATED') {
        reply.header('WWW-Authenticate', `Bearer resource_metadata="${ctx.config.publicOrigin}/.well-known/oauth-protected-resource"`);
        return rpcError(-32001, 'unauthenticated');
      }
      // Unexpected: a genuine protocol error (tool breakage), not a business outcome.
      return rpcError(-32603, (e as Error).message);
    }
  });
}

/** Business outcome → structured tool result with isError:true (never a JSON-RPC error). */
function toolError(err: DriveError) {
  const s = err.toStructured();
  return {
    isError: true,
    structuredContent: s,
    content: [{ type: 'text', text: JSON.stringify(s) }],
  };
}
function toolOk(data: unknown) {
  return { structuredContent: data as Record<string, unknown>, content: [{ type: 'text', text: JSON.stringify(data) }] };
}

async function callTool(ctx: AppContext, p: Principal, name: string, args: Record<string, unknown>) {
  try {
    switch (name) {
      case 'put_artifact': {
        requireScope(p, 'drive:write');
        await ctx.budget.check(p, 'write-benign');
        const res = ctx.store.register(p, {
          ticket_id: String(args['ticket_id'] ?? ''),
          logical_name: String(args['filename'] ?? ''),
          op_id: String(args['op_id'] ?? ''),
          fencing_token: (args['fencing_token'] as string | undefined) ?? null,
          mime_hint: (args['content_type_hint'] as string | undefined) ?? null,
          note_id: (args['note_id'] as string | undefined) ?? null,
        });
        return toolOk({
          artifact_id: res.artifact_id,
          upload_url: `${ctx.config.internalOrigin}/api/uploads/${res.upload_id}`,
          expires_policy: res.expires_policy,
          ticket_state: res.ticket_state,
          instructions:
            'HTTP PUT your file bytes to upload_url with your own Bearer token (aud=drive, drive:write); the response carries version_id + sha256.',
        });
      }
      case 'get_artifact': {
        requireScope(p, 'drive:read');
        await ctx.budget.check(p, 'read');
        const a = ctx.store.getArtifact(String(args['artifact_id'] ?? ''));
        if (!a) return toolError(new DriveError('NOT_FOUND', 'no such artifact'));
        const versionId = (args['version_id'] as string | undefined) ?? (a.metadata['current_version_id'] as string | null) ?? undefined;
        const cur = a.metadata['current'] as Record<string, unknown> | null;
        return toolOk({
          artifact_id: a.metadata['artifact_id'],
          ticket_id: a.metadata['ticket_id'],
          logical_name: a.metadata['logical_name'],
          ticket_state: a.metadata['ticket_state'],
          version_id: versionId,
          current: cur,
          download_url: versionId ? `${ctx.config.internalOrigin}/api/versions/${versionId}/content` : null,
        });
      }
      case 'list_artifacts': {
        requireScope(p, 'drive:read');
        await ctx.budget.check(p, 'read');
        const opts: { page_token?: string; include_deleted?: boolean } = { include_deleted: args['include_deleted'] === true };
        if (typeof args['page_token'] === 'string') opts.page_token = args['page_token'] as string;
        const res = ctx.store.listByTicket(String(args['ticket_id'] ?? ''), opts);
        return toolOk(res);
      }
      default:
        return toolError(new DriveError('NOT_FOUND', `no such tool: ${name}`));
    }
  } catch (e) {
    if (e instanceof DriveError) return toolError(e);
    throw e;
  }
}
