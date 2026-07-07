**SuiteSwitcher** — the rail's app list, as mono 2-letter tiles; the operator's way between the ten apps.

```jsx
<SuiteSwitcher current="mission-control" onSelect={(k) => navigate(k)} />
<SuiteSwitcher current="vault" collapsed />
```

- Defaults to the built-in `HELM_APPS`. Pass your own `apps` to override.
- `collapsed` renders just the current app's tile (for the 56px rail).
- The suite-wide safety posture is shown once in `NavRail`, never per-app here.
