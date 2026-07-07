# Board — UI kit

The org's coordination spine — where work is tracked across the 11-state lifecycle,
atomically claimed, its host lock **fenced** (the Board is the fencing authority), and
the one **approval record** it owns is minted. **Instrument** archetype on every
screen; no Workshop pane (plan slices and huddle transcripts live in Notes and are
deep-linked, never re-rendered as paper). Read-only kill mirror — the Board is in the
kill chain but hosts **no actuator** (deep-links to MC/auth).

### Screens (4)
- **Lifecycle Kanban** (`/`) — column-per-lifecycle-state (`todo · in_progress ·
  awaiting_approval · approved+executing "hot" · verifying · needs_review · done
  archive`) + a full-width **blocked swimlane** + a Kanban/Table view toggle. Cards are
  pure shared chips (TicketRef, StatePill, PrincipalRef, FenceState, TierBadge+lane,
  ReviewChip).
- **Ticket Detail + CeremonyRibbon** (`/t/<id>`) — meta, lineage, the ceremony state
  machine (phase stepper · round · live timebox · **AR veto in amber, never gold** ·
  roster · grounded dissent · PO decision-of-record), the Notes-pinned plan block, host
  lock, the Board-owned approval record, and the ticket audit tail.
- **Approval Queue + Decision** (`/approvals`) — a **Board-scoped filter** of Mission
  Control's canonical review queue (same rows, same deep-links), plus the decision
  surface: the **immutable allowlist** DataTable, `action_class` labeled *derived from
  playbooks, not ticket type*, the CMDB verdict with Freshness, four-eyes as a printed
  constitutional absence, Approve = FULL red ceremony (typed-intent + step-up,
  diff-hash-bound to `plan_hash`), Reject = LIGHT cyan single-confirm.
- **Management Console** (`/console`) — tabs: WIP & lineage policy (sod-critical
  writes), Standing triggers, Lineage tree, Escalation queue (A1 board_escalation / A2
  break-glass / quarantined Wazuh / reaper holds), Violation log, Audit browser
  (append-only, **no fabricated "chain verified"** — the Board log isn't hash-chained).

### App-specific components
`LifecycleKanban` (container — column/swimlane/archive layout; every element inside is
a shared chip) · `CeremonyRibbon` (the ceremony state machine, read-only) ·
`TicketLineageTree` (ticket lineage, distinct from MC's agent spawn tree). Plus helpers
`statePill` (the 11-state map), `taintBadge`, `LaneBadge` (a tier-family label, never
gold), `TicketCard`.

### The safety seams this kit demonstrates
- **The approval decision is the signature danger surface** — the immutable allowlist +
  "action_class from playbooks, not type" make a destructive plan unable to masquerade
  as benign; the confirm token is diff-hash-bound to the plan bytes you saw.
- **Four-eyes is a printed 🔒 absence**, not a greyed button (toggle the "you are the
  proposer" demo on the decision surface).
- **Kill-level gates approval minting** — with a stop engaged, Approve is *replaced* by
  the suspended-state printed fact; Reject (toward-less) survives.
- **FenceState renders authoritatively** here (the `⚠ SUPERSEDED` zombie is first-class
  on cards, the blocked swimlane, and the drawer) — contrast Chat's advisory-greyed.
- **UNTRUSTED is rendered, never cleared** — no control anywhere clears taint.
- **Pattern R ≠ Pattern D** — a Notes/CMDB/auth outage on an approval path is gold
  "fails closed", never a red error.

### Files
`index.html` loads `../../_ds_bundle.js` → `bd-data.jsx` → `bd-parts.jsx` →
`bd-screens.jsx` → `app.jsx`. Try: open T-000097 (Ceremonies) for the ribbon; work an
approval (typed-intent + step-up); toggle **simulate kill** (bottom-right) to see the
read-only HaltBand + suspended minting.

### Flagged gaps (from the brief)
`svc:tier-approver` auto-lane is inactive by default (the surface shows the
operator-granted-only reality, not a phantom auto lane). Spec amendments A-VR / A-RR
(voluntary-release visibility, restore-reproposal banner) are unratified — the interim
rule (operator cancel + re-file) stands. `TicketLineageTree` is deliberately thin
(foldable into a DataTable tree if preferred).
