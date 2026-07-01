**PressIndicator** — the signature "press at work" job readout; the one place amber lives.

```jsx
<PressIndicator state="processing" label="Merging 3 files" detail="contract_final.pdf · 512 pages"
  action={<Button size="sm" variant="ghost">Cancel</Button>} />

<PressIndicator state="success" label="Export ready" detail="merged_2024.pdf · 4.2 MB"
  action={<Button size="sm" variant="primary">Download</Button>} />

<PressIndicator state="error" label="Couldn't finish" code="bad_pdf_structure"
  action={<Button size="sm">Retry</Button>} />
```

- **processing** runs a warm amber sweep + pulsing lamp ("the press is working") — no fake progress bar.
- Resolves to **success** (green check) or **error** (red × + machine code). Under reduced-motion the sweep/pulse go static.
- Reserve this for real server jobs (merge, export, OCR). For lightweight activity use **Spinner**; for selection/state badges use **StatusPill**.
