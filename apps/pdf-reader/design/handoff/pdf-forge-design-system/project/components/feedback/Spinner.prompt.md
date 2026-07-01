**Spinner** — indeterminate activity ring; the default "working" cue when a job reports no progress.

```jsx
<Spinner />
<Spinner size={20} tone="proc" />     {/* amber, matches the press */}
<Spinner tone="accent" label="Rendering thumbnail" />
```

- Use a spinner, not a progress bar — the job API's `progress` is often null.
- Under reduced-motion it stops spinning and shows a static three-quarter ring.
- For the headline server job, use **PressIndicator** (the amber sweep) rather than a bare spinner.
