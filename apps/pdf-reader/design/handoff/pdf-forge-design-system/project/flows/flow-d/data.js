// pdf-forge flow D — sample data (plain global). → window.PFD_DATA
(function () {
  const ISO = 210 / 297, LAND = 297 / 210;
  function makePages(n, landAt) {
    const a = [];
    for (let i = 1; i <= n; i++) a.push({ id: 'dp' + i, page: i, aspect: (landAt && landAt.includes(i)) ? LAND : ISO, rotation: 0 });
    return a;
  }
  const splitPages = makePages(30, [7]);   // book.pdf (shown truncated on the board)
  const ocrPages = makePages(24, [3, 4]);   // invoice-scan.pdf

  // three declared split ranges → colored bands
  const bands = [
    { range: '1-10', color: '#1FA2C4', ids: splitPages.slice(0, 10).map((p) => p.id) },
    { range: '11-20', color: '#4BAE7E', ids: splitPages.slice(10, 20).map((p) => p.id) },
    { range: '21-end', color: '#D6A53C', ids: splitPages.slice(20, 30).map((p) => p.id) },
  ];

  window.PFD_DATA = {
    docs: {
      split: { name: 'book.pdf', pages: 210, human: '9.4 MB' },
      ocr: { name: 'invoice-scan.pdf', pages: 210, bytes: 5242880, human: '5.0 MB' },
    },
    splitPages, ocrPages, bands,
    jobId: '9f8c2a1b4d6e4710b2c3a4f5e6d70819',
    jobShort: '9f8c…0819',
    options: {
      split: { mode: 'ranges', ranges: ['1-10', '11-20', '21-end'], n: 10 },
      rasterize: { pages: '1-end', dpi: 150, format: 'png' },
      ocr: { languages: ['eng', 'deu'], deskew: true, sidecar: true },
    },
    results: {
      ocr: {
        filename: 'invoice-scan-ocr.zip', human: '2.2 MB', bytes: 2310544,
        artifacts: [
          { index: 0, filename: 'invoice-scan-ocr.pdf', media: 'PDF', human: '2.0 MB', bytesExact: '2,096,331' },
          { index: 1, filename: 'invoice-scan.txt', media: 'TXT', human: '4.8 KB', bytesExact: '4,821' },
        ],
      },
      split: {
        filename: 'book-split.zip', human: '7.5 MB', bytes: 7884211,
        artifacts: [
          { index: 0, filename: 'book_1-10.pdf', media: 'PDF', human: '2.5 MB', bytesExact: '2,620,114' },
          { index: 1, filename: 'book_11-20.pdf', media: 'PDF', human: '2.4 MB', bytesExact: '2,511,880' },
          { index: 2, filename: 'book_21-end.pdf', media: 'PDF', human: '2.6 MB', bytesExact: '2,752,217' },
        ],
      },
      rasterize: {
        filename: 'book-pages.zip', human: '3.4 MB', bytes: 3612880,
        artifacts: [
          { index: 0, filename: 'page-001.png', media: 'PNG', human: '180 KB', bytesExact: '184,220' },
          { index: 1, filename: 'page-002.png', media: 'PNG', human: '172 KB', bytesExact: '176,544' },
          { index: 2, filename: 'page-003.png', media: 'PNG', human: '169 KB', bytesExact: '173,109' },
        ],
      },
    },
    build(pages, overrides) {
      overrides = overrides || {};
      return pages.map((p) => Object.assign({ selected: false, focused: false, rotation: p.rotation }, p, overrides[p.id] || {}));
    },
  };
})();
