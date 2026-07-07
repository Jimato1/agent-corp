/*
 * mcp/server.js — MCP Streamable HTTP endpoint (transport spec revision 2025-11-25; ratified D-14).
 * VERIFY-AT-BUILD: re-confirm @modelcontextprotocol/sdk transport API — do NOT target the RC.
 *
 * Stateless per-request server+transport. Auth reuses the SAME RS baseline as REST: bearer validated,
 * principal derived ONLY from the token, per-tool scope enforced here. A sibling of the UI, not its parent.
 * The four tools carry vault:reference; the near-empty surface is the whole point (agents never redeem).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOL_DEFS, makeHandlers } from './tools.js';
import { MCP_SPEC_REVISION, TOOL_SCOPES } from '../constants.js';

function buildServer(services, principal) {
  const server = new McpServer(
    { name: 'vault', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: 'Vault — secrets custody. You may reference credentials by handle and stage a powerless release. You CANNOT read plaintext or redeem — only the Gateway redeems, under a consumed Board approval.' },
  );
  const handlers = makeHandlers(services, principal);
  for (const [name, def] of Object.entries(TOOL_DEFS)) {
    const scope = TOOL_SCOPES[name];
    const handler = handlers[name];
    server.registerTool(name, { description: def.description, inputSchema: def.input }, async (args) => {
      if (scope && !principal.scopes.includes(scope)) {
        return { content: [{ type: 'text', text: 'insufficient_scope' }], isError: true, structuredContent: { code: 'insufficient_scope', scope } };
      }
      return handler(args);
    });
  }
  return server;
}

export function mountMcp(app, { services, rs }) {
  const handle = async (req, res) => {
    let principal;
    try {
      await new Promise((resolve, reject) => rs.authOnly()(req, res, (err) => (err ? reject(err) : resolve())));
      principal = req.principal;
    } catch { return; }
    if (!principal) return;
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => transport.close());
    const server = buildServer(services, principal);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'internal error' }, id: null });
    }
  };
  app.post('/mcp', handle);
  app.get('/mcp', (req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method Not Allowed (stateless)' }, id: null }));
  app.delete('/mcp', (req, res) => res.status(405).end());
  app.set('mcp_spec_revision', MCP_SPEC_REVISION);
}
