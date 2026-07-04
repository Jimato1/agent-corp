# CONTRACT — agent-runtime → auth: key-provisioning (C7) + token-binding (C8)

> **Status: FROZEN (runtime side), 2026-07-04 — awaiting auth countersign.** Producer of the enrollment/rotation/revocation client: **agent-runtime**. Counterparty/authority: **auth**. Reconciles runtime RESEARCH §4.8 (seams C7/C8) with auth settled decisions **#6** (TPM-sealed non-exportable keys for any principal holding `gateway:execute`) / **#7** (DPoP-first, mTLS fallback) and auth open Q3 (key lifecycle). `auth-apps-tokens-scopes.md` §3 names this the runtime's ONLY auth seam ("No RS scopes; it hosts agents"). Per the seam rule (ARCHITECTURE §13), this doc — not either app's prose — binds both sides; **the agent-runtime Stage-4 client is built against exactly this, and hardens only when auth countersigns.**

## 0. The invariant that decides every field

**The private key is born in the TPM and NEVER transits the wire; only public material / attestation / CSR crosses to auth.** The runtime holds **identity** key material only — never host credentials, no approval or execution authority. A fully-compromised runtime can propose anything and still cannot mint a `gateway:execute`-capable token for a principal whose attestation auth has not independently verified.

## 1. Enrollment payload (runtime → auth), C7

One-time, at provisioning (operator-owned), per agent principal:

```
{
  "sub":            <auth-minted, opaque>,     # auth assigns the principal id; runtime never mints it
  "jwk":            <public JWK>,              # public half of the TPM-born signing key
  "attestation":    <TPM2_Certify statement>,  # signs {fixedTPM, fixedParent, public area} under an AK
  "ek_cert_chain":  [<EK cert>, ...],          # chains to the TPM vendor CA (auth's trust anchor)
  "csr":            <optional PKCS#10>          # present iff the mTLS/x5t#S256 fallback (C8) is used
}
```

- `sub` / `agent_id` is minted by **auth** (IDENTIFIERS.md) — the runtime receives and stores it verbatim.
- The key is generated in-TPM with `sensitivedataorigin | fixedtpm | fixedparent | sign`; `TPM2_Duplicate` refuses, so non-exportability is hardware-enforced, not a filesystem attribute.

## 2. Attestation verification is AUTH-SIDE (the authority), not runtime-side

**auth is the enforcement authority** for "no `gateway:execute` token without verified attestation":
- auth verifies the `attestation` + `ek_cert_chain` against its **EK allow-list** (ownership of the allow-list is auth's; the runtime never self-certifies).
- A principal whose closure contains `gateway:execute` (or any holder/destructive scope) is enrolled **only** if attestation verifies against an attested-node EK (auth #6). The runtime's own local refusal to enroll an executor persona on a non-attested node is **defense-in-depth**, NOT the authority — a compromised runtime that skips its own check still cannot obtain a holder-capable token, because auth refuses at mint.
- Non-executor personas may enroll on a soft key (no `gateway:execute` in closure).

## 3. Token minting + binding (C8)

- **DPoP-first (default):** Client-Credentials grant + a per-request DPoP proof JWT signed by the sealed key; auth binds the token to the JWK thumbprint (`cnf.jkt`). Short TTL (auth band **1–5 min, default 2 min**), audience-bound, **no refresh token**.
- **mTLS (verified fallback):** X.509 client-cert (key = the same `fixedTPM` key via PKCS#11); token bound to `cnf.x5t#S256`. Implies an internal CA signing the runtime's CSR (auth's own vs a separate service = operator/auth open decision).
- **`cnf` is REQUIRED on every holder-scope token** (auth §8, G5): a holder-scope token without a verifiable proof is INVALID — auth rejects, never downgrades.

## 4. Rotation / revocation handshake

- **Rotate** = fresh TPM key + re-enroll (§1). Cheap; no key transport. A rotation changes the JWK/`cnf.jkt`; the old key's tokens age out within one TTL.
- **Revoke** = auth account-disable (kills minting within one short TTL) **+** host de-attestation for compromise. Revocation is auth-owned; the runtime cannot self-revoke another principal.
- A **model swap** changes persona behavior but NOT identity/keys — it is a provenance event (`agent-runtime-library-inference.md` / IDENTIFIERS.md `model_id`), not a key event.

## 5. Degraded mode (auth outage) — binding on the runtime

Agent tokens are short-TTL with no refresh, so an auth blackout de-authorizes the fleet within one TTL. The **correct** runtime behavior is to be denied and quiesce (`QUIESCED_BY_OUTAGE`), NOT to find a workaround — there must be none; that is the SoD guarantee. Re-mint is wrapped in jittered backoff + a circuit breaker; on recovery the runtime reconciles `max(kill_epoch)` **before** resuming (`killswitch-chain.md` §2). See `platform/agent-runtime/planning/PLAN.md` §4.4.

## 6. Build-spike gates (measure, do not assume — RESEARCH §4.9)

Per-host TPM capability (container-reachable `/dev/tpmrm0`, `TPM2_Create` with the fixed attrs, chainable `TPM2_Certify`) defines the **executor-eligible node set**; TPM signing concurrency feeds gap-1.2 sizing; the attestation format is validated end-to-end with auth before this contract's `attestation` field is considered final. Until a real TPM is present the runtime's software path (SoftHSM2 PKCS#11) exercises the code but reports custody as **CANNOT CONFIRM** (never a fabricated green).

## 7. Change rule

Semantics change only by amending this doc with **both** agent-runtime and auth sessions citing it. New fields are additive. **auth owes the countersign** (EK allow-list ownership confirmation, accepted attestation format, CSR-vs-JWK default, rotation/revocation endpoint shapes) at its next session.
