# Helm · Claude Design injection block — pdf (pdf-forge)  *(deferred — reconcile later)*

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — pdf (pdf-forge)  *(deferred — reconcile later)*

**Defer — do not build in this pass.** `pdf` (pdf-forge) is a self-contained, Safe-class homelab PDF tool (page-organize, compress, OCR, encrypt, etc.) that already has its own front-end and its own auth, and renders **none** of the suite's shared entities (no tickets, identities, tiers, fencing, kill switch, or review gates). It is orthogonal to this design system today.

**Later reconciliation (when the operator chooses to fold it in) is shell + tokens only, not safety grammar:** adopt the suite `AppShell` (so it appears in the switcher) and the color/type token sheet (re-skin its page-organize board, viewer, and dropzone — legitimate app-specific widgets that stay), treat it as a **Workshop** archetype, and migrate it to the suite auth edge. It gains **no** safety components (it has no stops, tickets, or provenance to show) — correctly the quietest app in the suite. `[GAP — operator to decide if/when pdf joins the suite shell.]`
