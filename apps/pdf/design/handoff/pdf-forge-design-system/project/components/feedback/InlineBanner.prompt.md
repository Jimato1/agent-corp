**InlineBanner** — status message placed inline next to what it describes; errors show the machine code in mono.

```jsx
<InlineBanner status="err" title="Couldn't read the PDF" code="bad_pdf_structure"
  actions={<Button size="sm" variant="ghost">Retry</Button>}>
  The file appears to be corrupt past page 14.
</InlineBanner>

<InlineBanner status="warn" title="Advisory permissions kept">
  This PDF requests no-print; pdf-forge honors it on export.
</InlineBanner>
```

- **status**: `info` (press) · `ok` · `warn` · `err`. Each has a left rule + matching icon.
- Reserve for inline context. For transient confirmations that float and auto-dismiss, use **Toast**.
