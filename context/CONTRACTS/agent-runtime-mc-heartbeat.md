# CONTRACT — agent-runtime → Mission Control: heartbeat / liveness stream (+ drained report)

> **Status: FROZEN** (MERGE-RESEARCH-1, 2026-07-02). Producer: **agent-runtime supervisor** (single aggregation point). Consumer: **Mission Control** (display only — MC never mutates ticket state from this stream). Reconciles agent-runtime RESEARCH §2 (seams C2/C5) with MC RESEARCH §2.1/§8-D8. Cadence numbers finalize after the gap-1.2 sizing measurement.

## 1. Transport and topology

One **SSE** producer connection per runtime instance → MC (never N per-agent connections). Runtime joins `edge` only. Two beats to two authorities, never collapsed: **lease renewal → Board** (authoritative, progress-gated — see `board-agents-claim.md` §2); **telemetry → MC** (advisory, this contract).

## 2. Per-agent frame (field names frozen)

`schema_version`, `agent_id`/`sub` (auth-minted, opaque), `session_id` (runtime-minted, contract-scoped), `claimed_ticket_id` (opaque), `fencing_token` (Board-minted — lets MC flag **zombies**: a heartbeat bearing a token older than the Board's current generation means the Board already reaped and reissued), `process_alive_ts` (supervisor beat), `work_progress_ts` + monotonic `step_seq` (emitted from inside the agent loop at each Board/Notes interaction), `model_version`/`persona_version`, `drain_state ∈ {active, draining, drained, quiescing, quiesced}`.

**Not in the frame:** spawn depth and lineage caps. Spawn depth is a property of the Board's ticket parent/child graph; MC derives it from Board reads (API composition), never from heartbeats. (MC's Stage-1 wish for "spawn depth" in the heartbeat is resolved this way — one authority per fact.)

## 3. Fleet frame (the dead-man switch)

`schema_version`, `runtime_instance_id`, `roster` (the population denominator), `supervisor_ts`, `runtime_drain_state`. Absence of the fleet frame = the runtime itself is down (one event, not N deaths).

## 4. Semantics MC MUST implement

- **wedged** ⇔ `process_alive_ts` fresh but `work_progress_ts`/`step_seq` stale (flag only after a **role-specific progress budget** — minutes, measured per gap-1.2, never a fleet constant). **crashed** ⇔ both stale. **drained/quiesced** ⇔ reported `drain_state`, expected silence.
- Suspicion timing via **accrual detection** (phi-accrual, threshold ≈8, up to 12 on noisy nets) — not a fixed missed-N-beats boolean.
- **Correlated-loss suppression is mandatory:** if the fraction of agents crossing the suspicion threshold within one window exceeds a configured share (operator-set, ~30–50%), MC suppresses per-agent death display and raises a single `FLEET_LIVENESS_ANOMALY`; cross-check the supervisor dead-man frame and auth/edge health before declaring anything dead. MC never mass-declares death on a synchronized cliff.
- `DRAINED` is a **distinct terminal report**, never inferred from silence. `QUIESCED_BY_OUTAGE` (auth-outage degraded mode) is a separate posture: a kill/drain is an explicit epoch-versioned command (present signal); an outage is inferred absence — MC must render them differently, and MC's fail-loud kill-switch mirror must agree with the runtime's reported state.

## 5. Recommended cadence (finalize post-sizing)

`process_alive_ts` ≈10s; `work_progress_ts` on every ticket step. MC display thresholds derive from measured local-model step latency, not seconds-scale web-service defaults.

## 6. Change rule

Field set is additive-only; semantics in §4 change only by amending this doc with both sessions citing it.
