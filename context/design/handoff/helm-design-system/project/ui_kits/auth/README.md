# auth — UI kit

The identity gateway and **reference implementation** — the whole design system was
derived from auth's shipped console, so nothing here should contradict it.
**Instrument** archetype.

Boundaries auth owns:
- **Per-principal revocation** — `Revoke` is a red `DangerAction` with typed intent +
  step-up.
- **The identity-layer stop** — auth's own `StopActuator` (halts token issuance),
  distinct from the global kill.
- **A read-only mirror of the global kill level** — a `KillMirror`; Mission Control
  owns global actuation.
- **The canonical Audit / Provenance Inspector** — append-only rows (time · who ·
  action · target · outcome · provenance) with a verify action that obeys the honesty
  rule: a stale/failed verify is gold "cannot confirm" or red "chain broken", never
  green.

The two printed-absence facts appear on a principal: *this surface cannot let a
principal approve its own work* and *auth never displays a stored credential*.

### Screens
`Principals` · `PrincipalDetail` · `IdentityControl` (identity-layer stop + global
mirror) · `AuditView`.

### Run it
Open `index.html`. Try: open a principal and revoke it; go to Identity control and
hold the identity-layer stop; read the audit log's verify column.
