import * as React from 'react';

/** The one badge for every trust / provenance signal. Glyph shows how
 *  independent the label is. UNTRUSTED (striped amber) means the content is
 *  adversarial input to the models and blocks the auto-approve lane.
 *
 *  Rules: taint is display-only; heuristic labels are marked `~ heuristic` and
 *  never shown as verified; trust tiers never borrow the halt-gold.
 *
 * @startingPoint section="Identity" subtitle="Verified / corroborated / single-source / untrusted" viewport="700x120"
 */
export interface TierBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** verified (green ✔) · corroborated (cyan ⧉) · single (amber ◑) · untrusted (striped ⚠). */
  tier?: 'verified' | 'corroborated' | 'single' | 'untrusted';
  /** Override the default tier label text. */
  label?: React.ReactNode;
  /** Append a `~ heuristic` marker (ignored on `verified`). */
  heuristic?: boolean;
}

export function TierBadge(props: TierBadgeProps): JSX.Element;
