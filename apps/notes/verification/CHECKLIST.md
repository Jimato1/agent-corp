# Notes — Stage-4 Verification Checklist

Maps the **six corrections** and the **PROCESS.md Stage-4 / PLAN exit criteria** to a runnable command
or a code citation. Each line is marked:

- **PROVEN-BY-CONSTRUCTION** — verifiable offline right now (an automated test, a script, or a code
  citation where the property is structural, i.e. there is nothing to get wrong at runtime).
- **CANNOT-VERIFY-WITHOUT-LIVE-DEPS** — needs a real auth gateway, Board, git remote, or the built
  proxy stack; asserted here with the exact command to run once those exist.

Repo-relative paths throughout. Server dir: `apps/notes/server`.

---

## 0. Fresh-clone runnable commands

```sh
git clone <remote> agent-corp && cd agent-corp/apps/notes/server
npm ci                      # installs deps + compiles better-sqlite3
npm test                    # runs test/ under node --test  (see NOTE below)
#   NOTE: package.json's script is `node --test test/`. On Node >=23 pass the dir as a glob or use
#   auto-discovery instead — both run the same test files:
node --test                 #   auto-discovers test/**  (recommended; version-independent)
node --test "test/*.test.js"

# CORR-1 rebuild drill as a standalone script (needs a populated /data/corpus + built index):
node src/scripts/rebuild-drill.js     # exit 0 = index fully regenerated from files + git

# Container build (needs Docker + the vendored web assets committed under web/public/helm):
cd apps/notes && docker build -t agent-corp/notes:latest .
```

`npm test` runs **20 assertions across 9 test files**, all offline (temp corpus + temp SQLite +
fake Board + fake remote). Expected tail: `pass 20 / fail 0`.

---

## 1. The six corrections

### CORR-1 — Markdown is truth; SQLite/FTS5 is a REBUILDABLE index
- **PROVEN-BY-CONSTRUCTION.** `test/rebuild-drill.test.js` snapshots a battery (notes, taints,
  backlinks, searches, audit projection, fence floor) → `rm notes.db` → full reindex → asserts
  byte-identical. Structural backing: `src/index/db.js` (the DB is disposable; `truncateIndex` +
  `rebuildFts`), `src/index/reconcile.js#reconcileAll({full})`, `src/scripts/rebuild-drill.js`.
- Wikilinks + backlinks + FTS-as-a-tool (snippets, never bodies): `src/index/search.js` returns
  `snippet(...)` only; `test/taint.test.js` + `test/rebuild-drill.test.js` exercise backlinks.

### CORR-2 — Frontmatter display-only firewall (frontmatter is NOT a Board trigger)
- **PROVEN-BY-CONSTRUCTION.** `test/frontmatter-firewall.test.js`: a note written with `display_phase`
  has `ceremony_phase_display` in the FILE but it is absent from the read response, the index row,
  search results, and the taint object; `PRAGMA table_info(note)` confirms **no display columns
  exist to read back**. Structural backing: `src/storage/frontmatter.js#readable()` (strips display
  fields), `src/index/db.js` schema (no `ceremony_phase_display` / `ticket_status_display` columns).

### CORR-3 — Spec ceremony vocabulary ONLY
- **PROVEN-BY-CONSTRUCTION.** `test/spec-phase.test.js`: the invented set
  (`drafting/cross-talk/converged/escalated`) → `VALIDATION`; each of the seven spec phases is
  accepted. Structural backing: `src/constants.js CEREMONY_PHASES`, `src/storage/templates.js`
  (deliberation sections == the seven phases), `src/service.js#appendNote` display_phase guard.

### CORR-4 — Git authorship bound to auth `sub` via commit trailers
- **PROVEN-BY-CONSTRUCTION.** `test/authorship-audit.test.js`: the commit carries `Sub: <sub>`; the
  audit projection joins on that sub; two different subs stay distinguishable despite sharing the
  constant author email. Structural backing: `src/git/repo.js` (`buildMessage` puts `Sub:` first;
  `readAuditTrailers` is the rebuild source), `src/index/reconcile.js#rebuildAudit`.

### CORR-5 — Configured git remote is BOOT-REQUIRED
- **PROVEN-BY-CONSTRUCTION (refuse-to-boot rule):** `test/boot-required.test.js` — unset
  `NOTES_GIT_REMOTE_URL` → `assertBootRequirements()` throws; set → passes. Code: `src/config.js`,
  called first in `src/index.js#bootstrap`.
- **CANNOT-VERIFY-WITHOUT-LIVE-DEPS (actual off-box push + lag alarm):** needs a reachable remote.
  Verify with a real `NOTES_GIT_REMOTE_URL`, then `GET /healthz` → `git.git_push_lag_seconds` drops
  to 0 after a write + debounce, `git.last_pushed_commit` advances. Code: `src/git/remote.js`.

### CORR-6 — Uncached fencing on ticket-bound writes, fail-closed + monotonic floor
- **PROVEN-BY-CONSTRUCTION.** `test/fencing.test.js`: matching token passes; missing →
  `FENCE_REQUIRED`; below floor → `STALE_FENCE`; Board throws → `FENCE_UNVERIFIABLE`; the monotonic
  floor rejects a replayed-lower token **even if the Board returns it**; and **two fenced writes =
  two live Board reads (no cache)**; non-ticket writes never touch the Board. Exemption:
  `test/scopes.test.js` proves `update_note` is UNFENCED even on a ticket-bound note. Code:
  `src/board/fencing.js` (no cache/TTL/memo), `src/service.js` (fences create/append/link; NOT update).
