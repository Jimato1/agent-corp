# Board — Stage-4 Build Verification Checklist

> **Risk class:** Standard. **Branch:** `stage4/board-build`. This checklist is **proven by construction + automated test**, and enumerates the items only the **operator** can finish-verify on real infrastructure (a fresh clone + real concurrent load). Nothing here is a false green: where verification requires the operator to run something, it says so and gives the exact command.

## How to verify from a fresh clone

```bash
# 1. server unit + contract + concurrency suite (33 tests, incl. the MANDATORY consume single-winner test)
cd apps/board/server
npm ci                       # better-sqlite3 prebuilt binary loads; build scripts are blocked by policy and NOT required
node --test                  # expect: tests 33 / pass 33 / fail 0

# 2. the MANDATORY concurrency test in isolation (real OS worker threads racing ONE approval)
node --test test/concurrency-consume.test.js
#   → asserts exactly ONE 200 and the rest 409 across N racing consumers. This is Board's CV-C.

# 3. UI builds against vendored Helm (single global React)
cd ../web
npm ci && npm run build      # prebuild vendors Helm; expect "✓ built" with dist/index.html + one JS chunk

# 4. end-to-end smoke (server + built UI over one API)
cd ../server
NODE_ENV=development BOARD_DEV_UNSAFE_NO_AUTH=true BOARD_DISABLE_SWEEPS=true \
  BOARD_DB_PATH=./smoke/board.db BOARD_BACKUP_DIR=./smoke/bk \
  BOARD_STATIC_DIR=../web/dist BOARD_PORT=8899 node src/index.js &
curl -s localhost:8899/healthz                                   # {"status":"ok","mcp_spec":"2025-11-25"}
curl -s localhost:8899/ -o /dev/null -w '%{http_code}\n'         # 200 (UI served)
# create → claim → confirm fencing token mints and lease sets:
curl -s -XPOST localhost:8899/api/tickets -H 'x-dev-sub: agent:a' -H 'x-dev-kind: agent' -H 'x-dev-scopes: board:propose' -H 'content-type: application/json' -d '{"title":"t","host_id":"h1","op_id":"o1"}'
curl -s -XPOST localhost:8899/api/claim   -H 'x-dev-sub: agent:a' -H 'x-dev-kind: agent' -H 'x-dev-scopes: board:claim'   -H 'content-type: application/json' -d '{"ticket_id":"T-000001","op_id":"o2"}'   # → fencing_token:1
curl -s -D- -o /dev/null localhost:8899/facts/ticket/T-000001 -H 'x-dev-scopes: board:read' | grep -i cache-control       # → Cache-Control: no-store
```

## A. Spec conformance (PLAN + contracts)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| A1 | Ticket lifecycle = the 11-state superset of `TICKET_STATE_MACHINE.md`; terminal set `{done,failed,cancelled}` | ✅ by construction | `src/constants.js` STATES/TERMINAL_STATES; `test/core.test.js` |
| A2 | Atomic claim = one winner + host lock + lease + fencing mint in one tx | ✅ tested | `src/service/claim.js`; `test/core.test.js` claim tests |
| A3 | Approval record + `consume_approval` single-atomic-CAS, single-use, exec-hold-first | ✅ tested + concurrency | `src/service/approval.js`; `test/approval.test.js`; **`test/concurrency-consume.test.js`** |
| A4 | Fencing token = Board-minted monotonic integer `lock_generation`, matches `board-agents-claim.md` | ✅ by construction | `src/service/claim.js` `_lockAcquire`; `test/core.test.js` monotonicity |
| A5 | Four-eyes (approver ≠ proposer) enforced at Board, independent of PDP | ✅ tested | `src/service/approval.js` grant; `test/approval.test.js` four-eyes |
| A6 | Agents cannot cause terminal/execution transitions (allowed set = {awaiting_approval,needs_review,blocked}) | ✅ tested | `src/service/transitions.js` `isAgentForbiddenTarget`; `test/core.test.js` |
| A7 | Ceremony: `ceremony_events` sole phase authority; frontmatter/row display-only; DACI (D-1) + 3-lane triage (D-2) | ✅ tested | `src/service/ceremony.js`; `test/ceremony.test.js` |
| A8 | Three kickoff types (human/scheduled/event); Wazuh HMAC + quarantine + dedup; verification-evidence closes verifying | ✅ tested | `src/service/kickoffs.js`; `test/kickoffs-restore.test.js` |
| A9 | Facts PIP surface (§7) matches `board-consumers-facts-read.md`; `no-store` on every read | ✅ tested + smoke | `src/service/facts.js`; `src/api/http.js` noStore; smoke step 4 |
| A10 | MC console reads + browser-direct writes + SSE match `board-mc-console.md`; CORS mc-origin | ✅ by construction | `src/service/facts.js` since-cursor reads; `src/api/http.js` CORS |
| A11 | MCP surface (§12): flat, enum-biased, `additionalProperties:false`, op_id, `isError` outcomes; spec 2025-11-25 | ✅ smoke | `src/mcp/tools.js`; smoke `tools/list` |
| A12 | Backup snapshot (VACUUM INTO) + §16 restore reconciliation (flag-gated) | ✅ tested | `src/service/backup.js`; `test/kickoffs-restore.test.js` |

