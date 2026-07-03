# PLAN.md — Notes (`notes`), Stage 2 — Planning

> **Status: DRAFT-COMPLETE / SCHEMA-PROVISIONAL (D-17 SOFT-START / HARD-FREEZE).** Compiled 2026-07-02. Per ratified D-17, Notes Stage-2 drafting may proceed, but **no MCP tool schema in §6 is frozen and Stage-2 does not exit until the gap-1.3 local-model-drives-MCP spike PASSES** its ratified thresholds. Every tool schema below is marked PROVISIONAL and already respects the inherited schema-complexity ceiling (flat, low-arity, enum-biased).
>
> **Inherited authority (this plan builds against, never reinvents):** `context/specs/TICKET_STATE_MACHINE.md` (ceremony phases + display-only frontmatter rule), `context/specs/IDENTIFIERS.md` (`note_id`, `sub`, `ticket_id`, `op_id`, fencing token), `context/specs/DEPLOYMENT.md` (networks/ports/volumes), `context/CONTRACTS/auth-apps-tokens-scopes.md` (RS baseline + scope slice countersigned in §8), `context/CONTRACTS/board-agents-claim.md` (fencing enforcement on Notes writes, §3), `context/CONTRACTS/vault-gateway-redemption.md` §1 (data-hygiene rule binding Notes), MERGE_REVIEW_1 §6 Notes register (all five corrections encoded here — see §12), RATIFICATIONS_2026-07-02 (D-1/D-2/D-14/D-17).
>
> Risk class: **Standard**. Stage-1 research: `apps/notes/research/RESEARCH.md` — its deferred-decision recommendations (Milkdown, FTS5 external-content, isomorphic-git, serialized writes) are adopted; its two Stage-1 defects (CF-D frontmatter trigger, invented ceremony vocabulary) are **corrected**, not carried forward.

---

## 1. Identity and scope

Notes is the agents' **external memory and the org's work product** — the lab notebook. Markdown files on disk are canonical; every database is a rebuildable index; git history is the audit trail. Two surfaces (MCP tools for agents, Milkdown WYSIWYG for the operator) are siblings over one core API. Notes holds **no** ticket-lifecycle or ceremony authority: the Board owns both; Notes is the readable record.

Out of scope for Notes (owned elsewhere): PDF/docx conversion (pdf app; contract PENDING — see §13), artifact storage (Drive), notifications (Chat), review-state transitions (Board; `needs_review → done` is operator-only on the Board), agent-to-agent chat (does not exist anywhere).

## 2. Canonical store — filesystem + git

### 2.1 Layout

```
/data/                           ← ONE named volume `notes_data` (DEPLOYMENT §5 `<app>_data` convention)
  corpus/                        ← THE canonical store; a git repo rooted HERE (index is outside it)
    .git/                        ← remote REQUIRED (see §2.3)
    notes/<type>/<slug>.md       ← one note per file; <type> ∈ the template registry (§5)
    .templates/<type>.md         ← per-type template definitions (service config, versioned in git)
  index/notes.db                 ← SQLite, 100% rebuildable, NEVER inside the git repo
```

- **Path is the human handle; `id` is the machine handle** (IDENTIFIERS.md `note_id` row). Renames/moves change the path, never the `id`; the index re-resolves links by `id` on reconcile.
- `note_id` format (Notes-minted, per IDENTIFIERS.md rule 2 prefix-typing): **`N-` + 26-char ULID** (`N-01J1QZ3XKQ9F8M2VTB7YWD5RSA`). Immutable, set at creation, never reused. *(Doc task at freeze: add the concrete format to the IDENTIFIERS.md `note_id` format column — one row touch-up, no semantic change.)*
- Writes are **atomic write-then-rename within the corpus filesystem**, serialized through the one core API (§4). No component ever writes the files directly except the Notes service.

### 2.2 Frontmatter schema — with the display-only firewall

Every note carries a YAML `---` block. Fields are explicitly classified into two regimes:

**(a) Notes-canonical fields — the file is the truth for these:**

| Field | Type | Notes |
|---|---|---|
| `id` | `N-<ULID>` | immutable, Notes-minted |
| `type` | enum (template registry, §5) | drives the template |
| `title` | string | |
| `created` / `updated` | ISO-8601 UTC | `updated` maintained by the service |
| `ticket` | `T-…` string or absent | opaque foreign ID, stored verbatim (IDENTIFIERS.md), existence-checkable via Board API |
| `tags` | string list | freeform |
| `links` | list of `[[wikilink]]` targets | ALSO derivable from body; frontmatter copy is a convenience the reconciler keeps in sync |
| `provenance` | enum: `agent` \| `operator` \| `host_originated` \| `external` | ARCH §12: origin of the note's initial content. **Derived structurally where structure exists, raised (never lowered) by declaration** — see the taint rules below |
| `provenance_taint` | enum: `clean` \| `host_originated` | **monotonic and raise-only.** Sources that can RAISE it: (a) **structural inheritance** — `create_note(ticket_id=…)` reads the ticket's provenance from the Board (server-side; e.g. Wazuh-spawned tickets are host-originated per `board-wazuh-connector-kickoff.md` §1) and floors the note's taint accordingly; (b) caller declaration (`provenance`/`content_provenance` params) — a declaration can only raise, never lower; (c) monotonicity enforcement on every path (§2.2c). Nothing an agent supplies can produce a *cleaner* value than the structural floor. Exposed via API as both `own` and `effective` taint (§9.1) for the Board's lane-eligibility computation (ARCH §12: taint ⇒ auto-approve lane unavailable) |
| `authored_by` | list of `sub` values | opaque auth-minted subjects that have written to this note; display/join convenience — the authoritative per-edit binding is the git trailer (§3.2) |

