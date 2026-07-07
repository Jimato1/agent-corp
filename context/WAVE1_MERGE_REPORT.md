# WAVE-1 STAGE-4 MERGE REPORT — integration branch (2026-07-06)

> **What this is.** The five Wave-1 Stage-4 builds reconciled and merged onto a single integration branch **`stage4/wave1-integration`** for operator review. **Nothing was pushed; `main` was not touched; no app source logic was modified.** All shared-spec reconciliation was verified (not assumed), and the merge is **clean** — zero conflicts across all six merges.
>
> **Companion doc:** `context/WAVE1_VERIFICATION.md` (the prior inspect-and-report pass — branch-hygiene verdict + per-app findings). This report executes the merge that verification recommended.
>
> **Bottom line:** the integration branch is coherent and `main` **fast-forwards to it cleanly**. See §5 for the go/no-go.

---

## 1. BRANCH-HYGIENE RE-CONFIRMATION — ✅ CLEAN (re-checked, not trusted)

Re-verified each build commit's file manifest independently. **Every build commit is app-isolated**; the only build touching `context/` is agent-runtime (its own new contract + a single `DEPLOYMENT.md` row). No cross-app file appears on the wrong branch.

| Build | Canonical commit | Touches | Context/ delta | Clean? |
|---|---|---|---|---|
| Drive | `84d796f` | `apps/drive/**` | none | ✅ |
| Notes | `a113dde` | `apps/notes/**` | none | ✅ |
| Agent-runtime | `0fdbc4a` | `platform/agent-runtime/**` | `+agent-runtime-auth-key-provisioning.md` (new) · `DEPLOYMENT.md` (±1 row: agent-runtime port `TBD→8080`) | ✅ |
| Library | `cea4f32` | `apps/library/**` | none | ✅ |
| Chat | `6ed925c` | `apps/chat/**` | none | ✅ |

**Branch labels remain scrambled** (unchanged — this session did not re-point them; that stays an operator decision). The merge was driven **by commit hash**, not by the misleading labels:
- `stage4/drive-build` → `a113dde` (notes), `stage4/notes-build` → `be417ed` (empty base), `stage4/library-build` → `60d598a` (agent-runtime **DUPLICATE**), `stage4/agent-runtime-build` → `cea4f32` (library), `stage4/chat-build` → `6ed925c` (chat, the one correct label).
- The **duplicate agent-runtime commit `60d598a`** (identical `patch-id` to `0fdbc4a`) was **excluded** from the merge — confirmed *not* an ancestor of the integration HEAD.

**No contamination found.** No branch merged.

---

## 2. SHARED-SPEC RECONCILIATION — ✅ NO COLLISION (union verified, nothing hand-resolved)

The feared multi-branch collision on `DEPLOYMENT.md` / `IDENTIFIERS.md` / `CONTRACTS/*` **does not exist at Stage-4.** Evidence:

- **All five builds are stacked on one shared base — `be417ed`** (the Stage-3 Helm design-system import), which is a **linear descendant of `main`**. That base already carries every Stage-2/Stage-3 shared-spec registration (note_id `N-`ULID, doc_id `lib-`ULID, release_id `rel-`ULID, `harness_version`, the fencing-consumer expansion adding Notes+Drive, the budget-middleware transport resolution, the `data_vault` network + `vault_openbao`/`vault_unsealer` sidecars, and two Stage-3-frozen contracts). Because it is a **shared ancestor**, these are inherited once — not competing edits.
- **The only Stage-4 edit to any shared spec is agent-runtime's**, and it is a **single row** (`agent-runtime` port `TBD in its research → 8080` + operator-UI forward-auth posture) that **no other branch touches**. drive/notes/chat/library each touch **zero** `context/` files (verified: `0` each).
- **No two branches edit the same row differently. No contract is double-frozen** — agent-runtime *adds* a new file (`agent-runtime-auth-key-provisioning.md`); the design base added *different* files (`cmdb-gateway-verdict-token.md`, `gateway-mc-audit-anchor.md`) and modified `README.md`/`auth-apps-tokens-scopes.md`/`gateway-cmdb-library-sandbox.md`.

**Consequence:** no manual "reconciled shared-specs commit" was necessary — there was nothing to hand-merge. The union is achieved structurally: the design base (already-unioned Stage-2/3 registrations) landed as **merge #1**, and agent-runtime's one non-conflicting row landed with **merge #2**. The union was then **verified at HEAD** (§4).

> **Same-row conflicts needing operator judgment: NONE.**

---

## 3. MERGE RESULT PER APP — ✅ ALL CLEAN (0 conflicts)

Integration branch `stage4/wave1-integration` created off `main` (`8580846`). Merged with `--no-ff` (explicit merge commits for reviewability), in dependency order, **skipping the duplicate**:

