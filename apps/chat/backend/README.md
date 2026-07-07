# chat — backend (the doorbell)

Thin bespoke notification service (ratified **D-14**): agent→operator notifications
and escalations + a soft operator→fleet broadcast, over one **canonical SQLite**
feed. ntfy is an outbound push **sink only**. FastAPI + uvicorn (matches
`apps/pdf`); the built React SPA is served static from `/`.

> **Doorbell, not the door.** Chat surfaces review/escalation state and deep-links to
> MC's canonical queue; it never hosts a queue, clears a gate, or actuates a stop.
> When a notification and the live target disagree, **the target wins**.

## Layout

```
app/
  main.py            FastAPI factory; SPA mount; lifespan (outbox + JWKS poll + nightly backup)
  config.py          Settings (CHAT_-prefixed; SUITE_DOMAIN + AUTH_VERIFY_PORT by name)
  db.py              canonical SQLite (WAL, append-only), schema DDL (PLAN §1)
  ids.py             N-<ULID> notification_id (SSE cursor) + B-<ULID> broadcast_id
  authn/             JWKS keyring + JWS validation (no 3rd-party JWT lib) + principal/scope gates
  security/          render-time sanitizer (XSS-safe by construction) + ingest secret-pattern reject
  services/          repo (op_id idempotency + dedup) · deep_links (FROZEN MC scheme) · feed (SSE)
                     · ntfy (sink only) · outbox (at-least-once) · ratelimit · backup · health
  api/               /api notifications · feed (SSE) · broadcasts · health/session
  mcp/               ONE write-only tool: post_notification
  tests/             46 tests (pytest) — all offline via an HS256 test signer
```

## The two surfaces over one state

| Surface | Path | Auth | Capability |
|---|---|---|---|
| MCP (agents) | `POST /mcp/tools/post_notification` | Bearer `chat:post` | **post only** — no read/ack/broadcast tool exists |
| UI API (operator) | `/api/*` | `X-Auth-Identity` (or token) `chat:read`/`chat:manage` | feed, history, SSE, ack, broadcast |

Agents structurally cannot read or broadcast: they never hold `chat:read`/`chat:manage`,
and the RS additionally bars agent/service kinds from those endpoints (defense in depth).

## Run the tests (offline, no auth/network needed)

```bash
cd apps/chat/backend
python -m venv .venv && . .venv/Scripts/activate      # or bin/activate on POSIX
pip install -r requirements-dev.txt
python -m pytest app/tests -o addopts="" -q            # 46 passed
```

## Run locally

```bash
pip install -r requirements.txt
CHAT_DB_PATH=./data/chat.sqlite3 CHAT_NTFY_ENABLED=false \
  uvicorn app.main:app --host 0.0.0.0 --port 8080
# GET /healthz → {"status":"ok"}
```

In production the container is reached only via the proxy over the `edge` network
(no host ports); auth resolves at `auth:8089`; the SPA is served at `/`.
