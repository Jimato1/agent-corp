import * as React from 'react';

/**
 * PressIndicator — the SIGNATURE companion. The amber "press at work" readout
 * that drives the heavy server-job moment: a warm sweep + pulsing lamp while
 * processing, resolving to a green check (success) or a red machine-code
 * banner (error). This is the one place amber appears; keep it for real jobs.
 *
 * @startingPoint section="Feedback" subtitle="The amber press-at-work job readout" viewport="700x140"
 */
export interface PressIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** idle · processing (amber sweep) · success (green) · error (red). @default "processing" */
  state?: 'idle' | 'processing' | 'success' | 'error';
  /** Headline (defaults per state: "Pressing…" / "Done" / "Job failed"). */
  label?: React.ReactNode;
  /** Mono context line (file names, counts, byte sizes). */
  detail?: React.ReactNode;
  /** Machine error code shown in mono (error state). */
  code?: string;
  /** Trailing actions (Cancel while processing; Open/Download on success; Retry on error). */
  action?: React.ReactNode;
}

export declare function PressIndicator(props: PressIndicatorProps): React.JSX.Element;
