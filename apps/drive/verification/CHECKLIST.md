# Drive — Stage-4 Build Verification Checklist

**Status:** Build complete on branch `stage4/drive-build`. Risk class: **Standard**.
**Method:** proven by construction + an automated test suite (25 tests, all green) + an independent
adversarial verification pass. This is the *Stage-4* exit evidence (both surfaces over one state);
the Stage-7 obligations (external verification, restore drill) are listed at the end as deferred.

Ratified build inputs honored: **D-14** (filesystem CAS by SHA-256 + SQLite metadata/version chain;
no object store), **D-17** (MCP schema-complexity ceiling — flat, low-arity, ≤6 args), the frozen
**board-agents-claim.md §3** fencing rule, the **auth §1/§3/§8** RS baseline, **IDENTIFIERS.md**
(artifact_id = Drive UUIDv7; version_id = Drive opaque; `release_id` is *Vault's*, never minted here),
and **DEPLOYMENT §2/§5** (service `drive`, port 8080, `edge`, `/data`, `DRIVE_` env, auth `:8089`).

---

## 0. Fresh-clone commands (reproduce every green here)

```bash
# from repo root
cd apps/drive
npm install                 # installs better-sqlite3 (native), fastify, jose, tsx, typescript
npx tsc -p tsconfig.json --noEmit          # typecheck — expect: clean (exit 0)
node --import tsx --test test/*.test.ts     # test suite — expect: tests 28 / pass 28 / fail 0

# maintenance CLI (canonical-store operations)
node --import tsx src/cli.ts verify --full  # row<->blob reconciliation both ways + hash spot-checks
node --import tsx src/cli.ts rebuild-index  # rebuild the SQLite index from the canonical journals
node --import tsx src/cli.ts backup         # journal-first VACUUM INTO snapshot (+ restic if repo set)

# run the service (serves API + MCP + Helm UI on one port)
DRIVE_DATA_DIR=./.localdata DRIVE_DB_PATH=./.localdata/db/drive.sqlite3 \
DRIVE_AUTH_ISSUER=https://auth.example.test DRIVE_DEV_HS256_SECRET=dev \
node --import tsx src/index.ts              # listens on :8080 (board check: degraded by default)

# container
docker build -t helm-drive .               # node:22 + native build; CMD runs via tsx
```

Node ≥ 22.5 required. The suite runs on Windows and Linux (native `better-sqlite3` prebuild/compile).

---

## 1. Spec conformance (PLAN §3–§10)

| # | Requirement (source) | Where built | Evidence |
|---|---|---|---|
| 1.1 | **Content-addressed store**: SHA-256 blobs, 2-level fanout, write-once, fsync, chmod-ro | `src/storage/cas.ts` (`blobPath`, `materialize`) | test `storage.test.ts` dedup → 1 blob, refcount 2 |
| 1.2 | **SQLite metadata/version chain** per §3.2 DDL (append-only versions, blobs, uploads, journals, audit) | `src/db/schema.ts` | typecheck + all tests write/read the schema |
| 1.3 | **Blobs CANONICAL, SQLite rebuildable** | `src/storage/maintenance.ts` (`rebuildIndex`, `verify`) | test `rebuild.test.ts`: drop all index rows → replay journals → rows + fencing high-water restored, `verify()` ok |
| 1.4 | **Crash-safe write path** lock→compute→fencing→journal-fsync→rename→commit (§3.3) | `src/storage/store.ts` `commit()` | ordering asserted by code; dedup-hit re-verify guards the GC race (`commit` step h) |
| 1.5 | **Dedup/refcount + two-phase GC**; phase-2 row-delete-in-txn→quarantine (§3.5) | `src/storage/gc.ts` | `gcPhase2` deletes blob row first, journals `gc_purge`, then quarantines |
| 1.6 | **Dual append-only journals + watermark** (§3.4) | `src/storage/journal.ts` | version + audit journals fsync'd inside the commit lock |
| 1.7 | **artifact_id = UUIDv7, version_id = opaque; no foreign ids minted** | `src/lib/ids.ts` | test `contract.test.ts` UUIDv7 shape; no `release_id`/`rel-` minting |
| 1.8 | **Limits/quota/watermark/type policy** (§10): 5 GiB cap, staged-bytes daily quota, continuous watermark, pending-cap, executable reject | `src/storage/store.ts` (charge/watermark/type), `src/http/server.ts` (stream loop) | test `contract.test.ts` executable → 415 |

## 2. The two surfaces over one shared state (Stage-4 core)

| # | Requirement | Where | Evidence |
|---|---|---|---|
| 2.1 | **HTTP API** = the one shared state (§4): register/upload/list/get/content/delete-marker/restore/gc/healthz/tickets/audit | `src/http/server.ts` | all tests drive this API |
| 2.2 | **MCP surface** = sibling over the SAME Store, three flat tools, no bytes cross MCP, typed structured errors (§5, D-17) | `src/mcp/server.ts` | test `contract.test.ts`: tools/list = 3, arity ≤6, put returns `instructions` + upload_url, stale fence = STALE_FENCING at commit |
| 2.3 | **Helm UI** (§6 / UI_SPEC): 4 screens on the SAME API, shared components + 3 app-specific parts, R/D split, GC full-friction DangerAction | `src/ui/public/*` | loads `HelmDesignSystem_f4cb26` + `styles.css` + tokens (copied under `ui-assets`); consumes only `/api/*` |
| 2.4 | **Distinct-ticket index** (UI_SPEC §7 delta) added to the API | `GET /api/tickets` in `server.ts`, `Store.listTickets` | test `storage.test.ts` pagination/index |

## 3. FENCING — ENFORCED, not just recorded (the adversarial-review #1 finding)

> `board-agents-claim.md §3`: *"every side-effecting call echoes it and the receiving server rejects
> stale tokens. A token generated but never checked provides no safety."* IDENTIFIERS: *"Drive: local
> high-water-mark staleness check."*

| # | Claim | Where | Test |
|---|---|---|---|
| 3.1 | Agent-kind put with a **stale** token → **rejected `STALE_FENCING`**, NO version row, high-water unchanged, `stale_fence_rejected` audited | `store.ts` `enforceFencingInTxn` (inside `commit()` IMMEDIATE txn, before the version insert / pointer move) | `fencing.test.ts` "STALE fencing token is REJECTED" |
| 3.2 | Agent put **without** a token → rejected `FENCING_REQUIRED` (required echo) | `store.ts` `normalizeFencingToken` | `fencing.test.ts` "…WITHOUT a fencing token is rejected" |
| 3.3 | Equal-generation echo accepted; fresh token **raises** the high-water | `store.ts` `enforceFencingInTxn` | `fencing.test.ts` "fresh…raises the high-water", "equal-generation…accepted" |
| 3.4 | Human/service principals **exempt** (hold no Board lease); version records `fencing_token = NULL` | `store.ts` `normalizeFencingToken` (null for non-agent) | `fencing.test.ts` "human/operator…EXEMPT" |
| 3.5 | Enforcement runs **inside the commit transaction** (the actual side-effect boundary), and on replay the high-water is restored | `commit()` txn + `maintenance.ts` `applyVersionEvent` | `rebuild.test.ts` restores `max_fence` |

## 4. Byte-handoff is auth-covered — NO signed URLs (PLAN §2.2)

| # | Claim | Where | Test |
|---|---|---|---|
| 4.1 | Unauthenticated byte access → **401** + `WWW-Authenticate: Bearer resource_metadata=…` | `server.ts` `authenticate` + error handler | `auth.test.ts` "UNAUTHENTICATED blob access is denied" |
| 4.2 | A specific **version** content URL is also auth-gated (no capability-URL bypass) | `contentHandler(true)` requires `drive:read` | `auth.test.ts` "specific version content URL is also auth-gated" |
| 4.3 | Blobs never addressable by hash from outside — only via Drive-minted `artifact_id`/`version_id` | no by-hash route exists in `server.ts` | (absence-of-route) |
| 4.4 | `upload_url`/`download_url` are plain URLs, powerless without the caller's own token; agent refs on the in-cluster origin | `server.ts` register (origin split), `mcp/server.ts` put_artifact | `contract.test.ts` MCP put `upload_url` |
| 4.5 | Principal derived ONLY from validated token / verified `X-Auth-Identity` — never an advisory header | `auth/rs.ts` (`verifyBearer`, `verifyHumanIdentity`), `server.ts` `authenticate` | `auth.test.ts` wrong-aud rejected |

## 5. Fail-closed integrity (nothing stubbed)

| # | Claim | Where | Test |
|---|---|---|---|
| 5.1 | GC purge is the **one destructive route**; fails **closed** when budget/step-up authority is unreachable | `auth/budget.ts` `requireStepUp` + `check('destructive')`; `server.ts` `POST /api/admin/gc` | `contract.test.ts` "GC purge fails CLOSED…" → 403 |
| 5.2 | GC is **human-only** + typed-intent `PURGE` + Tier-2 live step-up (never the forwarded header) | `server.ts` `requireHuman` + `confirm==='PURGE'` + `budget.requireStepUp` | `auth.test.ts` agent → 403 |
| 5.3 | Agents cannot reach delete-marker / restore / GC | `server.ts` `requireHuman` on those routes | `auth.test.ts` "agent cannot reach operator-only routes" |
| 5.4 | Reads / write-benign stay allow-but-locally-bounded; in-process concurrency ceiling always available | `auth/budget.ts` `ConcurrencyCeiling`, `check` fail-open for benign | code + `server.ts` PUT acquires/releases the ceiling |

## 6. Standard-rigor invariants (root CLAUDE.md / PROCESS Stage-5 preview)

- **MCP authz** — every tool + route enforces `drive:read`/`drive:write`; operator routes human-kind-gated. ✔ (`auth.test.ts`)
- **Audit logging of state changes** — DB `audit_log` + append-only audit journal on mutations AND denials (`put_registered`, `version_committed`, `stale_fence_rejected`, `type_rejected`, `quota_refused`, `gc_purge`, `read`, …). ✔
- **No markdown canonicalized here** — Drive stores non-markdown blobs only; no editor/renderer. ✔
- **Two views, one state** — MCP + UI both sit on the `Store` service layer; neither downstream. ✔
- **Backup hook for CANONICAL blobs** — `src/backup/backup.ts` journal-first ordering + GC-suspend; `runBackup` records `last_backup_at` surfaced in `/api/healthz`. ✔ (mechanism built; off-box restic activates when `DRIVE_BACKUP_REPO` is set — operator input, PLAN §15.4)

## 7. Deployment conformance (DEPLOYMENT §2/§5/§6)

- Service/DNS name `drive`, internal port **8080**, joins `edge` only, **no host ports**, volume `drive_data` at `/data`, env prefix `DRIVE_`, auth at `auth:8089`. ✔ `Dockerfile`, `.env.example`, `config.ts`.
- `/.well-known/oauth-protected-resource` (RFC 9728) published; 401 bootstrap header emitted. ✔

---

## 8. Deferred to later stages (honestly flagged — NOT claimed done here)

- **Stage-5 (security hardening):** claim-holdership-per-put (PLAN §15.2, accepted v1 residual — fencing staleness IS enforced, holdership is not); dedup timing side-channel note (§12.8); full prompt-injection threat-model write-up.
- **Stage-7 (verification):** external-verification evidence and the **canonical-store restore drill** (restore into a fresh volume via the primary path, `drive verify`, list/download through both surfaces, demonstrate the fallback rebuild) — the machinery exists (`backup`, `rebuild-index`, `verify`, `rebuild.test.ts`) but the drill itself is a Stage-7 exit criterion.
- **Dependency activations:** `svc:drive`→`board:read` grant + the Board ticket-exists endpoint (PLAN §2.1/§15.5) — until both land, ticket verification stays the degraded `unverified_pending`-always default (built and wired behind `DRIVE_BOARD_API_URL`). The `drive ↔ agent-runtime` deterministic upload-step seam (PLAN §15.6). The `drive-pdf` preview contract (PLAN §8, PENDING until pdf Stage-1).
- **Budget API:** binds to auth's budget-check API (DEPLOYMENT §3 S5 resolution) via `DRIVE_BUDGET_API_URL`; the in-process concurrency ceiling is the always-available local bound.

## 9. Independent verification pass — findings & dispositions

An independent sub-agent re-read the code against the frozen specs and **CONFIRMED items 1–5**
(fencing enforced-not-recorded; byte-handoff auth-covered; no fail-closed path stubbed; contracts
match; UI matches Helm) and re-ran the suite itself. It raised the following; each is folded or
accepted:

| Sev | Finding | Disposition |
|---|---|---|
| **HIGH** | Production human-UI auth path unwired: `DRIVE_IDENTITY_HEADER_JWKS_URL` parsed but never consumed → every browser request 401s (fails closed, but breaks "both surfaces over one state") | **FOLDED.** New `src/auth/identity.ts` `makeIdentityVerifier(config)` (JWKS in prod / HS256 dev); `context.ts` wires it into `Rs` at boot unless a test injects one. Regression test `ui_wiring.test.ts` boots via the config-wired path and asserts a browser `X-Auth-Identity` request reaches `/api/tickets` (200), a forged header is 401, and the Helm assets serve. |
| LOW | Idempotency TOCTOU: concurrent same-`(sub, op_id)` register could 500 on the UNIQUE race instead of collapsing | **FOLDED.** `store.ts register()` catches the `SQLITE_CONSTRAINT_UNIQUE` and re-selects the winner's session (idempotent replay). |
| LOW | Concurrency-ceiling `acquire()` sat before the `try/finally` (theoretical leak window) | **FOLDED.** `acquire()` is now immediately before the try with no throwing statement between; `createWriteStream` moved inside the try; catch uses `out?.destroy()`. |
| LOW | Audit-journal append inside the commit txn isn't SQLite-transactional (a COMMIT failure could orphan an audit line) | **ACCEPTED.** Harmless — the *version* journal is canonical and the reconciler is idempotent on `version_id`; the audit journal is a mirror. Read/list rows are DB-only by design (§9.1). |
| INFO | UI loads React/Babel from `unpkg.com` at runtime (design-system bundle + styles are vendored locally) | **ACCEPTED for Stage-4** (matches the Helm kit's own wiring; Helm also CDN-loads fonts). Flagged to vendor React/Babel locally before production / air-gapped deploy — Stage-6/deploy hardening. |
| INFO | No in-browser UI test coverage (jsx verified by reading) | **PARTIALLY FOLDED.** `ui_wiring.test.ts` now covers the UI's server-side wiring (auth path + static asset serving + traversal guard). Full DOM/render testing remains out of scope for Stage-4. |
