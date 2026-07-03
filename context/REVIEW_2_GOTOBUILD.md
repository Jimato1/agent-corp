# REVIEW_2_GOTOBUILD — Root review #2: the final planning gate before BUILD

> **Session:** 2026-07-03. **Charter:** reconcile all twelve component plans into a coherent buildable
> whole, freeze the remaining cross-app seams, resolve the deferred suite-topology decisions, and issue
> a per-component GO / NO-GO-TO-BUILD verdict + build order. **Method:** 13 parallel extraction agents
> (one per component, each mapping seams produced / consumed / assumed-of-others), the four SoD-chain
> plans (Board, Gateway, CMDB, Vault) read byte-for-byte centrally, then central reconciliation. **No
> app was built or re-planned here; no individual plan was re-litigated for internal quality** (each is
> individually adversarially-hardened). This review owns only the *seams between* plans and whole-suite
> coherence. Docs-only, on branch `review/gotobuild-2` for operator review + merge.
>
> **Inputs:** root CLAUDE.md, ARCHITECTURE.md, PROCESS.md; all `context/CONTRACTS/*`; `context/specs/*`
> (IDENTIFIERS, TICKET_STATE_MACHINE, DEPLOYMENT); MERGE_REVIEW_1.md; RATIFICATIONS_2026-07-02.md;
> GAP_REMEDIATION.md; and all twelve `planning/PLAN.md` (agent-runtime is Stage-1 RESEARCH only —
> its plan reads "Status: not started").

---

## 0. Headline

The suite is **coherent and buildable.** The SoD execution chain (Board → CMDB → Vault → Gateway) is
end-to-end consistent: the approval single-use property, the fencing-token monotonic source, and the
signed-verdict envelope all reconcile across the independently-authored plans. The blocking items are
**not seam conflicts** — they are (1) two gating sessions that have not run (the gap-1.3 spike and
gap-1.2 sizing, both agent-runtime-owned), (2) **agent-runtime has no Stage-2 plan at all** while being
the hub most apps consume, and (3) a batch of service-principal registrations and three stale
plan-texts that must be reconciled before the apps that depend on them build. None require a redesign.

Six things need **your ratification** (§5). Everything else is decided and encoded below.

---

## 1. THE FROZEN / UPDATED CONTRACTS (what this session writes)

| Contract | Status | What it freezes |
|---|---|---|
| **`context/CONTRACTS/cmdb-gateway-verdict-token.md`** | **NEW — FROZEN (S1)** | The signed policy-verdict JWS envelope + validation algorithm both CMDB (§3.4) and Gateway (check-2b) designed toward. EdDSA/Ed25519, `typ: cmdb-verdict+jws`, `aud`-by-caller anti-relay, CMDB-local signing key at `GET /v1/verdict-jwks`, zero-leeway `exp`, optional `req_nonce`, additive `host_class`/`verdict_basis`. Adds one **SoD-critical Gateway obligation** its plan left implicit: the Gateway MUST verify `aud == "gateway"` (COUNTERSIGN-1). |
| `context/CONTRACTS/README.md` | **UPDATED** (this session) | Ledger row added for `cmdb-gateway-verdict-token.md`; S5 Redis resolution noted; the three "still-to-write" Board contracts (`board-consumers-facts-read.md`, `board-mc-console.md`, `board-notes-ceremony.md`) confirmed as Board-Stage-2-exit deliverables, producer side already specified. |
| `context/specs/IDENTIFIERS.md` | **UPDATED** (this session) | `release_id` format pinned **`rel-` + ULID** (Vault §3.2, discharges the "decided at Vault Stage-2" note); `note_id` format pinned **`N-` + 26-char ULID** (Notes §2.1); `req_nonce` confirmed in the deliberately-NOT-registered set; note that Notes/Drive join the fencing-token consumer list. |
| `context/specs/DEPLOYMENT.md` | **UPDATED** (this session) | S5 budget-transport decision (§3 note: auth budget-check API, no shared-Redis network); `data_vault` network + `vault_openbao` row (Vault §2.2); confirms no service-name/port collisions. |

**Contracts confirmed already-frozen and mutually consistent (no change needed):** `board-agents-claim.md`,
`agent-runtime-mc-heartbeat.md`, `killswitch-chain.md`, `cmdb-gateway-policy.md`, `vault-gateway-redemption.md`,
`auth-apps-tokens-scopes.md`, `agent-runtime-library-inference.md`, `cmdb-library-hostfacts.md`,
`board-wazuh-connector-kickoff.md`, `gateway-cmdb-library-sandbox.md` (both halves), `gateway-mc-audit-anchor.md`,
`mc-chat-review-resolve.md`.

---

## 2. THE SEAM MATRIX (producer → consumer, all twelve components)

Legend: **✓** = producer commits, consumer's assumption matches, contract-backed. **⊕** = consistent but the
consumer must still countersign / request a grant (tracked in §4/§5). **⚠** = mismatch or unbacked assumption to
resolve before the consumer builds (Task-2 flags, §3).

