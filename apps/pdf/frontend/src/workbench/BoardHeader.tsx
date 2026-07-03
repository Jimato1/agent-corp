import { Icon } from '../components/ds/Icon';
import { Button, Checkbox, IconButton, SegmentedControl, StatusPill, Tag, Tooltip } from '../components/ds';
import { humanBytes } from '../lib/format';
import type { SheetSize } from '../state/uiStore';

export interface BoardHeaderProps {
  docName: string;
  sizeBytes: number;
  liveCount: number;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  sheetSize: SheetSize;
  onSheetSize: (s: SheetSize) => void;
  onRotate: () => void;
  onDelete: () => void;
  onExport: () => void;
  exporting: boolean;
  edits: number;
  canUndo: boolean;
  onUndo: () => void;
}

/** Board header strip — doc identity, selection + bulk actions, zoom, export. */
export function BoardHeader({
  docName, sizeBytes, liveCount, selectedCount, allSelected, someSelected, onToggleAll,
  sheetSize, onSheetSize, onRotate, onDelete, onExport, exporting, edits, canUndo, onUndo,
}: BoardHeaderProps) {
  const hasSel = selectedCount > 0;

  return (
    <div className="wb-header">
      <div className="wb-header__doc">
        <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={onToggleAll} aria-label="Select all pages" />
        <span className="wb-header__fileicon"><Icon name="file" size={16} /></span>
        <span className="wb-header__name">{docName}</span>
        <Tag>{liveCount} pages</Tag>
        <span className="wb-header__size">{humanBytes(sizeBytes)}</span>
      </div>

      {hasSel ? (
        <div className="wb-header__bulk">
          <StatusPill status="selected" count={selectedCount}>selected</StatusPill>
          <Tooltip label="Rotate 90°" kbd="R"><IconButton variant="outlined" label="Rotate selected" onClick={onRotate}><Icon name="rotate" /></IconButton></Tooltip>
          <Tooltip label="Delete pages" kbd="⌫"><IconButton variant="danger" label="Delete selected" onClick={onDelete}><Icon name="trash" /></IconButton></Tooltip>
        </div>
      ) : null}

      <div className="wb-header__right">
        {edits > 0 ? (
          <div className="wb-header__edits">
            <span style={{ color: 'var(--ink-700)' }}>{edits} edit{edits > 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--sub-500)' }}>·</span>
            <button type="button" className="wb-header__undo" onClick={onUndo} disabled={!canUndo}>
              <Icon name="undo" size={13} />Undo
            </button>
          </div>
        ) : null}
        <SegmentedControl
          ariaLabel="Sheet size"
          value={sheetSize}
          onChange={(v) => onSheetSize(v as SheetSize)}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'large', label: 'Large' },
          ]}
        />
        <Tooltip label="Export selected pages" kbd="⌘E" placement="bottom">
          <Button variant="primary" leftIcon={<Icon name="export" size={16} />} processing={exporting} onClick={onExport}>
            {exporting ? 'Pressing…' : 'Export'}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

export default BoardHeader;
