# CLAUDE.md — pdf-forge

Project memory for Claude Code. Read this first, every session. Keep it accurate; if a rule here is wrong, fix it here rather than working around it.

## What we're building

pdf-forge is a self-hosted, privacy-first alternative to Adobe Acrobat. It runs as a **single Docker container** in a homelab, on the LAN. The whole point is that documents never leave the user's network — no cloud, no subscription, no telemetry.

A user uploads PDFs, organizes pages visually (reorder, rotate, delete, merge, split), runs heavier jobs (OCR, compression, linearization, encryption), and downloads the result.

## Golden rules (non-negotiable)

1. **Privacy first.** Files never leave the LAN. No external calls with user data, ever. No analytics, no phone-home.
2. **Scope is locked.** `/SCOPE.md` is the single source of truth for v1. Build only LOCKED features. Anything under EXPLICITLY OUT is off-limits until v2. Do not add features on your own initiative.
3. **No temp-file leaks.** Every scratch/working file is deleted after its job completes — including on error and crash paths. Prefer tmpfs or guaranteed-cleanup context managers.
4. **The stack is fixed** (see below). Do not introduce new frameworks or swap engines without an explicit instruction to do so.
5. **Don't break the API contract.** `/docs/API.md` is authoritative for endpoints. If an endpoint must change, update `/docs/API.md` in the same change and say so.

## Document authority (in order)

When docs disagree, higher wins:

1. `/SCOPE.md` — what v1 is. Authoritative over everything below.
2. `/docs/API.md` — the backend contract.
3. `/docs/STRUCTURE.md`, `/docs/DECISIONS.md` — layout and rationale.
4. `/PLAN.md` — milestones and task order.
5. `/research/` — background only; superseded by anything above.

## Architecture

**Hybrid client/server.** Snappy page-level operations run in the browser; heavy lifting runs on the backend.

- **Client-side (pdf.js):** rendering, thumbnails, preview, reorder, rotate, delete, page selection, local merge/split where practical. These feel instant and never hit the server.
- **Server-side (FastAPI + engines):** OCR, compression, linearization, encryption, and anything that needs a real PDF engine. The client POSTs a job, polls/streams progress, then downloads the result.

One container serves both: FastAPI serves the built static frontend and the API.

## Tech stack (pinned)

- **Backend:** Python 3.12, FastAPI, uvicorn
- **PDF engines:** pikepdf (qpdf) for structure/merge/split/rotate/metadata/encrypt/linearize; pypdf for light manipulation; ocrmypdf (Tesseract) for searchable PDFs; Ghostscript for compression; poppler-utils for rendering/inspection
- **Frontend:** Vite + React, pdf.js for rendering and previews
- **Container:** multi-stage Docker (Node build stage → Python runtime), single image; docker-compose for run

## Repo structure

`/docs/STRUCTURE.md` is authoritative. The shape:

```
pdf-forge/
  backend/
    main.py            # FastAPI app entry; serves API + static frontend
    api/               # routers, one module per feature area
    engines/           # thin wrappers around pikepdf/pypdf/ocrmypdf/gs/poppler
    core/              # shared: validation, temp-file lifecycle, errors, job runner
    tests/             # one test file per endpoint
    requirements.txt
  frontend/
    src/
      components/
      flows/           # one folder per user flow from /SCOPE.md
      lib/api.ts       # the single API client — all backend calls go through here
      lib/pdf.ts       # pdf.js helpers
    package.json
  Dockerfile
  docker-compose.yml
  README.md
```

## Coding conventions

**General**
- Match the existing style in the file you're editing. Consistency beats personal preference.
- Small, focused modules. If a file mixes concerns or grows past ~300 lines, split it per `/docs/STRUCTURE.md`.
- Clear, specific names. Name things by what the user controls, not how the system is built.

**Anti-duplication (important — this codebase is prone to it)**
- Before writing a block of logic, check whether it already exists in `backend/core/` or `frontend/src/lib/`. If similar code appears in 2+ places, extract it into a shared util/middleware/hook instead of copying.
- Upload validation, temp-file handling, error shaping, the job runner, and engine-call wrappers each have **one** canonical implementation. Use it; don't re-inline it per endpoint.
- All frontend backend calls go through `lib/api.ts`. No scattered `fetch()` calls.

**Backend (Python / FastAPI)**
- Type hints everywhere. Pydantic models for request/response shapes, matching `/docs/API.md`.
- Validate uploads (real PDF, size, page count) **before** any engine touches the file.
- Errors return a clean, specific, user-facing message — never a stack trace to the client. Use the shared error shaper.
- Temp files via the shared context manager that guarantees cleanup on success and failure.

**Security (treat as load-bearing)**
- **Never** build shell commands by string interpolation. Call engines with argument lists (`subprocess.run([...], shell=False)`), never `shell=True` with user input.
- The container runs as a **non-root** user.
- Enforce limits: max upload size, max page count, max concurrent jobs, per-job time/CPU cap. One job must not be able to take the container down.
- No secrets in code or image. Config via environment variables.

**Frontend (React / pdf.js)**
- Functional components and hooks. Keep page-board state predictable; support multi-select, drag-reorder, and undo.
- Every flow has clear states: empty, loading, in-progress, error, success. Error copy is specific and in the interface's own voice.
- Use the design reference in `/design/` for look and layout; implement the real app against pdf.js and `lib/api.ts` — do not paste Claude Design mockup code in as production.

## Quality floor

- Responsive down to mobile; visible keyboard focus; reduced motion respected.
- At least one test per backend endpoint (happy path + one failure path).
- After each milestone, confirm the app runs and the feature works before moving on.

## Commands

```bash
# Frontend dev (hot reload)
cd frontend && npm install && npm run dev

# Backend dev (hot reload)
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Backend tests
cd backend && pytest

# Build the production image
docker compose build

# Run it (serves frontend + API on the mapped port)
docker compose up -d

# Stop / tear down
docker compose down
```

## When you're unsure

- If a request would expand scope beyond `/SCOPE.md`: stop, note it, and ask. Don't quietly build it.
- If `/docs/API.md` and the code disagree: the contract wins; fix the code (or update the contract if explicitly told to).
- If something in these docs is genuinely broken: make the smallest sane fix, note it, and keep going.
