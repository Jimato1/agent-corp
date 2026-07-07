**IconButton** — a square, icon-only control for toolbars, table rows, and the header; ghost by default.

```jsx
<IconButton icon="⧉" label="Copy ID" />
<IconButton icon="⋯" label="Row actions" variant="ghost" />
<IconButton icon="/" label="Search" variant="solid" pressed />
```

- **label** is required (accessible name + tooltip).
- **variant**: `ghost` · `solid` · `danger`. **pressed** shows the cyan toggle state.
- Reserve `⛔` for real stop/deny actions only.
