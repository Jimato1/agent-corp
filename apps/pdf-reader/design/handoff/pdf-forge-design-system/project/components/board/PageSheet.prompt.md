**PageSheet** — the signature: a PDF page as a physical paper sheet. The only bright-white, shadow-casting object in the app.

```jsx
<PageSheet page={1} src={thumbUrl} />
<PageSheet page={2} selected />
<PageSheet page={4} rotation={90} />          {/* sheet box swaps to landscape */}
<PageSheet page={7} focused />                {/* roving-tabindex keyboard focus */}
<PageSheet page={9} deleted />
<PageSheet page={142} loading width={96} />   {/* virtualized lazy placeholder */}
```

- Honors true page **aspect** (default ISO portrait ≈0.707; pass `aspect>1` for landscape). `rotation` of 90/270 swaps the sheet box.
- States: `selected` (press border + tint + check tab) · `focused` (ring with a 1px dark spacer so it holds on white) · `lifted` (drag: scale 1.04 + 1.5° tilt) · `deleted` (strikethrough + err tab) · `loading` (faint spinner).
- Width presets: compact 96 · comfortable 132 · large 180. Lay sheets out in a flex flow with `--sp-3` gaps and drop an **InsertionBar** in the gap during drag.
