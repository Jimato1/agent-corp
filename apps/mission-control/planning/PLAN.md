# PLAN.md — Mission Control (`mc`) — Stage 2 (Planning)

> **Stage 2 — Planning** artifact for Mission Control. Risk class: **Standard**. Runtime identity is
> **`mc`** everywhere (compose service, DNS name, subdomain, auth audience — ratified D-3;
> `context/specs/DEPLOYMENT.md` §2 already carries the `mc` row). The directory stays
> `apps/mission-control/`.
>
> This plan INHERITS, and never restates as its own authority: `context/specs/TICKET_STATE_MACHINE.md`,
> `context/specs/IDENTIFIERS.md`, `context/specs/DEPLOYMENT.md`, `context/CONTRACTS/killswitch-chain.md`,
> `context/CONTRACTS/agent-runtime-mc-heartbeat.md`, `context/CONTRACTS/auth-apps-tokens-scopes.md`,
> `platform/proxy/docs/OBSERVABILITY.md`, and the 2026-07-02 ratifications (D-3, D-10, D-11, D-12-deferred,
> MC-btn). Where a number is deferred (D-12, gap-1.2), this plan **parameterizes** it and names the owner.
>
> Stage-1 basis: `research/RESEARCH.md` (SSE transport, API-Composition BFF, the §7 MC↔auth boundary with
> adversarial findings H1–H7 — all binding inputs here).

---

## 0. Identity and posture (one paragraph the whole plan hangs off)

