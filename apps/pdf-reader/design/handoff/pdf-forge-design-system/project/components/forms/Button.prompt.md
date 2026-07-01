**Button** — the workbench's action control; spend the press-blue `primary` fill on exactly one action per region, keep the rest `secondary`/`ghost`.

```jsx
<Button variant="primary" size="lg" leftIcon={<PlayIcon/>}>Run merge</Button>
<Button>Cancel</Button>
<Button variant="ghost" size="sm">Select all</Button>
<Button variant="danger" leftIcon={<TrashIcon/>}>Delete 3 pages</Button>
<Button variant="primary" processing>Pressing…</Button>
```

- **variant**: `primary` (press-blue, dark ink label) · `secondary` (graphite, default) · `ghost` (transparent until hover) · `danger` (err-500 text, fills err-tint on hover).
- **size**: `sm` 28px · `md` 32px (default) · `lg` 40px (use for the primary CTA and on mobile).
- **processing**: shows the amber indeterminate "press at work" bar along the bottom edge and disables the button. Pair the label with a verb-ing word ("Pressing…", "Merging…").
- Focus-visible always renders the press-blue ring + halo — never strip it.
