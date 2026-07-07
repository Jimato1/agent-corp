# UI/UX Spec — pdf (pdf-forge)

**Status: OUT-OF-SUITE for the shared design system — RECONCILE LATER (operator call deferred).**

`pdf` (pdf-forge) is a **Safe-class, self-contained homelab PDF tool** (Vite/React SPA served by FastAPI: page-organize board, compress, OCR, encrypt/permissions, rasterize, image→PDF, extract-text, sanitize, linearize, repair). It is already built with **its own design references** (`apps/pdf/design/`, `apps/pdf/frontend/`) and its own auth wiring (Authelia/Basic + `PDFFORGE_`/Remote-User audit), predating this suite-wide system.

## Why it is out-of-scope for `DESIGN_SYSTEM.md` today

pdf-forge renders **none of the suite's shared entities** — no ticket refs, no `sub`/agent identity, no provenance/trust tiers, no fencing/lease, no kill-switch, no approval/review gates. It is an Acrobat alternative that participates in the SoD chain, ceremony, and review queues **not at all**; it consumes only Drive's byte-fetch seam as a render tool. Applying the safety visual grammar (§4) to it would be grafting a control-room grammar onto an app that has no control-room state to render. That is why the root prompt scoped it "reconcile later."

## Deferred reconciliation (the actual later-work, for the operator's call)

When pdf-forge is folded into the suite shell, the reconciliation is **shell + tokens, not safety grammar**:
1. **Adopt the `AppShell` (§6.1)** so pdf appears in the suite switcher with the shared header/rail and suite-posture line, instead of a standalone chrome.
2. **Adopt the §3 token sheet** (substrate, ink, signal-cyan, type scale) so its buttons/tables/forms match — its page-organize board and viewer are legitimate **app-specific components** (`PageGrid`, pdf.js `Viewer`, `Dropzone`) that stay, re-skinned to the tokens. pdf-forge is a natural **Workshop** archetype (a document tool).
3. **Migrate auth** from Authelia/Basic to the suite `auth` forward-auth (proxy `§8`) if/when it joins the suite subdomain set — a DEPLOYMENT decision, not a design one.
4. It gains **no** §4 safety components (it has no stops, tickets, or provenance to render) — correctly, it stays the quietest app in the suite.

**No design work is taken on now.** This file records the deferral and the concrete later-scope so the reconciliation is a bounded task, not a rediscovery. Flagged in `context/DESIGN_REVIEW.md`.
