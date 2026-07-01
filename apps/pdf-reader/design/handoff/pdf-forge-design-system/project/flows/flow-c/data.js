// pdf-forge flow C — sample data (plain global). → window.PFC_DATA
(function () {
  window.PFC_DATA = {
    ops: [
      { id: 'merge', label: 'Merge', icon: 'combine' },
      { id: 'compress', label: 'Compress', icon: 'compress' },
      { id: 'encrypt', label: 'Encrypt', icon: 'lock' },
      { id: 'decrypt', label: 'Decrypt', icon: 'unlock' },
      { id: 'permissions', label: 'Permissions', icon: 'shield' },
      { id: 'linearize', label: 'Linearize', icon: 'align' },
      { id: 'repair', label: 'Repair', icon: 'wrench' },
      { id: 'image-to-pdf', label: 'Image → PDF', icon: 'image' },
      { id: 'sanitize', label: 'Sanitize', icon: 'eraser' },
    ],
    desc: {
      linearize: 'Restructures the PDF for fast web/streaming view (byte-serving).',
      repair: 'Rebuilds a damaged cross-reference table so the file opens again.',
      merge: 'Joins several PDFs into one, in the order you set below.',
    },
    inputs: {
      compress: { name: 'scan.pdf', human: '5.0 MB', bytes: '5,242,880' },
      linearize: { name: 'report.pdf', human: '12.4 MB', bytes: '13,002,342' },
      sanitize: { name: 'invoice-2026.pdf', human: '880 KB', bytes: '901,120' },
      repair: { name: 'damaged-archive.pdf', human: '3.1 MB', bytes: '3,250,585' },
    },
    jobId: '9f8c2a1b4d6e4710b2c3a4f5e6d70819',
    jobShort: '9f8c…0819',
    requestId: '3f1c9a0b8e7d4f62a1c5d9e2b4f60718',
    result: {
      compress: { filename: 'scan-compressed.pdf', human: '1.8 MB', bytes: '1,872,311', inHuman: '5.0 MB', delta: '−64%', kept: 'output' },
      compressKeptInput: { filename: 'scan.pdf', human: '5.0 MB', bytes: '5,242,880', kept: 'input' },
    },
    images: [
      { id: 'img1', name: 'page-01.png', human: '1.2 MB', aspect: 210 / 297 },
      { id: 'img2', name: 'page-02.jpg', human: '940 KB', aspect: 297 / 210 },
      { id: 'img3', name: 'page-03.tif', human: '2.8 MB', aspect: 210 / 297 },
    ],
    mergeFiles: [
      { id: 'f1', name: 'chapter-a.pdf', human: '8.2 MB', enc: false },
      { id: 'f2', name: 'chapter-b.pdf', human: '6.7 MB', enc: true },
    ],
  };
})();
