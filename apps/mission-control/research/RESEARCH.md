# RESEARCH.md — Mission Control (Stage 1)

> **Stage 1 — Research** artifact for `mission-control` (MC). Risk class: **Standard**.
> Per `context/PROCESS.md`, this document delivers the **feature landscape**, **cited
> integration facts**, **open design questions**, and a **researched recommendation for every
> decision deferred to MC's research phase**. It designs nothing and writes no code — it ends at
> the Stage-1 exit criteria. Method: 6 parallel web-grounded research threads + 1 adversarial
> red-team pass on the central MC↔auth boundary. Every external fact carries a source URL;
> every repo fact carries a path. Where a statement is our judgement rather than a cited fact it
> is labelled **[recommendation]**.

MC is **the manager's cockpit** — the single live console a human operator drives over the whole
suite of continuously-running local AI agents (`apps/mission-control/CLAUDE.md`). It is a
**read/aggregate + control surface, never a second source of truth**: each app owns its state
behind its own API/MCP surface; MC observes and triggers.

---

## 0. Executive summary — the decisions this research settles

1. **MC is a Grafana-shaped aggregator/BFF, not a data owner.** Every widget binds to exactly
   one upstream app API; MC persists no canonical work state, only a disposable rebuildable cache.
2. **Real-time transport = SSE** (server→client fan-out), with control actions as discrete
   authenticated POSTs and interval-polling as the degraded fallback. WebSocket buys MC nothing today.
3. **Aggregation = API Composition inside a BFF** + a short-TTL disposable materialized-view cache
   with source-provenance and honest staleness. Pull-primary; push (SSE) only for latency-critical
   liveness (heartbeats, kill-epoch, ticket-state).
4. **The Edge panel consumes the proxy's frozen `:9100` contract as-is** (`platform/proxy/docs/OBSERVABILITY.md`),
   via a small MC-owned Prometheus scraper + log-store tail. No proxy change.
5. **MC↔auth division of labor (the central decision): auth is the SINGLE enforcement point; MC
   surfaces + triggers + read-mirrors.** MC's kill button is a **best-effort relay** to auth's
   kill-epoch endpoint that **fails LOUD and hard-hands-off to auth's outage-surviving console** —
   it is *not* a second switch. This holds on the happy path **and** the degraded path once the six
   adversarial holes in §7.4 are honored.

---

## 1. Feature landscape — comparable operator consoles

MC has three lineages of prior art: **observability dashboards**, **incident-command / on-call
UIs**, and **agent/workflow-orchestration control planes**. The convergent patterns:

| Pattern | Where it's proven | What MC takes |
|---|---|---|
| **Single-pane-of-glass that stores nothing** | Grafana connects to datasources; each panel = query + viz; it does not store metrics/logs/traces itself. [grafana] | The core stance: MC panels bind to upstream APIs; MC owns no canonical state. Validates "two views, one state." |
| **Filterable run list → drill-in → relationship tree** | Temporal Web UI (executions table filterable by status; detail with History, Workers, Pending Activities, parent/child Relationships). [temporal-ui] LangSmith renders each trace as a clickable node/step tree. [langsmith] | The **live agent view** idiom: one row per agent → drill into current step + a **spawn/relationship tree** that *is* the loop-guard visualization. |
| **Graded stop verbs (graceful vs forceful)** | Temporal exposes **Cancel** (graceful, finishes cleanly) vs **Terminate** ("resembles killing a process"). [temporal-interrupt] Prefect **Cancel/Suspend/Resume**. [prefect-cancel] Airflow **pause = let in-flight finish, hold what hasn't started**. [airflow-ui] | MC needs **two levers, not one**: an everyday graceful **drain/WIP-throttle** *and* the emergency forceful **kill switch**. Conflating them is a design smell the incumbents avoid. |
| **Dense at-a-glance grid** | Airflow Grid View: runs = columns, tasks = colour-coded state squares. [airflow-ui] Ray Dashboard node→worker→task hierarchy with live utilization. [ray] | A secondary compact **fleet grid** for many-agents-at-once; the primary is the list. |
| **Worker-pool concurrency = limit vs consumption vs headroom** | Prefect Work Pools govern concurrency at the pool level. [prefect-cancel] Ray cluster view shows utilization. [ray] | The **WIP/budget monitor**: static cap vs live consumption vs headroom, per-agent and global. |
| **"What needs a human right now" queue** | PagerDuty incident list: Status/Urgency/Priority/Assignee columns, checkbox bulk actions; **acknowledge = claim + halt the escalation clock**. [pagerduty-incidents] | The **unified review+approval queue** blueprint; "ack = claim so it stops re-nagging." |
| **One inbox aggregating heterogeneous sources with a typed reason** | GitHub Notifications inbox: machine-readable `reason:` per item, saved filters, multi-select bulk triage. [gh-inbox] | Each queue item carries a **gate-type discriminator** (`awaiting_approval` vs `needs_review`); saved filters; bulk triage. The reason tag is what merges sources without flattening meaning. |
| **Noise reduction as a first-class feature** | Alertmanager **deduplicates, groups, silences, and inhibits** (mute downstream while the root cause fires). [alertmanager] PagerDuty dedup_key collapses duplicates into one incident. [pagerduty-alerts] | Essential for a **single operator** against a fleet whose failure mode is confident-garbage/alert-storms: group by epic/ceremony/host, silence accepted conditions, inhibit downstream-of-root-cause. |
| **Pre-execution human gate with prevent-self-review** | GitHub Actions protected Environments **pause a job until reviewers approve**, notify out-of-band, and enforce **"prevent self-review."** [gh-environments] LangGraph `interrupt()` pauses at a checkpoint and resumes with a decision payload. [langgraph] | The **propose→approve→execute** mechanics *and* the external proof that "agent cannot self-approve" (segregation of duties) is a standard, enforceable toggle. Approval cards must carry the **trace/reasoning** that led to the request, not a bare yes/no. |
| **Gate action without owning the object; authority re-checks independently** | Argo CD: operator clicks **Sync**, but Argo RBAC independently rejects it if the role is missing; sync-window shown red/orange/green. [argocd] | MC is the button; **the owning app re-checks authority**. Even a spoofed MC action is refused downstream (auth scope / proxy 403 / Gateway). |
| **Honest liveness via last-heartbeat age** | Temporal Activity Heartbeats: no heartbeat within the timeout ⇒ activity failed; "zombie" = alive but not progressing. [temporal-heartbeat] Kubernetes Leases: kubelet renews `renewTime` ~10s, control plane uses a ~40s timeout to flip NotReady. [k8s-leases] | Show last-heartbeat **age as a live delta**, not a binary green dot; derive liveness by comparing age to a threshold. "Zombie" ⇒ the "never-terminating" failure mode made visible. |
| **Deterministic external loop guards** | Consensus: the LLM cannot reliably decide it's done; break loops with `max_iterations`/`max_execution_time`, action-hash cycle detection, no-progress monitors — enforced **in code outside the model**. [loops] Temporal auto-flags workflows with 5 consecutive failures. [temporal-ui] | Surface iteration-vs-cap, spawn-depth-vs-cap, no-progress/repetition flag, time-in-step; **auto-triage** flagged agents into a pinned "needs-attention" band. |

