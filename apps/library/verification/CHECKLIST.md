# Verification — Library (Stage-4 Build conformance)

> **Scope: Stage-4 Build.** This checklist verifies the Stage-4 exit criteria (PROCESS.md)
> and the load-bearing safety properties, **proven by construction and by the running
> test suite**, with fresh-clone commands. Stages 5 (security hardening), 6 (optimization),
> and 7 (full verification incl. the backup-restore drill) are subsequent artifacts.

Risk class: **Standard** (with the §12 untrusted-content ingestion surface as the
primary Stage-5 threat). Build is API-first: Core service/API → MCP surface → UI, all
over ONE shared state.

---

## A. Fresh-clone commands (copy-paste)

```bash
# from a fresh clone of the monorepo, on branch stage4/library-build
cd apps/library

# 1) Run the full test suite (stdlib unittest — NO third-party package required).
#    49 tests: admission gate, auto-admit-disabled (incl. input_ref binding), index-
#    rebuildable, retrieval/version filter (+ MCP target_version), RS authz + human-kind
#    gate, MCP schema/no-admin-tool, SSRF, chunker, ids.
PYTHONPATH=src python -m unittest discover -s src/library/tests -v

# 2) One-shot migrate: init the git-backed corpus + ops.db + index.db, build the index.
PYTHONPATH=src LIBRARY_DATA_DIR=/tmp/libdata python -m library.migrate

# 3) Boot the service and hit the public liveness + RFC 9728 metadata.
PYTHONPATH=src LIBRARY_DATA_DIR=/tmp/libdata LIBRARY_ALLOW_DEBUG_PRINCIPAL=1 \
  python -m library.server &
curl -fsS localhost:8080/healthz
curl -fsS localhost:8080/.well-known/oauth-protected-resource

# 4) Rebuildable-index proof (destroy index.db, rebuild from the markdown corpus, and
#    confirm the chunk manifest is byte-identical):
PYTHONPATH=src python -m unittest library.tests.test_index_rebuildable -v

# 5) Admission-gate + auto-admit-disabled proofs (the crown jewels):
PYTHONPATH=src python -m unittest library.tests.test_admission_gate library.tests.test_auto_admit_disabled -v
```

Container path (mirrors auth):

```bash
# test image (Dockerfile `test` target): runs the suite in-image
docker compose -f apps/library/docker-compose.yml --profile test run --rm \
  library-test python -m unittest discover -s /app/src/library/tests -v

# boot (edge network must exist — created by the root/proxy compose)
docker compose -f apps/library/docker-compose.yml up -d --build
```

---

## B. Stage-4 exit criteria (PROCESS.md) — mapping

| Exit criterion | Where / evidence |
|---|---|
| App runs in its own container behind the proxy | `Dockerfile` (non-root, port 8080) + `docker-compose.yml` (edge only) |
| Authenticates via the auth gateway | `authz/rs.py` + `authz/jwks.py`: local JWKS validation, `aud==library`, RFC 9728 401 bootstrap, X-Auth-Identity verify, budget middleware; `test_rs_authz.py` green |
| **Both surfaces exercise the SAME state** | `service.LibraryService` is the one shared state; `api/core_api.py` + `mcp/surface.py` are thin adapters; `test_mcp_and_api.py` proves propose-via-MCP and read-via-API hit one store |
| Verified against `DEPLOYMENT.md` (not a restatement) | service name `library`, internal port **8080**, `edge` network only, volume `library_data`, env prefix `LIBRARY_*`, auth at `auth:8089`, `aud==library` — matched to DEPLOYMENT §2/§4 |
| MCP scoped authz (Standard) | `authz/scopes.py` countersigned slice; scope enforced on every tool; `library:admin` human-kind-gated with no MCP tool at all |

## C. The two load-bearing safety properties (verified)

- **Content-bound admission gate (`ingest/admission.py`).** No agreement count and no
  agent judgment reaches the trusted tier. Only a SERVICE-minted `gateway_delivered`
  entry (content-hash-bound + harness-attested + validated against the Gateway's own
  record, never copied from an agent claim) or an operator review admits. Proven by
  `test_admission_gate.py` (9 adversarial cases) + `test_auto_admit_disabled.py`.
- **Auto-admit lane code-path DISABLED pre-D7 go-live** (`config.auto_admit_enabled`
  default `False`). While disabled, `request_admission` NEVER auto-admits — proven by
  `test_lane_disabled_even_with_valid_gateway_evidence` (perfect Gateway evidence still
  routes to review). NO MCP path to `admitted` — `test_no_mcp_admin_tool_exists`.

## D. Invariant conformance (root CLAUDE.md / ARCHITECTURE)