| # | Producer → Consumer | Flow | Backing contract | Status |
|---|---|---|---|---|
| 1 | Board → agent-runtime + all agents | atomic claim / lease / fence / heartbeat / transition | `board-agents-claim.md` | ✓ |
| 2 | Board → Gateway | approval record + allowlist + derived `action_class` + **`consume_approval`** single-use | (S2 trace §4.2) + IDENTIFIERS + state machine | ✓ |
| 3 | Board → auth PDP / Vault / Drive / Notes / Gateway / MC | **facts-read surface** (`/facts/ticket`, `/facts/approval`, `/facts/host-lock`, console reads) | `board-consumers-facts-read.md` (producer specified §7; freeze at Board exit) | ⊕ (S3 §4.3) |
| 4 | Board → Notes | ceremony convergence + roster/phase for draft isolation | `board-notes-ceremony.md` (joint, to write) | ⊕ |
| 5 | Board ↔ Wazuh connector | kickoff webhook + quarantine + verification evidence | `board-wazuh-connector-kickoff.md` | ✓ |
| 6 | Board → MC | console reads + WIP-cap write + CORS `mc` origin | `board-mc-console.md` (producer specified §7; freeze at Board exit) | ⊕ |
| 7 | Board → auth | A2 break-glass review-ticket birth endpoint | state machine A2; needs `svc:auth` | ⊕ (§4) |
| 8 | Board (fence) → Gateway / Notes / Drive / auth PDP | fencing token — one minter, three enforcement strengths | `board-agents-claim.md` §3 + IDENTIFIERS | ✓ (§3.6) |
| 9 | CMDB → Gateway | signed policy verdict (JWS envelope) | **`cmdb-gateway-verdict-token.md` (NEW)** + `cmdb-gateway-policy.md` | ✓ (S1) |
| 10 | CMDB → svc:tier-approver | auto-tier verdict (`aud: board`) | `cmdb-gateway-verdict-token.md` §3 | ✓ |
| 11 | CMDB → Library | `resolve_host_facts` inventory facts | `cmdb-library-hostfacts.md` | ✓ (scope erratum resolved: `cmdb:read-policy`) |
| 12 | CMDB + Gateway → Library | tier-0 sandbox execution + evidence | `gateway-cmdb-library-sandbox.md` (both halves) | ⊕ (Library plan stale, §3.4; needs `gateway:read`, §4) |
| 13 | CMDB → Board | escalation-intake (outbox: needs_tiering, dst_gap, …) | needs `svc:cmdb` + Board escalation surface | ⊕ (§4) |
| 14 | Vault → Gateway | handle redemption (`release_id`) + SSH-CA + D-4 approval re-verify | `vault-gateway-redemption.md` + G-1..G-7 (Gateway countersigns) | ✓ (S2 §4.2) |
| 15 | Vault → Board (client) | reads `/facts/approval` (D-4) + `/facts/ticket` (release staging) | needs `svc:vault` `board:read` | ⊕ (§4) |
| 16 | Gateway → MC | signed audit-chain HEAD anchoring | `gateway-mc-audit-anchor.md` | ✓ (needs `mc:anchor` grant, §4) |
| 17 | Gateway → Board | run outcomes + verification evidence (`executing → …`) | state machine + needs `board:execute` | ⊕ (§4) |
| 18 | Gateway → Notes (client) | revision-pinned plan-byte reads (re-hash) | needs `svc:gateway` `notes:read` (NEW ask A2) | ⊕ (§4) |
| 19 | agent-runtime → MC | heartbeat/liveness SSE + DRAINED / QUIESCED_BY_OUTAGE | `agent-runtime-mc-heartbeat.md` | ✓ |
| 20 | agent-runtime → Library + all roles | `generate()` / `embed()` inference facade | `agent-runtime-library-inference.md` | ✓ (pins post gap-1.2) |
| 21 | agent-runtime ↔ auth | key provisioning (C7/C8: TPM attest, EK allow-list, rotation) | UNWRITTEN — freeze at runtime Stage-2 | ⚠ (§3.1) |
| 22 | agent-runtime → Notes | C12 resumable-checkpoint note contract | UNWRITTEN — freeze at runtime Stage-2 | ⚠ (§3.1) |
| 23 | agent-runtime → Board | C3 clean-quiesce / fencing-safe re-entry (reaper enable) | `board-agents-claim.md` §2 | ✓ |
| 24 | MC → Chat (+ deep-linkers) | review-item URL scheme + resolve-event SSE feed | `mc-chat-review-resolve.md` (FROZEN) | ⊕ (Chat plan stale, §3.3; needs `svc:chat`+`mc:read`, §4) |
| 25 | MC → auth | level-addressed kill trigger + halt-posture read | `killswitch-chain.md` + auth §10 | ✓ |
| 26 | auth → every RS | RS baseline + holder-scope pin + budget middleware + revocation | `auth-apps-tokens-scopes.md` §1/§2/§8 | ✓ (budget transport = S5 §4.5) |
| 27 | auth → proxy | forward-auth verify (consumed verbatim) | auth PLAN §8 (frozen by reference) | ✓ |
| 28 | proxy → every app | edge onboarding (subdomain==audience==service, 8080, no host ports, header scrub) | DEPLOYMENT §1/§2 | ✓ (proxy R3/R5/R10 + ntfy route owed, §3.7) |
| 29 | Library (provenance) → Board | taint → auto-approve-lane ineligibility | ARCHITECTURE §12; Board §9 encodes it | ✓ (§3.5 — Board DOES encode it) |
| 30 | Vault → off-box WORM sink | redemption audit stream | DEPLOYMENT §3a (D-16) | ✓ |
| 31 | Chat → operator devices | ntfy push sink | DEPLOYMENT §2 (`chat_ntfy`) | ✓ (proxy must absorb exempt route, §3.7) |
| 32 | Drive → agent-runtime | **deterministic file-upload step** | NONE — consumer-invented | ⚠ (§3.2 — runtime never agreed) |
| 33 | Library → agent-runtime / CMDB / Gateway | **outbound calls** (embed, resolve_host_facts, get_sandbox_evidence) | NONE — no `svc:library` requested | ⚠ (§3.3/§4) |
| 34 | MC → Board / auth / Gateway | **own composition reads** | NONE — no `svc:mc` requested | ⚠ (§3.2/§4) |
| 35 | Notes/Drive → pdf | md→PDF render + byte-fetch | NONE — pdf has no Stage-1 | ⚠ (deferred, §4.pdf) |