**Takeaway [recommendation]:** MC is *Grafana for agents* — a single pane that renders and
triggers, backed by PagerDuty/GitHub-Notifications queue mechanics and Temporal/Ray liveness idioms.
It reuses, and must not duplicate, the operator surfaces **auth already shipped** (see §7).

---

## 2. The four cockpit surfaces (grounded in ARCHITECTURE §4/§5)

### 2.1 Live agent view — "who is running, on what, right now"
- **Shape [recommendation]:** filterable **roster list** (one row/agent: identity, claimed ticket,
  current step, elapsed, iteration/spawn counts) as primary → **drill-in** to current step + recent
  trace + a **parent/child spawn tree** (Temporal Relationships / Ray node→worker→task). Secondary
  compact **colour-coded grid** for many-agent glance. The spawn tree *is* the loop-guard view —
  depth is a visual property, not just a counter.
- **Liveness [recommendation]:** heartbeat-with-progress-payload (Temporal + K8s-Lease model) —
  each agent emits identity, claimed ticket, current step, iteration count, spawn depth; MC shows
  **last-heartbeat age** and derives liveness vs a timeout. **Never a bare green dot.** Treat
  "alive but not progressing" (zombie) as first-class, distinct from "unreachable."
- **Attention triage [recommendation]:** compute derived signals **server-side** (iteration-vs-cap,
  spawn-depth-vs-cap, no-progress/repetition flag, consecutive-failure count, time-in-step) and
  **pin flagged agents to the top**. Single-operator scale makes an auto-triaged band essential.

### 2.2 WIP / budget monitors
- Model on **work-pool concurrency** (Prefect) + cluster utilization (Ray): show static cap vs live
  consumption vs headroom, per-agent and global, for auth's **four budget dimensions
  (rate / concurrency / cooldown / lifetime)** plus fleet busy/idle. **Budgets are
  compute/time/concurrency + cooldowns — never dollars** (ARCHITECTURE §2/§5). Reuse auth's existing
  budget schema and "recent trips" list rather than inventing a parallel model (`platform/auth/ui/build/MANIFEST.md`).
- **Ownership caveat (from adversarial §7.4):** token/identity budgets are auth-enforced, MC
  monitors; **loop-guard/spawn-depth guardrails are a *lineage* property that is NOT one of auth's
  four token dimensions** and has no owner under a naive "auth owns all budgets" split — see §7.4/H3.

### 2.3 Global kill switch
- The control lives in MC but **physically bites downstream at the Gateway chokepoint** and is
  enforced by **auth's signed kill-epoch/revocation** that the proxy forward-auth reads as a
  `403`-no-`authz` (`context/ARCHITECTURE.md` §5; `platform/proxy/docs/OBSERVABILITY.md` §3). This
  is the **single most important boundary** and is settled in §7.

