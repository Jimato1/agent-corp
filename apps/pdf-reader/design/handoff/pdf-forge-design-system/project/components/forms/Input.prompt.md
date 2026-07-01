**Input** — a single-line field; use `mono` for any machine value and `error`+`code` for validation failures.

```jsx
<Input label="Output filename" mono defaultValue="merge_2024.pdf" suffix=".pdf" />
<Input label="Page range" mono placeholder="1-10,21-end" hint="Comma-separated; 'end' allowed" />
<Input label="Password" type="password" error="Wrong password" code="422" />
```

- **mono**: filenames, ranges, byte sizes, passwords — anything column-true. Default font is Inter for prose-y fields.
- **error**: replaces the hint, turns the border err-500, and shakes once on appearance (the shake is suppressed under `prefers-reduced-motion`). Pass `code` to show the machine code in mono.
- **prefix/suffix**: small adornments — an icon, a unit (`px`, `DPI`), or a file extension.
- On focus the border is *replaced* by the press ring (never stacked).
