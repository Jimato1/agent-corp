# Stage 2 Planning — `cmdb` Inventory + Policy Brain (Critical-infra)

> **Inputs consumed (binding, in authority order):** `context/specs/IDENTIFIERS.md`, `context/specs/TICKET_STATE_MACHINE.md`, `context/specs/DEPLOYMENT.md`; `context/CONTRACTS/cmdb-gateway-policy.md` (FROZEN, incl. ratified D-6 §6 duties), `context/CONTRACTS/cmdb-library-hostfacts.md` (FROZEN in shape), `context/CONTRACTS/auth-apps-tokens-scopes.md` (FROZEN; **§8 pinned holder-scope claim shape consumed VERBATIM**), `context/CONTRACTS/gateway-cmdb-library-sandbox.md` (**Gateway half §G FROZEN 2026-07-03; CMDB half §C filled BY THIS SESSION** per ratified D-7), `context/CONTRACTS/README.md` (registry owner assignments); `apps/gateway/planning/PLAN.md` §3/§10/§16 (the Gateway Stage-2 asks A4/A5 that landed mid-wave); `context/MERGE_REVIEW_1.md` §6 CMDB register; `context/RATIFICATIONS_2026-07-02.md` (D-6, D-7, D-14, D-15, D-17); `apps/cmdb/research/RESEARCH.md`.
>
> **Design principle (engineering discipline):** the CMDB is a **Policy Decision Point the Gateway trusts to fail closed**. Every verdict is deterministic, derived exclusively from CMDB's own authoritative facts — never from agent-supplied inputs. A missing, stale, ambiguous, or unparseable fact **denies**; it never defaults open. The CMDB's SoD posture is *veto, not trigger*: a fully compromised CMDB returning `permit` for everything still causes zero destructive actions (it holds no ticket, no credentials, no execution path), and this plan preserves the two hardenings that make that claim honest — the destructive-never-auto floor held independently at Board/Gateway, and Gateway-derived `action_class`.

---

## 0. Stage-2 obligation — RESEARCH.md re-checked against the frozen contracts + tier-1 specs

Per `apps/cmdb/CLAUDE.md` (the `/_context/` path-bug flag) and MERGE_REVIEW_1 §6, RESEARCH.md was re-read against the frozen contracts before planning hardened. Findings, with the contract side winning in every case:

| # | RESEARCH.md said | Frozen contract says | Resolution in this plan |
|---|---|---|---|
| R1 | §6 verdict variants (`next_window_open`, `timezone`, etc.) | `cmdb-gateway-policy.md` §1: one canonical shape; "the §6 field variants are dead" | Canonical shape adopted verbatim (§3.2); MCP tools return the same shape |
| R2 | scope `cmdb:read` (also in `cmdb-library-hostfacts.md` §1 prose) | `auth-apps-tokens-scopes.md` §3 offers `cmdb:read-policy`; `svc:tier-approver` is already **registered** with `cmdb` → `cmdb:read-policy` (§9) | Countersign **`cmdb:read-policy`** as the one canonical read scope (§7.1). The hostfacts contract's "`cmdb:read`" is recorded as an erratum naming the same scope — one-line note at the seam, no shape change |
| R3 | "Planning is BLOCKED pending auth's locked identity model" | §8 pin (2026-07-02) freezes the holder-scope claim shape; kind-gating guarantees `cmdb:write-policy` is human-only | **Unblocked.** Inbound write-path validation implements the §8 algorithm verbatim (§6.1) |
| R4 | tier3 named "disposable/stateless (canary-eligible)" | policy contract §7 + sandbox contract: a **different concept** from the D-7 `disposable` class | tier3 renamed **`tier3 — stateless/canary-eligible`** (real, managed hosts). `disposable` is a separate, orthogonal **class axis** (§5) |
| R5 | task-type registry ownership "open"; no external-verifier attribute | CONTRACTS/README + policy contract §5: **CMDB owns it, including external-verifier binding** | Registry designed with the verifier binding (§4.4) |
| R6 | "must-fit" duration source undefined | policy contract §3: duration estimate comes from the playbook catalog entry | `duration_estimate` is a CMDB-owned catalog **policy attribute** (§4.5) |
| R7 | fail-closed escalations vague ("surface as…?") | D-6c: they land as **Board escalations** | Durable escalation outbox → Board (§8) |
| R8 | host-facts duties (snapshot capability, timeouts, scan interval, mid-run close) absent | D-6 ratified: **now CMDB duties** | All four modeled (§2.2, §4.1, §4.3) |
| R9 | *(mid-session)* research/§5-draft assumed the sandbox contract was still a SKETCH to negotiate | **Gateway Stage-2 (2026-07-03) froze its half §G** while this session ran: `run_sandbox_test` (no host param), `gateway:sandbox` scope, the **`sandbox_exec` 7th action class valid only on the sandbox branch**, verdict query `{host_id=<pool id>, action_class=sandbox_exec}`, "set the class to deny = the operator's sandbox kill knob" | §5 aligned to §G verbatim; §C filled by this session and the contract re-issued FROZEN |

No contradiction survives into the data model or API surface below.

---

## 1. Store classification and the canonical/index decision

Research open question #3 (never let a stale async index answer the gate) is settled as follows:

- **Policy is canonical in a git-backed markdown repo** (`cmdb_policy` volume — its own git repository with a **configured remote**; ARCHITECTURE §10 makes a local-only `.git` a build failure for a canonical store). Tier catalog, per-host policy, windows/freezes, task-type registry, catalog policy attributes, sandbox pool — all operator-authored markdown with schema-validated YAML frontmatter.
- **The gate never reads the repo asynchronously.** The decision path reads a **write-through, in-process policy snapshot**: every accepted write is one transaction — validate → write markdown → git commit → parse → **atomic snapshot swap**. The snapshot records the commit hash it was built from; `policy_version` in every verdict is that hash. On boot the snapshot is parsed from HEAD before serving. There is no async reindex on the gate path, and no materialized-occurrence cache anywhere: `in_window` is resolved **live** from RRULE+TZID at query time (microseconds at ~20 hosts).
- **Boot/restore integrity detector (the teeth of the restore rule — AR cluster D):** on every boot, before serving, the CMDB verifies (a) repo HEAD == the `git_commit` at the tip of the hash-chained `policy_change_log` (catches either volume rolled back independently), and (b) local HEAD is present on the configured remote (catches both volumes restored together — the one marker that lives *outside* the restored set). Any mismatch, parse failure, schema violation, or inability to complete the checks ⇒ the evaluator serves **`deny(policy_unavailable)`** + escalation until the operator's **step-up-confirmed** acknowledgment (§6.3 ceremony) re-arms serving. A restore is therefore *detected*, not assumed announced; a restored-older `policy_version` additionally shows in every verdict and both decision logs. Restore is drilled at Stage 7.
- **SQLite (`cmdb_data` volume) holds four stores, classified honestly (ARCHITECTURE §10):**

