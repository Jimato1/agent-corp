import { useState } from 'react';
import type { ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';
import { ConfirmFriction } from './ConfirmFriction';
import type { HonestStateProps } from './HonestState';

/* Helm — DangerAction
   Anything moving the system toward MORE real-world action or an irreversible
   change is red and always behind the confirm ceremony. This packages the red
   trigger + the ConfirmFriction ceremony together so the two can never drift
   apart. For a capability that cannot exist BY CONSTRUCTION, render a
   PrintedAbsence instead — never a greyed-out control. */

const CSS = `
.helm-danger-trigger {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: var(--control-default); padding: 0 14px;
  border-radius: var(--radius-control); font-family: var(--font-ui); font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid #5A2420; background: transparent; color: var(--danger-text);
  transition: background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard);
}
.helm-danger-trigger:hover:not([disabled]) { background: var(--danger-bg); border-color: var(--danger); }
.helm-danger-trigger:active:not([disabled]) { background: #351512; }
.helm-danger-trigger:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-danger-trigger--solid { background: var(--danger); color: #2C1210; border-color: transparent; }
.helm-danger-trigger--solid:hover:not([disabled]) { background: var(--danger-red-hover); }
.helm-danger-trigger--compact { height: var(--control-compact); padding: 0 10px; }
.helm-danger-trigger[disabled] { opacity: 0.4; cursor: not-allowed; }
.helm-danger-trigger__glyph { font-size: 14px; font-variant-emoji: text; }
`;

injectStyle('helm-dangeraction-css', CSS);

export interface DangerActionProps {
  label: ReactNode;
  glyph?: ReactNode;
  variant?: 'outline' | 'solid';
  size?: 'default' | 'compact';
  disabled?: boolean;
  intensity?: 'light' | 'full';
  title?: ReactNode;
  consequence?: ReactNode;
  direction?: 'more' | 'less';
  irreversible?: boolean;
  blastRadius?: ReactNode;
  honest?: Partial<HonestStateProps>;
  typedIntent?: string;
  stepUp?: boolean;
  confirmLabel?: string;
  auditNote?: ReactNode;
  onConfirm?: () => void;
  onEscapeToHalt?: () => void;
  className?: string;
}

export function DangerAction({
  label,
  glyph = '⛔',
  variant = 'outline',
  size = 'default',
  disabled = false,
  intensity = 'full',
  title,
  consequence,
  direction = 'more',
  irreversible = false,
  blastRadius,
  honest,
  typedIntent,
  stepUp = false,
  confirmLabel,
  auditNote,
  onConfirm,
  onEscapeToHalt,
  className = '',
}: DangerActionProps) {
  const [open, setOpen] = useState(false);

  const triggerCls = [
    'helm-danger-trigger',
    variant === 'solid' ? 'helm-danger-trigger--solid' : '',
    size === 'compact' ? 'helm-danger-trigger--compact' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <>
      <button type="button" className={triggerCls} disabled={disabled} onClick={() => setOpen(true)}>
        {glyph ? <span className="helm-danger-trigger__glyph" aria-hidden="true">{glyph}</span> : null}
        {label}
      </button>
      <ConfirmFriction
        open={open}
        intensity={intensity}
        title={title || label}
        consequence={consequence}
        direction={direction}
        irreversible={irreversible}
        blastRadius={blastRadius}
        honest={honest}
        typedIntent={typedIntent}
        stepUp={stepUp}
        confirmLabel={confirmLabel || (typeof label === 'string' ? label : undefined)}
        auditNote={auditNote}
        onConfirm={() => {
          setOpen(false);
          onConfirm?.();
        }}
        onCancel={() => setOpen(false)}
        onEscapeToHalt={onEscapeToHalt}
      />
    </>
  );
}

export default DangerAction;
