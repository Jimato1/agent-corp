**Checkbox** — 16px square toggle; use `indeterminate` for a select-all header when only some items are chosen.

```jsx
<Checkbox label="Keep original files" defaultChecked />
<Checkbox label="Select all pages" indeterminate onChange={…} />
<Checkbox label="Flatten annotations" disabled />
```

- Wraps a real `<input type=checkbox>` (native keyboard/AT). The visual box is custom; focus-visible rings the box.
- `indeterminate` shows a dash instead of a check — set it for partial selections.
