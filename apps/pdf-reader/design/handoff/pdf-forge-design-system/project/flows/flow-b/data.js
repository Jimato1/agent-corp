// pdf-forge flow B — sample data (plain global). → window.PFB_DATA
(function () {
  const ISO = 210 / 297;   // 0.707 portrait
  const LAND = 297 / 210;  // 1.414 landscape
  const pages = [];
  for (let i = 1; i <= 24; i++) {
    pages.push({ id: 'pg' + i, page: i, aspect: i === 9 ? LAND : ISO, rotation: 0 });
  }
  window.PFB_DATA = {
    doc: { name: 'quarterly-report.pdf', pages: 24, bytes: 7340032, human: '7.0 MB' },
    pages,
    jobId: '3c7e1a9b5d2f4e6080a1b2c3d4e5f607',
    jobShort: '3c7e…f607',
    result: { filename: 'quarterly-report-organized.pdf', bytes: 6815744, human: '6.5 MB', bytesExact: '6,815,744' },
    editLog: [
      { k: 'delete', text: 'Deleted page 12' },
      { k: 'rotate', text: 'Rotated page 4 · 90°' },
      { k: 'move', text: 'Moved page 7 → 3' },
      { k: 'delete', text: 'Deleted page 18' },
    ],
    // helper: clone the page list, apply per-id state overrides
    build(overrides) {
      overrides = overrides || {};
      return pages.map((p) => Object.assign({ selected: false, focused: false, lifted: false, deleted: false, ghost: false, rotation: p.rotation }, p, overrides[p.id] || {}));
    },
  };
})();
