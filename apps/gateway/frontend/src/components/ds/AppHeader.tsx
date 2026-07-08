import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — AppHeader
   The global header, identical in every app: the app's name and one-line
   identity on the LEFT, a SYSTEM STATE zone in the CENTER, and the halt
   affordance / read-only kill-status mirror pinned RIGHT. 52px tall. */

const CSS = `
.helm-header {
  display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center;
  height: var(--header-height); flex: none;
  padding: 0 var(--space-4); gap: var(--space-4);
  background: var(--surface-raised); border-bottom: 1px solid var(--border-default);
}
.helm-header__left { display: flex; align-items: baseline; gap: var(--space-2); min-width: 0; overflow: hidden; }
.helm-header__app { font-family: var(--font-ui); font-size: 15px; font-weight: 600; color: var(--text-primary); white-space: nowrap; flex: none; }
.helm-header__identity {
  font-family: var(--font-ui); font-size: 12px; color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
  border-left: 1px solid var(--border-strong); padding-left: var(--space-2);
}
.helm-header__center { display: flex; align-items: center; gap: var(--space-3); justify-self: center; min-width: 0; }
.helm-header__state-label {
  font-family: var(--font-ui); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-muted); white-space: nowrap;
}
.helm-header__state { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.helm-header__right { display: flex; align-items: center; gap: var(--space-2); justify-self: end; min-width: 0; }

/* Squeeze order protects the safety-critical right slot: shed the identity and
   the state-label first, so the halt affordance is never the thing that clips. */
@media (max-width: 1180px) {
  .helm-header__identity { display: none; }
}
@media (max-width: 1040px) {
  .helm-header__state-label { display: none; }
}

/* A compact read-only kill-status mirror for the right slot. */
.helm-killmirror {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 10px;
  border-radius: var(--radius-control); border: 1px solid; text-decoration: none;
  font-family: var(--font-ui); font-size: 12px; font-weight: 600;
}
.helm-killmirror--nominal { background: var(--surface-inset); border-color: var(--border-strong); color: var(--text-secondary); }
.helm-killmirror--engaged { background: var(--halt-gold-wash); border-color: var(--halt-gold); color: var(--halt-gold-ink); }
.helm-killmirror__glyph { font-size: 13px; }
.helm-killmirror--nominal .helm-killmirror__glyph { color: var(--state-green); }
.helm-killmirror--engaged .helm-killmirror__glyph { color: var(--halt-gold); }
.helm-killmirror__ro { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.7; }
`;

injectStyle('helm-appheader-css', CSS);

export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  appName: ReactNode;
  identity?: ReactNode;
  stateLabel?: ReactNode;
  systemState?: ReactNode;
  children?: ReactNode;
}

export function AppHeader({ appName, identity, stateLabel = 'System state', systemState, children, className = '', ...rest }: AppHeaderProps) {
  return (
    <header className={['helm-header', className].filter(Boolean).join(' ')} {...rest}>
      <div className="helm-header__left">
        <span className="helm-header__app">{appName}</span>
        {identity ? <span className="helm-header__identity">{identity}</span> : null}
      </div>
      <div className="helm-header__center">
        {systemState ? <span className="helm-header__state-label">{stateLabel}</span> : null}
        <div className="helm-header__state">{systemState}</div>
      </div>
      <div className="helm-header__right">{children}</div>
    </header>
  );
}

export interface KillMirrorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  engaged?: boolean;
  href?: string;
  label?: ReactNode;
}

/* A ready-made read-only kill-status mirror for the header's right slot. Every
   app shows this; only Mission Control / auth swap it for a live trigger. Chat
   is NOT in the kill chain, so this is always read-only here. */
export function KillMirror({ engaged = false, href = '#', label, ...rest }: KillMirrorProps) {
  return (
    <a
      className={`helm-killmirror ${engaged ? 'helm-killmirror--engaged' : 'helm-killmirror--nominal'}`}
      href={href}
      title={engaged ? 'A stop is engaged — review in Mission Control' : 'No stop engaged'}
      {...rest}
    >
      <span className="helm-killmirror__glyph" aria-hidden="true">▮▮</span>
      <span>{label || (engaged ? 'Kill engaged' : 'Nominal')}</span>
      <span className="helm-killmirror__ro">mirror</span>
    </a>
  );
}

export default AppHeader;
