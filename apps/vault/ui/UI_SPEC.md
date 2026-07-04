# Stage 3 — UI_SPEC — `vault` (Critical-infra, Instrument, FOCUSED)

> **Status: DRAFT** (Stage-3, 2026-07-03). Design specification only — no code.
> **Consumes:** `context/DESIGN_SYSTEM.md` (FROZEN) + `context/DESIGN_SYSTEM_COMPONENTS.md`. **Deltas only below** — this spec cites shared components by ID and never re-draws them.
> **Binding inputs:** `apps/vault/planning/PLAN.md` (esp. §8 UI, §4 redeem seam, §6 audit, §7 seal/DR, §9 scope slice), `context/CONTRACTS/vault-gateway-redemption.md`.

---

## 1. Scope, archetype, governing principle

**What this UI is.** The Vault is the suite's deliberate **two-view exception**: the agent (MCP) surface is near-empty by construction (four powerless tools, PLAN §5.1), so **the operator UI *is* the rich half**. This spec covers only the human surface. The Gateway-only redeem seam (`POST /redeem`, PLAN §4) is **off both surfaces** — it lives on the `creds` mTLS network and appears in this UI only as *audit* (what was redeemed) and *status* (can redemption happen), never as an affordance.

**Archetype: Instrument (control-room), dark-only, every screen.** There is no Workshop/reading surface here — the Vault renders no long-form prose, no `--paper-*`, no Source Serif 4. Density is `compact`. This is a security-first management console: monitor the seal chain, admit hosts, write (never read) secrets, and read the immutable redemption ledger.

| Screen | Archetype | Primary job |
|---|---|---|
| Secrets Manager | Instrument | write-only KV create/import/rotate; render the *no-read-back* constitutional absence |
| Host Onboarding | Instrument | register host, stage per-host SSH sign-role for operator step-up apply, emit `TrustedUserCAKeys` |
| Access Audit | Instrument | the redemption/denial ledger + exfiltration-signal view (`AuditInspector` §7.2) |
| Releases | Instrument | live pending-release table; operator revoke |
| Status / DR | Instrument | seal/unsealer/recovery/backup/CA/break-glass crown-jewels readout |
| Change Control | Instrument | gate-weakening edits behind the full `ConfirmFriction` ceremony |

**Governing principle (the one this app spends its boldness on).** *This console can create and destroy authority, but it can never read a secret back, and it never lies about whether redemption can safely happen.* Two visual commitments follow, both drawn straight from the shared grammar:
1. **Write-only is a printed constitutional fact, not a disabled control.** Everywhere a "reveal / export / show plaintext" affordance would sit, there is instead an **affirmative destructive-*absence* statement** (§4.7) with a lock/shield glyph and *no* interactive element. A greyed-out "Reveal" toggle would imply a latent capability; there is none.
2. **Seal/DR/audit health obeys the false-green prohibition (§4.9) absolutely.** A seal state the console cannot confirm renders **halt-gold "CANNOT CONFIRM," never a green "sealed OK."** A chain-verify that is stale or failed never renders green.

**No SSE.** The Vault is *not* a `LiveStream` (§5.5) consumer — it is absent from that contract's app list (mc, board, notes, chat, gateway only). Every live figure here (seal state, audit tail, releases, backup age, kill level mirrored from auth) is **poll-refreshed and stamped with `Freshness` §4.9** carrying its own `as-of` age; a stalled poll degrades to the §4.9 stale reading (or Pattern D §5.5 for a safety signal), never a silently-frozen green tile. This is a deliberate choice for a low-event-rate, high-consequence console — noted so Stage-4 does not add a stream.

---

## 2. Design-language note

This spec **consumes `DESIGN_SYSTEM.md`; deltas only.** All tokens (§3), the safety visual grammar (§4), interaction grammar (§5), shared chrome (§6), and cross-app patterns (§7) are inherited verbatim. Shared entities render via their canonical component:

| Entity in Vault | Shared component |
|---|---|
| `ticket_id`, `release_id` (`rel-`+ULID), `approval_id` (`A-…`), `run_id` (`R-…`), `host_id` | `TicketRef` §4.1 (related-ID variants: kind-glyph label, identical chip) |
| redeemer / operator / service identity (`sub`) | `PrincipalRef` §4.2 (`svc:gateway`, `svc:vault`, `operator:*`, denied `agent:*`) |
| provenance on an audit row (`gateway-delivered` evidence, host-originated fact) | `TierBadge` §4.3 |
| release/host/handle lifecycle (`pending·redeemed·expired·revoked`, host `ONLINE/…`) | `StatePill` §4.5 |
| kill-switch posture (read-only, level from auth) | `HaltBand` §4.6 |
| any operator destructive/irreversible affordance; the write-only *absence* | `DangerAction` + destructive-absence rule §4.7 |
| stop/revoke aftermath counts (release revoke fan-out) | `HonestState` §4.8 |
| every live/mirrored figure (seal, audit tail, backup age, kill level) | `Freshness` §4.9 + false-green rule |
| the confirm+step-up gate for every dangerous op | `ConfirmFriction` §5.1 (full variant; diff-hash-bound for gate-weakening) |
| shell, rail, suite switcher, operator identity, posture line | `AppShell` §6.1 |
| every table | `DataTable` §6.2 |
| every form/input | `Field` §6.3 |
| the audit/provenance ledger | `AuditInspector` §7.2 (shared family) |

