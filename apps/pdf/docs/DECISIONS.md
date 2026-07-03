# pdf-forge — Architecture & Build Decisions (v1)

> **Status:** authoritative for v1 build planning. Supersedes the open items in
> `research/SUMMARY.md` §7. Every decision here is grounded in the research tracks
> (`engine-capabilities.md`, `feature-landscape.md`, `client-vs-server-split.md`,
> `security-homelab.md`, `ux-patterns.md`, `packaging.md`). Downstream API / STRUCTURE /
> PLAN docs MUST honor the cross-cutting calls in this file.

## 0. Intro

pdf-forge v1 ships the **MUST** feature set only (SUMMARY §2): reorder/rotate/delete,
merge/split, lossy compress (Ghostscript `/ebook`), OCR (ocrmypdf), AES-256
encrypt/decrypt, set/clear permissions, rasterize, image→PDF, extract text,
sanitize/strip metadata, linearize, repair, preview/thumbnails. SHOULD/LATER features
are named but not built.

The guiding tie-breakers, in order, for every undecided point: **(1) ships v1 fastest,
(2) fewest moving parts, (3) privacy-first, (4) homelab-operable.** Where the research
left a choice genuinely open, one path is still chosen below and the rejected
alternative is named. No "it depends."

The architecture is a **single hardened container**: FastAPI serves the built Vite/React
SPA *and* runs the server PDF engines. Fast page-level edits happen client-side
(pdf.js render + pdf-lib write); heavy jobs POST to a bounded async job queue. Every
durable artifact is finalized server-side with a pikepdf normalize + linearize pass —
the backend is the canonical source of truth.

---

## 1. Cross-cutting architecture decisions

These are the calls every other document depends on.

### D1 — Job model: async `202 + poll`, not sync, not SSE (v1)

**Decision.** Heavy operations (OCR, compress, linearize, encrypt/decrypt, permissions,
rasterize, image→PDF, repair, sanitize, server merge/split) run as **asynchronous jobs**.
`POST /api/jobs/{op}` validates the upload, enqueues, and returns **`202 Accepted`** with
a job id and a `Location: /api/jobs/{id}`. The SPA **polls** `GET /api/jobs/{id}` (every
~1–2 s, with backoff) until terminal, then `GET /api/jobs/{id}/result` streams the bytes.

**Job lifecycle states (exact, single enum):**
`queued → running → succeeded | failed | expired`
plus `canceled` (client `DELETE /api/jobs/{id}` before/while running).
- `queued`: accepted, waiting for a worker. (Queue-full never enters this state — it is rejected at submit with **429**; see D3.)
- `running`: a worker owns it; subprocess executing under timeouts/rlimits.
- `succeeded`: output written to the job dir; result downloadable until the TTL janitor sweeps it.
- `failed`: terminal; carries a sanitized error code/category (validation, timeout, engine-error, oversize, disk-full).
- `expired`: TTL janitor removed the artifacts; result no longer fetchable.
- `canceled`: client withdrew; worker killed via `killpg`, dir cleaned.

**Polling, not SSE, for v1.** FastAPI has native SSE since 0.135.0, but polling is fewer
moving parts (no long-lived connection through the reverse proxy, no event-loop-held
streams), trivially survives proxy read-timeouts, and is enough for a handful of jobs
with a 1–2 worker pool. SSE/WebSocket progress is a SHOULD enhancement, not v1.

**CPU-bound work runs off the event loop** (see D3) — never inline in the request
handler. *Why:* SUMMARY §5 + security-homelab §3/§6 — sync requests make proxy
read-timeouts and request buffering matter and risk freezing the Starlette event loop
(CVE-2025-54121 class). **Rejected:** synchronous request/response (simpler client, but
504s on long OCR, no cancel, no concurrency control); SSE in v1 (more plumbing, no v1 payoff).

### D2 — Temp-file strategy: per-job dir on a disk-backed named volume

**Decision.** One directory per job: `/app/jobs/<uuid4hex>/` created with
`tempfile.mkdtemp(dir="/app/jobs")` (mode `0700`), holding `input.pdf`, engine scratch,
and `output.pdf`. **Server-generated names only** — the client filename is stored as a
string in the job record for the download `Content-Disposition`, never used as a path
component (overlong-UTF-8 `../` traversal was a real GS bug, security-homelab §1).
`TMPDIR=/app/jobs/tmp` so Ghostscript/Tesseract/qpdf scratch lands on the bounded volume.