---

## 3. TASK-2 SEAM SWEEP — mismatches to resolve (consumer inventing a duty the producer never agreed to)

The gap-6.1 failure mode. These do **not** block the producers; they block the *consumers* named, and are the
items where a plan assumed something no frozen seam backs.

### 3.1 agent-runtime seams C7/C8/C12 are UNWRITTEN and agent-runtime has no Stage-2 plan
The runtime is the hub of seams 21/22/23 and the producer of the inference facade (20), heartbeats (19), and the
drain client (25). Its `planning/PLAN.md` reads **"Status: not started."** Four seams freeze *at its Stage-2*:
C4 (drain-command schema, verbatim per `killswitch-chain.md` §2), C7/C8 (key provisioning, jointly with auth),
C12 (Notes checkpoint). Until then auth's non-exportable-key invariant (§3.6 of its plan) and Notes' drain-flush
behavior rest on unfrozen seams. **This is the critical-path blocker — see §4 (NO-GO) and §6 (build order).**

### 3.2 Two consumer-invented duties with no producer acknowledgement
- **Drive → agent-runtime "deterministic upload step"** (seam 32): Drive PLAN §2.2/§15.6 assumes the runtime
  provides a workspace-path + `upload_ref` + token → authenticated-PUT helper "so local models never hand-roll
  HTTP." **agent-runtime's RESEARCH.md contains zero Drive mentions** — it never agreed. Runtime Stage-2 must
  accept, shape, or reject it; until then Drive's agent-upload path rests on a runtime capability no contract states.
- **MC → its own composition reads** (seam 34): Board PLAN §7 lists `svc:mc` as a facts consumer and grants it
  `board:admin` for WIP writes — but **MC's own plan never requests a `svc:mc` principal.** How MC authenticates
  its polls to Board/auth/Gateway is left implicit. MC must request `svc:mc` (§4).

### 3.3 Two STALE plan-texts — seams froze after the consumer planned
- **Chat** (seam 24): Chat PLAN §6/§16 still gates the `mc|review` deep-link rows and the resolve-subscriber on
  "PENDING MC Stage-2," but `mc-chat-review-resolve.md` **froze 2026-07-02**. Chat owes a countersign pass: fill
  §6 rows (`/review/<ticket_id>`, `/ticket/<ticket_id>` 302-alias), build the seam-#24 subscriber, and **request
  the `svc:chat` + `mc:read` credential its plan never mentions** (the contract requires it, covering `/api/queue`
  for the reset-recovery path). Not a Stage-2 re-open — a build-time fixup.
- **Library** (seam 12): Library PLAN still shows `gateway-cmdb-library-sandbox.md` as SKETCH/PENDING-D7 and
  PENDING-R7, with the auto-admit lane disabled and curation go-live "blocked." **Both froze** (sandbox both
  halves 2026-07-03; R7 countersigned 2026-07-02). Library owes a consume-the-freeze pass: enable-lane design,
  verify §G6 evidence covers `covered_anchors`, adopt the registered `hv-` `harness_version`, and **request the
  `gateway:read` outbound grant** (the evidence read is `get_sandbox_evidence(run_id)`, scope `gateway:read`,
  which Library never asked for — §3.4/§4). Only PENDING-SIZING (gap-1.2) is genuinely still open.

