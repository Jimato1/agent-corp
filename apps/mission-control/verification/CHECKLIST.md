# Verification — Mission Control (`mc`) · Stage-4 Build

> **Scope of this document.** Stage 4 (Build) is complete. This file records what was built,
> proves the FROZEN-contract conformance points **by construction** (code + tests, not a live
> multi-container run), and lists exactly what CANNOT be verified in an isolated worktree plus the
> commands to verify it once the suite is up. The full Stage-7 invariant sign-off (external
> kill-switch demo, restore drill) is deferred to Stage 7 and flagged below.

Risk class: **Standard**. Runtime name **`mc`** (D-3). Branch: `stage4/mc-build`.

---

## 0 · How to verify from a fresh clone

```bash
# from repo root, in the worktree:
cd apps/mission-control

# --- backend: 45 unit + contract-conformance tests ---
cd backend
python -m venv .venv
. .venv/Scripts/activate           # POSIX: source .venv/bin/activate
pip install -r requirements.txt
pip install pytest
python -m pytest -q                 # expect: 45 passed

# --- frontend: SPA build (single-global-React Helm vendoring) ---
cd ../frontend
npm install
npm run build                       # expect: built dist/ incl. dist/helm/_ds_bundle.js

# --- end-to-end serve smoke (backend serves the built SPA) ---
cd ../backend
MC_STATIC_DIR=$(pwd)/../frontend/dist \
MC_AUTH_TEST_HS256_SECRET=devsecret \
python -c "from app.main import app"    # import-time asserts pass => surfaces wired

# --- container image (needs Docker) ---
cd ..
docker build -t mc:latest .             # 3-stage: frontend -> pydeps -> slim runtime (UID 10001)
```

Whole-suite bring-up (needs the other apps + the external `edge` network):

```bash
docker network create edge              # if not already created by the proxy
docker compose up -d                    # mc + mc_redis + mc_prometheus + mc_blackbox + mc_logstore + mc_logship
docker compose config                   # validates topology (networks/volumes)
```

---

## 1 · What was built (both surfaces over one state)

**Backend BFF (`backend/app/`)** — FastAPI OAuth2 resource server, `aud==mc`, local JWKS validation
(hand-rolled JWS over `cryptography`, house pattern; EdDSA/ES256 prod + HS256 test-signer).

- **HTTP/UI API** (`api/`): `/api/fleet`, `/api/agents/{sub}`, `/api/queue[/{ticket_id}]`,
  `/api/posture`, `/api/budgets`, `/api/wip`, `/api/edge`, `/api/anchors`, `/api/params`,
  `/api/killswitch/raise`, `/api/silences`, `/api/events` (SSE multiplex incl. the resolve feed),
  `/api/audit`.
- **MCP surface** (`mcp/surface.py`): deliberately thin — `report_status`, `request_escalation`
  only. Flat, low-arity, enum-biased (D-17 schema ceiling). `request_escalation` NEVER mutates
  Board (it records a display-only escalation intent). Documented deviation: hand-rolled
  `GET /mcp/tools` + `POST /mcp/tools/{name}` registry (matches the built `chat`/`drive` house
  pattern), not the streamable-HTTP SDK.
- **Stores** (`db.py`) — two honesty classes:
  - *disposable projections* (`agent_view`, `fleet_view`) — rebuilt from the live runtime stream;
    `drop_projections()` blows them away.
  - *CANONICAL append-only* (`audit_anchor` UNIQUE(chain_id,seq_num), `mc_audit`) + *durable*
    (`resolve_log`, `guardrail_params`, `operator_state`) — disk-backed on `mc_data`.

**Frontend cockpit (`frontend/`)** — Vite/React SPA, the suite **single-global-React Helm
vendoring** pattern (one `window.React`; app JSX compiled classic-runtime; Helm bundle consumed as
`window.HelmDesignSystem_f4cb26`). 10 screens: Overview, Live Agent View, Agent drill-in, Review +
Approval queue, Review item, Halt control, WIP+Budget, Edge & observability, Audit-anchor
continuity, Guardrail settings. Path-routed so the FROZEN deep-links resolve directly.

**Container + sidecars**: 3-stage `Dockerfile` (non-root UID 10001, read-only rootfs). `docker-compose.yml`
brings up `mc` + the 4 owned sidecars (`mc_prometheus`, `mc_blackbox`, `mc_logstore`, `mc_logship`)
+ the dedicated `mc_redis` budget store.

