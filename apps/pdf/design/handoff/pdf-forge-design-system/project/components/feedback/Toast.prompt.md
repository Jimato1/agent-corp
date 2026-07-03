**Toast / ToastViewport** — transient floating confirmations; wrap in a viewport to position + stack.

```jsx
<ToastViewport position="br">
  <Toast status="ok" title="Export ready" action={<Button size="sm" variant="ghost">Open</Button>} onDismiss={…}>
    merged_2024.pdf · 4.2 MB
  </Toast>
  <Toast status="err" title="Job failed" onDismiss={…}><code>5xx</code> server error</Toast>
</ToastViewport>
```

- **status** sets the left rule + icon: `ok` (success check), `err`, `proc`, or `neutral`.
- Toasts may carry a soft shadow (they float). For persistent, in-context messages use **InlineBanner**.
