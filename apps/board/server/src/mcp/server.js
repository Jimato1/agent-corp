/*
 * mcp/server.js — MCP Streamable HTTP endpoint (transport spec revision 2025-11-25; ratified D-14).
 * VERIFY-AT-BUILD: re-confirm @modelcontextprotocol/sdk transport API — do NOT target the 2026-07-28 RC.
 *
 * Stateless per-request server+transport. Auth reuses the SAME RS baseline as REST: bearer validated,
 * principal derived ONLY from the token, per-tool scope enforced here. A sibling of the UI, not its parent.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOL_DEFS, makeHandlers } from './tools.js';
import { MCP_SPEC_REVISION, TOOL_SCOPES } from '../constants.js';
import { AuthError } from '../errors.js';

function buildServer(board, principal) {
  const server = new McpServer(
    { name: 'board', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: 'Board — the coordination spine. Claim atomically; never negotiate who does the work. Business outcomes are isError structured content, not errors.' },
  );
  const handlers = makeHandlers(board, principal);
  for (const [name, def] of Object.entries(TOOL_DEFS)) {
    const scope = TOOL_SCOPES[name];
    const handler = handlers[name];
    server.registerTool(name, { description: def.description, inputSchema: def.input }, async (args) => {
      // per-tool scope enforcement (agents are scoped users; auth §1 + PLAN §12).
      if (scope && !principal.scopes.includes(scope)) {
        return { content: [{ type: 'text', text: 'insufficient_scope' }], isError: true, structuredContent: { code: 'insufficient_scope', scope } };
      }
      return handler(args);
    });
  }
  return server;
}

export function mountMcp(app, { board, rs }) {
  const handle = async (req, res) => {
    let principal;
    try {
      await new Promise((resolve, reject) => rs.authOnly()(req, res, (err) => (err ? reject(err) : resolve())));
      principal = req.principal;
    } catch {
      return; // rs already wrote the 401/403
    }
    if (!principal) return;
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => transport.close());
    const server = buildServer(board, principal);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'internal error' }, id: null });
    }
  };
  app.post('/mcp', handle);
  app.get('/mcp', (req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method Not Allowed (stateless)' }, id: null }));
  app.delete('/mcp', (req, res) => res.status(405).end());
  app.set('mcp_spec_revision', MCP_SPEC_REVISION);
}
