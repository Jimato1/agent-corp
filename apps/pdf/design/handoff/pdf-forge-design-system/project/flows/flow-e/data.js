// pdf-forge flow E — crypto flow data (plain global). → window.PFE_DATA
(function () {
  window.PFE_DATA = {
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
    input: { name: 'report.pdf', human: '4.82 MB', bytes: '4,823,104' },
    jobId: '7b3e91a04c2d4f8e9a16d5c0e2f47b83',
    jobShort: '7b3e…7b83',
    requestId: '3f1c9a0b8e7d4f62a1c5d9e2b4f60718',
    results: {
      encrypt: { filename: 'report-encrypted.pdf', human: '4.86 MB', bytes: '4,861,002', copy: 'Encrypted with AES-256. This file now needs its password to open.' },
      decrypt: { filename: 'report-unlocked.pdf', human: '4.79 MB', bytes: '4,802,880', copy: 'Unlocked — the password has been removed.' },
      permissions: { filename: 'report-permissions.pdf', human: '4.83 MB', bytes: '4,825,610', copy: 'Advisory permissions set. Conforming readers will honor them.' },
    },
    disclaimer: 'Permissions are advisory. They ask conforming readers to limit printing, copying, or editing — but an owner-password-only PDF still opens for anyone, and many tools ignore these flags. For real confidentiality, use Encrypt with a user password.',
  };
})();
