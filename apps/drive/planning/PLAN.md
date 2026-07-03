# Stage 2 Planning — Drive (`drive`)

**Status:** ACCEPTED at Stage-2 exit (adversarial review run 2026-07-02; findings folded in §14, residuals §15).
**Risk class:** Standard.
**Inherited ruling (D-14, ratified 2026-07-02):** plain **filesystem CAS (SHA-256 blobs) + SQLite metadata/version chain**. No object store. Versity Gateway is the designated zero-migration S3 swap-path if an external S3 consumer ever materializes. This plan builds against that ruling; nothing here re-litigates it.

---

## 1. Identity and inherited constraints

Drive is the artifact store for everything that isn't markdown — binary/non-note outputs of agent work, keyed by the ticket that produced them. Notes holds the thinking; Drive holds the deliverables. Two sibling surfaces (MCP + UI) over one HTTP API over one shared state.

Constraints this plan inherits verbatim (sources authoritative; this table is a reading aid, not a restatement):

| Constraint | Source |
|---|---|
| Filesystem CAS + SQLite; Versity = swap-path | `apps/drive/CLAUDE.md` SETTLED #1 (D-14) |
| `artifact_id` = Drive-minted UUIDv7, opaque to consumers; `version_id` = Drive-minted opaque PK; `upload_ref`/`download_ref` deliberately NOT registered (ephemeral) | `context/specs/IDENTIFIERS.md` |
| `ticket_id` = Board-minted `T-` + zero-padded integer; posture "Validated — may check existence via Board API; must never fabricate" | `context/specs/IDENTIFIERS.md` |
| `note_id` = Notes-minted, opaque | `context/specs/IDENTIFIERS.md` |
| `op_id` = caller-minted idempotency key on every mutating MCP tool, unified with auth's per-sub `budget:idem:{sub}:{key}` namespace | `context/specs/IDENTIFIERS.md` (MERGE-RESEARCH-1 row) |
| Fencing token: Board-minted monotonic per-resource counter; "every side-effecting call echoes it and the receiving server rejects stale tokens" | `context/CONTRACTS/board-agents-claim.md` §3 |
| RS baseline: local JWKS validation, `aud == drive`, DPoP/`cnf` where bound, RFC 9728 metadata, error semantics verbatim, budget middleware, revocation subscription | `context/CONTRACTS/auth-apps-tokens-scopes.md` §1–2 |
| Scope slice offered: `drive:read` / `drive:write` (+ delete scope only if a delete tool is exposed) — countersigned in §5.3 below | `context/CONTRACTS/auth-apps-tokens-scopes.md` §3 |
| Service `drive`, port **8080**, `edge` network, no host ports, auth at `auth:8089`, volume `drive_data`, env prefix `DRIVE_` | `context/specs/DEPLOYMENT.md` §1–2, §5 |
| Drive blobs are **CANONICAL** — a stated backup mechanism + cadence is non-optional; restore drilled at Stage-7 | `ARCHITECTURE.md` §10 |
| MCP pinned **2025-11-25**, Streamable HTTP; tool schemas stay within the gap-1.3 spike's complexity ceiling (flat, low-arity, enum-biased) | RATIFICATIONS D-14/D-17 |
| Bytes never traverse MCP (metadata + reference only) | Drive RESEARCH §5 |
| No markdown canonicalized here; preview rendering belongs to `pdf` | `apps/drive/CLAUDE.md` |

Stage-2 obligations from MERGE_REVIEW_1 §6 (the Drive register): ticket_id existence-validation posture (§2.1), byte-handoff mechanism (§2.2), backup cadence for canonical blobs (§2.3 + §9), pdf contract when pdf researches (§8). All resolved or explicitly parked below.

---

## 2. The §6 register — resolved

### 2.1 `ticket_id` validation posture: **format-validate always; existence-validate against Board with a three-state verification flag**

- **Format check (hard, always):** `^T-\d{6,}$` on every put/list. Malformed → 400, typed error. This is free and catches misfiled IDs mechanically (IDENTIFIERS.md prefix-typing rationale).
- **Existence check (Board API, cached):** on the first `put_artifact` for a ticket, Drive checks existence via the Board's read API (dependency recorded below). Result cached with short TTL (default 5 min; `DRIVE_TICKET_CHECK_TTL`). A definitive "no such ticket" answer at put time → 422 `TICKET_NOT_FOUND`; the agent escalates rather than fabricates (IDENTIFIERS posture: "must never fabricate").
- **Verification state is three-valued** (`artifacts.ticket_state`):
  - `verified` — Board confirmed the ticket exists.
  - `unverified_pending` — Board was unreachable at put time; the write is accepted and flagged; a background reconciliation sweep re-checks on a bounded backoff schedule (default: 5 min, 30 min, 2 h, then every 24 h; `DRIVE_TICKET_RECHECK_SCHEDULE`). This mirrors the suite's fail-loud-open-but-flagged pattern (`cmdb-library-hostfacts.md` §2): Drive stores *outputs of work in flight* — hard-failing puts during a Board outage would make agents lose completed work or spin, violating escalation-not-spin.
  - `verified_absent` — the sweep later got a definitive "no such ticket" from the Board. **Terminal disposition, not silent rot:** Drive auto-appends a delete-marker to the artifact, writes an audit + journal record, and raises an operator escalation (admin-UI queue now; Chat notification when Chat exists). The artifact stays recoverable (append-only history) but stops polluting listings.
