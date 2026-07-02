# CONTRACT — The kill-switch chain: MC (trigger/mirror) → auth (L1 enforcement) → Gateway (L2 physical stop) → agent-runtime (client drain)

> **Status: FROZEN in shape** (MERGE-RESEARCH-1, 2026-07-02) — four-party contract (naming deviates from `<producer>-<consumer>` because the chain is the seam). Reconciles MC RESEARCH §0.5/§2.3/§7 (D5, H1–H7), auth PLAN §4.6/§7.1–§7.8, Gateway RESEARCH §7, agent-runtime RESEARCH §3 (seams C4/C5/C6), Vault RESEARCH §4 (carve-out). Two auth-side verification items flagged in §6.

## 1. Authority split (ratified model, MC research D5)

- **auth is the SINGLE enforcement point (L1):** owner and sole writer of the monotonic **kill epoch** and the graduated levels **G0 normal / G1 freeze-destructive / G2 quiesce-all**, propagated via the revocation ledger + `auth:revocations` pub/sub + Redis-independent channels (JWKS kid-prune; epoch signed into JWKS/AS-metadata and `X-Auth-Identity`).
- **MC is trigger + read-mirror, never a second switch** *(ratified 2026-07-02: MC KEEPS its kill button — the cockpit affordance — wired to CALL auth's revocation; auth stays the single enforcement point)*: the button is a best-effort authenticated POST to auth's raise-kill-epoch endpoint. On any non-2xx/timeout MC fails **LOUD** ("HALT NOT CONFIRMED") and deep-links to auth's outage-surviving console (`safe_stopped.html`). MC's halt readout derives exclusively from auth's epoch/halt-status state, is stale-but-never-contradictory, carries mirror-age, and degrades CONFIRMED → STALE-UNKNOWN past a freshness bound. MC holds no standing approve/kill credential; every trigger is sender-constrained to the operator's live session.
- **Gateway is the L2 physical stop, outside auth's trust boundary:** it independently refuses post-kill (its own local kill flag + the live auth check), refuses new Vault redemptions, cancels in-flight runs at safe task boundaries, and revokes outstanding Vault leases. Even a forged auth verdict cannot reach a host.
- **agent-runtime is the client half, defense-in-depth only:** epoch-versioned `RUN → DRAIN → KILL` machine whose first act is an unconditional pre-claim gate (a draining runtime can never win a new claim); KILL = DRAIN with zero grace budget. The server-side guarantee never depends on runtime honesty.

## 2. The command (auth/MC → agent-runtime, seam C4)

Schema to freeze verbatim at runtime Stage-2: `{mode: drain|kill, epoch, grace_deadline, issued_by, idempotency}` — **`epoch` IS auth's kill epoch** (one counter suite-wide; a stale/replayed command can never un-drain a higher epoch). Transport push+poll. Drain/kill commands and auth-outage inference arrive on **separate wires**: a command is a present, authenticated, epoch-versioned signal; an outage is inferred absence (token-mint failures). The runtime must never treat an IdP hiccup as a kill or vice versa.

## 3. Drain behavior (runtime, binding)

Shared grace budget (one deadline covering stop-claiming + finish-in-flight, sized to p95/p99 of ONE supervised step). **Checkpoint benign work** (flush to Notes, `in_progress → blocked(reason=drained)`/`needs_review`); **ABANDON anything in flight toward the Gateway** (let the lease lapse; the reaper requeues and increments the fence) — a drain never leaves a half-approved or mid-execution action recoverable. Report `DRAINED` as a distinct signal (see `agent-runtime-mc-heartbeat.md` §4).

## 4. Confirmation provenance (MC H5 — the honesty rule)

**The Gateway's own confirmation is the SOLE legitimate source of L2-CONFIRMED.** Preferred wiring: auth reads the Gateway directly; anywhere MC relays it, the mirror carries mirror-age and degrades past freshness. auth's halt board must not list "Gateway/MC mirror" as an L2 source (reconciliation item on auth's shipped MANIFEST — §6). Stage-7 demo is **two-sided**: once with a cooperating runtime (clean `DRAINED`), once with a simulated rogue agent that ignores drain — the Gateway chokepoint confirming nothing new arrives is the real evidence (seam C6).

## 5. Honesty carve-outs every Stage-5/7 claim must absorb

- The switch is **not instantaneous** at the Gateway: new dispatch + new redemptions stop immediately; in-flight runs cancel at the next safe task boundary (never SIGKILL a live dpkg transaction); run duration is bounded so a hung task cannot ignore the switch indefinitely.
- **An already-issued Vault SSH certificate is NOT revocable** by the kill switch, Vault sealing, or Gateway-token revocation — only TTL expiry (5–15 min) or KRL push/CA rotation. Kill-switch demos claim "no NEW issuance/execution," with cert TTL + enforced NTP as the residual-exposure bound (see `vault-gateway-redemption.md` §4).
- Sandbox (tier-0) execution is covered: it funnels through the same Gateway chokepoint (ARCHITECTURE §5).

## 6. Flagged for verification (auth next session — recorded in MERGE_REVIEW_1)

- **H4:** confirm/shape the raise-kill-epoch endpoint as a monotonic "raise-to-at-least-N" with Idempotency-Key; RFC 7009 per-token revocation stays a separate targeted call.
- **H5:** remove any "Gateway/MC mirror" L2 source from auth's halt board; auth reads the Gateway directly.
- Only the **operator** lifts a kill; automated guardrails fire only in the safe (stopping) direction (auth PLAN, binding).
