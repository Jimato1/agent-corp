# CONTRACT — Gateway → MC: signed audit-chain HEAD anchoring (receive-and-retain)

> **Status: FROZEN** (Gateway Stage-2, 2026-07-03). Producer: **Gateway** (owns the canonical append-only, hash-chained, Ed25519-signed audit chain in its private Postgres, D-8). Consumer: **MC** (independent off-box tamper-evidence anchor — its consumer half is pre-committed in `apps/mission-control/planning/PLAN.md` §3.3/§6.3/§9-R3). Closes the CONTRACTS/README "still to write" row `gateway → mc: signed audit-chain HEAD anchoring`. Sources reconciled: Gateway RESEARCH §6 (anchor-off-box mandate), MC PLAN §3.3/§6.3/§6.4/§9-R3, ARCHITECTURE §10 (audit tables are CANONICAL append-only).

## 1. Why this seam exists
A hash chain proves internal consistency only; an attacker with full store access can rebuild a self-consistent alternate chain. **Freshness is provable only by anchoring the signed HEAD somewhere the Gateway host cannot rewrite.** MC retains the HEAD series as that independent witness. MC's copy is an **anchor, never a source of truth** — it is never read back into any authority's decision path (MC PLAN A2).

## 2. The push (Gateway → MC)
- Endpoint: `POST /api/anchors` on MC. Auth: `svc:gateway` bearer, scope **`mc:anchor`** (MC PLAN §6.4; grant requested of auth this session).
- Payload: `{chain_id, seq, head_hash, signed_at, sig, prev_seq}` — `sig` is the Gateway's Ed25519 signature over the canonical HEAD record; `chain_id` identifies the chain (a new `chain_id` is minted on any restore that cannot prove continuity — §4).
- **Idempotency:** MC dedups by `(chain_id, seq)` (MC PLAN §6.3). Re-push of an already-retained HEAD is a safe no-op.
- **Cadence:** every 100 audit records OR 5 minutes (whichever first), AND on every run-terminal transition. Kill/halt and mutex events, being audit records, are anchored on the same cadence.

## 3. Retention + backfill (the producer duty MC asked for, §9-R3)
- Gateway retains pushed HEADs **≥ 180 days**.
- On (re)connect, the Gateway reads MC's advertised **last retained `(chain_id, seq)`** and **re-pushes every retained HEAD above it** — this clears benign gaps from MC restore/downtime (MC's `(chain_id, seq)` idempotency makes bulk re-push safe).
- HEADs that fall past Gateway-side retention before MC ever received them are a **permanent, alarmed hole** in the anchor series — surfaced as such on both sides, never papered over (MC PLAN §3.3/§9-R3).

## 4. Failure + restore semantics
- **Anchor-push failure alarms but does NOT halt Gateway execution.** The local chain remains fail-closed on its own audit-write (audit-write failure halts dispatch — Gateway PLAN §9); anchoring is the *freshness* witness, whose absence MC renders as `RESYNC-PENDING`, not a Gateway stop.
- **Restore-consistency (Gateway side):** a restored Gateway DB whose latest HEAD for a `chain_id` is *older* than MC's retained latest for that `chain_id` must **continue under a NEW `chain_id`** — it must never re-push a lower `seq` under the old `chain_id` as if current (MC would flag `RESTORED-BEHIND-ANCHOR`; the Gateway avoids asserting it). Monotonic `seq` within a `chain_id` is invariant.
- **Restore-consistency (MC side):** MC never presents a restored (older) HEAD as latest; gaps/regressions surface as continuity status on `GET /api/anchors` (MC PLAN §3.3).

## 5. Not in this contract
The chain's internal record format, signing-key custody (Gateway PLAN O1), and the git audit mirror are Gateway-internal. MC receives only the signed HEAD tuples in §2 — it never receives per-command audit payloads (those stay in the Gateway's canonical store; MC anchors the hash, not the contents).
