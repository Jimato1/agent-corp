**Panel** — the chrome surface; flat, hairline-bordered, never shadowed.

```jsx
<Panel eyebrow="Inspector" title="Merge options" actions={<IconButton label="Close">{X}</IconButton>}>
  …controls…
</Panel>

<Panel well noBodyPadding>   {/* the board substrate */}
  <Board/>
</Panel>
```

- **well**: recessed inset (darker fill + inner top-shadow) — use for the board and tray regions.
- Only paper casts shadow; do not add box-shadow to a Panel. Separation is value + hairline.
- Pass `header` to fully replace the title row (e.g. the board header strip with doc name, page count, zoom, and the run action).