MC is the **operator cockpit**: a read/aggregate + control surface over the whole suite. It is a thin
**BFF doing API composition** over the owning apps' APIs, plus an SSE fan-out to the operator's browser.
**MC owns almost no state**: every widget binds to exactly one upstream authority; every control action is
a call to the owning app's API under the operator's own authority; MC's cache is disposable and rebuildable.
The deliberate exceptions where MC durably owns data are enumerated in §3.2 — everything else is a
projection that may be blown away. MC is **Standard** class and must stay that way: nothing in this plan
gives MC's backend **or any MC-owned sidecar** a credential or authority whose compromise reaches a
destructive action (§5.3, §8a's log-collection privilege posture, §9-R2).

---

## 1. The four cockpit surfaces (what gets built)

### 1.1 Live agent view
One row per agent (from the runtime heartbeat stream): `agent_id`/`sub`, `session_id`, `claimed_ticket_id`,
liveness class, last-beat **age** (live delta, never a bare green dot), `step_seq` progress, model/persona
version, `drain_state`. Drill-in: recent progress trail + **spawn tree derived from Board ticket lineage**
(parent/child reads via Board API — NEVER from heartbeats; contract §2 puts spawn depth outside the frame).
A server-side **attention band** pins flagged agents: wedged, zombie (stale fencing token vs Board's current
generation), depth-vs-cap, consecutive-failure count, time-in-step. Secondary compact fleet grid.

### 1.2 WIP / budget monitors
Read-side: auth's four budget dimensions (rate/concurrency/cooldown/lifetime — never dollars) per `sub` +
recent trips, from auth's budget API; Board WIP caps (per-agent, global) and current claim counts, from
Board reads. Write-side (operator-only): budget clamp → **auth's** budget API; WIP cap change → **Board's**
WIP surface (Board's Stage-2 register already owes MC that endpoint). Loop-guard/spawn-depth: **Board
enforces at claim time (D-11); MC surfaces + auto-triages** — depth-vs-cap and runaway-chain flags render
in the attention band; MC never enforces and never writes lineage.

### 1.3 Global kill switch (relay + mirror, never an enforcer)
Per `killswitch-chain.md` §1 and ratified MC-btn — see §5 for the full mechanics. The cockpit keeps a
**kill button**; pressing it issues a best-effort authenticated POST to **auth's** raise-kill-epoch
endpoint under the **operator's own live session** (sender-constrained; MC holds no standing kill
credential). Any non-2xx/timeout → **"HALT NOT CONFIRMED"** rendered maximally loud + one-click deep-link
to auth's outage-surviving `safe_stopped` console. The halt **readout** is a read-mirror of auth's
epoch/level + Gateway-sourced L2, with mirror-age, degrading CONFIRMED → STALE-UNKNOWN past a freshness
bound. MC never mints, stores, or caches an authoritative "halted" boolean.

### 1.4 Unified review + approval queue
One inbox aggregating the two human gates from Board state: `awaiting_approval` (pre-execution;
operator-or-CMDB-tier to clear) and `needs_review` (post-work; **human-only** — including A1
`board_escalation` arrivals and A2 `breakglass_review_ticket` births). Each item carries the gate-type
discriminator, criticality tier, provenance taint (host-originated ⇒ auto-approve lane ineligible, ARCH §12
— rendered, not decided, by MC), the plan/trace behind the request, dedup key = `ticket_id` (a ticket is in
exactly one state at a time, so `ticket_id` uniquely names the **current** queue item — see §7.1),
ack-as-claim to stop re-nagging, saved filters, bulk triage, Alertmanager-style group/silence (silences are
MC-local display state, §3.2). **Gate-entry freshness rule (adversarial A10):** one ticket legally enters
the queue more than once (`awaiting_approval` then later `needs_review`; repeated `needs_review` after
rework), so ack/re-nag suppression is keyed on the **gate-entry instance** — `(ticket_id, gate, entry)` —
and every ack/claim mark is **cleared when Board polling observes the ticket leave and re-enter a gate
state**. A durable ack from a prior pass never mutes a fresh arrival.
Decisions write back through **Board's** API under the operator's own session (§5.3); MC renders
MC-requested vs owner-CONFIRMED distinctly.

---

## 2. Architecture (settled in Stage 1, planned here)

- **Transport:** SSE (`text/event-stream`) for all server→browser fan-out; discrete authenticated POSTs for
  actions; interval-polling fallback. HTTP/2 via the proxy; keep-alive comment < 60s; `id:` on every event;
  `Last-Event-ID` resume on MC's own feeds.
- **Aggregation:** API composition in the BFF. Pull-primary (short-TTL per-source cache); SSE push-through
  only for latency-critical liveness (runtime heartbeats in, kill-epoch/posture, ticket transitions, queue
  deltas). **No suite event bus.**
- **Honesty discipline (every aggregated tile):** `source: <app>` + as-of stamp; on source failure the tile
  goes **STALE-UNKNOWN loudly** (never zero, never green, never a stale value presented as fresh); derived
  totals reconcile or show `? N unaccounted`; a missing source looks missing.
- **Ingest connections:**
  - agent-runtime → MC: one SSE consumer per runtime instance (frozen contract; MC is display-only over it).
  - Board: poll ticket/queue/lineage reads (SSE subscription if Board offers one — raised dependency §9-R1).
  - auth: kill-epoch/halt-status + budgets (poll + whatever push auth offers; epoch is also readable
    Redis-independently from JWKS/AS-metadata — used only as mirror corroboration, never as a second authority).
  - Gateway: audit-chain HEAD pushes inbound (§6.3); execution state reads for the queue's "executing" context.
  - proxy: `mc_prometheus` scrapes `proxy:9100/metrics` + `/edge-info`; `mc_logship` collects container
    stdout into `mc_logstore`, which the BFF tails (§6.5).

---

## 3. Data model (SQLite, `mc_data` volume — one DB, two honesty classes)

### 3.1 Disposable projections (rebuildable; may be dropped at any time; never backed up as truth)
| Table | Content | Rebuilt from |
|---|---|---|
| `agent_view` | latest per-agent heartbeat frame + derived liveness class + phi-accrual state | runtime SSE (re-fills in one beat interval) |
| `fleet_view` | latest fleet frame per runtime instance (roster denominator, dead-man state) | runtime SSE |
| `ticket_view` | ticket cache: id, state (11-state superset), tier, taint, lineage edges, ceremony phase | Board reads |
| `queue_view` | the unified queue projection (+ ack/claim marks joined from `operator_state`) | Board reads |
| `budget_view` | auth budget consumption/headroom/trips; Board WIP counts | auth + Board reads |
| `posture_view` | kill epoch/level, L1/L2 status, per-source mirror-age | auth reads (+ Gateway via auth) |

Edge metrics/logs live in the sidecars (`mc_prometheus` TSDB, `mc_logstore`), not in SQLite — both are
declared rebuildable/expirable (retention params §8).

### 3.2 Durable MC-owned stores (the ONLY state MC actually owns)
| Table | Class | Why MC owns it | Backup |
|---|---|---|---|
| `audit_anchor` | **CANONICAL, append-only** | seam #25 receive-and-retain: Gateway audit-chain HEADs anchored OFF the Gateway host; MC's copy is the independent tamper-evidence anchor | nightly copy into the suite backup job; restore rule §3.3 |
| `resolve_log` | durable operational (NOT canonical) | the resolve-event feed's replay buffer (`resolve_seq` cursor for Chat) | same job; loss degrades to re-sync, never corrupts (Chat re-derives at read time) |
| `guardrail_params` | durable config | D-12-deferred suppression thresholds + phi params + progress budgets, **operator-set, no hardcoded numbers** (§4.3) | same job |
| `operator_state` | durable convenience | silences, saved filters, ack/claim marks (gate-entry-keyed, §1.4), UI prefs | same job |
| `mc_audit` | **CANONICAL, append-only** | MC's own state-change audit (Standard-class duty): config edits, silences, every relay/action REQUEST MC issued with outcome — the request-side record (e.g. a kill press that never reached auth) exists nowhere else (ARCH §10 test) | same job |

### 3.3 Restore-consistency rule (stated per ARCH §10)
`audit_anchor` restores must never present a restored (older) HEAD as latest. **Gaps and regressions are
distinct cases (adversarial A11):**
- **Gap** (live seq > retained tip + 1) is the *guaranteed-common* case — every restore from a nightly
  copy, and any MC downtime spanning ≥1 HEAD push, produces one. `RESYNC-PENDING` clears via **Gateway
  backfill**, not via impossible seq-continuity: on (re)connect MC advertises its last retained
  `(chain_id, seq)` and the Gateway re-pushes all retained HEADs above it (producer ask raised in §9-R3;
  MC's `(chain_id, seq)` idempotency makes re-push safe). HEADs unrecoverable after Gateway-side retention
  expiry are a **permanent, alarmed hole** in the anchor series — recorded as such, never papered over.
- **Regression/fork** (incoming seq/hash conflicts with retained) is the tamper-class alarm, surfaced for
  the operator to resolve against the Gateway's own chain (the Gateway remains canonical; MC's copy is the
  anchor, not the truth).

All 3.1 projections are dropped on restore and rebuilt live. `resolve_log` restores keep `resolve_seq`
monotonic (never reissue a lower seq): on restore, MC bumps the seq epoch (§7.2 `reset` semantics cover
subscribers). `mc_audit` restores append an explicit **gap record** (the chain is never presented as
complete after a restore). Restored `guardrail_params` re-enter a labeled **RESTORED — re-confirm** state
until the operator re-confirms them (a silent revert of suppression thresholds must not change §4.2 triage
behavior undetectably).

---

## 4. The liveness engine (implements `agent-runtime-mc-heartbeat.md` §4 verbatim)

### 4.1 Classification (per-agent)
- **wedged** ⇔ `process_alive_ts` fresh ∧ `work_progress_ts`/`step_seq` stale past that role's
  **progress budget** (a `guardrail_params` row per role — minutes-scale, set after gap-1.2; never a fleet
  constant). Until those budgets exist, wedged **classification** is dark (contract forbids a fleet-constant
  default) — the interim compensating signal is an unthresholded **"longest since progress"** attention-band
  sort over raw `work_progress_ts` age, explicitly labeled *not wedged-classified* (residual §12-A12).
- **crashed** ⇔ both stale, suspicion via **phi-accrual** (threshold φ default 8, `noisy_net_phi` 12 —
  parameters, not constants).
- **drained / quiesced** ⇔ reported `drain_state`; expected silence — never flagged dead.
- **`DRAINED` is a distinct terminal report, never inferred from silence.** `QUIESCED_BY_OUTAGE` renders as
  its own posture (inferred absence ≠ commanded drain), and the kill-switch mirror must agree with the
  runtime-reported state before MC displays a coherent "suite halted" story; disagreement renders as
  disagreement.
- **zombie** ⇔ heartbeat bears a `fencing_token` older than Board's current generation for that resource
  (Board read) — the Board already reaped and reissued; render as zombie, never as healthy.

### 4.2 Correlated-loss suppression + population gate (mandatory, §6-register item)
If the fraction of agents crossing the suspicion threshold within one window exceeds
`suppress_fraction` (operator-set, guidance 30–50%) of the **roster denominator from the fleet frame**,
MC suppresses per-agent death display and raises a single **`FLEET_LIVENESS_ANOMALY`**, then cross-checks
(a) the supervisor dead-man fleet frame, (b) auth health, (c) edge health (`mc_prometheus`) before
declaring anything dead. MC never mass-declares death on a synchronized cliff. The anomaly banner always
names what is suppressed (`N agents suspect — display suppressed pending fleet check`) — suppression hides
the flood, never the fact of the flood.

### 4.3 D-12 is DEFERRED — parameterization contract
`suppress_fraction`, `suppress_window`, phi thresholds, and per-role progress budgets live in
`guardrail_params` with **no compiled-in values**; ship with UNSET → conservative bootstrap defaults
labeled **"PRE-SIZING DEFAULT"** in the UI until the operator sets them post-gap-1.2. The Board reaper
adopts the same population gate once set (D-12 note) — the *values* will be shared via operator
configuration, not via an MC→Board API (no new enforcement seam).

---

## 5. The kill-switch boundary (relay, mirror, hand-off — `killswitch-chain.md` §1 implemented)

### 5.1 The button (trigger, best-effort)
`POST /api/killswitch/raise` (operator UI only) → MC forwards to **auth's trigger endpoint, whose shape is
CLOSED (R8, `auth-apps-tokens-scopes.md` §10 / `killswitch-chain.md` §6): level-addressed
`POST /admin/killswitch {level, issued_by, reason}`** — callers (the MC button included) request a
**level** and never supply an epoch; auth, the sole epoch writer, mints `epoch := current + 1`
write-before-ack, so raise-to-at-least-N holds **by construction**. The request also carries the
caller-minted **`op_id`** (IDENTIFIERS.md row; auth's same-`op_id` replay-collapse is pinned additive
Stage-5 wiring — the endpoint is already effect-idempotent without it). Constraints, binding:
- **Sender-constrained to the operator's live session** (DPoP/passkey per auth SETTLED #7); MC's backend
  holds **no standing kill/approve credential**; the request resolves at auth to a human principal with the
  kill scope. `mc:kill-switch` is operator-only Tier-2 (countersign, §6.4). **The relay preserves
  sender-constraint end-to-end:** the frontend's sender-bound proof targets auth's actual endpoint URI and
  MC's backend passes token+proof through untouched (or the call goes browser-direct to auth, mirroring
  §5.3) — verified at JC-4; MC never re-signs.
