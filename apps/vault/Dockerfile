# Vault — the thin wrapper over adopted OpenBao 2.5.x (D-14). Two-stage: build the Vite SPA, run the Node
# wrapper. DEPLOYMENT §2/§3a: internal port 8080; joins edge + creds + data_vault; volume vault_data.
# The OpenBao engine + unsealer are SEPARATE containers (openbao/ config-as-code), NOT built here.
# Build context is the repo root (so the web stage can vendor the Helm handoff):
#   docker build -f apps/vault/Dockerfile -t vault .

# ---- web build ----
FROM node:22 AS web
WORKDIR /web
COPY apps/vault/web/package.json ./
RUN npm install --no-audit --no-fund
COPY apps/vault/web/ ./
# Vendored Helm assets under web/public/helm are COMMITTED, so `vite build` works without the repo-root
# handoff dir (vendor-helm.mjs warns and proceeds with the committed copies).
RUN npm run build

# ---- server ----
FROM node:22 AS server
ENV NODE_ENV=production
WORKDIR /app
COPY apps/vault/server/package.json ./
# node:22 carries python3 + a toolchain, so better-sqlite3 compiles natively.
RUN npm install --omit=dev --no-audit --no-fund
COPY apps/vault/server/ ./
COPY --from=web /web/dist /app/web-dist
ENV VAULT_STATIC_DIR=/app/web-dist
ENV VAULT_DB_PATH=/data/vault.db
ENV VAULT_BACKUP_DIR=/data/backups
EXPOSE 8080
# The creds mTLS listener (VAULT_REDEEM_BIND) is bound to the `creds` interface at runtime; not published.
USER node
CMD ["node", "src/index.js"]
