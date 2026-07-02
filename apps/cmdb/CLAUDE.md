# CLAUDE.md — CMDB (`cmdb`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to the CMDB. Run the 7-stage pipeline; this app is **Critical-infra**, so Stages 5 and 7 have teeth.

## Identity

The CMDB is **the policy brain** — the inventory of the fleet plus the rules that govern what may be done to each host and when. It answers the one question the Gateway must ask before acting: *is this host allowed to be touched right now?* It holds no credentials and executes nothing; it is the criticality tier, the maintenance window, and the auto-vs-ask decision made legible.

## Risk class: Critical-infra

## Its place in the segregation-of-duties chain

The CMDB holds **the policy** — one of the four holders that must independently agree before any destructive action (Board = approval, CMDB = policy, Vault = credentials, Gateway = execution). Before the Gateway acts it asks the CMDB whether this host's criticality-tier approval is satisfied and whether it is inside its maintenance window. A correct plan on an out-of-window or wrong-tier host is still refused here. This is the invoice-approver-can't-cut-the-check rule; write it at the top of the security stage.

## Agent surface (MCP)

- Query policy: host **criticality tier**, **maintenance window**, **in-window?**, auto-vs-ask.
- Read-oriented for agents; fleet/policy mutation is an operator action.

## Human surface (UI)

- Manage the fleet (inventory) and the policies (tiers, windows, approval mode) per host.

## Key mechanics to build

- **Policy the Gateway can query at decision time** (§3): tier, window, in-window?, auto-vs-ask — the authoritative "may this happen now" answer.
- **Per-host criticality tiers** drive the approval gate (tier can auto-approve or force operator approval — ties to the Board's `awaiting_approval`).
- **Maintenance windows** enforced as policy, not convention.
- Feeds the reference scenario (§7): per-host criticality/window pulled during recon; tier batching and window scheduling in the plan.

## Definition of done (Stage 7)

- Written proof the segregation-of-duties property holds: CMDB alone causes no action; policy is independently required at execution time.
- Demonstrated: an out-of-window or insufficiently-approved host is refused regardless of ticket/plan state.
- Both surfaces read/write the same fleet + policy over one shared state.
- Critical-infra security stage cannot exit on a light checklist (§8).
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-14)** **Bespoke thin fail-closed policy registry** — do NOT adopt NetBox/iTop/Ralph (canonicality + SoD-independence grounds); graft NetBox's tag/config-context precedence and iTop's first-class recurring windows. Markdown+git canonical, SQLite rebuildable index.
2. **(D-6)** CMDB **accepts the host-facts duties** the Gateway assumed: `snapshot_capability`, per-tier health/SSH timeout policy, Syscollector scan-interval fact, mid-run window-close semantics. Fail-closed escalations land as **Board escalations**. See `context/CONTRACTS/cmdb-gateway-policy.md` §6.
3. **(D-7)** The tier-0 **`disposable` sandbox class** (auto-approve, no windows, no Vault creds, explicit carve-out from the destructive-never-auto floor) is a **mandatory Stage-2 EXIT item** — `context/CONTRACTS/gateway-cmdb-library-sandbox.md`.

> **Stage-2 obligation (ratification ledger):** this file's shared-context pointer was broken (`/_context/`) during Stage-1 — re-check RESEARCH.md against the frozen contracts and tier-1 specs before planning hardens.
