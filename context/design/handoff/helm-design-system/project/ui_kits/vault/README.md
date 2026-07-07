# Vault — UI kit

The operator's console for the suite's secrets store — create/rotate credentials,
onboard hosts for SSH-CA signing, and read the immutable redemption ledger, on a console
that can create and destroy authority but can **never read a secret back**. Operator-only,
**Instrument**, dark-only. The Gateway-only `/redeem` seam appears here as *audit* and
*status*, never as a button; the HaltBand is a read-only mirror.

### Screens (6)
- **Secrets Manager** — the write-only surface (the app's boldness): a metadata-only
  DataTable with **no value column**, the constitutional-absence band ("no reveal,
  export, or show-plaintext path — break-glass is an offline 3-of-5 quorum"), the
  `SecretWriteForm` (the only place a value is typed, masked, never echoed), and Rotate
  (full ceremony).
- **Host Onboarding** — the `SignRoleStager` (powerless proposed SSH sign-role, no
  wildcards/root/allow_empty, invariant-checked) + the diff-hash-bound Apply step-up +
  the TrustedUserCAKeys snippet.
- **Access Audit** — `AuditInspector`: the exfiltration-signal pin (agent-shaped denials,
  machine reason verbatim), local-vs-WORM chain status, and the false-green chain-verify.
- **Releases** — the pending-release table; Revoke is a light confirm carrying the
  mandatory honesty carve-out ("revokes the pending release only; an issued cert dies by
  TTL/KRL") and the live HonestState triad.
- **Status / DR** — the `SealChainPanel` crown-jewels register; the signature false-green
  screen (seal-unknown → gold `CANNOT CONFIRM SEAL`, never a fabricated green; audit-sink
  health green only if **both** sinks current). Toggle the demo to see it.
- **Change Control** — the single place any gate-weakening edit happens, behind the full
  ceremony (rendered diff → typed-intent → step-up → diff-hash-bound token → audit row).

### App-specific components
`SecretWriteForm` (write-only-by-construction, no read-back sibling) · `SignRoleStager`
(the gate-defining SSH sign-role artifact) · `SealChainPanel` (crown-jewels register of
Freshness tiles obeying the false-green rule).

### Files
`index.html` loads `../../_ds_bundle.js` → `vt-data.jsx` → `vt-parts.jsx` →
`vt-screens.jsx` → `app.jsx`. (This replaces the earlier basic Vault kit.)
