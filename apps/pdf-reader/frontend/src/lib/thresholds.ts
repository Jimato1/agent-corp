// Client/server routing gate (D7). Files at or above the threshold route to the
// server (pikepdf) instead of the in-browser pdf-lib path.

const DEFAULT_THRESHOLD_MB = 150;

export function clientServerThresholdMb(): number {
  const raw = import.meta.env.VITE_CLIENT_SERVER_THRESHOLD_MB;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_THRESHOLD_MB;
}

/** Upper bound the backend will accept at all (PDFFORGE_MAX_UPLOAD_MB=200). */
export const MAX_UPLOAD_MB = 200;

/** True when a file must go to the server path rather than the browser worker. */
export function routesToServer(sizeBytes: number): boolean {
  return sizeBytes >= clientServerThresholdMb() * 1024 * 1024;
}

/** True when a file exceeds what the backend will accept. */
export function exceedsMaxUpload(sizeBytes: number): boolean {
  return sizeBytes > MAX_UPLOAD_MB * 1024 * 1024;
}
