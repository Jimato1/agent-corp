import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Gateway (the hands) operator console — Vite + React. The built SPA is copied
// into the backend image at frontend/dist; in dev the console API is proxied to
// the Gateway backend (internal port 8080). Unlike CMDB the Gateway HAS one SSE
// surface — the RunConsole audit-store tail at `/api/runs/{id}/events` — which
// is served over the same `/api` proxy (SSE needs no special dev config here).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/healthz': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