- **Recorded cross-app dependency (two halves — neither is assumed, per the seam rule):** (1) the **Board** exposes a ticket-exists read (Board Stage-2 register input — same class as the PIP facts endpoint it already owes auth); (2) **auth** registers a `svc:drive` service principal able to mint Board-audience tokens carrying `board:read` (raised as a line on Drive's countersign row, §5.3). **Until BOTH exist, the degraded default is:** format-check + `unverified_pending`-always, with the sweep activating once the dependency lands. Both recorded in §15.5.
- **Rejected alternative — fully opaque:** rejected because Drive is the provenance record for deliverables; accepting arbitrary strings as ticket keys lets a confused/steered agent orphan artifacts undetectably. IDENTIFIERS.md already assigns `ticket_id` the *Validated* posture; Drive exercises it.
- **`note_id`** is stored opaquely, never validated (its IDENTIFIERS posture is Opaque).

### 2.2 Byte-handoff mechanism: **authenticated direct endpoints on Drive's own API — no signed URLs in v1**

**Decision:** the `upload_ref` / `download_ref` returned by MCP tools are plain HTTPS/HTTP URLs on Drive's API. The byte request itself is authenticated by the caller's own credential, exactly like any other Drive API call:

- **Agents** present their auth-minted Bearer token (aud=`drive`, `drive:read`/`drive:write`, DPoP-bound where auth binds it). Drive validates locally per the RS baseline. The 2-minute agent-token TTL is a non-issue: validation happens at request start; an in-flight stream continues; a retry re-mints (the standard 401 → re-mint → retry loop). **Agent-facing refs are minted against the in-cluster origin** (`http://drive:8080/api/...`, `DRIVE_INTERNAL_ORIGIN`) — the agent-runtime joins `edge`, so this reaches Drive directly, Drive still does full RS token validation itself, and no dependency on the proxy's forward-auth handling of machine traffic is taken for byte transfers. Human-facing refs use the subdomain origin. The refs are contractually opaque and unregistered, so the split costs nothing.
- **Humans (UI, pdf.js viewer)** ride the browser session: the proxy's forward-auth subrequest to `auth:8089` covers every `drive.<SUITE_DOMAIN>` route per DEPLOYMENT §1; Drive additionally derives the principal from the verified `X-Auth-Identity` signature (never the advisory header).
- **The `pdf` app** (when built) fetches with its own service token carrying `drive:read` — same path, no special channel.

**How it sits behind the edge (DEPLOYMENT §1):** one subdomain `drive.<SUITE_DOMAIN>` → Caddy forward-auth → `drive:8080`. Byte routes are ordinary routes; Caddy must pass `Range`/`If-Range` untouched and set `request_body max_size` on the upload routes (§10). Only the proxy publishes host ports.

**Why not signed URLs:** every byte consumer in the suite is visible to auth (agents, operator browser, pdf service) — the sole condition under which Drive RESEARCH §1's correction says HMAC-signed URLs become *necessary* does not exist. Skipping them removes: a signing key to manage/rotate, expiry clock-skew bugs, and a bearer-capability URL class that leaks via logs/tickets/notes (the same hygiene argument as `vault-gateway-redemption.md` §1's data-hygiene rule — a signed URL in a ticket would be a redeemable credential in agent-readable state; a plain URL is powerless without the caller's token). It also keeps auth the single enforcement point (killswitch-chain §1): a revoked/epoch-bumped principal loses byte access instantly, whereas signed URLs would survive revocation until expiry.
**Named escape hatch:** if a byte consumer outside auth's view ever materializes, mint short-TTL HMAC references then (same trigger discipline as the Versity swap-path).
**Recorded dependency (from adversarial review):** the assumption that a local-model workforce agent can execute a raw authenticated HTTP PUT outside the MCP loop is a **runtime capability no contract yet states**. Raised as a `drive ↔ agent-runtime` seam for the CONTRACTS "still to write" list: the runtime provides a deterministic upload step (workspace file path + `upload_ref` + the agent's token → HTTP PUT), so the *model* never has to hand-roll HTTP. Recorded in §15.6; the gap-1.3 spike does not validate this and does not need to (deterministic plumbing, not model competence — same split the spike itself uses).

### 2.3 Backup cadence for the CANONICAL blobs — **nightly incremental, off-box, journal-first ordering, restore drilled**

Resolved here; full mechanism in §9. Summary: nightly `restic` snapshot of the canonical set (`journal/` closed files first, then the DB snapshot, then `blobs/`) to an off-suite-host repository, GC suspended during the window — retention 7 daily / 4 weekly / 6 monthly, plus a weekly integrity scrub (`drive verify`). Restore-consistency rule stated in §9.3 and drilled as the Stage-7 exit criterion.

### 2.4 pdf contract — **parked as PENDING with Drive's offered half specified (§8)**

Seams #21/#22 stay PENDING until pdf's Stage-1 (CONTRACTS/README rule: no producer research, nothing binds). Drive's plan does not assume any pdf behavior; it *offers* its half so pdf's session can freeze the contract against it.

---

## 3. Data model and storage design

### 3.1 On-disk layout (volume `drive_data`, single mount)

```
/data
  blobs/sha256/<aa>/<bb>/<full-64-hex>       # CAS: immutable, write-once, fsync'd
  staging/<upload_id>.part                    # in-flight uploads (sweepable, activity-tracked)
  quarantine/<sha256>                         # GC phase-2 holding area (second grace window)
  journal/<yyyy>/versions-<yyyymmdd>.ndjson   # append-only version/pointer journal (§3.4)
  journal/<yyyy>/audit-<yyyymmdd>.ndjson      # append-only state-change audit journal (§3.4)
  db/drive.sqlite3 (+ -wal, -shm)             # the index
  db/backup/drive-snapshot.sqlite3            # VACUUM INTO target, rotated by backup job
```

- `<aa>/<bb>` = first two/next two hex chars (2-level fanout, 65k dirs max, fine for homelab scale).
- Blobs are stored once per SHA-256 (whole-object dedup, refcounted in SQLite). Chmod read-only after commit.
- **What is canonical:** `blobs/` + both journals. The version journal carries every committed version/pointer event; the audit journal carries every **state-change** audit event (who did what, incl. denials). Together they make SQLite rebuildable (`drive rebuild-index` replays journals + walks the blob tree). Read/list access-log rows are the one class that lives only in the DB — their loss window is bounded by the nightly DB snapshot and declared honestly in §9.1/§9.3. `staging/` and `quarantine/` are disposable.

### 3.2 SQLite schema (WAL mode, single-writer commit lock, `busy_timeout` set)

```sql
CREATE TABLE blobs (
  sha256        TEXT PRIMARY KEY,          -- 64 lowercase hex
  size_bytes    INTEGER NOT NULL,
  refcount      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL              -- ISO-8601 UTC
);

CREATE TABLE artifacts (                    -- one logical, ticket-keyed artifact
  artifact_id        TEXT PRIMARY KEY,      -- UUIDv7, Drive-minted (IDENTIFIERS.md)
  ticket_id          TEXT NOT NULL,         -- verbatim T-… (format-checked)
  logical_name       TEXT NOT NULL,         -- filename-as-identity within the ticket
  current_version_id TEXT,                  -- mutable "latest" pointer (NULL = delete-marked)
  ticket_state       TEXT NOT NULL DEFAULT 'unverified_pending'
                     CHECK (ticket_state IN ('verified','unverified_pending','verified_absent')),
  created_by         TEXT NOT NULL,         -- auth sub, opaque
  created_at         TEXT NOT NULL,
  UNIQUE (ticket_id, logical_name)
);

CREATE TABLE artifact_versions (            -- APPEND-ONLY: never UPDATE/DELETE
  version_id       TEXT PRIMARY KEY,        -- UUIDv7, Drive-minted, opaque outward
  artifact_id      TEXT NOT NULL REFERENCES artifacts,
  seq              INTEGER NOT NULL,        -- 1..n within artifact
  sha256           TEXT REFERENCES blobs,   -- NULL iff is_delete_marker
  ticket_id        TEXT NOT NULL,           -- denormalized: versions can span tickets
  note_id          TEXT,                    -- opaque, optional
  created_by       TEXT NOT NULL,           -- auth sub
  fencing_token    TEXT,                    -- echoed by agent-kind principals; enforced §3.6
  op_id            TEXT NOT NULL,           -- caller idempotency key
  mime_sniffed     TEXT NOT NULL,           -- canonical, server-derived (§10.2)
  mime_client_hint TEXT,                    -- untrusted, display only
  size_bytes       INTEGER,
  original_name    TEXT NOT NULL,           -- as uploaded; metadata only, never a path
  is_delete_marker INTEGER NOT NULL DEFAULT 0,
  derived_from_version_id TEXT,             -- set on derived previews (§8); Drive-internal writer only
  created_at       TEXT NOT NULL,
  UNIQUE (artifact_id, seq),
  UNIQUE (created_by, op_id)                -- idempotency is PER-PRINCIPAL (auth {sub}:{key} shape)
);
CREATE INDEX iv_ticket   ON artifact_versions (ticket_id, created_at DESC);
CREATE INDEX ia_ticket   ON artifacts (ticket_id);

CREATE TABLE ticket_fences (                -- Drive-local fencing staleness state (§3.6)
  ticket_id  TEXT PRIMARY KEY,
  max_fence  INTEGER NOT NULL,              -- highest Board-minted generation seen
  updated_at TEXT NOT NULL
);

CREATE TABLE uploads (                      -- staging state machine (§4.2)
  upload_id     TEXT PRIMARY KEY,           -- UUIDv7; ephemeral, never registered
  state         TEXT NOT NULL CHECK (state IN ('pending','committed','aborted','expired')),
  created_by    TEXT NOT NULL,              -- same-principal enforced on EVERY session op
  op_id         TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,           -- inactivity-based expiry (§4.2)
  bytes_staged  INTEGER NOT NULL DEFAULT 0, -- counted against quota/watermark (§10.3)
  -- registered intent: ticket_id, logical_name, note_id, fencing_token,
  -- mime_client_hint, expected_sha256 (optional), expires basis
  UNIQUE (created_by, op_id)
);

CREATE TABLE journal_watermark (            -- replay resume position (§3.4)
  id INTEGER PRIMARY KEY CHECK (id = 1),
  journal_file TEXT NOT NULL,
  byte_offset  INTEGER NOT NULL
);

CREATE TABLE audit_log (                    -- append-only; state changes ALSO journaled (§3.4)
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,
  principal  TEXT NOT NULL,                 -- auth sub; never token material
  action     TEXT NOT NULL,                 -- put_registered|version_committed|read|list|
                                            -- delete_marker|restore|gc_purge|ref_denied|
                                            -- stale_fence_rejected|quota_refused|watermark_refused|...
  ticket_id  TEXT, artifact_id TEXT, version_id TEXT,
  detail     TEXT                           -- JSON; no secrets, no header values
);

CREATE TABLE ticket_checks (                -- rebuildable cache of Board existence checks
  ticket_id TEXT PRIMARY KEY, state TEXT NOT NULL, checked_at TEXT NOT NULL, next_check_at TEXT
);
```

Versioning semantics (from RESEARCH §2, S3-delete-marker pattern without S3): a new put to an existing `(ticket_id, logical_name)` appends a version and moves `current_version_id`. Delete = append a `is_delete_marker` row + NULL the pointer (list hides it; history retains everything). Undelete = operator re-points to a prior version (a new pointer move, audit-logged). Hard removal exists only as operator-initiated GC (§3.5).

### 3.3 Write path (revised per adversarial review — journal values are computed *inside* the commit lock)

1. Stream request body to `staging/<upload_id>.part`, hashing SHA-256 and sniffing magic bytes on the fly; enforce size cap and disk watermark **continuously while streaming** (abort mid-stream → 413/507); never buffer in memory; bump `uploads.last_activity_at`/`bytes_staged` as the stream progresses.
2. `fsync` the temp file (and its directory). **Do not discard the temp yet, even on a dedup hit.**
3. Acquire the single-writer **commit lock**; `BEGIN IMMEDIATE`; inside the transaction compute the true values: resolve the `artifacts` upsert (which `artifact_id` wins `UNIQUE(ticket_id, logical_name)`), `seq = max+1`, the pointer outcome, the fencing check (§3.6), and verify/insert the `blobs` row (dedup hit = row exists → bump refcount; row missing → this writer owns materialization). All constraint checks happen here, before anything is journaled.
4. Append the version's journal line — now carrying the **committed-to-be** values — and `fsync` the journal. Update `journal_watermark` inside the same transaction.
5. If this writer owns materialization: atomic `rename()` of the temp into the CAS path (same filesystem, idempotent). On a dedup hit where the row existed: discard the temp only now, after the row is re-verified inside the transaction (if the file is unexpectedly missing — e.g. raced a historical GC — rename the temp back in; the temp is still on hand by rule 2).
6. `COMMIT`; release the commit lock. If commit fails after the journal fsync (made near-impossible by pre-checking every constraint in step 3, but not assumed impossible): append a compensating `aborted {version_id}` journal line; the reconciler honors it.
7. Respond `{artifact_id, version_id, seq, sha256, mime_sniffed, size_bytes}`.

Crash analysis: crash before 4 → staging temp only (swept after inactivity). Crash after 4, before 6 → journal ahead of DB; the startup reconciler resumes from `journal_watermark` and replays idempotently (keyed on `version_id`; §3.4), re-materializing from staging if the rename hadn't happened — and a line followed by `aborted` is skipped. No ordering exists in which the DB references bytes that don't exist, and no journal line can carry values the DB didn't (or won't) commit. `delete_marker`, `pointer_move` (restore), and `gc_purge` records follow the same lock → compute → journal-fsync → commit ordering.

### 3.4 Journals (what makes the index rebuildable)

**Version journal:** one NDJSON line per committed version/pointer event — `version_committed` (full `artifact_versions` row + the `artifacts` identity fields), `delete_marker`, `pointer_move` (incl. principal), `gc_purge`, `ticket_state_change`, `aborted`. **Audit journal:** one line per state-change audit event including denials (`put_registered`, `ref_denied`, `stale_fence_rejected`, `quota_refused`, `watermark_refused`, …) with principal — so the Standard-rigor audit trail of *mutations and refusals* survives any rebuild. Read/list access rows stay DB-only (declared loss window, §9.3).

Replay rules (binding): every line carries a unique event id; `version_committed` replay is idempotent on `version_id` (INSERT OR IGNORE); `pointer_move`/`delete_marker` apply only if the target's current state predates the event (monotonic by journal order); `gc_purge` applies against rebuilt rows by marking, never by row deletion; `aborted` cancels its `version_id`. The reconciler and restore both resume strictly from `journal_watermark` (updated transactionally with every apply); rebuild-from-scratch = watermark 0, full ordered replay; a single torn trailing line (crash/backup mid-append) is truncated with a warning — mid-file corruption is an integrity failure, not tolerated silently. `drive verify` = hash spot-checks + row↔blob reconciliation both directions.

### 3.5 Dedup, refcount, GC (revised: deletion is coordinated through the DB, never racing dedup)

- Whole-object SHA-256 dedup across tickets is **accepted** (RESEARCH open decision resolved): blob sharing is invisible to consumers — bytes are reachable only through authenticated artifact/version routes (never addressable by hash from outside), so cross-ticket sharing leaks nothing. Copy-per-ticket would only burn disk to prevent a leak the addressing model already prevents.
- GC: **operator-only**, two-phase, backup-aware (suspended during the §9 backup window).
  - **Phase 1 (continuous, automatic):** sweep staging files whose upload is `aborted`/`expired` (inactivity-based, §4.2 — never an open stream), and orphan blobs past the grace window that appear in **no journal line, no DB row, no pending upload, and no staging file**.
  - **Phase 2 (manual, step-up-confirmed in UI):** purge delete-marked version chains → decrement refcounts → for refcount-0 blobs: delete the `blobs` row **inside a transaction first**, journal `gc_purge`, then `rename()` the file into `quarantine/`, and unlink only after a second grace window. A concurrent put that dedup-hits mid-purge is safe by construction: it re-verifies the row inside its own commit transaction (§3.3 step 3/5) and, finding no row, materializes from its still-held temp file.
- Nothing an agent can call reaches phase 2.

### 3.6 Fencing enforcement (contract conformance — `board-agents-claim.md` §3)

Drive puts are side-effecting calls on ticket-bound state — the deliverable analog of "Notes writes on ticket-bound notes," which the frozen contract obligates. Therefore:

- **Agent-kind principals MUST echo `fencing_token`** on `put_artifact` (and the registration POST). Drive enforces a **local monotonic staleness check**: the Board-minted token is a monotonic integer per locked resource, so Drive tracks the highest generation seen per `ticket_id` (`ticket_fences`) and rejects any lower value with the typed business outcome `STALE_FENCING` (isError:true structured content, never a protocol error — the CLAIM_CONFLICT convention). No Board round-trip is needed; the harmful ordering (stale writer replacing a fresher agent's deliverable as `current_version_id`) requires stale-after-fresh, by which point Drive has recorded the higher generation. Rejections are audit-journaled (`stale_fence_rejected`).
- **Human and service principals are exempt** (they hold no Board lease; the contract's rule binds the agent claim loop). Their versions record `fencing_token = NULL` with principal kind in audit.
- What this deliberately does **not** prove: that the presenting agent is the *current claim-holder* (that would need a Board read per put). The fencing check closes the stale-zombie race the contract targets; holdership-proof remains a Stage-5 tightening option (§15.2).

---

## 4. HTTP API surface (the one shared state; both surfaces sit on this)

All routes under `/api/` on both origins (subdomain for humans, in-cluster for agents — §2.2); JSON unless noted; RS-baseline auth on every route (agent Bearer/DPoP or proxy-verified human identity); typed errors per auth PLAN §5.6 semantics (401 re-mint / 403 scope / 409 / 429 / 503) plus Drive's domain errors (400 malformed id, 404, 409 `STALE_FENCING`, 413 over cap, 415 rejected type, 422 `TICKET_NOT_FOUND`, 507 disk watermark).

| Route | Method | Scope | Purpose |
|---|---|---|---|
| `/api/artifacts` | POST | `drive:write` | Register put intent `{ticket_id, logical_name, op_id, fencing_token (agent-kind: required), mime_hint?, note_id?, expected_sha256?, size_hint?}` → `201 {artifact_id, upload_id, upload_url, expires_policy}`. Idempotent on `(sub, op_id)` — replay collapse is same-principal only; a foreign principal reusing the string is a fresh operation. |
| `/api/uploads/{upload_id}` | PUT | `drive:write` | The out-of-band byte stream (single streaming PUT, cap §10.1). Commit-on-success → `{version_id, seq, sha256, mime_sniffed, size_bytes}`. **Same-principal: only the registering `sub` may touch this session (PUT, DELETE, status).** |
| `/api/uploads/{upload_id}` | DELETE | `drive:write` | Abort a pending upload (same-principal). |
| `/api/artifacts?ticket_id=T-…&page_token=…` | GET | `drive:read` | List (latest version each, delete-marked hidden unless `include_deleted=true`), paginated; rows carry provenance (`created_by`, `ticket_state`, `derived`). |
| `/api/artifacts/{artifact_id}` | GET | `drive:read` | Metadata + version history. |
| `/api/artifacts/{artifact_id}/content` | GET/HEAD | `drive:read` | Bytes of current version — the download endpoint (§4.1). |
| `/api/versions/{version_id}/content` | GET/HEAD | `drive:read` | Bytes of a specific version (immutable; safe to cache hard). |
| `/api/artifacts/{artifact_id}` | DELETE | operator-only (human principal kind) | Append delete-marker. **Not reachable with any agent-mintable scope.** |
| `/api/artifacts/{artifact_id}/restore` | POST | operator-only | Re-point to a prior version. |
| `/api/admin/gc` | POST | operator-only, step-up (§7) | Phase-2 purge (§3.5). |
| `/api/healthz` | GET | none (edge-internal) | Liveness + disk watermark + backup age + last-verify status. |

### 4.1 Download endpoint behavior (binding, from RESEARCH §3/§4)

- `Accept-Ranges: bytes`; full Range/206/`Content-Range`/416 support; 200 fallback. (pdf.js progressive loading depends on this; Caddy pass-through verified at Stage 4/7.)
- Strong `ETag = "sha256:<hex>"`; `If-None-Match` → 304; `If-Range` honored. Version-content URLs are immutable → `Cache-Control: private, immutable, max-age=31536000`; artifact-content URLs revalidate.
- `Content-Type` = stored `mime_sniffed`, never request-derived. `X-Content-Type-Options: nosniff` on **every** byte response.
- `Content-Disposition: attachment` by default (RFC 5987 `filename*` from `original_name`, sanitized). `inline` only for the safe sniffed allowlist: `image/png|jpeg|webp|gif`, `application/pdf`, `text/plain` (charset pinned). **Never** inline for `text/html`, `image/svg+xml`, or anything not on the allowlist.
- Asset CSP on byte responses: `Content-Security-Policy: default-src 'none'; sandbox` — belt-and-braces against any inline misjudgment.

### 4.2 Upload session state machine

`pending → committed` (PUT succeeded, version row written) · `pending → aborted` (client DELETE) · `pending → expired` (sweeper). **Expiry is inactivity-based:** a session expires when no bytes have been received for `DRIVE_UPLOAD_TTL` (default 15 min); the sweeper never touches an upload with an open request stream, so a slow-but-live 5 GiB PUT is never killed mid-flight (a stalled *stream* is separately bounded by the server's socket idle timeout). Staging bytes removed on abort/expire. Idempotency spans the whole flow per-principal: re-registering the same `(sub, op_id)` returns the same `upload_id` (or the committed result if already done) — a dropped-stream retry can never double-version, and a colliding *foreign* principal can never observe another principal's result.

---

## 5. MCP surface (agent view)

Transport: MCP **Streamable HTTP, spec pin 2025-11-25** (D-14 suite pin; re-verify SDK at build per ARCHITECTURE §9). Drive is an OAuth 2.1 RS; tools live under the `drive:*` slice. Schemas are deliberately flat, low-arity, all-string/enum — inside the D-17 complexity ceiling; frozen at this Stage-2 exit **modulo** the ceiling proviso (if the spike fails and the validated ceiling tightens below "flat + arity ≤ 6", these schemas re-verify against it; they are already at the remediation target shape).

### 5.1 Tools (complete list — three tools, no delete)

```
put_artifact(ticket_id, filename, op_id, fencing_token, content_type_hint?, note_id?)
  → {artifact_id, upload_url, expires_policy,
     instructions: "HTTP PUT your file bytes to upload_url with your own
                    Bearer token; the response carries version_id + sha256."}
  # fencing_token: required for agent principals (STALE_FENCING business
  # outcome on a stale echo — §3.6); flat string, arity 6, all-string schema.

get_artifact(artifact_id, version_id?)
  → {artifact_id, ticket_id, logical_name, version_id, seq, sha256,
     mime, size_bytes, note_id?, created_by, ticket_state, derived,
     created_at, download_url}

list_artifacts(ticket_id, page_token?, include_deleted?)
  → {artifacts: [ {artifact_id, logical_name, version_id, seq, sha256,
                   mime, size_bytes, created_by, ticket_state, derived,
                   deleted, created_at} … ], next_page_token?}
  # provenance fields (created_by, ticket_state) travel with every row so
  # consumers can apply ARCH §12 provenance policy; page_token makes page 2
  # actually reachable from the agent surface.
```

- **No bytes ever cross these tools** — metadata + reference only (RESEARCH §5; base64-in-JSON breaks ~8 KB). `upload_url`/`download_url` are the §2.2 authenticated plain URLs (ephemeral, unregistered per IDENTIFIERS).
- **No agent delete tool** (RESEARCH open decision resolved): the deliverable record is append-bias, same safety property as Notes' recommended `notes:append` split. Delete-markers and GC are operator-surface only. Consequence: no `drive:delete` scope is requested at all.
- Errors are typed structured content (`TICKET_NOT_FOUND`, `STALE_FENCING`, `UPLOAD_EXPIRED`, `OVER_SIZE_CAP`, `TYPE_REJECTED`, `QUOTA_EXHAUSTED`), never bare protocol errors — business outcomes, not tool breakage (the `board-agents-claim.md` §1 convention).

### 5.2 Risk / action-class manifest (auth contract §1 Stage-2 deliverable)

| Tool / route | Action class |
|---|---|
| `list_artifacts`, `get_artifact`, content GET/HEAD | **read** |
| `put_artifact`, upload PUT/abort | **write-benign** (append-only; reversible by construction) |
| Operator delete-marker / restore | **write-benign** (reversible pointer ops; human-only) |
| Operator GC purge | **destructive** (irreversible data removal; human-only, step-up-confirmed per §7, fail-closed on revocation staleness per auth baseline) |

No sod-critical and no destructive-exec class exists on the agent surface — Drive holds no approval state, no credentials, no host reach; a fully compromised Drive principal can add flagged artifacts and read artifacts, nothing more (SoD posture for a Standard app). Note the honest scope statement: `drive:read` is **suite-global read** within the artifact store (any valid holder can list/get any ticket's artifacts) — deliberate for a Standard-class store whose consumers legitimately cross tickets (retro agents, recon, MC composition); see §12.1/§15.7.

### 5.3 Scope countersign (Drive's half of the auth ledger)

Drive **countersigns `drive:read` and `drive:write` exactly as offered** in `auth-apps-tokens-scopes.md` §3. Mapping: `drive:read` ⇄ {`get_artifact`, `list_artifacts`, content GET/HEAD}; `drive:write` ⇄ {`put_artifact`, upload PUT/DELETE}. **No delete scope is requested** (no agent delete tool exists). Operator-only routes authorize per the frozen auth baseline: human-principal-kind claims from the validated token / verified `X-Auth-Identity`, and for the one destructive route (GC) the **Tier-2 live check against auth** — never the forwarded header alone (auth PLAN §8.6 Rule 3, §4.7). Budget middleware runs per tool call keyed by `sub`; Redis-down ⇒ benign allow-but-locally-bounded (the destructive GC route fails closed).
**Raised to auth's next session (ledger line on Drive's row):** register `svc:drive` (service principal) with `board:read` on the Board audience for the §2.1 ticket-exists check — Drive's countersign is complete without it; the existence check stays degraded until it lands.

---

## 6. UI surface (human view — Stage 3 specs it; Stage 2 fixes what exists)

Same API, no private endpoints (two views, one state):

1. **Ticket browser** — artifacts grouped by ticket; `ticket_state != verified` and delete-marked states visibly flagged.
2. **Artifact detail** — full version history (who/when/hash/size/note link/fence), download any version, preview pane (§8 routing), restore (operator).
3. **Preview** — inline images/PDF/plain-text per §4.1 allowlist; everything else download-only until the pdf seam freezes.
4. **Admin** — orphan/GC console (step-up confirm), `verified_absent` escalation queue, audit-log view, disk watermark, backup status (last snapshot age + last verify — surfaces §9 health).

No UI write bypasses the API's authz/audit path. Upload-from-UI (operator drag-drop) uses the same POST-intent + PUT flow.

---

## 7. auth integration (RS baseline conformance)

Verbatim adoption of `auth-apps-tokens-scopes.md` §1–2: local JWKS validation (poll ≤30 s + on sig failure), `iss` + `aud == drive` exact, DPoP/`cnf` verification where bound, RFC 9728 protected-resource metadata + `WWW-Authenticate` bootstrap on 401, PLAN §5.6 error semantics verbatim, shared budget middleware (four dimensions keyed by `sub` + in-process concurrency ceiling), `auth:revocations` subscription with snapshot resync. Staleness bound exceeded ⇒ the only fail-closed surface is the operator GC route (the sole destructive action); agent read/write-benign surfaces stay allow-but-locally-bounded per baseline. Principals derive only from validated tokens / verified `X-Auth-Identity` — never advisory headers. **Step-up on GC** is implemented as the auth baseline's destructive-class mechanism: Drive's own token validation plus the Tier-2 live check to auth at execute time (auth PLAN §8.6 Rule 3 / §4.7) — the forwarded identity header is never the step-up evidence. Kill-epoch: honored via the revocation ledger like every RS; Drive has no L2 role.

---

## 8. The pdf seam — Drive's offered half (input to seams #21/#22, PENDING)

What Drive will guarantee to the pdf app's viewer/renderer, so pdf's Stage-1 can freeze `drive-pdf` contracts against it:

- **Byte fetch:** `GET /api/versions/{version_id}/content` with full Range/206/`If-Range`, strong `ETag = sha256`, immutable caching, correct sniffed `Content-Type` — sufficient for pdf.js progressive loading (RESEARCH §3).
- **Auth:** pdf authenticates as itself (`drive:read`); no anonymous or capability-URL access will be offered.
- **Cross-origin posture (part of the offer):** v1 offers **no browser cross-origin byte fetch** — a viewer page served from `pdf.<SUITE_DOMAIN>` either proxies bytes through pdf's backend (service token) or is embedded/served same-origin under `drive.<SUITE_DOMAIN>`. If pdf's Stage-1 needs direct browser fetch across subdomains, credentialed CORS (origin-pinned `Access-Control-Allow-Origin`, `Range`/`If-Range` in allowed headers, cookie scope) is negotiated *into the frozen contract*, not assumed.
- **Derived previews — Drive is the writer:** the render flow is Drive-initiated (Drive calls pdf's render surface and stores the returned bytes itself, as an internal service operation — pdf never pushes into Drive and needs no `drive:write`). Stored as a first-class version row with `derived_from_version_id` set (provenance to the exact source version), same ticket key, logical name suffixed (`<name>.preview.pdf`), `derived = true` (excluded from default listings). Cache-not-dependency: preview serving never requires pdf to be up (RESEARCH §3).
- Until the contract freezes: images/PDF/plain-text preview natively (§4.1); office/other = download-only. **No pdf behavior is assumed** (seam rule).

---

## 9. Backup & DR (CANONICAL store obligations, ARCHITECTURE §10)

### 9.1 Honest classification
- **Canonical:** `blobs/` + version journal + audit journal (the record: every byte, every version/pointer event, every state-change/denial audit event with principal).
- **Rebuildable index:** the SQLite DB — provably, via journal replay (§3.4) — with **one declared exception**: read/list access-log rows live only in the DB and are covered only by the nightly DB snapshot (≤24 h loss window, accepted for Standard rigor; every *mutation and refusal* is journal-canonical).
- **Disposable:** `staging/`, `quarantine/`, `ticket_checks`, any FTS.

### 9.2 Mechanism + cadence (the §6 register answer — journal-first ordering)
Nightly (03:00), with **GC (both phases) suspended for the window**:
1. **Rotate/close the active journal files** (fsync'd, so the captured set is closed files only — no torn tails; the §3.4 one-torn-line tolerance remains as crash defense, not backup policy).
2. `VACUUM INTO db/backup/drive-snapshot.sqlite3` (consistent point-in-time DB copy; snapshots the `journal_watermark` with it for free).
3. `restic backup` ordered **journal/ → db/backup/ → blobs/** to an off-suite-host repository (operator NAS or bucket; `DRIVE_BACKUP_REPO`, operator input §15.4). Ordering guarantee: the captured journals never reference a blob the same snapshot lacks (blobs added mid-walk are harmless orphans-in-backup; GC is suspended so none are removed).
- CAS immutability makes incrementals near-free. **Retention:** 7 daily / 4 weekly / 6 monthly (`restic forget --prune` weekly). **Weekly scrub:** `drive verify` + `restic check`. Backup age + last-verify surfaced in `/api/healthz` and the admin UI so a silently-failing backup is loud.

### 9.3 Restore-consistency rule (stated now, drilled at Stage 7)
Restore `journal/` + `blobs/` from one snapshot; then **primary path:** restore the DB snapshot and replay journal lines from its snapshotted `journal_watermark` forward. **Fallback path:** `drive rebuild-index` from watermark 0. The two paths are equivalent **for the index and for all mutation/denial audit history** (journal-canonical); they differ only in read/list access rows, which exist solely in the DB snapshot (the fallback path loses up to the declared window — stated, not hidden). Invariant the drill demonstrates: after restore, every DB row resolves to an existing blob whose hash verifies; every blob is either referenced or flagged orphan; no state in which the index claims bytes that don't exist. Cross-app consistency: Drive references tickets one-way (opaque strings), so a Drive restore cannot corrupt Board/SoD state; a Board restored older than Drive merely yields ticket re-check flags — the reconciliation sweep self-heals. Stage-7 exit: restore into a fresh volume via the **primary** path, run `drive verify`, list/download known artifacts through both surfaces; demonstrate the fallback rebuild on the same snapshot.

---

## 10. Limits, quotas, content policy

### 10.1 Size and transfer
- Per-artifact cap **5 GiB** (`DRIVE_MAX_BYTES`); enforced while streaming (abort at cap, 413).
- **v1 is single streaming PUT only** — no tus/multipart. Rationale: all writers are LAN-local containers; the failure-resume case tus solves is a flaky-WAN case the suite doesn't have; a whole-file retry at homelab LAN speed is cheap; and it keeps a dependency + an abuse surface (abandoned chunk state) out of scope. Revisit at Stage-6 only if measured retry waste says otherwise. *(Deviation from RESEARCH §4's ">100 MB ⇒ resumable" lean — flagged as an operator-visible accepted risk, §15.1.)*
- Caddy `request_body max_size` set just above cap **on the upload route only** (`/api/uploads/*`), small default elsewhere — one line in the proxy's drive site block, coordinated at Stage 4.

### 10.2 Content-type policy (server-sniffed, canonical)
- Sniff magic bytes while streaming; persist sniffed MIME as canonical; client hint stored as display metadata only. Mismatch ⇒ trust the sniff, don't reject (agents' hints are unreliable; rejection loops burn agent steps for zero security — serving policy, not storage policy, is the enforcement point).
- Accepted: broad allowlist of agent-produced formats (pdf, png/jpeg/gif/webp, svg, plain/csv/json/ndjson, zip/gzip/tar, OOXML/ODF, parquet, `application/octet-stream` catch-all for unknowns).
- **Rejected 415 by default:** PE/ELF/Mach-O executables (`DRIVE_ALLOW_EXECUTABLES=false` default) — no suite consumer produces standalone executables; flipping the flag is an operator config change. SVG is accepted but **never inline** (§4.1); HTML is accepted as `text/html` but attachment-only forever.
- Serving controls (nosniff, attachment-default, inline allowlist, asset CSP) are the real boundary and apply to every type including octet-stream.

### 10.3 Quotas / abuse (revised: the three controls now compose over the staging path)
- Auth budget middleware = per-call rate layer. Drive adds a **bytes-per-principal-per-day quota** (`DRIVE_DAILY_BYTES_QUOTA`, default 20 GiB) → 429 `QUOTA_EXHAUSTED` — **charged as bytes stream into staging** (released back on abort/expiry), not on commit, so staging churn is quota-visible.
- Disk watermark (90% volume usage): checked at registration **and continuously during streaming** (in-flight streams abort with 507 when crossed) — staged bytes can never push the volume past the watermark unguarded.
- **Concurrent pending uploads capped per principal** (`DRIVE_MAX_PENDING_UPLOADS`, default 4) — bounds worst-case staging occupancy to cap × pending-limit per principal.
- Staging sweeper expires inactive uploads (§4.2). Watermark/quota refusals are audit-journaled; escalation wiring (Chat notification) is deferred to Chat's availability — refusal itself never depends on it.

---

## 11. Deployment conformance (DEPLOYMENT.md §2/§5/§6)

Compose service **`drive`**, internal port **8080**, joins **`edge`** only, no host ports, no sidecars (no §3a amendment needed). Subdomain `drive.<SUITE_DOMAIN>` == audience `drive` == service name. Auth resolved at **`auth:8089`** (forward-auth at the proxy; JWKS + verification calls from Drive). Volume **`drive_data`** mounted at `/data`. Env prefix `DRIVE_` (`DRIVE_DB_PATH`, `DRIVE_DATA_DIR`, `DRIVE_MAX_BYTES`, `DRIVE_UPLOAD_TTL`, `DRIVE_TICKET_CHECK_TTL`, `DRIVE_TICKET_RECHECK_SCHEDULE`, `DRIVE_DAILY_BYTES_QUOTA`, `DRIVE_MAX_PENDING_UPLOADS`, `DRIVE_BACKUP_REPO`, `DRIVE_ALLOW_EXECUTABLES`, `DRIVE_INTERNAL_ORIGIN`); committed `.env.example` matches this spec's authoritative values. SQLite-per-app default holds — no exception requested.

**Implementation stack (Stage-4 verifiable, not contract):** Node/TypeScript + Fastify (native streaming, one runtime for API + MCP SDK at the 2025-11-25 pin) + `better-sqlite3`; aligns with Board's ratified Node lean. Re-verify SDK/transport at build per ARCHITECTURE §9.

---

## 12. Threat-model outline (Stage-5 input; Standard rigor + the axes the operator named)

1. **Unauthenticated blob access.** Surfaces: download/upload endpoints. Mitigations: no host ports + edge-only network; forward-auth at proxy for humans; local RS token validation for agents; **no capability URLs exist** (§2.2 — nothing to leak into tickets/notes/logs); blobs are never addressable by hash — bytes are reachable only via authenticated `drive:read` routes keyed by Drive-minted UUIDv7 `artifact_id`/`version_id`; asset CSP + nosniff on every byte response. Honest scope note: `drive:read` is suite-global within the store (§5.2) and `ticket_id`s are sequential/enumerable — a valid `drive:read` holder can enumerate all artifacts by walking ticket ids. Accepted for v1 (agents legitimately read across tickets; list is rate-limited by the budget middleware); recorded §15.7.
2. **ticket_id spoofing / provenance pollution.** Mitigations: format gate + Board existence check + three-state `ticket_state` with a **terminal `verified_absent` disposition** (auto delete-marker + escalation — no silent rot; §2.1); `created_by` = validated `sub` on every row; **fencing staleness enforcement** (§3.6) closes the stale-zombie-overwrites-deliverable race; append-only versions mean a spoofer can add flagged noise but never alter or destroy existing provenance. Residual (accepted, v1): claim-holdership is not proven per put (§3.6, §15.2).
3. **Storage exhaustion (DoS).** Mitigations: streaming size cap (413), continuous watermark enforcement incl. in-flight aborts (507), staged-bytes-charged daily quota (429), pending-upload concurrency cap, Caddy `request_body max_size` at the edge, auth per-call budgets, inactivity-based staging sweeper, dedup (identical re-puts cost ~0). Residual: a scoped agent can still burn its daily quota on garbage — bounded, visible, auditable.
4. **Malicious content served to the operator (stored XSS).** Mitigations: §4.1 serving rules (sniffed type, nosniff, attachment-default, strict inline allowlist, SVG/HTML never inline, sandbox CSP); MIME sniffed server-side, never client-trusted. This is the RESEARCH §3 CVE-class defense.
5. **MCP-surface abuse / prompt injection via stored metadata.** Filenames/logical names are agent-written adversarial-adjacent text redisplayed to the operator and to other agents (list output): UI escapes everything; MCP list output returns names verbatim but they're data-position fields in flat schemas; length-capped + control-char-stripped at write. Artifacts fetched by agents are untrusted input to *them* (ARCH §12) — Drive can't fix that, but provenance fields (`created_by`, `ticket_state`, `derived`) travel with every get/list row (§5.1) so consumers can apply provenance policy.
6. **Path traversal / filename attacks.** Storage paths derive from the hash only; `original_name`/`logical_name` are pure metadata, sanitized on the way out (`filename*` encoding), never used to build filesystem paths.
7. **Tamper / repudiation.** Append-only versions + append-only journals (mutations AND denials, with principal — rebuild-surviving, §3.4/§9.1) + append-only DB audit_log + nightly off-box backups; `drive verify` detects bit-rot/tamper of blobs against stored hashes. Read/list access rows carry the declared ≤24 h loss window (§9.1). (No hash-chain rigor — that's Critical-infra tier; Standard = audit completeness.)
8. **Dedup side-channel.** Blob sharing across tickets is invisible (no by-hash API, no shared-with-whom field); timing dedup-hit vs miss on PUT could confirm "someone already stored these exact bytes" — accepted as negligible for a single-operator homelab (noted for Stage-5).

---

## 13. Build sequencing (Stage-4 order, API-first per root invariant)

1. Storage engine: CAS write path (§3.3, incl. commit lock + journal ordering), journals, rebuild/verify/orphan-sweep/reconciler commands, SQLite schema + migrations.
2. Core HTTP API (§4) incl. download-endpoint header matrix + RS auth middleware + fencing check + audit.
3. MCP surface (three tools) over the same service layer; MCP authz (scopes) + typed errors.
4. UI (from Stage-3 spec) over the same API.
5. Backup job + healthz surfacing; Caddy site-block coordination (body cap, Range pass-through).
6. Stage-4 exit: verify against DEPLOYMENT.md §6 (networks/name/port/auth), both surfaces exercising one state.

---

## 14. Adversarial review — findings and dispositions (run 2026-07-02; 4 lenses, per-finding skeptic verification)

20 serious findings raised; each independently verified by a skeptic instructed to refute. 13 confirmed, 3 refuted, 2 downgraded, plus 3 notes. Every confirmed finding is folded into the sections cited.

| # | Finding (lens) | Verdict | Disposition |
|---|---|---|---|
| 1 | Fencing token recorded but never checked — contradicts frozen `board-agents-claim.md` §3 (contracts) | **confirmed** | **Fixed §3.6:** required echo for agent principals + Drive-local monotonic staleness check + `STALE_FENCING`; §15.2 reframed honestly |
| 2 | `op_id` uniqueness global, not per-principal — cross-principal replay collapse / false-greens (contracts+security, 2 finders) | **confirmed** | **Fixed §3.2/§4/§4.2:** `UNIQUE(created_by, op_id)` on versions + uploads; replay collapse same-principal only (auth `{sub}:{key}` shape; matches Chat's Stage-2 precedent) |
| 3 | Journal fsync'd before the txn that determines seq/upsert/pointer — bogus lines under concurrency or failed commits (durability) | **confirmed** | **Fixed §3.3:** lock → compute-in-txn → journal fsync → commit; idempotent replay on `version_id`; compensating `aborted` record |
| 4 | Dedup-hit discards temp while GC can unlink the blob — "DB references missing bytes" reachable (durability) | **confirmed** | **Fixed §3.3/§3.5:** temp retained until commit re-verifies the blobs row; GC = row-delete-in-txn → quarantine → deferred unlink; sweep excludes staging/pending |
| 5 | audit_log lives only in the "rebuildable" DB; §9.3 equivalence claim false; rebuild destroys the audit trail (durability+contracts+premises, 3 finders) | **confirmed** | **Fixed §3.4/§9.1/§9.3:** parallel append-only audit journal for all mutations/denials (canonical); read/list rows declared as the sole ≤24 h-window class; equivalence claim corrected |
| 6 | Backup ordering protects DB↔blobs but not journal↔blobs; torn trailing line; GC races the walk (durability) | **confirmed** | **Fixed §9.2:** rotate/close journals first → VACUUM INTO → restic journal→db→blobs; GC suspended; torn-line rule pinned to crash defense |
| 7 | No journal replay watermark / per-record idempotency rules (durability) | **confirmed** | **Fixed §3.2/§3.4:** `journal_watermark` updated transactionally; per-record idempotency rules stated |
| 8 | 15-min TTL from creation can expire an actively-streaming upload (durability) | **confirmed** | **Fixed §4.2:** inactivity-based expiry; sweeper never touches open streams |
| 9 | Watermark/quota/staging don't compose — staging churn fills the volume uncharged (security) | **confirmed** | **Fixed §10.3:** continuous watermark incl. in-flight abort; staged bytes charged; pending-uploads cap |
| 10 | `verified_absent` has no terminal disposition — flag rots into universal noise (premises) | **confirmed** | **Fixed §2.1:** three-state flag; bounded recheck schedule; auto delete-marker + operator escalation on `verified_absent` |
| 11 | Ticket-exists check needs TWO ungranted halves (Board endpoint + `svc:drive` board:read grant) (contracts) | **confirmed** | **Fixed §2.1/§5.3/§15.5:** both halves raised as recorded dependencies; degraded default until both land |
| 12 | "Artifact-level authz" asserted but drive:read is global + ticket ids enumerable (security) | **downgraded** | **Fixed phrasing §5.2/§12.1** (the demanded per-ticket ACLs are contradicted by suite design); global-read + enumerability recorded honestly (§15.7) |
| 13 | Agent raw-HTTP-PUT capability + machine Bearer through proxy unvalidated (premises) | **downgraded** (proxy half refuted — auth PLAN §8 covers machine traffic) | **Fixed §2.2:** agent refs minted on in-cluster origin (proxy moot for agent bytes); `drive ↔ agent-runtime` upload-step seam raised for CONTRACTS still-to-write (§15.6) |
| 14 | Operator-route principal-kind/step-up basis unstated/ungrounded (contracts) | **refuted** (mechanism exists in frozen auth PLAN §8.6 R3/§4.7) | §5.3/§7 now cite the exact mechanism (Tier-2 live check) rather than leaving it implicit |
| 15 | `X-Auth-Identity` lacks `auth_time` so step-up unverifiable (security) | **refuted** (forwarded header was never the step-up mechanism) | Same citation fix as #14 |
| 16 | pdf derived-preview write half missing (premises) | **refuted** (flow direction: Drive is the writer, calls pdf, stores internally) | §8 clarified to state it explicitly |
| — | Notes: list pagination + provenance fields in rows; upload-DELETE same-principal; CORS posture for the pdf viewer | notes | All three applied (§5.1, §4/§4.2, §8) — each was a one-line schema/spec fix cheaper than carrying a residual |

---

## 15. Residual risks / open decisions for the operator

1. **No resumable upload in v1** (§10.1) — deviation from RESEARCH's >100 MB lean, justified by LAN-only writers. Accept, or mandate tus now?
2. **Claim-holdership not proven on put** (§3.6) — fencing staleness IS enforced per the frozen contract (stale zombies rejected), but Drive does not verify the presenting agent currently holds the Board claim; a validly-scoped, currently-fenced-or-fenceless agent can attach artifacts to any existing ticket (flagged, attributed, append-only). Accept for v1 with Stage-5 revisit, or require a Board claim check per put (adds a Board round-trip + hard Board dependency)?
3. **Executables rejected by default** (§10.2) — flip `DRIVE_ALLOW_EXECUTABLES` only by operator config. Confirm.
4. **Backup target** — `DRIVE_BACKUP_REPO` needs a concrete off-box destination (NAS path / bucket / repo password custody). Operator input before Stage 7.
5. **Two-half ticket-exists dependency** (§2.1): (a) Board Stage-2 exposes a ticket-exists read; (b) auth registers `svc:drive` with `board:read` (§5.3). Degraded mode (format-check + `unverified_pending`-always) is the default until both exist. Both are recorded dependencies raised to those apps' registers — nothing is assumed.
6. **`drive ↔ agent-runtime` upload-step seam** (§2.2): the runtime should provide a deterministic file-upload step (path + `upload_ref` + token → HTTP PUT) so local models never hand-roll HTTP. To be added to CONTRACTS "still to write"; runtime Stage-2 input. Until then, agent uploads assume the runtime's tooling can perform an authenticated PUT.
7. **Global `drive:read` + enumerable ticket ids** (§12.1) — any valid holder can walk all artifacts. Deliberate for Standard-class cross-ticket consumers; per-ticket read ACLs rejected as contrary to suite design. Recorded honestly rather than claimed away.
8. **Dedup timing side-channel** (§12.8) — negligible at homelab scale; noted for Stage-5.

---

## 16. How the Stage-2 exit criteria are met

- **Data model specified:** §3 (DDL-level schema, on-disk layout, lock-ordered crash-safe write path, dual journals + watermark + rebuild rules, GC with quarantine, fencing enforcement).
- **Both surfaces specified over one shared state:** §4 (the single API), §5 (MCP tools = thin siblings, schemas inside the D-17 ceiling), §6 (UI = thin sibling); neither downstream of the other; no private state.
- **Adversarial review run, concerns resolved or accepted with reason:** §14 (20 findings, per-finding skeptic verification, 13 confirmed → all folded in; 3 refuted with the refutation encoded as citations; 2 downgraded + 3 notes → recorded/applied) and §15 (accepted residuals, each with its reason and an operator hook).
- **Deferred/register items resolved:** §2 (ticket validation posture; byte handoff; backup cadence; pdf parked per seam rule); scope slice countersigned §5.3; risk manifest delivered §5.2.
