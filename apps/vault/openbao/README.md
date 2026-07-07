# OpenBao engine — deployment + config-as-code (Vault app, Critical-infra)

Operator runbook for the `vault_openbao` engine and its `vault_unsealer` sidecar.
This directory is the **config-as-code** for the OpenBao barrier only; the thin
wrapper app (`../src`), MCP surface, and operator UI live elsewhere and are the
*only* surfaces anything else ever talks to.

- Engine: **OpenBao 2.5.x, pinned ≥ 2.5.5** — ratified **D-14** (never the 2.6.0
  beta; BUSL HashiCorp Vault is a license-encumbered break-glass fallback only).
- Networks: `vault_openbao` and `vault_unsealer` join **`data_vault` ONLY**
  (DEPLOYMENT §1/§3a). The engine's mTLS listener is **edge-unreachable** — a
  build-failing invariant (PLAN §2.2).
- Authoritative design: **`../planning/PLAN.md`** — this README implements §2,
  §2.1–§2.3, §3.1/§3.3, §6.4, **§7** (seal/DR). Cross-reference **PLAN §7** for the
  full seal chain, crown-jewels custody, backups, and restore-consistency rules.

---

## Files

| Path | What it is |
|---|---|
| `config/openbao.hcl` | main engine: integrated raft (single node), mTLS listener on `data_vault`, Transit auto-unseal stanza, `ui=false` |
| `config/unsealer.hcl` | minimal second OpenBao: file storage, own Shamir seal, TLS listener, Transit engine only |
| `policies/wrapper-approle.hcl` | wrapper's **metadata/write-only** engine identity (explicit DENY on kv read / ssh sign / ssh roles / wrapping) |
| `policies/redeem-login.hcl` | policy on the `gateway-redeemer` JWT role — mint **one** per-host child token, nothing else |
| `policies/child-token-kv.hcl.tmpl` | per-host child-token template — `read` on `kv/data/hosts/<HOST_ID>/*` only |
| `policies/child-token-ssh.hcl.tmpl` | per-host child-token template — `update` on `ssh/sign/gateway-<HOST_ID>` only |
| `policies/deny-all-nonredeem.hcl` | belt-and-suspenders total deny for any future non-redeem role |
| `bootstrap/bootstrap.sh` | idempotent config-as-code (mounts, jwt role, approle, audit devices) |
| `bootstrap/signrole.example.hcl` | EXAMPLE per-host SSH sign-role — applied ONLY via operator change-control |

---

## The two-layer enforcement model (why this engine config is load-bearing)

The "an agent never reaches plaintext / a compromised wrapper cannot read
credentials at rest" property is enforced **twice, in two different trust
domains** (PLAN §2.1):

1. **Layer 1 — the wrapper's `/redeem` pipeline** (`../src`): §8-pin token
   validation + independent D-4 Board-approval verification + fail-closed audit.
2. **Layer 2 — THIS engine's deny-by-default ACL + JWT auth method.** The engine
   independently re-validates the **Gateway's own JWT** against auth's JWKS
   before any credential path is readable. This directory *is* layer 2.

Layer 2 is only real if its authority is scoped **independently of the wrapper's
own checks**. That is what these files encode:

- The wrapper reads/signs using the **Gateway's** JWT (`auth/jwt/login`, role
  `gateway-redeemer`), **not** a wrapper-owned credential. The wrapper's standing
  AppRole (`wrapper-approle.hcl`) is metadata/write-only with explicit DENY on
  `kv/data/*` read, `ssh/sign/*`, `ssh/roles/*`, and `sys/wrapping/*`.
- The §8 pin forbids any host claim in the Gateway JWT, so engine host-scoping is
  unattainable from the token. The real layer-2 bound is a **per-host,
  `num_uses=1`, short-TTL child token** minted from the D-4-verified `host_id`
  (`child-token-*.hcl.tmpl` via the `redeem-child` token role). Host A's child
  token cannot read/sign for host B (Stage-5 invariant test).
- **Agents get no engine identity at all** — no role maps them; there is no token
  they can present. `deny-all-nonredeem.hcl` is the additional explicit floor.
- **`ssh/roles` is change-controlled, never wrapper-writable (B-2):** the sign
  call and the role that bounds its principals live in two trust domains, so a
  compromised wrapper cannot widen a sign-role before signing.

---

## Init order (cold start)

A full-host cold start requires an operator; unattended recovery covers only
container/engine restarts (PLAN §7.1). Order is **unsealer first, engine second**:

