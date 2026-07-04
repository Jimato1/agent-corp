# Chat frontend — build notes

## Helm components realized (faithful TS ports, self-injecting Helm CSS)

All under `src/components/ds/`, each ported verbatim from
`context/design/handoff/helm-design-system/project/components/**` (`.jsx` for the
exact inline CSS + markup, `.d.ts` for the prop contract):

- **core:** `Button`, `IconButton`, `Input`, `StatusPill`
- **data:** `DataTable`, `EmptyState`, `ErrorState`, `Skeleton`
- **identity:** `PrincipalRef`, `TicketRef`, `FenceState`
- **safety:** `ReviewChip`, `FreshnessStamp`, `PrintedAbsence`, `HonestState`,
  `ConfirmFriction`, `DangerAction`, `HaltBand`
- **shell:** `AppHeader` (+ `KillMirror`), `NavRail`, `SuiteSwitcher` (+ `HELM_APPS`)
- **app-specific:** `KindBadge` (+ `eyebrow`/`mono`/`panel` helpers) in
  `src/components/KindBadge.tsx`

`HonestState` was also ported even though the chat kit doesn't name it directly —
it is a required dependency of `ConfirmFriction` and `HaltBand` (both compose it).

## Style-injection pattern

The handoff components each define a CSS string and append a `<style>` to
`document.head` at module load. That is preserved verbatim via
`src/lib/helmStyle.ts` `injectStyle(id, css)` (idempotent by element id). There is
therefore **no monolithic `ds.css`** — the only global CSS is the copied tokens
(`styles/tokens/*`) + `base`/`motion` + a small `app.css` (root sizing + the
sanitized-body `.ch-body` typography for the Workshop reading pane).

## Props simplified / adapted vs. the handoff `.d.ts`

- **Interfaces that extend `HTMLAttributes` and add a prop whose name collides
  with a DOM prop had to `Omit` that DOM prop** (the handoff `.d.ts` files as
  written do not type-check against `@types/react` 19): `EmptyState`/`ErrorState`
  omit `title`; `NavRail` omits `onToggle`; `SuiteSwitcher` omits `onSelect`;
  `TicketRef` omits `onCopy`; `DataTable` omits `onSort`. Behaviour is identical —
  these props keep their Helm semantics (ReactNode title, `(collapsed)=>`,
  `(key)=>`, `(id)=>`, `(key,dir)=>`).
- **`DataTable`** is generic `<Row>` (constraint dropped; indexing done through a
  `Record<string, unknown>` cast) so interface row types like `Broadcast` can be
  passed without an index signature. `Icon`/Lucide nodes aren't used; glyphs are
  passed as string children exactly as the kit does.
- **`ConfirmFriction.honest` / `DangerAction.honest`** are typed
  `Partial<HonestStateProps>` (the handoff used `Record<string, unknown>`).
- **`Button`** keeps `processing`-less API (the handoff Button has no busy state);
  the compose "Posting…" affordance is handled in the Broadcast screen via
  `disabled` + label swap.

## Backend contract mapping notes

- **`ack-all` uses per-item `POST /api/notifications/{id}/ack`, not the bulk
  `POST /api/notifications/ack {up_to_seq}`.** The pinned `Envelope` type exposes
  no server sequence number, so the client cannot compute a correct `up_to_seq`;
  it acks the currently-loaded unacked set item-by-item. `ackBulk()` is still
  implemented in `src/lib/api.ts` and can be swapped in if the backend later
  surfaces a sequence on the envelope. **CANNOT-VERIFY.**
- **Feed row "reason"** (the mono `· board_escalation` text) is rendered from
  `Envelope.tags[0]` (the pinned contract carries no dedicated `reason` field).
- **Feed ticket chip** is a copy-on-click `TicketRef` with **no `href`** — this
  deliberately keeps the MC deep-link (`deep_link`) the *only* navigating link on
  a notification (safety-grammar invariant #1). The handoff mock gave the ticket
  chip `href="#"`; that was demo-only.
- **NoteDetail** initialises from the envelope the feed already holds and then
  background-refreshes via `GET /api/notifications/{id}` (the deep-link landing
  endpoint). A dependency failure there is non-fatal Pattern-D (keeps the
  snapshot); it does not blank the screen.

## What could NOT be verified without a full `npm install` + running backend

`tsc -b` was run to completion and **passes cleanly** (borrowed the pdf app's
matching toolchain — react 19.1 / typescript 5.7.3 — via a temporary, since-removed
`node_modules` junction; no `node_modules` is committed here). The following still
need a real install / runtime to confirm — fold into the parent CANNOT-VERIFY list:

1. **`npm install` + `vite build` bundling** was not run (no network for the
   package fetch). Type-checking passes; the actual asset bundle / tree-shake was
   not exercised.
2. **`@fontsource/source-serif-4` exact version + weight file names**
   (`latin-400/500/600.css`). Version pinned `^5.1.0` to match the Inter/Mono
   `^5.1.x` line; the precise published files were not verified on disk. (CSS
   imports type-check via Vite's ambient `*.css` module regardless.)
3. **Live SSE behaviour** — reconnection, `Last-Event-ID` replay, the `reset`
   re-sync event, and event merge/dedupe — is implemented to the pinned contract
   but was not exercised against a real `/api/feed` stream.
4. **Real API response conformance** (field names/shapes of `Envelope`,
   `Broadcast`, `HealthSignal`, and the error-body shape driving R vs D) was coded
   to the pinned spec, not confirmed against a running Chat backend.
5. **Server-sanitized `body_html`** is trusted and rendered via
   `dangerouslySetInnerHTML`; the client adds a defensive `.ch-body a { pointer-events:none }`
   + `img { display:none }` but performs no client-side sanitization (by design —
   the server is the sanitizer). Not verified against real payloads.
