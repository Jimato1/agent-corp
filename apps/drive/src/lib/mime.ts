/**
 * Server-side magic-byte sniffing (PLAN §10.2). The sniffed MIME is CANONICAL; the
 * client hint is display-only. Serving controls (nosniff, attachment-default, inline
 * allowlist) are the real boundary and live in the download header matrix (§4.1).
 */

/** Streaming sniffer: feed the first bytes; it decides once it has enough. */
export class MimeSniffer {
  private head = Buffer.alloc(0);
  private decided: string | null = null;
  private static readonly NEEDED = 512;

  update(chunk: Buffer): void {
    if (this.decided !== null || this.head.length >= MimeSniffer.NEEDED) return;
    const remaining = MimeSniffer.NEEDED - this.head.length;
    this.head = Buffer.concat([this.head, chunk.subarray(0, remaining)]);
  }

  /** Final MIME. Defaults to application/octet-stream when nothing matches. */
  result(): string {
    if (this.decided) return this.decided;
    this.decided = sniff(this.head);
    return this.decided;
  }
}

function starts(b: Buffer, sig: number[], off = 0): boolean {
  if (b.length < off + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (b[off + i] !== sig[i]) return false;
  return true;
}

function asciiPrefix(b: Buffer, s: string): boolean {
  if (b.length < s.length) return false;
  for (let i = 0; i < s.length; i++) if (b[i] !== s.charCodeAt(i)) return false;
  return true;
}

/** True if the buffer is executable machine code (PE/ELF/Mach-O) — rejected by default. */
export function isExecutable(mime: string): boolean {
  return (
    mime === 'application/x-msdownload' ||
    mime === 'application/x-elf' ||
    mime === 'application/x-mach-binary'
  );
}

export function sniff(b: Buffer): string {
  // Executables (checked first so the reject policy can see them).
  if (starts(b, [0x7f, 0x45, 0x4c, 0x46])) return 'application/x-elf'; // ELF
  if (starts(b, [0x4d, 0x5a])) return 'application/x-msdownload'; // MZ / PE
  if (
    starts(b, [0xfe, 0xed, 0xfa, 0xce]) ||
    starts(b, [0xfe, 0xed, 0xfa, 0xcf]) ||
    starts(b, [0xcf, 0xfa, 0xed, 0xfe]) ||
    starts(b, [0xca, 0xfe, 0xba, 0xbe])
  )
    return 'application/x-mach-binary';

  // Images
  if (starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts(b, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts(b, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (starts(b, [0x52, 0x49, 0x46, 0x46]) && starts(b, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';

  // Documents / archives
  if (starts(b, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (starts(b, [0x50, 0x4b, 0x03, 0x04]) || starts(b, [0x50, 0x4b, 0x05, 0x06])) {
    // ZIP container — OOXML/ODF share this; sniffed as zip (canonical). Serving is attachment.
    return 'application/zip';
  }
  if (starts(b, [0x1f, 0x8b])) return 'application/gzip';
  if (b.length > 262 && starts(b, [0x75, 0x73, 0x74, 0x61, 0x72], 257)) return 'application/x-tar';

  // Text-family (best-effort; canonical for serving policy purposes)
  const trimmed = b.subarray(0, 64).toString('utf8').trimStart();
  if (asciiPrefix(Buffer.from(trimmed), '<?xml') || asciiPrefix(Buffer.from(trimmed), '<svg'))
    return 'image/svg+xml';
  if (
    asciiPrefix(Buffer.from(trimmed.toLowerCase()), '<!doctype html') ||
    asciiPrefix(Buffer.from(trimmed.toLowerCase()), '<html')
  )
    return 'text/html';
  if (isProbablyText(b)) {
    const c = trimmed[0];
    if (c === '{' || c === '[') return 'application/json';
    return 'text/plain';
  }
  return 'application/octet-stream';
}

function isProbablyText(b: Buffer): boolean {
  const n = Math.min(b.length, 512);
  if (n === 0) return false;
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const c = b[i]!;
    if (c === 0) return false; // NUL ⇒ binary
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 0xc0) printable++;
  }
  return printable / n > 0.9;
}

/** The strict inline allowlist (§4.1). Everything else is attachment-only, forever. */
const INLINE_ALLOWLIST = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']);

export function isInlineAllowed(sniffedMime: string): boolean {
  return INLINE_ALLOWLIST.has(sniffedMime);
}
