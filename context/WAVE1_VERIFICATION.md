# WAVE-1 STAGE-4 VERIFICATION — inspect-and-report pass (2026-07-06)

> **Scope.** A root verification pass over the four+one Wave-1 Stage-4 builds *before any merge*: branch hygiene, contract conformance (field-for-field vs `context/CONTRACTS/`), the recurring "declared-but-not-enforced" drift class, and cross-build coherence. **This is a report only** — no app code was modified, nothing was merged. Findings were produced by reading the code at each build's commit in isolated read-only worktrees (never by switching the main working tree's branch, to avoid recreating the reported collision).
>
> **Builds in scope (5):** drive, notes, agent-runtime, library, chat. Each verified at the commit that actually holds its build (see §1 — the branch *labels* do not reliably point there).
>
> **Bottom line:** all five builds are **GO-TO-MERGE on their code**. The one thing that must be handled first is **branch untangling** (§1) — labels are scrambled and the agent-runtime commit is duplicated. No work is lost; it is a re-pointing problem, not a rebuild. Plus one systemic, low-severity drift shared by all five (§3.0) and a real auth-countersign debt (§4).

---

## 1. BRANCH HYGIENE — ⚠️ NEEDS UNTANGLING (no work lost)

### 1.1 What each commit actually contains (per-branch file manifest)

Every build commit is **app-isolated** — it touches only its own app directory. The only build that touches anything under `context/` is agent-runtime (its own new contract + a 1-line `DEPLOYMENT.md` amendment). **There is no cross-app file contamination inside any commit**, and **no two branches edit the same shared-spec row differently** (only agent-runtime edits `DEPLOYMENT.md`, and it does so identically on both chains it appears on).

| Commit | Subject | Files touched | Clean? |
|---|---|---|---|
| `84d796f` | Drive build | `apps/drive/**` only | ✅ isolated |
| `a113dde` | Notes build | `apps/notes/**` only | ✅ isolated |
| `0fdbc4a` | Agent-runtime build | `platform/agent-runtime/**` + `context/CONTRACTS/agent-runtime-auth-key-provisioning.md` (new) + `context/specs/DEPLOYMENT.md` (+1 line: agent-runtime port→8080) | ✅ isolated (+ legit self-authored contract) |
| `60d598a` | Agent-runtime build (**DUPLICATE**) | identical file set to `0fdbc4a` | ⚠️ cherry-pick twin |
| `cea4f32` | Library build | `apps/library/**` only | ✅ isolated |
| `6ed925c` | Chat build | `apps/chat/**` only | ✅ isolated |

**Duplicate confirmed harmless-to-merge-but-must-not-double-land:** `0fdbc4a` and `60d598a` share an **identical `git patch-id` (`a8cede51…`)** — they are the same agent-runtime change cherry-picked onto two different bases (the reported "landed on drive first, cherry-picked back"). They will not textually conflict, but **exactly one** of them may be merged.

### 1.2 The scramble — branch labels ≠ their namesake build

The commits are stacked in **two chains** off the Stage-3 design base `be417ed`:

```
be417ed (stage3/design-system, and — wrongly — stage4/notes-build)
├─ Chain A:  0fdbc4a (agent-runtime) ─ cea4f32 (library)
│               tips here: stage4/agent-runtime-build, stage4/library  → cea4f32
└─ Chain B:  84d796f (drive) ─ a113dde (notes) ─ 60d598a (agent-runtime DUP)
                tip stage4/drive-build → a113dde ; tip stage4/library-build → 60d598a
```

| Branch label | Currently points at | Which build that is | Correct? |
|---|---|---|---|
| `stage4/chat-build` | `6ed925c` | **chat** | ✅ CORRECT |
| `stage4/drive-build` | `a113dde` | notes (drive is its parent) | ❌ points at NOTES |
| `stage4/notes-build` | `be417ed` | *nothing* — the design base | ❌ EMPTY (no notes build) |
| `stage4/library-build` | `60d598a` | agent-runtime (the DUP) | ❌ points at AGENT-RUNTIME dup |
| `stage4/agent-runtime-build` | `cea4f32` | library (agent-runtime is its parent) | ❌ points at LIBRARY |
| `stage4/library` | `cea4f32` | library | ✅ (correct build, non-canonical name) |

**Every build's commit exists in the repo — nothing was lost.** The labels simply lie. Trust the commit hashes below, not the branch names.

### 1.3 Where each build truly lives