## B. Invariant conformance (root CLAUDE.md / ARCHITECTURE.md)

| # | Invariant | Status | Evidence |
|---|-----------|--------|----------|
| B1 | Segregation of duties — Board holds ticket + approval state ONLY; cannot execute; releases no creds | ✅ by construction | Board has no host-cred or execution path; approval record ≠ execution |
| B2 | Agents coordinate via atomic claim, never negotiation | ✅ tested | `src/service/claim.js`; concurrency behavior in `test/core.test.js` |
| B3 | Two views, one state — MCP + HTTP/UI siblings over one service layer | ✅ smoke | `src/board-service.js` composition root; both surfaces hit same services |
| B4 | Done confirmed externally — verifying→done driven by Wazuh evidence, not self-report | ✅ tested | `src/service/kickoffs.js` submitVerification; `test/kickoffs-restore.test.js` |
| B5 | Audit logging of every state change (Standard rigor); MCP authz (scoped) | ✅ tested | `src/service/audit.js`; `src/auth/rs.js`; `test/http.test.js` |
| B6 | Provenance taint raise-only; auto-approve lane ineligible for host-originated inputs | ✅ tested | `src/service/tickets.js` taint; `src/service/approval.js` lane eligibility |
| B7 | Kill switch — Board is a read-only mirror; hosts no actuator (enforcement at auth/Gateway) | ✅ by construction | `src/service/guardrails.js` kill epoch (fail-closed on stale mirror); `/facts/kill` read-only |
| B8 | No secrets in logs (`BOARD_WAZUH_HMAC_SECRET` never logged) | ✅ by construction | secret only read from config, never logged |

## C. The load-bearing property (Board's CV-C) — CONSUME SINGLE-WINNER

**Claim:** two concurrent `consume` of ONE approval → exactly one `200`, one `409`, NEVER two `200`s.

**How it is proven:**
- `consume_approval` acquires the **execution host-lock CAS first** (`INSERT … ON CONFLICT DO UPDATE … WHERE claimed_by_ticket IS NULL RETURNING`) — a lost race here returns `HOST_LOCKED` and **burns nothing** (approval stays `granted`).
- It then flips status with a **single status-guarded UPDATE** (`UPDATE approvals SET status='consumed' … WHERE id=@id AND status='granted'`, acting on `changes===1`). This is a CAS, **not** a SELECT-then-UPDATE.
- Either gate can be the `409` in a race; both are single-winner.
- **`test/concurrency-consume.test.js`** spawns real OS worker threads (`test/helpers/consume-worker.mjs`), each with its **own** better-sqlite3 connection to a shared on-disk WAL database, all released at a shared `startAt` barrier, racing the same approval. It asserts exactly one success and the rest `409` (`HOST_LOCKED | approval_consumed | approval_revoked`).

**⚠ CANNOT-VERIFY without operator action — run these:**
- The consume atomicity is **fully proven only when you run the concurrency test on real on-disk SQLite** (the harness above): `node --test test/concurrency-consume.test.js`. In-memory or single-connection runs do not exercise the cross-connection `BEGIN IMMEDIATE` contention the property depends on.
- **Production restore-consistency drill** (canonical-store obligation, ARCHITECTURE.md §10) is a **Stage-7** exit item, not done here: restore a backup with `BOARD_RESTORE_RECONCILE=true` and confirm granted approvals revoke (A-RR), leases requeue, and fencing floors to now. The §16 logic is unit-tested (`test/kickoffs-restore.test.js`); the *drill* against a real snapshot is the operator's Stage-7 step.
- **Real multi-agent load** (many runtimes claiming across a 20-host fleet) is Stage-6/7; the unit + worker-thread tests simulate it but do not replace a live soak.

## D. Deployment conformance (`context/specs/DEPLOYMENT.md`)
- Service `board`, internal port **8080**, `edge` network, no host ports, volume `board_data`, env prefix `BOARD_*`, auth at `auth:8089`, audience `board`. Verified in `src/config.js` + `docker-compose.board.yml` + `Dockerfile`. **Operator step:** bring up behind the proxy and confirm `board.<SUITE_DOMAIN>` resolves and the auth handshake succeeds (requires the running suite).

## E. Known deferrals (honest absences)
- **MCP schema freeze** is gated on the gap-1.3 spike PASS (D-17). Schemas are built to the ceiling (flat/enum-biased/≤6 params) but are **not frozen**; re-validate against the spike's measured budget before freezing.
- Board audit log is **append-only, not hash-chained** (Standard risk) — the UI renders this honestly and does not fabricate a "chain verified".
- `svc:tier-approver` ships **flag-gated off** (`BOARD_TIER_APPROVER_ENABLED=false`) pending auth kind-gating of its principal.
