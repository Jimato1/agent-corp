**Radio / RadioGroup** — single-choice control; use `RadioGroup` to render a set sharing one `name`.

```jsx
<RadioGroup name="fit" defaultValue="width" options={[
  {value:'width', label:'Fit width'},
  {value:'page',  label:'Fit page'},
  {value:'actual',label:'Actual size'},
]} onChange={setFit} />

<Radio name="x" value="a" label="Standalone radio" />
```

- `RadioGroup` accepts string or `{value,label,disabled}` options and lays out vertically by default (`row` for horizontal).
- For 2–3 short, mutually exclusive options that act like a toggle, prefer **SegmentedControl** instead.
