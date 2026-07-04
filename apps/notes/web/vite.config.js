import { defineConfig } from 'vite';

// PINNED build shape (BUILD_SPEC "WEB UI"): there is exactly ONE React in the page — the global
// UMD (`window.React`) that Helm's `_ds_bundle.js` also binds to. App JSX is compiled with esbuild's
// classic runtime (`React.createElement`) and every module gets `React` injected from a tiny shim
// that re-exports the global. App code MUST NOT `import 'react'` from npm (that would mint a second
// React and break hooks across the Helm/app boundary). Milkdown Crepe is framework-agnostic vanilla
// JS, so it bundles normally through Vite and mounts into a plain DOM ref.
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
    // Dev: the UI is served by Vite; the core REST API is the already-built server on :8080.
    // Two views, one state — the browser talks to the SAME endpoints the MCP adapter calls.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/healthz': { target: 'http://localhost:8080', changeOrigin: true },
      '/mcp': { target: 'http://localhost:8080', changeOrigin: true },
      '/.well-known': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
