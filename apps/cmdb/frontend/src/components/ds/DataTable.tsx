import { useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — DataTable
   The truth-surface of the whole suite. Dense rows, subtle zebra striping, a
   sticky sortable header, right-aligned tabular numbers, and a clear focused-row
   state (a cyan left-edge). Reflows to stacked cards on narrow screens. */

const CSS = `
.helm-table-wrap { width: 100%; overflow: auto; border: 1px solid var(--border-default); border-radius: var(--radius-panel); }
.helm-table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: var(--font-ui); }
.helm-table thead th {
  position: sticky; top: 0; z-index: 1;
  background: var(--surface-raised); color: var(--text-muted);
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  text-align: left; padding: 9px 12px; white-space: nowrap;
  border-bottom: 1px solid var(--border-strong); user-select: none;
}
.helm-table thead th.is-num { text-align: right; }
.helm-table thead th.is-sortable { cursor: pointer; }
.helm-table thead th.is-sortable:hover { color: var(--text-secondary); }
.helm-table__sort { margin-left: 5px; font-size: 10px; opacity: 0.5; }
.helm-table thead th.is-sorted .helm-table__sort { opacity: 1; color: var(--signal-cyan); }
.helm-table tbody td {
  padding: 9px 12px; font-size: 13px; color: var(--text-secondary);
  border-bottom: 1px solid var(--border-default); vertical-align: middle; white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-standard);
}
.helm-table tbody tr:nth-child(even) td { background: rgba(30,36,46,0.4); }
.helm-table tbody tr:hover td { background: var(--surface-inset); }
.helm-table td.is-num { text-align: right; font-family: var(--font-mono); font-feature-settings: var(--figures-tabular); color: var(--text-primary); }
.helm-table td.is-mono { font-family: var(--font-mono); font-feature-settings: var(--figures-tabular); }
.helm-table tbody tr.is-focused td { background: var(--signal-cyan-wash); }
.helm-table tbody tr.is-focused td:first-child { box-shadow: inset 3px 0 0 var(--signal-cyan); }
.helm-table tbody tr.is-clickable { cursor: pointer; }
.helm-table tbody tr:focus-visible { outline: none; }
.helm-table tbody tr:focus-visible td { background: var(--signal-cyan-wash); }
.helm-table tbody tr:focus-visible td:first-child { box-shadow: inset 3px 0 0 var(--signal-cyan); }
.helm-table--dense td { padding: 6px 12px; }
.helm-table--dense thead th { padding: 6px 12px; }
.helm-table__empty td { text-align: center; color: var(--text-muted); padding: var(--space-8); }
@media (max-width: 620px) {
  .helm-table--reflow thead { display: none; }
  .helm-table--reflow, .helm-table--reflow tbody, .helm-table--reflow tr, .helm-table--reflow td { display: block; width: 100%; }
  .helm-table--reflow tr { border-bottom: 1px solid var(--border-strong); padding: 6px 0; }
  .helm-table--reflow td { border: 0; padding: 5px 12px; white-space: normal; text-align: left; }
  .helm-table--reflow td.is-num { text-align: left; }
  .helm-table--reflow td::before { content: attr(data-label); display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 2px; }
}
`;

injectStyle('helm-datatable-css', CSS);

export interface DataColumn<Row> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right';
  num?: boolean;
  mono?: boolean;
  width?: string | number;
  sortable?: boolean;
  render?: (row: Row) => ReactNode;
  sortValue?: (row: Row) => string | number;
}

export interface DataTableProps<Row> extends Omit<HTMLAttributes<HTMLDivElement>, 'onSort'> {
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey?: string;
  dense?: boolean;
  reflow?: boolean;
  focusedKey?: string | number;
  onRowClick?: (row: Row) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  emptyMessage?: ReactNode;
}

type SortDir = 'asc' | 'desc';

export function DataTable<Row>({
  columns,
  rows,
  rowKey = 'id',
  dense = false,
  reflow = true,
  focusedKey,
  onRowClick,
  sortKey: sortKeyProp,
  sortDir: sortDirProp,
  onSort,
  emptyMessage = 'No rows.',
  className = '',
  ...rest
}: DataTableProps<Row>) {
  const [internalSort, setInternalSort] = useState<{ key: string | null; dir: SortDir }>({ key: null, dir: 'asc' });
  const controlled = typeof onSort === 'function';
  const sortKey = controlled ? sortKeyProp : internalSort.key;
  const sortDir: SortDir = (controlled ? sortDirProp : internalSort.dir) ?? 'asc';

  const handleSort = (col: DataColumn<Row>) => {
    if (!col.sortable) return;
    const nextDir: SortDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    if (controlled) onSort?.(col.key, nextDir);
    else setInternalSort({ key: col.key, dir: nextDir });
  };

  let view = rows;
  if (!controlled && sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    view = [...rows].sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : ((a as Record<string, unknown>)[sortKey] as string | number | undefined);
      const bv = col?.sortValue ? col.sortValue(b) : ((b as Record<string, unknown>)[sortKey] as string | number | undefined);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }

  const tableCls = [
    'helm-table',
    dense ? 'helm-table--dense' : '',
    reflow ? 'helm-table--reflow' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={['helm-table-wrap', className].filter(Boolean).join(' ')} {...rest}>
      <table className={tableCls}>
        <thead>
          <tr>
            {columns.map((col) => {
              const isNum = col.align === 'right' || col.num;
              const sorted = sortKey === col.key;
              const thCls = [isNum ? 'is-num' : '', col.sortable ? 'is-sortable' : '', sorted ? 'is-sorted' : ''].filter(Boolean).join(' ');
              return (
                <th
                  key={col.key}
                  className={thCls}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => handleSort(col)}
                  aria-sort={sorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.header}
                  {col.sortable ? <span className="helm-table__sort" aria-hidden="true">{sorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span> : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {view.length === 0 ? (
            <tr className="helm-table__empty"><td colSpan={columns.length}>{emptyMessage}</td></tr>
          ) : (
            view.map((row) => {
              const key = (row as Record<string, unknown>)[rowKey] as string | number;
              const focused = focusedKey != null && key === focusedKey;
              const clickable = typeof onRowClick === 'function';
              const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick?.(row);
                }
              };
              return (
                <tr
                  key={key}
                  className={[focused ? 'is-focused' : '', clickable ? 'is-clickable' : ''].filter(Boolean).join(' ')}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onRowClick?.(row) : undefined}
                  onKeyDown={clickable ? onKey : undefined}
                >
                  {columns.map((col) => {
                    const isNum = col.align === 'right' || col.num;
                    const cls = [isNum ? 'is-num' : '', col.mono ? 'is-mono' : ''].filter(Boolean).join(' ');
                    const content = col.render ? col.render(row) : ((row as Record<string, unknown>)[col.key] as ReactNode);
                    return (
                      <td key={col.key} className={cls} data-label={typeof col.header === 'string' ? col.header : col.key}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
