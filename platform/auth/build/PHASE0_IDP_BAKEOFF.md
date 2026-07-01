# PHASE 0 — IdP Bake-off Spike (Build-gate G1–G10)

> **Blocking gate for Stage-4 BUILD of `auth`.** Evaluates the finalist **Keycloak ≥ 26.4**
> (fallback **Zitadel**) against the G1–G10 build-spike gates from `planning/PLAN.md` §10.3.
> **Rule (PLAN §10.3):** an *un-mitigable* NO-GO on **any of G1 / G3 / G4 / G9** rejects Keycloak
> and promotes Zitadel.
>
> **Environment honesty:** this sandbox has Python 3.12 only — **no Docker, no Keycloak boot,
> no TPM/HSM, no network to a live realm.** Therefore no gate can be closed by *running Keycloak*
> here. Each gate below is scored **GO-by-docs** (capability documented-present in current
> Keycloak ≥ 26.4 docs, cite included), **CANNOT-VERIFY-HERE** (needs a booted instance / hardware /
> the proxy — with the *exact operator command* to close it), or **NO-GO** (documented-absent with
> no mitigation). Web-verified against **current** docs (2026-06/07), not training memory.
>
> **Scope note:** several gates are only *partly* about Keycloak. Keycloak is the **AS + principal
> store only** (PLAN §10.1). The revocation freshness/fail-closed semantics (G4), SoD grant
> interposition (G7), forward-auth 200-contract + header scrub (G8), and non-exportable/origin-bound
> key attestation (G1/G5) are **enforced by `auth`'s own code**, which is built and unit-tested green
> in this same Stage-4 build. For those, "Keycloak-side" and "auth-side" verdicts are split.

---

## Verdict (headline)

**Keycloak provisional-CONFIRMED by docs — PENDING operator boot of gates
{G1(non-exportable/origin-bound portion), G2, G3, G4, G5, G6, G8, G9}.**
Every Keycloak-side capability each gate depends on is a **documented-present** feature in current
Keycloak ≥ 26.4 (DPoP GA 26.4; per-client JWKS `private_key_jwt`; per-client TTL override; RFC 7009
revoke + RFC 7662 introspect; mTLS HoK cert-bound tokens; protocol/audience mappers + client scopes;
Postgres + non-k8s clustering). The one genuine weakness — **no native RFC 8707** (G3) — is
**documented-absent but documented-mitigable** via the audience-mapper + client-scope + client-policy
workaround (still the state of the art in Keycloak 26.x per the community MCP guidance and the open
native-support issue), so it is **not an un-mitigable NO-GO** and does **not** promote Zitadel.
**Zitadel is NOT promoted.** No gate is a documented un-mitigable NO-GO.

The build proceeds against **Keycloak**. Contingent on the operator running the close-out commands
below on a real pinned `quay.io/keycloak/keycloak:26.4.x` + Postgres instance (plus a TPM/HSM host
for G1/G5). Until then those gates are honestly **CANNOT-VERIFY-HERE**, never faked green.

---

## Gate-by-gate table

Legend: **KC** = Keycloak-side capability · **auth** = enforced by `auth`'s own code (built/tested this stage).

### G1 — Per-agent asymmetric identity, per-client JWKS, rotation, **non-exportable + origin-bound mint**  *(promote-forcing)*

- **KC portion — GO-by-docs.** Keycloak supports **`private_key_jwt`** client authentication with a
  **per-client JWKS** — either a client-hosted **JWKS URL** Keycloak fetches, or JWKS set directly on
  the client; each client is a distinct keypair, **no shared secret**, so agent A's key cannot mint
  agent B's token (distinct `client_id`/JWKS). Per-client key **rotation** = register new `kid` in the
  client JWKS, retire old. Evidence: Keycloak *Client Authentication* / *JWT Authorization Grant* docs;
  issue #38357 (per-client JWKS for `private_key_jwt`).
- **Non-exportable (TPM/HSM) + origin-bound mint portion — CANNOT-VERIFY-HERE (auth-side + hardware).**
  Keycloak stores only the **public** JWK; whether the agent's *private* key is TPM/HSM non-exportable
  is a **client-host** property Keycloak cannot see or attest. `auth` enforces this as an
  **assignment-time invariant** (PLAN §3.6/§3.7): it refuses to activate a holder/destructive role on a
  principal whose `AgentKey` is not attested non-exportable, and binds mint to an expected origin
  (mTLS cert / TPM-attested DPoP key) + mint-anomaly auto-freeze. That refusal logic is pure-Python and
  **is unit-tested green in this build**; the *hardware attestation* and *off-host-mint rejection* need
  real TPM + a booted realm.
