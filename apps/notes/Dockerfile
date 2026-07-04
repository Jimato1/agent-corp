# Notes — Stage-4 container. Multi-stage: build the web SPA, then run the API-first server that
# serves REST + MCP + the built SPA as siblings over one state (ARCH "two views, one state").
#
# Build context is apps/notes/ (see docker-compose.notes.yml `build.context`). DEPLOYMENT §2: the
# service listens on internal port 8080, joins `edge` only, publishes NO host ports.
#
# NOTE (better-sqlite3): the full `node:22` image is buildpack-deps-based and ships python3 + a C/C++
# toolchain, so the native module compiles in the server stage without extra apt packages.

# ---- stage 1: build the human surface (web/dist) ------------------------------------------------
FROM node:22 AS web
WORKDIR /web
# Vendored Helm + React UMD live under web/public/helm (committed by the web build); the prebuild
# vendor script is a no-op when they are already present, so this stage needs no repo-external files.
COPY web/package.json web/package-lock.json* ./
RUN npm ci || npm install
COPY web/ ./
RUN npm run build

# ---- stage 2: the server (REST + MCP + static SPA) ----------------------------------------------
FROM node:22 AS server
ENV NODE_ENV=production
WORKDIR /app

# Install server deps first (build better-sqlite3 against this image's toolchain), then copy source.
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY server/ ./

# The built SPA, served by src/api/static.js from NOTES_STATIC_DIR.
COPY --from=web /web/dist ./web-dist
ENV NOTES_STATIC_DIR=/app/web-dist

# DEPLOYMENT §5: the corpus + index live under the single `notes_data` volume mounted at /data.
# Pre-create it owned by the non-root runtime user so the fresh named volume inherits that ownership.
RUN mkdir -p /data/corpus /data/index && chown -R node:node /data

EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