### 2.4 Unified review + approval queue
- **MC-owned aggregation** of the two human gates into one inbox (ARCHITECTURE §3):
  - **Pre-execution approval** (`awaiting_approval`, propose→approve→execute) — for
    destructive/irreversible types; may be cleared by operator **or auto-cleared by CMDB tier policy**.
  - **Post-work review** (`needs_review`) — for produced artifacts; **human-only** to clear.
- **Merge-but-don't-conflate [recommendation]:** every item carries a **gate-type discriminator**
  (GitHub `reason:` idiom [gh-inbox]); dedup by a stable key (`ticket-id + gate-type`) so a runaway
  agent can't flood the one inbox (PagerDuty dedup [pagerduty-alerts]); prioritize by criticality
  tier; support saved filters + bulk triage; "claim/ack" stops re-nagging. Approval cards carry the
  **trace/reasoning** (LangGraph interrupt context [langgraph]). MC **writes the decision back
  through the owning app's API** — the Board stays canonical for approval state. See the SoD
  hazard in §7.4/H2.

---

## 3. Real-time transport — **SSE** (deferred decision: resolved)

**Recommendation: SSE (`EventSource` / `text/event-stream`) is the default transport for all MC
live fan-out** (agent heartbeats/status, ticket-lifecycle changes, WIP/budget counters, Edge-panel
metric/log tail). Control actions stay **discrete authenticated HTTP POSTs**; **interval polling** is
the explicit degraded fallback. **WebSocket is not adopted** (reserved only for a future genuinely
bidirectional need — none exists).

Cited rationale:
- MC traffic is overwhelmingly **server→client fan-out**; SSE is a one-way channel that
  **auto-reconnects by default** and runs over ordinary HTTP with no upgrade. [mdn-sse]
- SSE has **built-in gap-free resume**: `id:` per event ⇒ browser sends `Last-Event-ID` on
  reconnect. WebSocket documents **no** automatic reconnect/resume — MC would hand-roll reconnect,
  ping-pong, and backfill. [mdn-ws]
- The classic SSE weakness (6-connections-per-origin on HTTP/1.1) is **removed by HTTP/2 multiplexing**
  (default ~100 streams). [mdn-sse] MC already sits behind Caddy serving **HTTP/2** on app subdomains
  (`platform/proxy/docs/OBSERVABILITY.md` logs `"proto":"HTTP/2.0"`).
- Caddy **auto-detects `text/event-stream` and flushes immediately (no buffering)**. [caddy-reverse-proxy]
  The proxy Caddyfile **deliberately leaves the `write` timeout unset** with a comment that it "would
  kill SSE/chat long-lived streams" (`platform/proxy/conf/Caddyfile`). The edge was engineered for this.
- Server-tunable reconnect via `retry:`; format/`Last-Event-ID` semantics are in the WHATWG spec.
  [whatwg-sse] A `<60s` keep-alive comment keeps the stream under Caddy's 2-minute `idle` timeout.
- **SoD-safe:** SSE is read-only, so it can never become a second write path; control actions as
  discrete POSTs give clean per-action authz/audit/idempotency and preserve "two views, one state."

Open items → Planning/Stage-7: one-stream-per-feed vs multiplexed-with-`event:`-discriminator;
replay ring-buffer depth; **how a long-lived SSE stream interacts with per-request forward-auth**
(expected: mid-stream revocation/expiry ⇒ reconnect hits forward-auth ⇒ `403`; verify in the JC-4
joint checkpoint with auth/proxy).

---

## 4. Aggregation architecture — read without becoming a second source of truth (deferred decision: resolved)

**Recommendation: API Composition inside a Mission-Control BFF, backed by a short-TTL disposable
materialized-view cache; pull-primary with SSE push only for latency-critical liveness.**

- **API Composition** [api-composition]: a thin MC aggregation service fans out **parallel read-only
  calls** to each owning app's existing API (board tickets/claims, notes review queue, drive
  artifacts, chat feed, gateway execution state, auth budgets/identities) and joins in memory. At
  homelab scale (~20 hosts, low-dozens of agents, one operator) the pattern's only drawback
  (large in-memory joins) does not bite — so it beats full CQRS.
- **BFF** [bff-newman][bff-azure]: MC's backend *is* a Backend-for-Frontend — "one backend per user
  experience," holding no domain data, leveraging downstream services. This legitimizes a thin MC
  aggregation service while each app stays system-of-record.
- **Disposable materialized-view cache** [mv-azure]: any cache MC keeps is "completely disposable
  because it can be entirely rebuilt from the source data stores… never updated directly… a
  specialized cache." This is the *formal guarantee* of "never a second source of truth." Azure warns
  the view "might not always be fully consistent," which **forces** the honesty UI below.
- **Honesty discipline [recommendation], reusing auth's shipped primitives** (`platform/auth/ui/build/MANIFEST.md`):
  every aggregated tile shows **`source: <app>`**, an **as-of/TTL staleness** stamp, and
  **`STALE-UNKNOWN`** on failure; derived totals must **reconcile or visibly flag `? N unaccounted`**;
  a missing source must **look missing, not read as zero/healthy**.
