// pdf-forge flow A — sample data (plain global). → window.PFA_DATA
(function () {
  const ISO = 210 / 297, LAND = 297 / 210;
  function makePages(n, landAt) {
    const a = [];
    for (let i = 1; i <= n; i++) a.push({ id: 'ap' + i, page: i, aspect: (landAt && landAt.includes(i)) ? LAND : ISO, rotation: 0 });
    return a;
  }
  window.PFA_DATA = {
    doc: {
      name: 'quarterly-report-2026.pdf', pages: 14,
      size: '210 × 297 mm', sizeLand: '297 × 210 mm',
      bytes: '5,242,880', human: '5.0 MB', opened: 'local · not uploaded',
    },
    pages: makePages(14, [9]),        // one landscape page
    big: { name: 'book-scan-500.pdf', pages: 500, at: 248 },
    bigPages: makePages(30, []),      // a visible window of the 500-page doc
    build(pages, overrides) {
      overrides = overrides || {};
      return pages.map((p) => Object.assign({ selected: false, focused: false, loading: false, rotation: p.rotation }, p, overrides[p.id] || {}));
    },
  };
})();
