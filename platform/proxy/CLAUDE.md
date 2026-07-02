# CLAUDE.md — Reverse Proxy (`proxy`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to the Proxy. Run the 7-stage pipeline; this app is **Standard**, but it is pure plumbing — several stages are thin or N/A (called out below).

## Identity

The Proxy is **plumbing** — the reverse proxy that fronts the suite: subdomain routing to each app's container and TLS termination. It does no product work and holds no product state; it exists so every other app is reachable behind one edge.

## Risk class: Standard

## Agent surface (MCP)

**None.** The Proxy has no agent surface — it exposes no MCP tools (§4). It is infrastructure agents route *through*, not a tool they call.

## Human surface (UI)

**None.** The Proxy has no UI (§4). It is configured as infrastructure (config file / IaC), not operated through a rich human surface. Its UI stage artifact is therefore N/A.

## Key mechanics to build

- **Reverse proxy + subdomain routing:** one edge in front of every app container.
- **TLS termination** for the suite.
- Leaning **Caddy or Traefik** (§9) — validate current specifics in research.
- **Forward-auth is a fixed contract owned by `auth`, not designed here.** Implement `platform/auth/planning/PLAN.md` **§8 VERBATIM** (esp. the §8.10 one-screen reference): verify-endpoint shape, identity-header names, `2xx/401/302/403/5xx` semantics, and the **unconditional inbound identity/trust/prefix header-scrub** (closes Caddy CVE-2026-30851 / Traefik CVE-2026-35051 cluster). Do **not** paraphrase a parallel contract or invent header names. Pin the proxy version past the 2026 forward-auth CVEs; ship the §8.9 proxy-agnostic regression test.

## Definition of done (Stage 7)

- Every app is reachable through the proxy on its subdomain with TLS terminated.
- No product state or secrets held here; config is reproducible.
- Standard invariants that apply to plumbing pass; MCP/UI checks are N/A (no such surfaces).