| Invariant | Evidence |
|---|---|
| Markdown is the source of truth; index rebuildable | corpus markdown canonical; `test_index_rebuildable.py` (byte-identical manifest after destroy+rebuild) |
| Two views, one state | §B above |
| §12 untrusted content: propose-only, never trusted-tier, never auto-approve lane | `mcp/surface.py` (propose lands quarantine), `service.propose` (service fetches+hashes, `provenance_taint: curation-ingested` stamped), curation scopes are propose/write-benign only |
| SSRF guard on source fetching | `ingest/fetcher.py` https-only + resolve-then-connect public-IP pinning + size/MIME caps; `test_units.TestSSRF` |
| Corpus git remote mandatory (ARCH §10) | `migrate` warns loudly when unset; index-status surfaces a durability banner |
| Removals never lag (F3) | rejection/retire/supersede call `index.remove_doc` synchronously; `test_rejected_never_returned` |

## E. CANNOT-VERIFY-HERE / PENDING (honest)

- **CANNOT-VERIFY-HERE (no real containers in the sandbox):** the live auth JWKS
  asymmetric path (needs `cryptography` + real auth), the agent-runtime `embed()` facade,
  CMDB `resolve_host_facts`, and the Gateway `get_sandbox_evidence` read. All are behind
  injectable seams with deterministic doubles in tests; production activates them by env
  (`LIBRARY_EMBED_URL` / `LIBRARY_CMDB_URL` / `LIBRARY_GATEWAY_URL`) exactly like auth's
  SQLite-now / Postgres-later config swap.
- **PENDING-SIZING (gap-1.2):** embedding `dim` (default 1024) and re-embed throughput
  are config (`index_meta`), never constants.
- **PENDING (D-7 go-live):** the sandbox seam froze both halves 2026-07-03, so the
  auto-admit evidence-validation path is BUILT — but it stays gated OFF
  (`LIBRARY_AUTO_ADMIT_ENABLED=0`) until the operator flips it on at go-live.
- **Independent verification pass:** see §F (filled after the mandatory adversarial pass).

## F. Independent verification pass (mandatory adversarial review)

An independent sub-agent adversarially re-derived each safety claim from the code and
ran the suite. **Verdict: SHIP (Stage-4).** All five claims CONFIRMED:

1. Admission gate is content-bound + in-code (only a service-minted `gateway_delivered`
   entry or operator review admits; no agreement count; `agent_asserted` never gates;
   `gateway_delivered` written in exactly one place — `service._validate_via_gateway`;
   frontmatter-injection-via-body blocked by first-`---` split). ✔
2. Auto-admit lane built but truly gated OFF; no path fires it while disabled. ✔
3. propose cannot reach trusted tier or the auto-approve lane; no MCP admin tool;
   `library:admin` human-kind-gated even with the scope. ✔
4. Contracts match (embed / hostfacts / sandbox G6-G7 / IDENTIFIERS / auth scopes). ✔
5. UI reuses MC's ReviewQueue anatomy (distinct doc-keyed gate, deep-links out to MC),
   Helm components, read-only HaltBand, no ⛔, agent-asserted = printed absence. ✔

**Findings folded (all fixed/dispositioned; 49/49 tests green after):**

| # | Sev | Finding | Disposition |
|---|---|---|---|
| D1 | HIGH (latent, gated-off lane) | content-binding on the auto-admit lane was a service self-assertion — a valid passing `run_id` could be rebound to poisoned content | **FIXED** — `_validate_via_gateway` now REQUIRES the Gateway evidence's `input_ref` to be present AND bind to this doc's `doc_id`/`content_sha256` before minting `gateway_delivered`; `content_sha256` is recomputed on any body edit (`store.rewrite_quarantined_body`). Tests: `test_gateway_evidence_for_other_doc_does_not_admit`, `test_gateway_evidence_without_input_ref_does_not_admit`. D-7 go-live still tightens `input_ref` to a Gateway-confirmed content hash. |
| D2 | MED | MCP schema advertised `target_version` but dispatch read `target_major_version` → silently dropped → version filter disabled on the explicit-target MCP path | **FIXED** — `mcp/surface.py` + `api/core_api.py` map `target_version`→`major_version`. Test: `test_mcp_target_version_param_is_wired`. |
| D3 | LOW | model_id-swap was detect-only (no auto re-embed) vs the contract's "triggers a full re-embed" | **ACCEPT-WITH-REASON** — a full re-embed is a heavy job (tens of minutes at scale, RESEARCH §2); it is deliberately NOT auto-fired from the read path. The query path refuses to mix vector spaces (serves FTS-only) and now surfaces a loud ACTIONABLE "FULL RE-EMBED REQUIRED via /api/admin/reindex" flag; the nightly job / operator runs it. Vector correctness is never compromised. |

Non-blocking nit accepted: `tokens.css` `@import`s Google Fonts over the network (same
as auth's shipped UI) with declared system fallbacks.