- **Fail-loud:** any non-2xx/timeout ⇒ full-viewport **"HALT NOT CONFIRMED — go to auth console"** +
  one-click deep-link to `safe_stopped` (H1). The UI states plainly: *the canonical outage-surviving control
  is auth's console; MC's button is trustworthy only while auth is healthy.* (Whether the button is a
  button or a hold-to-fire control is Stage-3; its existence is ratified MC-btn.)
- Double-fire safe today via auth's server-side monotonic mint + effect-idempotent replay (same level);
  MC additionally debounces client-side and sends `op_id`.
- Every press → `mc_audit` row (request-side); auth's ledger remains the safety-control record (MC never
  writes auth's ledger; auth logs what it receives — this resolves Stage-1 open Q6).

### 5.2 The mirror (read-only, honest)
Halt posture derives **exclusively** from auth's epoch/halt-status (H6: the edge `403`-no-`authz` spike is
a separate anomaly signal, never combined into the halt readout). **L2-CONFIRMED = auth's direct Gateway
read ONLY (H5/R9 CLOSED, `auth-apps-tokens-scopes.md` §10):** any value whose provenance is an MC relay
renders **at most STALE-UNKNOWN with mirror-age, never CONFIRMED — regardless of freshness**. CONFIRMED is
displayable only when the mirrored auth readout itself carries direct-Gateway provenance, and even then it
degrades to STALE-UNKNOWN past `posture_freshness_bound` (param). MC never upgrades PENDING on its own.
`STALE-UNKNOWN` is maximally loud and presents the auth-console deep-link as the primary next action
(H7 — single-operator trap).

