# Verification — Vault (Stage-4 BUILD record)

> **Scope:** this documents what the **Stage-4 build** produced and how it was verified **in-sandbox**, plus the
> **CANNOT-VERIFY-IN-SANDBOX** items that need real infrastructure (OpenBao seal/unseal, TPM, mTLS, a live
> Board, the WORM host). It is **not** the Stage-7 sign-off — the Critical-infra Stage-7 external-verification
> evidence + kill-switch demo + restore drill remain that stage's artifact. Branch: `stage4/vault-build`.

## 0. What was built (proven-by-construction, not run against real infra)

The Vault is the **thin wrapper over adopted OpenBao 2.5.x** (ratified D-14). It is NOT a secrets store — OpenBao
is (config-as-code in `openbao/`). The wrapper owns the SoD inversion.

| Surface | Where | Verified |
|---|---|---|
| Core service: release lifecycle + the §4 redeem pipeline + dual-sink hash-chained audit | `server/src/service/{releases,redeem,audit}.js` | 64 unit/contract tests pass |
| Two enforcement layers (wrapper + OpenBao's own JWT-auth ACL) | `server/src/{service/redeem.js, engine/openbao.js}` + `openbao/policies/*` + `openbao/bootstrap/bootstrap.sh` | independent verifier CONFIRMED |
| MCP agent surface — exactly 4 near-empty `vault:reference` tools | `server/src/mcp/*` | tests: no reveal/redeem tool registered |
| Operator UI (6 screens) to Helm shared components | `web/src/*` | `vite build` clean (15 modules) |
| creds mTLS listener (Gateway-only redeem) + edge listener (UI/MCP/manage) | `server/src/index.js`, `server/src/api/redeem.js` | boot smoke: both listeners up |
| Compose topology (vault + vault_openbao + vault_unsealer) | `docker-compose.vault.yml`, `Dockerfile`, `.env.example` | matches DEPLOYMENT §1/§2/§3a |

**Test result:** `cd server && npm test` → **64 pass / 0 fail**.

## 1. Independent verification pass (mandatory — a separate agent read the source)

All six load-bearing properties **CONFIRMED** (evidence cited to file:line in the review):

- **(a) Independent Board re-verification (D-4).** `redeem.js` step 9 re-reads the Board itself
  (`GET /facts/approval`), NEVER trusts a Gateway-asserted fact; predicate = `status=='consumed'` ∧
  `consumed_by==validated sub` ∧ ticket/host/plan match request **and** handle host ∧ M-2 class bind ∧ B-4
  freshness (W for first redeem; `ticket_status=='executing'` + execution host-lock for re-release). Board
  unreachable → **DENY (503)**.
- **(b) OpenBao ACL is a real second layer.** The engine op logs in with the **Gateway's own JWT** so OpenBao
  re-validates independently; the wrapper AppRole explicitly **denies** `kv/data/*` read, `ssh/sign/*`,
  `ssh/roles/*`. A wrapper bug alone cannot read plaintext.
- **(c) Every reject fails closed in code** — 20+ typed `RedeemError` paths, none returns 200; cheap local
  checks before introspect/Board (M-11); §8 live check re-runs at the D=1s drift bound before the engine op.
- **(d) Per-host `num_uses=1` child token (B-1)** — one child token, `child-kv-<host>` XOR `child-ssh-<host>`,
  host = D-4-verified `handle.host_id`, never token-carried; jti single-use on login; templates scope one host,
  no wildcards.
- **(e) D-16 fail-closed-on-audit** — attempt (step 10) and outcome (step 13) require a dual-sink ACK; <2 sinks
  ⇒ 503 and the engine is not called / the cert never leaves; `audit_local` append-only (triggers) + hash-chained;
  restore detector keeps `/redeem` closed when the WORM HEAD is unfetchable.
- **(f) UI matches Helm** — real `HelmDesignSystem_f4cb26` components; `PrintedAbsence` for the no-read-back
  constitutional absence (not a greyed control); `ConfirmFriction` full variant (typed-intent + step-up +
  diff-hash) for gate-weakening; `FreshnessStamp`/false-green seal state; `HaltBand readOnly`; no reveal
  affordance and no kill actuator anywhere.

**Defect folded:** the verifier found the denial audit was best-effort (`.catch(()=>{})`), contradicting frozen
contract §6 + PLAN §6.1 MI-5 Option A. **Fixed** (`redeem.js#denied` now throws `AUDIT_UNAVAILABLE` (503) when a
denial cannot be dual-sink-acked; the exfil escalation still fires first) + a regression test added. Re-run: 64/64.

**Accepted (informational, per spec):** jti-replay guard is in-process (the real bound is per-host `num_uses=1`
+ short TTL — note if multi-instance is ever deployed); release-staging audit is best-effort local-durable by
design (§6.1: "durable local queue + continuous WORM ship + gap alarm", not the fail-closed gate — staged
releases are powerless and re-derivable).

## 2. Spec conformance (PLAN → build)

- §2 two enforcement layers, engine on `data_vault` only, JWKS via proxy origin + pinned CA → `openbao/config/openbao.hcl`, `bootstrap.sh`, compose `data_vault internal:true`.
- §4 the ordered fail-closed pipeline (incl. M-11 reorder, MI-3 drift-before-engine, MI-4 re-release, M-2 class bind, B-4 freshness) → `service/redeem.js`.
- §5 four MCP tools + release lifecycle (M-12 preconditions, conflict-collapse, cold-start revoke) → `mcp/tools.js`, `service/releases.js`.
- §6 dual-sink fail-closed hash-chained audit + Option A denials + M-4 restore detector → `service/audit.js`, `index.js`.
- §7 seal chain / DR / break-glass → `openbao/config/unsealer.hcl`, `openbao/README.md`, UI Status/DR panel.
- §8 operator UI (write-only, no read-back, false-green discipline) → `web/src/*`.
- §9 scope slice (`vault:reference` / `vault:read-credential` svc:gateway-only / `vault:manage` operator-only) → `constants.js`, `auth/rs.js`, `api/http.js`.

## 3. Invariant conformance (root CLAUDE.md)

- **Segregation of duties** — Vault holds credentials only; it releases plaintext ONLY to the Gateway (mTLS creds
  channel + §8-pin `sub==svc:gateway` + independent D-4 Board re-verify + engine re-verify). Vault alone causes
  no action. **Agent token → redeem → 403, always** (tested in-code AND over the wire).
- **Two views, one state (deliberately inverted)** — MCP + UI are siblings over one wrapper store + engine; the
  agent surface is near-empty by construction (no plaintext path exists).
- **Done confirmed externally** — n/a to Vault directly; the redeem audit is the evidence the Gateway/Wazuh chain consumes.
- **Markdown-is-truth** — n/a (Vault owns no markdown corpus; OpenBao storage is the CANONICAL special-regime store, §7).

## 4. CANNOT-VERIFY-IN-SANDBOX (needs real infrastructure — operator commands)

These are **proven by construction**; the sandbox has no OpenBao/TPM/mTLS/Board/WORM host. Operator runs at Stage-7:

| Item | Why | Operator command / drill |
|---|---|---|
| OpenBao seal/unseal (Transit auto-unseal via `vault_unsealer` + 3-of-5 recovery) | needs real OpenBao 2.5.x + unsealer | `docker compose -f apps/vault/docker-compose.vault.yml up vault_unsealer vault_openbao` then `bao operator unseal` (unsealer Shamir 3-of-5) → confirm engine auto-unseals; see `openbao/README.md` |
| Bootstrap config-as-code applied to a live engine | needs live engine + short-lived generate-root token | `sh openbao/bootstrap/bootstrap.sh` against an initialized engine; then `bao policy read wrapper-approle` shows the kv/ssh **deny** stanzas |
| Engine listener edge-unreachable (build-failing invariant §2.2) | needs the real Docker networks | from an `edge`-only container: `nc -vz vault_openbao 8200` must be **connection-refused** (not a TLS handshake) |
| Redeem `num_uses=1` host-A-cannot-touch-host-B (Stage-5 invariant) | needs live engine + JWT round-trip | mint a redeem child token for host A, attempt `kv/data/hosts/B/*` read → **denied** |
| creds-hop mTLS + `cnf` x5t#S256 binding | needs the suite-internal CA + Gateway client cert | `curl --cert gateway.pem --key gateway.key https://<VAULT_REDEEM_BIND>/redeem …`; without the client cert the TLS handshake fails before step 0 |
| Live Board D-4 re-verify | needs a running Board serving `/facts/approval` | end-to-end: consume an approval at the Board, then redeem → 200; revoke it → redeem → 403 approval_mismatch |
| Fail-closed-on-audit against the real WORM host | needs the hardened log host | stop the WORM sink → a redemption returns **503 audit_unavailable** and the engine is not called |
| Kill-switch halts new issuance | needs auth kill epoch | raise auth to G1 → redeem returns **403 revoked** (terminal); confirm an already-issued cert dies only by TTL/KRL (honesty carve-out) |
| Restore drill + unsealer-restore leg + break-glass-with-Vault-sealed (§7.4/§7.5) | Stage-7 canonical-store drill | restore a raft snapshot → boot detects local≠WORM HEAD → mass-revokes pending + escalates; demonstrate host access with the Vault deliberately sealed (offline break-glass) |

## 5. Fresh-clone verify steps

```sh
# 1. server: install + unit/contract tests (64 pass)
cd apps/vault/server && npm install && npm test

# 2. web: install + build the operator SPA (vendored Helm is committed; no network needed)
cd ../web && npm install && npm run build     # -> dist/ produced

# 3. boot smoke (dev, no real infra — both listeners up, seal shows CANNOT-CONFIRM, agent->manage=403)
cd ../server
VAULT_DEV_UNSAFE_NO_AUTH=true VAULT_DB_PATH=$(mktemp -d)/v.db VAULT_REDEEM_BIND=127.0.0.1:18443 \
  VAULT_PORT=18080 NODE_ENV=development node src/index.js &
curl -s localhost:18080/healthz                                   # {"status":"ok",...}
curl -s -H 'x-dev-sub: op:ada' -H 'x-dev-kind: human' -H 'x-dev-scopes: vault:manage' \
  localhost:18080/manage/status | head -c 200                     # seal "unknown"/confirmable:false (no false-green)
curl -s -o /dev/null -w '%{http_code}\n' -H 'x-dev-sub: agent:x' -H 'x-dev-kind: agent' \
  -H 'x-dev-scopes: vault:manage' localhost:18080/manage/handles  # 403 (human-kind-gated)

# 4. containerized (needs the suite networks + operator-provisioned certs — see .env.example)
docker compose -f apps/vault/docker-compose.vault.yml up --build
```

## 6. Seams the GATEWAY consumes from this app (flagged per the Stage-4 obligation)

Frozen for Gateway Stage-2 countersign (PLAN §12); all served on the creds mTLS interface:

- **G-1** `POST /redeem` request/response schema + the reject matrix with the **code→retryability legend**
  (`constants.js REDEEM`: 401 re-mint; 403 terminal never-retry incl. `release_not_pending`/`engine_denied`;
  409 = `in_progress` only; 410 terminal; 429 budget; 503 fail-closed retry-later). Built: `api/redeem.js`, `service/redeem.js`.
- **G-2** SSH-CA semantics: ephemeral `ssh_public_key` in → cert out; `key_id=<ticket_id>`; server-derived
  non-empty `valid_principals`; TTL default 10m. Built: `engine/openbao.js`.
- **G-3** idempotent re-release (`same release_id + op_id + sub` ⇒ fresh cert / re-read while the live
  execution-hold authority holds, capped N=3). Built: `service/redeem.js` re-release path.
- **G-4** `POST /releases/revoke {ticket_id}` (pending-release revocation; honesty carve-out: issued certs =
  TTL/KRL). Built: `api/redeem.js`.
- **G-5** creds-hop mTLS: suite-internal offline CA, client certs both directions; the Gateway's cert doubles as
  the token `cnf` (`x5t#S256`). Built: `api/redeem.js channelFacts` + `index.js` TLS opts. **ASK still open:** auth
  confirms minting `svc:gateway` vault-audience tokens with mTLS-`cnf` (DPoP fallback seam present in `rs.js`).
- **G-6** redeem request carries `run_id` + `traceparent` for audit correlation. Built: schema + `service/audit.js`.
- **G-7** kill behavior: level ≥ G1 → terminal `403 revoked`; fail-closed outages → `503` retry-later with a hard
  cap. The Gateway's kill obedience derives from **its own** kill channel, NEVER inferred from Vault codes.

## 7. Open asks (blocked cross-app dependencies — do not resolve here)

- **auth:** register `svc:vault` (`board:read` + introspect floor) — needed for §4.3/§5.2 facts reads (Board PLAN §7 anticipated it). Confirm `cnf` method on vault-audience `svc:gateway` tokens (mTLS `x5t#S256` preferred). `svc:vault -> chat:post` for the §6.3 escalation (fallback = violations feed).
- **Board:** `board-consumers-facts-read.md` is FROZEN and carries the `ticket_status` field on `/facts/approval` (REVIEW_2 §S2) — consumed as built.
- **Gateway Stage-2:** countersign G-1…G-7 (its half of the frozen contract).
