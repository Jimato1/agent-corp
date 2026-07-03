import { useEffect, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { InsertionBar, PageSheet } from '../components/ds';
import type { Page } from '../page-model/pageModel';
import { useDocumentStore } from '../state/documentStore';
import type { SheetSize } from '../state/uiStore';

const WIDTHS: Record<SheetSize, number> = { compact: 96, comfortable: 132, large: 180 };

function sheetHeight(width: number, p: Page): number {
  const rotated = p.rotation % 180 !== 0;
  const effAspect = rotated ? 1 / p.aspect : p.aspect;
  return Math.round(width / effAspect);
}

interface SheetCellProps {
  page: Page;
  index: number;
  width: number;
  selected: boolean;
  focused: boolean;
  lifted: boolean;
  onSelect: (id: string, e: MouseEvent) => void;
  onFocusIndex: (i: number) => void;
  onDragStart: (i: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent, i: number) => void;
  onDrop: (e: DragEvent) => void;
}

/** One board cell: lazily renders its pdf.js thumbnail when near the viewport. */
function SheetCell(props: SheetCellProps) {
  const { page, index, width, selected, focused, lifted, onSelect, onFocusIndex, onDragStart, onDragEnd, onDragOver, onDrop } = props;
  const ensureThumbnail = useDocumentStore((s) => s.ensureThumbnail);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page.src || page.deleted) return;
    const el = cellRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          ensureThumbnail(page.id, width);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [page.id, page.src, page.deleted, width, ensureThumbnail]);

  return (
    <div
      ref={cellRef}
      className="wb-cell"
      draggable={!page.deleted}
      onDragStart={() => onDragStart(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
    >
      <PageSheet
        page={page.label}
        width={width}
        aspect={page.aspect}
        rotation={page.rotation}
        src={page.src}
        selected={selected}
        focused={focused}
        lifted={lifted}
        deleted={page.deleted}
        loading={!page.src && !page.deleted}
        onClick={(e) => { if (!page.deleted) { onSelect(page.id, e); onFocusIndex(index); } }}
      />
    </div>
  );
}

export interface WorksurfaceProps {
  pages: Page[];
  selected: Set<string>;
  focusIndex: number;
  sheetSize: SheetSize;
  grid?: boolean;
  onSelectPage: (id: string, e: MouseEvent) => void;
  onSelectByIndex: (index: number, shiftKey: boolean, metaKey: boolean) => void;
  onReorder: (from: number, to: number) => void;
  onFocusIndex: (i: number) => void;
}

/** Worksurface — the board well: sheets in a flow; select / focus / drag-reorder. */
export function Worksurface({
  pages, selected, focusIndex, sheetSize, grid = true,
  onSelectPage, onSelectByIndex, onReorder, onFocusIndex,
}: WorksurfaceProps) {
  const width = WIDTHS[sheetSize] ?? 132;
  const [dragIndex, setDragIndex] = useState(-1);
  const [insertAt, setInsertAt] = useState(-1);

  function handleDragOver(e: DragEvent, i: number) {
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    setInsertAt(after ? i + 1 : i);
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (dragIndex >= 0 && insertAt >= 0) onReorder(dragIndex, insertAt);
    setDragIndex(-1);
    setInsertAt(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(0, Math.min(pages.length - 1, focusIndex + (e.key === 'ArrowRight' ? 1 : -1)));
      onFocusIndex(next);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const p = pages[focusIndex];
      if (p && !p.deleted) onSelectByIndex(focusIndex, e.shiftKey, e.metaKey || e.ctrlKey);
    }
  }

  const cells: React.ReactNode[] = [];
  pages.forEach((p, i) => {
    if (insertAt === i && dragIndex >= 0) {
      cells.push(<InsertionBar key={`ins${i}`} height={sheetHeight(width, p)} />);
    }
    cells.push(
      <SheetCell
        key={p.id}
        page={p}
        index={i}
        width={width}
        selected={selected.has(p.id)}
        focused={focusIndex === i}
        lifted={dragIndex === i}
        onSelect={onSelectPage}
        onFocusIndex={onFocusIndex}
        onDragStart={setDragIndex}
        onDragEnd={() => { setDragIndex(-1); setInsertAt(-1); }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />,
    );
  });
  if (insertAt === pages.length && dragIndex >= 0) {
    cells.push(<InsertionBar key="ins-end" height={Math.round(width * 1.414)} />);
  }

  return (
    <div
      className={`wb-well${grid ? ' has-grid' : ''}`}
      role="listbox"
      aria-label="Document pages"
      aria-multiselectable="true"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragOver={(e) => { if (dragIndex >= 0) e.preventDefault(); }}
      onDrop={handleDrop}
    >
      <div className={`wb-flow${sheetSize === 'compact' ? ' is-compact' : ''}`}>{cells}</div>
    </div>
  );
}

export default Worksurface;
