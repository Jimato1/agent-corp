import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';
import { SuiteSwitcher } from './SuiteSwitcher';
import type { SuiteApp } from './SuiteSwitcher';

/* Helm — NavRail
   The left side rail, identical in every app: 224px open, collapses to a 56px
   glyph rail. Carries the wordmark, the SuiteSwitcher, the app's nav items, and
   — pinned bottom — the suite-wide safety posture shown ONCE. */

const CSS = `
.helm-rail {
  display: flex; flex-direction: column; height: 100%;
  width: var(--rail-open); flex: none;
  background: var(--surface-raised); border-right: 1px solid var(--border-default);
  transition: width var(--dur-base) var(--ease-standard);
}
.helm-rail[data-collapsed="true"] { width: var(--rail-collapsed); }
.helm-rail__brand {
  display: flex; align-items: center; gap: var(--space-2); height: var(--header-height);
  padding: 0 var(--space-3); border-bottom: 1px solid var(--border-default); flex: none;
}
.helm-rail__mark {
  font-family: var(--font-ui); font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--text-primary);
}
.helm-rail__mark .dot { color: var(--halt-gold); }
.helm-rail__toggle {
  margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: var(--radius-control); cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--text-muted); font-size: 13px;
}
.helm-rail__toggle:hover { background: var(--bg-control); color: var(--text-primary); }
.helm-rail__toggle:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-rail__switch { padding: var(--space-3) var(--space-3) var(--space-2); }
.helm-rail__nav { flex: 1; overflow-y: auto; padding: var(--space-2); display: flex; flex-direction: column; gap: 2px; }
.helm-rail__group { font-family: var(--font-ui); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); padding: 10px 8px 4px; }
.helm-rail[data-collapsed="true"] .helm-rail__group { display: none; }
.helm-nav-item {
  position: relative; display: flex; align-items: center; gap: 10px;
  height: 34px; padding: 0 10px; border-radius: var(--radius-control);
  color: var(--text-secondary); background: transparent; border: 0; cursor: pointer;
  text-decoration: none; text-align: left; width: 100%;
  font-family: var(--font-ui); font-size: 13px; font-weight: 500;
  transition: background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard);
}
.helm-nav-item:hover { background: var(--bg-control); color: var(--text-primary); }
.helm-nav-item:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-nav-item.is-active { background: var(--surface-inset); color: var(--text-primary); }
.helm-nav-item.is-active::before {
  content: ''; position: absolute; left: -2px; top: 7px; bottom: 7px; width: 3px;
  background: var(--signal-cyan); border-radius: 2px;
}
.helm-nav-item__icon { flex: none; width: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; color: currentColor; }
.helm-nav-item__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.helm-rail[data-collapsed="true"] .helm-nav-item { justify-content: center; padding: 0; }
.helm-rail[data-collapsed="true"] .helm-nav-item__label { display: none; }
.helm-nav-item__badge {
  flex: none; min-width: 18px; height: 17px; padding: 0 5px; border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 10px; font-weight: 600; font-feature-settings: var(--figures-tabular);
  background: var(--state-amber-wash); color: var(--state-amber-ink); border: 1px solid #5A4A1E;
}
.helm-rail[data-collapsed="true"] .helm-nav-item__badge {
  position: absolute; top: 3px; right: 3px; min-width: 8px; height: 8px; padding: 0; border-radius: 50%;
  background: var(--state-amber); border: 0; font-size: 0;
}
.helm-rail__posture {
  flex: none; margin: var(--space-2); padding: 10px; border-radius: var(--radius-panel);
  border: 1px solid var(--border-default); background: var(--surface-inset);
  display: flex; align-items: center; gap: 10px; text-decoration: none;
}
.helm-rail__posture.is-engaged { border-color: var(--halt-gold-edge); background: var(--halt-gold-wash); }
.helm-rail__posture-ring {
  flex: none; width: 30px; height: 30px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
  border: 2px solid var(--border-strong); color: var(--text-muted);
}
.helm-rail__posture.is-engaged .helm-rail__posture-ring {
  border-color: var(--halt-gold); color: var(--halt-gold);
  box-shadow: 0 0 0 3px rgba(242,132,43,0.14);
}
.helm-rail__posture-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.helm-rail__posture-word { font-family: var(--font-ui); font-size: 11px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-muted); }
.helm-rail__posture.is-engaged .helm-rail__posture-word { color: var(--halt-gold-ink); }
.helm-rail__posture-sub { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
.helm-rail[data-collapsed="true"] .helm-rail__posture { justify-content: center; padding: 8px; }
.helm-rail[data-collapsed="true"] .helm-rail__posture-txt { display: none; }
`;

