# UI/UX Spec — proxy

**Status: N/A BY CONSTRUCTION — no human surface, no agent surface, no UI.**

`proxy` is the suite's reverse proxy / edge (Caddy/xcaddy + forward-auth). Per `platform/proxy/CLAUDE.md` and `platform/proxy/planning/PLAN.md` §1/§7 it holds **no product state** and exposes **neither an MCP surface nor a UI** — its Stage-2 data-model/MCP/UI exit criteria are marked N/A. There is nothing for this Stage-3 spec to design.

## Why there is no screen here

- The proxy is pure plumbing: it terminates TLS, maps each subdomain-label to its audience, runs auth's `§8` forward-auth contract **verbatim** (scrubs inbound identity/trust headers, injects auth's signed `X-Auth-Identity` on a 200, relays auth's `200/302/401/403/5xx`), and relays the kill-switch 403. The **physical kill-switch bite stays at the Gateway**, never at the proxy.
- Any "proxy health" an operator needs is surfaced **through Mission Control** (edge/observability panel) and the app-level `AppShell` suite-posture line (`DESIGN_SYSTEM.md` §6.1), not by a proxy-hosted console.
- Optional loopback-only `/healthz` is machine-facing, not a UI.

## The proxy's relationship to the design system

Indirect but load-bearing: **every app's UI sits behind this edge.** The `AppShell` (§6.1) assumes the proxy's authenticated human session and renders the `auth:revocations` "session ended — re-authenticate" state (§5.5) when it drops. The proxy itself consumes **no** `DESIGN_SYSTEM.md` component because it renders nothing.

No design work required. This file records the deliberate absence.
