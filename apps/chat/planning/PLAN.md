# Stage 2 Planning — `chat`

> Standard risk class. Inherits: root CLAUDE.md invariants, ARCHITECTURE.md (§4 chat row, §5, §10–§13), PROCESS.md Stage-2, `apps/chat/CLAUDE.md` SETTLED D-14, `context/specs/{IDENTIFIERS,TICKET_STATE_MACHINE,DEPLOYMENT}.md`, `context/CONTRACTS/*` (esp. `auth-apps-tokens-scopes.md`, `vault-gateway-redemption.md` §1 data-hygiene, `killswitch-chain.md` §1), MERGE_REVIEW_1 §6 Chat register + seams #23/#24/#31, RATIFICATIONS D-3/D-10/D-14/D-17.
>
> **Ratified frame (D-14):** Chat is a **thin bespoke service** — own canonical SQLite (feed + audit log), own SSE feed, one write-only MCP tool. **ntfy is an outbound push sink only** (`chat_ntfy` sidecar): never the core, never a second source of truth, never a second identity system; Chat is its only publisher.
>
> **Schema-complexity ceiling (D-17):** the gap-1.3 spike has not yet run. Chat is not hard-gated (only Board/Notes are), but every MCP tool below is kept **flat, low-arity, enum-biased** — no nested objects on the tool surface — so it sits under any ceiling the spike can validate. The tool schema is marked *provisional-within-ceiling* until the spike passes.

---

## 0. What binds this plan (inherited, never re-derived)

| Constraint | Source |
|---|---|
| One-way agent→operator + operator→fleet broadcast; **no agent-to-agent path, no agent read surface** | ARCH §4, chat CLAUDE.md |
| Chat DB is **CANONICAL** (delivered-notification record exists nowhere else) → stated backup + retention + Stage-7 restore drill | ARCH §10 |
| `notification_id`: Chat-minted, opaque, **doubles as the SSE `Last-Event-ID` replay cursor**; `dedup_key` deliberately NOT registered (opaque, never parsed); `ticket_id` stored verbatim, never fabricated; `agent_id`/`sub` opaque; `op_id` on every mutating tool | IDENTIFIERS.md |
| RS baseline: JWKS local validation, `aud == chat`, RFC 9728 metadata, verbatim error semantics (401/403/409/429/503), budget middleware (4 dimensions + in-process concurrency ceiling), revocation subscription + epoch, risk/action-class manifest per tool | `auth-apps-tokens-scopes.md` §1–2 |
| Agent token TTL 2 min; revocation SLO p99 <1 s; JWKS poll ≤30 s | same, §2 |
| **No wrapping token or redeemable material ever appears in a chat message** | `vault-gateway-redemption.md` §1 |
| Broadcast is soft/advisory, explicitly weaker than the kill switch (auth L1 / Gateway L2); Chat is nowhere in the kill chain | `killswitch-chain.md` §1 |
| MCP pinned **2025-11-25** suite-wide; Streamable HTTP; do not design against the 2026-07-28 RC | D-14 |
| Deploy: compose/DNS `chat`, internal **8080**, `edge` network, no host ports, auth at `auth:8089`; sidecar convention §3a | DEPLOYMENT.md |
| MC is `mc` (service/subdomain/audience) → `https://mc.<SUITE_DOMAIN>/…` deep links are correctly-named | D-3 |

---

## 1. Data model (SQLite, WAL mode, volume `chat_data`)

One database, three real tables + one outbox. The `notifications` and `broadcasts` tables ARE the canonical feed; `audit_log` covers the few mutating operator actions (Standard-rigor audit of state changes). No DELETE or UPDATE path exists for envelope content — append-only by construction.

### 1.1 `notifications` — the unified envelope (§6 register: TWO variants → ONE)

