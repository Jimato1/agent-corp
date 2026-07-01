import { Icon } from '../components/ds/Icon';
import { Tooltip } from '../components/ds';
import type { IconName } from '../components/ds/Icon';
import type { OpId } from '../state/uiStore';

export interface RailOp {
  id: OpId;
  label: string;
  icon: IconName;
}

export const RAIL_OPS: RailOp[] = [
  { id: 'pages', label: 'Pages', icon: 'pages' },
  { id: 'merge', label: 'Merge', icon: 'merge' },
  { id: 'split', label: 'Split', icon: 'split' },
  { id: 'rotate', label: 'Rotate', icon: 'rotate' },
  { id: 'compress', label: 'Compress', icon: 'compress' },
  { id: 'export', label: 'Export', icon: 'export' },
];

interface RailItemProps {
  op: RailOp;
  active: boolean;
  collapsed: boolean;
  onSelect: (id: OpId) => void;
}

function RailItem({ op, active, collapsed, onSelect }: RailItemProps) {
  const btn = (
    <button
      type="button"
      className="wb-railitem"
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(op.id)}
    >
      <span className="wb-railitem__icon"><Icon name={op.icon} size={17} /></span>
      {!collapsed ? <span>{op.label}</span> : null}
    </button>
  );
  return collapsed ? <Tooltip label={op.label} placement="right">{btn}</Tooltip> : btn;
}

export interface RailProps {
  active: OpId;
  collapsed: boolean;
  onSelect: (id: OpId) => void;
  onToggle: () => void;
}

/** Left rail — operation nav, collapsible (56 ↔ 220). */
export function Rail({ active, collapsed, onSelect, onToggle }: RailProps) {
  return (
    <nav className={`wb-rail${collapsed ? ' is-collapsed' : ''}`}>
      <div className="wb-rail__brand">
        <img className="wb-rail__brandmark" src="/mark.svg" alt="" width={26} height={26} />
        {!collapsed ? <span className="wb-rail__wordmark">pdf<span>-</span>forge</span> : null}
      </div>

      <div className="wb-rail__ops">
        {!collapsed ? <span className="wb-rail__eyebrow">Operations</span> : null}
        {RAIL_OPS.map((op) => (
          <RailItem key={op.id} op={op} active={active === op.id} collapsed={collapsed} onSelect={onSelect} />
        ))}
      </div>

      <div className="wb-rail__footer">
        {!collapsed ? (
          <div className="wb-rail__privacy">
            <span className="wb-lock"><Icon name="lock" size={13} /></span>
            local · 127.0.0.1
          </div>
        ) : null}
        <button type="button" className="wb-rail__collapse" onClick={onToggle} aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}>
          <span className="wb-flip"><Icon name="panelLeft" size={16} /></span>
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </nav>
  );
}

export default Rail;
