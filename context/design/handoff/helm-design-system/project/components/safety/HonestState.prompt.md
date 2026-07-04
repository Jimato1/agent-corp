**HonestState** — the honest-stop triad; three counts (confirmed / pending / draining), always all visible, that refuse to lie about a stop.

```jsx
<HonestState confirmed={12} pending={2} draining={1}
  pendingCountdown="1:48" drainingDetail="host-04 · T-000123" />

<HonestState confirmed={14} pending={0} draining={0} />   {/* "All stopped ✔" */}
```

- Never say "all stopped" while `pending` or `draining` > 0 — the component enforces this in its summary.
- All three counts render even at zero (dimmed).
- Pending carries a live countdown (~2 min token window); draining names the host/ticket.
