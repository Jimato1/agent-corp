import type { CSSProperties, HTMLAttributes } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — Skeleton
   Loading = static skeletons shaped like the TARGET layout (not a spinner).
   Quiet inset blocks; a very subtle pulse that reduced-motion removes. */

const CSS = `
.helm-skel { background: var(--surface-inset); border-radius: var(--radius-control); display: block; }
.helm-skel--pulse { animation: helm-skel-pulse 1.4s var(--ease-standard) infinite; }
@keyframes helm-skel-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .helm-skel--pulse { animation: none; } }
.helm-skel-lines { display: flex; flex-direction: column; gap: 8px; }
.helm-skel-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-bottom: 1px solid var(--border-default);
}
`;

injectStyle('helm-skeleton-css', CSS);

export interface SkeletonProps extends HTMLAttributes<HTMLElement> {
  variant?: 'block' | 'text' | 'table';
  width?: string | number;
  height?: string | number;
  lines?: number;
  rows?: number;
  pulse?: boolean;
}

export function Skeleton({
  variant = 'block',
  width,
  height,
  lines = 3,
  rows = 4,
  pulse = true,
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  const base = ['helm-skel', pulse ? 'helm-skel--pulse' : ''].filter(Boolean).join(' ');

  if (variant === 'text') {
    return (
      <div className={['helm-skel-lines', className].filter(Boolean).join(' ')} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className={base} style={{ height: 10, width: i === lines - 1 ? '62%' : '100%', borderRadius: 3 }} />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={className} {...rest}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="helm-skel-row">
            <span className={base} style={{ height: 12, width: 90, borderRadius: 3 }} />
            <span className={base} style={{ height: 12, flex: 1, borderRadius: 3 }} />
            <span className={base} style={{ height: 12, width: 60, borderRadius: 3 }} />
            <span className={base} style={{ height: 12, width: 44, borderRadius: 3 }} />
          </div>
        ))}
      </div>
    );
  }

  const blockStyle: CSSProperties = { width: width ?? '100%', height: height ?? 40, ...style };
  return <span className={[base, className].filter(Boolean).join(' ')} style={blockStyle} {...rest} />;
}

export default Skeleton;
