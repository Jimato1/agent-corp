**HaltBand** — the signature gold band under the header; a kill-switch or a failed-closed safe-stop, never red.

```jsx
{/* Kill engaged, read-only mirror in a non-MC app */}
<HaltBand mode="kill" confirmed={12} pending={2} draining={1}
  pendingCountdown="1:48" drainingDetail="host-04 · T-000123"
  reviewHref="/review" readOnly />

{/* Dependency down — the safety system working */}
<HaltBand mode="safe-stop"
  stillTrue={['Reads still serve from cache', 'No approvals will execute until Vault is back']} />

{/* Intensified full quiesce */}
<HaltBand mode="kill" level="G2" confirmed={40} pending={0} draining={0} />
```

- **mode** `kill` / `safe-stop`; **level** `G1` / `G2` (doubled glyph, heavier, striped).
- Composes `HonestState` for the triad. Never render a dependency outage as a red error.
- **readOnly** for every app except Mission Control / auth (which host the real trigger).
