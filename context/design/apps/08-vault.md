# Helm · Claude Design injection block — Vault (Secrets Custody & Gateway-Only Redemption)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Vault (Secrets Custody & Gateway-Only Redemption)

**Purpose (one line):** The operator's console for the suite's secrets store — create/rotate credentials, onboard hosts for SSH-CA signing, and read the immutable redemption ledger, on a console that can create and destroy authority but can *never* read a secret back.
**Who uses it:** Operator-only. The Vault is the suite's deliberate two-view *exception* — the agent (MCP) surface is near-empty by construction, so this human console **is** the rich half. Gated entirely by `vault:manage` (human-kind-only; no machine principal ever reaches this UI). The Gateway-only `POST /redeem` seam lives off both surfaces on the `creds` mTLS network — it appears here only as *audit* (what was redeemed) and *status* (can redemption safely happen), never as a button.
**Archetype:** Instrument (dark control-room), **dark-only, every screen, density `compact` (28–32px rows)**. No Workshop pane, no `--paper-*`, no Source Serif 4 — this app renders no long-form prose.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side-rail (224px open / 56px collapsed) + global header + suite switcher; header identity line reads *"Vault — secrets custody & Gateway-only redemption."* Right zone carries the operator **PrincipalRef** + a `🔑 fresh` / `🔑 stale` step-up cue (many actions need fresh step-up). Six rail items: `⛨ Secrets · ⊞ Hosts · ▤ Audit · ⇥ Releases · ◉ Status/DR · ⚖ Change Control`.
- **HaltBand** — full-width GOLD `--halt-500 #F2842B` safe-stop band under the header. **Read-only here** — the Vault hosts NO kill actuator and NEVER draws a STOP button; level is mirrored from auth. Interlock `▮▮` = kill engaged; shield `⛊` = SYSTEM SAFE-STOPPED (dependency down). Gold, never red.
- **DataTable** — dense zebra (`--sub-750` stripe), sticky header, mono ID column with copy-on-click. The truth-surface of every screen (handles, hosts, ledger, releases).
- **TicketRef** — mono opaque ID chip, `--ink-700` on `--sub-750`, copy-on-click, middle-truncate. Used for `host_id`, `release_id` (`rel-`+ULID), `ticket_id` (`T-…`), `approval_id` (`A-…`), `run_id` (`R-…`). Kind is a label glyph, never a color.
- **PrincipalRef** — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service. In the Vault, `⚙ svc:gateway` is the *only* legitimate redeemer; any `⬡ agent:*` or "no cert" in the audit is anomalous by definition.
- **StatePill** — one glyph+label pill per lifecycle state, never color-only: `◐ pending · ✔ redeemed · ⛒ revoked` (releases); host `◼ NEW · ◐ STAGED · ● READY`; outcome `✔ CONFIRMED · ✕`.
- **TierBadge** — provenance badge on audit rows carrying trust info: `✔ verified` green `--ok-500 #46B98A` for `gateway-delivered` evidence; `⧉ cross-referenced` cyan; `◑ single-source` amber; striped-amber `⚠ UNTRUSTED` for host-originated facts.
- **DangerAction + ConfirmFriction** — destructive affordances are red `--danger-500 #E5594E` behind friction. **Full variant** (typed-intent + auth Tier-2 live step-up + diff-hash-bound token + tamper-evident audit row) for rotate, sign-role apply, and every gate-weakening change. **Light variant** (single confirm, signal-cyan `#29B6D8` primary, no typed intent) for release-revoke because it moves *toward less* action.
- **The destructive-*absence* rule (§4.7)** — the app's signature: where a "reveal/export/show-plaintext" affordance would sit, print an **affirmative constitutional-absence fact** with a lock/shield glyph `🔒 / ⛊` and **NO interactive element**. Never a greyed-out "Reveal" toggle (a disabled control implies a latent capability — there is none). The `⛔` glyph never appears here (it's reserved for *actionable* deny).
- **HonestState** — the `confirmed · pending · draining` triad, all three slots always shown even at zero. Renders the true aftermath of a release-revoke fan-out.
- **Freshness** — `⟳` age stamp + source on every live figure (poll-refreshed; **no SSE**). Stale → amber `▲ STALE`, never a false green. Enforces the false-green prohibition absolutely on this app.
- **AuditInspector** (cross-app pattern §7.2) — the Access Audit screen *is* this component: append-only DataTable rows + chain-verify affordance that never false-greens. Consumed, not forked.
- **Field / Modal / Toast** — standard inputs, the one elevated confirm surface, and verb-matched success toasts (`--ok`, never gold).

