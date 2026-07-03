import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// pdf-forge frontend — Vite + React. The built SPA is copied into the
// backend image at /app/static; in dev the API is proxied to the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Everything under /api goes to the FastAPI backend during dev.
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
});
