# Chat frontend — the doorbell

A Vite 6 + React 19 + TypeScript 5.7 SPA that recreates the **Helm design-system
`chat` ui_kit** pixel-faithfully and wires it to the Chat backend HTTP API. This
is the human surface for Chat (Stage-4 Build): the operator's live
agent→operator notification/escalation feed plus a soft operator→fleet
broadcast. Chat is **the doorbell, not the door** — it surfaces review, it never
clears it, and it is **not in the kill chain**.

## Running it

```bash
npm install
npm run dev        # Vite dev server on :5173, proxying /api /mcp /healthz /jwks → 127.0.0.1:8080
npm run build      # tsc -b && vite build → dist/
npm run typecheck  # tsc -b --noEmit
npm run preview    # serve the built dist/
```

Dev proxy target is overridable with `VITE_API_TARGET` (default
`http://127.0.0.1:8080`, Chat's internal port).

### How it's served in the container

The build emits a static `dist/`. The Chat backend Docker image copies it to
`/app/static` and serves it at `/`, so the SPA and the API are same-origin — the
proxy's forward-auth injects the caller identity and the SPA sends
`credentials: 'include'` on every request. **The SPA handles no token**; there is
no login screen here (identity is established at the proxy).

## How it maps to the Helm `chat` ui_kit

Source of truth: `context/design/handoff/helm-design-system/project/ui_kits/chat/`
and `.../components/**`. Nothing was redesigned — the frozen kit was ported to
TS/React verbatim (same inline styles, same CSS variables, same glyphs/copy).

| Helm kit file | Realized as |
|---|---|
| `ch-screens.jsx` → Feed | `src/screens/Feed.tsx` |
| `ch-screens.jsx` → NoteDetail | `src/screens/NoteDetail.tsx` |
| `ch-screens.jsx` → Broadcast | `src/screens/Broadcast.tsx` |
| `ch-screens.jsx` → Health | `src/screens/Health.tsx` |
| `ch-screens.jsx` → `Head` | `src/screens/common.tsx` |
| `ch-parts.jsx` → `KindBadge`, `eyebrow`/`mono`/`panel` | `src/components/KindBadge.tsx` |
| `app.jsx` (NavRail + AppHeader + KillMirror shell + router) | `src/App.tsx` |
| `tokens/*.css` + `styles.css` | `src/styles/tokens/*` + `src/styles/styles.css` |

The shared Helm components used by the kit are realized under
`src/components/ds/` — each is a faithful TS port that injects its own scoped
`<style>` (the exact Helm inline CSS) at module load via `src/lib/helmStyle.ts`,
so the visuals are the Helm CSS byte-for-byte, not a re-theme. Components:
`Button`, `IconButton`, `Input`, `StatusPill` (core); `DataTable`, `EmptyState`,
`ErrorState`, `Skeleton` (data); `PrincipalRef`, `TicketRef`, `FenceState`
(identity); `ReviewChip`, `FreshnessStamp`, `PrintedAbsence`, `HonestState`,
`ConfirmFriction`, `DangerAction`, `HaltBand` (safety); `AppHeader` (+
`KillMirror`), `NavRail`, `SuiteSwitcher` (+ `HELM_APPS`) (shell).

Brand fonts are loaded from `@fontsource` in `src/main.tsx` (Inter, JetBrains
Mono, Source Serif 4) — self-hosted, **no Google-Fonts / CDN dependency** (the
container is offline / CSP-strict). The token file `styles/tokens/fonts.css` is
intentionally a comment; the `@font-face` rules come from the `@fontsource`
imports.

## Wiring to the backend

`src/lib/api.ts` is the single API client (same-origin, `credentials:'include'`,
typed `ApiError`). `src/state/ChatProvider.tsx` owns the live state: it loads
history via `GET /api/notifications` + `GET /api/broadcasts`, opens the
`GET /api/feed` SSE stream (`EventSource`), and merges live `notification` /
`broadcast` / `ack` events over the history (handling the `reset` re-sync event
and `Last-Event-ID`/`?since=` cursors). Write actions — ack, ack-all,
post-broadcast, revoke — go through the same client.

Every screen renders the real states: **Loading** (`Skeleton`), **Empty**
(`EmptyState` invitation), **Pattern R** (red inline — a local, operator-fixable
error), **Pattern D** (gold band — a dependency is down and the system
safe-stopped), and the live SSE-fed **Loaded** state. If the backend is
unreachable the shell falls back to the `ch-data.jsx` demo fixtures (clearly
marked as offline) so the UI stays inspectable — but the live API is always the
primary path.

## Safety grammar (load-bearing — do not "fix" these into normal affordances)

1. **Doorbell, not door.** No clear-review / approve / delete control exists. The
   only live link on a notification is the template-derived MC deep-link, always
   captioned "(target wins)".
2. **Not in the kill chain.** `KillMirror` / `HaltBand` render read-only and
   link out to MC/auth; the feed keeps flowing under a stop.
3. **Escalations pin to top in the amber ATTENTION family, never halt-gold.**
   Gold is reserved for the read-only kill mirror. A broadcast is signal/attention
   family, never gold, never a `HaltBand`.
4. **Broadcast non-authority.** A printed 🔒 `PrintedAbsence` states a broadcast
   does not stop/gate/command; Revoke is a `DangerAction` light tier
   (`direction="less"`). Post/ack/revoke are light confirms — no typed-intent or
   step-up anywhere.
5. **False-green prohibition on Health.** A stalled SSE / gave-up push / stale
   backup / pre-grant MC resolve-seam renders honest amber ▲, never a fabricated
   green, never a red error.
6. **Notification body is Workshop paper.** The server returns pre-sanitized
   `body_html` (allowlist markdown; raw HTML + remote images stripped; links
   neutralized to dead text). It is rendered via `dangerouslySetInnerHTML` from
   `body_html` **only** — never raw `body`.
