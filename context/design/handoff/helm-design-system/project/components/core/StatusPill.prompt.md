**StatusPill** — the base status token; a full-round pill with a glyph + text label. Color is never the only signal.

```jsx
<StatusPill tone="verified" glyph="✔">Verified</StatusPill>
<StatusPill tone="danger" glyph="⛒">Revoked</StatusPill>
<StatusPill tone="attention" glyph="◈">Needs review</StatusPill>
<StatusPill striped glyph="⚠">Untrusted</StatusPill>
```

- **tone**: `neutral · interactive · halt · danger · verified · attention · draining`.
- **striped** renders the UNTRUSTED taint. Always pass a `glyph` — the mark is half the meaning.
- Higher-level badges (TierBadge, ReviewChip, principal status) build on this primitive.
