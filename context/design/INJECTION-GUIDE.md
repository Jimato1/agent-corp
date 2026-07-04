# Helm · Injection Guide (paste order & dependencies)

> How to feed the Helm design-brief package to Claude Design. Master brief: `00-MASTER-BRIEF.md`; per-app blocks: `apps/`.

---

# PART 3 — THE INJECTION GUIDE (how to use this package)

Paste order matters: some app blocks assume a shared surface already exists (chiefly Mission Control's canonical **Review Queue** and **Live-Agent View**). Follow this checklist.

### Step 0 — Build the system first
1. **Paste all of Part 1** into a fresh Claude Design session. Let it establish the token system, the safety visual grammar (the nine shared components), the interaction grammar, the shell, and the three cross-app patterns. Confirm it has built: the **HaltBand** (gold), the **ConfirmFriction** step-up ceremony, the **TierBadge**, **PrincipalRef/TicketRef** chips, the **DataTable**, and the **AppShell** with the suite switcher. These are the vocabulary every later block reuses.

### Step 1 — Build the system-defining apps (they own the surfaces others echo)
2. **Mission Control** — paste **first** among the apps. It owns the canonical **Review Queue** (`/review`), the canonical **Live-Agent View** (`/agents`), and the **global kill switch** actuator. Every other block that mentions "the review queue," "deep-link to MC," or "the live-agent row anatomy" assumes this exists.
3. **Board** — paste **second**. It defines the **ceremony/deliberation** surfaces and the **approval-record decision** surface (a Board-scoped filter of MC's queue). Notes' ceremony-thread render and any "approval" mention echo Board's model.

### Step 2 — Build the knowledge & comms apps
4. **Notes** — Workshop editor + graph + ceremony-thread; its review-attention view **deep-links to MC** (build MC first).
5. **Library** — its **ingestion review queue reuses MC's Review-Queue anatomy** (build MC first); provenance inspector + quarantine states.
6. **Drive** — artifact browser/preview + audit inspector + purge ceremony (self-contained beyond Part 1).
7. **Chat** — its feed **deep-links to MC's review queue** (build MC first); broadcast + ack.

### Step 3 — Build the critical-infra + engine-room (safety-focused, low-frills)
8. **Gateway** — execute monitor + four-check SoD pre-flight + audit chain; kill status is **read-only** and links to MC/auth (build MC first for the link target).
9. **Vault** — secrets admin (write-only) + access audit + break-glass ceremony.
10. **CMDB** — fleet/policy management + the **gate-weakening step-up ceremony** (the centerpiece) + blast-radius preview.
11. **Agent Runtime** — the thin engine-room status view; its any fleet rows **reuse MC's Live-Agent-View anatomy** (build MC first).

### Skip / defer
- **Proxy** — no UI; skip.
- **pdf** — deferred; build only if/when the operator folds it into the suite shell (shell + tokens, no safety grammar).

### Dependency summary (what must exist before what)
- **Everything** depends on **Part 1**.
- **MC before**: Notes (review-attention), Library (ingestion queue anatomy), Chat (queue deep-link), Board (queue filter), Gateway (kill link target), Agent Runtime (live-agent row anatomy).
- **Board before**: nothing hard, but pasting it second means Notes' ceremony-thread and any approval language have a reference.
- Gateway / Vault / CMDB / Drive need only Part 1 (the AuditInspector and ConfirmFriction ceremony are defined there) — MC-first is preferred only so their read-only kill mirrors and review chips have a live link target.

### Global reminders to keep pasting-in with each app (if Claude Design drifts)
- The **halt/safe-stop is gold `#F2842B`, never red**; a dependency outage is **gold** (Pattern D), not a red error.
- **Danger-red `#E5594E`** is only the operator's own destructive finger, always behind the step-up confirm ceremony.
- Every shared entity (ticket, identity, tier badge, fencing, kill band, review chip) is the **one shared component** — never a per-app redraw.
- **Never a false green**: a stale/unverified figure shows the honest unknown, not a fabricated OK.
- The **kill trigger lives only in Mission Control and auth**; every other app shows the halt band **read-only**.