### 5.3 The same discipline on approvals (H2 — confused-deputy closed)
Queue decisions (`awaiting_approval → approved/cancelled`, `needs_review → done/todo`) are written to
**Board** under the operator's own sender-constrained session. **Recommended mechanism: browser-direct** —
the MC UI calls Board's API from the operator's browser (Board CORS-allowlists the `mc` origin; raised
dependency §9-R1), so no approve-capable credential ever transits or rests in MC's backend, which therefore
cannot mint, replay, or batch approvals. Fallback if browser-direct fails at build: MC-proxied pass-through
that forwards only the operator's sender-bound proof, never a token MC holds. Either way: **MC holds no
standing `approve` scope** — this is a Stage-5 red-team assertion.

---

## 6. API surface — one shared state, two views (+ the frozen producer contract)

All human/UI routes live behind the proxy's forward-auth on `mc.<SUITE_DOMAIN>`; MC is an OAuth2 RS per
`auth-apps-tokens-scopes.md` §1 (local JWKS validation, `aud == mc`, RFC 9728 metadata, §5.6 error
semantics verbatim, per-tool budget middleware, `auth:revocations` subscription; agent TTL 2 min etc. —
§2 numbers inherited, never re-derived).

### 6.1 Read API (BFF, backs both the UI and any read-only consumer)
```
GET /api/fleet                  agent roster + liveness (+ ?filter=)
GET /api/agents/{sub}           drill-in: trail, spawn tree (Board lineage), flags
GET /api/queue                  unified review+approval queue (gate, tier, taint, age)
GET /api/queue/{ticket_id}      one item: plan/trace refs, approval binding, history
GET /api/posture                kill mirror: epoch, level, L1/L2, mirror-age, staleness
GET /api/budgets                auth four-dimension view + trips; Board WIP view
GET /api/edge                   edge panel aggregates (PromQL via mc_prometheus, §6.5)
GET /api/anchors                Gateway audit-chain HEAD series + continuity status
GET /api/events                 SSE multiplex for MC's own UI (event: liveness|queue|posture|budget|anomaly)
```
**Every MC read endpoint is display-advisory:** never an input to any authorization, enforcement, or
liveness decision by another service (the resolve-feed fence generalized — this matters most for
`/api/posture`, which no consumer may ever condition behavior on; epoch truth reaches every RS from auth
directly). `mc:read` grants are made per-consumer with a stated purpose, not as a blanket scope.

### 6.2 Action relays (operator-only; every one = a call to the owning app under the operator's session)
```
POST /api/killswitch/raise      → auth raise-kill-epoch (§5.1)   [scope mc:kill-switch, step-up]
POST /api/budgets/clamp         → auth budget API                 [operator]
POST /api/wip                   → Board WIP-cap surface           [operator]
(queue decisions: browser-direct to Board — deliberately NOT an MC route; §5.3)
POST /api/silences, /api/filters, /api/params   MC-local operator state (mc:admin; audited)
```

### 6.3 Inbound producer endpoints (service principals)
```
POST /api/anchors               Gateway pushes signed audit-chain HEADs (seam #25).
                                MC duties: append-only retain; verify per-chain monotonic seq;
                                alarm on regression/fork/gap; never validate chain internals
                                (the Gateway's chain is canonical; MC's copy is the anchor).
                                Payload shape freezes at Gateway Stage-2 (producer side);
                                MC pre-commits: accept-and-retain is additive, idempotent by
                                (chain_id, seq), and requires a dedicated narrow scope (§6.4 ask).
GET  /api/events/resolve        the FROZEN resolve-event feed for Chat (§7.2)   [scope mc:read]
```