**(b) Foreign display copies — NEVER read back by Notes or any other component (TICKET_STATE_MACHINE.md §3):**

| Field | Mirror of | Rule |
|---|---|---|
| `ceremony_phase_display` | Board `ceremony_events` projection | write-only mirror for human readability of huddle notes. Drift is cosmetic, not a bug. **No API, tool, trigger, or index query ever reads this field to decide anything.** |
| `ticket_status_display` | Board ticket lifecycle state | same rule |

Enforcement is structural, not policed: display fields are excluded from the SQLite mirror columns, from every search filter, **and from every API/tool read response** (reads return body + §2.2a canonical fields only), so there is *nothing to read back* — the only consumer is a human eyeball on the rendered note. **This is the CF-D correction:** Notes Stage-1 made `status: converged` frontmatter a Board-read trigger; that design is dead. Convergence is signaled by an agent calling the **Board API (`board.ceremony_transition`)**; the Board's append-only `ceremony_events` log is the sole authority; the frontmatter copy is decorative.

**(c) Taint rules (adversarial-pass hardening — the retro→recon loop is a named ARCH §12 attack surface):**

- **Effective taint is transitive over the link graph.** Because §7.2 mandates *linking* ground truth rather than inlining it, a plan-slice note would otherwise read `clean` while its recon inputs are host-originated. Therefore `effective_taint(note) = own_taint ∨ ⋁ effective_taint(linked notes)` (cycle-safe closure over the `link` table; recomputed on link/content change; fully rebuildable from frontmatter + wikilinks). The taint API (§9.1) returns `{own, effective, tainted_via[]}`; **the Board's lane computation consumes `effective`**, never `own`.
- **Monotonicity is enforced on every write path:** `update_note`/PUT rejects any frontmatter change that lowers `provenance`/`provenance_taint` (`TAINT_DOWNGRADE` business error); the reconciler treats an external-edit downgrade (e.g. a git-level edit) as a violation — it re-raises the value in the file (service commit, alarmed), never adopts the downgrade; index rebuilds recompute taint from canonical frontmatter + links, so monotonicity survives `rm notes.db`. Downgrade exists only as a dedicated operator-scoped, step-up-audited endpoint (mistags happen; agents can never call it).
- **Honest residual (recorded in §16):** an agent that pastes host output *without declaring it* is undetectable at the Notes layer. The structural floor (ticket-lineage inheritance) plus transitive effective taint bound the damage: content entering through Wazuh-spawned work or linked recon notes is tainted regardless of declaration. The gap that remains is out-of-band content on a clean-lineage ticket — accepted, flagged as a mandatory prompt-injection-axis item for every Critical-infra consumer (they already treat notes as adversarial input per ARCH §12).

### 2.3 Git remote — required, with cadence (ARCH §10; MERGE_REVIEW_1 §6 correction)

Stage-1 research was silent on the remote; ARCHITECTURE §10 and DEPLOYMENT §5 make a local-only `.git` a **build failure**. Plan:

