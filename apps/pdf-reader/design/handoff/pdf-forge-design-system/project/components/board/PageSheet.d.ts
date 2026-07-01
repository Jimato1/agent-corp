import * as React from 'react';

/**
 * PageSheet — the SIGNATURE element: a PDF page rendered as a physical paper
 * sheet on the workbench. The only bright-white object in the app and the only
 * one that casts a shadow. Honors each page's true aspect; carries all page
 * states (selected, focused, lifted/dragging, deleted, loading).
 *
 * @startingPoint section="Board" subtitle="A PDF page as a physical paper sheet" viewport="700x320"
 */
export interface PageSheetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Page number for the corner chip. */
  page: number;
  /** Sheet width in px (compact 96 · comfortable 132 · large 180). @default 132 */
  width?: number;
  /** True page aspect (w/h). Default ISO portrait ≈0.707; pass >1 for landscape. */
  aspect?: number;
  /** Applied rotation 0/90/180/270; swaps the sheet box + flags the chip. @default 0 */
  rotation?: number;
  /** Rendered thumbnail image URL (pdf.js canvas/dataURL). Omit for the faint placeholder. */
  src?: string;
  /** Selected: 2px press border + press-tint wash + check tab. @default false */
  selected?: boolean;
  /** Roving-tabindex keyboard focus (ring + lift; sets tabIndex=0). @default false */
  focused?: boolean;
  /** Lifted/dragging: scale 1.04, tilt 1.5°, lifted shadow. @default false */
  lifted?: boolean;
  /** Marked for deletion: strikethrough + err corner tab + dim. @default false */
  deleted?: boolean;
  /** Lazy placeholder with a faint center spinner (virtualized boards). @default false */
  loading?: boolean;
  /** Show the page-number chip. @default true */
  showChip?: boolean;
  /** Custom thumbnail content (overrides src/placeholder). */
  children?: React.ReactNode;
}

export declare function PageSheet(props: PageSheetProps): React.JSX.Element;