- **CANNOT-VERIFY-WITHOUT-LIVE-DEPS (real generation semantics):** the exact Board lease endpoint
  shape is `PROVISIONAL-ENDPOINT-SHAPE` (`src/board/client.js`), frozen jointly at the Board↔Notes
  contract. Tests bind the SEMANTICS via a fake Board; the wire shape needs a live Board.

---

## 2. Additional invariant coverage (Standard-class)

- **Scope enforcement on the REST surface** — PROVEN: `test/scopes.test.js` (create/append needs
  `notes:append`; `update_note` needs `notes:write`; read-only/append-only agents refused). Code:
  `src/auth/rs.js#requireScope`, `src/constants.js TOOL_SCOPES`.
- **Hygiene deny-scan without leaking the match** — PROVEN: `test/hygiene.test.js` (private-key block
  → `HYGIENE_REJECT`; the log line contains pattern class + salted hash but NEVER the matched content
  or the secret). Code: `src/storage/hygiene.js`, `src/logging.js#hygieneReject`.
- **Transitive raise-only taint** — PROVEN: `test/taint.test.js` (A→B(host) and X→Y→Z(host) both
  raise `effective` to `host_originated`; `tainted_via` reports only the actual raiser). Code:
  `src/storage/taint.js#effectiveTaint`, `src/index/repo.js#taint`.

---

## 3. PROCESS.md Stage-4 / PLAN exit criteria

Stage-4 exit (PROCESS.md): *"runs in its own container behind the proxy, authenticates via the auth
gateway, and both surfaces exercise the same state — verified against DEPLOYMENT.md."*

- **API-first: core → MCP → UI, all over one REST core** — PROVEN-BY-CONSTRUCTION (code citation):
  `src/api/http.js` is the one core; `src/mcp/server.js` + `src/mcp/tools.js` adapt it; the UI
  (`apps/notes/web`) fetches the same REST API; static SPA served by `src/api/static.js` mounted in
  `src/index.js` AFTER the API/MCP routes. `test/scopes.test.js` drives the real REST surface.
- **Two views, one state** — PROVEN-BY-CONSTRUCTION (code): both `buildApp` (REST/UI) and `mountMcp`
  receive the SAME `NotesService` instance in `src/index.js`; there is no UI-private store.
- **Runs in its own container** — CANNOT-VERIFY-WITHOUT-LIVE-DEPS: `cd apps/notes && docker build .`
  then `docker compose -f docker-compose.notes.yml up`. Multi-stage `Dockerfile` (build web → run
  server, non-root `node` user, `EXPOSE 8080`, `CMD node src/index.js`). Requires the web build's
  vendored Helm assets committed under `web/public/helm`.
- **Behind the proxy, no host ports, `edge` only, compose/DNS name `notes`, internal port 8080** —
  CANNOT-VERIFY-WITHOUT-LIVE-DEPS (matches DEPLOYMENT §1/§2/§5 by construction):
  `docker-compose.notes.yml` — service `notes`, `networks: [edge]` (external), no `ports:`, volume
  `notes_data:/data`. Verify attached: `docker compose ... config` + a proxy `GET https://notes.<domain>/healthz`.
- **Authenticates via the auth gateway at `auth:8089`, audience == `notes`** —
  CANNOT-VERIFY-WITHOUT-LIVE-DEPS: `src/auth/rs.js` validates JWTs against `NOTES_AUTH_JWKS_URL`
  (`http://auth:8089/.well-known/jwks.json`), `aud == notes` exactly. Verify with a real token:
  a valid `notes`-audience bearer → 200; wrong audience / missing scope → 401/403. The offline
  suite exercises the dev-unsafe principal path (`NOTES_DEV_UNSAFE_NO_AUTH=true`).
- **Canonical-store backup / restore drill** — Stage-7 item; the rebuild-drill (CORR-1) is the
  index-recovery half and is PROVEN now. Off-box remote restore is CANNOT-VERIFY-WITHOUT-LIVE-DEPS.

---

## 4. Summary

| Property | Status | Evidence |
|---|---|---|
| CORR-1 index rebuildable | PROVEN | `test/rebuild-drill.test.js`, `src/scripts/rebuild-drill.js` |
| CORR-2 frontmatter firewall | PROVEN | `test/frontmatter-firewall.test.js` |
| CORR-3 spec ceremony vocab | PROVEN | `test/spec-phase.test.js` |
| CORR-4 sub-trailer authorship | PROVEN | `test/authorship-audit.test.js` |
| CORR-5 remote boot-required (rule) | PROVEN | `test/boot-required.test.js` |
| CORR-5 live off-box push | LIVE-DEPS | real remote + `/healthz` |
| CORR-6 uncached fail-closed fencing | PROVEN | `test/fencing.test.js`, `test/scopes.test.js` |
| CORR-6 real Board wire shape | LIVE-DEPS | Board↔Notes contract freeze |
| Scope enforcement | PROVEN | `test/scopes.test.js` |
| Hygiene no-leak | PROVEN | `test/hygiene.test.js` |
| Transitive taint | PROVEN | `test/taint.test.js` |
| Container / proxy / auth wiring | LIVE-DEPS | `docker build`, compose, real auth+proxy |
