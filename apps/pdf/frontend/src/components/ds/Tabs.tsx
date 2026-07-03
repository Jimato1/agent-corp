import { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs?: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** Tabs — flat underline tabs with a press-blue active indicator. */
export function Tabs({ tabs = [], value, defaultValue, onChange, className = '' }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;

  return (
    <div className={['pf-tabs', className].filter(Boolean).join(' ')} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          className="pf-tab"
          aria-selected={active === t.id}
          onClick={() => { if (value === undefined) setInternal(t.id); onChange?.(t.id); }}
        >
          {t.label}
          {t.count != null ? <span className="pf-tab__count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
