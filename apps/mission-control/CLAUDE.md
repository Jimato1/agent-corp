# CLAUDE.md — Mission Control (`mission-control`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to Mission Control. Run the 7-stage pipeline; this app is **Standard**, so normal rigor applies.

## Identity

Mission Control is **the manager's cockpit** — the operator's single console over a suite of continuously-running agents. It is where a human sets objectives, watches the fleet, enforces guardrails, and clears the review + approval queues. It is also where the **global kill switch** is thrown, even though that switch physically bites downstream at the Gateway chokepoint.

## Risk class: Standard

## Agent surface (MCP)

- Report status / heartbeats; request escalation.
- Deliberately thin: this is a control plane the operator drives, not a place agents do work.

## Human surface (UI)

- Live agent view (who is running, on what, right now).
- WIP / budget controls; **global kill switch**.
- Unified **review + approval queue** — both human gates in one place: pre-execution `awaiting_approval` and post-work `needs_review`.

## Key mechanics to build

- **Guardrails** (§5): hard review/approval gates; WIP limits (per-agent and global); budgets as *compute/time/concurrency* caps + action cooldowns (**not dollars**); loop guards (cap follow-up spawn depth, flag runaway chains).
- **Global kill switch:** the control lives here; it *physically halts action at the Gateway chokepoint*. Verify the end-to-end path in Stage 7 (coordinate with the Gateway).
- **Two human gates** (§3): route `awaiting_approval` (propose→approve→execute) and `needs_review` (post-work, human-only to clear) into one operator queue.
- Because agents are "free" locally, the failure mode is **never terminating / confident garbage** — surface termination and quality signals, not spend.

## Definition of done (Stage 7)

- Kill switch demonstrated to halt in-flight action suite-wide (path from this UI to the Gateway bite).
- WIP/budget/loop guards enforced under simulated multi-agent load.
- Both approval and review gates clear correctly from the unified queue.
- Standard invariants pass (MCP authz, audit logging of state changes).
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-3)** Runtime identity is **`mc`** — compose service, subdomain, and auth audience are all `mc` (DEPLOYMENT §2; matches built auth's audience segment). The directory stays `apps/mission-control/`.
2. **(kill-switch sub-question)** MC **keeps its kill button** — the cockpit affordance, wired to CALL auth's raise-kill-epoch; auth remains the single enforcement point; fail-loud + hard hand-off to auth's outage-surviving console on any non-2xx (`context/CONTRACTS/killswitch-chain.md`).
3. **(D-10)** MC owns the observability sidecars: `mc_prometheus`, `mc_blackbox`, and the **log shipper + log store** (ownership ratified — was unowned). DEPLOYMENT §3a.
4. **(D-11)** MC **surfaces and auto-triages** loop-guard/spawn-depth signals; enforcement lives at the Board (claim-time lineage caps); auth keeps token/identity budgets only.
