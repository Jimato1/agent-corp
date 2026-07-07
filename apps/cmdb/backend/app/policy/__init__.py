"""The policy engine — the CMDB's decision core.

One pure ``evaluate()`` (``policy.evaluate``) is the ONLY decision code path, called
byte-identically by the binding ``POST /v1/decision``, every advisory MCP tool, and the
operator dry-run. It reads the in-process write-through snapshot (``policy.store``),
never a stale index. The three-layer weakening classifier (``policy.classifier``) guards
every mutation.
"""