- **`NOTES_GIT_REMOTE_URL` is a boot-required env var.** The service refuses to start (fail-loud, before serving traffic) if the remote is unconfigured; a boot-time `ls-remote` reachability probe failure starts the service in **degraded-visible** mode (serving, but `/healthz` red + push-lag alarm) rather than refusing boot — the corpus must not become unavailable because the backup target is down.
- **Push cadence: after every commit, debounced ≤60 s** (one push may cover several commits under burst). Retry with exponential backoff on failure.
- **Push-lag is a first-class health fact:** `/healthz` reports `git_push_lag_seconds` and `last_pushed_commit`; past a staleness bound (default 15 min) the service logs an ERROR-level event (picked up by MC's log shipper, D-10) and flags degraded health. The audit trail's off-box copy is the point — silent lag is the failure mode.
- The remote is an operator-provisioned, credentialed, off-box bare repo (forge or hardened host). Credentials are deploy-time secrets (env/volume), never stored in notes and never agent-visible.
- **Restore path = clone from remote → rebuild index** (§10). The remote *is* the canonical store's backup mechanism; optional volume snapshots are belt-and-suspenders, never the primary.
- **Honesty note (adversarial pass):** while the remote is unreachable, the service keeps accepting writes (availability deliberately chosen over durability for a Standard-class store), so the newest-commits-exist-only-locally exposure is **unbounded in time, bounded only by the alarm** — not "bounded by the debounce horizon." The 15-min alarm plus the operator runbook ("remote down" is a fix-now event) is the mitigation; recorded as an accepted operator-posture residual in §16.

## 3. Git audit trail

### 3.1 Commit granularity

One commit per **mutating core-API call** (= per logical agent tool action; matches Stage-1 recommendation). Committer = the Notes service identity. Library: **isomorphic-git** (pure JS, per-commit author/committer as arguments); simple-git kept as fallback if native hooks are ever needed.

### 3.2 Authorship bound to auth `sub` (MERGE_REVIEW_1 §5 defect — fixed here)

Audit joins on `sub` (IDENTIFIERS.md: every audit log's "who"). Synthetic role emails alone don't join. The mapping, defined:

- **Authoritative binding = commit-message trailers** (machine-readable, survives push, requires no parsing of author fields):

  ```
  <tool>: <one-line summary>

  Sub: <sub verbatim, opaque>          ← THE join key
  Note-Id: N-…                         ← rename-proof note reference (paths change; ids don't)
  Ticket: T-000123                     ← when ticket-bound
  Op-Id: <op_id>
  Tool: append_note
  Fence: <fencing_token>               ← when ticket-bound
  ```

- Git `author.name` = the principal's display name (from the validated token's display claim, else the `sub` itself); `author.email` = `agent@notes.local` — a **fixed, documented-as-meaningless display constant**. Per IDENTIFIERS.md rule 3 (no composite IDs with parsing expectations), the `sub` is deliberately NOT encoded into the email; anything joining on authorship reads the `Sub:` trailer.
- `sub` is derived **only** from the validated token on the API call (auth contract §1: never from any client-supplied field or advisory header).
- The SQLite `audit` table (§4.2) is a rebuildable projection of these trailers; `git log --format` + trailer parsing reproduces it exactly.

## 4. Rebuildable index — SQLite + FTS5

### 4.1 Design (adopts Stage-1 deferred-decision recommendation)

SQLite, WAL mode, single file at `/data/index/notes.db`. **FTS5 external-content table** over a `note` mirror table; tokenizer `porter unicode61 remove_diacritics 2`; rebuild via `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`; ultimate recovery = delete the DB, rescan files, rebuild. The DB is never the authority for anything.

### 4.2 Schema (all tables rebuildable; rebuild source stated per table)

| Table | Columns (abridged) | Rebuild source |
|---|---|---|
| `note` | `id` PK, `path`, `title`, `type`, `tags` (JSON), `ticket_id`, `provenance`, `provenance_taint`, `authored_by` (JSON), `created`, `updated`, `content_hash` (sha256), `mtime`, `size`, `body` | file scan (frontmatter + body). **Display-only fields (§2.2b) are deliberately NOT columns** — structurally unreadable |
| `notes_fts` | FTS5 external-content on (`title`, `body`), `content='note'`, `content_rowid` | `'rebuild'` from `note` |
| `link` | `from_id`, `to_id` (nullable until resolved), `target_text`, `resolved` (bool), `isolated` (bool — link originates in a §7.3 isolated turn; excluded from backlinks/search until released) | body wikilink parse (+ turn markers, §7.3) |
| `audit` | `seq`, `ts`, `sub`, `tool`, `note_id`, `ticket_id`, `op_id`, `fence`, `commit_sha` | git log trailers (§3.2 — `Note-Id:` included, so the rebuild is rename-proof; committed rows are by definition `outcome=success`). Denied/rejected calls go ONLY to stdout structured logs (MC log shipper) — stated plainly: denials are not index-rebuildable; git holds every *state change* |
| `op_dedup` | `op_id` PK, `sub`, `result` (JSON), `ts` | git `Op-Id:` trailers over a trailing window (default 7 days). **Degraded honestly after a rebuild:** trailers restore replay *detection* (op_id + commit_sha), not the exact prior response payload — a replayed op_id post-rebuild returns a generic `{code:"ALREADY_APPLIED", commit_sha}` rather than the original result; rejected-op entries are lost entirely (safe: a re-attempt just re-validates). Recorded in §16 |

### 4.3 Watcher + reconcile (correctness backstop)

- chokidar (v5 if the service is ESM/Node ≥ 20.19, else pin v4) with `atomic: true` + `awaitWriteFinish`, watching directories not files.
- **Full scan-and-reconcile** (walk tree, diff `(path, mtime, hash)` against `note`, apply, rebuild FTS on drift): at boot, after any git HEAD change the service itself didn't make, and on demand (`POST /api/admin/reindex`).
- Reconciliation is idempotent by content hash — duplicate/missed watcher events self-heal.

### 4.4 Rebuild proof (Stage-7 commitment, planned now)

The Stage-7 check is: snapshot query results → `rm /data/index/notes.db` → boot → full reindex → identical results for a fixed query battery (search, backlinks, taint reads, audit projection vs `git log`). Scripted as `verification/rebuild-drill` at Stage 4 so it is runnable all along, not authored at Stage 7.

## 5. Structured templates per type

Template registry (service config, versioned in the corpus at `.templates/`, operator-editable):

| `type` | Sections (fixed headers the agent fills) |
|---|---|
| `research` | Objective / What I did / Findings / Open questions / Next step |
| `plan` | Goal / Approach / Steps / Risks / Rollback |
| `retro` | What happened (git + external before/after) / Lessons / Feed-forward to recon |
| `deliberation` | §7 — phase-named sections from the spec vocabulary |
| `checkpoint` | RESERVED — schema owned by the agent-runtime C12 contract (PENDING, runtime Stage-2); Notes reserves the type name and treats content as opaque until that contract freezes |
| `general` | free-form (operator + agent scratch) |

`create_note(type, …)` instantiates the template; `append_note(section, …)` targets a section header. Templates constrain agent output (ARCH §3 scaffolding) without putting schema intelligence in the model.

## 6. Agent surface — MCP tools (PROVISIONAL until gap-1.3 spike PASS)

Transport: **MCP Streamable HTTP, spec revision 2025-11-25** (suite-wide pin, ratified D-14; do NOT design against the 2026-07-28 RC). One MCP server, mounted behind the proxy at `notes.<SUITE_DOMAIN>`; the MCP layer is a thin adapter over the core REST API (§9) — sibling of the UI, never its parent.

All schemas: flat objects, no nesting, enum-biased, `additionalProperties: false` — inside the D-17 complexity ceiling. Every mutating tool takes caller-minted **`op_id`** (IDENTIFIERS.md; replays collapse to the prior result). Business failures are `isError:true` structured results (e.g. `{code:"STALE_FENCE"}`, `{code:"PRECONDITION_HASH"}`), never JSON-RPC errors — same convention as `board-agents-claim.md` §1.

| Tool | Params (all top-level scalars) | Scope | Action class (§8) |
|---|---|---|---|
| `read_note` | `note_id` | `notes:read` | read |
| `list_backlinks` | `note_id` | `notes:read` | read |
| `search_notes` | `query`, `type?` (enum), `tag?`, `ticket_id?`, `limit?` (≤25, default 10) | `notes:search` | read |
| `create_note` | `type` (enum), `title`, `ticket_id?`, `initial_content?`, `provenance?` (enum — raise-only, §2.2c), `fencing_token?` (**REQUIRED when `ticket_id` is present**), `op_id` | `notes:append` | write-benign |
| `append_note` | `note_id`, `section`, `content`, `content_provenance?` (enum — raise-only, §2.2c), `display_phase?` (enum: 7 spec phases — updates §2.2b display copy only), `fencing_token?` (**REQUIRED if the note is ticket-bound**), `op_id` | `notes:append` | write-benign |
| `link_notes` | `from_id`, `to_id`, `fencing_token?` (**REQUIRED if either note is ticket-bound** — links are canonical content and rewire the huddle record's grounding graph), `op_id` | `notes:append` | write-benign |
| `update_note` | `note_id`, `content`, `expected_hash`, `op_id` | `notes:write` | write-benign (git-reversible; gated by the higher scope — see §8) |

Surface rules:

- **Append bias:** default agent grant is `notes:read notes:search notes:append`. `notes:write` (full overwrite) is NOT in any standard agent role; it exists for the human UI session and narrowly-scoped maintenance principals. A confused agent cannot clobber external memory.
- **Search is a tool, not a dump:** results are `{note_id, path, title, snippet (≤64 tokens, bm25-ranked), score, taint (effective, §2.2c)}` rows — never bodies. The `taint` field satisfies ARCH §12's tag-wherever-*retrieved* requirement: a snippet is retrieved content entering agent context, so its taint marker travels with it (and `read_note` responses likewise carry `own`/`effective` taint). `read_note` fetches full text on demand. FTS input is parameterized and restricted to a sanitized MATCH subset (phrase, AND/OR/NOT, prefix `*`); raw column-filter/NEAR grammar is not exposed.
- **No status filter on search** — ticket/ceremony status lives on the Board; offering a filter over a display copy would invite reading it back. Agents filter by `type`/`tag`/`ticket_id` and ask the Board for state.
- **No delete tool.** Archival (move under `notes/archive/`) is a UI/write-scope operation; nothing is ever destroyed (git history regardless).
- **Fencing (binding, `board-agents-claim.md` §3):** any mutating call on a **ticket-bound** note — `create_note(ticket_id=…)`, `append_note`, `link_notes` (and their REST mirrors) — must echo the Board-minted fencing token; Notes validates it against the Board's current lease (§9.3, **uncached** + a Notes-side monotonic floor) and hard-rejects stale tokens (`STALE_FENCE`). A reaped agent cannot keep writing the huddle record, create spurious ticket-bound notes, or rewire the record's link graph. Non-ticket-bound notes need no fence. **Explicit exemption, stated for the contract freeze:** `update_note`/PUT (the `notes:write` surface) is unfenced because its holders (operator UI, maintenance principals — §8) are never Board lease-holders; it is not an agent-lease operation, and granting `notes:write` to any lease-holding agent role would void this exemption and is disallowed.

## 7. Deliberation-thread-as-note (Board authoritative; Notes the readable record)

One `type: deliberation` note per planning ticket. It is the **record** of the huddle, never its state machine — the Board's `ceremony_events` log is the single authority for phase (TICKET_STATE_MACHINE.md §3); this note is what humans and the retro agent read.

### 7.1 Vocabulary — spec phases only (CF-D companion correction)

Stage-1's invented vocabulary (`drafting / cross-talk / converged / escalated`) is **dead**. Section headers and the `display_phase` enum use exactly the spec's ceremony phases:

`triage → recon → planning → adversarial_review → backlog → execute → retro`

### 7.2 Structure

```markdown
---
id: N-…, type: deliberation, ticket: T-000123
participants: [<sub>, …], links: [[…recon notes…]]
ceremony_phase_display: planning        # §2.2b — display-only, never read back
---
## triage
## recon
## planning
### Independent positions               # D-1: drafted before any cross-reading (anti-anchoring)
### Joint discussion
## adversarial_review                    # REQUIRED — D-1: ≥1 premise-attack cited to a recon note, else the huddle is invalid
## backlog                               # the converged plan slice + plan→playbook references
## execute                               # execution-window record: links to child execution tickets, run evidence references
## retro
```

All seven spec phases have a section — the template mirrors the spec vocabulary 1:1 (nothing omitted, nothing added).

- **One turn = one `append_note` call = one commit.** Human-visible turn header: `### <role> — @<display> · <ISO-8601 UTC> [· re: <turn-ref>]`. Additionally the **service** (never the caller) prefixes each turn with a machine attribution marker — `<!-- turn sub=<sub> ts=<iso> isolated=<bool> -->` — derived from the validated token. It is canonical file content (survives rebuilds, visible in git and to the operator), gives every turn a trustworthy per-turn `sub` binding, and is what the §7.3 mechanical elision and the audit join key on at turn granularity. Turns never edit other turns (append-only tool guarantees it mechanically).
- Ground truth is **linked** (`[[wikilinks]]` to recon notes), not inlined — the debate stays grounded in retrieved findings and the FTS index stays clean.
- **Convergence / escalation are Board API events, not Notes events:** the authorized agent calls `board.ceremony_transition` (Board's tool, Board's scope slice — `ceremony_transition` granularity is a Board Stage-2 countersign item); the Board watchdog enforces timebox/round-cap and force-escalates via the A1 `board_escalation` transition regardless of any agent. What lands in the note afterwards is a recorded turn plus a refreshed `display_phase` — decoration, not signal.
- **Plan-slice hashing note:** the Board mints `plan_hash` over "the canonical plan-slice content (the exact note revision the approval covers)" (IDENTIFIERS.md). Notes' contribution: `read_note` responses and the core API expose the note's current `content_hash` and the backing `commit_sha`, so the Board can pin the exact revision it hashed. Notes never mints or verifies `plan_hash`.

### 7.3 Draft isolation — conditional design (gap-1.2-gated ceremony parameter)

Whether independent drafts are enforced **procedurally** (runtime orchestration: role agents write their `Independent positions` subsection before reading the note; the Adversarial Reviewer checks turn timestamps) or **mechanically** (Notes-enforced visibility) is a ceremony parameter that awaits the gap-1.2 sizing session (MERGE_REVIEW_1 seam #16) and freezes in the Board↔Notes contract (§13). Both halves are designed now so either ratification is buildable:

- **Procedural (default recommendation):** no Notes changes; ordering is auditable from commit timestamps + turn headers; AR dissent-validity check (D-1) is the enforcement.
- **Mechanical (designed, dormant):** `append_note` gains `isolated: true` (one boolean — still inside the schema ceiling). An isolated turn is stored in the file verbatim (canonical, operator-visible in the UI and in git) but the agent read surface **elides isolated turns authored by other subjects** until the Board's ceremony phase has left `planning` (checked live against the Board API, same read as §9.3, fail-closed to "still isolated" if the Board is unreachable). The per-turn author identity the elision compares against is the **service-written turn marker's `sub`** (§7.2 — token-derived, never caller-supplied). **Elision covers every agent-reachable channel, not just `read_note`/`search_notes`:** wikilinks parsed from isolated turns are flagged `isolated` in the `link` table and excluded from `list_backlinks` and search until released — otherwise the link graph is an open cross-talk side channel during `planning`. Elision is an API-layer view rule only — the file never lies.

## 8. Auth — scope slice countersign + action-class manifest

**Countersign of the auth-offered slice (`auth-apps-tokens-scopes.md` §3, notes row):** auth offered `notes:read / notes:search / notes:write`; Notes Stage-1 proposed the 4th split and the merge recommended adopting it. **Notes hereby countersigns the 4-scope slice:**

| Scope | Tools / endpoints | Default holders |
|---|---|---|
| `notes:read` | `read_note`, `list_backlinks`, GET endpoints | all agent roles, UI |
| `notes:search` | `search_notes`, GET /api/search | all agent roles, UI |
| `notes:append` | `create_note`, `append_note`, `link_notes` | all agent roles, UI |
| `notes:write` | `update_note`, PUT/rename/archive endpoints, `POST /api/admin/reindex`, the operator taint-downgrade endpoint (§2.2c) | operator UI session; maintenance principals only — **no standard agent role, ever** (this exclusion is load-bearing for the §6 fencing exemption) |

*(auth's next session records the 4-scope slice in its map — reconciliation item for auth, matching its existing R-list pattern; the recommendation to adopt was already logged in the contract.)*

**Action-class manifest (auth contract §1 delivery — unclassified ⇒ fail-closed, so this is the COMPLETE surface):**

| Class | Members |
|---|---|
| `read` | `read_note`, `list_backlinks`, `search_notes`; GET `/api/notes/{id}`, `/api/search`, `/api/notes/{id}/backlinks`, `/api/notes/{id}/taint`; `GET /api/events` (SSE, `notes:read`); `GET /healthz` (edge-internal liveness — any valid `notes:*` token; the proxy never routes it publicly) |
| `write-benign` | `create_note`, `append_note`, `link_notes`, `update_note`; POST `/api/notes`, `/api/notes/{id}/append`, `/api/notes/{id}/links`; PUT `/api/notes/{id}`; rename/archive endpoints; `POST /api/admin/reindex` (rebuilds a disposable index); taint-downgrade endpoint (operator-only, step-up-audited) |

All members are git-reversible or index-disposable; no real-world side effects. Notes registers **no** `propose`, `sod-critical`, or `destructive-exec` classes: nothing in Notes executes, approves, or releases anything. Budget-middleware consequence: Redis-down degrades to benign allow-with-local-bounds for the whole Notes surface (no fail-closed classes here).

**RS baseline (binding verbatim, auth contract §1–2):** local JWKS validation (poll ≤30 s + on signature failure), `iss` per RFC 9207, `aud == notes` exactly, DPoP/`cnf` where bound, RFC 9728 protected-resource metadata + `WWW-Authenticate` on 401, error semantics verbatim (401 re-mint / 403 `insufficient_scope` + hint vs PDP-deny machine-reason / 409 `in_progress` for op_id replays in flight / 429 budget / 503 fail-closed), shared budget middleware keyed by `sub`, `auth:revocations` subscription with snapshot resync, principal derived only from the validated token or verified `X-Auth-Identity` signature. Inherited numbers, never re-derived: agent token TTL 2 min, JWKS poll ≤30 s, revocation SLO p99 < 500 ms, drift bound D = 1 s.

## 9. Core API — one shared state, two sibling surfaces

### 9.1 REST surface (internal; MCP adapter and UI both consume it)

| Endpoint | Maps to |
|---|---|
| `POST /api/notes` | create (template instantiation; fencing + provenance params as §6 when ticket-bound) |
| `GET /api/notes/{id}` | read (body + canonical frontmatter + `content_hash` + `commit_sha` + own/effective taint) |
| `POST /api/notes/{id}/append` | append (section-targeted; fencing + provenance params as §6) |
| `PUT /api/notes/{id}` | overwrite (`notes:write`; `expected_hash` precondition mandatory; `TAINT_DOWNGRADE` guard §2.2c) |
| `POST /api/notes/{id}/links` / `GET /api/notes/{id}/backlinks` | linking (fencing param as §6 when ticket-bound) |
| `GET /api/search` | FTS query (same shape as the tool, taint field included) |
| `GET /api/notes/{id}/taint` | `{own, effective, tainted_via[]}` for the Board's lane computation (ARCH §12, §2.2c) |
| `GET /api/events` (SSE) | UI live refresh on external change (watcher-fed). **Stream lifecycle (RS-baseline conformance):** the stream is terminated at the presenting token's `exp` (client reconnects with a fresh token) and immediately on a matching `auth:revocations` event for the `sub`; events carry ids so reconnect resumes via `Last-Event-ID` (missed-window fallback: one full refresh). A revoked principal never keeps a live feed |
| `GET /healthz` | index freshness, git push-lag, remote reachability (edge-internal; see §8 manifest) |
| `POST /api/admin/reindex` | `notes:write`-scoped full reconcile (§8) |

### 9.2 Concurrency model (Stage-1 open question — resolved)

**Serialized single-writer through the API; no CRDT.** All writes (both surfaces) funnel to one per-note write queue; atomic write-then-rename; `update_note`/PUT carry `expected_hash` (compare-and-swap on content hash) so a stale editor buffer or stale agent read cannot clobber a newer write (`PRECONDITION_HASH` business error → re-read and retry). The editor live-refreshes on the SSE channel instead of trusting its buffer. Rationale: agent turns are append-only (naturally conflict-free), human+agent simultaneous same-note editing is rare and CAS-retry is sufficient; a CRDT layer would violate markdown-file canonicality and buy nothing at this write rate. Revisit only if Stage-6 concurrency testing falsifies the rarity assumption.

### 9.3 Board reads Notes performs (its half of the Board↔Notes seam, §13)

- **Fence validation — uncached, plus a monotonic floor.** On a fenced write, Notes confirms the presented `fencing_token` is the current generation for the ticket's lease via a **live, uncached Board read** (fenced writes are one-per-huddle-turn — low-rate; a staleness cache would unilaterally weaken the FROZEN contract's "receiving server rejects stale tokens," which Notes may not do). Defense-in-depth mirroring the Gateway pattern: Notes also tracks the **highest generation ever accepted per ticket** and rejects anything lower regardless of what the Board read returns (`STALE_FENCE`). **Fail-closed**: Board unreachable ⇒ fenced write rejected `FENCE_UNVERIFIABLE` — an unverifiable fence protects the record; unfenced non-ticket writes are unaffected. Any remaining check-then-commit race (network-latency scale, not cache scale) goes to the Board↔Notes contract negotiation (§13), not into §16 as a unilateral acceptance.
- **Ticket existence + provenance inheritance** on `create_note(ticket_id=…)`: existence per IDENTIFIERS.md validation posture (may check, never fabricate) and the ticket's provenance for the §2.2c structural taint floor.
- **Phase read for mechanical isolation** (§7.3, only if that variant is ratified).

**Notes' own outbound identity (previously unspecified — fixed):** these Board reads are authenticated calls to a bound RS (`aud == board`, a `board:*` read scope). Notes holds a **service principal `svc:notes`** (auth-minted, client-credentials, read-only Board scope; never any holder/approve/execute scope) for exactly this. Registration of `svc:notes` is added to the auth reconciliation list (§13); the read-API shape freezes in the Board↔Notes contract.

Notes never writes anything to the Board. Escalation filing remains the *agent's* job through Board tools — Notes is a store, not an actor.

## 10. Durability, backup, restore (ARCH §10)

- **Canonical:** `/data/corpus` including `.git` and its remote-pushed history. **Rebuildable:** everything in `/data/index`.
- **Backup mechanism + cadence (stated, as §10 requires):** git push per §2.3 (debounced ≤60 s, alarmed at 15 min lag). The remote is off-box. Optional nightly volume snapshot is secondary.
- **Restore-consistency rule:** a corpus restore is always `git clone` (or reset) from the remote **followed by an unconditional index delete + rebuild**. The index is *never* restored from any backup — restoring a stale index against a restored corpus is the silent-divergence failure ARCH §10 warns about. Notes' only cross-store consistency exposure is Board→note references (`ticket_id`), which are opaque and validated live, so a corpus restored to T-1 cannot corrupt Board state — the Board may reference a note revision that no longer exists, which surfaces as a read miss, not silent corruption (flagged for the Board's own restore-consistency rule).
- **Stage-7 drill:** clone-from-remote → boot → reindex → query battery identical (extends the §4.4 rebuild proof).

## 11. Threat-model outline (Stage-5 preview — Standard rigor)

1. **Concurrent-write clobber** (agent vs. editor buffer): serialized writes, CAS `expected_hash`, atomic rename, SSE refresh. (§9.2)
2. **Runaway-agent memory destruction:** append-biased scopes; `notes:write` withheld from agents; git revert as backstop; per-`sub` budget middleware (rate + concurrency).
3. **Prompt injection via re-consumed notes** (retro→recon loop is an ARCH §12 named surface): raise-only `provenance` with a structural ticket-lineage floor + **transitive effective taint** over the link graph (§2.2c); the Board's lane computation consumes `effective` taint via `GET /api/notes/{id}/taint`; taint markers travel with every retrieval (search snippets, reads — §6). Laundering by *linked* or *ticket-lineage* content is structurally closed; laundering by undeclared out-of-band paste is NOT detectable here and is carried as the §16/§2.2c residual, not claimed solved.
4. **Secret material in notes** (binding data-hygiene rule, `vault-gateway-redemption.md` §1): write-path deny-scan for OpenBao token shapes / private-key blocks / obvious credential material → reject with `HYGIENE_REJECT` (business error); `release_id` and `cred://` handles are explicitly allowed (powerless by contract). **The rejection log line never contains the matched content** — it carries pattern class, `sub`, `note_id`, offsets, and a salted hash only; the rejected payload is not persisted anywhere (otherwise the scan would itself copy the credential into the very logs the vault contract bans it from). Scan is best-effort defense-in-depth, documented as such.
5. **FTS/SQL injection:** parameterized statements everywhere; MATCH input restricted to the sanitized subset (§6).
6. **Path traversal / symlink escape:** write surface addresses notes by `id` only; service-side path derivation canonicalized and confined to the corpus root; symlinks in the corpus rejected by the reconciler.
7. **AuthZ gaps:** RS baseline on every endpoint incl. MCP (§8); scope→tool map enforced server-side; audit log of every state change (git + `audit` projection + stdout for denials).
8. **Stale-fence writes after reap:** §6 fencing rule on ALL ticket-bound mutations (create/append/link), uncached validation + monotonic highest-generation floor (§9.3), fail-closed on Board unreachability.
9. **Git remote as exfiltration/tamper surface:** remote is operator-controlled + credentialed; push-only deploy key; history rewrite on the remote is detectable (`git fetch` divergence check at boot, alarmed).
10. **Oversized/binary abuse:** notes are markdown-only, size-capped (default 1 MB/note, config); artifacts belong to Drive.

## 12. MERGE_REVIEW_1 §6 register — every correction, where encoded

| Register item | Encoded |
|---|---|
| **CF-D: frontmatter display-only** (never a Board-read trigger; convergence = `board.ceremony_transition`) | §2.2b (two-regime frontmatter + structural non-readability), §7.2 (convergence bullet) |
| **Spec ceremony vocabulary** (kill `drafting/cross-talk/converged/escalated`) | §7.1 (spec phases verbatim; `display_phase` enum = the 7 spec phases) |
| **Git authorship bound to `sub`** | §3.2 (trailer `Sub:` as the join key; token-derived only; audit table rebuilt from trailers) |
| **Configured git remote** (local-only `.git` = build failure) | §2.3 (boot-required env, push cadence, lag alarm, restore path), §10 |
| **`notes:append` scope split countersign** | §8 (4-scope slice countersigned + action-class manifest) |
| **Note-visibility semantics if mechanical draft isolation is chosen** | §7.3 (conditional design, both variants buildable; freezes in the Board↔Notes contract) |

## 13. Contracts this plan feeds (per the seam rule — nothing below binds until frozen in `context/CONTRACTS/`)

| Seam | Notes' half (this plan) | Freezes |
|---|---|---|
| **Board ↔ Notes** (`board-notes-ceremony.md`, to write) | §7 conventions, §9.3 reads (uncached fence validation + the lease-read API shape, ticket existence, ticket-provenance read for the taint floor, phase read), the residual check-then-commit fence race (joint disposition, not unilateral), §7.3 visibility semantics, display-copy rule restated | jointly at Board Stage-2 (Board owns `ceremony_transition` + the lease/provenance read APIs) |
| **Notes → pdf** (render call, frontmatter strip/remap) | §2.2 field classification gives the strip list: internal keys (`id`, `provenance*`, display copies, `authored_by`) never leak into exports | PENDING — pdf has no Stage-1 research (MERGE_REVIEW_1 seam #21) |
| **agent-runtime → Notes** (C12 checkpoint notes) | §5 reserves `type: checkpoint`, content opaque | runtime Stage-2 |
| **auth ↔ Notes** (scope slice + service principal) | §8 countersign (4-scope slice) + registration of **`svc:notes`** (client-credentials, Board read scope only — §9.3) | recorded at auth's next session (joins its R-list) |
| **agent-runtime ↔ Notes** (C12 interaction flag) | during a **Board outage**, fenced writes fail closed (§9.3) — if C12 checkpoint notes are ticket-bound, drain-time "flush to Notes" (`killswitch-chain.md` §3) fails during a simultaneous Board outage. Raised here so C12 decides: unfenced checkpoint type, or drain tolerates flush failure | runtime Stage-2 (C12) |

## 14. Deployment conformance (DEPLOYMENT.md — cited, not restated)

Service/DNS/audience `notes`; internal port **8080**; network `edge` only (never `creds`); no host ports; **one volume `notes_data`** (DEPLOYMENT §5 `<app>_data` convention — corpus at `/data/corpus` as the git repo w/ remote, disposable index at `/data/index` outside the repo); env prefix `NOTES_` (`NOTES_GIT_REMOTE_URL`, `NOTES_DB_PATH`, `NOTES_CORPUS_PATH`, `NOTES_PUSH_LAG_ALARM_S`); auth resolved at `auth:8089`; MCP + UI + API all behind the proxy at `notes.<SUITE_DOMAIN>`. Stage-4 exit verifies against the spec itself.

## 15. Build sequencing (Stage 4 preview, API-first)

1. Core: storage engine (atomic writes, frontmatter, templates) + git layer (commits, trailers, remote push) + index/reconciler + REST API + auth RS baseline.
2. MCP adapter over the REST API (schemas per §6 — **only after spike PASS unfreezes them**).
3. UI: Milkdown (`@milkdown/crepe`) WYSIWYG storing markdown (Stage-1 deferred-decision adoption), review surface reading Board `needs_review` state live (clear action deep-links to Board/MC — Notes never clears reviews), backlink/wikilink browser, SSE live refresh.
4. Rebuild-drill script (§4.4) alongside, not after.

## 16. Residual risks / adversarially-accepted items

(Every item below survived the adversarial pass as an explicit acceptance-with-reason; items the pass killed were fixed in place, not accepted.)

- **Fenced writes cost a live Board read each** (uncached by contract-conformance necessity, §9.3). Accepted: fenced writes are one-per-huddle-turn, low-rate. The remaining check-then-commit race (network-latency scale) is a **joint disposition item at the Board↔Notes contract freeze** — deliberately NOT accepted unilaterally here.
- **Board-availability coupling:** a Board outage freezes every ticket-bound note write suite-wide (fail-closed `FENCE_UNVERIFIABLE`), including huddle turns and — if C12 makes checkpoints ticket-bound — drain-time flushes. Accepted deliberately: an unverifiable fence protects the record that grounds approvals; non-ticket notes are unaffected; agents escalate per ARCH §3. The C12 interaction is flagged to runtime Stage-2 (§13).
- **Self-declared provenance gap (§2.2c):** undeclared out-of-band host content on a clean-lineage ticket is undetectable at the Notes layer. Accepted with the structural floor + transitive effective taint bounding it; every Critical-infra consumer already treats note content as adversarial input (ARCH §12).
- **Hygiene scan (§11.4) is pattern-based** — it cannot catch every secret shape; accepted as defense-in-depth atop the structural rule that agents never *hold* plaintext.
- **Off-box durability window is unbounded while the remote is down** (§2.3 honesty note): the service keeps accepting canonical writes during a remote outage; exposure is bounded by the 15-min alarm + operator response, not by any mechanism. Accepted **[operator-posture]**: availability of the suite's external memory over synchronous-push durability for a Standard-class store.
- **op_dedup degradation:** replays older than the 7-day window could re-execute; post-index-rebuild replays return `ALREADY_APPLIED` + `commit_sha` rather than the original payload; rejected-op dedup entries are lost on rebuild. Accepted: all mutations are append/CAS-guarded, so the worst case is a duplicate appended turn or a re-validated rejection, both visible in git.
- **Denied-call audit lives in stdout logs only** (§4.2) — not index-rebuildable; git holds every state *change*. Accepted for Standard class; MC's log store (D-10) is the retention home.
- **`checkpoint` type is a reserved stub** — C12 may force schema changes; accepted, additive by design.

## 17. Exit-criteria status (PROCESS.md Stage 2)

- **"Data model and both surfaces (MCP + UI) specified over one shared state":** §2–§7 (data model), §6 (MCP), §9 + §15.3 (UI), all over the §9 core API — SPECIFIED.
- **"Adversarial concerns resolved or explicitly accepted with reason":** adversarial pass run this session; resolutions folded in; accepted residuals in §16 — MET (see session record).
- **D-17 entry/exit gate:** **Stage-2 exit is BLOCKED and tool schemas remain PROVISIONAL until the gap-1.3 spike PASSES.** On PASS: re-check §6 against whatever schema-complexity budget the spike validated, then freeze schemas + declare exit. On FAIL: §6 is already flat/low-arity/enum-biased (the remediation direction), but must be re-validated against the failure taxonomy before freeze.
