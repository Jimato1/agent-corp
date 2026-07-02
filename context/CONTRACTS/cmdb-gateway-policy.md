# CONTRACT — CMDB → Gateway: decision-time policy verdict (+ Board triage read; + flagged host-facts additions)

> **Status: FROZEN core** (MERGE-RESEARCH-1, 2026-07-02); §6 additions are **recommended, pending operator ratification** (MERGE_REVIEW_1 D-6). Producer: **CMDB** (the PDP). Consumers: **Gateway** (deny-biased PEP — the binding caller), **Board** (triage signals), agents (advisory planning probes). Reconciles CMDB RESEARCH §1–§6 with Gateway RESEARCH §4 and Board RESEARCH §9/§10. This closes the gap-6.1 flagship item ("Gateway assumes CMDB duties CMDB never agreed to") — what CMDB actually offers is below; what it does NOT yet offer is called out.

## 1. The decision query (one canonical shape — supersedes the field-name drift inside CMDB's own research)

REQUEST: `{host_id (required), action_class (required), at? (advisory only — CMDB evaluates on its OWN clock), ticket_ref? (audit correlation ONLY, never an authorization input)}`. The query is deliberately **subject-free**: who-is-asking and ticket-approval are auth's and the Board's halves, never CMDB's.

RESPONSE (canonical, from CMDB §5 + §4 window evidence): `{verdict ∈ {deny, ask, permit}, in_window, window_id, window_opens_at, window_closes_at, seconds_remaining, grace, active_freeze?, tier, approval_mode ∈ {auto, ask}, decision_id, evaluated_at, valid_until, policy_version (git commit of the policy repo — makes every decision replayable), tzid, reason[]}`. The MCP planning tools (`is_actionable_now` etc.) return the same shape (advisory); the §6-of-CMDB-research field variants are dead — this is the one shape.

Mapping is deterministic: `not in_window → deny`; `in_window ∧ auto → permit`; `in_window ∧ ask → ask` (**"ask" is NOT an approval** — it defers to the Board's `awaiting_approval` gate).

## 2. Fail-closed matrix (binding on the Gateway as PEP)

unknown `host_id` → deny(no_such_host); known host, no policy → deny(no_policy); CMDB unreachable → **Gateway must deny** (absence of an affirmative permit = deny); unknown/malformed `action_class` → deny; clock skew / DST fold-gap / overlapping-window ambiguity → deny (most-restrictive-wins), with an **observable escalation** (receiver: Board escalation — see MERGE_REVIEW_1 D-6c). CMDB downtime halts all destructive throughput by design.

## 3. Verdict integrity + freshness

- The verdict is a **signed, audience-bound, short-lived token** carrying `decision_id`/nonce and hard expiry; the Gateway validates it cryptographically, so "no verdict" is unforgeable-absence. (Exact signing format: CMDB Stage-2, verified with Gateway.)
- Point-in-time only: the Gateway **re-queries at the instant of execution/redemption** (TOCTOU), never caches `in_window` across an action, never trusts an agent-relayed verdict. `valid_until` is a conservative re-query deadline, never a cross-clock computation.
- **Must-fit rule:** the Gateway refuses to BEGIN an action that cannot finish before `window_closes_at`; the action-duration estimate comes from the playbook catalog entry. `grace` (don't-start-within-N-minutes-of-close) is CMDB window policy carried in the answer.
- Every issued verdict is appended to an append-only decision log at **both** CMDB and Gateway.

## 4. action_class derivation (the SoD invariant both sides agree on)

`action_class` is **derived by the Gateway from the specific vetted playbook it is about to execute** (playbook → fixed class binding) — NEVER accepted from the agent's request. Enum (CMDB-owned, six values, extensible only via policy-plane change control): `package_update, config_change, service_restart, reboot, kernel_update, destructive`. A policy cell may be `auto` only if the class corresponds to a catalog playbook that exists AND declares a rollback path. **Destructive/irreversible classes are structurally non-auto via a floor held at Board/Gateway independently of CMDB** (a compromised CMDB returning permit-for-everything still causes zero destructive actions).

## 5. Registry ownership (restating CONTRACTS/README — binding despite CMDB research leaving it open)

**CMDB owns the task-type registry** (types + destructiveness/reversibility + **external-verifier binding** — the attribute CMDB's research omitted; CMDB Stage-2 must add it) and the **policy attributes** of the runbook catalog; the **Gateway owns playbook implementations**; the **Board mints the per-approval plan→playbook allowlist** bound by `plan_hash`. Board triage consumes tier + task-type + catalog-novelty through THIS surface (its five-signal decision table), never by restating policy.

## 6. Host-facts additions — RECOMMENDED, pending ratification (Gateway assumed these; CMDB never offered them)

To land in CMDB Stage-2 as **inventory facts / policy attributes** (they fit `get_host` / `get_host_policy`), if the operator ratifies D-6:
- (a) `snapshot_capability` per host (btrfs/lvm/zfs/none) — hosts with no in-band rollback route to ask-tier/manual;
- (b) per-tier **health-check / wait-for-SSH timeout policy**;
- (c) the host's **Syscollector scan interval** (sizes the Gateway's Wazuh confirmation-poll window);
- (d) window-close mid-run semantics (abort-and-rollback vs finish-current-atomic-step) as a window policy attribute.
Until ratified these remain Gateway assumptions, not CMDB duties.

## 7. Not in this contract

The tier-0 **`disposable` sandbox class** (auto-approve, no windows, no Vault creds) is missing from both sides' research — see `gateway-cmdb-library-sandbox.md` (SKETCH) and MERGE_REVIEW_1 D-7. CMDB's tier3 "disposable/stateless canary-eligible" is a different concept (real hosts) and must not be conflated; the §4 non-auto floor needs an explicit sandbox-class carve-out when that contract freezes.
