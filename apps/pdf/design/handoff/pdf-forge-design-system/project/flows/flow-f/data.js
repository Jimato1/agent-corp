// pdf-forge flow F — sample data (plain global). → window.PFF_DATA
(function () {
  const ISO = 210 / 297, LAND = 297 / 210;
  const pages = [];
  for (let i = 1; i <= 42; i++) pages.push({ id: 'fp' + i, page: i, aspect: i === 5 ? LAND : ISO, rotation: 0 });

  // extracted text (client pdf.js / server pdftotext) — original sample contract prose
  const text = [
    'MASTER SERVICES AGREEMENT',
    '',
    'This Master Services Agreement ("Agreement") is entered into as of',
    'January 3, 2026 (the "Effective Date") by and between Northwind Systems,',
    'Inc. ("Provider") and the counterparty identified on the signature page',
    '("Client").',
    '',
    '1. FEES AND INVOICING',
    '1.1  Provider shall deliver each invoice monthly, in arrears, for the',
    '     services performed during the preceding calendar month.',
    '1.2  Client shall pay each invoice within thirty (30) days of receipt.',
    '1.3  Any invoice not disputed in writing within ten (10) business days',
    '     is deemed accepted.',
    '1.4  Late payment on an undisputed invoice accrues interest at 1.5%',
    '     per month, or the maximum rate permitted by law, whichever is less.',
    '',
    '2. TERM AND TERMINATION',
    '2.1  This Agreement begins on the Effective Date and continues for an',
    '     initial term of twelve (12) months.',
    '2.2  Either party may terminate for material breach on thirty (30) days',
    '     written notice if the breach remains uncured.',
    '',
    '3. CONFIDENTIALITY',
    '3.1  Each party shall protect the other party\u2019s Confidential Information',
    '     using no less than reasonable care.',
  ];

  window.PFF_DATA = {
    doc: { name: 'contract-2026.pdf', pages: 42, bytes: 2384761, human: '2.4 MB', bytesExact: '2,384,761' },
    pages,
    text,
    find: { query: 'invoice', matches: 12 },
    scopeDefault: '1-end',
    scopeExample: '1-10,21-end',
    scopeFromSelection: '1-3,7',
    jobId: '7b3e1d9c5a8f42610c4d2e9a1f7b6c30',
    jobShort: '7b3e…6c30',
    result: { filename: 'contract-2026.txt', bytes: 41827, bytesExact: '41,827', media: 'text/plain' },
    build(overrides) {
      overrides = overrides || {};
      return pages.map((p) => Object.assign({ selected: false, focused: false, rotation: p.rotation }, p, overrides[p.id] || {}));
    },
  };
})();
