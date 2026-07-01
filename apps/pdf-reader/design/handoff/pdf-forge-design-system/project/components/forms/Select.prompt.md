**Select** — a styled native dropdown; supply `options` or `<option>` children.

```jsx
<Select label="Resolution" mono options={['72 DPI','150 DPI','300 DPI','600 DPI']} defaultValue="300 DPI" />
<Select label="Page size" options={[{value:'a4',label:'A4'},{value:'letter',label:'US Letter'}]} />
```

- Wraps a real `<select>`, so keyboard and screen-reader behavior are native.
- **mono** for machine-y option sets (DPI, dimensions, ranges).
- Focus replaces the border with the press ring; the chevron is decorative (`pointer-events:none`).