Research carried two envelope variants (§3 push-shaped: `class/body/click/actions/ack_state`; §4 pointer-shaped: `type/summary/source_ref/resolved`). **Unified here** — pointer-shaped core (the §4 skeleton) carrying the §3 delivery fields; the divergent names resolve as: `class`+`type` → **`kind`**; `body`+`summary` → **`body`** (one markdown field, ≤4000 chars; the push leg derives its own short summary); `click` → **derived at read time** from `source_ref` (never stored, never agent-supplied); `actions[]` → **dropped from v1** (the only action is the deep link); `ack_state`+`resolved` → **two distinct fields** (`acked_*` = "operator saw it", Chat-owned; `resolved_*` = reserved mirror for the pending MC resolve event, seam #24).

```sql
CREATE TABLE notifications (
  seq             INTEGER PRIMARY KEY,          -- rowid; total order; replay comparator
  notification_id TEXT NOT NULL UNIQUE,         -- 'N-' + monotonic ULID (mint rule §1.5); the SSE cursor
  created_at      TEXT NOT NULL,                -- Chat server clock only (no cross-clock math)
  agent_id        TEXT NOT NULL,                -- auth `sub`, stamped server-side from the validated token — NEVER caller-supplied
  kind            TEXT NOT NULL CHECK (kind IN ('escalation','needs_review','done')),
  priority        INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),  -- clamped per kind, §3.2
  title           TEXT NOT NULL,                -- ≤120 chars, plaintext
  body            TEXT NOT NULL,                -- ≤4000 chars, markdown, stored AS POSTED (audit fidelity); sanitized at render, §12
  tags            TEXT NOT NULL DEFAULT '[]',   -- JSON array of ≤8 short strings
  ticket_id       TEXT,                         -- opaque, verbatim (T-…); optional
  fencing_token   TEXT,                         -- stored verbatim if supplied; advisory only in v1 (§15.4)
  source_system   TEXT CHECK (source_system IN ('board','mc','notes')),
  source_kind     TEXT CHECK (source_kind IN ('ticket','review','note')),
  source_id       TEXT,                         -- opaque foreign id; all three set or all three NULL
  dedup_key       TEXT,                         -- opaque ≤128; semantic collapse, §11.2
  op_id           TEXT NOT NULL,                -- caller-minted idempotency key (IDENTIFIERS row), §11.1
  repeat_count    INTEGER NOT NULL DEFAULT 0,   -- bumped on dedup collapse
  last_seen_at    TEXT NOT NULL,                -- bumped on dedup collapse
  acked_at        TEXT, acked_by TEXT,          -- Chat-owned "operator saw it"
  resolved_at     TEXT, resolved_source TEXT    -- RESERVED: written only by the MC resolve-event subscriber (seam #24, PENDING)
);
CREATE UNIQUE INDEX idx_op    ON notifications(agent_id, op_id);
CREATE UNIQUE INDEX idx_dedup ON notifications(agent_id, dedup_key) WHERE dedup_key IS NOT NULL AND acked_at IS NULL;
CREATE INDEX idx_feed  ON notifications(acked_at, priority, seq);
CREATE INDEX idx_ticket ON notifications(ticket_id);
```

### 1.2 `broadcasts` — operator→fleet advisory (UI-only; no agent read path)

```sql
CREATE TABLE broadcasts (
  seq          INTEGER PRIMARY KEY,
  broadcast_id TEXT NOT NULL UNIQUE,   -- 'B-' + ULID; app-INTERNAL id (per IDENTIFIERS rules: not promoted to the registry unless a consumer appears)
  created_at   TEXT NOT NULL,
  created_by   TEXT NOT NULL,          -- operator sub, server-stamped
  body         TEXT NOT NULL,          -- ≤2000 chars markdown, sanitized at render
  priority     INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  expires_at   TEXT NOT NULL,          -- short by default (24h); display-state only, row retained
  revoked_at   TEXT, revoked_by TEXT
);
```

Per the Stage-1 adversarial ruling: a broadcast is a **soft, UI-only advisory record**. It renders in Chat's UI (active-broadcast banner + history). If an advisory must reach agents it travels via Board/MC — Chat exposes `GET /api/broadcasts` (operator-readable) that MC *may* later consume; that consumption would be a new seam to freeze then, not now. Explicitly weaker than the kill switch; no enforcement teeth.

### 1.3 `audit_log` — append-only record of mutating actions

```sql
CREATE TABLE audit_log (
  seq INTEGER PRIMARY KEY, at TEXT NOT NULL, actor_sub TEXT NOT NULL,
  action TEXT NOT NULL,   -- post|ack|broadcast|broadcast_revoke|push_delivered|push_failed|reject_secret_pattern|reject_validation|rate_limited
  object_id TEXT, detail TEXT
);
```

The envelope tables are themselves the primary audit record (append-only); `audit_log` adds the actor/outcome trail for state *changes* (acks, revokes) and rejections, satisfying Standard Stage-5 audit rigor.

### 1.4 `push_outbox` — at-least-once ntfy delivery

```sql
CREATE TABLE push_outbox (
  notification_id TEXT PRIMARY KEY REFERENCES notifications(notification_id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|delivered|gave_up
  attempts INTEGER NOT NULL DEFAULT 0, last_attempt_at TEXT, delivered_at TEXT
);
```

Delivery semantics: **at-least-once, with the SSE feed + UI as the durable fallback** — a failed push never loses a notification; `gave_up` (after capped exponential backoff, ~1h) is surfaced in the UI health strip.

### 1.5 `notification_id` mint rule

`N-` + monotonic ULID (prefix-typed per IDENTIFIERS rule 2; lexicographically ordered so the id itself works as the `Last-Event-ID` cursor). Replay = `WHERE seq > seq_of(cursor)` — `seq` is the internal total order; the id is the only thing clients ever see.

---

## 2. State: what Chat owns vs. points at

- Chat owns: the notification envelope, ack state ("operator saw it"), broadcast records, push-delivery status, its audit log.
- Chat points at (never copies, never mutates): ticket/approval/review state (Board/MC), note content (Notes), kill-switch state (auth). `body` is a deliberately-stale snapshot; **if summary and target disagree, the target wins** — rendered as a UI caption on every deep link.
- Chat never writes into MC/Board/Notes. The only inbound state flow is the future one-way MC→Chat resolve event (seam #24, PENDING — reserved columns exist; the subscriber is added when MC freezes the event feed; non-breaking).
- Ownership split (Stage-1, kept): **Chat owns "operator saw it"; MC owns "artifact reviewed."**

---

## 3. HTTP API (the ONE shared state; MCP + UI are siblings over it)

All endpoints behind proxy forward-auth; RS validation per `auth-apps-tokens-scopes.md` §1. Error semantics verbatim from auth PLAN §5.6.

| Endpoint | Scope | Notes |
|---|---|---|
| `POST /api/notifications` | `chat:post` (agents + operator) | body = §4 tool params; server stamps `agent_id`; returns `{notification_id}`; returns-existing on `op_id`/`dedup_key` replay |
| `GET /api/notifications` | `chat:read` (operator) | filters: `kind, min_priority, agent_id, ticket_id, acked, since (cursor), limit`; keyset pagination on `seq` |
| `GET /api/notifications/{id}` | `chat:read` | envelope + derived `deep_link` (§6) |
| `GET /api/feed` (SSE) | `chat:read` | live stream; `Last-Event-ID`/`?since=` replay from persisted history (§7) |
| `POST /api/notifications/{id}/ack` | `chat:manage` (operator) | sets `acked_at/acked_by`; idempotent; audit row. Batch variant: `POST /api/notifications/ack {up_to_seq, kind?}` |
| `POST /api/broadcasts` | `chat:manage` | `{body, priority, expires_at?}`; audit row |
| `POST /api/broadcasts/{id}/revoke` | `chat:manage` | sets `revoked_at`; audit row |
| `GET /api/broadcasts` | `chat:read` | `?active=true` for the banner; MC-consumable later |
| `GET /healthz` | none (edge-internal) | liveness + push-sink status |

No DELETE anywhere. No approve/deny anything — **Chat is the doorbell; MC is the door.**

### 3.2 Priority bands (server-clamped by kind — kills priority inflation)

| kind | default | allowed band | ntfy mapping | ack expectation |
|---|---|---|---|---|
| `escalation` | 5 | 5 (fixed) | `urgent` (5) | ack-required; re-push at most every 15 min while un-acked (§11.2) |
| `needs_review` | 4 | 3–4 | `high` (4) | ack = "seen"; clearing happens in MC |
| `done` | 2 | 1–2 | `low` (2) | informational; auto-acked by batch ack |

---

## 4. MCP surface (agent side): ONE write-only tool

MCP Streamable HTTP, spec rev **2025-11-25**, mounted on the same service, OAuth 2.0 RS with RFC 8707 resource binding (audience `chat`). **Flat, low-arity, enum-biased** (D-17 ceiling): the `source_ref` triple is flattened to three scalar params; no nested objects; `tags` is a CSV string, not an array — the schema is scalar-only.

```
post_notification(
  kind:          enum('escalation','needs_review','done'),   -- required
  title:         string ≤120,                                 -- required
  body:          string ≤4000 (markdown),                     -- required
  op_id:         string ≤128,                                 -- required (caller-minted, IDENTIFIERS)
  priority:      integer 1–5,                                 -- optional; clamped to the kind's band
  ticket_id:     string,                                      -- optional; stored verbatim
  fencing_token: string,                                      -- optional; stored verbatim (advisory, §15.4)
  source_system: enum('board','mc','notes'),                  -- optional; all-or-none with the next two
  source_kind:   enum('ticket','review','note'),
  source_id:     string,
  tags:          string (comma-separated, ≤8 tags),
  dedup_key:     string ≤128                                  -- optional
) -> { notification_id }
```

- `agent_id` is **never a parameter** — stamped from the authenticated subject (spoofing closed by construction).
- No `post_escalation` sugar in v1 (research open Q8 → **decided: out**; the `kind` enum is already one flat choice; revisit only if spike/retro data shows escalation-vs-spin failures attributable to tool shape).
- No agent read/list/ack/broadcast/delete tools exist — not registered on the agent audience at all.
- Business failures (dedup collapse → existing id; rate limit; validation) return structured `isError` content, never JSON-RPC errors (matching the Board contract's convention).

### 4.1 Risk / action-class manifest (owed to auth at Stage-2 — `auth-apps-tokens-scopes.md` §1 deliverable)

| Tool / endpoint | Action class |
|---|---|
| `post_notification` / `POST /api/notifications` | **write-benign** (append-only, no world effect) |
| ack / broadcast / revoke | **write-benign** (operator-only) |
| feed / history / SSE reads | **read** |

No propose, sod-critical, or destructive-exec class exists in this app. Concurrency ceiling: normal (nothing here is the "very low, often 1" class).

---

## 5. auth scope slice — reconciled + countersigned (§6 register item)

Research proposed `chat:notify:write` / `chat:broadcast:write` / `chat:feed:read`; auth's offered slice is `chat:post`. The suite convention everywhere else is flat `<app>:<verb>` (`board:claim`, `notes:write`, `pdf:render`). **Reconciliation: keep auth's offered name, extend with two flat operator scopes:**

| Scope | Held by | Grants |
|---|---|---|
| `chat:post` | agent principals (+ operator) | `post_notification` / `POST /api/notifications` — the ONLY agent-reachable capability |
| `chat:read` | **operator only** | feed, history, SSE, broadcast list |
| `chat:manage` | **operator only** | ack, broadcast create/revoke |

Agents never receive `chat:read`/`chat:manage` (the auth contract's "agents never get read/broadcast" line, countersigned). This table **is Chat's countersign** of the auth PLAN §3.3 slice; auth's ledger updates `chat:post` → `chat:post/read/manage` at its next session (noted in §16).

---

## 6. `source_ref` → deep-link scheme (seam #23 — designed here, MC binding PENDING)

Stored shape: the flattened triple `{source_system, source_kind, source_id}`. The deep link is **derived server-side at read time** from templates Chat owns — deriving at read (not write) means a late-frozen MC scheme upgrades ALL historical rows for free. Agents can never supply a URL; `javascript:`/free-form anything is structurally impossible, not filtered.

| system | kind | Template | Status |
|---|---|---|---|
| board | ticket | `https://board.<SUITE_DOMAIN>/ticket/{source_id}` | PROVISIONAL — confirm at Board Stage-2 (low risk) |
| notes | note | `https://notes.<SUITE_DOMAIN>/note/{source_id}` | PROVISIONAL — confirm at Notes Stage-2 (low risk) |
| mc | review | **PENDING MC Stage-2** (seam #23: MC freezes its review-item URL scheme; Chat must not invent it) | **fallback until frozen: `https://mc.<SUITE_DOMAIN>/`** (MC home), link captioned "review queue" |
| mc | ticket | `https://mc.<SUITE_DOMAIN>/` fallback likewise | PENDING |

- `source_id` is opaque to Chat (IDENTIFIERS: the MC review-item id is *pending mint*; if MC reuses `ticket_id`, nothing here changes — Chat never parses it beyond URL-encoding).
- Validation at post time: enum-check system/kind; require all-three-or-none; URL-encode `source_id` on render; host+path always template-fixed.
- **Non-breaking upgrade rule:** when MC's `mc → chat` contract lands in `context/CONTRACTS/`, Chat's change is one template row + removing the fallback caption. This dependency does NOT block Stage-2 exit (the stored envelope is frozen; only a render template waits), but **it must land before Chat's Stage-7 exit** — a doorbell that can't point at the door fails verification.

---

## 7. SSE feed semantics

- `GET /api/feed`: `text/event-stream`; event types `notification` (full envelope + derived deep link), `broadcast`, `ack` (so a second open client updates), heartbeat comment every ~25s.
- Every event carries `id: <notification_id>` (or broadcast/ack ids). Reconnect replay: standard `Last-Event-ID` header or `?since=<notification_id>`; server resolves the cursor to `seq` and streams everything after, then goes live — the feed is **exactly the persisted table**, so replay-from-history and live are one code path (no gap, no second buffer).
- One-way only; no client→server messages on this channel; WebSocket explicitly out of v1.

---

## 8. Push path — ntfy as sink ONLY (D-14), sidecar `chat_ntfy` (D-10)

**Wiring:** Chat's outbox worker POSTs each notification event to the self-hosted `chat_ntfy` over the internal network — one publisher (Chat's single ntfy access token), one operator topic, **deny-all default ACL** (one write-only token for Chat, one read-only subscription token for the operator's devices). No agent, and no other app, ever talks to ntfy. ntfy's cache is a push buffer, never a source of truth; feed reads never touch it.

**No identity logic in ntfy:** the two ntfy tokens are *device-subscription plumbing*, not principals — nobody's identity is asserted by them and nothing suite-side consumes them. Suite identity stays entirely in auth (this is the line D-14 draws).

**Push payload policy (research open Q1 + Q3 → decided):**
- Self-hosted ntfy runs with `upstream-base-url=https://ntfy.sh` (reference mode) so the iOS app wakes via APNs; **only the message reference transits the public upstream**; content is fetched from the self-hosted server. *(Operator-posture, revisitable: an own-APNs-bridge is the purity upgrade if this ever feels wrong.)*
- Payload = `title` + kind tag + priority (per §3.2 map) + `X-Click` = the derived deep link. **The markdown `body` is never sent to ntfy** — detail lives behind the auth-gated Chat/MC UI. Nothing is ever published to a public `ntfy.sh` topic directly.
- The RESEARCH.md "Verify at build time" list (reference-mode precision, license, ACL flags, `upstream-base-url` matching) carries forward to Stage 4 unchanged.

**Exposure:** `chat_ntfy` joins `edge`; proxy routes `ntfy.<SUITE_DOMAIN>` **exempt from forward-auth** (device apps can't OIDC) — compensated by deny-all ACL + tokens + proxy rate limit; flagged as a deliberate exception in §12 and mirrored to the proxy's reconciliation list. Operator MAY instead scope this route LAN/VPN-only (posture choice at Stage 4).

**Web Push (research open Q2 → decided):** OUT of v1 — running both transports creates the double-notify problem for a single operator; ntfy covers phone + desktop clients. PWA/VAPID Web Push is the recorded v1.1 candidate if the operator drops the ntfy app.

**DEPLOYMENT §2 amendment (applied with this Stage-2, per D-10):** one `chat_ntfy` row added to `context/specs/DEPLOYMENT.md` §2 — justification: D-14 push sink, owner `chat`, sole publisher Chat, `edge` only, no host ports.

---

## 9. Retention policy — the CANONICAL feed (§6 register item)

- **Notifications, broadcasts, audit_log: retained indefinitely in v1.** The feed IS the delivered-notification audit record (ARCH §10: it exists nowhere else); at homelab scale (≈10³–10⁴ rows/month, ≤5 KB each) a decade fits in single-digit GB. Deletion machinery would be a new attack/failure surface with no payoff now.
- **Guard instead of prune:** a weekly size check; DB > 2 GB (operator-settable `CHAT_DB_SIZE_GUARD`) posts a `needs_review`-kind system notification recommending a ratified archival policy (archive = export old rows to a dated SQLite file in the backup set, then prune — machinery deliberately NOT built in v1; the guard firing forces the decision instead of silent drift).
- **Presentation windows are not retention:** the UI defaults to 90 days; the history API reaches everything.
- **`push_outbox` is operational state, not canonical** — rows > 30 days pruned.
- **Backup (mechanism + cadence, non-optional per ARCH §10):** nightly `VACUUM INTO chat_data/backups/chat-YYYYMMDD.sqlite3` (WAL-safe); keep 30 dailies + 12 monthlies locally; the backups directory joins the operator's existing off-box sync. ntfy tokens are env/config, not DB — restore needs no secret material.
- **Restore-consistency rule:** Chat restores standalone. Because every row is a pointer + stale-snapshot (target wins by design, §2), a Chat restored to T-1 breaks no cross-app invariant — worst case is re-showing acked items and losing ≤1 day of notification history. Escalations whose underlying condition persists re-fire from the agents (dedup keys collapse them). **Stage-7 exit: this restore is drilled, not asserted.**

---

## 10. UI surface (input to Stage 3 — screens/states enumerated, spec'd there)

1. **Feed** — live SSE list; filter chips (kind / min-priority / agent / ticket / unacked); escalations pinned while un-acked; per-row: kind badge, title, agent, age, repeat count, deep link (with "target wins" caption), ack button; batch-ack.
2. **Notification detail** — sanitized markdown body, envelope metadata, audit trail (posted/repeats/acked/push status), deep link.
3. **Broadcast** — composer (body, priority, expiry) + active-broadcast banner + history with revoke.
4. **Health strip** — SSE connected, push-sink status (last delivery / `gave_up` count), DB size vs guard, backup age.

Two-view split: everything above is operator-only; the agent surface is exactly the one MCP tool. Both sit on §3's API.

---

## 11. Abuse controls (idempotency, dedup, rate)

### 11.1 `op_id` (transport idempotency)
`UNIQUE(agent_id, op_id)` — a retry after a dropped stream returns the existing `{notification_id}`, never a duplicate row. Uniform with Board/auth semantics (IDENTIFIERS `op_id` row).

### 11.2 `dedup_key` (semantic collapse)
Same logical condition re-noticed (spinning-adjacent agent, hourly rescan re-finding the same issue) → same `dedup_key`. Collapse rule: unique among **un-acked** rows per agent (partial index, §1.1) — a replay bumps `repeat_count`/`last_seen_at` and returns the existing id; once the operator acks, the next occurrence is a fresh row (a condition that *returns after being seen* deserves new attention). Un-acked **escalation** repeats re-push at most every 15 min (bounded nag, not silence — §15.2).

### 11.3 Rate limits
Two independent layers: auth's per-`sub` budget middleware (inherited, §0) + Chat's own per-`sub` post ceiling (default 60/h; escalations additionally allowed up to 10/h even when the general ceiling is hit) → beyond it, posts are rejected 429-with-retry-after and ONE system-authored meta-notification ("agent X is rate-limited") is posted per agent per window. Dedup collapses identical spam; rate limits bound distinct-but-runaway spam; the meta-notification keeps the operator informed instead of silently dropping — escalation-is-default-failure-mode applied to Chat itself.

### 11.4 Body hygiene at ingest
Size caps (title 120 / body 4000 / tags 8), UTF-8 validation, and a **secret-pattern reject** (OpenBao/Vault token shapes `hvs.`/`hvb.`/`s.`, private-key PEM headers, JWT-shaped 3-dot base64url blobs) → 400 + audit row — defense-in-depth under the Vault contract's data-hygiene rule (`cred://` handles and `release_id`s are powerless and pass). Stored bodies are as-posted; sanitation is a render-time duty (§12).

---

## 12. Threat model outline (Stage-5 skeleton, Standard rigor)

| Axis | Threat | Control |
|---|---|---|
| Spoofing | agent posts as another agent | `agent_id` = validated token `sub`, never a parameter (closed by construction) |
| Spoofing | forged broadcast to operator | `chat:manage` operator-only; audit row |
| Injection | markdown/HTML XSS in body; remote-image tracking/exfil | render-time sanitizer (allowlist markdown → HTML, no raw HTML), **remote refs stripped** (strip, not proxy, in v1), strict CSP on the UI; bodies stored as-posted for audit |
| Injection (ARCH §12) | host-originated text in bodies as adversarial LLM input | Chat's feed is human-eyes-only: Chat feeds no model and no auto-approve lane; residual risk is *operator* phishing → deep links are template-derived only; body links render as dead text (non-clickable) in v1 |
| Phishing | agent-crafted deep link | free-form URLs structurally impossible (§6) |
| Secret leakage | credentials in bodies; content transiting public push infra | §11.4 ingest reject; push payload carries no body (§8); reference-mode upstream; writer-side rule binding all agents (Vault contract §1) |
| Flooding / DoS | spinning agent floods feed/push | dedup + dual rate limits + meta-notification (§11); SQLite WAL + tiny writes; request body cap |
| Replay | duplicate rows from retries | `op_id` uniqueness (§11.1) |
| Tamper / repudiation | edit/delete of the record | no UPDATE/DELETE surface on envelope content; append-only; nightly backups; `audit_log` for the mutating verbs |
| Second source of truth | ntfy cache or UI state diverging | ntfy never read back; feed reads only Chat SQLite; resolve mirror is single-direction MC→Chat, flagged as mirror |
| Edge exposure | un-forward-authed `ntfy.<SUITE_DOMAIN>` route | deny-all ACL + tokens + proxy rate-limit; LAN/VPN-only posture option; documented exception (§8) |
| Coordination side-channel | Chat becoming agent-readable | no agent read scope, no agent read tool, broadcast UI-only — asserted at Stage 7 ("no agent-to-agent path exists") |
| Availability | Chat down = escalations lost? | a posting agent getting 5xx falls back to its Board escalation path (`blocked` + reason) — the Board stays the durable coordination record; Chat is advisory *delivery*; SSE feed is the fallback for push-sink failure |

Kill-switch note: Chat is **not** in the kill chain (auth L1, Gateway L2). On a kill event, agent posts die with their tokens (2-min TTL + revocation SLO) while the operator keeps reading the feed. Recorded so Stage 5 doesn't invent a duty that isn't Chat's.

---

## 13. Config / deployment summary

- Container `chat`, internal 8080, `edge` only, no host ports; volume `chat_data` (DB + backups). Env (`CHAT_`-prefixed): `CHAT_DB_PATH`, `CHAT_NTFY_URL` (`http://chat_ntfy:80`), `CHAT_NTFY_TOKEN`, `CHAT_NTFY_TOPIC`, `CHAT_RATE_*`, `CHAT_DB_SIZE_GUARD`; suite-wide `SUITE_DOMAIN`, `AUTH_VERIFY_PORT=8089` consumed by name.
- Sidecar `chat_ntfy` per DEPLOYMENT §3a: owner chat, `edge` only, no host ports, proxied at `ntfy.<SUITE_DOMAIN>` (forward-auth-exempt route — §8), its own small cache volume (non-canonical).
- Boot: Chat depends only on proxy + auth; ntfy outage degrades push only.

## 14. Build sequencing (Stage 4 preview, API-first)

1. Core service: SQLite schema + notifications/ack/broadcast endpoints + SSE (one shared state).
2. RS baseline wiring (JWKS, aud, scopes, budgets, revocation, error semantics) — verified against auth's built endpoints.
3. MCP surface: `post_notification` over Streamable HTTP (pin SDK at the 2025-11-25 revision).
4. UI (from the Stage-3 spec).
5. `chat_ntfy` sidecar + outbox worker + the RESEARCH "verify at build" list.

---

## 15. Adversarial review of this plan (Stage-2 requirement) — attacks, resolutions, residuals

1. **"Indefinite retention is not a policy."** Attack: §9 dodges deletion. Resolution: it is a deliberate append-only-audit stance with a measured guard and a pre-named archival path; the guard firing forces a ratified decision instead of silent drift. **Accepted residual:** DB growth unbounded in principle until the guard fires.
2. **"Dedup can silence a live emergency."** Attack: un-acked collapse means escalation #2 on the same key makes no new row → operator saw one push at 3am and slept through the rest. Resolution: collapse bumps `repeat_count` and **re-pushes every ≤15 min while an escalation stays un-acked** — silence requires ack, and ack means "seen." **Accepted residual:** a *wrong* agent-authored `dedup_key` reused across genuinely different conditions hides the second; mitigation belongs to agent persona guidance (runtime/Board scope), noted for retro.
3. **"The ntfy route is an unauthenticated hole in the edge."** Attack: forward-auth-exempt subdomain. Resolution: deny-all ACL + per-device read token + Chat-only write token + proxy rate limit + the LAN/VPN posture option; the alternative (no mobile push) guts the app's purpose and D-14 already ratified ntfy. **Accepted residual:** ntfy CVEs sit ahead of suite auth on that route; pin + watch releases (Stage-4 list).
4. **"A reaped zombie agent can still post a `done` ping for a ticket it lost"** (fencing). Considered hard-reject (validate `fencing_token` against the Board at post time) — **rejected for v1**: it adds a Board hot-path dependency to the escalation channel and could suppress a real cry for help; `board-agents-claim.md` §3's reject-stale list targets side-effecting *work* surfaces (Board transitions, Notes writes, Gateway actions), and a Chat ping changes no state. Resolution: token stored verbatim + surfaced; the operator's click lands on the Board ticket where truth lives (target wins). **Flagged to Board Stage-2** to confirm Chat pings stay outside the fencing-checked set (§16).
5. **"Two `mc` deep-link rows are vapor."** Attack: a core feature depends on an unfrozen seam. Resolution: explicitly PENDING with a defined fallback and read-time derivation that makes the late freeze zero-migration; blocks Stage 7, not Stage 2.
6. **"SQLite under concurrent posts + SSE fan-out."** Resolution: WAL, single-writer discipline, tiny rows, one operator's read load — far inside SQLite's envelope; measured at Stage 6 under simulated multi-agent load per PROCESS.
7. **"Broadcast is a coordination side-channel waiting to happen."** Attack: someone later wires agents to poll `GET /api/broadcasts`. Resolution: the scope model forbids it structurally (agents hold only `chat:post`); Stage-7 checklist asserts no agent-readable surface exists; any future agent delivery goes via Board/MC and a new ratification.
8. **"Meta-notifications can loop"** (the rate-limit notice contributes to the flood). Resolution: meta-notifications are system-authored (not agent-attributed, not counted against any agent), capped at one per agent per window, never pushed above priority 3.

---

## 16. Open decisions & obligations flowing OUT of this plan

| Item | Owner / when |
|---|---|
| MC review-item URL scheme + resolve-event feed (seams #23/#24) → freeze `mc → chat` contract; Chat then fills §6 mc rows + builds the resolve subscriber | **MC Stage-2** (blocks Chat Stage-7, not Stage-2) |
| Board/Notes route confirmation for §6 templates (low-risk provisionals) | Board / Notes Stage-2 |
| Confirm Chat pings are outside the fencing reject-stale set (else Chat adds validation) | Board Stage-2 (§15.4) |
| auth ledger update: `chat:post` → `chat:post/read/manage` per §5 countersign | auth next session |
| Whether MC consumes `GET /api/broadcasts` (would promote `broadcast_id` into IDENTIFIERS) | MC Stage-2, optional |
| Tool-schema final freeze under the measured spike ceiling (currently provisional-within-ceiling) | after the gap-1.3 spike PASSES |
| Own-APNs-bridge upgrade; Web Push v1.1; archival machinery if the size guard fires | operator posture, post-v1 |

## 17. Stage-2 exit-criteria mapping

- **Data model specified** — §1 (DDL, mint rules, indexes).
- **Both surfaces specified over one shared state** — §3 (API), §4 (MCP, one tool), §10 (UI); MCP and UI are siblings over §3, neither downstream of the other.
- **Adversarial concerns resolved or explicitly accepted with reason** — §15 (8 attacks; residuals tagged).
- **§6 register items closed** — scopes reconciled + countersigned (§5), envelope variants unified (§1.1), retention policy stated (§9), ntfy DEPLOYMENT amendment applied (§8), MC URL dependency explicitly PENDING with fallback (§6).