- **Verdict: GO-by-docs (KC) + CANNOT-VERIFY-HERE (non-exportable/origin-bound).** Not a NO-GO.
- **Operator close-out:**
  ```bash
  # per-client JWKS + no shared secret + rotation, on the pinned image:
  docker run --rm -p8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
    -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:26.4.4 start-dev
  # create two clients patcher-07 / patcher-08 with clientAuthenticatorType=client-jwt,
  # each with its OWN jwks (attributes.jwks.url or use.jwks.string), then:
  #   assert token minted with A's key is REJECTED when presented as B (aud/sub mismatch)
  #   rotate A: add new kid to A's JWKS, revoke old kid, assert old assertion now fails
  # non-exportable key (real TPM host):
  tpm2_create -C primary.ctx -G ecc256:ecdsa -a 'fixedtpm|fixedparent|sign' -u k.pub -r k.priv
  #   register k.pub as the client JWK; prove the private key CANNOT be exported (no -r readback);
  #   attempt an off-host mint with a copied blob -> auth mint-origin check must REFUSE.
  ```

### G2 — Per-client access-token lifespan ≤ 5 min, independent of realm default

- **KC — GO-by-docs.** Per-client **Access Token Lifespan** override lives in *Client → Advanced →
  Advanced Settings* (present since 4.8.1); overrides the realm default. Evidence: Keycloak client
  advanced-settings docs; RH build of Keycloak 26.4 client config.
- **Verdict: GO-by-docs; boot to confirm on pinned image = CANNOT-VERIFY-HERE.**
- **Operator close-out:**
  ```bash
  # set realm accessTokenLifespan=3600, client override=120s, mint, decode exp-iat:
  kcadm.sh update clients/$CID -s 'attributes."access.token.lifespan"=120'
  # assert (exp - iat) == 120 regardless of realm 3600.
  ```

### G3 — RFC 8707 audience restriction; **no token spans two holder audiences**  *(headline; promote-forcing)*

- **KC — NO native RFC 8707 (documented-absent) BUT documented-mitigable → GO-by-docs (mitigated).**
  Confirmed current: Keycloak does **not** honor the standard `resource` parameter; it uses its
  proprietary **audience** mechanism. The **workaround is real and documented**: **audience protocol-
  mappers + dedicated client scopes** (optionally **client policies** to constrain permitted resource
  values) inject exactly one `aud` per token, scoped so **holder audiences never overlap by
  construction** — a Board-scoped client scope maps only `aud=board`, a Gateway one only `aud=gateway`;
  no single client is granted both, so no client can mint a token whose `aud` spans Board+Gateway.
  Evidence: keycloak/keycloak issue #14355 + #41526 + discussion #35743 (native 8707 still *planned*,
  not shipped); PR #35711 (mapper-based approach); RH build of Keycloak 26.6 MCP-authz-server guide
  (recommends protocol-mapper aud injection as the interim). This matches PLAN §4.4/§10.2 exactly.
- **This IS the #1 operator boot gate.** "Non-overlapping by construction" and "one client cannot obtain
  a Board∪Gateway token" must be proven on a live realm; it is the single most load-bearing Keycloak
  contingency. But because the mapper path is documented-present, G3 is **not an un-mitigable NO-GO** →
  does **not** promote Zitadel.
- **Verdict: GO-by-docs (via mapper) + CANNOT-VERIFY-HERE (correctness on live realm).**
- **Operator close-out:**
  ```bash
  # give client 'patcher' ONLY the 'aud-board' client scope (hardcoded audience mapper -> aud=board).
  # 1) mint with scope=board -> assert aud==["board"] exactly, no 'gateway'.
  # 2) request scope="board gateway" -> assert token NEVER carries both holder auds
  #    (client not assigned aud-gateway scope => gateway silently dropped).
  # 3) present the aud=board token to a Gateway RS stub -> assert 401/403 (aud!=self).
  ```

### G4 — Revoke + introspect sub-second; read-your-writes mint under replica lag; introspect fail-closed on Redis loss  *(promote-forcing)*

- **KC — GO-by-docs.** RFC 7009 **`/protocol/openid-connect/revoke`** and RFC 7662
  **`/protocol/openid-connect/token/introspect`** are both implemented. Evidence: Keycloak
  *Specifications implemented* page; token-revocation PR #6704.
