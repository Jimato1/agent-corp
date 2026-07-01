// Workbench — composes the three zones and owns interaction state. → window.Workbench
(function () {
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const { ToastViewport, Toast, Button } = NS;
  const { useState, useRef, useEffect, useCallback } = React;

  function Workbench() {
    const DATA = window.PF_DATA;
    const [activeOp, setActiveOp] = useState('pages');
    const [collapsed, setCollapsed] = useState(false);
    const [pages, setPages] = useState(DATA.pages.map((p) => ({ ...p })));
    const [selected, setSelected] = useState(() => new Set());
    const [focusIndex, setFocusIndex] = useState(0);
    const [size, setSize] = useState('comfortable');
    const [job, setJob] = useState({ state: 'idle', detail: '', code: '' });
    const [toasts, setToasts] = useState([]);
    const lastIdx = useRef(0);
    const jobTimer = useRef(null);

    const live = pages.filter((p) => !p.deleted);
    const liveCount = live.length;
    const selectedCount = selected.size;
    const allSelected = liveCount > 0 && live.every((p) => selected.has(p.id));
    const someSelected = selectedCount > 0;

    const pushToast = useCallback((t) => {
      const id = 'to' + Date.now() + Math.random().toString(36).slice(2, 5);
      setToasts((cur) => [...cur, { id, ...t }]);
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4200);
    }, []);

    const selectPage = useCallback((id, e) => {
      const idx = pages.findIndex((p) => p.id === id);
      setSelected((cur) => {
        const next = new Set(cur);
        if (e && e.shiftKey && lastIdx.current != null) {
          const [a, b] = [lastIdx.current, idx].sort((x, y) => x - y);
          for (let i = a; i <= b; i++) if (!pages[i].deleted) next.add(pages[i].id);
        } else if (e && (e.metaKey || e.ctrlKey)) {
          next.has(id) ? next.delete(id) : next.add(id);
        } else {
          if (next.size === 1 && next.has(id)) next.clear();
          else { next.clear(); next.add(id); }
        }
        return next;
      });
      lastIdx.current = idx;
    }, [pages]);

    const toggleAll = useCallback(() => {
      setSelected(allSelected ? new Set() : new Set(live.map((p) => p.id)));
    }, [allSelected, live]);

    const rotateSel = useCallback(() => {
      setPages((cur) => cur.map((p) => selected.has(p.id) ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
    }, [selected]);

    const deleteSel = useCallback(() => {
      setPages((cur) => cur.map((p) => selected.has(p.id) ? { ...p, deleted: true } : p));
      const n = selected.size;
      setSelected(new Set());
      pushToast({ status: 'neutral', title: `${n} page${n > 1 ? 's' : ''} deleted`, action: <Button size="sm" variant="ghost">Undo</Button> });
    }, [selected, pushToast]);

    const reorder = useCallback((from, to) => {
      setPages((cur) => {
        const next = cur.slice();
        const [moved] = next.splice(from, 1);
        next.splice(from < to ? to - 1 : to, 0, moved);
        return next;
      });
    }, []);

    const runJob = useCallback(() => {
      clearTimeout(jobTimer.current);
      const target = selectedCount > 0 ? `${selectedCount} pages` : `${liveCount} pages`;
      setJob({ state: 'processing', detail: `contract_final.pdf · ${target}`, code: '' });
      jobTimer.current = setTimeout(() => {
        setJob({ state: 'success', detail: 'contract_final.pdf · 3.9 MB', code: '' });
        pushToast({ status: 'ok', title: 'Export ready', children: 'contract_final.pdf · 3.9 MB', action: <Button size="sm" variant="ghost">Open</Button> });
      }, 2300);
    }, [selectedCount, liveCount, pushToast]);

    // App-level keyboard shortcuts (keyboard-first instrument)
    useEffect(() => {
      function onKey(e) {
        const t = e.target;
        if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
        if (e.key === 'r' && someSelected) { e.preventDefault(); rotateSel(); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && someSelected) { e.preventDefault(); deleteSel(); }
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); runJob(); }
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelected(new Set(live.map((p) => p.id))); }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [someSelected, rotateSel, deleteSel, runJob, live]);

    useEffect(() => () => clearTimeout(jobTimer.current), []);

    const Rail = window.Rail, BoardHeader = window.BoardHeader, Worksurface = window.Worksurface, Inspector = window.Inspector;

    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', background: 'var(--sub-900)', color: 'var(--ink-900)' }}>
        <Rail ops={DATA.ops} active={activeOp} onSelect={(id) => { setActiveOp(id); setJob({ state: 'idle', detail: '', code: '' }); }}
          collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' }}>
          <BoardHeader doc={DATA.doc} liveCount={liveCount} selectedCount={selectedCount}
            allSelected={allSelected} someSelected={someSelected} onToggleAll={toggleAll}
            size={size} onSize={setSize} onRotate={rotateSel} onDelete={deleteSel}
            onRun={runJob} processing={job.state === 'processing'} />
          <Worksurface pages={pages} selected={selected} focusIndex={focusIndex} size={size} grid
            onSelectPage={selectPage} onReorder={reorder} onFocusIndex={setFocusIndex} />
        </main>

        <Inspector activeOp={activeOp} jobState={job.state} jobDetail={job.detail} jobCode={job.code}
          selectedCount={selectedCount} onRun={runJob} onReset={() => setJob({ state: 'idle', detail: '', code: '' })} />

        <ToastViewport position="br">
          {toasts.map((t) => (
            <Toast key={t.id} status={t.status} title={t.title} action={t.action} onDismiss={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}>
              {t.children}
            </Toast>
          ))}
        </ToastViewport>
      </div>
    );
  }
  window.Workbench = Workbench;
})();
