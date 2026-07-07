**DangerAction** — a red destructive trigger wired to the confirm ceremony; the two ship together so they can't drift apart.

```jsx
<DangerAction
  label="Lift stop…" glyph="⛔"
  title="Lift the suite-wide stop"
  consequence={<>This lifts the kill-switch and lets agents resume.</>}
  direction="more" irreversible blastRadius="4 agents"
  honest={{ confirmed: 12, pending: 2, draining: 1, pendingCountdown: '1:48' }}
  typedIntent="LIFT STOP" stepUp
  onConfirm={doLift}
/>

<DangerAction label="Purge" variant="solid" title="Purge 3 files"
  consequence="Permanently deletes the selected files." direction="more"
  irreversible typedIntent="PURGE" onConfirm={doPurge} />
```

- Always states the **direction** and echoes honest-state counts.
- Reserve `glyph="⛔"` for stop/deny/kill; use `⚠` for other destructive ops.
- For "can't by construction", use `PrintedAbsence`, not a disabled DangerAction.