**◇ Deliberately NOT used (flagged so nothing gets forked):** No **ReviewChip / ReviewQueue** — the Vault hosts no `needs_review` gate and deep-links to nothing (redemption is the Gateway-only SoD seam; there is nothing here to approve). No **LiveAgentView**. No **HoldToActuate** / kill trigger.

**⬡ Screens & views to build:**

**1. Secrets Manager `⛨` — the write-only surface (spend the app's boldness here).**
Layout: screen-top **constitutional-absence band** (shield/lock, no control), then a metadata-only DataTable, then a detail pane.
```
Secrets Manager                                    [ + New KV secret ]  [ Import ]
──────────────────────────────────────────────────────────────────────────────────
 ⛊ WRITE-ONLY BY CONSTRUCTION — this surface can create and rotate secrets; it
    cannot read one back. There is no reveal, export, or show-plaintext path here.
    Break-glass read is an offline 3-of-5 quorum ceremony, never a web action.  🔒
──────────────────────────────────────────────────────────────────────────────────
 HANDLE (mono, copy)                    HOST     KIND   ROTATION      LAST WRITE
 cred://hosts/nas-01/admin-login        nas-01   kv     90d ▲ due 3d  2026-06-30
 cred://hosts/sw-core/enable            sw-core  kv     manual        2026-05-11
 cred://hosts/nas-01/root               nas-01   ssh-ca (CA-signed)   —  (no KV)   ▸
──────────────────────────────────────────────────────────────────────────────────
 DETAIL (nas-01/admin-login)   host_id nas-01 · requires_approval_class: root
   Rotation: every 90d · post-redemption-rotate: on · recovery: provider-console
   Versions (metadata): v7 2026-06-30 · v6 2026-03-31 …  [ no value shown, ever ]
   [ Rotate now ]  (DangerAction → ConfirmFriction full)
```
- **The table has NO value column and no row ever expands to plaintext.** This is the whole point — render the absence, not a locked control.
- **Primary actions:** `+ New KV secret` / `Import` open the **SecretWriteForm** (app-specific, below) — the *only* place a secret value is ever typed (masked input, never echoed after submit). Submitting a write is a *plain* operator action → verb-matched Toast "Secret written" (`--ok`, **never gold**). `Rotate now` is a DangerAction (moves versions, irreversible for the prior value); the ConfirmFriction consequence block states the rotation-durability rule ("not complete until the new version is durably off-box") and shows the off-box snapshot ack.
- **States:** *loaded* (as above) · *loading* = DataTable skeleton rows (never a spinner) · *empty* = invitation "No secrets stored. Static credentials (NAS admin, switch enable, API keys) live here; the fleet's shell access is SSH-CA signed and needs no stored password. **[ + New KV secret ]**" · **Pattern R (red ✕)** = an operator's *write* failed (duplicate name/policy conflict, invalid `host_id`) — red inline on the form field, states what to fix · **Pattern D (gold ⛊)** = OpenBao engine sealed/unreachable — the list still renders (handle projection is a wrapper-DB read) but write/rotate go to the SAFE-STOPPED posture: "STILL TRUE: no plaintext exposed; existing certs valid to TTL. DO: writes queue/deny until the engine unseals — see Status/DR ▸." **Gold, not red** · *stop-engaged* (kill ≥ G1) = write/rotate confirm dialogs state new issuance is halted; metadata reads continue.

**2. Host Onboarding `⊞` — SSH sign-role stager + TrustedUserCAKeys.**
Layout: DataTable of onboarded hosts, then the **SignRoleStager** panel, then the CA-keys snippet block.
```
Host Onboarding                                            [ + Register host ]
──────────────────────────────────────────────────────────────────────────────
 HOST     SSH SIGN-ROLE       PRINCIPALS   NTP  CA-KEYS PROVISIONED   STATE
 nas-01   gateway-nas-01 ✔    root         ok   ✔ 2026-06-01          ● READY
 sw-core  gateway-sw-core ⧗   svc-deploy   ok   ▲ not yet             ◐ STAGED
 db-02    — (none)            —            —    —                     ◼ NEW
──────────────────────────────────────────────────────────────────────────────
 STAGE SIGN-ROLE (sw-core)   ← SignRoleStager
   allowed_users: [ svc-deploy ]   default_user: (empty — pinned)
   valid_principals (templated): svc-deploy   no wildcards · allow_empty=false
   ┌ Proposed role diff (hash sha256:9f2c…) ──────────────────────────────────┐
   │  + ssh/roles/gateway-sw-core  allowed_users=svc-deploy  valid_principals… │
   └───────────────────────────────────────────────────────────────────────── ┘
   [ Stage proposal ]      [ Apply (operator step-up) ]  ← DangerAction + full ConfirmFriction
──────────────────────────────────────────────────────────────────────────────
 TrustedUserCAKeys snippet (copy) — provision once per host before first redeem:
   @cert-authority *.fleet  ssh-ed25519 AAAA…CApub   key_id correlates to <ticket_id>
   Reminder: enforced/monitored NTP — clock skew silently extends cert validity
```
- **Interaction:** `Register host` (Field form, `host_id` validated against CMDB) creates the `◼ NEW` row (write-benign). `Stage proposal` writes a *powerless proposed* role record only — the wrapper has **no** `ssh/roles` write path — no step-up; row → `◐ STAGED`. **`Apply`** is the gate-defining act: DangerAction → **full ConfirmFriction** = typed-intent + auth Tier-2 live step-up + **diff-hash-bound** confirm token (operator confirms the exact `sha256:…` diff shown) + tamper-evident audit row; row → `✔ / ● READY`. A continuous invariant check alarms on any wildcard / `root` / `allow_empty_principals` and renders a **red validation block that PREVENTS staging** such a role.
- **States:** *empty* = "No hosts onboarded. Register a host from the CMDB inventory to stage its SSH sign-role. **[ + Register host ]**" · **Pattern R** = a stage/register rejected (invalid `host_id`, tripped the no-wildcard invariant) — red inline naming the violated invariant · **Pattern D** = CMDB unreachable (can't validate) or engine sealed (can't apply) — gold "STILL TRUE: existing sign-roles unchanged; staging is powerless anyway. DO: apply deferred until engine unseals / CMDB returns" · *stop-engaged* = Apply confirm states role changes are gate-weakening-class and halted under the active kill level.

**3. Access Audit `▤` — AuditInspector §7.2 (the redemption/denial ledger).**
Layout: **exfiltration-signal view pinned at top**, then chain-status strip, then the full append-only ledger.
```
Access Audit                    filter: host▾ ticket▾ sub▾ outcome▾   [ / search ]
──────────────────────────────────────────────────────────────────────────────────
 ⚑ EXFILTRATION SIGNAL — agent-shaped denials (pinned)      3 in last 24h  ▲
   ts (mono)         sub                  outcome                  ticket
   2026-07-03 09:14  ⬡ agent:recon-04     ✕ 403 not_gateway        T-000512   ▸
   2026-07-03 02:41  (no channel cert)    ✕ 403 not_gateway_channel —          ▸
   → each row: machine reason verbatim + both-sink write ✔✔ · escalation dispatched
──────────────────────────────────────────────────────────────────────────────────
 CHAIN STATUS  local HEAD seq 44,812 · row_hash 3af9… │ WORM HEAD 44,812 ✔ matched 0.6s
   [ Verify chain ]  → renders per §4.9 (never green if stale/failed)
──────────────────────────────────────────────────────────────────────────────────
 ts             sub (who)      action    target/ticket   outcome      sinks  prov
 07-03 09:20:11 ⚙ svc:gateway  redeem    T-000123·nas-01 ✔ CONFIRMED  ✔✔   ⧉ gw-deliv
 07-03 08:55:03 ⚙ svc:gateway  redeem    T-000120·db-02  ✕ approval_… ✔✔   —      ▸
```
- **Exfiltration pin:** any denial whose validated `sub` is agent-class, or any request without a Gateway channel cert, is a **first-class escalation** pinned at top with the **machine reason verbatim** (`not_gateway`, `not_gateway_channel`, `approval_not_consumed`; `--ink-600` mono, **never echoing request *content*)**. Each row shows whether the Chat escalation dispatched or fell back to the MC-polled violations feed.
- **Chain-verify (false-green prohibition):** `[ Verify chain ]` renders **`✔ CHAIN VERIFIED`** (green) only on a fresh successful verify; **`⚠ CANNOT CONFIRM CHAIN`** in **halt-gold** if stale or WORM HEAD unfetchable; **`✕ CHAIN BROKEN`** in **danger-red** for an actual detected break. A stale verify **never** renders green. Local HEAD vs WORM HEAD is shown continuously.
- **Read-only always** — no row editable; corrections are new rows; there is **no acknowledge/clear that mutates a row.**
- **States:** *empty* = "No redemptions yet. Every Gateway redemption and every denial will appear here, dual-sink and hash-chained" · **Pattern R** = a *filter/query* errored (malformed filter) — red inline on the filter control only · **Pattern D (gold)** = WORM sink or engine audit stream unreachable — ledger still renders local rows under a gold banner "SYSTEM SAFE-STOPPED · off-box audit sink unreachable — redemption is halting fail-closed. STILL TRUE: local chain intact; denials still recorded locally. Chain HEAD **CANNOT CONFIRM** against WORM" · **chain-broken** = the one place a **red ✕ CHAIN BROKEN** is correct (a real, detected, actionable integrity failure), with divergent seq/hash + escalation dispatched · *stop-engaged* = ledger read-only regardless; band shows kill posture; `403 revoked` denials appear inline.

**4. Releases `⇥` — live pending-release table + operator revoke.**
Layout: DataTable of releases (the powerless `rel-`+ULID shadows agents stage), bulk-select, revoke.
```
Releases                              filter: host▾ ticket▾ status▾   [ / search ]
──────────────────────────────────────────────────────────────────────────────────
 RELEASE (mono, copy)  HANDLE                     TICKET    REQUESTED BY    STATUS     EXPIRES
 rel-01HX9K…           cred://hosts/nas-01/root   T-000123  ⬡ agent:patcher ◐ pending  23:41:12
 rel-01HX8Z…           cred://hosts/db-02/admin   T-000120  ⬡ agent:recon-0 ✔ redeemed —
 rel-01HX7Q…           cred://hosts/sw-core/enable T-000118 ⬡ agent:patcher ⛒ revoked  —
                                    [ ☐ bulk-select ]     [ Revoke selected ]
```
- **Revoke** (single or bulk) is DangerAction → **light ConfirmFriction** (moves toward less action: single confirm, signal-cyan primary, no typed-intent) — **but** the consequence block carries the mandatory **honesty carve-out**: *"Revokes the PENDING release only. An SSH cert already signed for this ticket remains valid until its TTL / a KRL push — revoking here does not recall it."* It echoes the live **HonestState** triad (`confirmed · pending · draining`, all three slots always shown) of the revoke fan-out — the operator never reads a false "revoked everywhere" while a redemption is mid-flight. Rows auto-expire (`pending → expired`) lazily; poll-refreshed via Freshness (expiry countdown, tabular).
- **States:** *empty* = "No active releases. Agents stage a powerless `release_id` here after claiming a ticket; the Gateway redeems it under a consumed approval" · **Pattern R** = revoke failed (release already terminal) — red inline "already `redeemed`/`expired` — nothing to revoke" · **Pattern D (gold)** = wrapper store/engine unreachable — "STILL TRUE: releases are powerless without a live redemption; existing certs age out by TTL" · *stop-engaged* = revoke still permitted (toward-less-action is encouraged even under kill); band notes new redemptions already refused suite-wide.

**5. Status / DR `◉` — the crown-jewels readout (SealChainPanel).**
Layout: a grid of Freshness tiles — the signature false-green-discipline screen. **Read-only; no editable control** (DR *actions* route through Change Control or the offline quorum runbook).
```
Status / DR — Vault crown-jewels                          ⟳ polled · as-of 1.2s
──────────────────────────────────────────────────────────────────────────────────
 ┌ Engine seal ──────────┬ Unsealer ─────────────┬ Recovery quorum ──────────────┐
 │ ● UNSEALED            │ ● healthy             │ 3-of-5 shares · escrowed offline│
 │ source: engine as-of 1s│ seal-token TTL 21d ✔ │ last quorum-test 2026-06-15 ▲  │
 ├ Audit sinks ──────────┼ Kill level (from auth)┼ Backups ──────────────────────┤
 │ ✔✔ local + WORM current│ ⟳ G0 · fresh 0.4s    │ raft snapshot age 6h ✔         │
 │ engine-stream xcorr live│ (read-only mirror)  │ VAULT_SNAPSHOT_DEST reachable ✔ │
 └───────────────────────┴───────────────────────┴─────────────────────────────────┘
 CA & break-glass
   Suite-internal CA fingerprint  SHA256:1a2b…9f  · rotation runbook ▸
   SSH CA signing key: inside barrier, non-exportable ⛊   ← destructive-absence, printed fact
   Per-host break-glass last-verified:  nas-01 2026-06-20 ✔ · db-02 2026-04-02 ▲ overdue
```
- **The false-green discipline is the point of this screen:** **seal-unknown → GOLD, never green.** If the seal read is stale or the engine is unreachable, the Engine-seal tile renders **`⚠ CANNOT CONFIRM SEAL — engine unreachable (as-of <age>); treat as UNVERIFIED`** in halt-gold `#F2842B` — *never* a fabricated green "UNSEALED/OK." Audit-sink health is green only if **both** sinks are current (one down → gold + Pattern-D SAFE-STOPPED). Seal-token TTL is a tabular countdown; nearing expiry goes `--attn ▲`. Break-glass last-verified overdue → `--attn ▲`, never a silent green. The "SSH CA key non-exportable ⛊" is a printed destructive-absence fact.
- **States:** *loaded (healthy)* as above · *loading* = tile skeletons, `Freshness` shows `as-of —` · *empty* = N/A (there is always a seal chain to report) · *Pattern R* = N/A (a readout has no operator action to fail; a failed poll is Pattern-D) · **Pattern D (gold ⛊)** = **the dominant non-healthy state** — engine sealed/unreachable, a sink down, unsealer unreachable, or seal-token expired → the whole panel adopts halt-gold SAFE-STOPPED with "what's still true / what to do" + boot-runbook link · *stop-engaged* = kill mirrored in the Kill-level tile (gold) + shell HaltBand.

**6. Change Control `⚖` — every gate-weakening edit, behind full ConfirmFriction.**
Layout: pending-edits header + a rendered diff panel with the full ceremony inline.
```
Change Control                            pending edits: 0        [ + Propose edit ]
──────────────────────────────────────────────────────────────────────────────────
 PROPOSED EDIT — raise VAULT_SSH_CERT_TTL  10m → 30m
 ┌ Diff (hash sha256:c1a4…) ──────────────────────────────────────────────────────┐
 │  - ssh_cert_ttl: 10m                                                             │
 │  + ssh_cert_ttl: 30m   ⚠ GATE-WEAKENING — widens the window a signed cert valid  │
 └───────────────────────────────────────────────────────────────────────────────┘
 ⚠ CONSEQUENCE — moves the system TOWARD MORE real-world action: any cert signed
   after apply is valid 3× longer; a compromised cert's blast-window triples.
   Irreversible for certs already signed under the new TTL. Live kill level: G0.
 Type  raise-ssh-ttl  to confirm:  [▏         ]      Re-authenticate: 🔑 passkey (step-up)
       [ Cancel ]  (default focus)                    [ Apply edit ]  ← danger, disabled
                                                        until typed-intent matches AND 🔑 fresh
```
- The single place any gate-weakening edit happens (TTL raises, principal widening, audit-sink change, release-TTL raise, sign-role edits, CA rotation, config-as-code). Every edit is the **full ConfirmFriction**: diff rendered before confirm → typed-intent → auth Tier-2 live step-up → **diff-hash-bound** confirm token (a changed diff invalidates the token) → **tamper-evident audit row** visible in Access Audit. Cancel is default focus + `Esc`; the header halt is never occluded (`Shift+Esc` focuses it, never fires).
- **States:** *empty* = "No pending edits. Any gate-weakening change to TTLs, principals, sinks, or config lands here behind step-up" · **Pattern R** = apply rejected (stale diff-hash, step-up expired) — red inline "the diff changed or your step-up lapsed; re-open to re-confirm the current diff" · **Pattern D (gold)** = auth step-up service or engine unreachable — "apply deferred — cannot re-authenticate / engine sealed" · *stop-engaged* = gate-weakening apply refused; consequence block states the active kill level blocks it.

**◈ App-specific components (only three — each domain-unique, none a re-draw of a shared entity):**
- **SecretWriteForm** (Secrets Manager) — the write-only KV create/import surface. Built from **Field** (the masked `value` input — the only place a secret is ever typed, never echoed after submit — plus `host_id`, `name`, rotation policy, `recovery` tag `ssh-ca-resettable | provider-console | console-only`) + the **destructive-absence rule §4.7** (the printed `🔒` "no reveal path" panel) + DangerAction/ConfirmFriction for rotate. *Why unique:* a **write-only-by-construction** entry surface with deliberately **no read-back sibling** has no suite analog; only the write-only composition is new.
- **SignRoleStager** (Host Onboarding) — stages a *proposed* OpenBao SSH sign-role (`allowed_users`/`valid_principals` pinned, no wildcards, `allow_empty=false`) and emits the `TrustedUserCAKeys` snippet, for operator step-up apply. *Why unique:* an SSH-CA sign-role is a Vault-domain **gate-defining config artifact** with no suite analog; its `host_id` is TicketRef and its apply is DangerAction+ConfirmFriction (both shared) — only the role-staging form/diff is domain-specific.
- **SealChainPanel** (Status/DR) — the seal / unsealer / recovery-quorum / audit-sink-xcorr / backup / break-glass / CA crown-jewels register. *Why unique:* a secrets-store crown-jewels register has no shared model — but **every figure inside renders via Freshness §4.9** (seal-unknown → gold); it is an *arrangement of shared Freshness tiles*, not a new status primitive.
- **NOT app-specific (do not fork):** the redemption/denial ledger = AuditInspector §7.2; the exfiltration-signal pin = an AuditInspector pinned filter; the releases table = DataTable; the kill band = HaltBand; the step-up ceremony = ConfirmFriction.

**⚠ Safety / danger surfaces specific to this app:**
- **The write-only constitution is the app's signature.** Everywhere a "reveal/export/show-plaintext" affordance would live, render an **affirmative printed absence** (`🔒 / ⛊`, no interactive element) — *never* a greyed-out toggle. There is **no operator read-secret endpoint anywhere**; break-glass read is an offline 3-of-5 quorum ceremony, never a web action. Build the *absence*, not a locked control.
- **False-green is forbidden absolutely.** A seal state the console can't confirm renders **halt-gold "CANNOT CONFIRM SEAL," never a green "sealed OK."** Chain-verify that is stale/failed never renders green. Audit-sink health is green only if *both* sinks are current.
- **Two friction tiers, mapped by direction.** Toward-*less*-action (release-revoke) = light confirm, signal-cyan, **plus** the honesty carve-out ("revokes the pending release only; an issued cert dies by TTL/KRL") and the live HonestState triad. Toward-*more*-action (rotate, sign-role apply, all gate-weakening) = full ceremony: typed-intent + Tier-2 step-up + diff-hash-bound token + tamper-evident row.
- **Kill/quiesce is read-only.** The HaltBand mirrors auth's level; the Vault draws no STOP button. Under kill ≥ G1, writes/rotate/apply confirm dialogs state new issuance is halted (honesty: kill stops *new* redemption, not already-issued certs); metadata reads and the ledger stay readable.
- **Pattern R vs Pattern D kept strictly distinct.** Seal-unknown, audit-sink-down, engine-sealed, CMDB/auth-unreachable are all **Pattern D gold safe-stop**, never a red error. Only an operator's own fixable failure (bad write, stale diff-hash, terminal-release revoke) or a genuinely detected chain break is red.

**⚑ Gaps flagged:** None — the spec is complete for design. All colors, glyphs, states, and safety cues resolve to frozen DESIGN_SYSTEM tokens (`--halt-500 #F2842B`, `--danger-500 #E5594E`, `--signal-500 #29B6D8`, `--ok-500 #46B98A`) and named shared components; the three app-specific widgets are fully specified from shared primitives.
