# Board — the coordination spine. Two-stage: build the Vite SPA, then run the Node service.
# DEPLOYMENT §2: internal port 8080, `edge` network only, no host ports, volume board_data.
# Build context is the repo root (so the web stage can vendor the Helm handoff):
#   docker build -f apps/board/Dockerfile -t board .

# ---- web build ----
FROM node:22 AS web
WORKDIR /web
COPY apps/board/web/package.json ./
RUN npm install --no-audit --no-fund
COPY apps/board/web/ ./
# The vendored Helm assets under web/public/helm are COMMITTED, so `vite build` works without the
# repo-root handoff dir (vendor-helm.mjs warns and proceeds with the committed copies).
RUN npm run build

# ---- server ----
FROM node:22 AS server
ENV NODE_ENV=production
WORKDIR /app
COPY apps/board/server/package.json ./
# node:22 carries python3 + a toolchain, so better-sqlite3 compiles natively (no extra apt).
RUN npm install --omit=dev --no-audit --no-fund
COPY apps/board/server/ ./
COPY --from=web /web/dist /app/web-dist
ENV BOARD_STATIC_DIR=/app/web-dist
ENV BOARD_DB_PATH=/data/board.db
ENV BOARD_BACKUP_DIR=/data/backups
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