- **auth portion — CANNOT-VERIFY-HERE (semantics are auth-owned).** Sub-second suite-wide denial,
  **read-your-writes mint** under writer-failover/replica lag (finding 1d), and **introspect returning
  `active:false` (never `active:true` from signature alone) when its own Redis is unreachable** answering
  from the durable mirror (finding 2c) are **`auth`'s** denylist + durable-mirror behavior, not
  Keycloak's. That logic is pure-Python and **unit-tested green here**; the latency SLO + HA failover +
  durable-read load-test need a booted multi-replica stack + Redis + Postgres.
- **Verdict: GO-by-docs (KC endpoints) + CANNOT-VERIFY-HERE (latency/HA/fail-closed).** Not a NO-GO.
- **Operator close-out:**
  ```bash
  # revoke latency:
  time (kcadm ... revoke $TOK; curl -s .../introspect -d token=$TOK | jq .active)  # expect false, <1s
  # read-your-writes under lag (2 auth replicas, 1 primary + 1 read-replica w/ induced lag):
  #   disable agent on primary; immediately attempt mint on the lagging replica -> MUST refuse.
  # introspect fail-closed:
  #   docker network disconnect redis; introspect a REVOKED token -> MUST return active:false
  #   (served from durable SQLite/Postgres mirror), NOT active:true.
  ```

### G5 — Sender-constrained token (DPoP or mTLS); replay-without-key rejected; proof key in same non-exportable store

- **KC — GO-by-docs.** **DPoP is officially GA in Keycloak 26.4** (`cnf.jkt`; *Require DPoP bound
  tokens* switch under Capability config; now covers Admin/Account APIs). mTLS **Holder-of-Key /
  Certificate-Bound Access Tokens** (RFC 8705, `cnf.x5t#S256`) is a per-client Advanced-Settings toggle.
  Evidence: keycloak.org "Official Support for DPoP in Keycloak 26.4" (2025-10); HoK PR #5083 + client
  advanced-settings docs.
- **Proof-key-co-location + end-to-end replay portion — CANNOT-VERIFY-HERE.** Requires a booted realm,
  a real DPoP proof (asymmetric crypto — **CANNOT-VERIFY-HERE** in this stdlib sandbox; `auth` ships a
  pluggable Signer with an HMAC test-signer exercising all cnf/proof *logic* and an EdDSA signer that
  raises loudly if `cryptography` is absent), and TPM co-location of the proof key.
- **Verdict: GO-by-docs (KC) + CANNOT-VERIFY-HERE (crypto/hardware).** Not a NO-GO. Per PLAN §4.5/G5,
  for executor/destructive principals this is a **hard NO-GO gate at operator boot** (deferral allowed
  only for read-only/planner agents) — flagged as a mandatory operator close-out, not a build blocker
  for the pure-Python core.
- **Operator close-out:**
  ```bash
  # DPoP: mint with a DPoP proof -> assert cnf.jkt present; replay token WITHOUT proof -> 401.
  # replay with proof signed by a DIFFERENT key -> 401 (jkt mismatch).
  # co-location: prove the DPoP proof key and client-assertion key share ONE tpm2 handle
  #   (both fixedtpm|fixedparent), non-exportable.
  ```

### G6 — Custom budget claims (`max_concurrency`, `cooldown_class`) in the minted machine token

- **KC — GO-by-docs.** Keycloak **protocol mappers** (hardcoded-claim / attribute mappers) add arbitrary
  custom claims to access tokens, including client-credential/machine tokens via the client's dedicated
  scope. Evidence: Keycloak protocol-mapper docs (mapper types incl. *Hardcoded claim*).
- **Verdict: GO-by-docs; boot to confirm claim lands on a client-credentials token = CANNOT-VERIFY-HERE.**
- **Operator close-out:**
  ```bash
  # add hardcoded-claim mappers max_concurrency=4, cooldown_class="patch" to patcher's client scope;
  # client_credentials mint -> assert both claims present in the decoded at+jwt.
  ```

### G7 — `auth` rejects approve⊕execute grants; **NO alternative uninterposed grant path** (IdP-native + token-exchange)

- **auth portion — GO (built + unit-tested green THIS stage).** The §3.5 ConflictSet enforcement (five
  immutable holder ConflictPairs, full downward-transitive affected-set fan-out, Cedar `forbid` parity)
  is pure-Python `auth` code; its grant-time rejection + Cedar/Python parity are exercised by
  `python -m unittest` in this build (not Keycloak-dependent).
