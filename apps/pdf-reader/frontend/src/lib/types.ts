// Shared API types — mirror docs/API.md (the authoritative backend contract).

/** The 14 job operations (SCOPE.md §6). reorder/rotate/delete + small merge/split
 *  are client edits made durable via `finalize`, so they are not ops here. */
export type JobOp =
  | 'finalize'
  | 'merge'
  | 'split'
  | 'compress'
  | 'ocr'
  | 'encrypt'
  | 'decrypt'
  | 'permissions'
  | 'rasterize'
  | 'image-to-pdf'
  | 'extract-text'
  | 'sanitize'
  | 'linearize'
  | 'repair';

export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'canceled';

export interface JobArtifact {
  index: number;
  href: string;
  media_type: string;
  filename: string;
  bytes: number;
}

export interface JobResult {
  href: string;
  media_type: string;
  filename: string;
  bytes: number;
  artifacts: JobArtifact[];
  meta?: Record<string, unknown> & { input_bytes?: number; output_bytes?: number; kept?: 'input' | 'output' };
}

export interface JobError {
  code: string;
  message: string;
}

/** Job descriptor — the shared response shape (API.md §4.1). */
export interface Job {
  id: string;
  op: JobOp;
  state: JobState;
  progress: number | null;
  stage?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  engine?: string;
  input?: { filename: string; bytes: number };
  submitted_by?: string | null;
  result: JobResult | null;
  error: JobError | null;
}

/** The common non-2xx error envelope (API.md §1.5). */
export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    status: number;
    request_id?: string;
    details?: Record<string, unknown>;
  };
}