1. **Bring up `vault_unsealer`** and **Shamir-unseal it: 3-of-5** offline-escrowed
   shares (distinct envelopes from the engine recovery keys). One-time only, on
   first init: enable its Transit engine + the single `vault-unseal` key, and mint
   the engine's seal token — **orphan + periodic, encrypt/decrypt on that one key
   only** (M-7). That token is what `VAULT_TRANSIT_SEAL_TOKEN` carries. See the
   commented setup block in `config/unsealer.hcl`.
2. **Bring up `vault_openbao`.** With the unsealer reachable on `data_vault`, the
   engine **auto-unseals via Transit** (no operator step for the engine itself).
3. **First init only:** `bao operator init` produces the engine's **recovery keys
   — 3-of-5, escrowed offline** with separate holders. Recovery keys are
   *authorization* material, **not** unseal keys: they cannot unseal if the
   unsealer is gone (stated deliberately — PLAN §7.1).

## Applying bootstrap

`bootstrap/bootstrap.sh` is **idempotent** (check-before-create). Run it against a
freshly-initialized engine under a **short-lived `generate-root`/quorum-minted
token** (the initial root token is revoked at first boot — PLAN §2.3/§7.1). It
authenticates over mTLS with a suite-internal-CA client cert. Required env is
documented in the script header (`BAO_ADDR`, `BAO_TOKEN`, `BAO_CACERT`,
`BAO_CLIENT_CERT/KEY`, `VAULT_AUTH_ISSUER`, `VAULT_AUTH_JWKS_URL`,
`VAULT_SUITE_CA_PATH`, `VAULT_WORM_SINK_URL`). It:

- enables **kv-v2** (`kv/`), **ssh** CA engine (`ssh/`, `allow_empty_principals`
  defaults false — CVE-2024-7594), **jwt** auth (JWKS via the **proxy origin**
  with `jwks_ca_pem` pinned — plain-HTTP JWKS is refused, PLAN §2.2 M-9),
- creates the **`gateway-redeemer`** JWT role exactly per PLAN §2.1 / auth §8,
- enables **approle** for the wrapper + writes `wrapper-approle`,
- writes `redeem-login` + the `redeem-child` token role,
- enables **two audit devices of different types** — a `file` device on the
  private volume **and** a **mandatory** `socket` device to the off-box WORM host
  (**M-6:** the engine fail-closes on off-box-audit loss independent of the
  wrapper; the engine audit stream does not transit the wrapper, so WORM-host
  cross-correlation is the independent witness against a lying wrapper).

Gate-weakening edits (TTL raises, principal additions, audit-device changes) and
every `ssh/roles/gateway-<host_id>` write follow **ARCH §12 change control**:
operator step-up + a tamper-evident audit row (see `signrole.example.hcl`).
Config drift is a Stage-7 checklist item.

---

## Crown jewels (never on any agent-reachable surface — PLAN §7.2)

1. **SSH CA signing key** (non-exportable, inside the barrier) — compromise =
   fleet-wide; response = KRL push + CA rotation + re-trust runbook.
2. **The unseal path** — unsealer storage + its Shamir set + the seal-stanza
   Transit token.
3. **Recovery-key set** (engine, 3-of-5 offline).
4. **Raft-snapshot set** — contains the CA key + all KV history; shipped to
   `VAULT_SNAPSHOT_DEST` (off-box, non-suite, offline-escrow outer-encrypted).
5. **Per-host break-glass credentials** (fleet-root-equivalent; offline physical
   custody, opening the envelope triggers rotation — PLAN §7.5).
6. **Suite-internal CA key** (M-7) — issues the seal-chain + creds-hop certs;
   offline custody. The Gateway's creds-client cert doubles as its token `cnf`
   binding (§4.5), so this CA is named as a §12 ask.

---

## CANNOT-VERIFY-IN-SANDBOX

The following are **operator commands on real hosts/hardware** and cannot be
demonstrated green in a build sandbox — do not fabricate passing evidence:

- **Real seal/unseal chain** — Shamir-unseal of the unsealer + Transit auto-unseal
  of the engine (needs the real unsealer + offline share holders).
- **mTLS listener behavior** — the `data_vault` interface bind, client-cert
  requirement, and the **edge-unreachable / connection-refused** invariant require
  the real network topology (Stage-5/7 regression).
- **TPM / offline-CA custody** — the suite-internal offline CA and any
  hardware-sealed key material (M-7) live outside the container.
- **Off-box WORM sink + engine-stream cross-correlation** — needs the real
  hardened log host (D-16(b)).
- **DR drills** (Stage-7): raft-snapshot restore + canary redemption, unsealer-
  restore leg, KV rotation-gap recovery, and host access **with the Vault sealed**
  (the §7.5 break-glass) are drilled against real targets, not asserted.

See **PLAN §7** for the full seal chain, backup cadences, restore-consistency
rules, and the Stage-7 drill list.