- **KC portion — GO-by-docs.** (a) Keycloak native admin role/client-scope assignment for holder scopes
  is **locked down** operationally (restrict service-account admin creds; don't expose those mutations) —
  a deployment config, documented via Keycloak admin/authorization docs. (b) **RFC 8693 token exchange
  ships OFF by default** (a feature flag / preview in Keycloak); PLAN keeps it OFF. Both are
  CANNOT-VERIFY-HERE on a live realm but are documented-controllable.
- **Verdict: GO (auth) + GO-by-docs / CANNOT-VERIFY-HERE (KC lockdown on live realm).** Not a NO-GO.
- **Operator close-out:**
  ```bash
  # confirm token-exchange feature is NOT enabled:
  #   /admin/serverinfo | jq '.features[]|select(.name=="token-exchange")'  -> disabled
  # attempt to assign a holder scope directly via admin REST with a restricted svc account -> 403.
  # if exchange ever enabled: exchange a benign token -> assert it can NEVER emit a holder scope/aud.
  ```

### G8 — Caddy/Traefik forward-auth: offline JWKS on benign path; **client identity header unconditionally stripped**; **only exactly-200 = allow**

- **KC — GO-by-docs.** Keycloak publishes a **JWKS** endpoint for offline benign-path validation.
- **Proxy — GO-by-docs, with a load-bearing finding.** Caddy **`forward_auth`** and Traefik
  **`forwardAuth`** are both documented; on success they **copy response headers** (`copy_headers` /
  `authResponseHeaders`) onto the upstream request and forward. **CRITICAL confirmed-by-docs fact:**
  **both proxies grant access on ANY `2xx`, not exactly 200** ("If the upstream responds with a 2xx
  status code, then access is granted" — Caddy; "If the service answers with a 2XX code, access is
  granted" — Traefik). This directly **validates the PLAN/proxy contract** that `auth`'s `/api/verify`
  must return **only exactly 200** on the allow path — a stray `204`/`206` would be silently treated as
  ALLOW by the proxy while carrying **no** signed `X-Auth-Identity`, producing an unauthenticated-but-
  allowed request. `auth`'s verify endpoint therefore emits exactly `200` for allow and never any other
  2xx; this invariant is unit-tested in the verify build + the joint `proxy/test/regression_headers.sh`.
  The **unconditional client-identity-header scrub** is the proxy's job (proxy strips inbound
  `X-Auth-Identity`/`Remote-*`); `auth` independently **never trusts** any inbound identity header and
  reads identity ONLY from `Authorization` + `Cookie`.
- **Verdict: GO-by-docs (KC + proxy capability) + CANNOT-VERIFY-HERE (live proxy wiring).** Not a NO-GO.
  Pin versions: Caddy ≥ 2.11.2, Traefik ≥ v2.11.43 / v3.6.14 (PLAN §8.9 CVE pins).
- **Operator close-out:** run `platform/proxy/test/regression_headers.sh` against both Caddy and Traefik:
  ```bash
  # benign bearer -> 200, offline JWKS validate, X-Auth-Identity minted & copied.
  # spoofed inbound X-Auth-Identity on an UNauthenticated request -> proxy strips it; verify 401/302.
  # confirm allow path is EXACTLY 200 (assert a 204 from verify would NOT carry identity).
  ```

### G9 — IdP + Postgres in the homelab envelope; HA target + break-glass  *(promote-forcing)*

- **KC — GO-by-docs (with the known footprint caveat).** Keycloak runs on **Postgres** (prod DB; the
  `dev-file` default is dev-only — spike/prod use `KC_DB=postgres`, PLAN §10 finalist note) and supports
  **multi-node HA clustering via Infinispan without mandatory Kubernetes** (bare `start` on 2 nodes +
  shared Postgres; k8s/Operator is *optional*, not required). Keycloak's homelab **footprint is its
  weakest axis** (JVM; scored 2/5 vs Zitadel 4/5) but is **documented-operable** on a homelab node with
  Postgres — not "requires mandatory k8s," so it does not hit the NO-GO condition. Break-glass is
  `auth`-owned (offline factor, PLAN §7.7), documented.
- **Verdict: GO-by-docs + CANNOT-VERIFY-HERE (actual resource envelope on operator hardware).** Not a
  NO-GO. This is the **second-most-likely promote trigger** (footprint/HA) — flag for operator measure.
- **Operator close-out:**
  ```bash
  KC_DB=postgres # 2-node compose + Postgres; measure RSS/CPU under agent fan-out:
  docker stats keycloak-1 keycloak-2 postgres
  # assert steady-state fits the homelab envelope; kill node-1 -> node-2 serves (HA);
  # exercise offline break-glass STOP + RESTORE runbook.
  ```

### G10 — Offline JWKS on benign; live uncached introspection/denylist on destructive

- **KC — GO-by-docs.** JWKS (offline benign validation) **and** RFC 7662 introspect (live destructive
  check) both present; the **separation** of benign-offline vs destructive-live is `auth`/RS-app logic
  (PLAN §4.7 decision table), which is built + unit-tested here (the `at+jwt` claim/aud/exp/revocation
  logic runs green via the HMAC test-signer).
- **Verdict: GO-by-docs (KC primitives) + GO (auth separation logic tested here).** Not a NO-GO.
- **Operator close-out:**
  ```bash
  # benign read -> RS validates via cached JWKS, ZERO calls to auth (tcpdump/introspect-count == 0).
  # gateway:execute -> RS makes an uncached /introspect call every time (count == N calls).
  ```

---

## Promote-forcing summary (G1 / G3 / G4 / G9)

| Gate | Documented NO-GO? | Mitigation documented? | Promotes Zitadel? |
|---|---|---|---|
| **G1** | No (per-client JWKS present) | non-exportable = auth-enforced + TPM (operator) | **No** |
| **G3** | No — native 8707 absent **but** mapper workaround documented-present | audience mapper + client scope + client policy | **No** |
| **G4** | No (revoke+introspect present) | fail-closed/RYW = auth-enforced (tested here) | **No** |
| **G9** | No (Postgres + non-k8s HA documented) | footprint weak but operable; measure on HW | **No** |

**No un-mitigable NO-GO on G1/G3/G4/G9 by current docs ⇒ Zitadel NOT promoted; Keycloak stands.**

---

## What is CANNOT-VERIFY-HERE (and why it is honest, not skipped)

Nothing that needs a booted Keycloak, Redis pub/sub cross-replica fan-out, a real proxy, TPM/HSM
hardware, or asymmetric crypto can be closed in this Python-3.12 sandbox. Each such item above carries
the **exact operator/CI command** to close it. The **auth-owned** logic those gates also depend on
(§3.5 SoD enforcement, denylist/durable-mirror fail-closed semantics, the exactly-200 verify contract,
claim/aud/exp/revocation token logic via the HMAC test-signer) **is** built and run green with
`python -m unittest` in this same Stage-4 build — those are not deferred.

## Sources

- Keycloak — Official Support for DPoP in Keycloak 26.4: https://www.keycloak.org/2025/10/dpop-support-26-4
- Keycloak 26.4.0 released: https://www.keycloak.org/2025/09/keycloak-2640-released
- Keycloak — Specifications implemented (RFC 7009 revoke, RFC 7662 introspect, RFC 9449 DPoP, RFC 8705 mTLS): https://www.keycloak.org/securing-apps/specifications
- Keycloak — JWT Authorization Grant / private_key_jwt: https://www.keycloak.org/securing-apps/jwt-authorization-grant
- Keycloak issue #38357 — per-client JWKS for private_key_jwt: https://github.com/keycloak/keycloak/issues/38357
- Keycloak issue #14355 — Resource Indicators (RFC 8707) (still open/planned): https://github.com/keycloak/keycloak/issues/14355
- Keycloak issue #41526 — MCP token audience binding by RFC 8707 resource param: https://github.com/keycloak/keycloak/issues/41526
- Keycloak discussion #35743 — Support for RFC 8707 Resource Indicators: https://github.com/keycloak/keycloak/discussions/35743
- Keycloak PR #35711 — mapper-based RFC 8707 approach: https://github.com/keycloak/keycloak/pull/35711
- RH build of Keycloak 26.6 — Integrating with MCP (audience/aud via protocol mappers): https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/26.6/html/securing_applications_and_services_guide/
- Keycloak PR #5083 — mTLS Holder-of-Key / Certificate-Bound Access Tokens: https://github.com/keycloak/keycloak/pull/5083
- Keycloak issue #17914 — per-client Access Token Lifespan (Advanced Settings): https://github.com/keycloak/keycloak/issues/17914
- Caddy — forward_auth directive (2xx = access granted; copy_headers): https://caddyserver.com/docs/caddyfile/directives/forward_auth
- Traefik — ForwardAuth middleware (2XX = access granted; authResponseHeaders): https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/
- RH build of Keycloak 26.4 Release Notes: https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/26.4/html-single/release_notes/index
