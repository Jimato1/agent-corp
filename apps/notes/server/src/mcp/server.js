/*
 * mcp/server.js — MCP Streamable HTTP endpoint (transport spec revision 2025-11-25; ratified D-14).
 * VERIFY-AT-BUILD: re-confirm @modelcontextprotocol/sdk transport API at build time
 * (board-agents-claim.md §6) — do NOT design against the 2026-07-28 RC.
 *
 * Stateless per-request server+transport. Auth uses the SAME RS baseline as REST: the bearer is
 * validated, the principal is derived ONLY from the token, and per-tool scope is enforced in
 * tools.js. The MCP layer is a thin adapter over NotesService — a sibling of the UI, not its parent.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOL_DEFS, makeHandlers } from './tools.js';
import { MCP_SPEC_REVISION } from '../constants.js';

function buildServer(service, principal) {
  const server = new McpServer(
    { name: 'notes', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: 'Notes — agents\' external memory. Markdown is truth; search is a scoped tool.' },
  );
  const handlers = makeHandlers(service, principal);
  for (const [name, def] of Object.entries(TOOL_DEFS)) {
    server.registerTool(name, { description: def.description, inputSchema: def.input }, handlers[name]);
  }
  return server;
}

/** Mount POST/GET/DELETE /mcp on the express app. `rs` is the ResourceServer. */
export function mountMcp(app, { service, rs, budget }) {
  const handle = async (req, res) => {
    let principal;
    try {
      // Reuse the RS authenticate path; it derives principal from the validated token only.
      await new Promise((resolve, reject) => {
        rs.authOnly()(req, res, (err) => (err ? reject(err) : resolve()));
      });
      principal = req.principal;
    } catch {
      return; // rs already wrote the 401/403
    }
    if (!principal) return;

    // Stateless transport (no session store) — one server per request.
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => transport.close());
    const server = buildServer(service, principal);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'internal error' }, id: null });
      }
    }
  };

  app.post('/mcp', handle);
  // Streamable HTTP GET (server→client stream) and DELETE (session end); stateless returns 405.
  app.get('/mcp', (req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method Not Allowed (stateless)' }, id: null }));
  app.delete('/mcp', (req, res) => res.status(405).end());
  app.set('mcp_spec_revision', MCP_SPEC_REVISION);
}