| # | Merge commit | Brings | Conflicts | Files touched |
|---|---|---|---|---|
| 1 | `c332d0c` | Stage-3 design-system + shared-spec base (`be417ed`) | none | `context/design/**`, design docs, shared-spec union |
| 2 | `b2e9d3b` | **agent-runtime** (`0fdbc4a`) — the hub | none | `platform/agent-runtime/**` + DEPLOYMENT row + new contract |
| 3 | `fb66236` | **drive** (`84d796f`) | none | `apps/drive/**` only |
| 4 | `17e2046` | **notes** (`a113dde`) | none | `apps/notes/**` only |
| 5 | `fe4b172` | **chat** (`6ed925c`) | none | `apps/chat/**` only |
| 6 | `7c92eb0` | **library** (`cea4f32`) | none | `apps/library/**` only |

**Order note (deviates slightly from the requested agent-runtime→notes→drive→chat→library):** notes is git-*stacked on* drive (`a113dde`'s parent is `84d796f`), so drive must precede notes — merged drive (#3) then notes (#4). Every other position matches: agent-runtime first (hub), library last. Because each merged commit's parent was already an ancestor of the integration HEAD and the app directories are disjoint, all six were **trivial clean auto-merges — git took every file verbatim, no resolution touched any app code.**

---

## 4. INTEGRATION-BRANCH MANIFEST + COHERENCE VERDICT — ✅ COHERENT

**History** (`main..HEAD`, first-parent): the six merges above, in order, on top of `main`. All five apps + the design base present; the duplicate excluded.

**All five apps present at HEAD** (with planning/PLAN.md + verification/CHECKLIST.md each):
- `apps/drive` (60 files) · `apps/notes` (85) · `apps/chat` (116) · `apps/library` (68) · `platform/agent-runtime` (61). Total tracked at HEAD: **1052 files**. Working tree clean; **no conflict markers** anywhere.

**Shared-spec union verified at HEAD:**
- `DEPLOYMENT.md` — agent-runtime `8080` row present **and** every sidecar/network survives (`chat_ntfy`, `mc_prometheus`, `mc_blackbox`, `vault_openbao`, `vault_unsealer`, `data_vault`). Nothing clobbered.
- `IDENTIFIERS.md` — `note_id N-ULID`, `doc_id lib-ULID`, `release_id rel-ULID`, `harness_version`, plus the `req_nonce`/`resolve_seq` not-registered notes all present.

**Newly-frozen contract intact for the auth session:** `context/CONTRACTS/agent-runtime-auth-key-provisioning.md` (55 lines) present, header "FROZEN (runtime side) — awaiting auth countersign," §7 "auth owes the countersign." Ready to read.

**Fail-closed / security paths survived the merges byte-intact** (spot-checked at HEAD, not just asserted):
- drive `FENCING_REQUIRED` + `STALE_FENCING` reject (`storage/store.ts`).
- library `agent_asserted NEVER satisfies` / `gateway_delivered` gate + `auto_admit_enabled` default **False** (`ingest/admission.py`, `config.py`).
- notes `FENCE_UNVERIFIABLE` fail-closed + `STALE_FENCE` (`board/fencing.js`).
- agent-runtime `TransitionForbidden` + `AGENT_CAUSABLE_TARGETS` whitelist (`board_client.py`).
- chat write-only `post_notification` agent surface (`mcp/surface.py`).

**Verdict: the integration branch is coherent and merge-clean.** Nothing missing, nothing duplicated, no shared-spec regression, no code mangled.

---

## 5. WHAT THE OPERATOR DOES NEXT

**Recommendation: CLEAN — safe to fast-forward `main`.** `main` is an ancestor of the integration HEAD, so this is a true fast-forward (no new merge commit, no conflict):

```bash
git checkout main
git merge --ff-only stage4/wave1-integration     # main -> 7c92eb0, clean FF
git push origin main                              # publish (operator decision)
```

**Before/with the push, be aware of these (all pre-existing, none block the merge):**
1. **The design system + REVIEW_2 land on `main` with this** — `main` does not currently contain the Stage-3 Helm design system or the `review-2 GO-TO-BUILD` docs; since all builds are stacked on that base it necessarily comes along (merge #1). This is expected and correct (it is the builds' foundation), but it means the fast-forward brings Stage-3 artifacts too, not just the five apps.
2. **Scrambled branch labels are untouched** — after pushing, delete/re-point the misleading `stage4/*-build` labels so nobody re-merges the duplicate `60d598a` or the wrong build. The integration branch is the source of truth now.
3. **Carried-forward content debts** (from `WAVE1_VERIFICATION.md`, not merge issues): agent-runtime's `CONTRACTS/README.md:48` still lists the key-provisioning seam as "Still to write" (contradicts the frozen contract header — reconcile in the auth session); the systemic `additionalProperties:false`-not-server-enforced drift across all five; and the auth-countersign debt (un-countersigned key-provisioning contract, unregistered `svc:library`/`svc:chat`, Stage-5 scope-constant + kind-gate edits).

**Then:** run the auth countersign session against the now-complete `main` — it will read `agent-runtime-auth-key-provisioning.md` and the four scope/principal items intact.

**If you would rather NOT fast-forward yet:** nothing to resolve first — the branch is clean. The only reason to hold is if you want the design-system landing (#1) or the branch-label cleanup (#2) handled as separate, explicit steps before `main` moves.

---

*Produced on `stage4/wave1-integration`; `main` untouched, nothing pushed, no app source modified.*
