/**
 * Typed domain outcomes. These are BUSINESS outcomes, not tool breakage — the
 * board-agents-claim.md §1 convention (isError:true structured content on MCP, typed HTTP
 * status on the API). Never bare protocol errors.
 */
export type DriveErrorCode =
  | 'MALFORMED_ID' // 400
  | 'FENCING_REQUIRED' // 409 — agent principal omitted a required fencing token
  | 'STALE_FENCING' // 409 — echoed token older than the local high-water
  | 'TICKET_NOT_FOUND' // 422 — Board gave a definitive "no such ticket"
  | 'UPLOAD_EXPIRED' // 409
  | 'UPLOAD_STATE' // 409 — wrong upload state for the op
  | 'NOT_OWNER' // 403 — same-principal violation on an upload session
  | 'OVER_SIZE_CAP' // 413
  | 'TYPE_REJECTED' // 415
  | 'QUOTA_EXHAUSTED' // 429
  | 'DISK_WATERMARK' // 507
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409 (generic)
  | 'FORBIDDEN' // 403
  | 'UNAUTHENTICATED' // 401
  | 'INSUFFICIENT_SCOPE'; // 403

const HTTP: Record<DriveErrorCode, number> = {
  MALFORMED_ID: 400,
  FENCING_REQUIRED: 409,
  STALE_FENCING: 409,
  TICKET_NOT_FOUND: 422,
  UPLOAD_EXPIRED: 409,
  UPLOAD_STATE: 409,
  NOT_OWNER: 403,
  OVER_SIZE_CAP: 413,
  TYPE_REJECTED: 415,
  QUOTA_EXHAUSTED: 429,
  DISK_WATERMARK: 507,
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INSUFFICIENT_SCOPE: 403,
};

export class DriveError extends Error {
  constructor(
    readonly code: DriveErrorCode,
    message: string,
    readonly detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DriveError';
  }
  get httpStatus(): number {
    return HTTP[this.code];
  }
  toStructured(): { code: DriveErrorCode; message: string; detail?: Record<string, unknown> } {
    return this.detail ? { code: this.code, message: this.message, detail: this.detail } : { code: this.code, message: this.message };
  }
}
