# pdf-forge — Security & Hardening Audit

**Date:** 2026-07-01
**Scope:** backend (`backend/app`), engine wrappers, job harness, Docker image + compose.
**Threat model:** hostile uploads (malformed / oversized / PDF-&-decompression bombs, polyglots, files that aren't really PDFs, multi-file abuse) and a homelab that *might one day be exposed beyond the LAN* (proxy bypass, direct port reach). No features added.

**Method:** a 6-dimension adversarial audit (malicious input, command/engine safety, resource exhaustion, temp-file lifecycle, exposure surface, dependency/image). Every candidate finding was independently re-checked against the code by a second reviewer whose job was to *refute* it; 2 candidates were rejected as unreachable (documented at the bottom). Findings below are the survivors, severity-corrected during verification.

**Outcome:** 2 HIGH + several MEDIUM/LOW fixed this session (14 findings closed); 5 lower-severity items deferred with rationale. Backend test suite after fixes: **44 passed, 4 skipped** (the 4 need gs/tesseract/poppler and run in-container), including 9 new regression tests for these fixes.

Severities are the *verified/corrected* values.

---

## Fixed this session

### F1 — [HIGH] Structural validation ran on the async event loop with no timeout → single-file whole-service DoS
**Dimension:** malicious input. **File:** `app/api/jobs.py`.
`submit_job` is `async`, but called `validate_pdf`/`validate_image` **synchronously** — `pikepdf.open()` + `len(pdf.pages)` (and `PIL.Image.open/verify`) are CPU-bound and ran inline in the single web process, *before* enqueue, so none of the worker guards (job timeout, `setrlimit`, kill-on-timeout) covered them. A ~200 MB PDF (under the cap) with a corrupt xref forces qpdf's whole-file recovery scan; with `worker_count=1` and one uvicorn process, that blocking parse freezes health checks, downloads, and every other request. Repeatable → trivial service-wide DoS.

**Fix:** run the structural open in a threadpool so a pathological file can't pin the loop.
```diff
+from fastapi.concurrency import run_in_threadpool
-        if is_image_op:
-            validate_image(dest, orig, allowed_ext=settings.allowed_image_ext)
-        else:
-            validate_pdf(dest, orig, allowed_ext=..., max_pages=settings.max_page_count)
+        if is_image_op:
+            await run_in_threadpool(validate_image, dest, orig, allowed_ext=settings.allowed_image_ext)
+        else:
+            await run_in_threadpool(validate_pdf, dest, orig,
+                                    allowed_ext=settings.allowed_pdf_ext, max_pages=settings.max_page_count)
```
Test: `test_security_hardening.py::test_validation_still_rejects_garbage_off_loop`.

### F2 — [HIGH] No cap on upload file-count or aggregate size → disk-exhaustion DoS
**Dimension:** malicious input / resource exhaustion. **File:** `app/api/jobs.py`, `app/core/upload.py`, `app/config.py`.
`file: list[UploadFile] = File(...)` was unbounded; the per-file 200 MB streaming cap was the *only* size guard, and `disk_precheck` reserved space for a *single* file regardless of part count. One multipart request with dozens of ~200 MB parts (e.g. to `/merge` or `/image-to-pdf`) passed the one-shot precheck and streamed tens of GB onto the disk-backed jobs volume, filling it and 507-ing every other job.

**Fix:** cap the number of parts (`PDFFORGE_MAX_INPUT_FILES=50`), cap the running total (`PDFFORGE_MAX_TOTAL_UPLOAD_MB=400` → 413), and make `disk_precheck` reserve for the actual part count.
```diff
+    if len(file) > settings.max_input_files:
+        raise invalid_options(f"Too many files in one request (max {settings.max_input_files}).")
+    upload_core.disk_precheck(..., file_count=len(file))
     for idx, uf in enumerate(file):
         written = await upload_core.stream_to_file(uf, dest, settings.max_upload_bytes)
         total += written
+        if total > settings.max_total_upload_bytes:
+            raise file_too_large(settings.max_total_upload_mb)
-def disk_precheck(target_dir, max_upload_bytes, reserve_factor):
-    if usage.free < reserve_factor * max_upload_bytes: raise disk_full()
+def disk_precheck(target_dir, max_upload_bytes, reserve_factor, file_count=1):
+    needed = (reserve_factor + max(1, file_count)) * max_upload_bytes
+    if usage.free < needed: raise disk_full()
```
Tests: `::test_too_many_files_rejected`, `::test_aggregate_upload_cap`.

### F3 — [MEDIUM] Fan-out ops write unbounded cumulative output (RLIMIT_FSIZE is per-file)
**Dimension:** resource exhaustion. **File:** `app/jobs/runner.py`, `app/config.py`.
`rasterize` at `dpi=600, pages=1-end` and `split mode=single` emit one file per page (plus a duplicate in the zip). `RLIMIT_FSIZE` bounds each file to 1 GB but nothing bounded the *sum*, so a single admitted job could fill the volume within the wall-clock window.

**Fix:** enforce a cumulative-output byte budget (`PDFFORGE_MAX_OUTPUT_MB=1024`) and an artifact-count cap (`PDFFORGE_MAX_OUTPUT_ARTIFACTS=2000`) in `execute()`, failing the job (`output_too_large`) instead of overflowing disk.

### F4 — [MEDIUM] Page-count cap skipped for encrypted PDFs and never enforced in any op
**Dimension:** resource exhaustion. **File:** `app/core/validation.py` (skip), `app/services/*` (no downstream check).
`validate_pdf` returns early for encrypted inputs (page count unknown), and no service re-checked `max_pages` after decrypt. A crafted encrypted PDF (attacker owns the password) with a huge page tree bypassed the advertised 5000-page limit and drove uncapped fan-out.

**Fix:** enforce `ctx.max_pages` inside the worker after open/decrypt in `merge`, `split`, and `rasterize` (→ `too_many_pages`). Test: `::test_encrypted_input_page_cap_enforced_in_worker`.

### F5 — [MEDIUM→worker temp-file lifecycle] Orphaned job dirs after crash/restart were never reclaimed
**Dimension:** temp-file lifecycle. **File:** `app/jobs/manager.py`.
Cleanup was driven purely by the in-memory registry; `_sweep()` only walked `self.jobs`, `shutdown()` deleted no dirs, and startup only `mkdir`'d. Any dir left by an OOM kill / `docker restart` / crash was invisible forever → slow disk leak violating the golden rule "scratch files deleted even on crash paths."

**Fix:** reconcile against the filesystem — a startup sweep removes all untracked dirs (a fresh process legitimately tracks none), and `_sweep()` now also removes on-disk dirs not tracked by any live job and older than the TTL (never touching the shared `tmp` TMPDIR).

### F6 — [MEDIUM] Slow disk/registry growth: coarse hourly janitor, no registry eviction, completed jobs impose no back-pressure
**Dimension:** resource exhaustion. **File:** `app/jobs/manager.py`, `app/config.py`.
The janitor slept 3600 s and `_sweep` never removed dict entries, so completed jobs lingered up to ~2 h and the registry grew unbounded.

**Fix:** janitor interval is now `PDFFORGE_JANITOR_INTERVAL_SECONDS` (default **120 s**), and `_sweep` evicts long-terminal `failed`/`canceled` records (succeeded→expired is retained so `/result` still returns the correct `result_gone`).

### F7 — [MEDIUM→LOW] `merge` `output_filename` bypassed `safe_stem` → Content-Disposition / zip-arcname injection
**Dimension:** command-engine / exposure. **File:** `app/services/structure.py`, `app/api/jobs.py`.
`output_filename` (free-form) was the *only* artifact name reaching the header without `safe_stem` sanitization; a value like `a"; filename="evil.exe` injected a second `Content-Disposition` param (filename spoofing), and CRLF/non-latin-1 values 500'd the download.

**Fix (defense in depth, both layers):** sanitize `output_filename` through `safe_stem` at the source, and additionally strip quote/CRLF and ASCII-encode the filename when building the header (`_content_disposition`). Test: `::test_merge_output_filename_sanitized`.

### F8 — [LOW] Document passwords written in plaintext to `_spec.json` on the durable volume
**Dimension:** exposure. **File:** `app/jobs/manager.py`, `app/jobs/worker.py`.
The raw options JSON (carrying encrypt/decrypt/permissions/merge passwords) was serialized to `_spec.json` on the non-tmpfs jobs volume, persisting until cleanup (and, for successful jobs, until TTL) — recoverable via a volume backup/snapshot.

**Fix:** the options JSON is popped out of the on-disk spec and passed to the child **via env** (`PDFFORGE_JOB_OPTIONS`) only; `_spec.json` is chmod `0600` and password-free. Test: `::test_password_not_in_spec_file`.

### F9 — [LOW] OpenAPI schema + Swagger UI served unconditionally
**Dimension:** exposure. **File:** `app/main.py`, `app/config.py`.
`/api/docs` and `/api/openapi.json` were always on — an anonymous recon map of every op/param if the app is ever reached directly.

**Fix:** gated behind `PDFFORGE_EXPOSE_DOCS` (default **False**); `redoc_url` disabled. Test: `::test_docs_disabled_by_default`.

### F10 — [LOW] `Remote-User` / `Remote-Email` trusted from raw headers → spoofable audit identity
**Dimension:** exposure. **File:** `app/core/security.py`.
Audit-only (never authz), but a direct caller could forge the `submitted_by` audit trail. Also the client-supplied `X-Request-ID` was reflected into a response header unbounded.

**Fix:** identity headers are honored only from `PDFFORGE_TRUSTED_PROXY_IPS` when that allow-list is set (empty = trust, the documented LAN default); otherwise stripped. `X-Request-ID` is CRLF-stripped and length-capped before reflection. Test: `::test_remote_user_ignored_from_untrusted_ip`.

### F11 — [LOW] OCR `languages` accepted arbitrary unbounded user strings
**Dimension:** command-engine. **File:** `app/schemas/ops.py`, `app/services/ocr.py`.
Not a live injection (ocrmypdf validates against installed packs and uses argv, not a shell), but the app placed no bound on a user list reaching an engine.

**Fix:** schema `field_validator` constrains each code to `[a-z]{3}(_[A-Za-z]+)?` with `max_length=8` (→ `invalid_options`), and the service intersects the request with the installed packs before calling the engine. Test: `::test_ocr_invalid_language_rejected`.

### F12 — [LOW] Runtime image installed `libleptonica-dev` (a dev package)
**Dimension:** dependency/image. **File:** `Dockerfile`.
Redundant (the leptonica *runtime* lib the `jbig2` binary links is already pulled by `tesseract-ocr`) and a drift from the reviewed STRUCTURE.md baseline.

**Fix:** dropped `libleptonica-dev` from the runtime stage.

---

## Confirmed-good (no change needed)

These were checked and are already correct — recording so future audits don't re-litigate:

- **Command/engine execution** is argv-only with `shell=False` everywhere (`engines/subprocess_run.py`); no user string is interpolated into a command. On-disk input names are server-generated (`input.pdf`), never the client filename, so **no argument-injection** (a `-`-leading filename can't reach an engine as a flag). Ghostscript runs with `-dSAFER`.
- **Error handling** never leaks a stack trace or engine stderr to the client (`core/errors.py`); engine stderr is logged server-side only.
- **Security headers** are solid: tight CSP (no `unsafe-eval`, `frame-ancestors 'none'`, `object-src 'none'`), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. **No CORS** middleware → same-origin only (no `Access-Control-Allow-Origin: *`).
- **3-stage validation** is in the correct fixed order (extension → magic → pikepdf structural authority) and runs **before** any engine touches the file (now off-loop, F1).
- **Container posture** (compose + Dockerfile): non-root UID 10001, `read_only` rootfs, `cap_drop: ALL`, `no-new-privileges`, `pids_limit 512`, `cpus 2 / memory 2g`, **no published host port**, disk-backed jobs volume (not tmpfs). `RLIMIT_CPU`/`RLIMIT_FSIZE` are applied in the live worker path (`execute()` → confirmed, not dead code).
- **Per-job dirs** use `mkdtemp` (unpredictable) with mode `0700`; cleanup runs on success (BackgroundTask), failure, cancel, and timeout.

---

## Deferred (with rationale)

### D1 — [LOW] Add `RLIMIT_AS` (address-space) cap in the worker
**Why deferred:** a memory-expansion bomb is already bounded by the cgroup `memory: 2g` limit + `restart: unless-stopped`, and with `worker_count=1` the OOM killer targets the worker (graceful single-job failure), not the API. Setting `RLIMIT_AS` too low would break legitimate large `gs`/`tesseract` jobs that `mmap` heavily, and tuning it safely needs in-container measurement. The cgroup limit is the correct layer; revisit only if `worker_count` is raised or the memory cap removed.

### D2 — [MEDIUM] Reproducible, hash-pinned Python dependency lock
**Why deferred:** `requirements.txt` uses floating `>=` (supply-chain / non-reproducible builds). The correct fix is a `pip-compile --generate-hashes` lockfile installed with `--require-hashes`, which must be generated against the **Python 3.13 / trixie** target to resolve the exact wheels + transitive tree; producing it blind on the dev host (3.12/Windows) risks a broken image. Action item: run `pip-compile` in the builder stage and commit `requirements.lock`, then switch the Dockerfile to `--require-hashes`. Base-image digest pinning (below) should land in the same pass.

### D3 — [LOW] Pin base images by `@sha256` digest and jbig2enc by commit SHA
**Why deferred:** `Dockerfile` uses mutable tags (`node:22-slim`, `python:3.13-slim-trixie`) and `docker/jbig2enc.sh` clones a movable tag (`0.29`). The Dockerfile header already documents this as intentional-for-now (OQ#10: monthly rebuild + Renovate digest bumps). Requires a registry digest lookup + upstream commit SHA I can't fetch reliably from here; batch with D2 under the Renovate/monthly-rebuild workflow. Build-time only, no runtime user-input path (clone is over HTTPS).

### D4 — [LOW] Concurrent `GET /result` whole-dir delete race
**Why deferred:** two simultaneous downloads of the same job can have the first-to-finish `rmtree` the dir while a second not-yet-opened reader expects it. On the Linux container target an already-opened fd keeps streaming after unlink, impact is bounded to the user's *own* job (no cross-tenant effect, no hostile-upload vector), and a refcount adds statefulness/risk disproportionate to a self-inflicted double-click. Revisit if multi-artifact `/result/{index}` fetch patterns make it common; the (now 120 s) janitor + explicit `DELETE` remain correct reclaimers.

---

## Rejected during verification (kept for the record)

- **Image decompression bomb (no explicit pixel cap in `validate_image`)** — *rejected.* Pillow's `DecompressionBombError` fires at `Image.open`/`verify` (hard-capping the canvas at intake), `worker_count=1` means queued jobs don't add concurrent RAM, `_flatten` decodes one image at a time, and `memory: 2g` bounds the worst-case transient. Only a speculative nit if an operator raised `worker_count` and dropped the memory cap.
- **Client-disconnect-during-upload leaks a scratch dir** — *rejected.* Because the endpoint takes `list[UploadFile]`, Starlette fully parses/buffers the multipart body **before** `submit_job` runs and **before** the scratch dir is created, so an aborted upload never reaches the dir-creating code; the "loop aborted uploads → fill the volume" DoS is not reproducible. (The narrow shutdown-mid-handler window is now also covered by the F5 orphan reconciliation.)
