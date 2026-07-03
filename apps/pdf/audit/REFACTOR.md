# pdf-forge — Consolidation & Refactor Audit

**Date:** 2026-07-01
**Goal:** reduce duplication and bloat **without changing behavior or scope**. No new features; no change to `/docs/API.md`. Refactor in small steps, re-running the test suite after each, and finish by re-running `/VERIFY.md`.

**Baseline before refactor:** backend suite `44 passed, 4 skipped`. Frontend builds. All `fetch()` calls already funnel through `frontend/src/lib/api.ts` (canonical — no scattered fetch found), and all error responses already flow through `core/errors.py` (canonical). Those two "consistency" axes were already clean and are left unchanged.

Findings below; the "Changes applied" section at the bottom records exactly what was collapsed and the verification result.

---

## 1. Duplication

- **D1 — pikepdf open + error mapping (2 copies).** The exact `try: pk.open_pdf(...) except pikepdf.PasswordError → wrong_password; except Exception → bad_pdf_structure` block appears in `services/finalize.py::finalize_file` and `services/structure.py::_open`. → extract `engines/pikepdf_engine.py::open_or_raise(path, password)`; both call it.
- **D2 — page-count cap (`too_many_pages`) (3 sites, 2 layers).** `services/structure.py::_enforce_max_pages` (worker), an inline copy in `services/rasterize.py` (worker), and `core/validation.py::validate_pdf` (intake). → extract one worker-side helper `services/base.py::enforce_max_pages(count, max_pages)` used by structure (2 calls) + rasterize. The intake check in `validation.py` is a distinct layer (pre-worker, part of 3-stage validation, carries a `details` payload) and stays, with its message aligned.
- **D3 — job-lifecycle prelude in the API (3 copies).** `get_job`, `get_result`, `get_artifact` each repeat `job = get_manager().get(id); if None → job_not_found; if expired → result_gone` (and result/artifact also repeat the `!= succeeded → job_not_terminal`). → `api/jobs.py::_load_job(job_id, *, require_succeeded=False)`.
- **D4 — identical exception arms.** `submit_job` has `except AppError: remove_job_dir; raise` immediately followed by `except Exception: remove_job_dir; raise` — the same body. → single `except Exception`.
- **D5 — test poll/download helpers (3 copies).** `_wait` and `_download` are re-defined in `test_finalize_structure.py`, `test_engine_ops.py`, and `test_security_hardening.py`. → move canonical `poll_job` / `download` into `tests/conftest.py`; tests import them.

## 2. Dead code

- **DC1 — `engines/ghostscript.py::images_to_pdf`.** Never called; `services/images.py` uses `img2pdf`. Remove.
- **DC2 — `core/tempdir.py::job_scratch` context manager.** Never used (the manager uses `new_job_dir`/`remove_job_dir` directly). Remove + drop the now-unused `Iterator` import.
- **DC3 — `schemas/errors.py` (`ErrorBody`, `ErrorResponse`).** Not imported anywhere; error envelopes are built as plain dicts in `core/errors.py`. Remove the file.
- **DC4 — `core/validation.py::PdfValidation`.** `validate_pdf` returns it and `validate_image` returns a media type, but **no caller consumes either return** (both are called for their raise-on-invalid side effect). Drop the dataclass; both validators return `None`. (No observable change — the values were never read.)

## 3. Consistency (one canonical pattern each)

- **Endpoint validation:** one intake path — `disk_precheck` → per-file stream cap → aggregate cap → 3-stage validate (off-loop). Already uniform after the security pass; the intake loop is extracted to a helper for readability (below).
- **Job execution:** one path — `submit` → subprocess worker (`worker.py` → `runner.execute`) → poll. Unchanged; only stale docstrings that still describe the *old* `multiprocessing.spawn` mechanism are corrected (`runner.py`, `config.py::worker_count`).
- **Error returns:** already canonical (`AppError` + `install_exception_handlers`). No change.
- **Frontend API calls:** already canonical (`lib/api.ts` only). No change.

## 4. Structure

- **S1 — `api/jobs.py` mixed intake + lifecycle + streaming.** Extract the receive-and-validate loop into `_receive_inputs(...)` and the lifecycle prelude into `_load_job(...)` so each handler is a few lines. Keeps the module one-router-per-feature per `docs/STRUCTURE.md`, just less repetitive.
- No module is over the ~300-line split threshold; `manager.py` is cohesive (single class) and left intact.

---