---

## 2 · FROZEN-contract conformance (proven by construction)

### 2.1 Review-queue producer — `mc-chat-review-resolve.md` (mc is the PRODUCER; Chat consumes)
- Review-item id **IS** the Board `ticket_id` — no new id minted. `queue.py`, `repo.py`.
- URL scheme: `/review`, `/review/<ticket_id>`, `/agents/<sub>`; `/ticket/<id>` **302→** `/review/<id>`
  (`main.py`). Frontend path-router resolves all of these to the SPA (`app.jsx`).
- Resolve-event feed: `record_resolution()` → monotone `resolve_seq` (rowid); SSE `/api/events`
  emits the **exact** frozen event shape; cursor replay via `resolve_replay_after`; `event: reset`
  recovery when the cursor is behind the retained floor. Outcome enum
  `{approved,rejected,review_cleared,reworked}`; actor_kind `{operator,cmdb_tier_policy}`.
- **Test:** `test_review_contract.py` asserts URL scheme, 302 alias, projection provenance,
  never-bare-404, exact resolve event shape, and outcome mapping.

### 2.2 Kill-switch — `killswitch-chain.md` (auth is the SINGLE enforcer)
- mc mints **no** epoch and stores **no** authoritative "halted" boolean. `/api/killswitch/raise`
  is a level-addressed **relay** that forwards the operator's own credentials
  (`authorization`, `dpop`, `x-auth-identity`) to auth's `/admin/killswitch`.
- On any non-2xx / timeout → **502 fail-loud** (`halt_not_confirmed`), and the UI throws the
  full-viewport **HALT NOT CONFIRMED** takeover pointing at auth's outage-surviving console
  (`parts.jsx` `HaltNotConfirmed`, `app.jsx` `engage`).
- L2 (gateway physical) status is capped to **STALE-UNKNOWN** on any mc-relayed read — never
  `CONFIRMED` (only auth's direct gateway read may be CONFIRMED). `posture.py`, `upstream.py`.
- **Test:** `test_killswitch.py` (relay-not-enforcer, forwards-proof, fail-loud 502, no local
  epoch), `test_posture_mirror.py` (L2 auth-direct-only, honest degrade).

### 2.3 Budget-Redis separate from auth's
- Dedicated **mc-owned** store; default `redis://mc_redis:6379/0`. `BudgetStore._assert_not_auth_redis`
  **raises `AuthRedisRefused`** on any URL hinting at auth's private store (`auth_redis`, `data_auth`,
  `authredis`). Per-principal budget *policy* still comes from auth's budget-check API (S5 Option B);
  the dedicated Redis holds only the global-WIP counters mc owns.
- Compose places `mc_redis` on `data_mc` **only** (not `edge`, not `data_auth`).
- **Test:** `test_budget_redis.py` (AuthRedisRefused, `source:auth` vs `source:redis`, mc-owned default).

### 2.4 Heartbeat consumption + liveness (mc CONSUMES, never a second source of truth)
- `HeartbeatIngest` is an SSE **consumer** of the runtime producer (passive/honest-empty when no
  URL). Liveness is **derived**: phi-accrual, `drained` (reported), `zombie` (fencing-gen < Board
  current gen), `wedged` DARK until a per-role progress budget is set. `pollers.py`, `engine.py`,
  `fleet.py`.
- **Test:** `test_liveness.py` (phi/drained/zombie/wedged-dark/population-suppression).

### 2.5 D-12 parameterized, not hardcoded
- Suppression thresholds and per-role progress budgets live in `guardrail_params` (operator-set),
  seeded **PRE-SIZING** and flagged as such; `params_presizing=True`. No component enforces on a
  PRE-SIZING value; an UNSET progress budget ⇒ agent classified **wedged DARK**, never silently
  healthy. `config.py`, `repo.py`, `engine.py`, Settings screen.

### 2.6 Full ticket-state superset
- `queue.py` renders all 11 `TICKET_STATE_MACHINE.md` states
  (todo, in_progress, awaiting_approval, approved, executing, verifying, needs_review, blocked,
  done, failed, cancelled). Host-originated content ⇒ `provenance: untrusted`,
  `auto_lane_eligible:false` (UI renders the fact; the lane is server-enforced).