- **Backing store:** a **disk-backed named volume** (`jobs:/app/jobs`), **not tmpfs** —
  big OCR rasters on tmpfs count against the container memory limit and OOM-kill it
  (packaging §6). Small `tmpfs /tmp` (64 MB) only for libs that hardcode `/tmp`.
- **Cleanup:** worker owns cleanup in `finally`; synchronous file returns use a
  `BackgroundTask`/`StreamingResponse` `finally` that `rmtree`s after the body flushes.
- **TTL janitor:** an in-app APScheduler/`asyncio` task sweeps any `/app/jobs/<uuid>`
  older than **1 h** (the backstop for OOM-kill/SIGKILL/power-loss orphans).
- **Disk precheck:** `shutil.disk_usage("/app/jobs")` before accepting a job; if free <
  ~4× `MAX_UPLOAD`, reject with **`507 Insufficient Storage`**.

*Why:* security-homelab §2, packaging §5. **Rejected:** tmpfs jobs dir (OOM risk),
process-wide shared scratch (cross-job leakage, fragile cleanup).

### D3 — Concurrency: in-process worker pool of 1–2 + bounded queue → 429

**Decision.** A single in-process **`ProcessPoolExecutor` (or equivalent) of 1–2 workers**
fronts all heavy jobs, with a **bounded queue**. Submit beyond capacity returns
**`429 Too Many Requests`** with `Retry-After`. CPU-bound engine work runs **in the worker
process** (subprocess of engines + Python glue), never in the FastAPI event loop.
Default pool size = `min(cores−1, RAM ÷ per-job-RAM-budget)`, default **1** on a 2-CPU/2-GB
homelab box, configurable to 2.

Each subprocess is bounded on every dimension (security-homelab §3):
- wall-clock timeout + `os.killpg(os.getpgid(pid), SIGKILL)` (kills gs/tesseract grandchildren — `subprocess(timeout=)` does not);
- `setrlimit` `RLIMIT_CPU` / `RLIMIT_FSIZE` (coarse `RLIMIT_AS` only, with the cgroup limit as the real ceiling);
- `ocrmypdf --jobs 1 --tesseract-timeout 120 --skip-big N`;
- container `--memory 2g --cpus 2 --pids-limit 512` as the hard backstop.

Client-side page ops never touch this queue — a genuine architectural win that lets the
backend pool stay tiny. *Why:* security-homelab §3, SUMMARY §5. **Rejected:** unbounded
`BackgroundTasks` (no concurrency cap → OOM); external broker (Celery/RQ/Redis) — extra
services violate single-container/fewest-moving-parts for a 1–2 job homelab.

### D4 — SPA + API in one container via `app.frontend()`, API under `/api`

**Decision.** FastAPI ≥ **0.138.0** serves the built SPA with
`app.frontend("/", directory="static", fallback="index.html")`; **all API routes live
under `/api/*`** and are registered before the frontend mount (path operations match
first, navigation GET/HEAD falls back to `index.html`, missing assets correctly 404).
`/api/health` is reserved for the healthcheck. No nginx sidecar inside the container.

*Why:* packaging §5/§7 — `app.frontend()` is purpose-built for SPA output and avoids the
hand-rolled catch-all pitfall (HTML+200 for mistyped asset URLs) and `check_dir=True`
fails fast if `dist/` wasn't copied. **Rejected:** `StaticFiles + catch-all` (kept only as
the portable fallback for FastAPI < 0.138.0); nginx sidecar (a second process/image for
zero benefit on a single-tenant box).

### D5 — Auth: at the reverse proxy; app trusts proxy headers only because it is unreachable otherwise

**Decision.** v1 assumes **auth happens at the reverse proxy**, and pdf-forge is bound to
an **internal Docker network** with no published host port — the proxy is the only path in.
v1 ships with **no app-level login**; it optionally reads `Remote-User`/`Remote-Email`
forward-auth headers for display/audit only. Recommended proxy auth: **Authelia
forward-auth** (SSO + 2FA) for multi-service homelabs; **Basic-over-TLS** is the supported
single-user stopgap.

*Why:* security-homelab §5 — LAN is not a boundary; forward-auth headers are forgeable iff
the app port is published, so the non-publish rule is load-bearing. Building auth into a
PDF tool is reinventing a security primitive. **Rejected:** app-level auth in FastAPI
(more surface, worse than a real IdP); trusting the LAN (explicitly not a boundary).

### D6 — Base image & system deps (locked packaging snapshot)