### 6.4 MCP surface (thin by design — research-decided) + scope countersign
MCP Streamable HTTP, spec rev **2025-11-25** (suite pin), mounted on the same service, audience `mc`.
Tools are **flat, low-arity, enum-biased** (D-17 schema-complexity ceiling):

| Tool | Params (scalars only) | Effect | Scope |
|---|---|---|---|
| `report_status` | `op_id, ticket_id?, status_note (≤500 chars)` | advisory breadcrumb on the agent's row; display-only | `mc:report` |
| `request_escalation` | `op_id, ticket_id?, severity ∈ {attention, urgent}, reason (≤500 chars)` | creates a pinned attention item (dedup by `sub`+`ticket_id`); **never mutates Board state** — Board escalation stays `in_progress → blocked` on Board | `mc:escalate` |

**Countersign of auth's offered slice** (`auth-apps-tokens-scopes.md` §3, `mc` row):
`mc:report` ⇄ {report_status} · `mc:escalate` ⇄ {request_escalation} · `mc:kill-switch` ⇄ REST
`POST /api/killswitch/raise` only, **operator-only Tier-2, never agent-mintable** · `mc:admin` ⇄ MC-local
config/silences/params REST, operator-only. Action-class manifest (auth §1 duty): report/escalate =
write-benign; admin = write-benign (audited); kill relay = sod-critical (live-check path).
**NEW ASKS for auth's next session** (svc:drive precedent): (a) `mc:read` — read-only feed/queue scope;
grant to **svc:chat** covering `/api/events/resolve` **AND `GET /api/queue` (+ `/api/queue/{ticket_id}`)**
— the contract's `event: reset` recovery path re-syncs from the queue read, so a feed-only grant would
break the frozen recovery procedure exactly when it runs; (b) `mc:anchor` — append-only anchor-push scope;
grant to **svc:gateway** for `POST /api/anchors`. MC runs degraded until granted (resolve feed 403s → Chat
keeps its fallback links; anchors unaccepted → seam #25 stays pending at Gateway Stage-2 anyway).

### 6.5 Edge panel (consumes the frozen proxy contract verbatim)
Implements OBSERVABILITY.md §5/§6 with **R10 honored**: per-app status distribution sourced from the
**`{code}`-labelled** `caddy_http_request_duration_seconds_count` series (never the doc's
`caddy_http_responses_total` erratum); rate from `caddy_http_requests_total`; p50/p95 via
`histogram_quantile(..., sum by (le) (rate(..._bucket[5m])))`; upstream health from
`caddy_reverse_proxy_upstreams_healthy`; forward-auth allow/deny/redirect/fail-closed from the §3 log
mapping joined with per-subdomain status metrics; `scrub_stripped` rate; cert expiry from `mc_blackbox`'s
`probe_ssl_earliest_cert_expiry`. First build ships **edge-local `edge_req_id` filtering only** (the
traceparent join is the Stage-7 joint checkpoint). VERIFY-AT-BUILD: per-subdomain slicing via
`server`/`handler` labels vs the log `app` field.

---

## 7. FROZEN at this Stage-2: the MC → Chat producer contract (seam #23 + #24)

Published as **`context/CONTRACTS/mc-chat-review-resolve.md`** alongside this plan (that file is the
authority; summarized here). Chat's §6 deep-link rows and resolve-subscriber unblock on it.

### 7.1 Review-item URL scheme (FROZEN)
- **MC mints NO new identifier.** The review-item identity IS the `ticket_id` (a ticket occupies exactly
  one state, so `ticket_id` uniquely names the queue item; the gate is derivable). This resolves the
  IDENTIFIERS.md pending-mint note in the recommended direction — no new registry row.
- Canonical URLs (stable, additive-only):
  - `https://mc.<SUITE_DOMAIN>/review/<ticket_id>` — the queue item (any gate). After clearance it renders
    the resolution record (never a 404 for a ticket MC can resolve via Board; unknown → "not in queue" +
    Board link).
  - `https://mc.<SUITE_DOMAIN>/review` — the queue root (Chat's generic fallback upgrades to this).
  - `https://mc.<SUITE_DOMAIN>/ticket/<ticket_id>` — alias → 302 to `/review/<ticket_id>` (fills Chat's
    `mc|ticket` row).
  - `https://mc.<SUITE_DOMAIN>/agents/<sub>` — agent drill-in (available to any deep-linker; not required
    by Chat).
- `ticket_id` appears verbatim (URL-encoded), never parsed by consumers.

### 7.2 Resolve-event feed (FROZEN shape)
`GET /api/events/resolve` — SSE, scope `mc:read`, `Last-Event-ID` = `resolve_seq` (MC-internal monotonic
cursor; contract-scoped, added to IDENTIFIERS.md's deliberately-NOT-registered list — it is a replay
cursor, not a cross-app ID). One event per queue-item resolution MC observes on the Board:

```
event: resolve
id: <resolve_seq>
data: {"schema_version":1, "ticket_id":"T-000123",
       "gate":"awaiting_approval"|"needs_review",
       "outcome":"approved"|"rejected"|"review_cleared"|"reworked",
       "actor_kind":"operator"|"cmdb_tier_policy",
       "resolved_at":"<RFC3339>",
       "review_url":"https://mc.<SUITE_DOMAIN>/review/T-000123"}
```
- Outcome ⇄ state-machine mapping (authoritative spec: TICKET_STATE_MACHINE.md §2): `approved` =
  `awaiting_approval → approved`; `rejected` = `awaiting_approval → cancelled`; `review_cleared` =
  `needs_review → done`; `reworked` = `needs_review → todo`. Additive-only enum.
- **Advisory, at-least-once, MC-observed** — the Board remains the state authority; Chat renders
  read-time-derived truth on click (its own rule: "if summary and target disagree, the target wins").
- Replay: bounded retention (`resolve_retention` param, default 7 days / 10k events). A too-old cursor gets
  `event: reset` → subscriber re-syncs from `GET /api/queue` and resumes from the live tip.
- Change rule: fields additive-only; semantics change only by amending the contract doc with both sessions
  citing it.

---

## 8. Parameters (all operator-settable in `guardrail_params`; nothing below is compiled in)

| Param | Governs | Default until sized |
|---|---|---|
| `suppress_fraction`, `suppress_window` | §4.2 population gate | **UNSET → D-12 pending**; bootstrap 40% / 60s labeled PRE-SIZING |
| `phi_threshold`, `noisy_net_phi` | crash suspicion | 8 / 12 (contract guidance) |
| `progress_budget[role]` | wedged detection | UNSET → per-role after gap-1.2 |
| `posture_freshness_bound` | CONFIRMED→STALE-UNKNOWN | 15s (mirror honesty; tighten post-JC-4) |
| `source_ttl[app]` | composition cache | 5–30s per source |
| `resolve_retention` | §7.2 replay buffer | 7d / 10k |
| `edge_retention`, `log_retention` | sidecar TSDB/log store | 15d / 7d |

## 8a. Deployment (lands as DEPLOYMENT.md §2 amendment rows at this Stage-2, per D-10/§3a)

`mc` (8080, `edge`) + four MC-owned sidecars, `<owner>_<function>`, no host ports:
`mc_prometheus` (scrapes `proxy:9100`; `edge`), `mc_blackbox` (TLS probe; `edge`),
`mc_logship` (container-stdout collector; recommend Vector — VERIFY-AT-BUILD) and `mc_logstore`
(log store the BFF tails; recommend a single-binary store, Loki-class, chosen at build), both on `edge`;
`mc_logstore` keeps its own named volume per the DEPLOYMENT §5 convention. MC's SQLite lives in `mc_data`.

**Log-collection privilege posture (adversarial A9 — binding on Stage 4):** `mc_logship` gets **read-only
log access and nothing more** — a read-only bind-mount of the host's container-log directory or journald
(or a socket-proxy with a logs-only allowlist). **Mounting the raw Docker socket is forbidden**: docker.sock
is host-root-equivalent reach over every container including gateway and vault, which would silently void
the SoD invariant and the `creds`-network segmentation from inside a Standard-class app's sidecar. The §0
no-authority claim covers the sidecars under exactly this posture; Stage-5 verifies it.

---

## 9. Dependencies raised / consumed (the seam ledger for this plan)

- **R1 → Board Stage-2 (raised):** (a) ticket/queue/lineage read surface MC composes over —
  **transition-bearing** (from/to state, since-cursor or SSE; the resolve feed's outcome fidelity leans on
  it) and **carrying the current fencing generation (`lock_generation`) per locked resource** (the §4.1
  zombie flag's comparison baseline — without it the heartbeat contract's zombie semantics are
  unimplementable); (b) the WIP-cap write surface (already in Board's §6 register); (c) CORS-allowlist the
  `mc` origin for browser-direct operator decisions (§5.3). MC runs degraded (poll-only, decisions via
  Board's own UI link) until present.
- **R2 → auth next session (raised):** `mc:read` (covering feed + queue reads, §6.4) + `mc:anchor` scopes
  and the svc:chat / svc:gateway grants. *(R8/R9 confirmation is NOT asked — both CLOSED by auth's
  countersign session, `auth-apps-tokens-scopes.md` §10; §5 cites the closed shapes as consumed.)*
- **R3 ← Gateway Stage-2 (consumed, pending) + one producer ask:** the audit-HEAD push payload (seam #25);
  MC's §6.3 pre-commitments are the consumer half, additive on arrival. **Ask (A11):** on (re)connect the
  Gateway re-pushes all retained HEADs above MC's advertised last `(chain_id, seq)` — backfill is what
  clears a benign gap (§3.3); MC's idempotency makes it safe. Recorded in `context/CONTRACTS/README.md`.
- **R4 ← auth PLAN §7 + `auth-apps-tokens-scopes.md` §10 (consumed):** the level-addressed
  `POST /admin/killswitch` trigger — exact path/schema pinned at build against auth's published endpoint,
  never invented.
- **R5 ← gap-1.2 sizing (consumed):** D-12 numbers, progress budgets, heartbeat display thresholds (§8).
- **R6 → Chat (produced, FROZEN):** `mc-chat-review-resolve.md` (§7). Chat Stage-7 unblocks.
- **R7 → Chat (dispositioned):** MC **declines the broadcast-consumption seam for v1** (Chat PLAN §16's
  "MC Stage-2, optional" item): `GET /api/broadcasts` gets no MC consumer, `broadcast_id` is NOT promoted
  into IDENTIFIERS; revisit only via a new frozen seam.

## 10. Sequencing (Stage-4 preview, API-first: core → MCP → UI)

1. RS skeleton (JWKS, aud=mc, budgets middleware, revocation sub) + health; SQLite schema (§3).
2. Board composition reads → `ticket_view`/`queue_view` + the 11-state superset rendering (§11).
3. Runtime SSE ingest → liveness engine (§4) with params UNSET-safe.
4. Resolve feed + review URLs (§7 goes live; contract satisfied).
5. Kill mirror + relay + fail-loud hand-off (§5) — JC-4 joint checkpoint items listed for Stage 7.
6. Budgets/WIP composition + clamp relays; loop-guard surfacing from Board lineage.
7. `POST /api/anchors` receive-and-retain (§6.3).
8. MCP surface (§6.4) — after the API it wraps exists.
9. Sidecars + edge panel (§6.5).
10. UI (Stage-3 spec) over the finished API.

## 11. Ticket-state superset rendering (spec conformance, not reinterpretation)

MC renders **exactly** the TICKET_STATE_MACHINE.md §1 state set — `todo, in_progress, awaiting_approval,
approved, executing, verifying, needs_review, blocked, done, failed, cancelled` — plus per-transition
authority as UI affordance gating: operator actions appear only where §2 names the operator
(`awaiting_approval → approved/cancelled`, `approved → cancelled`, `needs_review → done/todo`,
`verifying → failed`, `todo/blocked → cancelled`, and **`blocked → todo`** — the escalation-release action,
offered on blocked/escalation items in the queue and attention band via the §5.3 write path; without it the
operator who resolves an escalation in the cockpit could only cancel, never release — adversarial A10a).
`failed` vs `cancelled` render distinctly (world-touched
vs untouched). A1 `board_escalation` arrivals carry their machine reason; A2 breakglass tickets render
their born-in-`needs_review` provenance. Ceremony phase (from Board's `ceremony_events` projection) renders
as an orthogonal badge; MC never reads Notes frontmatter for phase (CF-D).

---

## 12. Adversarial review (Stage-2 requirement) — attacks, resolutions, residuals

Run 2026-07-02 as a 6-lens ultracode critic pass (kill-switch/SoD, contract conformance,
second-source-of-truth, failure modes, Chat-consumer fit, completeness) with every serious finding
independently adversarially re-verified: **30 findings raised → 4 CONFIRMED (A9–A12, all fixed in this
revision), 11 refuted on verification, 14 low-severity observations triaged (the actionable ones folded
into §1.4, §3.2–3.3, §4.1, §5.1–5.2, §6.1, §6.4, §8a, §9, §12-A6).** A1–A8 were the draft's own
pre-review attack set, re-examined by the pass:

| # | Attack | Disposition |
|---|---|---|
| A1 | *Browser-direct Board writes (§5.3) silently re-introduce an MC-proxied fallback that becomes the norm, recreating the confused deputy.* | **Resolved in plan:** fallback is named, constrained (sender-bound proof only, no MC-held token), and flagged as a Stage-5 red-team assertion either way; browser-direct remains the recommended primary and R1(c) makes it buildable. |
| A2 | *`resolve_log`/anchors make MC a second source of truth by the back door.* | **Resolved:** resolve feed is declared advisory/at-least-once with read-time re-derivation on the consumer (§7.2); anchors are a retained *copy* whose truth stays with the Gateway (§3.3, §6.3); neither is ever read back into any authority's decision path. |
| A3 | *Suppression (§4.2) can hide a real mass-kill: an attacker who can wedge >40% of agents silences per-agent alarms.* | **Accepted with mitigation:** suppression suppresses *display flood*, never the anomaly itself — `FLEET_LIVENESS_ANOMALY` is maximally loud, names the suppressed count, and cross-checks are automatic; residual risk recorded for Stage-5. |
| A4 | *PRE-SIZING defaults (§8) are hardcoded numbers wearing a costume — D-12 says defer.* | **Resolved:** defaults are labeled, UNSET-distinct, and the UI nags until the operator sets them; no component *enforces* on them (display/triage only). D-12's enforcement half (Board reaper) takes values from operator config, not from MC. |
| A5 | *The kill button's Idempotency-Key + raise-to-at-least-N shape is auth's to define (R8 unverified) — MC could bake in a wrong call.* | **Resolved:** §5.1/§9-R4 pin the shape to auth's PLAN + R8 verification as a named build dependency; MC's side is a thin relay whose request shape is finalized at build against auth's published endpoint, and JC-4 verifies end-to-end. |
| A6 | *SSE mid-stream revocation: a revoked operator session keeps receiving `/api/events` until reconnect.* | **Resolved (mechanism corrected by the critic pass):** keep-alives bound nothing — stream termination binds to the **`auth:revocations` subscription** MC runs anyway (§6 preamble): on a revocation matching a connected principal, MC closes that principal's streams; epoch bump ⇒ mass-terminate stays the coarse path. Residual exposure ≤ revocation propagation SLO (p99 <1s) + processing, for read-only data. Verified at Stage-5/JC-4. |
| A7 | *Zombie detection needs Board's current fencing generation — polling it per-heartbeat hammers the Board.* | **Resolved:** generation is read with the lineage/ticket poll (one composition read, cached `source_ttl[board]`); zombie flag latency = poll interval, acceptable for a display-only signal (Board's reaper is the enforcer). |
| A8 | *`request_escalation` lets any agent spam the operator's attention band (denial-of-attention).* | **Resolved:** dedup by (`sub`,`ticket_id`), per-sub budget middleware (auth §1 duty) rate-caps it, and the band groups by source; silences apply. Residual noted for Stage-5 authz tests. |

**CONFIRMED by the verification pass (all fixed in this revision):**

| # | Confirmed finding | Fix applied |
|---|---|---|
| A9 | *`mc_logship`'s collection mechanism was an unexamined privilege grant — the recommended tool's default (docker.sock) is host-root-equivalent reach over every container incl. gateway/vault, in direct tension with §0's no-authority claim; DEPLOYMENT §3a constrains only networks/ports, so nothing else catches it.* | §8a now binds the posture: read-only log-dir/journald mount or logs-only socket-proxy; **raw docker.sock forbidden**; §0's claim extended to sidecars; Stage-5 verifies. |
| A10 | *"ticket_id IS the queue-item identity" is only instantaneously true — one ticket legally enters the queue multiple times (both gates; rework loop), so a durable ack keyed on bare `ticket_id` silently mutes a later arrival of a human-only gate.* | §1.4 gate-entry freshness rule: ack/re-nag keyed on `(ticket_id, gate, entry)`; marks cleared on observed gate re-entry; contract §2 clarified (latest resolution + gate history). |
| A10a | *§11's operator-affordance list omitted `blocked → todo` — the operator who resolves an escalation in the cockpit could cancel but never release the ticket.* | Added to §11 + the queue/attention-band action set, via the §5.3 write path. |
| A11 | *`audit_anchor`'s restore rule was incoherent for the guaranteed-common gap case (every restore/downtime makes seq-continuity unverifiable forever) and no backfill ask was raised to the Gateway — HEADs pushed while MC was down stayed permanently unanchored.* | §3.3 splits gap (clears via Gateway backfill; retention-expired holes are permanent, alarmed, recorded) from regression/fork (tamper alarm); §9-R3 + CONTRACTS/README now carry the reconnect re-push-since-`(chain_id, seq)` producer ask. |
| A12 | *Wedged detection — the suite's headline never-terminating signal — ships completely inert until gap-1.2 delivers per-role progress budgets (a fleet-constant default is contract-forbidden), and this dark window went unnamed.* | Named here as an accepted residual; §4.1 adds the interim compensating signal (unthresholded "longest since progress" sort, labeled not-wedged-classified); gap-1.2 budgets are §10-step-3's entry dependency for real classification. |

Residual-risk register (accepted, with reasons): A3 (mitigated display-suppression trade-off — the
alternative, no suppression, is strictly worse per contract §4); A12's dark window until gap-1.2 (interim
signal in place; no threshold is permitted before sizing); the R3 pending producer shape (additive on
arrival; MC pre-commitments + the backfill ask keep it non-blocking); resolve-feed completeness is scoped
to "MC-observed" by the frozen contract (downtime gaps are honest gaps — Chat's read-time derivation keeps
it never-wrong, per contract §3).

## 13. How the Stage-2 exit criteria are met

- **"Data model and both surfaces (MCP + UI) are specified over one shared state":** §3 (one SQLite +
  declared projections), §6.1–6.4 (one API; the UI in §1/§10 and the MCP tools in §6.4 are siblings over
  it — neither is downstream of the other).
- **"Adversarial concerns resolved or explicitly accepted with reason":** §12 (attacks, each resolved or
  accepted with the reason stated; residual register named for Stage-5).
- Register obligations discharged: suppression+population gate (§4.2, D-12 parameterized §4.3/§8); review-
  item URL scheme + resolve feed FROZEN (§7 + the contract file); Gateway audit-HEAD receive-and-retain
  planned (§3.2/§6.3); full ticket-state superset (§11); D-10 sidecars amended into DEPLOYMENT §2 (§8a);
  `mc` naming used throughout (D-3); kill-switch = relay-not-enforcer (§5); loop-guard surface-not-enforce
  (D-11, §1.2); edge panel with R10 erratum honored (§6.5); scope slice countersigned + new asks named (§6.4).

**STOP — Stage-2 ends here. No code. Stage 3 (UI/UX) owns `ui/UI_SPEC.md`; Stage 4 builds.**
