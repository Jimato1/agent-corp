# CONTRACT — CMDB → Gateway (+ svc:tier-approver): the signed policy-verdict token (byte-for-byte)

> **Status: FROZEN (S1, root REVIEW #2, 2026-07-03).** Producer: **CMDB** (the PDP — signs). Consumers: **Gateway** (the deny-biased PEP — validates cryptographically before redeeming/executing) and **`svc:tier-approver`** (reads the auto-tier verdict to clear `awaiting_approval → approved`). This doc freezes the *token format and validation algorithm* that CMDB PLAN §3.4 (producer) and Gateway PLAN §3 check-2b (consumer) each designed toward independently — the "additive anticipation" that REVIEW #2 converts into one contract both sessions read verbatim. It is the co-designed artifact CMDB §11-A5 and Gateway §16-A4 both name.
>
> **Relationship to `cmdb-gateway-policy.md`:** that contract (FROZEN) owns the *decision semantics* — the request/response field set (§1), the fail-closed matrix (§2), `action_class` derivation (§4), registry ownership (§5), host-facts (§6). This doc owns only the *cryptographic envelope* around that response (its §3 "Verdict integrity" made concrete). The two are read together; neither restates the other. On any conflict about field *meaning*, `cmdb-gateway-policy.md` wins; on token *format/validation*, this doc wins.
>
> **Why this is a contract and not two agreeing plans:** two plans that "additively agree" break at integration when one side adds a field or check the other never coded. The load-bearing example here: CMDB sets the verdict's `aud` from the caller so a tier-approver read can never mint a Gateway-redeemable permit — but that anti-relay property is only real if **the Gateway independently verifies `aud == "gateway"`**. CMDB's producer plan cannot make the Gateway check it; only this frozen contract can, and §4 does.

---

## 1. Token format (producer: CMDB)

The **binding** response of `POST /v1/decision` (`cmdb-gateway-policy.md` §1) is a **JWS**, never bare JSON:

| Element | Value | Source |
|---|---|---|
| Signature alg | **EdDSA (Ed25519)** | CMDB PLAN §3.4 |
| `typ` (JOSE header) | **`cmdb-verdict+jws`** | CMDB PLAN §3.4 — distinct from `at+jwt`; a verdict is not an access token |
| `kid` (JOSE header) | the CMDB verdict-signing key id, resolvable at `GET /v1/verdict-jwks` | §2 |
| Signing key | a **CMDB-LOCAL key, deliberately NOT auth's key** — the policy veto must not share a trust root with the identity plane | CMDB PLAN §3.4 |

**Claims (exhaustive normative set — a consumer may rely on exactly these):** the full canonical response struct of `cmdb-gateway-policy.md` §1 —
`{verdict ∈ {deny,ask,permit}, in_window, window_id, window_opens_at, window_closes_at, seconds_remaining, grace, active_freeze?, tier, approval_mode ∈ {auto,ask}, decision_id, evaluated_at, valid_until, policy_version, tzid, reason[]}` — **plus** the following envelope/additive claims:

| Claim | Rule |
|---|---|
| `iss` | **`"cmdb"`** — consumer MUST verify equality |
| `aud` | **set from the authenticated caller identity, single-valued** (§3). `svc:gateway` ⇒ `"gateway"`; `svc:tier-approver` ⇒ `"board"`. Any other authenticated caller receives the **unsigned advisory JSON only** — no JWS is minted |
| `jti` | **= `decision_id`** — the replay/audit key; unique per issued verdict |
| `exp` | **= `valid_until`** — hard expiry; `valid_until = min(evaluated_at + 60s, effective_close − grace)`, degenerate no-window arm `= evaluated_at + 60s` (CMDB PLAN §3.2/§3.4) |
| `iat` | `= evaluated_at` |
| `nonce` | **= `req_nonce` when the caller supplied one** (OPTIONAL, additive — §5). Absent when the request carried none |
| `host_class` | **∈ {managed, disposable}** — additive; lets the Gateway mechanically segregate its two execution surfaces (`execute_approved_plan` refuses `disposable`; `run_sandbox_test` requires it — `gateway-cmdb-library-sandbox.md` §C6/§G5) |
| `verdict_basis` | **∈ {policy, sandbox_carve_out}** — additive; distinguishes a normal policy verdict from the sandbox carve-out (`gateway-cmdb-library-sandbox.md` §C3) |

`reason[]` entries are **CMDB-authored enum codes + parameters, never host-originated free text** (ARCHITECTURE §12). The `effective_close` / grace-zone / no-window field renderings are defined in CMDB PLAN §3.2 and are part of the response semantics, not this envelope.

**The advisory MCP tools** (`is_actionable_now` etc.) return the **same JSON claim struct UNSIGNED** — no JWS, no/other `aud`, no `nonce`. Mechanically unusable at the Gateway (§4 step 1 fails). Every issued verdict, binding *and* advisory, is appended to CMDB's `decision_log`; the Gateway mirrors its own (`cmdb-gateway-policy.md` §3).

## 2. Key distribution (producer: CMDB)

- CMDB serves its verdict-signing public keys at **`GET /v1/verdict-jwks`** (a CMDB endpoint, audience `cmdb`, over the authenticated channel — distinct from auth's JWKS).
- The Gateway fetches and pins acceptance to keys from that endpoint; **it never accepts a verdict signed by auth's identity keys** (different trust root, by design).
- Verdict-key rotation is a **change-controlled, logged event** (CMDB PLAN §3.4 / §6.2 policy-plane change control). Rotation is additive (old + new keys served through overlap); a `kid` absent from the currently-served set is rejected (§4 step 1).

## 3. Audience-by-caller (the anti-relay property — SoD-critical)

CMDB sets `aud` from **the authenticated identity that called `POST /v1/decision`**, never from any request field:

- `svc:gateway` → `aud: "gateway"` — a Gateway-redeemable permit.
- `svc:tier-approver` → `aud: "board"` — an auto-tier clearing signal usable **only** at the Board's approval path.
- Any other authenticated principal → **unsigned advisory JSON**, no JWS.

This closes CMDB AR-cluster-H: the Board's routine auto-tier reads (`svc:tier-approver`) can never obtain a token the Gateway will redeem. The property is only complete because the Gateway checks `aud == "gateway"` (§4) — **frozen here as a hard Gateway obligation, additive to Gateway PLAN §3 check-2b, which Gateway confirms at its next touch (COUNTERSIGN-1 below).**

## 4. Validation algorithm (consumer: Gateway — verbatim, at check-2b)

At the instant of execution/redemption (TOCTOU — never cached, never agent-relayed), the Gateway:

1. Parse the JWS; **reject any `kid` not in the currently-served `GET /v1/verdict-jwks` set**; verify the Ed25519 signature.
2. `iss == "cmdb"`.
3. **`aud == "gateway"`, single-valued** — reject a `"board"`-audience or multi-valued verdict (the §3 anti-relay check; **this is the additive obligation frozen by S1**).
4. `exp` (= `valid_until`) not passed, validated with **ZERO clock-skew leeway** — either the Gateway applies no positive skew allowance, or CMDB pre-shrinks `valid_until` by an agreed bound; `valid_until + ε` on the Gateway's clock must never act (CMDB PLAN §3.4).
5. `jti` (= `decision_id`) recorded to the Gateway decision log; a repeated `decision_id` within its validity is a replay → reject.
6. If the Gateway supplied a `req_nonce` on the request, verify `nonce == req_nonce` (§5).
7. Map `verdict`: `permit` → proceed; `ask` → proceed **only with the already-consumed Board approval** (that is exactly what "ask" defers to); `deny` → hard reject. Apply the `cmdb-gateway-policy.md` §2 fail-closed matrix (unknown host / no policy / unreachable / malformed class / clock-or-window ambiguity → deny + Board escalation).
8. **Surface segregation cross-check** (`gateway-cmdb-library-sandbox.md` §C6/§G5): `execute_approved_plan` requires `host_class == managed` and refuses `disposable`; `run_sandbox_test` requires `host_class == disposable` and `verdict_basis == sandbox_carve_out`.
9. Must-fit (`cmdb-gateway-policy.md` §3): summed catalog `est_duration_s` + `grace` fits before `window_closes_at`, else refuse. Store `decision_id` + `policy_version` in the audit record.

An absent/invalid verdict is **unforgeable-absence** → deny. No verdict field is ever trusted from an agent-relayed copy.

## 5. `req_nonce` — optional per-request freshness (additive)

- Caller-minted, sent on the `POST /v1/decision` request (`cmdb-gateway-policy.md` §1 request struct, additive field), echoed by CMDB into the signed verdict's `nonce`.
- **OPTIONAL:** CMDB's `exp`/`jti` freshness holds without it; the Gateway MAY adopt `req_nonce` for defence-in-depth. If the Gateway sends one, CMDB echoes it and the Gateway verifies it (§4 step 6); if the Gateway sends none, the `nonce` claim is absent and step 6 is skipped.
- `req_nonce` is **contract-scoped, NOT a cross-app identifier** — it is added to the IDENTIFIERS.md "deliberately NOT registered" set on adoption (as CMDB PLAN §3.1 already notes).

## 6. Countersign + change rule

- **COUNTERSIGN-1 (Gateway, next touch):** Gateway confirms §4 steps 2–3 and 8 are coded (esp. the `aud == "gateway"` reject and the `host_class`/`verdict_basis` surface cross-check) — these are additive to its already-frozen check-2b. Confirmation is a one-line ledger flip, no redesign.
- **COUNTERSIGN-2 (CMDB, already satisfied):** CMDB PLAN §3.4 + §5 produce exactly this envelope; §11-A5 named this package. Considered discharged by this freeze; CMDB confirms at its next touch.
- Token format, `aud`-by-caller rule, key-distribution endpoint, and the §4 validation steps change **only** by amending this doc with both the CMDB and Gateway sessions citing it. Additive claims (new envelope fields) are permitted; changing an existing claim's meaning or the alg/`typ` is a breaking, versioned change.
