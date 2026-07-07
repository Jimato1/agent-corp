"""Human-surface HTTP API (two views, one state — UI_SPEC §12). The operator UI reads the same
state the MCP tools write. Human write paths are ONLY catalog change-control and orphan
re-redemption — both step-up + audit-chained. The dispatcher (POST /api/runs) is internal/
agent-driven (four-check chain), NEVER an operator button."""
from .routers import router as api_router  # noqa: F401
