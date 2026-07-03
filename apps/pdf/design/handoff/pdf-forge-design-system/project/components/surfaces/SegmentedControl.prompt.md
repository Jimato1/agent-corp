**SegmentedControl** — compact 2–3 option toggle; press-tint marks the active segment.

```jsx
<SegmentedControl ariaLabel="Sheet size" defaultValue="comfortable" options={[
  {value:'compact', label:'Compact'},
  {value:'comfortable', label:'Comfortable'},
  {value:'large', label:'Large'},
]} onChange={setSize} />
```

- Best for view/fit/density toggles that change a value (not a whole view — use **Tabs** for that).
- Options may carry an `icon`. Past ~3 options or long labels, switch to **Select**.
