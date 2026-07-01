**Switch** — binary on/off for immediate settings (not form submission).

```jsx
<Switch label="Cutting-mat grid" defaultChecked />
<Switch label="Keep input files" onChange={e => setKeep(e.target.checked)} />
```

- Use a Switch when flipping it takes effect immediately; use a **Checkbox** for choices that submit with a form.
- `role="switch"` + native input under the hood, so it's keyboard- and AT-friendly.
