/*
 * api/static.js — serve the built operator SPA (web/dist) as a sibling of REST+MCP over one state.
 * No-op when VAULT_STATIC_DIR is unset (dev serves the UI via Vite; tests never mount it).
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export function mountStatic(app) {
  const dir = config.staticDir;
  if (!dir || !fs.existsSync(dir)) return;
  app.use(express.static(dir));
  app.get(/^\/(?!manage|mcp|healthz|\.well-known).*/, (req, res) => {
    res.sendFile(path.join(dir, 'index.html'));
  });
}
