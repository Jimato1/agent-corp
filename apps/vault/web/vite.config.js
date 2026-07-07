import { defineConfig } from 'vite';

// PINNED build shape: exactly ONE React in the page — the global UMD (window.React) that Helm's
// _ds_bundle.js also binds to. App JSX compiles with esbuild's classic runtime and every module gets
// React injected from a shim re-exporting the global. App code MUST NOT `import 'react'` from npm.
export default defineConfig({
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    jsxInject: "import React from '/src/react-global.js'",
  },
  server: {
    port: 5175,
    strictPort: false,
    // Dev: Vite serves the UI; the core API is the already-built vault server on :8080.
    // No SSE — every /manage read is polled and carries its own `as-of` freshness stamp.
    proxy: {
      '/manage': { target: 'http://localhost:8080', changeOrigin: true },
      '/healthz': { target: 'http://localhost:8080', changeOrigin: true },
      '/.well-known': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
