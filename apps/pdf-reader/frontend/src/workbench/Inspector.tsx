import { useState } from 'react';
import { Icon } from '../components/ds/Icon';
import {
  Button, Checkbox, InlineBanner, Input, PressIndicator, RadioGroup, Select, Switch,
} from '../components/ds';
import type { PressPhase } from '../state/jobsStore';
import type { OpId } from '../state/uiStore';

const TITLES: Record<OpId, string> = {
  pages: 'Page properties', merge: 'Merge documents', split: 'Split document',
  rotate: 'Rotate pages', compress: 'Compress', export: 'Export',
};
const VERB: Record<OpId, string> = {
  pages: 'Export', merge: 'Merge', split: 'Split', rotate: 'Apply rotation', compress: 'Compress', export: 'Export',
};
const ICONS: Record<OpId, string> = {
  pages: 'pages', merge: 'merge', split: 'split', rotate: 'rotate', compress: 'compress', export: 'export',
};
const GERUND: Record<OpId, string> = {
  pages: 'Exporting', export: 'Exporting', merge: 'Merging', split: 'Splitting', rotate: 'Applying rotation', compress: 'Compressing',
};

export interface OpParams {
  compress?: { preset: string; color_dpi: number };
  split?: { mode: string; ranges: string };
  merge?: { filename: string };
  rotate?: { degrees: number };
  export?: { filename: string; range: string };
}

export interface InspectorProps {
  activeOp: OpId;
  liveCount: number;
  selectedCount: number;
  mergeFiles: string[];
  press: { phase: PressPhase; label?: string; detail?: string; code?: string };
  onRun: (op: OpId, params: OpParams) => void;
  onDownload: () => void;
  onRetry: () => void;
  onAddFiles: () => void;
  docName: string;
}

/** Right inspector — op options + the press-at-work job readout. */
export function Inspector({
  activeOp, liveCount, selectedCount, mergeFiles, press, onRun, onDownload, onRetry, onAddFiles, docName,
}: InspectorProps) {
  const [params, setParams] = useState<OpParams>({
    compress: { preset: 'ebook', color_dpi: 150 },
    split: { mode: 'ranges', ranges: '1-10,11-20,21-end' },
    merge: { filename: 'merged.pdf' },
    rotate: { degrees: 90 },
    export: { filename: docName || 'document.pdf', range: 'all' },
  });

  const verb = VERB[activeOp];
  const target = selectedCount > 0 ? `${selectedCount} selected pages` : `all ${liveCount} pages`;
  const busy = press.phase === 'processing';

  function run() {
    onRun(activeOp, params);
  }

  return (
    <aside className="wb-inspector">
      <div className="wb-inspector__head">
        <span className="wb-inspector__eyebrow">Inspector</span>
        <div className="wb-inspector__title">
          <span className="wb-inspector__titleicon"><Icon name={ICONS[activeOp]} size={17} /></span>
          <h3>{TITLES[activeOp]}</h3>
        </div>
      </div>

      <div className="wb-inspector__body">
        {activeOp === 'merge' ? (
          <>
            <div className="wb-field">
              <span className="wb-field__label">Source files · drag to reorder</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mergeFiles.map((f, i) => (
                  <div key={f} className="wb-filerow">
                    <span className="wb-filerow__num">{i + 1}</span>
                    <span className="wb-filerow__icon"><Icon name="file" size={14} /></span>
                    <span className="wb-filerow__name">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="wb-field">
              <Button variant="secondary" block leftIcon={<Icon name="plus" size={15} />} onClick={onAddFiles}>Add files</Button>
            </div>
            <div className="wb-field">
              <Input
                label="Output filename" mono value={params.merge?.filename ?? ''}
                onChange={(e) => setParams((p) => ({ ...p, merge: { filename: e.target.value } }))}
              />
            </div>
          </>
        ) : activeOp === 'compress' ? (
          <>
            <div className="wb-field">
              <span className="wb-field__label">Compression level</span>
              <RadioGroup
                name="lvl"
                value={params.compress?.preset}
                onChange={(v) => setParams((p) => ({ ...p, compress: { preset: v, color_dpi: v === 'screen' ? 96 : 150 } }))}
                options={[
                  { value: 'printer', label: 'Lossless (metadata only)' },
                  { value: 'ebook', label: 'Balanced — 150 DPI images' },
                  { value: 'screen', label: 'Aggressive — 96 DPI images' },
                ]}
              />
            </div>
            <div className="wb-field">
              <InlineBanner status="info" title="Re-samples images; vector text is untouched.">
                Larger inputs benefit most; already-optimized files may be kept as-is.
              </InlineBanner>
            </div>
          </>
        ) : activeOp === 'split' ? (
          <>
            <div className="wb-field">
              <Input
                label="Ranges" mono value={params.split?.ranges ?? ''}
                hint="Comma-separated · e.g. 1-10, 12, 20-end"
                onChange={(e) => setParams((p) => ({ ...p, split: { mode: 'ranges', ranges: e.target.value } }))}
              />
            </div>
            <div className="wb-field" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-600)' }}>
              <Icon name="zip" size={14} /> {(params.split?.ranges ?? '').split(',').filter(Boolean).length} ranges → that many files
            </div>
          </>
        ) : activeOp === 'rotate' ? (
          <div className="wb-field">
            <span className="wb-field__label">Rotate {selectedCount > 0 ? `${selectedCount} selected` : 'all'} pages</span>
            <RadioGroup
              name="deg" row value={String(params.rotate?.degrees ?? 90)}
              onChange={(v) => setParams((p) => ({ ...p, rotate: { degrees: Number(v) } }))}
              options={[{ value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' }]}
            />
          </div>
        ) : (
          // pages / export — the default form
          <>
            <div className="wb-field">
              <Input
                label="Output filename" mono value={params.export?.filename ?? ''}
                onChange={(e) => setParams((p) => ({ ...p, export: { ...(p.export ?? { range: 'all' }), filename: e.target.value } }))}
              />
            </div>
            <div className="wb-field">
              <Select
                label="Page range" mono value={params.export?.range}
                onChange={(e) => setParams((p) => ({ ...p, export: { ...(p.export ?? { filename: docName }), range: e.target.value } }))}
                options={[{ value: 'all', label: 'All pages' }, { value: 'sel', label: 'Selected pages' }]}
              />
            </div>
            <div className="wb-field" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Switch label="Keep input file" defaultChecked />
              <Checkbox label="Flatten annotations" />
            </div>
          </>
        )}
      </div>

      <div className="wb-inspector__foot">
        {press.phase !== 'idle' ? (
          <PressIndicator
            state={press.phase}
            label={press.phase === 'processing' ? `${GERUND[activeOp]}…` : press.label}
            detail={press.detail}
            code={press.code}
            action={
              press.phase === 'success'
                ? <Button size="sm" variant="primary" leftIcon={<Icon name="download" size={15} />} onClick={onDownload}>Download</Button>
                : press.phase === 'error'
                  ? <Button size="sm" onClick={onRetry}>Retry</Button>
                  : null
            }
          />
        ) : null}
        <div className="wb-run-row">
          <span className="wb-run-row__target">{verb} {target}</span>
          <Button variant="primary" leftIcon={<Icon name="play" size={14} />} processing={busy} onClick={run}>
            {busy ? 'Pressing…' : verb}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default Inspector;