### 3.4 Library outbound authentication is unspecified
Library is planned as a pure RS + outbound consumer, but requests **no principal for its outbound calls**:
`embed()` (agent-runtime), `resolve_host_facts` (`cmdb:read-policy`), `get_sandbox_evidence` (`gateway:read`).
Its inbound scopes (`library:read/propose/curate/admin`) are countersigned; its outbound identity is a gap. §4.

### 3.5 Confirmed NOT a mismatch — the Library→Board taint seam holds
Library asserts Board computes auto-approve-lane ineligibility from Library-exposed `provenance_taint` (seam 29).
Verified against Board PLAN §9: Board **does** encode it — rule 3 of its mechanical tagging taints any ticket
whose creating agent belongs to the Library curation team, and §8.2 step 4 consumes Notes' transitive effective
taint at grant time. The one open sub-item (does Library-tier provenance of cited `doc_id`s propagate into Notes'
`effective` flag) is a named line item of the `board-notes-ceremony.md` joint freeze, not an unbacked assumption.

### 3.6 Fencing token — three consumers, three enforcement strengths (all sound)
Board is the single minter (IDENTIFIERS). The consumers deliberately differ by risk class, and all trace to the
one monotonic source:
- **Gateway** (Critical-infra): reads the live Board host-lock generation (`/facts/host-lock`) AND keeps a
  per-host high-water mark (`host_fence`), refusing any lower — the split-brain detector.
- **Notes** (Standard): validates **uncached against Board on every ticket-bound write** — no staleness cache.
- **Drive** (Standard, lower-stakes): keeps a **Drive-local high-water mark from echoed tokens only** — does not
  read Board. A deliberate, accepted residual (Drive §15.2: claim-holdership not proven per-put; artifacts are
  lower-value). Sound for its risk class.
- **Chat** (Standard, notification): stores the token **advisory-only**, no hot-path validation — its posts are
  not side-effecting work surfaces. **Chat must confirm with Board that Chat pings stay outside the reject-stale
  set** (Chat §15.4 flagged it; Board confirms at Board Stage-2).
- **auth PDP:** presence/freshness only, never the value (correct per IDENTIFIERS).
- *Reconcile:* IDENTIFIERS names only Gateway + auth PDP as validators; **Notes and Drive are added consumers**
  (backed by `board-agents-claim.md` §3). Updated in IDENTIFIERS this session.

### 3.7 proxy reconciliation items (all owed by proxy's own next session, none blocking)
R3 (`AUTH_VERIFY_PORT` → 8089 in proxy's own env files), R5 (attach `creds` tier when vault/gateway build), R10
(OBSERVABILITY metrics-series erratum), the **`ntfy.<SUITE_DOMAIN>` forward-auth-exempt route** (not yet in the
built Caddyfile — must apply scrub+ratelimit per its own S2-01 rule), the CSRF/cookie-SameSite duty it reassigned
to auth + app UIs without a countersign, and the IDENTIFIERS-lists-proxy-as-epoch-consumer vs proxy-plans-no-
epoch-logic mismatch (resolve: proxy only relays auth's 403, needs no epoch tracking — the IDENTIFIERS row is
over-broad; harmless, note it).

---

## 4. THE SIX KNOWN SEAMS (S1–S6)

### S1 — VERDICT-COUNTERSIGN CONTRACT — **FROZEN**
Gateway's A4 (check-2b: "verify CMDB signature, `decision_id`, expiry") and CMDB's A5 (§3.4: JWS envelope,
`aud`-by-caller, CMDB-local key, zero-leeway `exp`, `req_nonce`, `host_class`/`verdict_basis`) were two
anticipating halves. **Frozen as one doc both read byte-for-byte: `context/CONTRACTS/cmdb-gateway-verdict-token.md`.**
The freeze surfaces one SoD-critical gap the "additive agreement" hid: **the Gateway must verify `aud == "gateway"`
on the verdict** — otherwise CMDB's anti-relay design (tier-approver reads get `aud: board`, never Gateway-
redeemable) is only half-built. That obligation is now §4 step 3 of the contract, additive to Gateway check-2b,
Gateway confirms at COUNTERSIGN-1. `req_nonce` frozen as OPTIONAL (Gateway MAY adopt; contract-scoped, not a
registered ID). Signing key is **CMDB-local, distinct from auth's**, served at `GET /v1/verdict-jwks`.

### S2 — APPROVAL-CONSUMPTION ORDERING + ATOMICITY — **TRACED, CONFIRMED (distributed single-use holds)**
One approval, end-to-end across three services:
1. **Board mints** (`approvals` row + immutable `approval_allowlist`, bound to exact `(host_id, plan_hash)`,
   `status='granted'`; four-eyes `approver_sub != proposer_id` enforced independently of the PDP).
