import * as React from 'react';

/**
 * InsertionBar — the press-blue drop-gap indicator with end-caps. Place it in
 * the gap where a dragged sheet will land while neighbors ease aside. The
 * single clearest "where it goes" signal in the reorder choreography.
 */
export interface InsertionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** vertical (between sheets in a row) · horizontal (between wrapped rows). @default "vertical" */
  orientation?: 'vertical' | 'horizontal';
  /** Explicit height for the vertical bar (else stretches to the flex row). */
  height?: number | string;
}

export declare function InsertionBar(props: InsertionBarProps): React.JSX.Element;
