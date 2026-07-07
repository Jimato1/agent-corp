// components/PolicyCeremony.tsx — THE CENTERPIECE (UI_SPEC §5.3).
// The single gate-weakening change-control ceremony: propose → BlastRadiusPreview
// → step-up confirm. It IS the shared ConfirmFriction (§5.1) — CMDB introduces no
// new dialog; it fills ConfirmFriction's app-specific preview slot with the
// BlastRadiusPreview and binds the confirm token to the diff hash.
//
// Friction is chosen by DIRECTION OF THE EDIT (decided server-side, rendered here):
//   • tightening / benign  → LIGHT ConfirmFriction: single signal-cyan confirm,
//     no typed intent, no step-up (engaging safety is the encouraged path).
//   • gate-weakening        → FULL ConfirmFriction: red primary, typed-intent,
//     live step-up, BlastRadiusPreview, diff-hash-bound token, live honest echo.
//     Phase 1 `propose` computes the typed diff + classification + blast-radius
//     and returns a single-use confirm_token (TTL 5m) bound to sha256(diff).
//     Phase 2 `confirm` → commit → push → snapshot swap → hash-chained row.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, ConfirmFriction } from './ds';
import type { ButtonTone } from './ds';
import { BlastRadiusPreview } from './cmparts';
import { ApiError, confirmPolicy, proposePolicy } from '../lib/api';
import type { ProposeInput } from '../lib/api';
import type { ProposeResult } from '../lib/types';
import { useCmdb } from '../state/CmdbProvider';

// ── The FULL (gate-weakening) ceremony ──────────────────────────────────────

export interface WeakeningCeremonyProps {
  triggerLabel: ReactNode;
  triggerTone?: ButtonTone;
  triggerSize?: 'compact' | 'default';
  triggerGlyph?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Phase-1 propose input sent to POST /v1/policy/propose. */
  proposeInput?: ProposeInput;
  /** Alternate Phase-1 call (e.g. break-glass hits POST /v1/break-glass, which
   *  returns the SAME propose-result shape). Overrides `proposeInput` when set. */
  proposeCall?: () => Promise<ProposeResult>;
  /** Offline fallback for the propose result (so the ceremony renders offline).
   *  Its SHAPE must match the live backend so both render identically. */
  fixturePropose: ProposeResult;
  /** Human consequence copy (direction/effect of the edit) — UI-supplied, since
   *  the backend propose-result carries no prose consequence field. */
  consequence?: ReactNode;
  irreversible?: boolean;
  auditNote?: ReactNode;
  confirmLabel?: string;
  onDone?: (r: { committed?: string | null }) => void;
  onEscapeToHalt?: () => void;
}

export function WeakeningCeremony({
  triggerLabel,
  triggerTone = 'danger',
  triggerSize = 'default',
  triggerGlyph = '⚠',
  eyebrow = 'Confirm · weaken policy',
  title,
  proposeInput,
  proposeCall,
  fixturePropose,
  consequence,
  irreversible = true,
  auditNote = 'Commit → push to remote → only then snapshot swap. Writes a hash-chained policy_change_log row {seq, prev_hash, hash, sub, jti, diff_hash, git_commit}.',
  confirmLabel = 'Weaken policy',
  onDone,
  onEscapeToHalt,
}: WeakeningCeremonyProps) {
  const { posture } = useCmdb();
  const [open, setOpen] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [result, setResult] = useState<ProposeResult | null>(null);
  const [proposeNote, setProposeNote] = useState<string | null>(null);

  // Phase 1 — propose: compute diff + classification + blast-radius + token.
  async function beginPropose() {
    setProposing(true);
    setProposeNote(null);
    try {
      const r = proposeCall ? await proposeCall() : await proposePolicy(proposeInput!);
      setResult(r);
    } catch (e) {
      // Offline / dependency: fall back to the fixture so the ceremony still
      // renders (clearly a demo). A live 4xx surfaces as a Pattern-R note.
      if (e instanceof ApiError && !e.isDependency) setProposeNote(`${e.code} — ${e.message}`);
      setResult(fixturePropose);
    } finally {
      setProposing(false);
      setOpen(true);
    }
  }

  // Phase 2 — confirm: bind to diff_hash, typed-intent = expected_intent, fresh
  // step-up. typed_intent MUST equal the propose-returned expected_intent verbatim.
  async function confirm() {
    if (!result) return;
    try {
      const r = await confirmPolicy({
        confirm_token: result.confirm_token,
        typed_intent: result.expected_intent ?? '',
        diff_hash: result.diff_hash,
      });
      onDone?.({ committed: r.committed });
    } catch {
      onDone?.({ committed: '(offline-demo)' }); // simulate committed effect offline
    } finally {
      close();
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setProposeNote(null);
  }

  const typedIntent = result?.expected_intent || undefined;

  return (
    <>
      <Button tone={triggerTone} size={triggerSize} icon={triggerGlyph} disabled={proposing} onClick={beginPropose}>
        {proposing ? 'Computing blast radius…' : triggerLabel}
      </Button>
      {result ? (
        <ConfirmFriction
          open={open}
          intensity="full"
          eyebrow={eyebrow}
          title={title}
          direction="more"
          irreversible={irreversible}
          honest={{ confirmed: posture.confirmed, pending: posture.pending, draining: posture.draining }}
          typedIntent={typedIntent}
          stepUp
          confirmLabel={confirmLabel}
          auditNote={auditNote}
          consequence={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <strong>This moves the system TOWARD MORE real-world action.</strong>{' '}
                {consequence}
              </div>
              {proposeNote ? <div style={{ color: 'var(--danger-text)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>propose warning: {proposeNote}</div> : null}
              <BlastRadiusPreview blast={result.blast_radius} diff={result.typed_diff} diffHash={result.diff_hash} />
            </div>
          }
          onConfirm={confirm}
          onCancel={close}
          onEscapeToHalt={onEscapeToHalt}
        />
      ) : null}
    </>
  );
}

// ── The LIGHT (tightening / benign) ceremony ────────────────────────────────
// Engaging safety — a stop, a revoke, a narrow. Single signal-cyan confirm; no
// typed intent, no step-up. No propose round-trip: it is a direct benign write.

export interface TighteningActionProps {
  triggerLabel: ReactNode;
  triggerTone?: ButtonTone;
  triggerSize?: 'compact' | 'default';
  title: ReactNode;
  consequence: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function TighteningAction({
  triggerLabel,
  triggerTone = 'secondary',
  triggerSize = 'default',
  title,
  consequence,
  confirmLabel = 'Confirm safely',
  onConfirm,
}: TighteningActionProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button tone={triggerTone} size={triggerSize} onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <ConfirmFriction
        open={open}
        intensity="light"
        eyebrow="Confirm · engage safety"
        title={title}
        direction="less"
        consequence={consequence}
        confirmLabel={confirmLabel}
        onConfirm={async () => { await onConfirm(); setOpen(false); }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
