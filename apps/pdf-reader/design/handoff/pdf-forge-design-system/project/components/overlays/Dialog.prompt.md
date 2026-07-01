**Dialog** — modal panel over a scrim; Esc and scrim-click close it.

```jsx
<Dialog open={open} onClose={close} eyebrow="Protected document" title="Enter password"
  footer={<>
    <Button variant="ghost" onClick={close}>Cancel</Button>
    <Button variant="primary" onClick={submit}>Unlock</Button>
  </>}>
  <Input label="Password" type="password" mono error={err} code={err && '422'} />
</Dialog>
```

- Restores focus to the trigger on close; sets `aria-modal`. Footer is right-aligned — Cancel (ghost) then the primary action.
- One of only two chrome elements that may cast a shadow (the other is Toast). Keep prose ≤ 560px wide.
