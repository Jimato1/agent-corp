"""agent-runtime — the workforce / client half of every guardrail.

Critical-infra platform layer. Hosts the agent processes (the standing worker
pool + per-ticket sessions), produces the heartbeat/liveness stream Mission
Control reads, hosts the local inference stack behind one swappable facade
(``generate()``/``embed()``), physically holds the per-agent TPM-sealed signing
keys, and obeys the drain/kill switch IN CODE (never model-trusted).

It is NOT one of the four SoD action-holders (Board / CMDB / Vault / Gateway):
it holds identity key material only, never host credentials, and has no approval
or execution authority. It has no agent-facing MCP scopes — the inversion is
constitutional: agents do not call the runtime; the runtime runs agents.

See platform/agent-runtime/planning/PLAN.md and research/RESEARCH.md.
"""

__version__ = "0.1.0"
SCHEMA_VERSION = 1  # heartbeat/facade wire schema_version (contract-frozen)
