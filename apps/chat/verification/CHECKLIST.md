# Verification — Chat (Stage-4 Build)

> Standard risk class. This records the Stage-4 build evidence — **proven by
> construction** (unit + contract tests, an independent multi-lens verification pass,
> and spec cross-checks), not a full live end-to-end run. The residual live checks are
> the explicit CANNOT-VERIFY list at the bottom, each with a fresh-clone command.
> The full invariant/external-verification drill is Stage 7.

Helm mode: **CODE the UI to Helm** (the shipped `helm-design-system` handoff is a
reference prototype, not an importable library — its `chat` ui_kit + component `.jsx`
sources were realized as a Vite/React/TS SPA, tokens copied verbatim).

## What was built

- **Backend** (`backend/app/`, FastAPI + uvicorn, matches `apps/pdf`): canonical
  SQLite feed (WAL, append-only), the unified envelope, op_id idempotency + dedup
  collapse, priority clamping, SSE feed (replay==live), one write-only MCP tool,
  hand-rolled JWKS RS validation + principal/scope gates, render-time sanitizer,
  ingest secret-pattern reject, per-sub rate limit + meta-notification, ntfy
  sink-only outbox (at-least-once + escalation re-push), nightly backup + size guard.
- **Frontend** (`frontend/`, Vite 6 / React 19 / TS 5.7, matches `apps/pdf`): the 4
  Helm chat screens (Feed / NoteDetail / Broadcast / Health) + `KindBadge`, 20
  realized Helm DS components, live SSE + history + offline-fixture fallback. `tsc -b`
  passes.
- **Container**: 3-stage Dockerfile (SPA build → py deps → non-root runtime), compose
  with the `chat` service + `chat_ntfy` sink sidecar on `edge`, `.env.example`.

## Automated evidence (runs offline; no auth/network needed)

```bash
cd apps/chat/backend && python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements-dev.txt
python -m pytest app/tests -o addopts="" -q            # → 49 passed
```

| Test file | Covers |
|---|---|
| `test_api_and_dedup.py` | post→list→get→ack; op_id idempotency; dedup collapse |
| `test_auth_scoping.py` | **agent cannot read / ack / broadcast (403); 401 no-cred; forged read scope still barred** |
| `test_mcp_surface.py` | exactly one write-only tool; no read tool; isError (not HTTP error) on business failure |
| `test_deep_links.py` | **FROZEN MC scheme consumed verbatim**; URL-encoded; free-form URL impossible |
| `test_sanitize_hygiene.py` | XSS-safe render; links→dead text; remote images stripped; secret-pattern reject |
| `test_ratelimit.py` | per-sub ceiling → 429 + one meta-notification; escalation headroom |
| `test_contract_conformance.py` | envelope shape; `N-`/`B-` ids; scope constants; priority bands; **agent_id stamped, not caller-supplied** |
| `test_feed_sse.py` | SSE auth gate; replay/cursor/reset logic; frame format |
| `test_security_fixes.py` | retired-kid drop (kill lever); PKCS#8 PEM reject; escalation nag survives N deliveries |

## Independent verification pass (6 parallel adversarial lenses)

A workflow of 6 independent sub-agents verified the build against the frozen specs.
Result: **5 PASS, 1 FAIL-then-fixed.**

| Lens | Verdict |
|---|---|
| MC URL scheme consumed from FROZEN contract (not invented) | **PASS** — cites `mc-chat-review-resolve.md §2`; templates match to the character |
| ntfy holds no identity/auth logic; body never pushed | **PASS** — publish() only formats+POSTs; outbox selects `title` never `body` |
| Agent surface write-only (coordination boundary) | **PASS** — one tool; kind-gate bars agents from read/manage even with a forged scope |
| Spec/contract conformance (IDENTIFIERS/DEPLOYMENT/auth §8) | **PASS** (with benign notes) |
| UI matches Helm chat ui_kit + safety grammar | **PASS** (fonts/tokens diverge only by design — self-hosted, offline) |
| Adversarial correctness/security sweep | **FAIL → all findings fixed (below)** |

### Findings folded (fixed + regression-tested)

1. **[major] Retired JWKS kid never dropped** (`authn/jwks.py`) — `refresh()` merged the
   new key set over the old, so a kid auth retired stayed valid forever, defeating the
   Redis-independent kill lever. **Fixed:** JWKS keys are now replaced wholesale
   (statically-injected test keys preserved). Test: `test_refresh_drops_a_retired_jwks_kid`.
2. **[major] Escalation nag silently died after N deliveries** (`services/outbox.py`) — the
   failure cap wrongly counted successful re-pushes, so an un-acked escalation went
   silent (~2.5h) without an ack, contradicting PLAN §11.2. **Fixed:** `attempts` resets
   to 0 on delivery, so the cap bounds only consecutive failures; the nag persists until
   ack. Test: `test_escalation_repush_nag_survives_many_deliveries`.
3. **[minor] PEM detector missed PKCS#8** (`security/hygiene.py`) — broadened to
   `-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----`. Test: `test_pkcs8_encrypted_private_key_is_rejected`.
