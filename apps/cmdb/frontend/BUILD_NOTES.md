# CMDB — Policy-Brain Operator Console · Frontend Build Notes (Stage 4)

Static Vite 6 + React 19 + TypeScript 5.7 SPA. `npm run build` → `dist/` (copied
into the backend image at `/app/static` by the backend-owned Dockerfile). Built
to `apps/cmdb/ui/UI_SPEC.md`; realizes the Helm CMDB kit faithfully. Instrument
archetype, dark-only, DataTable-first. No SSE (CMDB is request/response — every
list is pull, each carrying a `Freshness` stamp).

## Build status

`npm install` + `npm run build` both succeed. Final tsc + vite output:

```
✓ 77 modules transformed.
dist/index.html                    0.45 kB
dist/assets/index-*.css           11.17 kB │ gzip: 3.08 kB
dist/assets/index-*.js           322.03 kB │ gzip: 91.37 kB
✓ built in ~1.9s
```

`dist/` contains `index.html`, the JS/CSS bundle, and self-hosted woff/woff2
fonts (no CDN — the container is CSP-strict). Verify fresh with:
`cd apps/cmdb/frontend && npm install && npm run build`.

## Structure (mirrors the completed `apps/chat/frontend` sibling)

- `src/components/ds/*` — the shared Helm design-system components, faithful TS
  ports (each injects its own scoped `<style>` via `lib/helmStyle.ts`, so the
  visuals are byte-for-byte the Helm inline CSS). Ported verbatim from chat;
  **TierBadge added** (chat didn't need it), **FenceState dropped** (CMDB holds
  no fence — that absence is a `PrintedAbsence`, not a greyed control).
- `src/components/cmparts.tsx` — the five CMDB-specific widgets (UI_SPEC §6).
- `src/components/PolicyCeremony.tsx` — **the centerpiece** (see below).
- `src/screens/*` — the 13 rail destinations + shared `common.tsx` helpers.
- `src/lib/{api,types,fixtures,helmStyle}.ts` — typed API client + contract
  shapes + offline fixtures + the style-injection helper.
- `src/state/CmdbProvider.tsx` — shell posture owner + the generic `useResource`
  pull-with-fixtures-fallback hook.
