# Drive — the artifact store (Standard). Filesystem CAS + SQLite (D-14). DEPLOYMENT §2:
# service `drive`, internal port 8080, edge network, NO host ports, volume drive_data at /data.
FROM node:22-bookworm-slim

# better-sqlite3 compiles a native addon; provide the toolchain (removed after install would need
# multi-stage — kept simple for a homelab image).
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps against the lockfile first (layer cache).
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# App source (runs via tsx — one runtime for API + MCP; no separate build artifact to drift).
COPY tsconfig.json ./
COPY src ./src
RUN npm install tsx@^4.19.2

ENV DRIVE_PORT=8080
ENV DRIVE_DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]

# Healthcheck hits the edge-internal liveness route (watermark + backup age + last-verify).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.DRIVE_PORT||8080) +'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--import", "tsx", "src/index.ts"]