**Decision.** Three-stage build: **`node:22-slim`** (build Vite → `dist/`) →
**`python:3.13-slim-trixie`** builder (venv via `uv sync --frozen` or pip + lockfile) →
**`python:3.13-slim-trixie`** runtime. Debian **slim/trixie** — *not* Alpine (musl/font/OCR
edge cases), *not* distroless (multi-binary shell-out pipeline). Pin base images by
**digest**; `npm ci` from `package-lock.json`; Python lockfile.

**Runtime apt set (`--no-install-recommends`, single RUN, `rm -rf /var/lib/apt/lists/*`):**
`ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu poppler-utils unpaper
pngquant fonts-noto-core` (+ `fonts-noto-cjk` only if CJK shipped). **`qpdf` apt package is
dropped** (see OQ#15 — pikepdf bundles libqpdf). **Build `jbig2enc` from source** in the
builder stage (best mono-scan compression; not in Debian apt). Bundle **veraPDF** for the
PDF/A path (SHOULD, but staged in the image now). pikepdf/pypdf via wheels — no apt for them.

**Runtime hardening:** non-root UID **10001**, read-only rootfs, disk-backed named volume
for `/app/jobs`, small tmpfs `/tmp`, `TMPDIR=/app/jobs/tmp`, `OMP_THREAD_LIMIT=1`,
`cap_drop ALL`, `no-new-privileges`, `pids_limit`, ~2 CPU / 2 GB limits, internal network
(no egress for the worker). Python urllib `/api/health` healthcheck (no curl in slim).
Expected image **~600 MB–1 GB on disk**. *Why:* packaging §1–§7, security-homelab §6.
**Rejected:** Alpine, distroless, nginx sidecar, apt `qpdf`.

### D7 — Reconciliation: upload edited bytes (Option A) + pikepdf finalize; 150 MB client/server line

**Decision.** Client edits (reorder/rotate/delete/merge/split) are reconciled by
**uploading the edited bytes** (Option A), not an op manifest. Every heavy job ends with a
**pikepdf `save(linearize=True)` normalize pass** — one stateless pipeline, single source
of truth. Always **decrypt server-side with pikepdf first** before any pdf-lib/server op
(pdf-lib cannot decrypt; `{ignoreEncryption:true}` yields garbage).

**Size threshold (configurable):** browser path for files **< 150 MB**; **150–300 MB**
offload page ops to the pikepdf backend too; **> ~300–500 MB** server-only/streamed; keep
the single client `ArrayBuffer` well under 1 GB (Chrome caps ~2 GB / `0x7fe00000`). Gate on
`file.size` + `navigator.deviceMemory`.

*Why:* client-vs-server-split §5/§6 — Option A is stateless with no pdf-lib↔pikepdf replay
drift, and the "tiny manifest" saving is illusory (the original must reach the server
anyway). **Rejected:** op-manifest reconciliation (versioned schema + replay engine +
server-held original state, for no v1 benefit).

### D8 — CLI shell-out policy: bindings for qpdf, CLI for poppler/gs/ocrmypdf/tesseract

**Decision.** All qpdf-family operations (structural edit, decrypt, repair, encrypt,
permissions, linearize) go through **pikepdf bindings only** — **no `qpdf` CLI, no apt
`qpdf`**. We **do shell out** to: `ghostscript` (compression, image→PDF, PDF/A fallback),
`ocrmypdf`/`tesseract` (OCR), and **`poppler-utils`** CLIs (`pdftocairo`/`pdftoppm` for
server thumbnails & rasterize fallback, `pdftotext` for batch text, `pdfimages` for image
extraction). poppler-utils therefore stays in the image; qpdf does not. *Why:* SUMMARY §4,
packaging §3, OQ#15. **Rejected:** shelling out to `qpdf` (duplicate of the bundled libqpdf
— two code paths to secure for one engine); a poppler binding lib (poppler CLIs are already
present, well-bounded, and trivial to subprocess-cap).

---

## 2. Open-question resolutions (OQ#1 – OQ#17)