2. **Gateway consumes at Board** (check-1c → Board §8.3), in **ONE transaction**:
   - acquire the **execution hold** on `host_locks` (CAS `WHERE claimed_by_ticket IS NULL`, mint a **fresh
     `lock_generation`**); zero rows → whole tx rolls back, **approval stays `granted`, nothing burned** (`HOST_LOCKED`);
   - **`UPDATE approvals SET status='consumed', consumed_at, consumed_by=:gateway_sub WHERE id=:id AND status='granted'`**
     — this **IS the single atomic check-and-mark (compare-and-swap)**: it returns success to **exactly one caller**;
     a second consume matches zero rows → terminal `approval_consumed`. **No check-then-consume window exists** —
     the replay hole on the execution path is closed by the CAS itself, not by a preceding read.
   - binding checks (`host_id`, `ticket_id`, `status=approved`, kill < G1); CAS ticket `approved → executing`.
3. **Gateway redeems at Vault AFTER consuming** (check-3, `vault-gateway-redemption.md` §5: "mutex acquired with
   the Board fencing token BEFORE any credential redemption" — the execution hold from step 2 IS that mutex, held
   across the whole run). **Vault independently re-verifies** (§4.1 step 9, D-4): live `GET /facts/approval`,
   predicate `status=='consumed' ∧ consumed_by == <the presented token's sub> ∧ ticket_id/host_id/plan_hash match
   ∧ credential-class bind`. Board unreachable → DENY.

**Ordering is unambiguous and race-free:** the host mutex (execution hold) is acquired *at consume time* (before
CMDB, before Vault) and held through the run; the approval is single-use by CAS; Vault re-verifies `consumed`
live. A compromised Gateway token alone cannot reach plaintext — it needs a Board-recorded `consumed` approval
bound to exactly `(host_id, plan_hash)` that Vault checks itself. **The distributed single-use / CV-C property
holds.** *One producer-side reconciliation (minor):* Board's `/facts/approval` returns `action_class` (satisfies
Vault's M-2 class bind) but **not `ticket_status`**; Vault's B-4 live "still-executing" check therefore needs a
second `/facts/ticket` call, OR Board adds `ticket_status` to the `/facts/approval` response so step 9 is one
call. **Recommend Board add `ticket_status` to `/facts/approval`** — folded into the `board-consumers-facts-read.md`
freeze (S3).

### S3 — BOARD FACTS-READ CONTRACT — **producer side specified; freeze at Board Stage-2 exit**
Board is **not silent** — PLAN §7 fully designs the producer side: `GET /facts/ticket/{id}`, `/facts/approval/{id}`
(with the stated D-4 predicate fields), `/facts/host-lock/{host_id}`, plus the MC console reads. The contract
`board-consumers-facts-read.md` is *referenced-but-absent* only because Board's Stage-2 hasn't exited (spike-gated,
S-below). Consumers reconcile cleanly: Vault (approval, D-4), Drive (`exists`), Notes (`fencing_token`, ticket-
keyed), auth PDP (`proposer_id`, state), Gateway (ticket + host-lock), MC (console). *Correction to the review
brief:* **CMDB is NOT a facts-read consumer** — it *writes* escalations to a Board escalation-intake surface
(needs `svc:cmdb`, §4), a separate seam. **No Board gap.** Freeze the contract at Board exit; fold in the S2
`ticket_status`-on-`/facts/approval` addition. All facts endpoints are `Cache-Control: no-store`, p99 < 50 ms.

### S4 — SERVICE PRINCIPALS — consolidated; several required final auth touches
**Registered (auth §9 / §7):** `svc:notes` (board:read) ✓; `svc:drive` (board:read) ✓; `svc:tier-approver`
(board:approve HOLDER + board:read + cmdb:read-policy) — **registered but NON-ACTIVATABLE** until the compiled
`HOLDER_ALLOWED_KINDS[board:approve]` admits `kind=service` (§5.4 ratification); `library` audience + slice ✓.

**NOT yet registered — required final auth touch (all additive Stage-5 constants + one kind-gate change):**

| Principal | Grants needed | Raised by | Kind-gating note |
|---|---|---|---|
| `svc:gateway` | `vault:read-credential` (pinned ✓) **+ NEW:** `board:execute` (new scope), `board:read`, `cmdb:read-policy`, `mc:anchor` (new scope), `notes:read` (new grant) | Gateway A5, Board #5 | `kind=service`; **barred from `gateway:execute`** (agent-only) — held correctly |
| `svc:vault` | `board:read` (D-4 `/facts/approval` + release-staging `/facts/ticket`) | Vault §12, Board #5 | read-only; no holder scope |
| `svc:cmdb` | Board escalation-intake scope + `auth:authenticate` | CMDB A2 | read/write-benign; no holder scope |
| `svc:mc` | `board:read` (console reads) + `board:admin` (WIP writes) | **MC must request — currently implicit (§3.2)** | operator-adjacent; `mc:kill-switch` stays operator-only |
| `svc:chat` | `mc:read` (covers `/api/events/resolve` **and** `/api/queue`) | mc-chat contract; **Chat must request (§3.3)** | read-only |
| `svc:board` | `notes:read` (plan bytes + effective taint) + `chat:post` | Board #4 | `chat:post` to `kind=service` is an auth-side change (Chat grants it to agents+operator only) |
| `svc:auth` | kind-gated Board `create` for A2 break-glass birth | Board #3 | narrow create only |
| `svc:library` (outbound) | `cmdb:read-policy` + `gateway:read` + inference-facade access | **Library must request (§3.4)** | read-only; no holder scope |

