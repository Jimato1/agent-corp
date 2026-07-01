import * as React from 'react';

/**
 * Panel — the chrome surface (sidebars, inspectors, dialogs sit on these).
 * Flat: value-step + 1px hairline, never a drop shadow. `well` makes it a
 * recessed inset (the board substrate, thumbnail trays).
 */
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase instrument eyebrow above the title. */
  eyebrow?: React.ReactNode;
  /** Panel title (wrap machine text in <span class="pf-panel__mono">). */
  title?: React.ReactNode;
  /** Right-aligned header actions (IconButtons, a Button). */
  actions?: React.ReactNode;
  /** Replace the whole header row with custom content. */
  header?: React.ReactNode;
  /** Recessed inset treatment (darker fill + inner shadow). @default false */
  well?: boolean;
  /** Drop the radius + border (for full-bleed regions). @default false */
  flush?: boolean;
  /** Remove body padding (for tables/boards that manage their own). @default false */
  noBodyPadding?: boolean;
  bodyClassName?: string;
  children?: React.ReactNode;
}

export declare function Panel(props: PanelProps): React.JSX.Element;
