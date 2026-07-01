import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';
import { PageChip } from './PageChip';

const ISO_PORTRAIT = 210 / 297; // ≈0.707 (w/h)

export interface PageSheetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  page: number;
  width?: number;
  aspect?: number;
  rotation?: number;
  /** A rendered page image (PNG/JPEG data URL or object URL) from pdf.js. */
  src?: string;
  selected?: boolean;
  focused?: boolean;
  lifted?: boolean;
  deleted?: boolean;
  loading?: boolean;
  showChip?: boolean;
  children?: ReactNode;
  /** Root ref — used by @dnd-kit's setNodeRef. */
  innerRef?: Ref<HTMLDivElement>;
}

/**
 * PageSheet — the SIGNATURE object: a PDF page as a physical paper sheet on the
 * workbench. The only bright-white, shadow-casting element in the app.
 */
export function PageSheet({
  page,
  width = 132,
  aspect = ISO_PORTRAIT,
  rotation = 0,
  src,
  selected = false,
  focused = false,
  lifted = false,
  deleted = false,
  loading = false,
  showChip = true,
  onClick,
  className = '',
  children,
  innerRef,
  style,
  ...rest
}: PageSheetProps) {
  const rotated = rotation % 180 !== 0;
  const effAspect = rotated ? 1 / aspect : aspect; // swap box for 90/270
  const height = Math.round(width / effAspect);

  const cls = [
    'pf-sheet',
    selected ? 'pf-sheet--selected' : '',
    focused ? 'pf-sheet--focus' : '',
    lifted ? 'pf-sheet--lifted' : '',
    deleted ? 'pf-sheet--deleted' : '',
    loading ? 'pf-sheet--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  // counter-scale the inner image so a rotated page fills the swapped box
  const imgScale = rotated ? effAspect / aspect : 1;

  const mergedStyle: CSSProperties = { width, height, ...style };

  return (
    <div
      ref={innerRef}
      className={cls}
      style={mergedStyle}
      role="button"
      tabIndex={focused ? 0 : -1}
      aria-pressed={selected}
      aria-label={`Page ${page}${deleted ? ' (deleted)' : ''}${rotation ? `, rotated ${rotation}°` : ''}`}
      onClick={onClick}
      {...rest}
    >
      <div className="pf-sheet__face">
        {loading ? (
          <div className="pf-sheet__spin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" /></svg></div>
        ) : children ? (
          children
        ) : src ? (
          <img className="pf-sheet__img" src={src} alt="" draggable={false} style={{ transform: `rotate(${rotation}deg) scale(${imgScale})` }} />
        ) : (
          <div className="pf-sheet__ph" style={{ transform: `rotate(${rotation}deg)` }}>
            <i /><i /><i /><i /><i /><i /><i />
          </div>
        )}
      </div>

      {selected && !deleted ? (
        <span className="pf-sheet__tab" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#08191f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
      ) : null}

      {deleted ? <span className="pf-sheet__deltab" aria-hidden="true" /> : null}

      {showChip ? (
        <span className="pf-sheet__chip"><PageChip page={page} rotation={rotation} /></span>
      ) : null}
    </div>
  );
}

export default PageSheet;
