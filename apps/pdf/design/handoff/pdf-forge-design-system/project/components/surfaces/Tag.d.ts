import * as React from 'react';

/**
 * Tag — a compact metadata chip. Mono by default for machine data (filenames,
 * ranges, byte sizes); set `ui` for prose labels. Pass `onRemove` for an input
 * token with a dismiss affordance.
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** neutral (graphite) · accent (press-tint) · solid (stronger graphite). @default "neutral" */
  variant?: 'neutral' | 'accent' | 'solid';
  /** md 22px · lg 26px. @default "md" */
  size?: 'md' | 'lg';
  /** Use the Inter UI face instead of mono. @default false */
  ui?: boolean;
  /** Leading status dot: a semantic key (ok/warn/err/proc/accent) or a CSS color. */
  dot?: 'ok' | 'warn' | 'err' | 'proc' | 'accent' | string | null;
  /** Show a dismiss "×" and fire this on click. */
  onRemove?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export declare function Tag(props: TagProps): React.JSX.Element;
