import { defineConfig } from 'vite';

// PINNED build shape (the suite "single-global-React" Helm pattern, matching apps/notes/web):
// there is exactly ONE React in the page — the global UMD (`window.React`) that Helm's
// `_ds_bundle.js` also binds to. App JSX is compiled with esbuild's classic runtime
// (`React.createElement`) and every module gets `React` injected from a tiny shim that re-exports
// the global. App code MUST NOT `import 'react'` from npm (that would mint a second React and break
// hooks across the Helm/app boundary). The built SPA is copied into the backend image at /app/static.
export default defineConfig({
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    jsxInject: "import React from '/src/react-global.js'",
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080', changeOrigin: true },
      '/mcp': { target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080', changeOrigin: true },
      '/healthz': { target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080', changeOrigin: true },
      '/.well-known': { target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
