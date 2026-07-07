**Input** — a text field with an always-visible cyan focus ring; a `mono` variant for machine truth.

```jsx
<Input label="Search" icon="/" placeholder="Filter tickets…" />
<Input label="Ticket ID" mono placeholder="T-000000" />
<Input label="Typed intent" invalid hint="Must match exactly." />
```

- **mono** switches to JetBrains Mono + tabular figures for IDs, tokens, hashes.
- **invalid** applies the danger-red treatment; pair with a `hint`.
- Focus is always visible — never remove the ring.