**No `ReviewChip`/`ReviewQueue` role.** The Vault hosts **no** `needs_review`/approval queue and no ceremony gate. Redemption is the Gateway-only SoD seam; there is nothing here for the operator to *approve*. (Contrast: MC owns `ReviewQueue` §7.1; the Vault deep-links to nothing and forks nothing.) The Vault's only gate is the **change-control step-up** (§9 below), which is `ConfirmFriction`, not a review queue.

**No `HoldToActuate`, no kill trigger.** Only MC (global) and auth (identity-L1) host live kill actuators (§5.3). The Vault renders the `HaltBand` **read-only**, level read from auth, and — if it surfaces the actuator at all — deep-links to MC/auth. It never draws a STOP button.

**Scope model (PLAN §9).** The entire UI is gated by **`vault:manage`** — **operator-only, human-kind-gated, never any machine principal** (mirrors the `library:admin` / `mc:admin` operator-only pattern). Every action re-validates the operator's live token wrapper-side (never header-trust; auth contract §1 Rule 3). Gate-weakening subsets additionally require step-up (§5.1 full variant).

---

## 3. Shell & navigation frame (all screens)

Standard `AppShell` §6.1. Header identity line: **"Vault — secrets custody & Gateway-only redemption."** Center `SYSTEM STATE` zone shows the suite kill level (mirrored from auth via `Freshness`) and, when a dependency is down, the Pattern-D posture. Right zone: read-only `HaltBand` mirror + operator `PrincipalRef` with a `🔑 fresh`/`🔑 stale` step-up cue (many Vault actions require fresh step-up).

Side rail (six items, glyph+label): `⛨ Secrets` · `⊞ Hosts` · `▤ Audit` · `⇥ Releases` · `◉ Status/DR` · `⚖ Change Control`.

```
┌─ RAIL ─┬─ HEADER: Vault — secrets custody & Gateway-only redemption ───────────────┐
│ ⛨ Secr │  SYSTEM STATE:  ⟳ kill G0 · fresh 0.4s (auth)      ◐ operator:ada 🔑 fresh │
│ ⊞ Host │──────────────────────────────────────────────────────────────────────────│
│ ▤ Audi │  [ HaltBand renders here READ-ONLY when level > G0 or a dependency down ]  │
│ ⇥ Rele │                                                                            │
│ ◉ Stat │            ( screen content region )                                       │
│ ⚖ Chng │                                                                            │
└────────┴───────────────────────────────────────────────────────────────────────────┘
```