| Store | Class | Notes |
|---|---|---|
| `inventory_facts` (Wazuh-synced mirror, every synced field provenance-tagged `host-originated`) + `discovered_agents` | rebuildable | canonical source is Wazuh + operator-authored host files; blow away and re-sync freely |
| policy query index (projection of the snapshot) | rebuildable | serves list/filter reads only, **never** the verdict |
| `decision_log` | **CANONICAL, append-only** | every issued verdict (contract §3 duty — mirrored at the Gateway) |
| `policy_change_log` | **CANONICAL, append-only, hash-chained** | the §12 tamper-evidence chain (§6.3) |

- **Backup (stated, non-optional):** policy repo pushes to its remote per §6.3's push rules; nightly SQLite snapshot of the two canonical logs to the suite backup target.

---

## 2. Data model — inventory

### 2.1 Host identity (IDENTIFIERS.md, consumed verbatim)

- `host_id`: **CMDB-minted**, lowercase DNS-safe slug, the inventory PK. Minted **only by an operator action** (never auto-minted from discovery). Never reused, never re-minted after retirement.
- Wazuh `agent.id`: stored as an attribute in the **CMDB-owned mapping table**, set at operator-confirmed enrollment, never used as host identity, never fuzzy-matched (agent name/registerIP are attacker-influenceable at enrollment). **Every bind and rebind is an operator-confirmed, change-logged event.**
- One physical host = one canonical record: aliases (hostname/IP variants) resolve to one `host_id` **before** any policy lookup (the research's aliasing leak, closed structurally).

### 2.2 Host record

```yaml
# hosts/<host_id>.md frontmatter (canonical, operator-authored)
host_id: nas-01
class: managed            # managed | disposable — IMMUTABLE after creation (§5)
tier: tier0               # ref into the tier catalog; absent ⇒ synthetic 'unpolicied' sentinel
overrides: {}             # per-action_class auto|ask overrides (validator enforces the non-auto floor)
windows: []               # §4.3
snapshot_capability: none # D-6a: btrfs | lvm | zfs | none — 'none' routes to ask-tier/manual at the Gateway.
                          # POLICY, not a fact: any edit away from 'none' is a gate-weakening edit (§6.2)
facts_override: {}        # for non-agent assets: os_family/distro/version/arch authored here (provenance: operator)
wazuh: {agent_id: "007", bound_at: ..., bound_by: ...}   # mapping attribute, operator-confirmed
```

- **Inventory is a superset:** Wazuh-discovered hosts ∪ operator-authored non-agent assets (NAS, hypervisors, network gear). Synced facts (os, ip, liveness, `syscollector_scan_interval` — D-6c) live in the rebuildable mirror keyed by `host_id`; the sync **never writes policy**. Every synced field carries a `host-originated` provenance tag at write time (ARCHITECTURE §12 — a managed host controls its own Syscollector output), surfaced in `get_host` and escalation payloads.
- **Onboarding lifecycle (closes gap 7.3):** `discovered` (row in `discovered_agents`; **no host record exists yet**) → operator binds to an existing `host_id` or mints a new one → **`unpolicied`** (synthetic always-deny sentinel — not a tier, not editable into one; fires the D-6c *needs-tiering* Board escalation) → `policied/active` → `stale` (gone from Wazuh: verdicts unaffected — policy is CMDB's own fact; flagged + escalated after a threshold) → `retired` (operator archive; terminal; `host_id` never reused). Wazuh group membership is a **UI-only tiering suggestion** requiring explicit operator commit.

---

## 3. The verdict — producer side of `cmdb-gateway-policy.md` (FROZEN; implemented exactly)

### 3.1 Endpoint

`POST /v1/decision` — the **binding** call (Gateway per its PLAN §3 check-2b; `svc:tier-approver` for auto-tier clearing). Audience `cmdb`, scope `cmdb:read-policy`. The query is **subject-free** for authorization (the caller authenticates per the auth RS baseline, but *who is asking* never changes the verdict); the authenticated caller identity selects only the **verdict token's `aud`** (§3.4) and the audit row.

Request, per contract §1 verbatim: `{host_id (required), action_class (required), at? (advisory — CMDB evaluates on its OWN clock), ticket_ref? (audit correlation ONLY)}`, plus **`req_nonce?` (optional additive, proposed at §11-A5):** caller-minted, echoed into the signed verdict — per-request freshness the Gateway is asked to adopt at countersign (its frozen check-2b already verifies signature + `decision_id` + expiry; the nonce is additive and contract-scoped, to be listed in IDENTIFIERS.md's deliberately-NOT-registered set on adoption).

### 3.2 Response (contract §1 canonical shape, verbatim) and field semantics

`{verdict ∈ {deny, ask, permit}, in_window, window_id, window_opens_at, window_closes_at, seconds_remaining, grace, active_freeze?, tier, approval_mode ∈ {auto, ask}, decision_id, evaluated_at, valid_until, policy_version, tzid, reason[]}` — plus additive fields `host_class ∈ {managed, disposable}` and `verdict_basis ∈ {policy, sandbox_carve_out}` (required by the now-frozen sandbox seam so the Gateway mechanically segregates its two execution surfaces; countersign package §11-A5).

Field semantics pinned here (AR clusters F/G — previously undefined corners):

- **`effective_close` rule:** the window evidence is computed over the full deny-overrides lattice — `effective_close = min(close of the covering allow window, start of the next freeze that will cover the host)`. `window_closes_at`, `seconds_remaining`, and `valid_until` all derive from `effective_close`, never from the allow window alone — a freeze starting mid-window can never be invisible inside a verdict's validity.
- **`in_window` means "cleanly enterable at T":** T ∈ `[start, effective_close − grace)` with fold/gap-clean local mapping. A denial caused only by the grace zone carries `reason: [grace_zone]` with the raw window evidence intact, so the Gateway can distinguish grace-denial from genuinely-closed. The contract's deterministic mapping is unchanged over this definition.
- **No-applicable-window rendering** (hard denies, and the §5 carve-out): `window_id/window_opens_at/window_closes_at/seconds_remaining/tzid: null`, `grace: 0`, `tier: null` where no tier applies; `valid_until = evaluated_at + 60s` (the degenerate arm of the §3.4 formula, stated explicitly).
- `reason[]` entries are **CMDB-authored enum codes + parameters**, never free text copied from host-originated sources (ARCHITECTURE §12 — no Wazuh-originated string ever rides a verdict).

Deterministic mapping (contract §1): `not in_window → deny`; `in_window ∧ auto → permit`; `in_window ∧ ask → ask` (**"ask" is NOT an approval** — it defers to the Board's `awaiting_approval` gate; the CMDB reports approval *mode*, never approval *state*).

### 3.3 One pure evaluator, three callers

A single side-effect-free `evaluate(host_id, action_class, t) → verdict-struct` is the only decision code path, called by: (1) `POST /v1/decision` (binding), (2) every advisory MCP tool (§7.2), (3) the operator dry-run/explain screen (§7.4). Byte-identical answers — this *is* "two views, one state" for the CMDB.

Evaluation order — **universal preconditions run before ANY branch; the class fork substitutes only window/floor/approval semantics, never input validation or environment health** (AR cluster A):

1. Resolve `host_id` against the snapshot → unknown ⇒ `deny(no_such_host)`.
2. Snapshot healthy + `policy_version == HEAD` + boot-integrity checks passed (§1)? no ⇒ `deny(policy_unavailable)` + escalation.
3. `action_class` ∈ the **seven-value** CMDB-owned enum (§4.2)? no ⇒ `deny(bad_action_class)`.
4. Clock health (§3.5) fails ⇒ `deny(clock_unsafe)` + escalation.
5. **Class fork** (keyed on the **stored** class, never any request input):
   - `disposable` ⇒ the §5 carve-out branch: require `action_class == sandbox_exec` (any real class on a sandbox target ⇒ `deny(wrong_target_class)`); §5 record-consistency checks; pool kill-knob enabled (else `deny(sandbox_disabled)`); then `permit`/`auto` with `verdict_basis: sandbox_carve_out`.
   - `managed` ⇒ `action_class == sandbox_exec` is invalid on real hosts ⇒ `deny(wrong_target_class)`. Host at the `unpolicied` sentinel ⇒ `deny(no_policy)` — uniformly; there is no "at most ask". Then:
6. Window algebra (§4.3, managed only): expand RRULE **live** in the host's IANA zone; PEP-495 fold/gap on START, END, and T ⇒ ambiguous/nonexistent = not-cleanly-in-window ⇒ `deny(dst_unresolvable)` + **observable** Board escalation; half-open `[start, end)`; **deny-overrides** (any active freeze beats any allow) with `effective_close` per §3.2; grace zone ⇒ `deny` with `reason: [grace_zone]`. Overlapping/ambiguous window configurations resolve most-restrictive **and fire the `window_ambiguity` Board escalation** (deduped per host+window pair) — the contract §2 attaches the observable escalation to this row too, not only to DST/clock.
7. Approval mode (managed only): `host.overrides[action_class] ?? tier_default[tier][action_class] ?? ask`, then forced to `ask` unless the class has a catalog playbook that **currently exists AND declares a rollback path** (re-checked live at evaluation — a catalog change instantly demotes `auto`).
8. Compose verdict per the deterministic mapping; append to `decision_log`; sign (binding endpoint only).

The **destructive-never-auto floor** — `{reboot, kernel_update, destructive}` can never resolve `auto` on a `managed` host — is enforced twice: the schema validator refuses authoring such a cell, and `evaluate()` re-asserts it at decision time. The same floor is independently held at Board/Gateway per contract §4 (the Gateway's own floor check is its PLAN §3 check-2a); CMDB's copy is defense-in-depth and the **strictest layer** — layers compose deny-biased, so they need not be identical. The floor may only ever **grow** via CMDB-side change control; shrinking it is a cross-app contract amendment by construction.

### 3.4 Verdict integrity (contract §3 — format proposed here; countersign package §11-A5)

- The binding response is a **JWS (EdDSA/Ed25519)**, `typ: "cmdb-verdict+jws"`, claims = the §3.2 struct plus `iss: "cmdb"`, `jti: decision_id`, `exp: valid_until`, `nonce: req_nonce` (when supplied). **`aud` is set from the authenticated caller** — `svc:gateway` ⇒ `aud: "gateway"`, `svc:tier-approver` ⇒ `aud: "board"`; any other caller gets the unsigned advisory shape only (AR cluster H: the Board's routine auto-tier reads must never mint Gateway-redeemable tokens into Board hands).
- Signed with a **CMDB-local key** — deliberately NOT auth's key: the veto must not share a trust root with the identity plane. Public keys served at `GET /v1/verdict-jwks`; rotation is a change-controlled, logged event; consumers pin acceptance to keys from that endpoint fetched over the authenticated channel.
- `valid_until = min(evaluated_at + 60s, effective_close − grace)`, with the no-window arm `= evaluated_at + 60s` — a conservative **re-query deadline**, never a cross-clock computation. The countersign pins that the Gateway validates `exp` with **zero clock-skew leeway** (or CMDB pre-shrinks by the agreed bound), so `valid_until + ε` on the Gateway's clock cannot act. The Gateway re-queries at the instant of execution/redemption (TOCTOU rule, contract §3) and never accepts an agent-relayed verdict.
- **Advisory MCP responses are the same JSON shape, unsigned** — mechanically unusable at the Gateway (no signature, wrong/no `aud`, no nonce).
- Every issued verdict (binding *and* advisory) is appended to the CMDB `decision_log`; the Gateway mirrors its own (contract §3).

### 3.5 Clock integrity

Single authoritative clock: the CMDB evaluates on its own NTP-disciplined clock (`at?` is advisory for planning probes only). Health check: NTP sync state + measured offset within a bound (default ±2s) + monotonic-clock cross-check, evaluated with a freshness bound and a hard timeout (a hung check = an unhealthy clock, fail-closed); failure ⇒ `deny(clock_unsafe)` + escalation. This gate runs **before the class fork** (§3.3 step 4), so no verdict — sandbox verdicts included — is ever signed with an `exp` derived from a clock the evaluator would have declared unsafe. `tzdata` ships in the container.

### 3.6 Fail-closed matrix (contract §2, implemented exactly — plus CMDB-internal rows)

| Condition | Verdict |
|---|---|
| unknown `host_id` | `deny(no_such_host)` |
| known host, no policy (`unpolicied` sentinel) | `deny(no_policy)` |
| unknown/malformed `action_class` — **any host class, checked before the fork** | `deny(bad_action_class)` |
| `sandbox_exec` on a managed host / real class on a disposable host | `deny(wrong_target_class)` |
| clock skew / unhealthy or unverifiable clock | `deny(clock_unsafe)` + escalation |
| DST fold/gap on START/END/T | `deny(dst_unresolvable)` + escalation |
| overlapping/ambiguous windows | `deny` (most-restrictive-wins) + `window_ambiguity` escalation |
| grace zone (T within `grace` of `effective_close`) | `deny`, `reason: [grace_zone]`, raw window evidence retained |
| snapshot unhealthy / parse failure / HEAD mismatch / boot-integrity unverified | `deny(policy_unavailable)` + escalation |
| disposable-host consistency violation (§5) | `deny(sandbox_config_error)` + escalation |
| sandbox pool kill-knob off | `deny(sandbox_disabled)` (operator-intentional; no escalation) |
| CMDB unreachable | *(Gateway side, contract §2)* absence of affirmative permit = deny; CMDB downtime halts destructive throughput **by design** — no HA in v1 (homelab; safe-when-down) |

---

## 4. Data model — policy

### 4.1 Tiers (four, NCSC control-strength semantics) — `tiers/<tier>.md`

`tier0 — irreplaceable/root-of-trust` (includes the SoD-chain hosts: auth, Vault, Gateway, CMDB itself; every cell `ask`), `tier1 — critical service`, `tier2 — standard`, `tier3 — stateless/canary-eligible` (**real managed hosts** — renamed from research's "disposable" to kill the D-7 conflation). Each tier carries: the default `{action_class → auto|ask}` row (floor-validated), and the **D-6b per-tier health-check / wait-for-SSH timeout policy** `{health_check_timeout_s, ssh_wait_timeout_s}` consumed by the Gateway via `get_host_policy` (its PLAN §6 reads these verbatim). The `unpolicied` sentinel is **synthetic** — not a file in the tier catalog, not referenceable, not editable.

### 4.2 Action classes (CMDB-owned enum, contract §4 + sandbox contract §G5.4)

**Seven values:** `package_update, config_change, service_restart, reboot, kernel_update, destructive` (the six real classes, contract §4 verbatim) **+ `sandbox_exec`** (the 7th class, frozen by the Gateway's §G: valid **only** on the disposable branch — real-catalog playbooks never carry it, sandbox profiles carry only it, and the non-auto floor for the six real classes is untouched by its existence). Extensible **only** via policy-plane change control; **adding an enum value is itself a statically-weakening edit** (§6.2). Kernel/bootloader/init/libc updates are `kernel_update` (never `package_update`) — the playbook→class binding lives in the catalog (§4.5) and is **derived by the Gateway from the playbook, never accepted from the agent** (the SoD invariant, contract §4; the Gateway's PLAN §3 check-2a implements the derivation as "worst class across invocations").

### 4.3 Windows and freezes (research §4 recommendation, made schema)

```yaml
windows:
  - id: w-sun-night          # window_id, contract-scoped (deliberately NOT in IDENTIFIERS.md)
    kind: allow              # allow | freeze
    rrule: "FREQ=WEEKLY;BYDAY=SU"   # enforced ALLOWLIST: FREQ ∈ {DAILY,WEEKLY,MONTHLY}, INTERVAL, BYDAY, BYHOUR, BYMINUTE, UNTIL(UTC only)
    start_local: "22:00"     # local wall-clock anchor (RFC 5545 Form #3)
    end_local: "02:00"       # SECOND local anchor — never an exact PT duration (the fall-back shrink bug).
                             # end_local ≤ start_local ⇒ the end anchor resolves on the occurrence's NEXT
                             # calendar day (RFC 5545 DTEND-after-DTSTART semantics); fold/gap is applied to
                             # the RESOLVED next-day instant. Validator fixtures cover overnight windows
                             # whose next-day end crosses a DST transition.
    tzid: "Europe/Oslo"      # explicit IANA zone; stored local, computed at query time — never precomputed UTC
    grace_minutes: 15        # don't-start-within-N-of-close; carried in the verdict as `grace`
    on_window_close: abort_and_rollback   # D-6d: abort_and_rollback | finish_current_step — POLICY the Gateway
                             # reads for mid-run semantics (its PLAN §7); loosening it is a weakening edit (§6.2)
```

- Unsupported RRULE parts (`BYSETPOS`, `RDATE`, `EXDATE`, `COUNT`, …) are **rejected at schema level**.
- One-off exceptions/emergency windows are first-class one-shot records (bounded start/end, same fields, no rrule), the only kind break-glass may mint (§6.4).
- Precedence lattice: **allow < freeze < break-glass**; break-glass-over-freeze requires the louder confirmation (§6.4). Evaluation: `in_window(T) := any(allow covers T) AND NOT any(freeze covers T)`, with `effective_close` per §3.2, unless an unexpired break-glass window covers T (its record notes whether it was confirmed to override a freeze).
- **Full-shadow detection at authoring time:** the §6.3 blast-radius preview, plus a periodic sweep, detects allow windows entirely shadowed by freezes and fires `window_ambiguity` — the escalation must not depend on someone querying first.
- Implementation: `dateutil.rrule` expanded in the host's zone, occurrences + T normalized through `zoneinfo` (PEP 495); fold/gap on START, END, or T ⇒ fail-closed + escalate. No window on file ⇒ never in-window for window-gated classes (always-refuse default, research Q9).

### 4.4 Task-type registry (CMDB-owned — CONTRACTS/README assignment)

`task-types/<type_key>.md`: `{type_key, title, destructive: bool, reversible: bool, action_class (default binding), external_verifier: none | wazuh_states_disappearance | <registered>, verification_window_s, notes}`. Consumers: **Board triage** (derived reversibility, external-verifier presence — two of its five ratified D-2 signals; plus catalog novelty via §4.5) and the auth PDP. Read surface: `GET /v1/task-types` + MCP `list_task_types`. Mutations operator-only; weakening reclassifications **and permissive creations** (§6.2) fall under change control. The Board-side read contract freezes at Board Stage-2 (§11-A7).

### 4.5 Runbook catalog — policy attributes (CMDB-owned; implementations are Gateway's)

`catalog/<playbook_key>.md`: `{playbook_key (Gateway-owned key, stored verbatim), action_class (the fixed playbook→class binding), risk_class, applicable_tiers, rollback_declared: bool, rollback_method, duration_estimate_s (the must-fit input, contract §3; the Gateway also derives its hard wall-clock cap from it), sandbox_eligible: bool}`. A matrix cell can resolve `auto` only while a catalog entry for that class exists with `rollback_declared: true` (§3.3 step 7). The Gateway refuses any `playbook_key` CMDB has no attributes for (its PLAN §4.1) — so **catalog-entry creation is itself gate-relevant** and classified accordingly (§6.2). Catalog **novelty** (no entry) is the Board triage signal.

---

## 5. The D-7 `disposable` sandbox class — CMDB's half (§C) of `gateway-cmdb-library-sandbox.md`, FROZEN by this session

The Gateway's half (§G, frozen 2026-07-03) fixed the seam's shape; this half completes it. The contract file's §C is filled with the following, and the doc re-issued **fully FROZEN**:

1. **Class axis:** `class ∈ {managed, disposable}` is a top-level host attribute, orthogonal to tier — a disposable host has **no tier at all** (nothing to downgrade, nothing to leak through the tier catalog). `class` is **immutable** — no edit path exists; "reclassification" = retire + create, both change-controlled.
2. **Registration:** disposable targets are a small **static, operator-registered pool** (`sandbox/pool.md`), each slot a normal CMDB-minted `host_id` (e.g. `sbx-01` — naming is display convention only; the class attribute is the authority, per IDENTIFIERS.md rule 4). Creating a slot is a **gate-weakening edit** (step-up ceremony). This matches §G4: the Gateway's tool has *no host parameter* — the Gateway maps runs to pool slots itself and queries the verdict as `{host_id: <pool id>, action_class: sandbox_exec}`; per-container ephemeral identity is Gateway-internal and never becomes a CMDB host. **Dynamic machine registration of disposable hosts does not exist and is rejected as designed.**
3. **Policy semantics:** after the §3.3 universal preconditions (host resolution, snapshot health, **action_class enum validation, clock health** — the carve-out substitutes only window/floor/approval semantics, never input validation or environment health), a disposable host with `action_class == sandbox_exec` returns `permit`/`auto`, `verdict_basis: sandbox_carve_out`, `host_class: disposable`, `in_window: true`, and the §3.2 no-window field rendering (`window_id..tzid: null`, `grace: 0`, `tier: null`, `valid_until = evaluated_at + 60s`). Verdicts are signed, logged, and TOCTOU-re-queried like every other verdict.
4. **The operator's sandbox kill knob (§G3):** `sandbox/pool.md` carries `enabled: true|false`. Disabling is an instant, ceremony-free **tightening** edit (every sandbox verdict becomes `deny(sandbox_disabled)`); re-enabling is a weakening edit (step-up). The global kill switch additionally covers sandbox execution at the Gateway chokepoint (killswitch-chain §5) — the knob is the policy-plane stop, not a second enforcement point.
5. **Non-leak invariants (CMDB side, all structural):** (a) the carve-out branch is selected **only** by the stored class attribute — never by any request input, never by tier, never by an override; (b) `sandbox_exec` is rejected on managed hosts and every real class is rejected on disposable hosts (`wrong_target_class`, both directions — §G5.4's "valid only on this branch" enforced at the PDP too); (c) a disposable record carrying any window, override, tier ref, or Wazuh bind is a config error ⇒ `deny(sandbox_config_error)` + escalation (fail-closed *inside* the carve-out); (d) disposable hosts are excluded from managed-fleet policy queries by default and always flagged in `list_fleet`; (e) the verdict's `host_class`/`verdict_basis` fields let the Gateway cross-check surface segregation — `run_sandbox_test` requires `host_class == disposable`; `execute_approved_plan` refuses it (both sides check; §G5 barriers 1–5 stand independently).
6. **No Vault credentials:** disposable slots never have credential handles provisioned (`cred://hosts/<host_id>/…` stays empty for them) — the Vault-side duty is stated in the joint contract; the Gateway's sandbox branch is structurally Vault-free (§G3).
7. **Verdict signing format:** §3.4 (Ed25519 JWS, `aud: "gateway"`, `jti = decision_id`, `exp = valid_until`) — the co-design item the Gateway's A4 asked for; final countersign in the §11-A5 package.

---

## 6. Policy-plane change control (ARCHITECTURE §12 — Critical-infra rigor)

### 6.1 The write path (auth §8 pin, consumed verbatim)

Every mutation of policy, registries, binds, or sandbox pool requires **`cmdb:write-policy`** — a HOLDER scope, **human-only by auth's compiled-in kind-gating** (`auth-apps-tokens-scopes.md` §3/§8: no machine principal can ever mint it). CMDB validates inbound holder tokens with the §8 algorithm **verbatim**: JWS parse + `kid` ∈ currently-served JWKS; `iss` equality (RFC 9207); `exp`/`nbf` ≤60s skew; `aud == "cmdb"` single-valued; `scope ∋ cmdb:write-policy` (honored ONLY with `aud == cmdb`); **mandatory `cnf`** sender-constraining proof (DPoP `jkt` default / mTLS fallback — no proof, no validity); **sod-critical LIVE check** — authoritative denylist read (`jti` + `sub` + `kid` + kill level), fail-closed, never cached; drift bound D = 1s at the commit instant. **Transport note (AR cluster I):** the authoritative live check is implemented behind the same transport seam as the budget middleware (direct Redis vs an auth-exposed check API) pending **root-review-#2** — DEPLOYMENT §3 currently makes auth's Redis auth-private, so the binding is deferred, not assumed (§11-A11). Defense-in-depth beneath auth's kind gate: the write path additionally **rejects any non-`op:*` principal by construction** (principal-class check on `sub` — not merely absence-of-scope), and the agent-facing MCP server **contains zero mutation verbs** (structural absence, §7.2).

### 6.2 Weakening classification (deterministic, fail-closed — AR clusters B/C: the classifier itself must not default open)

Design rule, stated first: **any field a consumer (Gateway, Board, auth PDP) reads for routing, rollback, mid-run behavior, or triage is policy, not "facts"** — its permissive direction must be caught below, and **an edit the classifier cannot prove non-weakening is treated as weakening** (the classifier fails closed, like everything else here). Three layers:

1. **Derived-effect diff (primary):** after computing the proposed snapshot, re-run `evaluate()` across the full (host × action_class) matrix and diff `verdict`/`approval_mode` against the pre-edit snapshot, together with the Gateway-visible routing facts (`snapshot_capability` forced-manual routing, `on_window_close`, tier timeout policies) and Board-visible triage attributes (task-type destructive/reversible/verifier). **Any cell or consumed fact moving toward permissive ⇒ weakening**, regardless of which file/row/registry caused it — this catches creations, rebindings, and deletions-that-unblock that row-delta rules miss (e.g. a *new* catalog entry born `rollback_declared: true` flipping a cell auto-eligible; a *new* task type born `destructive: false, external_verifier: none`).
2. **Structural window rule (horizon-free):** any **new allow window**; any allow-window mutation (rrule/start/end/tzid/UNTIL) not **provably coverage-non-expanding over all time** — decidable symbolically under the enforced RRULE allowlist, and where not provable, weakening by default; any UNTIL extension/removal; any freeze removal/narrowing; any `grace` reduction. A finite occurrence expansion (90 days) is used **only** for the human-readable blast-radius preview, **never** as the classifier — added coverage beyond any sampling horizon must still classify (the horizon-bypass finding).
3. **Static kind list (belt-and-braces, all weakening):** tier downgrade; any `ask → auto` flip; floor-set shrink attempt (**rejected outright**); `on_window_close` toward `finish_current_step`; `snapshot_capability` away from `none` (or to a value the sync mirror does not corroborate); task-type reclassify toward reversible/less-destructive, verifier unbinding, **task-type creation with any permissive attribute**; **action-class enum addition**; catalog `rollback_declared` false→true, **catalog-entry creation/`action_class` rebinding/deletion-that-removes-a-block**, `applicable_tiers` widening, `duration_estimate` changes (both directions feed must-fit and the Gateway's wall-clock cap); disposable-slot creation, pool re-enable; Wazuh bind/rebind; verdict-signing-key rotation; break-glass (§6.4).

Tightening, prose, and non-consumed fields are normal audited edits.

### 6.3 The gate-weakening ceremony (tamper-evident + step-up-confirmed)

Two-phase commit, CMDB-local in v1:

1. `propose` → CMDB computes the typed diff + classification + a **blast-radius preview** ("this edit makes N (host × class) cells auto-executable; these J hosts gain window coverage; full-shadow warnings"), returns `confirm_token` (single-use, TTL 5 min, **bound to the sha256 of the exact rendered diff**).
2. `confirm` → must present the same holder-token identity (`sub` + `cnf`-bound), the `confirm_token`, and re-typed intent; the §8 live-check re-runs at this instant. Any drift between propose and confirm (diff-hash mismatch, snapshot moved) ⇒ start over.

Tamper evidence and durability (AR cluster E — push is part of the acceptance semantics, not best-effort):

- Append-only **hash-chained `policy_change_log`** row `{seq, prev_hash, hash, ts, sub, jti, session, edit_kind, weakening, diff_hash, git_commit, confirm_token_id}`; git commits carry the operator `sub` + auth session id as trailers.
- **For gate-weakening edits, push success to the configured remote is a precondition of the edit taking effect**: commit → push → only then snapshot swap; push failure ⇒ the swap does not happen, the commit is rolled back/parked, and the edit is refused with a clear error. A weakening edit can never be live while its out-of-band evidence anchor exists only on the possibly-compromised box.
- Non-weakening edits may take effect on push failure, but the CMDB then enters **degraded**: further weakening edits are refused and a `policy_integrity_error` escalation fires until local HEAD is confirmed present on the remote.
- The chain is verifiable **out-of-band** (operator reads `git log` on the remote, never through the possibly-lying CMDB UI — the research's "CMDB can lie to the operator" finding). A genuine auth-side step-up (fresh `acr`/re-auth claim) is **not in the pinned §8 claim set**, so v1 does not pretend to have it; the auth upgrade is a recorded ask (§11-A9). Chain-HEAD anchoring to MC (mirroring `gateway-mc-audit-anchor.md`) is deferred until that pattern is offered to Standard/Critical peers (§11-A10).

### 6.4 Break-glass

Operator-only (`cmdb:write-policy` + the §6.3 ceremony with a **distinct, louder confirmation** — explicit "this overrides an active freeze" re-type when applicable, per the allow < freeze < break-glass lattice). Mechanically: mints only a **one-shot bounded emergency window** (schema-enforced hard cap ≤ 4h, auto-expiring — no open-ended state exists to forget) or a time-boxed tier exception with the same cap; **never** touches the non-auto floor. Every invocation auto-files the D-6c **post-hoc review Board escalation** and writes a distinct `edit_kind: break_glass` chain entry. Never agent-reachable (holder scope + human kind-gate + principal-class check).

---

## 7. Surfaces — two views over one state

### 7.1 Auth countersign — the `cmdb` scope slice (this section IS the countersign; ledger row flipped this session)

| Scope | Surface | Grantable to | Action class | Notes |
|---|---|---|---|---|
| `cmdb:read-policy` | all MCP tools (§7.2), `POST /v1/decision`, `GET /v1/hosts/{id}/facts`, `GET /v1/task-types`, catalog reads | all agent roles + operator + `svc:tier-approver` (registered §9) + `svc:gateway` (**grant already requested by Gateway Stage-2 §16-A5** — countersigned here) + Library's caller (**ask**, §11-A3) | read | the ONE canonical read scope (resolves the `cmdb:read` naming drift, §0-R2) |
| `cmdb:write-policy` | every mutation: policy edits, tier/task-type/catalog registries, binds, sandbox pool, break-glass | **human operator principals ONLY** (auth compiled kind-gate; consumed per §8 pin) | sod-critical | HOLDER; §6.1 validation verbatim |
| `cmdb:manage` (**proposed new**, §11-A4) | sync-trigger, drift-ack, escalation re-send, discovery-queue grooming | operator (human) only | write-benign | keeps benign ops out of the sod-critical channel; mechanical additive registration (auth §7 note pattern: suffix ⇒ write-benign) |

**Risk / action-class manifest** (auth contract §1 Stage-2 deliverable): every `cmdb:read-policy` route/tool = `read`; every `cmdb:manage` route = `write-benign`; every `cmdb:write-policy` route = `sod-critical`. Nothing on this app is `destructive-exec` — the CMDB executes nothing. Unclassified ⇒ live-check fail-closed per the contract. RS baseline (JWKS ≤30s poll, RFC 9728 metadata, 401/403 semantics, budget middleware behind the root-review-#2 transport seam, `auth:revocations` subscription) implemented per contract §1; MCP authorization revision pinned **2025-11-25** (D-14 suite pin).

### 7.2 Agent MCP surface (read-only; flat, low-arity, enum-biased — inside the D-17 schema-complexity ceiling)

Ten tools, all side-effect-free, all ≤3 scalar/enum parameters, all backed by the one `evaluate()`/snapshot:

`is_actionable_now(host_id, action_class, at?)` *(the centerpiece — advisory §3.2 shape)* · `is_in_window(host_id, at?)` · `get_tier(host_id)` · `get_maintenance_windows(host_id)` · `get_host_policy(host_id)` *(full policy incl. D-6 timeouts + `on_window_close` + `snapshot_capability`)* · `get_host(host_id)` *(inventory facts, **provenance tags included** on every Wazuh-synced field)* · `resolve_host_facts(host_id)` *(the Library shape, §7.3)* · `list_fleet(tier?, class?, window_state?)` · `list_task_types()` · `get_catalog_policy(playbook_key)`.

**Zero mutation verbs exist on this server** — not scope-denied; absent. CMDB Stage-2 is not spike-gated (D-17 gates Board/Notes), but these schemas stay within whatever complexity the spike validates before any freeze is declared final.

### 7.3 Library host-facts — producer side of `cmdb-library-hostfacts.md` (FROZEN; implemented exactly)

`GET /v1/hosts/{host_id}/facts` (+ the MCP twin) → `{os_family, distro, distro_version, arch, package_manager?, eol_date?}` or `404 not_found`. Facts come from the Wazuh sync mirror, `facts_override` for non-agent assets; `eol_date` operator-maintained. **Inventory facts ONLY — never tier/window/credential/policy fields** (the seam must not widen). Read-only, side-effect-free, `Cache-Control: max-age=300`. Failure behavior is the consumer's (fail loud + open-but-flagged, contract §2) — the CMDB answers or 404s honestly, never guesses. **Proposed additive amendment (§11-A12):** a `facts_provenance` field distinguishing `host-originated` (Syscollector) from `operator` (`facts_override`) values, so the Library can weight its hard filter honestly; optional for the Library to adopt.

### 7.4 Human surface (operator UI — Stage-3 will spec screens fully)

Fleet list (tier badge, class flag, live window-state, mode, Wazuh status, staleness) · Host detail/policy editor (**the only writer**; weakening edits route through the §6.3 ceremony with the blast-radius preview) · Tier catalog · Task-type registry · Runbook-catalog policy attributes · Sandbox pool (incl. the kill knob) · Wazuh sync/reconcile + discovery queue (bind/rebind confirms; group suggestions clearly advisory) · Policy-change history (rendered from git; banner pointing to out-of-band `git log` verification) · **Verdict dry-run / "explain this verdict"** (same `evaluate()`, arbitrary `at`) · Break-glass console (distinct, loud) · Decision-log browser · Escalation outbox status.

---

## 8. Escalations → Board (D-6c) and the Wazuh sync

- **Escalation outbox:** durable table + retry loop → Board escalation intake. Kinds: `needs_tiering`, `dst_gap_window_never_opened`, `window_ambiguity`, `break_glass_posthoc`, `missing_from_wazuh`, `policy_integrity_error`, `clock_skew`, `sandbox_config_error`. Requires a **`svc:cmdb` service principal** (auth ask, §11-A2) and the Board's escalation-intake surface (Board Stage-2 dependency). Until both exist: escalations queue locally, surface loudly in the UI, and the app runs **degraded-but-honest** (flag, never drop). Escalation payloads **provenance-tag** any host-originated strings (ARCHITECTURE §12).
- **Wazuh sync (read-only discovery feed):** poll every 10–15 min with a dedicated Wazuh RBAC account holding only `agent:read`, `syscollector:read`, `group:read`. `POST /security/user/authenticate?raw=true` → `GET /agents` (+ per-agent `/syscollector/{id}/os`, `/hardware`) → three-way reconcile (new ⇒ `discovered_agents` queue, never a host; gone ⇒ `stale` flag + escalation after threshold; drift ⇒ update facts, log diff, **never touch policy**). Captures the **Syscollector scan interval** (D-6c fact). Wazuh 4.14.x; startup version probe refuses/branches on 5.x (matching the connector contract posture). Sync failure ⇒ stale-flagged mirror; **verdicts are unaffected** (policy is CMDB's own fact — a Wazuh outage must not halt the gate, and equally can never open it). Credential sourcing: the Wazuh read-only secret is a secret, not config — **ask** raised for a `svc:cmdb` static-secret read path at Vault Stage-2, with operator-provisioned env secret as the explicit interim posture (§11-A8).

## 9. Deployment (per DEPLOYMENT.md — cited, not restated)

Container `cmdb`, network `edge` only (**never `creds`**), internal port **8080**, no host ports, subdomain == audience == service == `cmdb`, auth resolved at `auth:8089`. Volumes: `cmdb_data` (SQLite), `cmdb_policy` (git repo **with configured remote**). Env prefix `CMDB_`. Python 3.12 + `python-dateutil` + stdlib `zoneinfo` + bundled `tzdata` (research §4 stack; exact pins re-verified at build per the research's Verify-at-build list). No sidecars requested.

## 10. Build sequencing (Stage 4, API-first)

1. Policy store: markdown schema + validator (floor, RRULE allowlist, overnight-window rule, class immutability) + git plumbing + write-through snapshot + boot-integrity detector.
2. `evaluate()` + window algebra (DST fold/gap + overnight + freeze/effective_close test matrix as first-class fixtures) + decision log.
3. `POST /v1/decision` + verdict signing + JWKS endpoint.
4. Host-facts endpoint (§7.3) + task-type/catalog read APIs.
5. MCP read surface (10 tools) over the same evaluator.
6. Write path: §8-pin validation + three-layer classifier + change-control ceremony + break-glass + change-log chain + push-precondition semantics.
7. Wazuh sync + discovery/bind lifecycle + escalation outbox.
8. Operator UI.

---

## 11. Dependencies raised / asks (none block Stage 3; each names its owner)

| # | Ask | Owner / when |
|---|---|---|
| A1 | `svc:gateway`: `cmdb` → `cmdb:read-policy` — **already requested by Gateway Stage-2 (its §16-A5)**; countersigned here, needs only auth's mechanical registration | auth constants batch |
| A2 | Register **`svc:cmdb`** (kind=service, no holder scopes): `board` → escalation-intake scope (Board Stage-2 names it) + `auth:authenticate` | auth + Board Stage-2 |
| A3 | Library's `resolve_host_facts` caller principal (svc:library or per-agent tokens) → `cmdb:read-policy` grant | auth + Library (consumer's choice) |
| A4 | Register `cmdb:manage` (non-holder, human-only, write-benign) — mechanical additive per auth §7 note | auth Stage-5 constants batch |
| A5 | **Verdict countersign package** → amend `cmdb-gateway-policy.md`: JWS format (§3.4), `aud`-by-caller rule, `req_nonce` optional additive (then listed in IDENTIFIERS' not-registered set), additive `host_class`/`verdict_basis` fields, `effective_close`/grace-zone/no-window field semantics (§3.2), zero-leeway `exp` validation | Gateway next session (its A4 anticipates this) |
| A6 | ~~Joint freeze of the sandbox contract~~ **DONE this session** — §C filled per §5; doc re-issued fully FROZEN; Gateway confirms at next touch | closed (confirm-only) |
| A7 | Task-type-registry read contract (Board triage consumer) | Board Stage-2 |
| A8 | Wazuh read-only credential: `svc:cmdb` static-secret read path (interim: operator env secret, documented posture) | Vault Stage-2 |
| A9 | Optional auth-side step-up (`acr`/re-auth claim) to upgrade the §6.3 CMDB-local ceremony | auth, post-root-review |
| A10 | `policy_change_log` HEAD anchoring to MC (mirror of `gateway-mc-audit-anchor.md`) | when that pattern extends beyond Gateway |
| A11 | sod-critical live-check transport: direct Redis vs auth-exposed check API — the same seam as the budget middleware | **root-review-#2** (parked there by auth §11.1; CMDB implements behind the seam) |
| A12 | `cmdb-library-hostfacts.md` additive `facts_provenance` field (+ the R2 scope-name erratum note) | Library next session (optional adopt) |

**Deliberately deferred:** HA (fail-closed downtime accepted at homelab scale); retro-driven per-cell decay (research Q12 — operator-mediated tightening only in v1; revisit with Board retro design); `.ics` ingestion (only if ever required).

---

## 12. Threat-model outline (Stage-5 opener — full model there; Critical-infra cannot exit on a checklist)

1. **Stale fact defaulting open** → closed structurally: write-through snapshot + `policy_version == HEAD` + boot-integrity detector + live RRULE evaluation + deny-on-any-internal-error (§1, §3.3). The Wazuh mirror never feeds the verdict at all.
2. **Agent writes policy** → four independent layers: auth kind-gate (no machine principal can mint `cmdb:write-policy`), §8 holder validation with mandatory `cnf` + live check, principal-class rejection by construction, zero mutation verbs on the agent surface.
3. **Tampered maintenance window** → change-control ceremony + fail-closed three-layer weakening classifier + hash-chained change log + push-before-effect for weakening edits + out-of-band remote verification.
4. **Wazuh sync poisoning** → sync writes inventory only; discovered agents are never hosts until operator-confirmed bind; group = UI suggestion; unmapped agents quarantine (connector contract §1 alignment); every synced field provenance-tagged; no host-originated string enters a verdict.
5. **Forged/replayed verdict** → Ed25519-signed, caller-selected `aud`, optional nonce echo, ≤60s expiry with zero-leeway validation, CMDB-local key; unforgeable-absence per contract §3.
6. **Compromised CMDB (honest accounting)** → veto-not-trigger holds because the destructive-never-auto floor and `action_class` derivation live at Board/Gateway independently; for auto-eligible classes the runtime check count is honestly **three** (standing operator policy, Vault, Gateway) — restated, not hidden, at Stage 5.
7. **Clock attack/skew** → NTP discipline + bound + freshness/timeout on the health check itself + `deny(clock_unsafe)` before any branch (§3.5).
8. **Prompt injection via host-originated text** → reason codes are CMDB-authored enums; mirror fields and escalation payloads provenance-tagged (§12 of ARCHITECTURE honored at the field level).
9. **Sandbox carve-out leakage** → §5 invariants (immutable class, class-keyed branch after universal validation, `wrong_target_class` both directions, config-error deny, both-sides surface segregation) + the Gateway's five §G5 barriers.

---

## 13. Adversarial review (Stage-2 requirement) — how it ran and what it found

**Method:** five independent adversarial reviewers with distinct lenses (SoD/blast-radius; frozen-contract conformance; fail-closed/time correctness; sandbox carve-out leakage; write-path/change-control), each grounded in the frozen contracts and specs, attacked the full draft. 29 raw findings were deduplicated and **each finding was then independently adversarially verified by a skeptic instructed to refute it** (defaulting to rejection when uncertain): **22 confirmed, 7 refuted**. The 22 cluster into 11 distinct defects, every one folded into the sections above:

| Cluster | Defect (worst severity) | Resolution |
|---|---|---|
| A | Carve-out branch ran **before** `action_class` enum validation and the clock-health gate — a disposable host could get a signed `permit` for a nonexistent class, or a verdict signed off an unhealthy clock (major, ×4 findings) | §3.3 reordered: universal preconditions before any branch; §5.3 states the carve-out substitutes only window/floor/approval semantics |
| B | Weakening classifier had a **90-day horizon bypass** (coverage added beyond day 90 classified benign) (major, ×4) | §6.2 layer 2: horizon-free structural window rule; finite expansion demoted to preview-only; not-provably-non-expanding ⇒ weakening |
| C | **Creation bypasses**: new catalog entries (born `rollback_declared: true` → flips cells auto-eligible — the one **critical** finding), new permissive task types, `snapshot_capability` edits — all classified "normal edits" (critical/major, ×3) | §6.2 layer 1: derived-effect diff over the full matrix + consumed routing/triage facts; static list extended; classifier itself fails closed |
| D | "Boot into deny-all after restore" had **no detection mechanism** — a restore is indistinguishable from a reboot (major, ×2) | §1 boot-integrity detector: repo HEAD ⇄ chain tip ⇄ remote HEAD cross-checks; failure ⇒ deny-all until step-up confirm |
| E | Git **push was not part of acceptance** — a weakening edit could go live with its tamper-evidence anchor never reaching the remote (major) | §6.3: push success is a precondition for weakening edits; degraded mode + `policy_integrity_error` otherwise |
| F | Verdict temporal evidence ignored the **next freeze start** (`valid_until` could outlive deny-overrides); grace-zone and no-window/carve-out renderings of the frozen shape were undefined (major, ×3) | §3.2: `effective_close` over the full lattice; grace-zone rendering + reason code; explicit null-arm for every frozen field; §3.6 rows added |
| G | Overlapping/ambiguous-window deny **dropped the contract-required Board escalation** (major) | `window_ambiguity` escalation kind (§3.3, §8) + authoring-time full-shadow detection (§4.3) |
| H | Routine `svc:tier-approver` reads minted **`aud:"gateway"` signed permits into Board hands**; the only anti-relay mechanism was an uncountersigned proposal (minor) | §3.4: `aud` set from the authenticated caller; `req_nonce` carried in the A5 countersign package |
| I | The sod-critical live check requires **auth-private Redis the CMDB topology can't reach** (minor) | §6.1: implemented behind the root-review-#2 transport seam; tracked as A11 |
| J | Wazuh-originated strings flowed to agents **untagged** via `get_host`/`resolve_host_facts` (minor) | §2.2/§7.2 provenance tags; A12 additive hostfacts amendment |
| K | **Midnight-crossing windows** (`end_local < start_local`) had no semantics — the commonest real window shape could silently never open (minor) | §4.3: next-day end-anchor rule + fold/gap on the resolved instant + validator fixtures |

Mid-review, the Gateway Stage-2 freeze of sandbox §G landed; the carve-out was realigned to `sandbox_exec`/kill-knob semantics (§0-R9, §5) — which independently resolved cluster A's worst variant (arbitrary classes can no longer permit on disposables at all).

**Residual risks accepted with reason:** CMDB downtime halts destructive throughput (by design — safe-when-down beats HA complexity at this scale); the 3-of-4 holder collapse for auto classes (bounded by the floor: only reversible, rollback-declared, catalog-vetted classes are ever auto); the verdict-signing key lives on the CMDB host (host compromise ⇒ forgeable permits, but still zero destructive actions without Board approval + Vault + Gateway — veto-not-trigger is the backstop); v1 step-up is a CMDB-local ceremony, not an auth re-auth (stated honestly; A9); escalation delivery is degraded-but-honest until `svc:cmdb` + Board intake exist (A2).

---

## 14. Stage-2 exit criteria — how they are met

- **Data model specified:** §1 (stores + canonicality + backup/restore detector), §2 (inventory/identity/lifecycle), §4 (tiers, classes, windows, registries), §5 (disposable class).
- **API surface specified:** §3 (the binding verdict endpoint, field semantics, fail-closed matrix, signing, clock), §7.3 (host-facts), §4.4/§4.5 read APIs, §6 (write path + change control).
- **MCP tool list specified:** §7.2 — ten read-only tools, one shared evaluator, zero mutation verbs, D-17 ceiling respected.
- **UI surface specified:** §7.4 — twelve operator screens over the same shared state.
- **Both surfaces over one shared state:** the single `evaluate()` + write-through snapshot (§3.3) serves the Gateway endpoint, every MCP tool, and the operator dry-run byte-identically.
- **Sequencing:** §10.
- **Adversarial review run; concerns resolved or explicitly accepted with reason:** §13 (5 lenses → 29 raw → 22 adversarially-confirmed findings → 11 clusters, all folded; residuals accepted with reasons).
- **Ratified obligations discharged:** D-6 host-facts duties modeled (§2.2, §4.1, §4.3, §8); **D-7 mandatory exit item DONE — §C of `gateway-cmdb-library-sandbox.md` filled by this session and the contract re-issued fully FROZEN (§5)**; D-14 bespoke-thin-registry is the shape of §1–§4; the CLAUDE.md re-check obligation is §0.
- **Nothing blocks Stage 3.** The A5 verdict-countersign package is additive (the Gateway's frozen check-2b already works against §3.2/§3.4 as specified).
