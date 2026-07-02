# CLAUDE.md — Secrets Vault (`vault`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to the Vault. Run the 7-stage pipeline; this app is **Critical-infra**, so Stages 5 and 7 have teeth.

## Identity

The Vault is **the keys** — the only component that holds plaintext credentials, and the one that deliberately breaks the suite's "two views over one state" rule. Agents get almost no read surface here: they can reference a credential by handle, but only the Gateway can ever redeem that handle to plaintext. Its whole design assumes an agent will eventually try to exfiltrate secrets and must fail to.

## Risk class: Critical-infra

## Its place in the segregation-of-duties chain

The Vault holds **the credentials** — one of the four holders that must independently agree before any destructive action (Board = approval, CMDB = policy, Vault = credentials, Gateway = execution). It releases plaintext **only to the Gateway**, and **never to an agent**, so an agent that has proposed and even gotten a plan approved still cannot obtain root. This is the invoice-approver-can't-cut-the-check rule; write it at the top of the security stage.

## Agent surface (MCP) — deliberately near-empty

- Agents may **reference a credential by handle only**. **Never** return plaintext to an agent by any path.
- Do **NOT** expose secret read/export to agents. The two-view rule is intentionally inverted here (§4).

## Human surface (UI)

- Manage secrets, rotation, and an **access audit** (who redeemed what, when — the Gateway being the only legitimate redeemer).

## Key mechanics to build

- **Handle → plaintext redemption restricted to the Gateway** — the core security property; prove no other caller can redeem.
- **Rotation** and no-plaintext-in-logs.
- **Access audit** complete and immutable: every redemption recorded.
- Holds long-term secrets (unlike the Gateway) — treat this container as a top-value target and design accordingly.

## Definition of done (Stage 7)

- Written proof the segregation-of-duties property holds: Vault alone causes no action, and agent-only paths never reach plaintext.
- Demonstrated: an agent cannot obtain plaintext credentials by any path; only the Gateway redeems handles.
- Access audit is complete and immutable; rotation works.
- Critical-infra security stage cannot exit on a light checklist (§8).
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-14)** **Adopt OpenBao, pinned 2.5.x (≥ 2.5.5)** — never the 2.6.0 beta; BUSL HashiCorp Vault retained only as a license-encumbered **break-glass fallback**. Minimum surface: KV v2 + SSH secrets engine + exactly one Gateway auth method. The Vault app is a thin API/MCP wrapper owning the SoD inversion.
2. **(D-4)** Redemption preconditions: Gateway-side enforcement baseline **plus** the redeem endpoint independently verifies the approval (`approval_id` named) — `context/CONTRACTS/vault-gateway-redemption.md` §3.
3. **(D-16, each tagged _operator-posture, revisit before prod_):**
   - **Fail-closed-on-audit:** a redemption is refused if it cannot be logged to ≥2 sinks (availability deliberately traded for non-repudiation).
   - **Off-box WORM sink = a hardened log host** (not Drive object-lock, not a SIEM).
   - **Seal model = on-prem Transit auto-unseal** via a second minimal unsealer OpenBao (`vault_unsealer` sidecar, DEPLOYMENT §3a) + 3-of-5 recovery shares escrowed offline.

> **Stage-2 obligations:** sequence AFTER auth pins the holder-scope claim shape (planning-blocking); this file's shared-context pointer was broken (`/_context/`) during Stage-1 — re-check RESEARCH.md against the frozen contracts and tier-1 specs before planning hardens.
