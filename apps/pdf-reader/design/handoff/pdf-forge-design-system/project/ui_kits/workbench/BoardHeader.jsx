// Board header strip — doc name, page count, selection, zoom, run. → window.BoardHeader
(function () {
  const Icon = window.PFIcon;
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const { Checkbox, SegmentedControl, StatusPill, Button, IconButton, Tooltip, Tag } = NS;

  function BoardHeader(props) {
    const { doc, liveCount, selectedCount, allSelected, someSelected, onToggleAll,
      size, onSize, onRotate, onDelete, onRun, processing } = props;
    const hasSel = selectedCount > 0;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '10px 16px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)', flex: 'none',
      }}>
        {/* doc identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={onToggleAll} aria-label="Select all pages" />
          <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={16} /></span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{doc.name}</span>
          <Tag>{liveCount} pages</Tag>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-600)' }}>{doc.size}</span>
        </div>

        {/* selection + bulk actions */}
        {hasSel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusPill status="selected" count={selectedCount}>selected</StatusPill>
            <Tooltip label="Rotate 90°" kbd="R"><IconButton variant="outlined" label="Rotate selected" onClick={onRotate}><Icon name="rotate" /></IconButton></Tooltip>
            <Tooltip label="Delete pages" kbd="⌫"><IconButton variant="danger" label="Delete selected" onClick={onDelete}><Icon name="trash" /></IconButton></Tooltip>
          </div>
        ) : null}

        {/* right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <SegmentedControl ariaLabel="Sheet size" value={size} onChange={onSize} options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'large', label: 'Large' },
          ]} />
          <Tooltip label="Export selected pages" kbd="⌘E" placement="bottom">
            <Button variant="primary" leftIcon={<Icon name="export" size={16} />} processing={processing} onClick={onRun}>
              {processing ? 'Pressing…' : 'Export'}
            </Button>
          </Tooltip>
        </div>
      </div>
    );
  }
  window.BoardHeader = BoardHeader;
})();