| Build | Canonical commit | Parent (stacked on) |
|---|---|---|
| Drive | `84d796f` | `be417ed` (clean base) |
| Notes | `a113dde` | `84d796f` (**stacked on drive**) |
| Agent-runtime | `0fdbc4a` (canonical) / `60d598a` (dup) | `be417ed` / `a113dde` |
| Library | `cea4f32` | `0fdbc4a` (**stacked on agent-runtime**) |
| Chat | `6ed925c` | `be417ed` (clean base) |

### 1.4 Merge guidance (operator dispatches — NOT executed here)

Because every commit is app-isolated, stacking causes **no file conflicts**; it only means merging a chain tip brings multiple apps at once. Two viable paths:

- **Path A — merge the chains as-is (fewest steps).** Merge `6ed925c` (chat), `a113dde` (brings drive + notes), and `cea4f32` (brings agent-runtime + library) → all five apps land in three merges. **Do NOT also merge `60d598a`** (it is the agent-runtime cherry-pick twin already arriving via `cea4f32`'s parent `0fdbc4a`). Then `stage4/library-build` (= drive+notes+dup) is fully redundant and should be deleted, not merged.
- **Path B — clean per-app separation.** Cherry-pick each of `84d796f`, `a113dde`, `0fdbc4a`, `cea4f32`, `6ed925c` onto a fresh base as five independent one-app branches, then merge individually. More work, but restores one-branch-per-app and lets each app be merged/reverted alone.

**Either way, before merging:** re-point or delete the misleading labels so nobody merges `stage4/agent-runtime-build` expecting agent-runtime (it is library) or `stage4/drive-build` expecting only drive (it is drive+notes). Confirm the single `DEPLOYMENT.md` agent-runtime-port line and the new `agent-runtime-auth-key-provisioning.md` land exactly once.

**Housekeeping:** a stray untracked `Helm Design System-handoff.zip` sits in the repo root — do not commit it.

---

## 2. CROSS-BUILD COHERENCE — ✅ PASS

### 2.1 One Helm design system, verified

The canonical Helm bundle is `context/design/handoff/helm-design-system/project/_ds_bundle.js` (`sha256 4b41c8dd…`). All five apps consume the **same** design system — via two packaging strategies, both provably from the one source:

| App | Packaging | Evidence |
|---|---|---|
| drive | vendored `_ds_bundle.js` | `4b41c8dd…` — **byte-identical** to canonical |
| notes | vendored `_ds_bundle.js` | `4b41c8dd…` — **byte-identical** |
| agent-runtime | vendored `_ds_bundle.js` | `4b41c8dd…` — **byte-identical** |
| library | Vite-built `ui/build/shell.js` + `tokens.css` | `tokens.css` holds identical Helm token **values** (`--surface-backdrop:#0A0C10`, `#0E1116`, `#12161C`, `#171C24`) |
| chat | source React `components/ds/` + 7-file `styles/tokens/` | `colors.css` byte-identical Helm surface tokens (same values **and** comments); token set matches drive's exactly |

The three raw-bundle apps also share identical `styles.css` (`2b41c84f…`) and identical per-file token CSS hashes (`base 267e65ca…`, `colors 0abf4f68…`, `elevation e98dc5ee…`, `fonts 23970542…`, `motion b27aa1c1…`, `spacing 05b18889…`, `typography 7647e424…`). **No divergent copies, no invented styling.** (The unrelated `564acef8…` `_ds_bundle.js` under `apps/pdf/design/handoff/pdf-forge-…` is the older, separate *pdf-forge* handoff — not Helm, not used by these five.)

- **Soft coherence note (non-blocking):** library and chat compile their UI from Helm source rather than vendoring the frozen blob, so they cannot be hash-pinned to the canonical bundle the way the trio is. Token *values* match today. Operator may want a spot-check that a shared cross-app component (e.g. the kill/halt-state band, tier badge, ticket-ref chip) renders identically in library/chat vs the trio, and that both rebuild from the same token source going forward.

### 2.2 Shared entities

All five derive the **principal/`sub`** only from the validated token / cryptographically-verified `X-Auth-Identity` (never an advisory header), enforce single-valued `aud == self`, and reject multi-valued `aud` — consistent with `auth-apps-tokens-scopes.md` §8. Fencing/kill/tier state render through the shared Helm honest-state components. Coherent across the suite.

---

## 3. PER-APP RESULTS

### 3.0 Systemic drift shared by ALL FIVE (low severity, not a blocker for any)

**`additionalProperties:false` is declared on every app's MCP tool schemas but not enforced server-side.** In all five builds the closed schema is *advertised* (satisfying the D-17 complexity ceiling, which governs the shape the local model must drive) but the server reads named fields individually and **ignores/strips unknown keys rather than hard-rejecting them**. This is the exact "declared-but-not-enforced" class this audit targets, and it recurs identically — almost certainly a shared idiom copied across builds.

**Why it is low severity everywhere:** required fields *are* validated (missing → reject), enums/types/ranges *are* enforced, extra fields are inert (never reach control flow), no app in scope has a destructive-action or ticket-transition surface reachable this way, and identity spoofing is independently closed by stamping the actor from the token. It is a potential **CHECKLIST false-green** ("strict schema") more than an exploit.

**Recommendation (suite-wide follow-up, post-merge OK):** add a real unknown-key reject — TS/JS: an explicit strict validator or Ajv on `tools/call` args and REST bodies (drive, notes); Python: `model_config = ConfigDict(extra="forbid")` on the pydantic input models (chat) / runtime arg-validation in `_dispatch_tool` (library, agent-runtime `from_wire`/tunables loader).

### 3.1 DRIVE — ✅ GO-TO-MERGE

- **Contracts:** `board-agents-claim.md` fencing MATCH at the contracted **"local high-water"** strength (IDENTIFIERS §22) — integer generation, per-ticket high-water. `auth-apps-tokens-scopes.md` §3 scope↔tool map EXACT (`drive:read`/`drive:write`, no delete tool ⇒ no delete scope). (Cosmetic: MCP input schema advertises `fencing_token` as `string`, coerced to int — semantics preserved; field name not frozen per contract §1.)
- **Drift class:** Fencing **genuinely rejects stale/missing** tokens (`store.ts:172-177` `throw STALE_FENCING` inside the commit txn; missing → `FENCING_REQUIRED`; both → HTTP 409) — **not** recorded-but-unchecked. Every byte endpoint (upload/abort/content GET/HEAD, current + by-version) is auth+scope gated; no unauthenticated byte path, no signed/capability URLs. The one destructive route (GC purge) fails closed on human-kind + step-up freshness + budget + kill-epoch + typed `confirm==='PURGE'`.
- **Blocker:** none. Follow-up = §3.0.

### 3.2 NOTES — ✅ GO-TO-MERGE

- **Contracts:** fencing + ceremony seam semantics MATCH (`lock_generation` integer; ceremony phases = `TICKET_STATE_MACHINE.md` §3 verbatim). `auth` scopes EXACT (`notes:read/search/append/write`; `svc:notes → board:read`). **Board read *endpoint shapes* are `PROVISIONAL-ENDPOINT-SHAPE`** (lease / ticket-facts / ceremony) — the `board-notes-ceremony.md` seam is owed by Board Stage-2; semantics bind, URLs/JSON do not yet. Fails safe (`FENCE_UNVERIFIABLE`; taint floor → `host_originated`).
- **Drift class (all critical guards PASS with tests):** **Fencing is UNCACHED** — live `currentFenceGeneration()` on every ticket-bound write, no TTL/memo (the removed ≤5s cache is documented gone), reject on stale + fail-closed on Board-unreachable. **Frontmatter firewall holds** — display-only fields are structurally stripped before indexing/read; frontmatter can *not* become a Board trigger (dedicated test proves absence from index columns, read responses, search hits, taint object). **Transitive taint is raise-only** (`max(existing, floor, declared)`; downgrade → business error; reconciler re-raises git-level downgrades). **Boot refuses without a configured git remote** (first line of bootstrap; tested).
- **Blocker:** none. Track the provisional Board seam so the frozen `board-notes-ceremony.md` is reconciled against `client.js` field names before Notes Stage-7. Follow-up = §3.0 (extras inert, no `.strict()`).

### 3.3 AGENT-RUNTIME — ✅ GO-TO-MERGE (Critical-infra; built ahead of its gates)

- **Contracts (all four field-for-field MATCH):** heartbeat per-agent + fleet frames and `drain_state` vocab = `agent-runtime-mc-heartbeat.md` exactly (`to_wire()` asserts set-equality → drift fails at runtime); kill command `{mode,epoch,grace_deadline,issued_by,idempotency}` = `killswitch-chain.md` §2; `generate()/embed()` signatures + the **5 typed error codes** = `agent-runtime-library-inference.md`.
- **Drift class (all five fail-closed controls are real code rejections):** epoch machine (stale-epoch ignored, KILL=zero grace, DRAIN grace clamped, M3 fail-closed boot until live auth poll, M2 outage re-arm); **TransitionGuard** SoD whitelist hard-raises `TransitionForbidden` for `{approved,executing,verifying,done,failed,cancelled}` and never forwards; provenance gate cannot fabricate a green (soft-posture → `outcome="unverified"`, not `"verified"`; runtime-computed, model-id/digest matched); custody gives honest `CANNOT-CONFIRM` with no TPM and **refuses executor personas on non-attested nodes**; model structured output uses `"strict":true`.
- **PENDING placeholders — all VISIBLE, none silently hardcoded:** every tunable in `config/runtime.yaml` + `models.yaml` is tagged `# PENDING-SIZING`; the model pins are literally `"PENDING-SIZING…"` / `sig_ref:"sigstore:PENDING"` **so the provenance gate would refuse them by construction** (fail-closed, not a live pin); headroom UI renders "(estimate — PENDING-SIZING)". Honesty-preserving.
- **Blockers:** none on code. Two items to record: (a) **auth-countersign debt** — this build **self-authored and "froze" `agent-runtime-auth-key-provisioning.md` (auth has NOT countersigned)** and built the full client half (see §4); (b) **ledger contradiction** — `context/CONTRACTS/README.md:48` still lists that seam under "Still to write … freeze at runtime Stage-2 jointly with auth," contradicting the contract file's own "FROZEN (runtime side)" header — reconcile the README. Also the §3.0 inbound leniency (`KillCommand.from_wire` / tunables loader ignore extra keys).

### 3.4 LIBRARY — ✅ GO-TO-MERGE

- **Contracts:** embed facade CONFORMS (`embed(texts,input_type)`, role-based model select, prefix convention, 429 backoff, D-13 FTS-only degrade). `auth` §7 slice EXACT (`library:read/propose/curate/admin`; `library:admin` human-kind-gated in code). `cmdb-library-hostfacts.md` (inventory-only projection, fail-loud-open) and `gateway-cmdb-library-sandbox.md` (run_id-bound evidence) CONFORM. (Minor: the facade's 4 distinct typed errors are collapsed into a generic fail-closed `DependencyDown` — no safety impact; surface `model-provenance-failure` distinctly at Stage-5.)
- **Drift class (security-critical PASS):** **admission gate is content-bound in code** — admits *only* `attestation == gateway_delivered` **with `attested_content_sha256 == doc.content_sha256` and a validated `harness_version`**; **hard-rejects `agent_asserted` evidence** (`admission.py:74-76 continue`); cross-reference only raises review priority, an agreement count can never admit. **Auto-admit lane DISABLED pre-D7** (`auto_admit_enabled` defaults **False**; even a satisfied gate routes to review; visible, tested D-7 kill-knob — not silently removed nor enabled). **`propose` is quarantine-only** (`tier=single-source`, `admission=quarantined`; no MCP path to trusted tier / admin ops). **embed only via the facade** (no local embedder; unconfigured → zero-vector FTS-only).
- **Blocker:** none. **New debt:** library assumes an **unregistered `svc:library`** principal (`cmdb:read-policy` + `gateway:read`) for its currently-dormant outbound calls — needs auth registration before the D-7 auto-admit lane goes live (see §4). Follow-up = §3.0.

### 3.5 CHAT — ✅ GO-TO-MERGE

- **Contracts:** MC review-item URL scheme is **derived verbatim** from `mc-chat-review-resolve.md` §2 (`https://mc.<domain>/review/<ticket_id>` and `/ticket/<ticket_id>`; identity IS the Board `ticket_id`, URL-encoded, no new id minted; host+path template-fixed so an agent cannot inject a URL) — **not invented**; tested against exact strings. `auth` §3 scope triple EXACT (`chat:post` only agent-reachable; `chat:read`/`chat:manage` operator-only + kind-barred); correctly uses `chat:manage` (no dead `chat:broadcast`).
- **Drift class:** **ntfy holds zero auth logic** (formats + POSTs only; its lone `Authorization` header is Chat's own device write-token, not a principal). **Agent surface is write-only** — `/mcp/tools` exposes exactly `post_notification`; no read/list/ack/broadcast tool registered on that audience (import-time regression guard + tests confirm the read tools 404/405). Rate-limit / dedup-idempotency / secret-scan+sanitize / escalation-nag all enforced on **both** surfaces and fail closed (escalation re-arms until ack, not "silence after N nags").
- **Blocker:** none for Stage-4. **Stage-7 gate (expected, documented):** the MC resolve-event subscriber (seam #24) is PENDING the `svc:chat → mc:read` grant; `svc:chat` is not yet registered in auth §9. Blocks Chat Stage-7, not this merge. Follow-up = §3.0 (`extra="forbid"` missing).

---

## 4. CONSOLIDATED AUTH-COUNTERSIGN DEBT

A required **auth session** owes the following before these apps *fully* verify (Stage-5/Stage-7). None blocks the Stage-4 code merge; every dependency is coded fail-closed / degraded-until-active.

**A. New contract auth must countersign**
1. **`agent-runtime-auth-key-provisioning.md` (C7/C8)** — self-authored by the agent-runtime build, marked "FROZEN (runtime side), awaiting auth countersign." Auth owes: EK allow-list ownership, accepted TPM2_Certify attestation format, CSR-vs-JWK default, rotation/revocation endpoint shapes. **Plus reconcile `CONTRACTS/README.md:48`** (still says "Still to write"). *This is one built half of a seam auth has not agreed to.*

**B. Service principals these builds assume**
2. **`svc:notes` → `board:read`** — REGISTERED in auth §9 (identity pinned), grant **activates at the Stage-5 store migration**. Notes degrades until active.
3. **`svc:drive` → `board:read`** — REGISTERED in auth §9, activates at Stage-5. Drive stays flag-always-degraded until this **and** the Board ticket-exists endpoint exist.
4. **`svc:library` → `cmdb:read-policy` + `gateway:read`** — **NOT registered in auth §9** (new). Dormant until D-7 auto-admit; must be registered before that lane goes live.
5. **`svc:chat` → `mc:read`** — **NOT registered in auth §9** (new). Used internally as an audit actor today; the `mc:read` grant is needed for the resolve subscriber (blocks Chat Stage-7).

**C. Scope-constant + kind-gate edits (auth-side, Stage-5 mechanical)**
6. **Scope constants** to add to `auth.core.scopes`: `library:read/propose/curate/admin`, `notes:append`, `chat:manage`; **retire `chat:broadcast`**. Contract-registered (auth §7/§11.3), not yet in code.
7. **`HOLDER_ALLOWED_KINDS[board:approve] += service`** (the Stage-5 opener, for `svc:tier-approver`) — and review removing `agent` in the same pass. *(Belongs to Board/auth, not one of these five builds, but is on the same ledger.)*

**D. Audiences** — `notes`/`drive`/`chat` countersigned (auth §3); `library` audience countersigned (auth §7). All activate at Stage-5.

**E. Cross-cutting open item (not strictly countersign)** — the **Redis budget-transport contradiction** (auth §11.1 → root-review-#2): the shared-budget middleware requires the one shared Redis while `DEPLOYMENT §3` declares it auth-private. notes/chat/drive/library all implement the budget middleware behind a rebindable seam; the topology decision is parked, not resolved.

> **Out of this wave's scope (listed for the full ledger only):** `svc:vault` and `svc:cmdb` are assumed by the *unbuilt* Vault/CMDB Stage-2 plans, not by any of the five builds verified here.

---

## 5. OPERATOR FRESH-CLONE CHECKLIST

You must boot/verify these yourself — the builds are proven-by-construction (no live run was performed here). Steps are grounded in each app's `verification/CHECKLIST.md` + `DEPLOYMENT.md` (§2: every app = own-name DNS, internal port **8080**, joins `edge`; agent-runtime's build amends its "TBD" port to 8080).

### 5.0 Prerequisites
- **Windows long paths** (this repo hit it): `git clone -c core.longpaths=true …` or `git config --global core.longpaths true` before checkout (a `pdf` design-handoff path exceeds MAX_PATH otherwise).
- **Check out the RIGHT commit, not the branch label** (§1.2). E.g. verify notes at `a113dde`, agent-runtime at `0fdbc4a`, library at `cea4f32` — the like-named branches are wrong.
- Toolchains: Node ≥20 (drive, notes), Python ≥3.11 (chat, library, agent-runtime), Docker + compose for container boots.

### 5.1 Drive — `apps/drive/` (TypeScript/Fastify, commit `84d796f`)
```bash
cd apps/drive
npm ci
npm test          # node --test test/**/*.test.ts  (auth / contract / fencing suites)
npm run typecheck # tsc --noEmit
# Container: no app-local compose; runs under the root suite compose, port 8080 on `edge`.
```
Expect: fencing + contract + auth tests green. Degraded-by-design until `svc:drive`/Board ticket-exists/budget API are wired (flag-always, not failing).

### 5.2 Notes — `apps/notes/` (Node, commit `a113dde`)
```bash
cd apps/notes/server
npm ci
npm test                 # node --test
npm run rebuild-drill     # index rebuild-from-markdown drill (canonical-store restore evidence)
# Boot REQUIRES a configured git remote or it refuses to start (fail-closed, by design):
#   set NOTES_GIT_REMOTE_URL (and creds) then `npm start`
# Container: docker-compose.notes.yml (note the non-standard filename); corpus is a named volume that is also a git repo with a remote.
```
Expect: tests green incl. `frontmatter-firewall`, `fencing` (uncached), `taint`, `boot-required`. Unset remote ⇒ intentional BOOT FAILURE.

### 5.3 Agent-runtime — `platform/agent-runtime/` (Python, commit `0fdbc4a`)
```bash
cd platform/agent-runtime
python -m venv .venv && . .venv/Scripts/activate    # bin/activate on POSIX
pip install pyyaml fastapi uvicorn httpx pytest
PYTHONPATH=src pytest -q                              # pure-logic + contract-conformance
AR_CONFIG_DIR=config PYTHONPATH=src python -m agent_runtime   # serves :8080 → /status
```
Expect: tests green. Model/tuning pins are `PENDING-SIZING` placeholders — the provenance gate will (correctly) refuse the placeholder model pins; real pins + TPM/infra bindings are marked CANNOT-VERIFY-IN-SANDBOX in its CHECKLIST.

### 5.4 Library — `apps/library/` (Python, commit `cea4f32`)
```bash
cd apps/library
pip install -r requirements.txt -r requirements-dev.txt
PYTHONPATH=src python -m unittest discover -s src/library/tests -v
PYTHONPATH=src LIBRARY_DATA_DIR=/tmp/libdata python -m library.server   # port 8080
# Container: docker-compose.yml
```
Expect: green incl. `test_admission_gate`, `test_auto_admit_disabled`, `test_index_rebuildable`. Auto-admit lane stays OFF (`LIBRARY_AUTO_ADMIT_ENABLED=false` default) — do not flip it pre-D7. UI assets live under `ui/build/` (tracked via `git add -f` past the root `.gitignore build/`).

### 5.5 Chat — `apps/chat/` (Python/FastAPI, commit `6ed925c`)
```bash
cd apps/chat/backend
pip install -r requirements.txt          # + requirements-dev for pytest
python -m pytest app/tests -o addopts="" -q
uvicorn app.main:app --host 0.0.0.0 --port 8080
# Container: docker-compose.yml (+ chat_ntfy sidecar, port 80, edge-only, ntfy.<domain>, forward-auth-exempt)
```
Expect: green incl. `test_contract_conformance` (MC URL scheme + scope triple + write-only surface), `test_deep_links`, `test_ratelimit`, `test_sanitize_hygiene`. The resolve-feed health row renders honest amber PENDING until `svc:chat→mc:read` lands (Stage-7).

---

## 6. VERDICT SUMMARY

| Item | Verdict |
|---|---|
| Branch hygiene | ⚠️ **NEEDS UNTANGLING** — labels scrambled + agent-runtime commit duplicated; **no work lost, no file contamination, no shared-spec conflict**. Merge by commit hash per §1.4; do not double-land `60d598a`. |
| Drive — code | ✅ GO-TO-MERGE |
| Notes — code | ✅ GO-TO-MERGE (track provisional Board seam) |
| Agent-runtime — code | ✅ GO-TO-MERGE (auth owes key-provisioning countersign; fix README:48) |
| Library — code | ✅ GO-TO-MERGE (register `svc:library` before D-7) |
| Chat — code | ✅ GO-TO-MERGE (Stage-7 needs `svc:chat→mc:read`) |
| Cross-build coherence | ✅ PASS — one Helm design system, all five |
| Systemic drift | ⚠️ low severity, all five — `additionalProperties:false` advertised, not server-enforced (§3.0); inert today; suite-wide follow-up |
| Auth-countersign debt | 📋 real — one un-countersigned contract + 2 new svc principals + Stage-5 scope/kind edits (§4) |

*Produced by inspection at read-only worktrees; nothing merged, no app code modified.*