**Shell-level states** (apply to every screen, per §5.4 honest defaults):
- **stop-engaged** — kill level ≥ G1: `HaltBand` §4.6(a) slides under the header, sticky. Vault content stays readable (audit/status are benign reads); write/rotate/apply/revoke affordances gray to their §4.7 friction and the confirm dialogs state that new issuance is halted (PLAN §3.3 honesty: seal/kill stop *new* redemption, not issued certs).
- **Pattern D (degraded)** — a Vault dependency is down (auth JWKS unreachable, Board facts unreachable, an audit sink down, engine sealed/unreachable): the `HaltBand` §4.6(b) **SYSTEM SAFE-STOPPED** band renders in **halt-gold, not red**, naming the dependency and "what's still true" (see each screen's Pattern-D row). Never a red error for a dependency outage.
- **session ended** — `auth:revocations` drops the operator session (§5.5/§6.1): the shell renders the "session ended — re-authenticate" state; the UI does not silently freeze.

---

## 4. Screen: Secrets Manager  `⛨`

**Job.** Create/import KV secrets, view rotation policy/versions **from metadata only**, trigger rotation. **The console never displays a stored plaintext back — by construction.** (PLAN §8.1: break-glass read is the out-of-band quorum ceremony §7.1, deliberately *not* a web path.)

### 4.1 Wireframe (loaded)

```
Secrets Manager                                          [ + New KV secret ]  [ Import ]
────────────────────────────────────────────────────────────────────────────────────
 ⛊ WRITE-ONLY BY CONSTRUCTION — this surface can create and rotate secrets; it
    cannot read one back. There is no reveal, export, or show-plaintext path here.
    Break-glass read is an offline 3-of-5 quorum ceremony, never a web action.   🔒
────────────────────────────────────────────────────────────────────────────────────
 DataTable §6.2  — handles (metadata only; NO value column exists)
 HANDLE (mono, copy)                         HOST      KIND    ROTATION      LAST WRITE
 cred://hosts/nas-01/admin-login             nas-01    kv      90d ▲ due 3d   2026-06-30
 cred://hosts/sw-core/enable                 sw-core   kv      manual         2026-05-11
 cred://hosts/nas-01/root                    nas-01    ssh-ca  (CA-signed)    —  (no KV)
 …                                                                    ↳ row → detail ▸
────────────────────────────────────────────────────────────────────────────────────
 DETAIL (nas-01/admin-login)     host_id nas-01 · requires_approval_class: root
   Rotation policy: every 90d · post-redemption-rotate: on · recovery: provider-console
   Versions (metadata): v7 2026-06-30 · v6 2026-03-31 · …   [ no value shown, ever ]
   [ Rotate now ]  (DangerAction §4.7 — writes a new version)
```

### 4.2 The write-only affordance (destructive-*absence* rule §4.7 — core security posture)

The header band and every secret detail render the **no-read-back** fact as an **affirmative printed absence** with the **lock/shield glyph 🔒/⛊ and no interactive element** — *not* a greyed "Reveal" button (a disabled control implies a latent capability; there is none). The reserved **⛔ glyph never appears here** — this is a constitutional fact, not an actionable deny (§3.7). Rendered via the destructive-absence rendering of `DangerAction` §4.7; **no app-specific visual.**

- **Create / Import** (`+ New KV secret` / `Import`) open a `Field` §6.3 form: `host_id` (from CMDB, validated), `name`, `value` (masked input; the *only* place a value is typed; never echoed after submit), rotation policy, `recovery` tag (`ssh-ca-resettable | provider-console | console-only`, PLAN §5.3/M-5). Submit is a **write** — a plain operator action, `Toast` §6.5 "Secret written" on success (never gold). Import of an existing name = a new KV v2 version (write-only path).
- **Rotate now** is a `DangerAction` §4.7 (moves versions; irreversible for the prior value) → `ConfirmFriction` §5.1. Per M-5, the confirm consequence block states the **rotation-durability rule**: "not complete until the new version is durably off-box" and shows the off-box snapshot ack.

### 4.3 States (§5.4)

- **loaded** — table + detail as above.
- **loading** — `DataTable` skeleton rows (never a spinner).
- **empty** — invitation: "No secrets stored. Static credentials (NAS admin, switch enable, API keys) live here; the fleet's shell access is SSH-CA signed and needs no stored password. **[ + New KV secret ]**."
- **Pattern R (red ✕)** — a *write* the operator submitted failed (duplicate name w/ policy conflict, invalid `host_id`, engine write rejected): red inline error on the form field, states what to fix. Recoverable, operator's problem.
- **Pattern D (gold ⛊)** — `vault_openbao` engine sealed/unreachable: the list still renders (handle projection is a wrapper-DB read), but write/rotate affordances show the SAFE-STOPPED posture: "STILL TRUE: no plaintext exposed; existing certs valid to TTL. DO: writes queue/deny until the engine unseals — see Status/DR ▸." **Gold, not red.**
- **stop-engaged** — kill ≥ G1: writes/rotate confirm dialogs state new issuance is halted; metadata reads continue.

**Shared components:** `TicketRef` §4.1 (`host_id`), `TierBadge` §4.3 (`requires_approval_class` as a class badge; rotation-due as `--attn`), `StatePill` §4.5 (version state), `DangerAction`+`ConfirmFriction` §4.7/§5.1, `Field` §6.3, `DataTable` §6.2, `Toast` §6.5, `Freshness` §4.9 (last-write / rotation-due ages). App-specific: **SecretWriteForm** (§9.4).

---

## 5. Screen: Host Onboarding  `⊞`

**Job.** Register a host from CMDB `host_id`; **stage a *proposed* per-host SSH sign-role** (`ssh/roles/gateway-<host_id>`, principals pinned) that an **operator step-up applies** via the change-control path — the wrapper never writes `ssh/roles` directly (PLAN §2.3/§3.1, B-2); emit the `TrustedUserCAKeys` provisioning snippet + NTP-check reminder; set the per-handle `recovery` tag.

### 5.1 Wireframe (loaded)

```
Host Onboarding                                                        [ + Register host ]
──────────────────────────────────────────────────────────────────────────────────────
 DataTable §6.2 — onboarded hosts
 HOST      SSH SIGN-ROLE          PRINCIPALS (pinned)   NTP   CA-KEYS PROVISIONED   STATE
 nas-01    gateway-nas-01 ✔       root                  ok    ✔ 2026-06-01          ● READY
 sw-core   gateway-sw-core ⧗      svc-deploy            ok    ▲ not yet             ◐ STAGED
 db-02     — (none)               —                     —     —                     ◼ NEW
──────────────────────────────────────────────────────────────────────────────────────
 STAGE SIGN-ROLE (sw-core)   ← SignRoleStager (app-specific §9.2)
   allowed_users: [ svc-deploy        ]   default_user: (empty — pinned)
   valid_principals (templated): svc-deploy         no wildcards · allow_empty=false
   ┌ Proposed role diff (hash sha256:9f2c…) ─────────────────────────────────────────┐
   │  + ssh/roles/gateway-sw-core  allowed_users=svc-deploy  valid_principals=…       │
   └──────────────────────────────────────────────────────────────────────────────── ┘
   [ Stage proposal ]        [ Apply (operator step-up) ]  ← DangerAction §4.7 + §5.1 full
──────────────────────────────────────────────────────────────────────────────────────
 TrustedUserCAKeys snippet (copy) ─ provision once per host before first redemption:
   @cert-authority *.fleet  ssh-ed25519 AAAA…CApub    key_id correlates to <ticket_id>
   Reminder: enforced/monitored NTP — clock skew silently extends cert validity (§3.3)
```

### 5.2 Interaction

- **Register host** — `Field` form: `host_id` (validated against CMDB), `recovery` tag default. Creates the `◼ NEW` row (write-benign).
- **Stage proposal** — writes a *proposed* role record only (powerless; the wrapper has no `ssh/roles` write). No step-up. Row → `◐ STAGED`.
- **Apply** — the gate-defining act. It is a **`DangerAction` §4.7** routed through **`ConfirmFriction` §5.1 full variant**: typed-intent + **auth Tier-2 live step-up** + **diff-hash-bound** confirm token (the operator confirms the exact `sha256:…` role diff shown) + a **tamper-evident audit row** (ARCHITECTURE §12 policy-plane change control). On success the role goes live via the config-as-code path; row → `✔`/`● READY`. The continuous invariant check (PLAN §2.3) alarms on any wildcard/`root`/`allow_empty_principals` — surfaced here as a red validation block that **prevents** staging such a role.
- **`TrustedUserCAKeys` snippet** — a copy-on-click code block (mono), plus the NTP reminder. Not a component — a plain data block.

### 5.3 States (§5.4)

- **loaded / loading(skeleton) / empty** — empty: "No hosts onboarded. Register a host from the CMDB inventory to stage its SSH sign-role. **[ + Register host ]**."
- **Pattern R** — a stage/register the operator submitted was rejected (invalid `host_id`, a proposed role tripped the no-wildcard invariant): red inline, states the violated invariant.
- **Pattern D** — CMDB unreachable (can't validate `host_id`) or engine sealed (can't apply): gold posture, "STILL TRUE: existing sign-roles unchanged; staging is powerless anyway. DO: apply is deferred until the engine unseals / CMDB returns."
- **stop-engaged** — kill ≥ G1: Apply confirm states role changes are gate-weakening-class and halted under the active kill level.

**Shared components:** `TicketRef` §4.1 (`host_id`, `ticket_id` in `key_id`), `StatePill` §4.5 (host/role state: `NEW/STAGED/READY`, `⧗` staged), `Freshness` §4.9 (CA-keys provisioned age, NTP status), `DangerAction`+`ConfirmFriction` (full, diff-hash-bound) §4.7/§5.1, `Field` §6.3, `DataTable` §6.2. App-specific: **SignRoleStager** (§9.2).

---

## 6. Screen: Access Audit  `▤`  — `AuditInspector` §7.2

**Job.** The full redemption/denial ledger — **this is `AuditInspector` §7.2 (shared family), not a fork.** It is the append-only truth of *who redeemed what, when, and every denial*. The **exfiltration-signal view (agent-shaped denials) is pinned at the top**; dual-sink audit status + chain-HEAD display; chain-verify **never false-green**.

### 6.1 Wireframe (loaded)

```
Access Audit                          filter: host▾ ticket▾ sub▾ outcome▾   [ / search ]
──────────────────────────────────────────────────────────────────────────────────────
 ⚑ EXFILTRATION SIGNAL — agent-shaped denials (pinned)          3 in last 24h  ▲
   ts (mono)          sub                     outcome                    ticket
   2026-07-03 09:14   ⬡ agent:recon-04        ✕ 403 not_gateway          T-000512   ▸
   2026-07-03 02:41   (no channel cert)       ✕ 403 not_gateway_channel  —          ▸
   → each row: reason verbatim + both-sink write confirmed ✔✔ · escalation dispatched
──────────────────────────────────────────────────────────────────────────────────────
 CHAIN STATUS   local HEAD seq 44,812 · row_hash 3af9… │ WORM HEAD 44,812 ✔ matched 0.6s
   [ Verify chain ]   → result renders per §4.9 (never green if stale/failed)
──────────────────────────────────────────────────────────────────────────────────────
 DataTable §6.2 — full ledger (append-only; AuditInspector row anatomy §7.2)
 ts               sub (who)        action     target/ticket   outcome        sinks  prov
 07-03 09:20:11   ⚙ svc:gateway    redeem     T-000123·nas-01 ✔ CONFIRMED    ✔✔     ⧉ gw-deliv
 07-03 09:20:10   ⚙ svc:gateway    ssh-sign   rel-01HX… R-88  ✔ CONFIRMED    ✔✔     —
 07-03 08:55:03   ⚙ svc:gateway    redeem     T-000120·db-02  ✕ approval_… ✕  ✔✔     —
 …                                                          ↳ row → record detail ▸
```

### 6.2 Behavior (AuditInspector rules, §7.2 + §4.9)

- Each row: timestamp (mono/tabular) · `PrincipalRef` §4.2 (who — `svc:gateway` legitimate, `agent:*`/`no cert` anomalous) · action verb (`redeem`/`ssh-sign`/`release`/`revoke`/`manage-change`) · `TicketRef` §4.1 target (`ticket_id`, `release_id`, `run_id`, `host_id`) · outcome `StatePill` §4.5 · **dual-sink status** (`✔✔` both sinks acked; `✔–`/`––` renders as a defect, see below) · `TierBadge` §4.3 provenance where the row carries trust info (`gateway-delivered` evidence).
- **Exfiltration-signal pin (PLAN §6.3).** Any denial whose validated/parsed `sub` is agent-class, or any request without a Gateway channel cert, is a **first-class escalation** — pinned at top with the **machine reason verbatim** (`not_gateway`, `not_gateway_channel`, `approval_not_consumed`, …; `--ink-600` mono, never echoing request *content* — PLAN §10 axis 3). Each shows whether the Chat escalation (`svc:vault → chat:post`) dispatched or fell back to the MC-polled violations feed.
- **Chain-verify — false-green prohibition (§4.9, §7.2).** The `[ Verify chain ]` affordance renders: **`✔ CHAIN VERIFIED`** only on a fresh successful verify; **`⚠ CANNOT CONFIRM CHAIN`** in **halt-gold** if the verify is stale or the WORM HEAD is unfetchable; **`✕ CHAIN BROKEN`** in **danger-red** for an actual detected break. A stale verify **never** renders green. The **local HEAD vs WORM HEAD** comparison is shown continuously (this is the M-4 restore detector's signal + the M-6 engine-stream cross-correlation liveness).
- **Read-only, always** (§7.2). No row is ever editable; corrections are new rows. There is **no "clear"/"acknowledge" that mutates a row** — the ledger is the point.

### 6.3 States (§5.4)

- **loaded / loading(skeleton) / empty** — empty (a fresh install): "No redemptions yet. Every Gateway redemption and every denial will appear here, dual-sink and hash-chained."
- **Pattern R** — a *filter/query* the operator issued errored (malformed filter): red inline on the filter control only.
- **Pattern D** — WORM sink or engine audit stream unreachable: the ledger still renders local rows, but a **gold** banner: "SYSTEM SAFE-STOPPED · off-box audit sink unreachable — redemption is halting fail-closed (D-16a). STILL TRUE: local chain intact; denials still recorded locally. Chain HEAD **CANNOT CONFIRM** against WORM." Chain status flips to halt-gold. **Never red.**
- **chain-broken** — a genuine detected break: this is the one place a **red ✕ CHAIN BROKEN** is correct (Pattern R semantics — a real, detected, actionable integrity failure), with the divergent seq/hash and the escalation dispatched.
- **stop-engaged** — kill ≥ G1: the ledger is read-only regardless; band shows the kill posture; denials-under-kill (`403 revoked`) appear inline.

**Shared components:** `AuditInspector` §7.2 (the whole screen), `PrincipalRef`, `TicketRef`, `TierBadge`, `StatePill`, `Freshness` (chain-HEAD match age, verify freshness), `DataTable`. **No app-specific component** — the exfiltration pin and chain-status are `AuditInspector` §7.2 features (pinned filter + rendered tamper-evidence), not a new widget.

---

## 7. Screen: Releases  `⇥`

**Job.** Live table of `pending` releases (the powerless, non-redeemable `rel-`+ULID shadows agents stage); **operator revoke = `DangerAction`**. Honesty carve-out rendered: revoking a *release* stops **new** redemption; an already-issued SSH cert dies only by TTL/KRL (PLAN §5.2/§3.3).

### 7.1 Wireframe (loaded)

```
Releases                                    filter: host▾ ticket▾ status▾   [ / search ]
──────────────────────────────────────────────────────────────────────────────────────
 DataTable §6.2
 RELEASE (mono, copy)   HANDLE                       TICKET     REQUESTED BY     STATUS       EXPIRES
 rel-01HX9K…            cred://hosts/nas-01/root     T-000123   ⬡ agent:patcher  ◐ pending    23:41:12
 rel-01HX8Z…            cred://hosts/db-02/admin     T-000120   ⬡ agent:recon-0  ✔ redeemed   —
 rel-01HX7Q…            cred://hosts/sw-core/enable  T-000118   ⬡ agent:patcher  ⛒ revoked    —
 …                                          [ ☐ bulk-select ]      [ Revoke selected ]  ← §4.7
──────────────────────────────────────────────────────────────────────────────────────
 selected: rel-01HX9K… → [ Revoke ]  (DangerAction §4.7 → ConfirmFriction §5.1 light + carve-out)
```

### 7.2 Interaction

- **Revoke** (single or bulk) is a `DangerAction` §4.7. Because revoke moves the system *toward less* action (§5.1 rule 4), it uses the **light-leaning `ConfirmFriction`** — single confirm, signal-cyan primary, no typed-intent — **but** the consequence block carries the mandatory **honesty carve-out**: *"Revokes the PENDING release only. An SSH cert already signed for this ticket remains valid until its TTL / a KRL push — revoking here does not recall it."* (PLAN §5.2, contract §4). It also echoes the live `HonestState` §4.8 aftermath (`confirmed · pending · draining`) of the revoke fan-out — **all three slots always shown**, so the operator never reads a false "revoked everywhere" while a redemption is mid-flight.
- Bulk revoke → §5.1 bulk-destructive path.
- Rows auto-expire (`pending → expired`) lazily; the table poll-refreshes with `Freshness`.

### 7.3 States (§5.4)

- **loaded / loading(skeleton) / empty** — empty: "No active releases. Agents stage a powerless `release_id` here after claiming a ticket; the Gateway redeems it under a consumed approval."
- **Pattern R** — an operator revoke failed (release already terminal): red inline "already `redeemed`/`expired` — nothing to revoke."
- **Pattern D** — wrapper store / engine unreachable: gold posture, "STILL TRUE: releases are powerless without a live redemption; existing certs age out by TTL."
- **stop-engaged** — kill ≥ G1: revoke still permitted (toward-less-action is the encouraged path even under kill); the band notes new redemptions are already refused suite-wide.

**Shared components:** `TicketRef` §4.1 (`release_id`, `ticket_id`), `PrincipalRef` §4.2 (requested-by), `StatePill` §4.5 (`pending/redeemed/expired/revoked`), `DangerAction`+`ConfirmFriction` §4.7/§5.1, `HonestState` §4.8 (revoke aftermath), `Freshness` §4.9 (expiry countdown, poll age), `DataTable` §6.2.

---

## 8. Screen: Status / DR  `◉`

**Job.** The crown-jewels readout: seal state, unsealer health + seal-token remaining TTL, recovery-quorum posture, audit-sink health + engine-stream cross-correlation liveness, kill level (from auth), backup age + `VAULT_SNAPSHOT_DEST` reachability, per-host break-glass last-verified, CA fingerprint + rotation runbook. **Every figure renders via `Freshness` §4.9; a seal state the console cannot confirm is halt-gold "CANNOT CONFIRM," never a green "sealed OK."**

### 8.1 Wireframe (loaded — healthy)

```
Status / DR  — Vault crown-jewels                              ⟳ polled · as-of 1.2s
──────────────────────────────────────────────────────────────────────────────────────
 SEAL CHAIN  (SealChainPanel §9.3 — every figure is Freshness §4.9)
 ┌ Engine seal ────────────┬ Unsealer ───────────────┬ Recovery quorum ───────────────┐
 │ ● UNSEALED              │ ● healthy               │ 3-of-5 shares · escrowed offline│
 │ source: engine as-of 1s │ seal-token TTL 21d ✔    │ last quorum-test 2026-06-15 ▲   │
 └─────────────────────────┴─────────────────────────┴─────────────────────────────────┘
 ┌ Audit sinks ────────────┬ Kill level (from auth) ─┬ Backups ───────────────────────┐
 │ ✔✔ local + WORM current │ ⟳ G0 · fresh 0.4s       │ raft snapshot age 6h ✔          │
 │ engine-stream xcorr live│ (read-only mirror §4.6) │ VAULT_SNAPSHOT_DEST reachable ✔ │
 └─────────────────────────┴─────────────────────────┴─────────────────────────────────┘
 CA & break-glass
   Suite-internal CA fingerprint  SHA256:1a2b…9f  · rotation runbook ▸
   SSH CA signing key: inside barrier, non-exportable ⛊
   Per-host break-glass last-verified:  nas-01 2026-06-20 ✔ · db-02 2026-04-02 ▲ overdue
──────────────────────────────────────────────────────────────────────────────────────
```

### 8.2 The false-green discipline (§4.9 — the signature commitment of this screen)

- **Seal-unknown → gold, never green.** If the seal-state read is stale or the engine is unreachable, the Engine-seal tile renders **`⚠ CANNOT CONFIRM SEAL — engine unreachable (as-of <age>); treat as UNVERIFIED`** in **halt-gold** — *never* a fabricated green "UNSEALED/OK." (Directly parallels auth's separation panel and Gateway's anchor status — one rule, §4.9.)
- **Audit-sink health is green only if *both* sinks are current** (PLAN §8.5). One sink down → gold, and the screen shows the Pattern-D SAFE-STOPPED posture (redemption is halting fail-closed, D-16a).
- **Seal-token TTL** (M-7): shown as a tabular countdown with `Freshness`; nearing expiry goes `--attn` (silent expiry would otherwise surface only at the next restart).
- **Break-glass last-verified** overdue → `--attn ▲`, not a silent green (M-3; a per-host offline-escrowed emergency account is a fleet-root-equivalent crown jewel).
- **Recovery-quorum / snapshot / `VAULT_SNAPSHOT_DEST`** each carry their own `as-of` age and reachability, per §4.9.
- **No editable control on this screen** — it is a readout. DR *actions* (rotate CA, run a snapshot, apply a seal migration) are gate-weakening/critical ops routed through **Change Control** (§9 below) or the offline quorum runbook (linked, not a web action).

### 8.3 States (§5.4)

- **loaded (healthy)** — as above.
- **loading** — tile skeletons; `Freshness` shows `as-of —` until first poll.
- **empty** — N/A (there is always a seal chain to report).
- **Pattern R** — N/A for a readout (no operator action to fail here); a failed poll is Pattern-D, not R.
- **Pattern D (gold ⛊)** — **the dominant non-healthy state.** Engine sealed/unreachable, an audit sink down, unsealer unreachable, or the seal-token expired: the whole panel adopts the halt-gold SAFE-STOPPED reading with "what's still true / what to do" (PLAN §7 boot runbook link). Seal-unknown and audit-down are *this*, never red.
- **stop-engaged** — kill ≥ G1 mirrored in the Kill-level tile (gold) + the shell `HaltBand`.

**Shared components:** `Freshness` §4.9 (every tile — the whole screen is Freshness discipline), `HaltBand` §4.6 (kill level mirror; Pattern-D posture), `StatePill` §4.5 (seal/unsealer/sink states), destructive-absence §4.7 ("SSH CA key non-exportable ⛊"). App-specific: **SealChainPanel** (§9.3).

---

## 9. Change Control  `⚖`  — and app-specific components

### 9.1 Change Control screen

**Job.** The single place any **gate-weakening edit** happens: TTL raises, principal widening, audit-sink change, release-TTL raise, sign-role edits, CA rotation, config-as-code changes (PLAN §8.6, ARCHITECTURE §12). Every such edit is the **full `ConfirmFriction` §5.1 ceremony**: **diff rendered before confirm → typed-intent → auth Tier-2 live step-up → diff-hash-bound confirm token → tamper-evident audit row.**

```
Change Control                                    pending edits: 0        [ + Propose edit ]
──────────────────────────────────────────────────────────────────────────────────────────
 PROPOSED EDIT — raise VAULT_SSH_CERT_TTL  10m → 30m
 ┌ Diff (hash sha256:c1a4…) ──────────────────────────────────────────────────────────────┐
 │  - ssh_cert_ttl: 10m                                                                     │
 │  + ssh_cert_ttl: 30m        ⚠ GATE-WEAKENING — widens the window a signed cert is valid  │
 └──────────────────────────────────────────────────────────────────────────────────────── ┘
 ⚠ CONSEQUENCE — this moves the system TOWARD MORE real-world action: any cert signed after
   apply is valid 3× longer; a compromised cert's blast-window triples. Irreversible for
   certs already signed under the new TTL. Live kill level: G0.
 Type  raise-ssh-ttl  to confirm:  [▏          ]        Re-authenticate: 🔑 passkey (step-up)
       [ Cancel ]  (default focus)                       [ Apply edit ]  ← danger, disabled until
                                                          typed-intent matches AND 🔑 fresh
```

**Rules (all inherited from §5.1, not re-specified):** Cancel is default focus + `Esc` target; primary disabled until typed-intent matches AND step-up fresh; the confirm token is **diff-hash-bound** (the operator confirms the exact `sha256:…` shown — a changed diff invalidates the token); the action writes a **tamper-evident audit row** visible in Access Audit (§6). The halt affordance is never occluded (`Shift+Esc` focuses the header halt, §5.3).

**States (§5.4):** loaded (diff shown) / loading(skeleton) / **empty** ("No pending edits. Any gate-weakening change to TTLs, principals, sinks, or config lands here behind step-up.") / **Pattern R** (apply rejected — stale diff-hash, step-up expired: red inline "the diff changed or your step-up lapsed; re-open to re-confirm the current diff") / **Pattern D** (auth step-up service or engine unreachable: gold "apply deferred — cannot re-authenticate / engine sealed") / **stop-engaged** (kill ≥ G1: gate-weakening apply refused; the consequence block states the active kill level blocks it).

### 9.2–9.4 App-specific components (justified)

Only **three** app-specific components — each a genuinely Vault-domain-unique widget, **none a re-draw of a shared entity** (every ID chip, identity, tier, lifecycle pill, halt band, freshness stamp, and danger affordance inside them uses the shared component).

| # | Component | What it is | Why it cannot be a shared component |
|---|---|---|---|
| **9.2** | **SignRoleStager** (Host Onboarding §5) | Stages a *proposed* OpenBao SSH sign-role (`allowed_users`/`valid_principals` pinned, no wildcards) + emits the `TrustedUserCAKeys` snippet, for operator step-up apply | An OpenBao SSH-CA sign-role is a Vault-domain-unique **gate-defining config artifact** with no suite analog; its *apply* is `DangerAction`+`ConfirmFriction` (shared) and its `host_id` is `TicketRef` (shared) — only the role-staging form/diff is domain-specific. |
| **9.3** | **SealChainPanel** (Status/DR §8) | The seal / unsealer / recovery-quorum / backup / break-glass / CA crown-jewels readout | Seal-state + unseal path + recovery-share quorum + off-box-snapshot + per-host break-glass custody is a **crown-jewels register unique to a secrets store**; no shared component models it. **Every figure inside renders via `Freshness` §4.9** (seal-unknown → gold) — the panel is an arrangement of shared Freshness tiles, not a new status primitive. |
| **9.4** | **SecretWriteForm** (Secrets Manager §4) | The write-only KV create/import surface with the printed no-read-back constitutional-absence panel | A **write-only-by-construction** secret entry surface is domain-unique — it deliberately has *no read-back sibling*. It is built from `Field` §6.3 (the inputs) + the **destructive-absence rule §4.7** (the printed 🔒 "no reveal path" fact, *not* re-drawn) + `DangerAction`/`ConfirmFriction` for rotate; only the write-only composition is new. |

*(Deliberately NOT app-specific — flagged so Stage-4 does not fork them: the redemption/denial ledger is `AuditInspector` §7.2; the exfiltration-signal pin is an `AuditInspector` pinned filter, not a new widget; the releases table is `DataTable` §6.2; the kill band is `HaltBand` §4.6; the step-up ceremony is `ConfirmFriction` §5.1.)*

---

## 10. Human-surface API (two views, one state)

The UI is a sibling of the MCP surface **over the same wrapper store + engine** (PLAN §8 invariant; the UI's extra power comes from **scope** (`vault:manage`), not a second data path). All endpoints are operator-only, human-kind-gated, wrapper-side token-validated on every call (never header-trust). **No SSE** — reads are polled; every response carries an `as-of`/freshness stamp for `Freshness` §4.9. These are the *same* releases/handles/audit rows the four MCP tools (§5.1) and the `creds`-interface redeem pipeline (§4) read and write.

| Screen | Method + path | Reads/writes (one state) | Gate |
|---|---|---|---|
| Secrets | `GET /manage/handles` | handle projection + metadata (**never values**) — same rows `vault_list_handles` reads | `vault:manage` |
| Secrets | `GET /manage/handles/{handle}` | rotation policy, KV **metadata versions** (no values), `requires_approval_class`, `recovery` | `vault:manage` |
| Secrets | `POST /manage/kv` | write-only create/import → new KV v2 version (via wrapper AppRole write-path §3.1) | `vault:manage` (import of existing = version bump) |
| Secrets | `POST /manage/handles/{handle}/rotate` | rotation write; blocks completion until off-box snapshot ack (M-5) | `vault:manage` + `DangerAction` §5.1 |
| Hosts | `GET /manage/hosts` | onboarded hosts, sign-role state, NTP/CA-keys status | `vault:manage` |
| Hosts | `POST /manage/hosts` | register from CMDB `host_id` (write-benign) | `vault:manage` |
| Hosts | `POST /manage/hosts/{id}/signrole/stage` | write a **proposed** role record (powerless) + return the diff hash | `vault:manage` |
| Hosts | `POST /manage/hosts/{id}/signrole/apply` | apply role via change-control path (config-as-code) | `vault:manage` + **full §5.1** (step-up, diff-hash-bound, tamper-evident row) |
| Audit | `GET /manage/audit?host&ticket&sub&outcome` | append-only ledger rows (same `audit_local` §5.3 the redeem pipeline writes) | `vault:manage` |
| Audit | `GET /manage/audit/exfil` | pinned agent-shaped-denial view (server-filtered) | `vault:manage` |
| Audit | `GET /manage/audit/chain` | local HEAD (`seq`,`row_hash`) + WORM HEAD + match age | `vault:manage` |
| Audit | `POST /manage/audit/chain/verify` | run chain-verify → §4.9 result (never false-green) | `vault:manage` (read-only verify) |
| Releases | `GET /manage/releases?host&ticket&status` | same `releases` rows agents stage (`vault_release_status`) and the redeem pipeline CAS-updates | `vault:manage` |
| Releases | `POST /manage/releases/{release_id}/revoke` | operator revoke of a **pending** release (parallels the Gateway's `POST /releases/revoke` on the creds interface, PLAN §5.2) | `vault:manage` + `DangerAction` §5.1 (light + honesty carve-out) |
| Status | `GET /manage/status` | seal/unsealer/seal-token-TTL/recovery/audit-sinks/xcorr/backup-age/`VAULT_SNAPSHOT_DEST`/CA-fingerprint/break-glass-last-verified/kill-level(from auth) | `vault:manage` |
| Change control | `GET /manage/change-control/diff?edit=…` | render the exact diff + its `sha256` hash before confirm | `vault:manage` |
| Change control | `POST /manage/change-control/apply` | apply a **gate-weakening** edit; diff-hash-bound token required | `vault:manage` + **full §5.1** (step-up, tamper-evident row) |

**Off both surfaces, by construction** (rendered here only as audit/status, never as an affordance): `POST /redeem` and the SSH-sign / KV-read engine ops — the Gateway-only SoD seam on the `creds` mTLS network (PLAN §4, contract §1). There is **no operator "reveal/read secret" endpoint anywhere** — the §4.7 destructive-absence rendering is the UI honoring an API that has no such route (break-glass read is the offline quorum ceremony §7.1).

---

## 11. Consistency notes (what this app consumes, from where)

- **Safety grammar (§4)** — `TicketRef`, `PrincipalRef`, `TierBadge`, `StatePill`, `HaltBand` (read-only), `DangerAction`+destructive-absence, `HonestState`, `Freshness` all consumed verbatim; **not one is re-drawn.** The write-only "no reveal" posture is the **destructive-absence rule §4.7** (lock/shield, printed fact, never a greyed toggle, never the ⛔ glyph), not a bespoke Vault visual.
- **Interaction grammar (§5)** — every dangerous op is `ConfirmFriction` §5.1 (full variant + diff-hash-bound + tamper-evident for gate-weakening; light variant + honesty carve-out for release-revoke). `Shift+Esc` §5.3 halt-focus honored on every modal. Honest defaults §5.4 on every screen; **Pattern R (red, operator's fixable error) vs Pattern D (gold, dependency-down safe-stop) kept strictly distinct** — seal-unknown, audit-sink-down, engine-sealed, Board/auth-unreachable are all **Pattern D gold**, never red.
- **Shared chrome (§6)** — `AppShell`, `DataTable`, `Field`, `Modal`, `Toast` consumed as-is.
- **Cross-app patterns (§7)** — **`AuditInspector` §7.2** is the entire Access Audit screen (chain-verify rendered per §4.9, never false-green; provenance via `TierBadge`) — a *consumer of the shared family, not a fork*. The Vault **owns no `ReviewQueue`** and hosts no review/approval gate (redeem is the Gateway-only SoD seam, off both surfaces); it does not deep-link into MC's queue because it has no `needs_review` role. It hosts no `LiveAgentView` and no kill actuator (read-only `HaltBand` only; deep-links to MC/auth for actuation).
- **Scope (§9 PLAN)** — `vault:manage` mirrors the `library:admin` / `mc:admin` **operator-only, human-kind-gated** pattern; no machine principal ever reaches this UI.
- **No SSE** — Vault is not a `LiveStream` §5.5 consumer; polling + `Freshness` throughout (noted so Stage-4 does not add a stream).
- **Two views, one state** — §10's `/manage/*` reads/writes hit the *same* wrapper store + engine that the four MCP tools and the `creds` redeem pipeline use; the operator's extra power is scope, not a second data path (PLAN §8 invariant).
