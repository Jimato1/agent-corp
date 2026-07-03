// pdf-forge workbench — sample document data (plain global; not transpiled).
(function () {
  // A loaded multi-page PDF. Mostly ISO portrait; page 6 is a landscape scan.
  const ISO = 210 / 297;       // ≈0.707
  const LAND = 297 / 210;      // ≈1.414
  const pages = [];
  for (let i = 1; i <= 14; i++) {
    pages.push({ id: 'p' + i, page: i, aspect: i === 6 ? LAND : ISO, rotation: 0, deleted: false });
  }
  window.PF_DATA = {
    doc: { name: 'contract_final.pdf', pages: 14, size: '4.2 MB' },
    pages,
    // left-rail operations (the workbench's tools)
    ops: [
      { id: 'pages',    label: 'Pages',    icon: 'pages' },
      { id: 'merge',    label: 'Merge',    icon: 'merge' },
      { id: 'split',    label: 'Split',    icon: 'split' },
      { id: 'rotate',   label: 'Rotate',   icon: 'rotate' },
      { id: 'compress', label: 'Compress', icon: 'compress' },
      { id: 'export',   label: 'Export',   icon: 'export' },
    ],
  };
})();
