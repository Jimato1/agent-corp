import { useCallback, useEffect, useRef } from 'react';
import { Button, Toast, ToastViewport } from '../components/ds';
import { Rail } from './Rail';
import { BoardHeader } from './BoardHeader';
import { Worksurface } from './Worksurface';
import { Inspector, type OpParams } from './Inspector';
import { Dropzone } from './Dropzone';
import { useDocumentStore } from '../state/documentStore';
import { useUiStore, type OpId } from '../state/uiStore';
import { useJobsStore } from '../state/jobsStore';
import { livePages } from '../page-model/pageModel';
import { exportAssemble } from '../lib/exportClient';
import { saveBlob } from '../lib/api';
import { withExtension } from '../lib/format';

/** Workbench — composes the three zones and owns interaction state. */
export function Workbench() {
  const doc = useDocumentStore();
  const ui = useUiStore();
  const jobs = useJobsStore();

  const pages = doc.history.present;
  const live = livePages(pages);
  const liveCount = live.length;
  const selected = ui.selected;
  const selectedCount = selected.size;
  const allSelected = liveCount > 0 && live.every((p) => selected.has(p.id));
  const someSelected = selectedCount > 0;
  const edits = doc.status === 'ready' ? doc.edits() : 0;

  const lastIdx = useRef(0);

  // ---- selection ----
  const selectAt = useCallback((index: number, shiftKey: boolean, metaKey: boolean) => {
    const list = doc.history.present;
    const target = list[index];
    if (!target || target.deleted) return;
    const next = new Set(selected);
    if (shiftKey) {
      const [a, b] = [lastIdx.current, index].sort((x, y) => x - y);
      for (let i = a; i <= b; i++) if (!list[i].deleted) next.add(list[i].id);
    } else if (metaKey) {
      if (next.has(target.id)) next.delete(target.id); else next.add(target.id);
    } else {
      if (next.size === 1 && next.has(target.id)) next.clear();
      else { next.clear(); next.add(target.id); }
    }
    ui.setSelected(next);
    lastIdx.current = index;
  }, [doc.history, selected, ui]);

  const selectPage = useCallback((id: string, e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
    const index = doc.history.present.findIndex((p) => p.id === id);
    if (index >= 0) selectAt(index, e.shiftKey, e.metaKey || e.ctrlKey);
  }, [doc.history, selectAt]);

  const toggleAll = useCallback(() => {
    ui.setSelected(allSelected ? new Set() : new Set(live.map((p) => p.id)));
  }, [allSelected, live, ui]);

  // ---- edits ----
  const rotateSel = useCallback(() => {
    const ids = someSelected ? selected : new Set(live.map((p) => p.id));
    doc.rotate(ids, 90);
  }, [doc, live, selected, someSelected]);

  const deleteSel = useCallback(() => {
    if (!someSelected) return;
    const n = selectedCount;
    doc.remove(selected);
    ui.clearSelection();
    ui.pushToast({
      status: 'neutral',
      title: `${n} page${n > 1 ? 's' : ''} deleted`,
      actionLabel: 'Undo',
      onAction: () => doc.undo(),
    });
  }, [doc, selected, selectedCount, someSelected, ui]);

  // ---- client export (Flow B) ----
  const exportingRef = useRef(false);
  const runExport = useCallback(async (filename?: string) => {
    if (doc.status !== 'ready' || !doc.bytes || exportingRef.current) return;
    exportingRef.current = true;
    jobs.reset();
    // Reflect progress via the press readout even for the client path.
    useJobsStore.setState({ phase: 'processing', detail: `${doc.name} · ${liveCount} pages` });
    try {
      const plan = live.map((p) => ({ sourceIndex: p.sourceIndex, rotation: p.rotation }));
      const bytes = await exportAssemble(doc.bytes, plan);
      const outName = withExtension(filename || doc.name || 'document', 'pdf');
      saveBlob(new Blob([bytes], { type: 'application/pdf' }), outName);
      useJobsStore.setState({ phase: 'success', detail: `${outName} · exported locally` });
      ui.pushToast({ status: 'ok', title: 'Export ready', message: `${outName} — saved locally` });
    } catch (err) {
      useJobsStore.setState({ phase: 'error', code: 'worker_failed', message: err instanceof Error ? err.message : 'Export failed' });
      ui.pushToast({ status: 'err', title: "Couldn't assemble this in the browser", message: 'Try the server path for large files.' });
    } finally {
      exportingRef.current = false;
    }
  }, [doc, jobs, live, liveCount, ui]);

  // ---- server ops (Flow C/E) ----
  const runServerOp = useCallback((op: OpId, params: OpParams) => {
    if (doc.status !== 'ready' || !doc.bytes) return;
    const file = new File([doc.bytes], doc.name || 'input.pdf', { type: 'application/pdf' });
    if (op === 'compress') {
      jobs.run({ op: 'compress', files: [file], options: params.compress, filename: doc.name, detail: `${doc.name} · ${liveCount} pages` });
    } else if (op === 'split') {
      const ranges = (params.split?.ranges ?? '').split(',').map((r) => r.trim()).filter(Boolean);
      jobs.run({ op: 'split', files: [file], options: { ...params.split, ranges }, filename: doc.name, detail: `${doc.name} · ${ranges.length} ranges` });
    } else if (op === 'merge') {
      jobs.run({ op: 'merge', files: [file], options: params.merge, filename: params.merge?.filename, detail: doc.name });
    }
  }, [doc, jobs, liveCount]);

  const onRun = useCallback((op: OpId, params: OpParams) => {
    if (op === 'pages' || op === 'export') {
      void runExport(params.export?.filename);
    } else if (op === 'rotate') {
      const ids = someSelected ? selected : new Set(live.map((p) => p.id));
      doc.rotate(ids, params.rotate?.degrees ?? 90);
    } else {
      // merge / split / compress — server ops (finalize path, D7)
      runServerOp(op, params);
    }
  }, [doc, live, selected, someSelected, runExport, runServerOp]);

  // ---- app-level keyboard shortcuts ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (doc.status !== 'ready') return;
      if (e.key === 'r' && someSelected) { e.preventDefault(); rotateSel(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && someSelected) { e.preventDefault(); deleteSel(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); void runExport(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); ui.setSelected(new Set(live.map((p) => p.id))); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc.status, someSelected, rotateSel, deleteSel, runExport, live, ui]);

  const isReady = doc.status === 'ready';

  return (
    <div className="wb-root">
      <Rail
        active={ui.activeOp}
        collapsed={ui.railCollapsed}
        onSelect={(op) => { ui.setActiveOp(op); jobs.reset(); }}
        onToggle={ui.toggleRail}
      />

      <main className="wb-main">
        {isReady ? (
          <>
            <BoardHeader
              docName={doc.name}
              sizeBytes={doc.size}
              liveCount={liveCount}
              selectedCount={selectedCount}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
              sheetSize={ui.sheetSize}
              onSheetSize={ui.setSheetSize}
              onRotate={rotateSel}
              onDelete={deleteSel}
              onExport={() => runExport()}
              exporting={jobs.phase === 'processing'}
              edits={edits}
              canUndo={doc.canUndo()}
              onUndo={doc.undo}
            />
            <Worksurface
              pages={pages}
              selected={selected}
              focusIndex={ui.focusIndex}
              sheetSize={ui.sheetSize}
              grid
              onSelectPage={(id, e) => selectPage(id, e)}
              onSelectByIndex={selectAt}
              onReorder={doc.reorder}
              onFocusIndex={ui.setFocusIndex}
            />
          </>
        ) : (
          <Dropzone
            onFile={(f) => doc.open(f)}
            error={doc.status === 'error' ? { message: doc.errorMessage, code: doc.errorCode } : null}
          />
        )}
      </main>

      <Inspector
        activeOp={ui.activeOp}
        liveCount={liveCount}
        selectedCount={selectedCount}
        mergeFiles={[doc.name || 'document.pdf'].filter(Boolean)}
        docName={doc.name}
        press={{ phase: jobs.phase, label: jobs.job?.result?.filename ?? undefined, detail: jobs.detail, code: jobs.code || undefined }}
        onRun={onRun}
        onDownload={() => void jobs.download()}
        onRetry={() => onRun(ui.activeOp, {})}
        onAddFiles={() => { /* multi-file merge tray — extends in the merge flow */ }}
      />

      <ToastViewport position="br">
        {ui.toasts.map((t) => (
          <Toast
            key={t.id}
            status={t.status}
            title={t.title}
            onDismiss={() => ui.dismissToast(t.id)}
            action={t.actionLabel ? <Button size="sm" variant="ghost" onClick={() => { t.onAction?.(); ui.dismissToast(t.id); }}>{t.actionLabel}</Button> : undefined}
          >
            {t.message}
          </Toast>
        ))}
      </ToastViewport>
    </div>
  );
}

export default Workbench;
