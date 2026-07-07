# CONTRACT — agent-runtime → auth: key-provisioning (C7) + token-binding (C8)

> **Status: COUNTERSIGNED (both sides), 2026-07-06.** Runtime side FROZEN 2026-07-04; **auth countersigned 2026-07-06 (auth COUNTERSIGN session #2)** — verdict + point-by-point reconciliation in `auth-apps-tokens-scopes.md` §12, with five ADDITIVE clarifications folded into §7 below (none blocking, none a semantics change). Producer of the enrollment/rotation/revocation client: **agent-runtime**. Counterparty/authority: **auth**. Reconciles runtime RESEARCH §4.8 (seams C7/C8) with auth settled decisions **#6** (TPM-sealed non-exportable keys for any principal holding a holder/destructive scope) / **#7** (DPoP-first, mTLS fallback). `auth-apps-tokens-scopes.md` §3 names this the runtime's ONLY auth seam ("No RS scopes; it hosts agents"). Per the seam rule (ARCHITECTURE §13), this doc — not either app's prose — binds both sides; **the agent-runtime Stage-4 client is built against exactly this, and now hardens as auth has countersigned** (the concrete `attestation` byte-format still finalizes at the G1 hardware spike — §6).

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

Semantics change only by amending this doc with **both** agent-runtime and auth sessions citing it. New fields are additive. ~~**auth owes the countersign** at its next session.~~ **DONE — auth countersigned 2026-07-06** (`auth-apps-tokens-scopes.md` §12).

### 7a. auth countersign disposition (2026-07-06) — the four items auth owed, answered

- **EK allow-list ownership → CONFIRMED auth's.** auth owns the EK allow-list and verifies `attestation` + `ek_cert_chain` against it at enroll/activate time; the runtime's own local refusal to enroll an executor on a non-attested node is **defense-in-depth only** (§2 stands verbatim).
- **Accepted attestation format → SHAPE accepted; BYTES finalize at G1.** The TPM2_Certify statement over `{fixedTPM, fixedParent, public area}` under an AK is the right shape; the concrete byte-format + EK-cert-chain validation are validated end-to-end with auth at the **G1 hardware spike** before `attestation` is "final" (§6 — mutually flagged; not a blocker to the countersign).
- **CSR-vs-JWK default → JWK/DPoP is the DEFAULT** (decision #7); the PKCS#10 `csr` / mTLS `x5t#S256` path is the **verified fallback** only. The mTLS internal-CA ("auth's own vs a separate service") stays an operator/auth sub-decision made at G5 — it does not gate this contract.
- **Rotation/revocation endpoint shapes → CONFIRMED**, with one clarification (below): rotate = fresh TPM key + re-enroll (§1); revoke = auth account-disable + host de-attestation; revocation is auth-owned, runtime cannot self-revoke another principal (matches auth PLAN §3.6).

### 7b. Five ADDITIVE clarifications (from auth §12 — additive, not semantics changes)

1. **`kid` on the enrollment RESPONSE.** §1 specs the request; auth assigns the JWK `kid` and the **enrollment response (auth→runtime) returns `kid` (+ confirms `sub`)** so the runtime signs proofs/tokens under the correct `kid`.
2. **Enrollment is a two-phase, operator-owned ceremony.** Because `sub` is auth-minted yet appears in the §1 request, ordering is: operator creates the principal in auth (auth mints `sub`) → hands `sub` to the runtime → runtime enrolls the TPM-born key against it. Neither side hard-codes a one-shot mint-and-enroll.
3. **Rotation is overlapping-validity, not a hard cut.** auth keeps the old `kid` valid (`rotating`) for ≥ max token TTL while the new `kid` is `active`; the runtime **must not hard-revoke/delete the old key at the instant of rotation** — it lets it lapse across auth's overlap window (refines §4's "age out within one TTL").
4. **mTLS-fallback internal-CA ownership stays open (G5)** and does not block the countersign (see 7a).
5. **Scope = runtime-hosted AGENT principals only.** Holder-key provisioning for **`svc:gateway`** (`vault:read-credential`) and **`svc:tier-approver`** (`board:approve`) — both `kind=service`, not runtime-hosted — is each host-service's own deployment concern under the SAME decision-#6 non-exportable-key + trust-domain-isolation invariant (auth PLAN §3.4/§3.6), NOT via this seam.