- **Pull vs push [recommendation]:** pull each app's read API on demand + short-TTL cache for the
  point-in-time grid; **subscribe (SSE)** only for signals that can't wait for a poll — heartbeats,
  ticket-state transitions, and especially **kill-epoch/halt posture** — modeled as a CQRS read-side
  projection MC keeps eventually-consistent from events it does not own. [cqrs-azure] **Do not stand
  up a suite-wide canonical event bus/Kafka** — that would be a second authoritative stream.
- **Write boundary [recommendation]:** MC issues **every** state change (approve/reject, WIP/budget
  clamp, kill/halt) by **calling the owning app's API** — never by writing another app's store or
  treating its own cache as authoritative. Actuation is delegated-and-confirmed: show **MC-requested**
  distinctly from **owner-CONFIRMED**. This preserves the four-holder segregation property — a
  compromised MC can *request* but cannot *fake a destructive-action-completed state*.

The proxy already proves this exact pull-based, read-only, downstream-auth shape in-repo
(`platform/proxy/docs/OBSERVABILITY.md` §4/§6: "MC = the authenticated, gated reader/renderer").

---

## 5. Consuming the proxy Edge contract — MC's "Edge" panel

The proxy is a **pure emitter** with a **frozen, additive-only consumer contract** MC implements
without any proxy change (`platform/proxy/docs/OBSERVABILITY.md`). MC **does not re-derive widget
design — it implements §5/§6**.

