**ConfirmFriction** — the one step-up confirm ceremony for every dangerous op; light (cyan) for engaging safety, full (red) for moving toward more action.

```jsx
<ConfirmFriction
  open={open}
  intensity="full"
  title="Lift the suite-wide stop"
  consequence={<>This <strong>lifts the kill-switch</strong>. Agents resume executing approved plans.</>}
  direction="more"
  irreversible
  blastRadius="4 agents"
  honest={{ confirmed: 12, pending: 2, draining: 1, pendingCountdown: '1:48' }}
  typedIntent="LIFT STOP"
  stepUp
  auditNote="Writes a tamper-evident audit row bound to this decision."
  onConfirm={doLift} onCancel={close} onEscapeToHalt={focusHalt}
/>

{/* Engaging safety — the calm variant */}
<ConfirmFriction open={o} intensity="light" title="Revoke agent:patcher-07"
  consequence="Revokes this principal's tokens." direction="less"
  confirmLabel="Revoke" onConfirm={doRevoke} onCancel={close} />
```

- `full` requires the typed intent (exact) and, if `stepUp`, a fresh re-auth before Confirm enables.
- Cancel is the safe default and gets focus. Esc → Cancel; Shift+Esc → `onEscapeToHalt`.
- The halt control always renders above this dialog — never nest a stop inside it.
