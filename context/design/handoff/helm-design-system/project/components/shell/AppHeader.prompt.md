**AppHeader** — the global header shared by every app; app identity left, system state center, halt affordance / kill-mirror right.

```jsx
<AppHeader
  appName="Mission Control"
  identity="the operator's cockpit"
  systemState={<><FreshnessStamp age="0.4s ago" /><span>18 agents live</span></>}
>
  <StopActuator level="G1" onEngage={engage} />   {/* MC / auth host the real trigger */}
</AppHeader>

{/* Every other app shows the read-only mirror */}
<AppHeader appName="Vault" identity="secrets">
  <KillMirror engaged href="/mission-control/review" />
</AppHeader>
```

- Right slot (`children`) holds the `StopActuator` in MC/auth, or `KillMirror` everywhere else.
- `KillMirror` is read-only and links out to Mission Control to act.
