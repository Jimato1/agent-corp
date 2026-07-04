**TicketRef** — a mono `[ T-000123 ]` chip for any work item; copy-on-click, or a deep-link into the review queue.

```jsx
<TicketRef id="T-000123" onCopy={(id) => {}} />
<TicketRef id="T-000123" href="/review/T-000123" />   {/* deep-link */}
<TicketRef id="sha256:9f2c…a1e0" truncate />
```

- Non-link chips **copy on click**; `href` makes it a review-queue deep-link (shows ↗).
- The ID is opaque — never recolor it. Put provenance (a `TierBadge`) *beside* it.
- `truncate` middle-truncates long IDs; the chip never wraps.
