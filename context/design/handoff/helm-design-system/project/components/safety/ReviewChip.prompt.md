**ReviewChip** — a needs-review / escalated pill that always shows the machine reason and deep-links to the review queue.

```jsx
<ReviewChip reason="board_escalation" href="/review/T-000123" />
<ReviewChip state="escalated" reason="break_glass" href="/review/T-000188" />
```

- Always pass the **reason** verbatim (the machine string) — never a paraphrase alone.
- `href` deep-links into Mission Control's review queue. Apps surface, MC/Board clear.
