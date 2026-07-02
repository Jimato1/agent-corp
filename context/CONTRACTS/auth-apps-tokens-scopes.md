# CONTRACT — auth → every app: RS/token validation baseline + the scope→tool map countersign index

> **Status: FROZEN by reference** (MERGE-RESEARCH-1, 2026-07-02). auth is BUILT — the authority is `platform/auth/planning/PLAN.md` (cited by section below; consume verbatim, never paraphrase a parallel contract). This doc (a) pins which PLAN sections bind every app, (b) tracks the per-app **countersign** each Stage-2 owes, (c) records the numbers apps will otherwise hard-code divergently.

## 1. Binding on every RS (all 11 components) — PLAN §4, §5.1, §5.6, §6, §8.6-Rule-3

- Validate locally against auth's JWKS; reject any `kid` not in the currently-served JWKS (poll ≤30s + on signature failure — this is the Redis-independent kill channel); verify `iss` (RFC 9207) and `aud == self` (exactly one resource, no wildcard); enforce coarse scope; verify DPoP/`cnf` where bound.
- Publish RFC 9728 protected-resource metadata; on 401 return `WWW-Authenticate: Bearer resource_metadata=…` so a fresh agent bootstraps (401 → discover → mint audience-bound token → retry).
- Error semantics verbatim from PLAN §5.6 (401 re-mint; 403 `insufficient_scope`+hint vs 403 PDP-deny machine-reason never-retry; 409 `in_progress`; 429 budget; 503 fail-closed).
- Run the shared per-tool-call **budget middleware** (PLAN §6): four dimensions keyed by `sub` in the one shared Redis + a Redis-independent in-process concurrency ceiling; Redis-down = benign allow-but-locally-bounded, sod/destructive 503 fail-closed.
- Subscribe to `auth:revocations` with snapshot resync; past the staleness bound, fail destructive paths closed. Never authorize off any advisory/forwarded header; derive principal only from the validated token / verified `X-Auth-Identity` signature.
- Deliver at Stage-2: the per-app **risk manifest + action-class manifest** (read / write-benign / propose / sod-critical / destructive-exec per tool). Unclassified ⇒ live-check fail-closed.

## 2. Numbers every app inherits (never re-derive) — PLAN §4.2, §7

Agent token TTL **2 min** (band 1–5, per-audience overridable); human 5 min; revocation SLO p99 <500 ms / <1 s suite-wide; JWKS poll ≤30 s; live-check timeout ~250 ms; drift bound **D = 1 s**; clock skew ≤60 s; no refresh tokens for agents; destructive-exec concurrency "very low (often 1)".

## 3. The scope→tool map (PLAN §3.3/§5.5) — countersign ledger

The map is auth's **offered half**; it binds an app only when that app's Stage-2 consumes and countersigns its slice. Status after this merge:

| App | Slice status |
|---|---|
| board | Offered (`board:read/claim/propose/update/approve/run-ceremony`); Board research consistent; countersign at Board Stage-2 (incl. `ceremony_transition` granularity decision) |
| cmdb | Offered (`cmdb:read-policy`, `cmdb:write-policy` HOLDER); CMDB research consistent (incl. the SSD "no agent ever mintable write-policy" guarantee + principal-class defense-in-depth); countersign at CMDB Stage-2 |
| vault | Offered (`vault:reference` agent-reachable; `vault:read-credential` = svc:gateway-only HOLDER; `vault:manage` disjoint operator); Vault research consistent — but needs auth to pin the **claim shape** carrying the holder scope (blocking Vault Stage-2, see MERGE_REVIEW_1 §gates) |
| gateway | Offered (`gateway:execute` HOLDER held by executor agents; svc:gateway holds reads + vault:read-credential, explicitly NOT gateway:execute); Gateway research consistent; countersign at Gateway Stage-2 |
| notes | Offered (`notes:read/search/write`); Notes research proposed a 4th split (`notes:append` distinct from destructive `update_note`) — **recommended to adopt** (append-bias is a safety property); reconcile at Notes Stage-2 |
| chat | Offered (`chat:post`); Chat research proposes `chat:notify:write`/`chat:broadcast:write`/`chat:feed:read` (operator-only read/broadcast) — naming reconciles at Chat Stage-2; agents never get read/broadcast |
| drive | Offered (`drive:read/write`); countersign at Drive Stage-2 (+ delete-tool scope if exposed) |
| mc | Offered (`mc:report/escalate/kill-switch/admin`); MC research consistent (kill-switch = operator-only Tier-2) |
| pdf | Offered (`pdf:render`); countersign at pdf Stage-2 |
| **library** | **MISSING — defect.** PLAN §3.2's taxonomy predates the Library. auth's next session adds the `library` audience + scopes (query vs propose-ingestion vs curation-team tools; curation personas scoped; `team` label lands in the auth schema). Recorded as reconciliation item R7 in MERGE_REVIEW_1. |
| agent-runtime | No RS scopes (it hosts agents); its seam is key-provisioning/token-minting — PLAN §3.6/§4.5/§5.4 + runtime RESEARCH §4.8 (C7/C8) freeze jointly at runtime Stage-2 (enrollment payload, TPM2_Certify attestation, EK allow-list ownership, rotation/revocation handshake) |

## 4. SoD constants (PLAN, settled #5/#6 — restated because every app cites them)

Holder conflict-set is immutable/compiled-in; TPM-sealed non-exportable keys mandatory for any principal whose closure contains a holder/destructive scope; holder-scope keys never provisioned on a host running executor-agent code; RFC 8693 token exchange off by default and never emits holder scopes.

## 5. Deployment naming conflict — flagged, not resolved here

PLAN §3.2's audience segment for mission-control is **`mc`**; DEPLOYMENT.md §1 requires subdomain == audience == compose name and §2 names the service **`mission-control`**. Chat's research also assumed `mc.<SUITE_DOMAIN>`. One must yield — operator decision D-3 in MERGE_REVIEW_1 (recommendation: rename the unbuilt MC service/subdomain to `mc`; amend DEPLOYMENT §2).
