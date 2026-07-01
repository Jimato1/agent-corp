// Worksurface — the board well: sheets in a flow, select / focus / drag-reorder. → window.Worksurface
(function () {
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const { PageSheet, InsertionBar } = NS;
  const WIDTHS = { compact: 96, comfortable: 132, large: 180 };

  function Worksurface({ pages, selected, focusIndex, size, grid, onSelectPage, onReorder, onFocusIndex }) {
    const width = WIDTHS[size] || 132;
    const [dragIndex, setDragIndex] = React.useState(-1);
    const [insertAt, setInsertAt] = React.useState(-1);

    const wellBg = grid
      ? 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)'
      : 'var(--sub-700)';

    const sheetH = (p) => Math.round(width / (p.rotation % 180 !== 0 ? 1 / p.aspect : p.aspect));

    function onKeyDown(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = Math.max(0, Math.min(pages.length - 1, focusIndex + (e.key === 'ArrowRight' ? 1 : -1)));
        onFocusIndex(next);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const p = pages[focusIndex];
        if (p && !p.deleted) onSelectPage(p.id, e);
      }
    }

    function handleDragOver(e, i) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      setInsertAt(after ? i + 1 : i);
    }
    function handleDrop(e) {
      e.preventDefault();
      if (dragIndex >= 0 && insertAt >= 0) onReorder(dragIndex, insertAt);
      setDragIndex(-1); setInsertAt(-1);
    }

    const items = [];
    pages.forEach((p, i) => {
      if (insertAt === i && dragIndex >= 0) {
        items.push(<InsertionBar key={'ins' + i} height={sheetH(p)} />);
      }
      items.push(
        <div
          key={p.id}
          draggable={!p.deleted}
          onDragStart={() => setDragIndex(i)}
          onDragEnd={() => { setDragIndex(-1); setInsertAt(-1); }}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          style={{ display: 'inline-flex' }}
        >
          <PageSheet
            page={p.page}
            width={width}
            aspect={p.aspect}
            rotation={p.rotation}
            selected={selected.has(p.id)}
            focused={focusIndex === i}
            lifted={dragIndex === i}
            deleted={p.deleted}
            onClick={(e) => { if (!p.deleted) { onSelectPage(p.id, e); onFocusIndex(i); } }}
          />
        </div>
      );
    });
    if (insertAt === pages.length && dragIndex >= 0) {
      items.push(<InsertionBar key="ins-end" height={Math.round(width * 1.414)} />);
    }

    return (
      <div
        role="listbox"
        aria-label="Document pages"
        aria-multiselectable="true"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onDragOver={(e) => { if (dragIndex >= 0) e.preventDefault(); }}
        onDrop={handleDrop}
        style={{
          flex: 1, minHeight: 0, overflow: 'auto', margin: 16, padding: '22px 20px',
          borderRadius: 'var(--r-panel)', background: wellBg,
          boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: size === 'compact' ? 8 : 12 }}>
          {items}
        </div>
      </div>
    );
  }
  window.Worksurface = Worksurface;
})();
