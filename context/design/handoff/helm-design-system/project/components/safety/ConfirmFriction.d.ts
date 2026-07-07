import * as React from 'react';

/** The step-up confirm ceremony — the single gate for every dangerous op. A
 *  modal with a plain-language consequence block (scope, irreversibility,
 *  direction, blast radius, live honest-state echo), a typed-intent field, and
 *  for high-stakes ops a step-up re-authentication.
 *
 *  Two intensities: `light` (engaging safety — a stop/revoke, toward LESS
 *  action: calm cyan single-confirm) · `full` (toward MORE action / irreversible:
 *  red, with typed-intent + step-up). Esc → Cancel; Shift+Esc → onEscapeToHalt.
 */
export interface ConfirmFrictionProps {
  open?: boolean;
  /** light (cyan single-confirm) · full (red, typed-intent + step-up). */
  intensity?: 'light' | 'full';
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  /** The plain-language consequence copy. */
  consequence?: React.ReactNode;
  /** Which way the op moves the system. `more` is red; `less` is calm. */
  direction?: 'more' | 'less';
  irreversible?: boolean;
  /** Blast-radius summary, e.g. "4 agents, 1 host". */
  blastRadius?: React.ReactNode;
  /** Props forwarded to a HonestState echo (confirmed/pending/draining…). */
  honest?: Record<string, unknown>;
  /** The exact phrase the operator must type (full intensity). */
  typedIntent?: string;
  /** Require a fresh identity re-check before confirm. */
  stepUp?: boolean;
  confirmLabel?: string;
  /** Tamper-evident audit note (policy/secret edits bind the confirm to the diff). */
  auditNote?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  /** Shift+Esc handler — focus (never fire) the halt control. */
  onEscapeToHalt?: () => void;
}

export function ConfirmFriction(props: ConfirmFrictionProps): JSX.Element | null;
