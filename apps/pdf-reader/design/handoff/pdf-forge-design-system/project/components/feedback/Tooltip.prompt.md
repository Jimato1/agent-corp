**Tooltip** — dark hover/focus hint; surface the keyboard shortcut via `kbd`.

```jsx
<Tooltip label="Rotate right" kbd="R">
  <IconButton label="Rotate right">{Rotate}</IconButton>
</Tooltip>

<Tooltip label="Export the selected pages" kbd="⌘E" placement="bottom">
  <Button variant="primary">Export</Button>
</Tooltip>
```

- Appears on hover (after a short delay) and immediately on keyboard focus.
- `kbd` renders the shortcut in mono — use it generously; this app is driven from the keyboard.
