# CONTRACT — Board ↔ Wazuh connector: event kickoff webhook + external-verification evidence

> **Status: FROZEN in shape** (MERGE-RESEARCH-1, 2026-07-02); two open items flagged (§5). Parties: **Board** (webhook receiver, ticket authority), **Wazuh connector** (sited in/beside the Gateway, read-only), **CMDB** (owns the `agent.id → host_id` mapping). Reconciles Board RESEARCH §6, Gateway RESEARCH §5, CMDB RESEARCH §2, IDENTIFIERS.md. Wazuh is existing infrastructure (4.14.x; refuse/branch on 5.x via startup version probe).

## 1. Kickoff webhook (Wazuh → Board)

- Mechanism: Wazuh **Integrator** custom script (name begins `custom-`, `alert_format json`, filtered to vulnerability rule groups) POSTs the alert JSON to the Board's inbound endpoint (`/hooks/wazuh`).
- Board endpoint duties, in order: (1) verify a shared-secret **HMAC over the RAW body** first; (2) compute the synthetic idempotency key `spawn_key = sha256(agent.id + cve.id + status)` (Board-internal, never transmitted); (3) insert idempotently under a UNIQUE `spawn_key` index — re-deliveries are no-ops. Dedup lives in Board data, never in the integrator layer.
- **Host-identity rule (fixes the mapping bypass in Board's research):** the dedup key may hash raw alert fields, but **ticket creation MUST resolve `host_id` via CMDB's operator-confirmed `agent.id → host_id` mapping**. An alert for an unmapped/needs-tiering agent NEVER becomes an execution-eligible ticket — it lands as a quarantine/needs-tiering escalation. Wazuh `agent.id` is recyclable and attacker-adjacent at enrollment; it is never host identity.
- **Provenance tag (ARCHITECTURE §12, binding):** alert-derived ticket fields are host-originated adversarial input — tagged as such, which makes the auto-approve lane unavailable to any plan consuming them.

## 2. Alert semantics the Board may rely on

Vulnerability alerts fire **only on state change** in later scans, never on initial inventory — webhook silence is not health. **Baseline posture is pulled via the Wazuh API/indexer** (assigned: the connector, on the Gateway side, which already owns both Wazuh clients — recon agents consume it from there).

## 3. Verification evidence (external verifier for `verifying → done`)

- **Remediation is confirmed by DISAPPEARANCE** of the `(vulnerability.id, agent.id)` document from `wazuh-states-vulnerabilities-*` after the host's next completed Syscollector scan (~1h default; interval fact per host — see `cmdb-gateway-policy.md` §6c). There is **no persistent "Solved" record**; the transient `Solved` alert is best-effort corroboration only. Any design polling for a Solved status never terminates.
- The connector polls with backoff sized to the Syscollector interval; evidence (query, absence result, timestamps, `run_id` join) attaches to the ticket; the **Board automatically** flips `verifying → done` on evidence, `verifying → failed` on refutation/timeout (TICKET_STATE_MACHINE.md §2 — Gateway research's "escalate to needs_review on timeout" is superseded: the transition is `verifying → failed`, which itself triggers retro/escalation).
- Both connector credentials (Indexer :9200 basic-auth; Server API :55000 JWT) are **read-only via Wazuh RBAC** and are **Vault-held secrets**, never config values. No Wazuh write path is ever exposed to agents.

## 4. Duty placement summary

Connector (at Gateway): baseline pulls, verification polling, evidence capture. Board: webhook receipt, dedup, ticket spawn, `verifying` transitions. CMDB: the mapping table + scan-interval fact. Ticket closure runs through **the connector's disappearance poll**, not through Solved-event webhooks (resolves Board's open either/or — D-9 records it for sign-off).

## 5. Open (flagged, not blocking the shape)

- Webhook authentication upgrade: static HMAC secret (researched mechanism) vs a scoped auth-minted identity for the integrator script — decide at Board Stage-2 with auth (D-9).
- Whether `Solved` events also flow through the webhook as advisory corroboration (harmless if idempotent; never the confirmation).
