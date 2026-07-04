# DESIGN_SYSTEM_COMPONENTS.md — Component Index (companion to DESIGN_SYSTEM.md)

> Quick-reference index of every shared component the suite freezes. Each row: component **ID** (cite this in per-app specs), its defining §, one-line contract, and which apps consume it. "Consumes" = renders this component; it must **not** re-invent it. Full definitions in `context/DESIGN_SYSTEM.md`.

## A. Safety visual grammar (§4) — the recurring entities

| ID | § | What it renders | One-line contract | Consumed by |
|---|---|---|---|---|
| `TicketRef` | 4.1 | ticket / run / release / review-item ref | opaque mono chip, copy-on-click, deep-links to `/review/<ticket_id>` | **all** (board, notes, mc, drive, chat, library, gateway, vault, cmdb, auth) |
| `PrincipalRef` | 4.2 | agent / operator / service identity (`sub`) | kind-glyphed mono chip, resolves to auth, links to agent drill-in | **all** |
| `TierBadge` | 4.3 | provenance / trust-tier / taint | shape=family, text=tier, glyph=independence; host-originated ⇒ `UNTRUSTED`, auto-lane-ineligible (rendered) | board, notes, mc, drive, library, cmdb |
| `FenceState` | 4.4 | fencing token / lease / mutex liveness | gen (mono) + lease countdown + heartbeat `Freshness`; zombie = `SUPERSEDED`; advisory-tagged where non-enforcing | board, mc, gateway, drive, notes(display), chat(advisory) |
| `StatePill` | 4.5 | any lifecycle state | one glyph+label pill per state family, never color-only; ticket states per `TICKET_STATE_MACHINE.md` | **all** |
| `HaltBand` | 4.6 | kill-switch ENGAGED / SAFE-STOPPED | full-width gold band, interlock/shield glyph, G2 intensified (non-hue cue), read-only everywhere but MC/auth | board, notes, mc, gateway, vault, cmdb, auth, drive, library (any app that can see posture) |
| `DangerAction` | 4.7 | destructive/irreversible affordance + absence rule | danger-red + friction; constitutional absence = 🔒/⛊ printed fact, never a greyed toggle | board, mc, drive, vault, cmdb, gateway, auth |
| `HonestState` | 4.8 | `confirmed · pending · draining` triad | all three slots always shown; copy discipline forbids "all stopped" while pending/draining > 0 | mc, auth, gateway (any stop aftermath) |
| `Freshness` | 4.9 | freshness/staleness + source stamp | stale = amber "safe reading," never a fabricated green; false-green prohibition | mc, auth, gateway, vault, cmdb, board (any live/mirrored figure) |
| `ReviewChip` | 4.10 | needs_review / escalation state | `StatePill` + machine-reason + deep-link into canonical queue; surfaced everywhere, cleared only in MC/Board | board, notes, chat, drive, library, mc |

## B. Interaction grammar (§5)

| ID | § | What it is | Consumed by |
|---|---|---|---|
| `ConfirmFriction` | 5.1 | the one confirm+step-up gate for dangerous ops; light (toward-less) vs full (toward-more) variants; diff-hash-bound + tamper-evident for policy edits | board, cmdb, vault, gateway, drive, mc, auth |
| `HoldToActuate` | 5.2 | press-and-hold stop actuator (G1 ~600ms / G2 ~1000ms, tunable; reduced-motion = numeric countdown) | mc, auth |
| `Shift+Esc` override | 5.3 | global halt-focus + modal escape hatch; documented fallback chord (browser-capture risk) | **all** apps that can see posture |
| loading/empty/error | 5.4 | skeletons; empty=invitation; **Pattern R (red error) ≠ Pattern D (gold degraded)** | **all** |
| `LiveStream` | 5.5 | SSE client contract: `Last-Event-ID` replay, `event: reset` → REST re-sync, freshness-tagged, terminate on `auth:revocations` | mc, board, notes, chat, gateway |
| keyboard model | 5.6 | full operability, roving tabindex, `Shift+Esc`/`Esc`, visible focus ring | **all** |

## C. Shared chrome (§6)

| ID | § | What it is | Consumed by |
|---|---|---|---|
| `AppShell` | 6.1 | side rail + global header + suite switcher + suite-posture line + operator identity | **all** (with UI) |
| `DataTable` | 6.2 | dense zebra truth-table, mono ID col, sticky sort, card-reflow <640px | **all** (with UI) |
| `Field` | 6.3 | inputs/forms, inline validation, visible label, danger submits → §5.1 | **all** (with forms) |
| `Modal` | 6.4 | the only elevation; halt cut out of scrim; alertdialog for confirms | **all** (with dialogs) |
| `Toast` | 6.5 | transient action confirmation matching the verb; never for safety-critical state; never gold | **all** |

## D. Cross-app patterns (§7) — one owner, many consumers

| ID | § | Owner (canonical) | What it is | Consumers (deep-link / reuse anatomy, never fork) |
|---|---|---|---|---|
| `ReviewQueue` | 7.1 | **mission-control** (`/review`, `/review/<ticket_id>`) | unified pre-exec approval + post-work review queue; item id = Board `ticket_id`; decisions browser-direct to Board | chat (doorbell/deep-link + resolve feed), notes (deep-link out), board (own approval-queue *filter*, same anatomy), library (ingestion admission = **distinct gate, same component anatomy**) |
| `AuditInspector` | 7.2 | shared component family (no single owner) | append-only audit + provenance inspector; chain-verify rendered (never false-green); provenance-lineage pivot | auth, gateway, vault, cmdb, library, drive, board |
| `LiveAgentView` | 7.3 | **mission-control** (`/agents`, `/agents/<sub>`) | fleet view: phi-accrual liveness (no bare green dot), attention band, spawn tree, kill actuation | agent-runtime (thin status renders same row anatomy; no rich UI of its own) |

## E. Archetypes & token groups (§2, §3)

| ID | § | Notes |
|---|---|---|
| Instrument archetype | 2 | dark-only control-room; compact density; auth/mc/board/gateway/vault/cmdb/agent-runtime/drive-admin |
| Workshop archetype | 2 | reading/editing content pane (`--paper-*` + Source Serif 4) inside a dark Instrument shell; notes/library/drive-browse/chat-feed |
| token sheet | 3 | `:root` import: `--sub-*`, `--paper-*`⊕, `--ink-*`, `--signal-*`, semantics, `--halt-*`, `--fs-*`, `--sp-*`, `--r-*`, motion |

## Consumption rule (restated)

A per-app `ui/UI_SPEC.md` **cites these IDs**; it never re-specifies the visuals of a listed component. New app-specific components must be justified as genuinely domain-unique (editor, graph, PageGrid, evidence ledger) — never a re-draw of a listed entity. The consistency sweep (`context/DESIGN_REVIEW.md`) enforces this.
