---
name: helm-design
description: Use this skill to generate well-branded interfaces and assets for Helm, the operator/agent control suite ("the console for a company of machines"), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping — including the safety visual grammar (the gold safe-stop, the honest-stop triad, the confirm ceremony) that is Helm's signature.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets
out and create static HTML files for the user to view. If working on production code,
you can copy assets and read the rules here to become an expert in designing with this
brand.

If the user invokes this skill without any other guidance, ask them what they want to
build or design, ask some questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.

## What Helm is
A calm, serious control room wrapped around a document workshop: one human operator
supervising a fleet of autonomous agents doing real, sometimes-destructive work, and
reviewing the documents they produce. Information-dense, quiet, trustworthy,
instrument-like. **Safety is the signature.**

## The five things to get right (read `readme.md` for the full spec)
1. **The affective spine — never cross these.** Signal-cyan `#29B6D8` = interactive
   (and the safe primary action). Halt-gold `#F2842B` = the *system* is safely stopped
   (kill engaged / failed closed) — calm, **not** red. Danger-red `#E5594E` = the
   *operator's* own destructive finger, always behind a confirm ceremony.
2. **Never render a safe-stop as an error.** A dependency outage is gold Pattern D
   ("the safety system working"), never a red error.
3. **Never lie about a stop.** The honest-stop triad (✔ confirmed · ◐ pending · ⇉
   draining) always shows all three; never say "all stopped" while pending/draining > 0.
4. **Color is never the only signal** — every state carries a glyph + a text label.
5. **Two archetypes, one grammar.** Instrument (dark control room) and Workshop (warm
   paper reading pane) share one token system and one safety grammar; a ticket ref, an
   identity, a tier badge, a kill band look identical in both.

## How the files are organized
- `styles.css` — the one global stylesheet to link. `@import`s everything in `tokens/`.
- `tokens/` — colors, typography, spacing, elevation, base, fonts.
- `components/` — 26 React primitives (`core/`, `identity/`, `safety/`, `shell/`,
  `data/`). Each has a `.jsx`, a `.d.ts`, a `.prompt.md`, and a demo `.html`.
- `ui_kits/` — full click-through screens: `mission-control/`, `auth/`, `notes/`,
  `vault/`. Each is `index.html` + `app.jsx` + `README.md`.
- `guidelines/` — foundation specimen cards.

## Using the components
In an HTML file: link `styles.css`, load React + ReactDOM + Babel (pinned), then load
the compiled bundle `_ds_bundle.js` and read components off the global namespace:

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { HaltBand, StopActuator, DataTable, TicketRef } = window.HelmDesignSystem_f4cb26;
  // …render
</script>
```

If the bundle isn't available in your context, read a component's `.jsx` and reuse its
inline-CSS pattern, always referencing the `--*` tokens from `styles.css`.

## Caveats
- Fonts load from Google Fonts (the real Inter / JetBrains Mono / Source Serif 4).
- Chrome icons use Lucide (CDN) as a flagged substitute; safety/state marks are the
  specified Unicode glyphs. No logo was provided — the wordmark stands in.