4. **[minor] SSE cursor namespace** (`api/feed.py`) — broadcast/ack/reset frames could set
   a non-cursor `id:` and trigger a reset loop on reconnect. **Fixed:** only `notification`
   frames carry `id:`. Test updated in `test_feed_sse.py`.

### Findings accepted with reason (notes, not defects)

- **Inline blocking JWKS refresh on unknown kid** (`jwks.py`) — runs inside a sync FastAPI
  dependency, which FastAPI executes in a worker thread (off the event loop), rate-limited
  to ≤1/s + 2.5s timeout. Acceptable; the background poller keeps it warm.
- **`nbf` not checked** — auth mints no future-dated `nbf`; Chat holds no holder scope, so
  the §8 live-check/`cnf` steps legitimately do not apply (every tool is write-benign).
- **Deep-link `source_id` is agent-controlled** — but host+scheme+path are template-fixed
  and the destination is auth-gated + canonical ("target wins"); an agent can at worst point
  at a real-but-different MC/Board/Notes item, never an arbitrary origin. This is the
  designed doorbell behavior.
- **UI fonts/tokens diverge from the Helm source** — deliberate: Google-Fonts `@import`
  replaced by self-hosted `@fontsource` (offline / strict CSP); token files differ only by
  stripped authoring comments. Values identical.

## Spec conformance (cross-checked)

- **IDENTIFIERS.md** — `notification_id` = `N-`+ULID (the SSE cursor); `broadcast_id` =
  `B-`+ULID (app-internal, unregistered); foreign ids stored verbatim, never fabricated. ✓
- **auth §1/§8** — local JWKS validation: sig, `kid`-current, `alg` match + `alg≠none`,
  `typ==at+jwt`, `iss==` issuer, `aud==chat` single-valued, `exp`+60s skew; verbatim
  401/403/409/429/503 semantics. ✓
- **PLAN §5 scopes** — exactly `chat:post` / `chat:read` / `chat:manage`; agents get only
  post; countersign table honored. ✓
- **D-14** — thin bespoke service; own canonical SQLite; own SSE; one write-only MCP tool;
  ntfy sink-only, Chat its sole publisher, no second identity system. ✓
- **D-17 ceiling** — MCP tool schema is flat, scalar, enum-biased (source_ref = 3 scalars,
  tags = CSV); no nested objects. ✓
- **DEPLOYMENT §2/§4/§5** — service/DNS `chat`, internal port 8080, `edge` only, no host
  ports, auth at `auth:8089`, `CHAT_`-prefixed env + `SUITE_DOMAIN`/`AUTH_VERIFY_PORT` by
  name; `chat_ntfy` sidecar per §3a. ✓
- **ARCH §10** — Chat DB CANONICAL: nightly `VACUUM INTO`, retention guard, standalone
  restore-consistency rule stated (drill is a Stage-7 exit). ✓

## CANNOT-VERIFY without a live build/runtime (each with a command)

| Item | Why | Fresh-clone command |
|---|---|---|
| Docker image builds + boots | needs network (npm/pip pull) + Docker | `cd apps/chat && docker build -t chat:latest . && docker run --rm -e CHAT_NTFY_ENABLED=false -p 8080:8080 chat:latest` then `curl localhost:8080/healthz` |
| SPA bundles (`vite build`) | frontend agent verified `tsc -b`; bundling not run (no npm network) | `cd apps/chat/frontend && npm install && npm run build` (emits `dist/`) |
| Live SSE round-trip (replay + `Last-Event-ID` + reset) | TestClient can't drain an infinite stream | run backend, then `curl -N -H 'X-Auth-Identity: <op token>' localhost:8080/api/feed` while POSTing a notification |
| Real auth interop (EdDSA JWKS + `X-Auth-Identity` key distribution) | tested with an HS256 test signer; needs a live auth | bring up `auth` + `proxy`, hit `/api/notifications` as an agent token and as an operator session; confirm 401→discover→retry |
| ntfy device delivery (reference-mode APNs) | needs the `chat_ntfy` sidecar + a device | `docker compose up chat_ntfy`, create write/read tokens, post an escalation, confirm the push carries title+click and **no body** |
| Backup restore drill (Stage-7 exit) | canonical-store DR | `VACUUM INTO` a snapshot, restore into a fresh volume, confirm the feed replays and the standalone restore-consistency rule holds |

## Fresh-clone verify steps (fastest first)

```bash
# 1) Backend tests — the core proof (offline, ~2s)
cd apps/chat/backend
python -m venv .venv && . .venv/Scripts/activate     # POSIX: . .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest app/tests -o addopts="" -q          # → 49 passed

# 2) Frontend type-check + build
cd ../frontend
npm install
npm run build                                        # tsc -b && vite build → dist/

# 3) Container build + liveness
cd ..
docker build -t chat:latest .
docker run --rm -e CHAT_NTFY_ENABLED=false -p 8080:8080 chat:latest &
curl -fsS localhost:8080/healthz                     # {"status":"ok",...}

# 4) Full stack (proxy + auth + chat + chat_ntfy) — Stage-7 territory
docker compose up      # reached via the proxy on `edge`; auth at auth:8089
```