## Changes applied

Every step was applied small and the full suite (`pytest -p no:warnings`) re-run after each — **44 passed, 4 skipped** at every checkpoint (the 4 skips are the gs/poppler/tesseract happy paths that only run in-container). Final `pyflakes app tests` is **clean**. Frontend still builds (`✓ built`).

### Dead code removed
| # | What | File |
|---|------|------|
| DC1 | `images_to_pdf()` (never called; image→PDF uses img2pdf) | `engines/ghostscript.py` |
| DC2 | `job_scratch()` context manager + unused `Iterator` import | `core/tempdir.py` |
| DC3 | `ErrorBody` / `ErrorResponse` models (never imported; envelopes built as dicts) | **deleted** `schemas/errors.py` |
| DC4 | `PdfValidation` dataclass + its unused returns (validators now return `None`) | `core/validation.py` |

### Duplication collapsed
| # | Duplicate (before) | Canonical (after) |
|---|--------------------|-------------------|
| D1 | pikepdf open + `PasswordError→wrong_password / else→bad_pdf_structure` in `finalize.finalize_file` **and** `structure._open` (2 copies) | new `pikepdf_engine.open_or_raise()` — both call it; `structure._open` deleted |
| D2 | `too_many_pages` page-cap in `structure._enforce_max_pages` **and** inline in `rasterize` (2 worker copies) | new `services/base.enforce_max_pages()` — used by merge, split, rasterize |
| D2b | `pikepdf.Encryption(...)` built inline in `permissions` while `crypto` used `make_encryption` (inconsistent) | `permissions` now uses `pikepdf_engine.make_encryption()` too (also fixed the unused `pk` import pyflakes flagged) |
| D3 | job-load prelude (`get / 404 / result_gone / not_terminal`) repeated in `get_job`, `get_result`, `get_artifact` (3 copies) | new `api/jobs._load_job(job_id, require_succeeded=…)` |
| D4 | identical `except AppError` + `except Exception` arms in `submit_job` | single `except Exception` |
| D5 | `_wait` / `_download` poll+download helpers redefined in 3 test files | `conftest.poll_job()` / `conftest.download()`; all tests import them |

### Structure
| # | Change | File |
|---|--------|------|
| S1 | Extracted the receive-and-validate upload loop out of `submit_job` into `_receive_inputs(...)`; `submit_job` is now the enqueue skeleton | `api/jobs.py` |

### Consistency (doc corrections, no behavior change)
- `runner.py` module docstring and `config.worker_count` description updated: they described the old `multiprocessing.spawn` / `ProcessPoolExecutor` mechanism; the code has run one subprocess-per-job (`worker.py` CLI, semaphore-gated) since the M1 refactor.
- Already-canonical patterns confirmed and left untouched: **frontend API calls** all go through `lib/api.ts` (no scattered `fetch`), and **error responses** all flow through `core/errors.py` (`AppError` + handlers).

## Behavior / contract impact

**None.** No endpoint, status code, error code, response shape, on-disk layout, or option was changed; `/docs/API.md` is untouched. The only externally-observable candidates were checked and are inert:
- The `too_many_pages` message string was unified to *"That document has more than N pages."* — the machine-readable `error.code` (`too_many_pages`) and HTTP status (`400`) are unchanged; `/docs/API.md` specifies codes, not prose, so the contract holds. (Intake-side `validate_pdf` still additionally returns the `details:{max_pages}` payload it always did.)
- `validate_pdf` / `validate_image` returning `None` instead of a value: the return was never read by any caller (they are called for their raise-on-invalid effect).

## Verification (re-ran /VERIFY.md)

- Automated suite: **44 passed, 4 skipped** (unchanged count vs. pre-refactor → no test lost). The 10 feature-mapped tests named in `/VERIFY.md` (#1 finalize, #3 merge/split, #6 decrypt, #7 permissions, #11 sanitize, #12 linearize, #13 repair, #9 image→PDF, harness noop) were also run in isolation: **10 passed**.
- The 4 skipped are the container-only happy paths (#4 compress, #5 OCR, #8 rasterize, #10 extract-text); their failure-path tests pass on the bare host and their happy paths are unaffected (only shared helpers/`open_or_raise`/`enforce_max_pages` changed, all exercised by the pikepdf ops).
- `pyflakes app tests`: clean (no unused imports/names left).
- App boots (`create_app()` OK, 15 ops registered, docs gated off); frontend `npm run build` succeeds.

