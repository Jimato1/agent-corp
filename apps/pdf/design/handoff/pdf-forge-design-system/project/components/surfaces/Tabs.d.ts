import * as React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Optional tabular count badge (e.g. page count). */
  count?: number;
}

/**
 * Tabs — flat underline tabs with a press-blue active indicator. Use for
 * switching views within a region (e.g. Pages / Outline / Metadata).
 */
export interface TabsProps {
  tabs: TabItem[];
  /** Controlled active tab id. */
  value?: string;
  /** Uncontrolled initial tab id (defaults to first tab). */
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export declare function Tabs(props: TabsProps): React.JSX.Element;
