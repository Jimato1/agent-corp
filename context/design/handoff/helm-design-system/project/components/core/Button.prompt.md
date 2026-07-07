**Button** — the standard action control; the safe primary action is cyan, the destructive trigger is red (and always behind a confirm ceremony).

```jsx
<Button tone="primary">Approve</Button>
<Button tone="secondary" icon="⧉">Copy plan</Button>
<Button tone="ghost">Cancel</Button>
<Button tone="danger" icon="⛔">Lift stop…</Button>
```

- **tone**: `primary` (safe/cyan) · `secondary` (neutral machined) · `ghost` (quiet) · `danger` (red fill) · `danger-outline` (quiet until hovered).
- **size**: `compact` (28px) · `default` (32px) · `large` (40px / touch).
- **icon**: a leading glyph or node. Reserve `⛔` for actual stop/deny/kill actions.
- Never use `tone="danger"` without wiring it to a `ConfirmFriction` ceremony.
