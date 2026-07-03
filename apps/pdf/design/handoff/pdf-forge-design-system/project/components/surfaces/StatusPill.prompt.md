**StatusPill** — dot + label pill for job / validation state.

```jsx
<StatusPill status="ok">Done</StatusPill>
<StatusPill status="proc">Pressing…</StatusPill>
<StatusPill status="err">bad_pdf_structure</StatusPill>
<StatusPill status="selected" count={3}>selected</StatusPill>
```

- **proc** pulses the dot (the press at work); **selected** is the press-tint selection badge used in the board header.
- Pass `count` for a trailing tabular number. Keep these rationed — semantics only appear on state.
