**IconButton** — a 28px square glyph control for toolbars and board chrome; always pass an accessible `label`.

```jsx
<IconButton label="Rotate right"><RotateIcon/></IconButton>
<IconButton variant="outlined" label="Zoom in"><PlusIcon/></IconButton>
<IconButton pressed label="Toggle grid"><GridIcon/></IconButton>
<IconButton variant="danger" label="Delete page"><TrashIcon/></IconButton>
```

- **variant**: `plain` (default, transparent until hover) · `outlined` (graphite chip with border) · `danger` (turns err-500 on hover).
- **pressed**: toggle controls render the press-tint active state.
- Visual box stays 28px; the touch hit-area expands to ~44px via an invisible `::before`, so it's safe on mobile.