- **Ingest points:** scrape `proxy:9100/metrics` (+ `/edge-info`, `/healthz`) over the internal
  **`edge` Docker network** (MC's scraper container must be on it); tail the sanitized **JSON access
  logs** from a **log store** (a shipper collecting Docker stdout — operator/MC infra per §7, *not*
  the proxy directly). `:9100` is internal-only by construction; **do not authenticate to it** — auth
  is enforced downstream at MC's own gated subdomain (§4).
- **Metrics MC binds to** (verified against Caddy docs [caddy-metrics]): `caddy_http_requests_total{server,handler}`;
  `caddy_http_request_duration_seconds{server,handler,code,method}` (histogram — `_bucket/_sum/_count`);
  `caddy_http_requests_in_flight`; `caddy_reverse_proxy_upstreams_healthy{upstream}` (0/1). **p50/p95
  are computed server-side in the query engine**, not by the proxy:
  `histogram_quantile(0.95, sum by (le) (rate(caddy_http_request_duration_seconds_bucket[5m])))` —
  `le` must be in the `by` clause (cumulative buckets). [prom-histograms] Request rate =
  `rate(caddy_http_requests_total[5m])`.
  ⇒ **MC needs a small query layer** (embedded/sidecar Prometheus or Prometheus-compatible TSDB),
  not a stateless `/metrics` text parse. **[recommendation]**
- **Forward-auth breakdown = a JOIN**, not metrics alone (§3/§5): `authz:"allow"` is **present-only-on-allow**
  in the *logs* (no distinguishing metric label), so MC buckets by subdomain from **log-derived
  `authz` counts + `scrub_stripped` rate** joined with **per-subdomain status-class metrics**.
  Mapping: `allow` = `authz` present; `401`+no-`authz` = deny-unauthenticated; `302` = redirect-to-login;
  **`403`+no-`authz` = deny-refused/posture (kill-switch / break-glass / zero-scope)**; `502/504` =
  **fail-closed** (auth unreachable/hung — the leading indicator auth is degrading).
- **`VERIFY-AT-BUILD` [recommendation]:** OBSERVABILITY §5 references `caddy_http_responses_total{code}`,
  which **current Caddy docs do not list** [caddy-metrics] — source per-status distribution from the
  `{code}`-labelled duration/size series instead, and confirm how **per-subdomain slicing** maps to
  the `server`/`handler` labels (Caddy request counters carry no `host` label) vs the log's `app`
  field. A wrong field = empty widget, not a security hole (matches proxy §7 posture).
- **Documented gaps MC inherits (§7):** **cert-expiry is not a native Caddy metric** — deploy a tiny
  `blackbox_exporter` TLS-probe sidecar on the edge network and read `probe_ssl_earliest_cert_expiry`
  (`days = (expiry - time())/86400`), mode-agnostic for INTERNAL/PUBLIC certs [promlabs-tls]; Caddy
  admin `:2019 /pki` is a fallback. The **`edge_req_id ↔ auth traceparent` join is a Stage-7 joint
  checkpoint** requiring real auth — the first Edge-panel build ships **edge-local `edge_req_id`
  filtering only**, not end-to-end trace join.
- **Complement, don't duplicate auth [recommendation]:** the `403`-no-`authz` spike MC surfaces is the
  **edge-side echo** of auth's kill-epoch/break-glass — MC **cross-links** to auth's halt-status board
  rather than re-implementing it, and reuses auth's visual grammar (state = colour+icon+text).

---

## 6. Where MC does NOT start from zero (repo reality)

- **`apps/mission-control/ui/UI_SPEC.md`** currently reads "not started" — Stage 3 will populate it
  from this research.
- **auth already shipped a full static operator console** (`platform/auth/ui/build/MANIFEST.md`):
  halt-control (press-and-hold G1/G2 kill-epoch actuator), an **honest halt-status board**
  (L1-APPLIED vs L2-Gateway-CONFIRMED, mirror-age, never-a-false-CONFIRMED, a triad that always sums),
  break-glass (typed-intent + WebAuthn), identities/roles-scopes (immutable SoD ConflictSet), budgets
  (four dimensions, never dollars), audit timeline (Markdown + signed JSONL), and a **`safe_stopped`
  outage-surviving STOP** surface. **These are the surfaces MC must reference/re-surface, not fork.**
  This is the crux of §7.

---

## 7. THE central decision — MC ↔ auth division of labor

### 7.1 The problem
MC's CLAUDE.md assigns MC "the global kill switch," the unified review+approval queue, and WIP/budget
controls. **auth has already built** an operator console with a kill switch, break-glass, identity/
budget management, and audit (`platform/auth/CLAUDE.md`, `platform/auth/ui/build/MANIFEST.md`). Left
unresolved, this yields **two kill affordances that can disagree about system posture — the worst
possible failure for a safety control.** This section settles it.

### 7.2 The principle (well-grounded, affirmed by the red-team)
**auth is the SINGLE enforcement point; MC surfaces + triggers + read-mirrors.** Enforcement already
has exactly one home: auth raises the **signed kill-epoch / revocation** (auth SETTLED #2: hybrid
tokens with a **live revocation check on the kill switch and ALL SoD-critical paths**), and the
**proxy forward-auth (`403`)** + **Gateway chokepoint** are the enforcement points. Cited pattern support:
- **NIST SP 800-207 Zero Trust:** a single Policy Decision Point (the "brain") decides; distributed
  Policy Enforcement Points enforce in the traffic path. [nist-zt-1][nist-zt-2] ⇒ **auth = PDP;
  proxy + Gateway = PEPs; MC = neither** — a console that *requests* a decision.
- **Control-plane/data-plane:** the control plane is the single source of truth pushing config to
  enforcing proxies; blending planes "creates fertile ground for subtle security gaps." [control-plane]
- **BFF:** a UI-facing layer must **delegate** cross-cutting concerns like authorization to the
  authority's API, not reimplement them. [bff-azure][bff-newman]
- The proxy doc already models MC as "the authenticated, gated **reader/renderer**" of an authoritative
  emitter — the exact posture to extend to auth. (`OBSERVABILITY.md` §4/§6)

**Divergence-by-two-writers is structurally closed:** enforcement state (kill-epoch/denylist) has
**exactly one writer — auth.** MC's button is a *request* to that writer; MC's display is a *read* of
that writer's state. MC can be **stale but never contradictory** — it renders auth's L1/L2 truth with
mirror-age and shows `STALE-UNKNOWN`, never a fabricated CONFIRMED/CLEAR.

### 7.3 The division, capability by capability

| Capability | Owner (enforces) | MC's role |
|---|---|---|
| **Global kill / halt** | **auth** (raises signed kill-epoch; proxy `403` + Gateway bite) | **Best-effort relay** to auth's raise-kill-epoch endpoint + **read-mirror** of auth's L1/L2 halt-status; **fail-loud + hard hand-off** on auth-down (§7.4/H1). |
| **Break-glass, identity, roles/scopes, key attestation** | **auth** (Critical-infra; immutable ConflictSet, SETTLED #5) | **Deep-link only**; at most a read-only badge (e.g. "SOFT-KEY NO-GO: N principals") linking into auth. Never re-implement. |
| **Token/identity budgets** (rate/concurrency/cooldown/lifetime) | **auth** | **Monitor** consumption/headroom/trips; an operator throttle **calls auth's budget API** (idempotent). |
| **Loop-guard / spawn-depth guardrails** | **UNRESOLVED — Board-lineage, NOT auth** (§7.4/H3) | Open decision: MC-over-Board vs Board enforces + MC surfaces. |
| **Unified review + approval queue** | **MC-owned aggregation**; Board canonical for ticket approval state | Aggregate + render both gates; **write decisions back through each app's API**; MC holds **no standing `approve` credential** (§7.4/H2). |
| **Audit ledger** (identity/token/kill/break-glass) | **auth** (append-only, Markdown + signed JSONL) | May show a cross-app **operational** activity view + deep-link into auth's canonical timeline; **never fork/mirror-as-writer** the safety-control ledger. |

### 7.4 Adversarial findings — the boundary survives the happy path; these are the degraded-path fixes
The red-team's verdict: *the single-enforcement-point thesis is correct and divergence-by-two-writers is
genuinely closed, but the boundary as first drafted was engineered only for the happy path.* Six holes,
each now folded into the recommendation. **These are binding inputs to Stage 2/3/5, not trivia.**

- **H1 — AUTH-DOWN DEAD-BUTTON (high).** MC's relay button is **deadest exactly when the operator most
  needs it** (auth degrading), yet the outage-surviving panic control lives in **auth's own
  `safe_stopped.html`** (Redis-independent raise-epoch, no HW key). Muscle memory sends the panic
  operator to MC, whose button then no-ops/spins. **Fix:** spec MC's kill affordance as
  **best-effort-relay with mandatory LOUD-FAIL + HARD HAND-OFF** — on any non-2xx/timeout, show
  **"HALT NOT CONFIRMED — go to auth console"** and one-click deep-link into auth's offline STOP. State
  plainly: **the canonical outage-surviving control is auth's console; MC's button is trustworthy only
  while auth is healthy.** (Elevate "should MC carry a button at all vs a prominent deep-link" to a
  **Stage-3 decision**, not an open question.)
- **H2 — CONFUSED-DEPUTY APPROVAL LEAK (high).** Approving `awaiting_approval` unblocks the Gateway
  execution chain; MC is **Standard** class. If MC holds a standing `approve` credential or the approve
  action isn't sender-constrained to the operator's live session, **compromising MC becomes a route to
  destructive action through the lowest-rigor component.** **Fix (Stage-5 red-team item):** **MC MUST
  NOT hold any standing `approve` scope/credential**; every approve/reject is **sender-constrained
  (DPoP/passkey, auth SETTLED #7)** to the operator's own live session and resolves at auth to a human
  principal with `approve` — MC is a pass-through UI that cannot mint or replay an approval.
- **H3 — LOOP-GUARD ENFORCEMENT HAS NO OWNER (high).** MC's CLAUDE.md lists loop guards (cap spawn
  depth, flag runaway chains) as **mechanics-to-build** with a Stage-7 DoD, but spawn-depth is a
  **lineage property of the ticket/child graph** — **not** one of auth's four token-budget dimensions
  and **not** visible at the proxy edge. Under "auth owns all budgets," loop guards have **no enforcer**.
  **Fix:** split budgets into (a) **token/identity budgets** = auth-enforced, MC monitors; (b)
  **deliberation/lineage guardrails** (spawn-depth cap, runaway-chain flag, follow-up cooldown) =
  enforced against **Board lineage** — **owner (Board vs MC-over-Board) is an explicit open decision**,
  not settled. Do **not** claim auth owns the whole budget surface.
- **H4 — RFC 7009 MIS-APPLIED TO THE GLOBAL HALT (medium).** RFC 7009's idempotency is **per-token
  only** [rfc7009]; it does **not** cover a system-wide **kill-epoch**. Modeling halt as
  "increment epoch" means a double-click/two-tab fire **bumps the epoch twice**, forking the per-RS
  epoch-freshness the honesty board depends on. **Fix:** model the raise-kill-epoch endpoint as a
  **monotonic "raise-to-at-least-N"** (naturally idempotent, converges) carrying an **`Idempotency-Key`**
  [idempotency-key]; keep per-token revocation (RFC 7009) as a **separate** targeted-kill call.
- **H5 — REVERSE-DIRECTION MIRROR TRUST (medium).** auth's own halt board lists an L2 source as
  **"source: Gateway/MC mirror"** (`MANIFEST.md`) — so **MC can be a transport link inside auth's
  canonical CONFIRMED chain**, contradicting "MC is purely downstream." A stale/compromised MC mirror
  could surface a false CONFIRMED in auth's board. **Fix:** the **Gateway's own confirmation is the sole
  source for L2-CONFIRMED**; where MC is merely transport, its mirror **must carry mirror-age and
  degrade CONFIRMED→STALE-UNKNOWN past a freshness bound**, never upgrading PENDING on its own; **prefer
  auth reading the Gateway directly** over an MC-relayed mirror. Make this a joint Gateway/auth/MC
  honesty contract.
- **H6 — EDGE-SIGNAL FALSE POSITIVE (medium).** `403`-no-`authz` means kill **OR** break-glass **OR**
  **zero-scope** (`OBSERVABILITY.md` §3) — a single misconfigured zero-scope agent produces a `403`
  spike with **no halt in effect**. **Fix:** MC's **authoritative halt posture derives EXCLUSIVELY from
  auth's epoch/halt-status state**; the proxy `403` spike is at most a **secondary anomaly indicator**
  (attack/outage/scope-drift) shown as **its own signal**, never combined into or substituted for the
  halt readout.
- **H7 — SINGLE-OPERATOR STALE-UNKNOWN TRAP (low).** With one operator (two-person control deliberately
  removed, auth SETTLED #5), nobody else catches the moment MC goes `STALE-UNKNOWN`. **Fix:** make
  `STALE-UNKNOWN` **maximally loud** (not a quiet grey badge) and have it **present the auth-console
  deep-link as the primary next action**, actively routing the lone operator to the surviving control.

---

## 8. Deferred-decision recommendations (Stage-1 exit criteria driver)

| # | Decision (deferred to MC research) | Recommendation | Confidence |
|---|---|---|---|
| D1 | **MC's framing vs the apps it watches** | Grafana-style aggregator/BFF; owns no canonical state; disposable rebuildable cache with honest staleness. (§1, §4) | High |
| D2 | **Real-time transport** | **SSE** for fan-out; discrete POSTs for control; polling as degraded fallback; not WebSocket. (§3) | High |
| D3 | **Aggregation pattern** | **API Composition inside a BFF** + short-TTL disposable materialized-view cache; pull-primary, SSE push only for latency-critical liveness; no canonical event bus. (§4) | High |
| D4 | **Edge-panel construction** | Small MC-owned Prometheus scraper on the `edge` network + log-store tail; implement OBSERVABILITY §3/§5/§6 verbatim; `blackbox_exporter` for cert-expiry; `VERIFY-AT-BUILD` the `responses_total`/per-subdomain-label items. (§5) | High |
| D5 | **Kill-switch ownership (MC↔auth)** | **auth = single enforcement point; MC = best-effort relay + read-mirror**, fail-loud + hard hand-off to auth's outage-surviving console. (§7.2–7.4) | High |
| D6 | **Approval/review queue ownership** | **MC-owned aggregation**, decisions written back through owning-app APIs; **MC holds no standing `approve` credential**; every approval sender-constrained to the operator's live session. (§2.4, §7.4/H2) | High |
| D7 | **Budget/loop-guard ownership** | **Split:** token budgets auth-enforced (MC monitors); **loop-guard/spawn-depth = Board-lineage, owner TBD (Board vs MC-over-Board)**. (§7.4/H3) | Medium |
| D8 | **Liveness model** | Heartbeat-with-progress-payload; last-heartbeat **age** not a green dot; zombie ≠ unreachable; server-side attention triage. (§2.1) | High |
| D9 | **Queue noise control** | Alertmanager-style group/silence/inhibit + PagerDuty dedup + ack-as-claim. (§1, §2.4) | Medium |
| D10 | **Live-view shape** | Filterable list → drill-in → spawn tree (primary) + compact grid (secondary); spawn tree = loop-guard viz. (§2.1) | High |

---

## 9. Open questions for the operator (require a human call, carried into Stage 2/3)

1. **[Stage-3, elevated from open] Does MC carry a kill *button* at all, or only a prominent
   *deep-link* into auth's console?** Recommendation: a **trigger-only relay that fails loud**, but a
   single physical home for the panic control (auth) may be preferable to avoid muscle-memory
   ambiguity (§7.4/H1). Operator's call.
2. **[Stage-2] Loop-guard/spawn-depth enforcement owner:** Board enforces + MC surfaces, or MC enforces
   against aggregated Board lineage? (§7.4/H3) This is the one budget seam this research leaves open.
3. **[Stage-2] Exact auth API shape** MC calls for halt/revocation + budget-clamp (paths, schema,
   `Idempotency-Key` support, monotonic raise-epoch vs RFC 7009 revoke) — lives in `platform/auth/planning/PLAN.md`
   §8; co-verify at **JC-4** (kill-switch 403 + break-glass verify mode).
4. **[Stage-2/3] SSO session continuity:** are auth console screens addressable by stable URLs on
   `auth.<SUITE_DOMAIN>` behind the shared forward-auth session so MC's deep-links don't re-challenge
   the operator?
5. **[Stage-4/6] Concrete thresholds & infra:** heartbeat interval + stale timeout; iteration/spawn
   caps + no-progress window; per-source cache TTLs; whether MC runs its own embedded Prometheus vs a
   suite-wide store; log shipper/retention choice.
6. **[Stage-2] Does an MC-initiated throttle count as an auditable safety-control event** that must land
   in **auth's** ledger rather than MC's operational view?
7. **[Stage-7] Long-lived SSE × per-request forward-auth:** confirm mid-stream revocation/expiry
   terminates cleanly and reconnects to a `403` (JC-4 territory).

---

## 10. Stage-1 exit-criteria conformance

`PROCESS.md` Stage-1 exit criteria — **met**:

- **"Every deferred decision relevant to this app has a researched recommendation."** — §8 gives a
  recommendation (with confidence) for D1–D10, covering the two decisions ARCHITECTURE explicitly
  deferred to MC (real-time transport, aggregation-without-becoming-a-second-source-of-truth) **plus**
  the MC-specific overlaps (the MC↔auth kill-switch/queue/budget boundary) the prompt required. The
  genuinely operator-gated calls are surfaced in §9 rather than pre-decided.
- **"All external-system facts are cited, not assumed."** — Every external claim carries a source URL
  (§11); every repo fact carries a path. Version/behavior claims that need first-boot confirmation are
  tagged **`VERIFY-AT-BUILD`** (§5) rather than asserted.
- **Feature landscape** (§1–§2), **integration facts with sources** (§3–§5, §11), and **open design
  questions** (§9) are all present.
- **Scope discipline:** no design and no code produced (Stage 2 owns the data model/API/plan; Stage 3
  owns `ui/UI_SPEC.md`). The central MC↔auth boundary was **adversarially reviewed** (§7.4) — exceeding
  Standard-tier expectations because the overlap touches a Critical-infra safety control.

**STOP — Stage-1 exit criteria met. Do not proceed to Stage 2 (Planning) without operator sign-off on §9.**

---

## 11. Sources

**External (web-verified):**
- [grafana] Grafana panels/visualizations — https://grafana.com/docs/grafana/latest/panels-visualizations/
- [temporal-ui] Temporal Web UI — https://docs.temporal.io/web-ui
- [temporal-interrupt] Temporal interrupt (cancel vs terminate) — https://docs.temporal.io/evaluate/development-production-features/interrupt-workflow
- [temporal-heartbeat] Temporal activity heartbeats / failure detection — https://docs.temporal.io/encyclopedia/detecting-activity-failures
- [airflow-ui] Apache Airflow UI (Grid View, pausing) — https://airflow.apache.org/docs/apache-airflow/stable/ui.html
- [ray] Ray Dashboard / observability — https://docs.ray.io/en/latest/ray-observability/getting-started.html
- [prefect-cancel] Prefect cancel/suspend + work pools — https://docs.prefect.io/v3/develop/cancel
- [pagerduty-incidents] PagerDuty incidents queue — https://support.pagerduty.com/main/docs/incidents
- [pagerduty-alerts] PagerDuty alerts / dedup / grouping — https://support.pagerduty.com/main/docs/alerts
- [alertmanager] Prometheus Alertmanager (group/silence/inhibit) — https://prometheus.io/docs/alerting/latest/alertmanager/
- [langgraph] LangGraph interrupts (human-in-the-loop) — https://docs.langchain.com/oss/python/langgraph/interrupts
- [langsmith] LangSmith trace tree (via LangGraph docs above)
- [lens] Kubernetes Dashboard / Lens workloads view — https://www.mirantis.com/blog/simplify-kubernetes-monitoring-and-management-with-lens-desktop/
- [k8s-leases] Kubernetes node leases / heartbeats — https://kubernetes.io/docs/concepts/architecture/leases/
- [loops] Agent infinite-loop guards — https://inkog.io/glossary/infinite-loop-ai-agent
- [gh-inbox] GitHub notifications inbox filters/reasons — https://docs.github.com/en/subscriptions-and-notifications/reference/inbox-filters
- [gh-environments] GitHub Actions environment reviewers / prevent self-review — https://docs.github.com/en/actions/managing-workflow-runs/reviewing-deployments
- [argocd] Argo CD sync windows / manual sync + RBAC — https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- [mdn-sse] MDN — Using server-sent events — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- [mdn-ws] MDN — WebSockets API — https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- [whatwg-sse] WHATWG HTML spec — server-sent events — https://html.spec.whatwg.org/multipage/server-sent-events.html
- [caddy-reverse-proxy] Caddy reverse_proxy (streaming/flush, text/event-stream) — https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- [caddy-metrics] Caddy metrics / Prometheus series — https://caddyserver.com/docs/metrics
- [caddy-log] Caddy log directive (stdout, json) — https://caddyserver.com/docs/caddyfile/directives/log
- [prom-histograms] Prometheus histograms / histogram_quantile — https://prometheus.io/docs/practices/histograms/
- [promlabs-tls] TLS cert-expiry with blackbox_exporter — https://promlabs.com/blog/2024/02/06/monitoring-tls-endpoint-certificate-expiration-with-prometheus/
- [api-composition] microservices.io — API Composition — https://microservices.io/patterns/data/api-composition.html
- [mv-azure] Azure Architecture — Materialized View pattern — https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view
- [cqrs-azure] Azure Architecture — CQRS pattern — https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- [bff-azure] Azure Architecture — Backends for Frontends — https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends
- [bff-newman] Sam Newman — BFF pattern — https://samnewman.io/patterns/architectural/bff/
- [nist-zt-1] Zero Trust logical components (NIST 800-207) — https://www.intersecinc.com/blogs/the-logical-components-of-zero-trust
- [nist-zt-2] NIST 800-207 explained — https://securityboulevard.com/2025/08/zero-trust-architecture-nist-800-207-explained-principles-components-and-workflow/
- [control-plane] Control plane vs data plane — https://konghq.com/blog/learning-center/control-plane-vs-data-plane
- [rfc7009] RFC 7009 — OAuth 2.0 Token Revocation — https://www.rfc-editor.org/rfc/rfc7009.html
- [idempotency-key] MDN — Idempotency-Key header — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Idempotency-Key

**Repo (source of truth):**
- `context/ARCHITECTURE.md` (§2, §3, §4, §5, §6, §8) · `context/PROCESS.md` (Stage 1) ·
  `apps/mission-control/CLAUDE.md` · `apps/mission-control/ui/UI_SPEC.md` ·
  `platform/proxy/docs/OBSERVABILITY.md` (§1–§7) · `platform/proxy/conf/Caddyfile` ·
  `platform/auth/CLAUDE.md` (SETTLED #2–#8) · `platform/auth/ui/build/MANIFEST.md`