### 2.7 Audit-anchor receive (seam #25)
- `retain_head()` idempotent by `(chain_id, seq)`; gap ⇒ `RESYNC-PENDING` (benign backfill);
  hash-conflict on an existing seq ⇒ fork/regression alarm. mc anchors the HEAD **hash**, never the
  contents, and never reads this copy back into a decision. **Test:** `test_anchors.py`.

---

## 3 · CANNOT-VERIFY in isolation (deferred to whole-suite / Stage 7)

| Item | Why it can't run here | Command / evidence to verify once suite is up |
|---|---|---|
| Live review round-trip with Chat | Board + Chat not in this worktree | bring up board+chat+mc; approve a ticket; confirm Chat's doorbell clears via `/api/events` resolve feed |
| End-to-end kill-switch **bite** | needs auth + gateway | throw G1 in the Halt screen; confirm auth raises the epoch and the gateway chokepoint physically halts (Stage-7 demo, coordinate with Gateway) |
| L2 CONFIRMED posture | needs auth's direct gateway read | verify `/api/posture` shows `l2: CONFIRMED` only when auth (not mc) reports it |
| Real JWKS (EdDSA/ES256) validation | isolated build uses HS256 test-signer | point `MC_AUTH_JWKS_URL` at the live auth; confirm `aud==mc`, EdDSA tokens validate, HS256 rejected |
| Budget policy reads | needs auth budget-check API | confirm `/api/budgets` per-principal dims populate from auth, STALE-UNKNOWN when auth down |
| Heartbeat ingest | needs agent-runtime SSE producer | set `MC_RUNTIME_SSE_URL`; confirm fleet populates + phi-accrual classification |
| Sidecar scrape/probe | needs proxy `:9100` + real targets | `docker compose up`; confirm `/api/edge` tiles populate from `mc_prometheus`/`mc_blackbox` |
| Backup **restore drill** (canonical `mc_data`) | Stage-7 exit criterion | drill: back up `audit_anchor`+`mc_audit`+`resolve_log`, restore, confirm continuity + restore-consistency rule |

---

## 4 · Deliberate deviations (accepted, with reason)

1. **MCP transport** — hand-rolled `GET /mcp/tools` + `POST /mcp/tools/{name}` registry instead of
   the streamable-HTTP MCP SDK. Reason: matches the already-built `chat`/`drive` house pattern and
   the D-17 flat/low-arity schema ceiling; a single documented deviation across the suite.
2. **Budget store** — the task specified a dedicated budget-Redis; ratified S5 is "Option B"
   (auth budget-check API, no dedicated Redis). Reconciled: mc uses a dedicated Redis **only** for
   the global-WIP counters it owns (UI §3.7), and reads per-principal budget *policy* from auth's
   API. The hard `AuthRedisRefused` guard guarantees mc never touches auth's private Redis either
   way. This honors the SoD intent of both.
3. **Webfonts** — the vendored Helm `fonts.css` keeps the real Google Fonts `@import` (matches the
   built `notes` sibling); CSP is relaxed for exactly `fonts.googleapis.com`/`fonts.gstatic.com`.
   No other external origin is permitted.

---

## 5 · Independent verification pass

A separate, adversarial verifier read the code + the four frozen specs and **CONFIRMED all six**
must-hold claims (review-producer conformance, kill-switch relay-not-enforcer, budget-Redis
separation, heartbeat consumption, D-12 parameterization, Helm/no-false-green) with file:line
evidence. It found **no build-failing defects**. Two cosmetic notes were **folded**:
- clamped the resolve-event `actor_kind` to the closed contract enum `{operator,cmdb_tier_policy}`
  so a malformed upstream Board value can never propagate (`pollers.py` `_actor_kind`; regression
  test `test_actor_kind_clamped_to_closed_enum`);
- corrected an inaccurate seed-state comment in `repo.py` `_seed_params`.

## 6 · Test result

`python -m pytest` → **46 passed**. Frontend `npm run build` → **built** (10 modules; dist incl.
the vendored Helm bundle). End-to-end serve smoke: backend serves `/`, `/helm/_ds_bundle.js`,
`/assets/*`, and SPA-falls-back `/review/<id>` → 200.
