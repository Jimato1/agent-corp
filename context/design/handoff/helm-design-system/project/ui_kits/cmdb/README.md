# CMDB — UI kit

The suite's **policy plane** — the fleet inventory plus the rules that decide *"may this
host be touched right now?"* — and the one console where the operator authors that policy
and sees exactly what any edit makes auto-executable **before** it takes effect. Operator
console only (agents get a read-only MCP query surface with zero mutation verbs).
**Instrument**, dark-only, DataTable-first. Read-only HaltBand mirror — CMDB is the policy
**veto**, not the trigger.

### Screens (13 rail destinations)
Fleet · Host detail/policy-editor · Tiers · Tasks · Catalog · Sandbox (+ kill knob) ·
Discovery · Dry-run · History · Decisions · Escalations · Break-glass.

The centerpiece is the **gate-weakening ceremony** on the Host editor: any policy edit that
loosens a gate gets the full ConfirmFriction — red primary, typed-intent, step-up, a
`BlastRadiusPreview` naming the exact (host × action_class) cells that become
auto-executable, a diff-hash-bound token, and the live honest-state echo. Commit → push to
remote → **only then** snapshot swap.

### The deliberate divergences this kit preserves (design-review nuances, not gaps)
- **Two meanings of "tier", kept visually distinct:** host-criticality uses the
  app-specific **`CriticalityTier`** chip (tier0…tier3 + ✦ unpolicied); the provenance
  **`TierBadge`** (striped-amber UNTRUSTED) is reserved for its true meaning on
  host-originated facts.
- **A maintenance FREEZE renders AMBER (`❄ FREEZE-ACTIVE`), never halt-gold** — a freeze is
  *policy*; gold is reserved suite-wide for the kill switch and fail-closed only.
- **Verdict outcomes are never green** — `permit` is neutral, `ask` amber, `deny` danger;
  green is reserved for external-verifier confirmation and a policy permit is not a
  verification.
- **Fail-closed is the system working**, rendered gold Pattern-D, never a red error; the
  History screen carries the out-of-band `git log` verify banner ("this console can lie").
- **Constitutional absences are printed 🔒 facts** (no lease/mutex/approval, no Vault
  creds, the destructive-never-auto floor), never greyed toggles.

### App-specific components
`VerdictTrace` (the arbitrary-`at` decision-path explainer) · `BlastRadiusPreview` (fills
the ConfirmFriction preview slot) · `WindowScheduleEditor` (RRULE window editor, described)
· `CriticalityTier` chip · `PolicyMatrix` (a thin DataTable config).

### Files
`index.html` loads `../../_ds_bundle.js` → `cm-data.jsx` → `cm-parts.jsx` →
`cm-screens.jsx` → `app.jsx`.
