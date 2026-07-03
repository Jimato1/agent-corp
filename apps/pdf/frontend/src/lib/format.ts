// Formatting helpers — the instrument's data voice: exact, tabular, mono-friendly.

/** Human byte size, e.g. 5242880 → "5.0 MB". Tabular-friendly (one decimal ≥ KB). */
export function humanBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

/** Exact byte count with grouping, e.g. 5242880 → "5,242,880". */
export function groupBytes(bytes: number): string {
  return bytes.toLocaleString('en-US');
}

/** Signed percentage delta from input→output, e.g. -62%. */
export function percentDelta(input: number, output: number): string {
  if (!input) return '0%';
  const pct = Math.round(((output - input) / input) * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

/** Ensure a filename carries the given extension (defaults preserved otherwise). */
export function withExtension(name: string, ext: string): string {
  const clean = name.replace(/\.[^./\\]+$/, '');
  return `${clean}.${ext.replace(/^\./, '')}`;
}
