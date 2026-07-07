# CONTRACT — Gateway + CMDB → Library: tier-0 sandbox execution + verification evidence

> **Status: FROZEN — both halves.** Gateway half §G (Gateway Stage-2, 2026-07-03); CMDB half §C (CMDB Stage-2, 2026-07-03, `apps/cmdb/planning/PLAN.md` §5). (Originated MERGE-RESEARCH-1, 2026-07-02.) This seam is indexed in CONTRACTS/README and mandated by ARCHITECTURE §5; the consumer side (Library) fully specified its needs and is **unblocked for curation go-live design**. One additive confirm-only item rides the cmdb↔gateway verdict countersign package (CMDB PLAN §11-A5: JWS verdict format + `host_class`/`verdict_basis` fields — the Gateway's A4 anticipated it).
>
> **RATIFIED D-7 (2026-07-02): filling this contract is a MANDATORY Stage-2 EXIT ITEM for BOTH Gateway and CMDB** — neither passes its Stage-2 exit criteria without its half designed here, including the explicit, non-leakable carve-out from the destructive-never-auto floor. Library curation go-live is blocked on it. Gateway satisfied this item 2026-07-03 (`apps/gateway/planning/PLAN.md` §10); **CMDB satisfied it 2026-07-03 (§C below)**.

## What the frozen contract must contain (requirements, from ARCHITECTURE §5 + Library RESEARCH §6/§7)

1. **CMDB half:** a `disposable` target class — auto-approve policy, no maintenance windows, no Vault credentials (sandboxes hold nothing worth stealing) — with an **explicit carve-out** from the "destructive classes are structurally non-auto" floor (`cmdb-gateway-policy.md` §4), scoped so the carve-out can never leak to real hosts.
2. **Gateway half:** an `execute_in_sandbox`-style surface — Board-ticketed like everything else, executed ONLY via the Gateway chokepoint (kill-switch covered), against disposable targets, with **evidence capture**: command transcript, exit status, environment/config fingerprint, returned to the Library joined by `run_id`.
3. **Harness attestation:** sandbox evidence binds to a specific **harness/config version** (identifier to be registered in IDENTIFIERS.md when minted); the harness is trusted computing base — its changes fall under §12 policy-plane change control (step-up-confirmed, tamper-evident), and the Library runs 100% spot-audit on any batch produced after a harness change.
4. **Library admission gate (consumer-side, already fixed):** trusted-tier writes require `(sandbox_evidence_present AND harness_attested) OR operator_review_approved` — no agreement count substitutes. The Library holds no credentials and no execution path; it files/claims Board tickets and stores evidence links only.

---

## §G — GATEWAY HALF (FROZEN, Gateway Stage-2, 2026-07-03)

Full design + adversarial review in `apps/gateway/planning/PLAN.md` §10; this section is the binding consumer-facing surface.

**G1. Tool.** `run_sandbox_test(ticket_id, profile_key, input_ref, op_id)` — flat, 4 args, `additionalProperties:false`, all required. `profile_key` is an enum over the Gateway sandbox-profile catalog. `input_ref` names the doc/note-revision under test (opaque to the Gateway). NOT an approval/consume path — sandbox execution is not destructive/irreversible (ARCH §5: "a sandbox has no real world"), so it rides the ordinary `in_progress` work lane.

**G2. Scope.** New **`gateway:sandbox`** scope — non-holder, write-benign, granted to **curation-team personas only** (gated on the `team` label). **Grant-time exclusion (requested of auth):** `gateway:sandbox` and `gateway:execute` are never grantable to the same principal. `gateway:execute` never confers the sandbox tool and vice versa (separate tool, separate handler).

**G3. Four-holder chain, degenerated honestly** (the carve-out proof — none of the destructive path leaks in):
- **Board** — ticket exists + the caller holds the live `in_progress` claim; Gateway validates claim + fencing via Board facts (`GET /facts/ticket/{ticket_id}`). No `consume_approval`, no execution hold.
- **CMDB** — a signed verdict for `{host_id=<sandbox pool id>, action_class=sandbox_exec}` on the `disposable` class must return `permit`/auto. **This is the operator's sandbox kill knob** (set the class to deny → all sandbox exec stops). *(Depends on the CMDB half, §C.)*
- **Vault** — **structurally absent.** No redemption code path exists on the sandbox branch; sandboxes hold nothing worth stealing.
- **Gateway** — per-sandbox-slot concurrency mutex + the **global kill switch** (same dispatcher, same `cancel_callback`, refuses at kill level ≥ G1 — sandbox execution is kill-switch-covered per killswitch-chain §5).

**G4. Target — never caller-named.** The tool has **no host parameter**. The Gateway spawns a fresh container per run from the pinned harness image (podman; no suite networks; no tokens/creds mounted; CPU/mem/wall-clock caps; default-deny egress, per-profile mirror allowlist only). A real `host_id` is unrepresentable in the request — the strongest non-leak guarantee.

**G5. Carve-out non-leakage (the D-7 obligation, five independent barriers):** (1) separate tool + separate scope (G2); (2) no host parameter (G4); (3) the sandbox branch contains no Vault client and no SSH inventory — real-host execution is a wholly different code path with all four real checks; (4) `sandbox_exec` is a **7th action class valid ONLY on this branch** — real-catalog playbooks never carry it, sandbox profiles carry only it, and `cmdb-gateway-policy.md` §4's non-auto floor for the six real classes is untouched; (5) a poisoned CMDB row marking a real host `disposable` still cannot reach it — the sandbox path executes only into containers the Gateway itself just spawned.

**G6. Evidence (what Library admits on).** `{run_id, ticket_id, profile_key, harness_version, input_ref, transcript_ref (content-addressed blob + hash in the Gateway audit chain), exit_status, env_fingerprint (image digest + package versions), started, finished}` — hash-chained like every Gateway record; joined to Library by `run_id`. Read back via `get_sandbox_evidence(run_id)` (scope `gateway:read`). Library stores evidence **links** only.

**G7. Harness attestation.** `harness_version` = `hv-` + first 12 hex of `sha256(harness image digest ‖ canonical profile-catalog JSON)` — **Gateway-minted; registered in IDENTIFIERS.md (2026-07-03)**. Any harness/profile change runs through step-up-confirmed, tamper-evident change control (ARCH §12), and the change event is emitted (Board/Chat) so Library triggers its 100% spot-audit on post-change batches.

## §C — CMDB HALF (FROZEN, CMDB Stage-2, 2026-07-03)

Full design + adversarial review in `apps/cmdb/planning/PLAN.md` §5 (evaluation-order details §3.3); this section is the binding surface.

**C1. Class axis.** `class ∈ {managed, disposable}` is a top-level host attribute, **orthogonal to tier** — a disposable host has no tier at all (nothing to downgrade; nothing leaks through the tier catalog). `class` is **immutable**: no edit path exists; "reclassification" = retire + create, both under policy-plane change control.

**C2. Registration.** Disposable targets are a small **static, operator-registered pool** (`sandbox/pool.md`), each slot a normal CMDB-minted `host_id` (e.g. `sbx-01` — display convention only; the class attribute is the authority, IDENTIFIERS.md rule 4). Creating a slot is a **gate-weakening edit** (step-up-confirmed, tamper-evident). Matches §G4: the Gateway maps runs to pool slots and queries `{host_id: <pool id>, action_class: sandbox_exec}`; per-container ephemeral identity is Gateway-internal and never becomes a CMDB host. **Dynamic machine registration of disposable hosts does not exist.**

**C3. Verdict semantics.** The universal fail-closed preconditions (`cmdb-gateway-policy.md` §2 — host resolution, snapshot health, **action_class enum validation, clock health**) run **before** the class branch; the carve-out substitutes only window/floor/approval-mode semantics, never input validation or environment health. A disposable host with `action_class == sandbox_exec` returns `permit`/`auto`, `verdict_basis: sandbox_carve_out`, `host_class: disposable`, `in_window: true`, window fields/`tzid` null, `grace: 0`, `tier: null`, `valid_until = evaluated_at + 60s`. Verdicts are signed (Ed25519 JWS, `aud: "gateway"`, `jti = decision_id`, `exp = valid_until` — CMDB PLAN §3.4), decision-logged, and TOCTOU-re-queried like every other verdict.

**C4. `sandbox_exec` scoping (the carve-out, both directions).** `sandbox_exec` is the 7th CMDB-owned action class, valid **only** when the stored class is `disposable`: `sandbox_exec` on a managed host ⇒ `deny(wrong_target_class)`; any of the six real classes on a disposable host ⇒ `deny(wrong_target_class)`. The `cmdb-gateway-policy.md` §4 destructive-never-auto floor for the six real classes is untouched by the carve-out's existence.

**C5. The operator's sandbox kill knob (§G3).** `sandbox/pool.md` carries `enabled: true|false`. Disabling is an instant, ceremony-free **tightening** edit — every sandbox verdict becomes `deny(sandbox_disabled)`; re-enabling is a weakening edit (step-up). The global kill switch additionally covers sandbox execution at the Gateway chokepoint (killswitch-chain §5); the knob is the policy-plane stop, never a second enforcement point.

**C6. Non-leak invariants (all structural, CMDB side).** (1) The carve-out branch is selected only by the **stored** class attribute — never by any request input, tier, or override. (2) A disposable record carrying any window, override, tier ref, or Wazuh bind is a config error ⇒ `deny(sandbox_config_error)` + Board escalation (fail-closed *inside* the carve-out). (3) Disposable hosts are excluded from managed-fleet policy queries by default and always flagged in `list_fleet`. (4) The verdict's `host_class`/`verdict_basis` fields let the Gateway cross-check surface segregation — `run_sandbox_test` requires `host_class == disposable`, `execute_approved_plan` refuses it — independent of §G5's own five barriers.

**C7. No Vault credentials.** Disposable slots never have credential handles provisioned (`cred://hosts/<host_id>/…` stays empty for them); the Gateway's sandbox branch is structurally Vault-free (§G3). Vault Stage-2 inherits this as a stated exclusion.