- `src/styles/tokens/*` — design tokens copied **verbatim from the handoff**
  (`context/design/handoff/.../tokens/`). One override: `fonts.css` uses the
  offline `@fontsource` variant (chat's) instead of the handoff's Google-Fonts
  `@import`, because the container is offline/CSP-strict.

## Helm components realized

Shared (cited by ID, not re-drawn): `AppHeader`+`KillMirror`, `NavRail`,
`SuiteSwitcher`, `DataTable`, `Input`, `Button`, `IconButton`, `StatusPill`,
`EmptyState`, `ErrorState`, `Skeleton`, `TicketRef`, `PrincipalRef`, `TierBadge`,
`ReviewChip`, `FreshnessStamp`, `PrintedAbsence`, `HonestState`,
`ConfirmFriction`, `DangerAction`, `HaltBand`.

App-specific (UI_SPEC §6, each justified as domain-unique):
`CriticalityTier` chip, `VerdictOutcome` token, `WindowPill`,
`BlastRadiusPreview`, `VerdictTrace`, `WindowScheduleEditor`, `PolicyMatrix`.

## The centerpiece — gate-weakening ceremony (UI_SPEC §5.3)

`PolicyCeremony.tsx` exports two friction levels, chosen by **direction of the
edit** (server-classified, rendered here — never a client heuristic deciding the
gate):

- `WeakeningCeremony` (FULL) — the flagship. On trigger it runs **Phase 1
  `POST /v1/policy/propose`** (typed diff + classification + blast-radius +
  single-use, diff-hash-bound `confirm_token`), then opens the shared
  `ConfirmFriction` (full/red variant) with its app-specific preview slot filled
  by `BlastRadiusPreview` (the derived-effect matrix naming exact
  host×action_class cells becoming auto-executable + the `diff_hash` the confirm
  binds to). Confirm is disabled until **typed-intent matches AND step-up is
  fresh**; the live **HonestState echo** rides the dialog. **Phase 2
  `POST /v1/policy/confirm`** sends `{confirm_token, typed_intent, diff_hash}`;
  the audit note states the commit → push → **only then** snapshot swap order +
  the hash-chained `policy_change_log` row.
- `TighteningAction` (LIGHT) — engaging safety (signal-cyan single confirm, no
  typed intent, no step-up); e.g. the sandbox kill knob's **Disable**.

Used by: Host detail (snapshot_capability weaken + Wazuh rebind), Sandbox
(re-enable = full; disable = light), Discovery (bind = full), Break-glass (full,
with the louder freeze-specific `retypeOverride` "OVERRIDE FREEZE <host>").

## Critical design deltas honored (UI_SPEC §2, §8)

- Criticality tier uses `CriticalityTier` (⬢ tier0…tier3 / ✦ unpolicied), **never
  `TierBadge`**; `TierBadge` is reserved for host-originated/UNTRUSTED provenance
  on Wazuh-synced facts (Host detail facts + Discovery queue).
- Maintenance `freeze` renders `--attn` amber `❄ FREEZE-ACTIVE`, **never
  halt-gold**.
- Verdict outcomes are **never green**: permit = neutral `--ink-700`, ask =
  `--attn`, deny = `--danger`.
- Fail-closed is the system working: dependency-down / snapshot-unavailable /
  git-unreachable render **halt-gold Pattern-D** (SAFE-STOPPED band, `⛊ CANNOT
  CONFIRM`), **never a red error**. `common.tsx` centralizes the R (local, red) /
  D (dependency, gold) split off `ApiError.isDependency`.
- History carries the out-of-band `git log` verification banner ("this console
  can lie"); chain-verify follows §4.9 (intact / CANNOT CONFIRM gold / BROKEN
  danger — never a fabricated green).
- Constitutional absences are printed `🔒`/`⛊` facts (no lease/mutex/approval on
  Host detail; no Vault creds in Sandbox; floor-never-touched on Break-glass),
  never greyed toggles.
- `HaltBand` is a **read-only mirror** (CMDB hosts no actuator); the sandbox kill
  knob is a policy tightening that deep-links to MC for the global halt.
- Every screen enumerates the honest states (loaded / static loading-skeleton /
  empty-invitation / Pattern-R / Pattern-D / stop-engaged mirror) per §4.

## Data wiring

`lib/api.ts` calls the backend under `/api/v1/...` with `credentials: 'include'`
(proxy forward-auth injects identity; the SPA never handles a token). Every read
has a **fixtures fallback** (`lib/fixtures.ts`, mapped from the kit's
`cm-data.jsx` + the UI_SPEC worked examples) via `useResource`, so the console
renders fully offline (clearly banner-marked as demo data). Response shapes in
`lib/types.ts` are deliberately tolerant (most fields optional) so a partial
backend degrades per-figure rather than blanking the console.

## Deviations from the kit (with reason)

1. **`fonts.css`** uses the offline `@fontsource` variant instead of the
   handoff's Google-Fonts `@import` — the container is offline/CSP-strict (same
   decision the chat sibling made). All other tokens are handoff-verbatim.
2. **No Source Serif 4 / no paper surface** — CMDB is a pure Instrument; the kit
   ships no Workshop pane. `main.tsx` bundles only Inter + JetBrains Mono.
3. **`PolicyCeremony` is a thin composition, not a new dialog** — the kit's
   `app.jsx` used `DangerAction` with a static consequence. Because the real
   ceremony needs an **async `propose` before the preview exists**, this build
   drives the shared `ConfirmFriction` directly (propose → then open with the
   loaded `BlastRadiusPreview`). It is still `ConfirmFriction` + the §6.1
   preview widget — no bespoke approval visual introduced.
4. **Offline behavior keeps fixture data visible under the gold Pattern-D
   banner** rather than blanking the whole table to SAFE-STOPPED. This is a
   build-time affordance so the console is inspectable offline; the honest
   Pattern-D band is always shown above the demo data. The true gate-level
   SAFE-STOPPED band (`posture.gate_degraded`) still fully replaces content when
   the backend reports its own gate cannot serve.
5. **Fleet/Decisions filters are functional client-side** (text + tier/class
   selects) rather than the kit's static dropdown chrome — same visual intent,
   made real.
