# CLAUDE_DESIGN_BRIEF.md — Helm Design Brief Package (index)

> **What this is.** A paste-ready package that translates the suite's frozen engineering design system (`../DESIGN_SYSTEM.md`) and its per-app UI specs into **visual-first briefs for Claude Design**. Documentation/synthesis only — **no code, no new design decisions.** Everything traces to `DESIGN_SYSTEM.md`, the per-app `ui/UI_SPEC.md` files, and the ratified auth safety cues (`RATIFICATIONS_2026-07-02.md`). Genuine silences are marked `[GAP …]` and resolved in `../DESIGN_REVIEW.md` §5.1.
>
> **The package is split into one file per paste**, so you hand Claude Design exactly one thing at a time. This file is just the index.

---

## Files in this package

| Order | File | What it is |
|---|---|---|
| **1st** | [`00-MASTER-BRIEF.md`](00-MASTER-BRIEF.md) | **Paste FIRST.** Part 0 ratified resolutions + Part 1 — the whole design-system seed (mood, colors, type, the safety visual grammar, the shell, the three cross-app patterns). |
| ref | [`INJECTION-GUIDE.md`](INJECTION-GUIDE.md) | The ordered paste checklist + cross-component dependencies (why the order matters). |

### Per-app injection blocks (`apps/`) — paste one at a time, in this order

Each block is **self-contained** (it re-states the shared context it needs, because the master brief will no longer be in Claude Design's context when you paste it later).

| # | App | When to paste |
|---|---|---|
| 01 | [Mission Control](apps/01-mission-control.md) | after Master — **paste first among apps** (owns the review-queue + live-agent surfaces others deep-link into) |
| 02 | [Board](apps/02-board.md) | after Mission Control (defines ceremony + approval surfaces others echo) |
| 03 | [Notes](apps/03-notes.md) | after Mission Control (review-attention deep-links to it) |
| 04 | [Library](apps/04-library.md) | after Mission Control (ingestion queue reuses its Review-Queue anatomy) |
| 05 | [Drive](apps/05-drive.md) | after Master |
| 06 | [Chat](apps/06-chat.md) | after Mission Control (feed deep-links to its queue) |
| 07 | [Gateway](apps/07-gateway.md) | after Master (kill status links to MC/auth) |
| 08 | [Vault](apps/08-vault.md) | after Master |
| 09 | [CMDB](apps/09-cmdb.md) | after Master |
| 10 | [Agent Runtime](apps/10-agent-runtime.md) | after Mission Control (any fleet rows reuse its live-agent anatomy) |
| 11 | [Proxy](apps/11-proxy.md) | **skip — no UI** |
| 12 | [pdf](apps/12-pdf.md) | **deferred** — build only if folded into the suite shell later |

---

## The 30-second version

1. Paste **`00-MASTER-BRIEF.md`** into a fresh Claude Design session — it builds the shared system.
2. Then paste each **`apps/NN-<app>.md`** in number order (see `INJECTION-GUIDE.md` for the dependencies).
3. **Proxy** has no UI (skip); **pdf** is deferred.

Suite name **Helm** is approved; all design GAP flags are resolved in `../DESIGN_REVIEW.md` §5.1.
