**Slider** — range control; the board zoom is its canonical home.

```jsx
<Slider label="Sheet size" min={96} max={180} step={6} defaultValue={132} suffix="px"
        marks={['Compact','Comfortable','Large']} />
```

- Mono, tabular readout top-right; the filled portion is press-blue.
- `marks` labels evenly-spaced stops beneath the track. Works controlled (`value`) or uncontrolled (`defaultValue`).