**New scopes to register (all additive; suffix-classified, ConflictSet untouched):** `board:execute`
(sod-critical, `svc:gateway`-only HOLDER-class), `board:admin` (sod-critical policy-plane), `mc:anchor`,
`mc:read`, `gateway:read`, `gateway:sandbox` (+ the grant-time exclusion vs `gateway:execute`), `cmdb:manage`,
`notes:append`, `chat:manage` (retire `chat:broadcast`), `library:read/propose/curate/admin` (countersigned).

### S5 — REDIS-SHARING TOPOLOGY — **RESOLVED: auth budget-check API; Redis stays auth-private** (ratification-worthy, §5)
Every RS's budget middleware wants "the one shared Redis" (auth §6); DEPLOYMENT §3 declares that Redis
auth-private (`data_auth`). Every Wave-1 app flagged the contradiction (Library F14, Notes, Chat, Drive, Vault,
CMDB A11, Gateway O5) and hedged behind a transport seam. **Decision: Option B — auth exposes a budget-check /
admission API; RSes never touch Redis directly.** Rationale:
- **Preserves the load-bearing SoD invariant** (DEPLOYMENT §3: "no app opens another app's store; cross-app data
  moves over APIs only"). A shared Redis that every RS reads/writes *is* a shared store — and auth's Redis also
  holds the **sod-critical revocation denylist**; exposing it to every RS (incl. Vault/Gateway, whose whole design
  is network isolation) would leak the highest-value store onto a segment shared with Standard-class containers.
- **No new shared-state network** — so `creds`/`data_vault`/`data_gateway` isolation is untouched.
- auth already exposes budget state via API to MC (§6.7); this generalizes the same surface to RS admission.
- Every RS keeps the **Redis-independent in-process concurrency ceiling** auth §1 already mandates as the always-
  available local bound; the shared dimensions (rate/cooldown/lifetime) call auth's API; auth-down → benign =
  allow-but-locally-bounded, sod/destructive = 503 fail-closed (unchanged from §6).
- **No app assumed the wrong answer** — all bound behind a seam that can take either transport; they now bind to
  the API transport. **auth owes the budget-check API shape** as a Stage-5 deliverable (same surface as MC's
  budget read/clamp, §6.7). Encoded in DEPLOYMENT §3.

### S6 — DEPLOYMENT COHERENCE — assembled; no collisions; SoD isolation holds
**Networks:** `edge` (proxy + all subdomain apps + agent-runtime + auth), `creds` (**vault + gateway ONLY**),
`data_auth` (auth + its Postgres/Redis), `data_gateway` (gateway + its Postgres, D-8), **`data_vault` (NEW —
vault wrapper + `vault_openbao` + `vault_unsealer` ONLY; the engine's mTLS listener binds this interface,
edge-unreachable)**. **S5 adds no network.** SoD isolation verified: no Standard-class container on `creds`/
`data_vault`/`data_gateway`; the revocation denylist + budget counters stay auth-private.
**Ports:** all apps 8080; auth 8089; proxy 443/80/9100; sidecars `chat_ntfy`:80, `mc_prometheus`:9090,
`mc_blackbox`:9115, `mc_logstore`:3100, `mc_logship` (collector), `vault_openbao`:8200, `vault_unsealer`:8200
(both on `data_vault`, no host ports → no collision). **agent-runtime port is still TBD** (its Stage-2 owes it).
**Service names:** no collisions; `mc` (D-3). **Stores:** SQLite-per-app except auth (Postgres+Redis) and gateway
(Postgres, D-8) — the two ratified exceptions; Vault = OpenBao raft (canonical special regime) + wrapper SQLite.
**IDs:** `release_id` = `rel-`+ULID (pinned this session), `note_id` = `N-`+26-char ULID (pinned), `doc_id` =
`lib-`+ULID ✓, `harness_version` = `hv-`+12hex ✓, `req_nonce`/`facts_provenance` contract-scoped not-registered.
All app ID usage matches IDENTIFIERS. **pdf is the one incoherence** (§4.pdf): network `proxy_internal`→`edge`
(R4), service `pdfforge`→`pdf`, port 8000→8080, Authelia→suite-auth — all unreconciled (pre-suite standalone build).

---

## 5. CONFLICTS / DECISIONS NEEDING YOUR RATIFICATION (your decision list)

1. **S5 — Redis / budget transport.** I resolved it to **Option B (auth budget-check API; Redis stays
   auth-private)** on SoD-store-isolation grounds. This is a suite-topology posture you parked here — confirm, or
   choose Option A (shared budget Redis on a dedicated network). *My recommendation: Option B* (§S5).
2. **Board spec amendments A-VR + A-RR** (Board owns `TICKET_STATE_MACHINE.md`). **A-VR** (voluntary release
   `in_progress → todo`, agent claim-holder, fence-checked) is *pure reconciliation* — the frozen
   `board-agents-claim.md` §4 already grants it while the spec table omits it (the spec's "no other transitions
   exist" is currently false against its own frozen contract). **A-RR** (`approved → awaiting_approval`, Board-
   automatic, restore-reconciliation only) prevents restore from terminally wedging `approved` tickets and
   destroying lineage. Both narrow; neither opens an agent/policy path toward execution. *Recommend: ratify both.*
3. **Kind-gating change: `HOLDER_ALLOWED_KINDS[board:approve]` must add `service`** (for `svc:tier-approver`),
   and review **dropping `agent`** (no role grants an agent `board:approve`) and break-glass admissibility in the
   same pass. This is a **compiled-constant change + redeploy** (auth settled-#5 channel). Until it lands,
   `svc:tier-approver` stays non-activatable and **all approvals are operator-granted** (the safe degradation).
   *Recommend: authorize the change at auth Stage-5.*
4. **S1 verdict-signing key is CMDB-local, distinct from auth's identity key** (the policy veto must not share a
   trust root with the identity plane), served at a new `GET /v1/verdict-jwks`. Design choice with a small
   operational cost (a second JWKS the Gateway pins). *Recommend: ratify as designed* (it is the stronger SoD
   posture).
5. **agent-runtime gating sessions must run before Board/Notes can freeze schemas.** The **gap-1.3 spike** and
   **gap-1.2 sizing** are agent-runtime-owned dedicated sessions that **have not run** (no results artifact exists
   in the repo). Sizing needs **six operator inputs** (GPU model/VRAM/count, host RAM, target fleet size,
   per-session SLO, per-role quality bar, FP8/FP4 confirmation). *Decision needed: provide the six inputs and
   authorize both sessions* — they are the critical-path gate for the whole suite (§6).
6. **pdf suite-integration scope.** pdf is a pre-suite standalone build whose own golden rules forbid adding the
   suite seams without instruction. Before Drive/Notes build features that call it, it needs a scoped mini-stage:
   amend its `SCOPE.md` to admit the seams, freeze `drive↔pdf` + `notes→pdf` (incl. the Pandoc-vs-pinned-stack
   decision for md→PDF/docx), and reconcile deployment (R4 `edge`, service name `pdf`, port 8080, suite-auth).
   *Decision needed: authorize the pdf integration mini-stage (or explicitly defer pdf integration to a later wave).*

*(Already ratified, recorded for completeness — no action: Vault D-16 postures + break-glass; D-4 mechanism =
live Board facts; D-8 Gateway Postgres; D-7 sandbox carve-out; all of RATIFICATIONS_2026-07-02.)*

---

## 6. PER-COMPONENT GO / NO-GO-TO-BUILD

| Component | Verdict | Blocking items for NO-GO / conditions |
|---|---|---|
| **auth** | **GO** (BUILT) | Reference. Forward: Stage-5 Postgres/Redis/EdDSA migration; the §5.4 kind-gate change; publish the S5 budget-check API. |
| **proxy** | **GO** (BUILT) | Reference. Owes R3/R5/R10 + absorb the `ntfy` exempt route + CSRF-reassignment countersign (§3.7) — none block others. |
| **Board** | **CONDITIONAL GO** | Data model, claim engine, approval record, `consume_approval`, facts endpoints, state machine, HTTP API are **build-ready now**. **MCP schema freeze + Stage-2 EXIT are blocked on the gap-1.3 spike (D-17).** Build the non-MCP core immediately; freeze schemas post-spike. Ratify A-VR/A-RR (§5.2); freeze the three Board contracts at exit (add `ticket_status` to `/facts/approval`, S2). |
| **Notes** | **CONDITIONAL GO** | Same spike gate as Board (MCP schemas provisional). Core specified. Depends on Board facts (`svc:notes` ✓) + `board-notes-ceremony.md` joint freeze. |
| **agent-runtime** | **NO-GO** | **Stage-2 plan NOT STARTED; gap-1.3 spike + gap-1.2 sizing NOT run.** Must: run both sessions (needs the six operator inputs), write the Stage-2 plan, freeze C4 (drain schema verbatim) + C7/C8 (with auth) + C12 (with Notes), resolve DEPLOYMENT port/`/dev/tpmrm0`/store class, accept-or-reject the Drive upload seam (§3.2), decide whether the supervisor needs a `svc:runtime` principal. **Critical-path blocker for the suite.** |
| **mission-control** | **GO** | Stage-2 complete; produces `mc-chat-review-resolve` (frozen) + the anchor receiver. **Must request `svc:mc`** (§3.2/§4). Runs degraded until Board console reads + auth `mc:read`/`mc:anchor` grants land. |
| **drive** | **GO** | Stage-2 complete. Ticket-exists degraded (flag-always) until Board endpoint + `svc:drive` grant. The `agent-runtime` upload seam is consumer-invented (§3.2) — resolve at runtime Stage-2. |
| **chat** | **GO-WITH-FIXUP** | Stage-2 complete but **PLAN text STALE** (§3.3): consume the frozen `mc-chat-review-resolve`, build the resolve subscriber, **request `svc:chat`+`mc:read`**. Build-time fixup, not a Stage-2 re-open. |
| **library** | **GO-WITH-FIXUP** | Stage-2 complete but **PLAN text STALE on two now-closed gates** (§3.3): consume the frozen sandbox contract (both halves) + closed R7; **request the `svc:library` outbound principal** incl. `gateway:read` (§3.4). Only PENDING-SIZING (gap-1.2) genuinely open. |
| **cmdb** | **GO** | Stage-2 complete. Verdict producer (S1 frozen). Needs `svc:cmdb` registration (escalation outbox) + a Wazuh read-only credential path at Vault (A8). A5 verdict package = S1 (done). |
| **vault** | **GO** | Stage-2 complete (adversarial HOLDS_WITH_CHANGES, all folded). Needs `svc:vault` registration + the `data_vault` DEPLOYMENT amendment + a named suite-internal offline CA. Consumes Board facts (D-4, S2/S3). Gateway countersigns G-1..G-7. |
| **gateway** | **GO** | Stage-2 complete. **LAST in the SoD chain.** Consumes Board `consume_approval` (S2) + CMDB verdict (S1) + Vault redeem (S2). Needs `svc:gateway` new grants (§4). COUNTERSIGN-1 on the verdict-token `aud` check (S1). |
| **pdf** | **GO (out of the integration wave)** | Already built, Safe-class, gates nothing else. Needs the §5.6 integration mini-stage before Drive/Notes call it; do not let them build against assumed pdf behavior (IDENTIFIERS/ARCH §4 assert pdf duties its own docs never agreed to). |

---

## 7. BUILD ORDER (dependency DAG — parallel vs strict)

**BUILT:** `auth`, `proxy`.

**Phase 0 — gating sessions (NOT builds; run next, before any spike-gated Stage-2 exit):**
- **gap-1.3 spike** + **gap-1.2 sizing** (agent-runtime-owned; needs the six operator inputs). These gate
  Board/Notes MCP-schema freeze and ceremony parameters (D-17). *Strictly first.*

**Phase 1 — foundation (strict-first within the DAG):**
- **Board** — the most-depended-on app (approval record + fencing + state machine + facts). Its **non-MCP core
  builds now**; MCP schemas freeze after the Phase-0 spike passes. Everyone downstream binds to Board facts.

**Phase 2 — the hub:**
- **agent-runtime** — Stage-2 (currently not started) then build. Needs Board's claim contract + auth key-
  provisioning (C7/C8). Produces the inference facade, heartbeats, and the drain client that Phases 3–4 consume.
- **Notes** — parallel with agent-runtime (consumes Board facts + fencing; schema post-spike; C12 with runtime).

**Phase 3 — consumers of Board + runtime (parallel):**
- **mission-control**, **drive**, **chat**, **library** — all consume Board facts + auth + (MC/library) runtime.
  No hard ordering among them. Library's *curation go-live* additionally waits on the Gateway sandbox surface
  (Phase 4) — its query/retrieval surface does not.

**Phase 4 — the SoD critical-infra trio (Gateway strictly last):**
- **CMDB** and **Vault** in **parallel** (CMDB depends only on Board escalation-intake; Vault on Board facts +
  auth). Then **Gateway** — strictly last, as it consumes Board `consume_approval` + CMDB verdict + Vault redeem.

**Independent track:** **pdf** — already built; run the §5.6 integration mini-stage before Phase-3 Drive/Notes
ship features that call it.

**D-17 posture across the SoD chain:** the model-driving MCP surfaces (Board, Notes) freeze schemas only
post-spike. **Every Critical-infra app enforces its boundaries in code, never model-trusted** — the Gateway's
four-check chain, CMDB's fail-closed evaluator, Vault's redeem pipeline, and Board's transition table each
hard-reject an invalid call regardless of what any (possibly hostile-model-driven) agent intends. The spike
validates the *agent's ability to drive* the strict-schema loop; it never relaxes the *server-side enforcement*.
Non-Board/Notes MCP apps (Chat, Drive, CMDB, Vault, Gateway, Library, MC) may freeze their schemas now within the
inherited schema-complexity ceiling (flat, ≤~6 args, enum-biased) and re-verify against the spike's validated
budget if it tightens.

---

## 8. Session boundary

Docs-only on `review/gotobuild-2`. No app planned or built; no `auth`/`proxy` code or app `src/` touched. New:
`context/CONTRACTS/cmdb-gateway-verdict-token.md`, this file. Updated: `context/CONTRACTS/README.md`,
`context/specs/IDENTIFIERS.md`, `context/specs/DEPLOYMENT.md`. Operator reviews + merges.