injectStyle('helm-navrail-css', CSS);

export interface NavItem {
  key?: string;
  label?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  group?: string;
}

export type Posture = 'nominal' | 'kill' | 'safe-stop';

const POSTURE: Record<Posture, { engaged: boolean; glyph: string; word: string; sub: string }> = {
  nominal: { engaged: false, glyph: '▮▮', word: 'Nominal', sub: 'no stop engaged' },
  kill: { engaged: true, glyph: '▮▮', word: 'Kill engaged', sub: 'suite-wide' },
  'safe-stop': { engaged: true, glyph: '⛊', word: 'Safe-stopped', sub: 'failed closed' },
};

export interface NavRailProps extends Omit<HTMLAttributes<HTMLElement>, 'onToggle'> {
  brand?: string;
  current?: string;
  apps?: SuiteApp[];
  items?: NavItem[];
  collapsed?: boolean;
  posture?: Posture;
  onSelectApp?: (key: string) => void;
  onToggle?: (collapsed: boolean) => void;
  postureHref?: string;
  onPostureClick?: (e: MouseEvent) => void;
}

function ItemLink({ item }: { item: NavItem }) {
  const cls = ['helm-nav-item', item.active ? 'is-active' : ''].filter(Boolean).join(' ');
  const content = (
    <>
      <span className="helm-nav-item__icon" aria-hidden="true">{item.icon}</span>
      <span className="helm-nav-item__label">{item.label}</span>
      {item.badge != null ? <span className="helm-nav-item__badge">{item.badge}</span> : null}
    </>
  );
  if (item.href) {
    return (
      <a className={cls} href={item.href} title={typeof item.label === 'string' ? item.label : undefined} aria-current={item.active ? 'page' : undefined}>
        {content}
      </a>
    );
  }
  return (
    <button className={cls} title={typeof item.label === 'string' ? item.label : undefined} onClick={item.onClick} aria-current={item.active ? 'page' : undefined}>
      {content}
    </button>
  );
}

export function NavRail({
  brand = 'Helm',
  current = 'mission-control',
  apps,
  items = [],
  collapsed = false,
  posture = 'nominal',
  onSelectApp,
  onToggle,
  postureHref = '#',
  onPostureClick,
  className = '',
  ...rest
}: NavRailProps) {
  const p = POSTURE[posture] ?? POSTURE.nominal;

  return (
    <nav className={['helm-rail', className].filter(Boolean).join(' ')} data-collapsed={collapsed ? 'true' : 'false'} {...rest}>
      <div className="helm-rail__brand">
        {collapsed ? (
          <span className="helm-rail__mark">H<span className="dot">.</span></span>
        ) : (
          <span className="helm-rail__mark">{brand}<span className="dot">.</span></span>
        )}
        <button className="helm-rail__toggle" aria-label={collapsed ? 'Expand rail' : 'Collapse rail'} onClick={() => onToggle?.(!collapsed)}>
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <div className="helm-rail__switch">
        <SuiteSwitcher apps={apps} current={current} collapsed={collapsed} onSelect={onSelectApp} />
      </div>

      <div className="helm-rail__nav">
        {items.map((it) =>
          it.group ? (
            <div key={it.group} className="helm-rail__group">{it.group}</div>
          ) : (
            <ItemLink key={it.key} item={it} />
          ),
        )}
      </div>

      <a
        className={['helm-rail__posture', p.engaged ? 'is-engaged' : ''].filter(Boolean).join(' ')}
        href={postureHref}
        onClick={onPostureClick}
        title={`Suite posture: ${p.word}`}
      >
        <span className="helm-rail__posture-ring" aria-hidden="true">{p.glyph}</span>
        <span className="helm-rail__posture-txt">
          <span className="helm-rail__posture-word">{p.word}</span>
          <span className="helm-rail__posture-sub">{p.sub}</span>
        </span>
      </a>
    </nav>
  );
}

export default NavRail;
