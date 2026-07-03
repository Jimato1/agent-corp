**InsertionBar** — the press-blue drop indicator; goes in the gap where a dragged sheet will land.

```jsx
<div style={{display:'flex', alignItems:'center', gap:12}}>
  <PageSheet page={1}/>
  <InsertionBar/>          {/* neighbors ease aside; sheet drops here */}
  <PageSheet page={2}/>
</div>
```

- `vertical` between sheets in a row; `horizontal` between wrapped rows.
- Pair with a `lifted` PageSheet and a dashed ghost in the origin slot to complete the drag choreography.
