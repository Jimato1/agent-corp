# Helm · Claude Design injection block — Proxy  *(no UI)*

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Proxy  *(no UI)*

**Skip — nothing to design.** The Proxy is the suite's reverse-proxy / TLS edge and forward-auth front door. It holds no product state and has **no human UI and no agent UI by construction**. Any proxy health the operator needs shows up *through* Mission Control's edge panel and the shell's suite-posture line — never a proxy-hosted screen. No injection block; do not build one.
