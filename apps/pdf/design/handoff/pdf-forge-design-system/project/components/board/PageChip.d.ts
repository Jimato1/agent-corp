import * as React from 'react';

/**
 * PageChip — the mono page-number chip on a sheet's bottom-left corner. Uses
 * tabular figures so counts don't wobble; shows a rotation glyph + degrees when
 * the page is turned.
 */
export interface PageChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Page number (or any short mono label). */
  page: React.ReactNode;
  /** Rotation in degrees; non-zero shows the ⟳ glyph + value. @default 0 */
  rotation?: number;
  /** Solid graphite background instead of the translucent overlay (use off-sheet). @default false */
  bare?: boolean;
}

export declare function PageChip(props: PageChipProps): React.JSX.Element;