| OQ | Question | Decision | Why |
|----|----------|----------|-----|
| **1** | Text-generation engine: reportlab vs pdfcpu? | **Directional. v1: not built** (watermark/Bates/page-numbers/typed-sign/add-text are SHOULD). **When built: reportlab** — render the text/watermark as an overlay PDF and merge with pikepdf/pypdf. | reportlab is pure-Python (BSD), adds **no system binary** and runs inside the existing worker; pdfcpu would add a Go binary to the image. Fewest moving parts wins; pdfcpu's `%p/%P` page-number convenience isn't worth a sixth executable. |
| **2** | Add a 6th engine (mutool/MuPDF, AGPL)? | **No for v1.** Destructive rasterize-then-scrub (poppler + pikepdf) is the v1 redaction path. Revisit only in v2 *if* true text-level redaction is demanded. | Avoids an AGPL dependency and a sixth engine; SUMMARY §2/§7 already accepts destructive rasterization for v1. |
| **3** | AcroForm flatten reliability (no clean locked-engine API)? | **Directional. v1: no durable flatten.** Simple form *fill* is client-side pdf-lib/pdf.js convenience only, non-durable. **When built (SHOULD): Ghostscript flatten primary, pdfcpu fallback,** gated behind a code spike. | Durable flatten needs a spike and isn't MUST; deferring keeps v1 honest. Ghostscript is already in the image, so the eventual path adds nothing new. |
| **4** | PDF/A conformance target (2b/3b/1)? Bundle veraPDF? | **Directional. v1: PDF/A not a user feature** (OCR may emit PDF/A via ocrmypdf's `auto`). **When built: PDF/A-2b default; bundle veraPDF** (staged in the image now). | 2b is the broad-compatibility middle (allows JPEG2000/transparency, no 3b embedded-file mandate, no 1b restrictions); veraPDF prevents ocrmypdf's silent plain-PDF fallback (SUMMARY §8, split §3). |
| **5** | Sync vs async (202 + poll/SSE) default for heavy jobs? | **Async `202 + poll`** (see D1). SSE deferred. | Survives proxy read-timeouts/buffering, keeps CPU work off the event loop, fewest moving parts for 1–2 concurrent jobs (security-homelab §3/§6). |
| **6** | Acceptable max upload size? | **`PDFFORGE_MAX_UPLOAD_MB=200` default** (configurable), enforced by a streaming byte-counter → **413**; reverse-proxy body cap set **≥ 200 MB**; `/app/jobs` volume sized **≥ 5×** the cap (~1 GB+); client/server op line at **150 MB** (D7). | 200 MB covers the overwhelming majority of homelab PDFs while bounding per-job RAM and `/work` blast radius; larger limits inflate the volume and OCR-raster RAM budget (security-homelab §2/§3, packaging §6). |
| **7** | GS sandbox depth: stock seccomp vs gVisor/microVM? | **v1: stock Docker default seccomp + the full posture** (non-root, `cap_drop ALL`, `no-new-privileges`, read-only rootfs, tmpfs/volume-only writes, **no worker egress**). **gVisor/`runsc` documented as an optional opt-in**, not default. | That container posture already neutralizes the entire GS SAFER-bypass lineage (security-homelab §6); gVisor adds real homelab complexity for marginal gain. Homelab-operable + fewest moving parts. |
| **8** | Active-content stripping: always vs opt-in? | **Always strip executable/active content** (`/JavaScript`, `/JS`, `/OpenAction`, `/AA`, `/Launch`) in the server normalize pass. **Preserve embedded files/attachments by default**; remove them only via the explicit one-click **Sanitize** and **mandatorily on redaction**. | Stripping active content is pure attack-surface reduction with no fidelity cost and is on-brand privacy (security-homelab §6); blanket attachment removal would break legitimate form/attachment fidelity, so it stays opt-in. |
| **9** | Multi-user model / per-user ACLs? | **v1: single-tenant.** Per-job temp-dir isolation only; **no per-user ACLs.** Auth at the proxy gates the whole app. | The homelab target is effectively single-operator; per-user ACLs add state and surface for no v1 value (security-homelab §5). |
| **10** | Unattended base-image rebuild in scope? | **In scope as ops guidance, reviewed not auto-applied.** Ship pinned digests + a documented **monthly scheduled CI rebuild**; recommend **Renovate** (PR-based digest bumps). **Avoid Watchtower auto-pull.** | The relentless GS CVE cadence makes rebuilds mandatory, but unreviewed auto-pull breaks reproducible pinned builds; Renovate keeps the human-review gate (packaging §7, security-homelab §6). |
| **11** | DnD library trajectory? | **Ship on classic `@dnd-kit/core` 6.3.1 now.** Document **Pragmatic Drag and Drop** as the migration fallback. **Do not use `@dnd-kit/react` 0.5.0 in prod.** Migration timing deferred. | Confirms the second-pass recommendation (SUMMARY §7/§8): classic dnd-kit is stable-enough for the page-grid; 0.5.0 is pre-1.0 and risky. |
| **12** | Client pdf-lib export-in-a-worker robust enough for large merges? | **Yes, gated by the 150 MB line (D7).** Run pdf-lib `save()` in a **Web Worker** for files **< 150 MB**; **route byte assembly to the pikepdf backend above** the threshold. Below threshold a simple spinner suffices (no progress bar). | Worker export keeps the UI responsive and the privacy/zero-upload win for the common case; pdf-lib holds ~2–3× file size during save, so large merges must go server-side anyway (split §6). |
| **13** | Empirical benchmarks (OCR throughput, concurrency RAM, raster caps, pypdf decrypt robustness)? | **Not v1 blockers.** Adopt conservative defaults now (**pool 1**, `--jobs 1`, `--tesseract-timeout 120`, `--skip-big`, lazy `OffscreenCanvas` with explicit page cleanup) and schedule a **pre-GA measurement spike** on the target CPU to tune pool size and L1 ImageBitmap cap. | Architecture doesn't hinge on exact numbers; conservative defaults are safe and tunable later (security-homelab §3, split §6). |
| **14** | GS version/preset verification on the pinned build? | **Pin GS by digest; run a one-time verification spike** on the pinned trixie GS, then **set explicit flags** (`-dPDFSETTINGS=/ebook` **plus** explicit `-dColorImageResolution=150`, `-dDownsampleColorImages=true`, and an explicit `-dColorConversionStrategy`) rather than relying on preset defaults. | `/default` values and RGB-vs-sRGB `ColorConversionStrategy` drift across GS versions (SUMMARY §7/§8); explicit flags make output reproducible regardless of preset drift. |
| **15** | Do we shell out to qpdf and poppler CLIs? | **qpdf CLI: NO** (pikepdf bindings only; drop apt `qpdf`). **poppler-utils CLI: YES** (server thumbnails/rasterize fallback/`pdftotext`/`pdfimages`). See **D8**. | One qpdf code path is easier to secure and test than a bundled-lib + CLI pair; poppler CLIs are genuinely used server-side and easy to subprocess-bound (SUMMARY §4, packaging §3). |
| **16** | pdf.js v6 `enableHWA` behavior in the direct `render()` path? | **Ship with software (CPU) canvas rendering as the baseline; pass `enableHWA` opportunistically** and confirm with a quick spike. GPU toggle is a perf nicety, not a correctness dependency. | Removed from the viewer layer in v6; a spike confirms the direct `render()` path, but v1 must not depend on GPU canvas being honored (SUMMARY §7). |
| **17** | pdf.js editor-annotation / form-fill save fidelity across readers? | **v1: do not rely on client-saved annotation/form blobs as durable.** Treat pdf.js editor output as view-scoped convenience; **any durable artifact goes through the server pikepdf finalize pass.** Annotate/form-fill are SHOULD anyway. **Run a round-trip test before relying on client blobs** when those features ship; **when built, server-side fill (pypdf) is canonical.** | pdf.js editor annotations are HTML overlays that may not embed cleanly for other readers (split §1/§8); making the server pass canonical avoids cross-reader fidelity surprises. |

---

## 3. Deferred-but-directional notes

These are explicitly **not built in v1** but have a chosen direction so they never block v1
planning:

- **Text engine (OQ#1):** when watermark / Bates / page numbers / typed Fill&Sign / add-text
  ship (SHOULD) → **reportlab** overlay merged via pikepdf/pypdf. No new container binary.
- **Image stamps / signatures (SHOULD, ship-first of the SHOULD tier):** pure overlay via
  pikepdf (or client pdf-lib) — needs **no** text engine, so it can land before OQ#1 is built.
- **AcroForm durable flatten (OQ#3):** Ghostscript flatten primary, pdfcpu fallback, behind a spike.
- **PDF/A (OQ#4):** PDF/A-2b default, veraPDF bundled (image already staged for it).
- **True text-level redaction / MuPDF (OQ#2):** out for v1 (destructive rasterization accepted); v2-only reconsideration, AGPL caveat noted.
- **PKI / PAdES signing, PDF→Office, PDF compare:** LATER/experimental per SUMMARY §2 — not on the v1 path; document caveats (no AATL in a homelab; LibreOffice single-flight; pixel/text diff ≠ Acrobat Compare).
- **SSE/WebSocket job progress (D1):** enhancement over polling once justified by UX.
- **Multi-user ACLs (OQ#9) & gVisor worker (OQ#7):** opt-in hardening for later, not v1 defaults.
- **Benchmarks (OQ#13) & GS preset verification (OQ#14):** scheduled pre-GA spikes; v1 runs on conservative explicit defaults until measured.
