import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CMDB (the policy brain) operator console — Vite + React. The built SPA is
// copied into the backend image at /app/static; in dev the console API is
// proxied to the CMDB backend (internal port 8080). CMDB has NO SSE surface —
// every list is pull (request/response), so no stream is proxied.
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
