"""library.clients — thin seams to the cross-app surfaces the Library CONSUMES.

Each client is a Protocol-shaped seam (auth's "config swap, not rewrite" discipline)
with an injectable transport so the whole app is testable with deterministic doubles.
None of these transports is pinned by a frozen contract — the contracts fix the tool
*signatures* only (agent-runtime / CMDB / Gateway own transport) — so each client
degrades LOUDLY per its contract when its endpoint is unset or down.
"""
