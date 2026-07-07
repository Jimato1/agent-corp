import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted brand fonts (bundled by Vite; no CDN — the container is offline /
// CSP-strict). Three families, three fixed jobs: Inter (UI chrome), JetBrains
// Mono (machine truth), Source Serif 4 (the Workshop reading pane).
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-500.css';
import '@fontsource/source-serif-4/latin-600.css';

import './styles/styles.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
