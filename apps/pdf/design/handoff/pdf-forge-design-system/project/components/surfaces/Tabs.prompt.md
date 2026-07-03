**Tabs** — flat underline tabs; press-blue indicator slides under the active label.

```jsx
<Tabs defaultValue="pages" onChange={setView} tabs={[
  {id:'pages', label:'Pages', count:512},
  {id:'outline', label:'Outline'},
  {id:'meta', label:'Metadata'},
]} />
```

- Pass `count` for a tabular badge (page counts etc.).
- Works controlled (`value`) or uncontrolled (`defaultValue`). For a compact 2–3 option toggle that swaps a value rather than a view, use **SegmentedControl**.
