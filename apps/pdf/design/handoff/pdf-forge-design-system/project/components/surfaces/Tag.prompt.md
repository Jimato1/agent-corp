**Tag** — compact metadata chip; mono by default for machine data.

```jsx
<Tag>4.2 MB</Tag>
<Tag dot="accent" variant="accent">1-10,21-end</Tag>
<Tag ui onRemove={() => drop(file)}>contract_final.pdf</Tag>
```

- **mono by default** — filenames, ranges, sizes. Set `ui` for a prose label.
- `onRemove` turns it into a removable input token (× appears).
- For job/process status with a label and live state, use **StatusPill** instead.
