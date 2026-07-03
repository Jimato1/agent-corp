# VERIFY.md — how to run + how to verify every LOCKED feature

This is the acceptance gate for pdf-forge v1. There is **one concrete check per
acceptance criterion** in `SCOPE.md §4`. "Verify" means a status code, a file
property checked with pikepdf, or an observable UI result — never "works
correctly."

Two ways to verify:
- **Automated** — `cd backend && pytest` runs the whole matrix. Engine-binary ops
  (compress/OCR/rasterize/extract-text) assert their happy path only inside the
  container (where gs/poppler/tesseract exist) and their failure path on a bare
  host. The mapping column below names the test that covers each row.
- **Manual** — the `curl` + pikepdf snippets below, against a running instance.

---

## How to run (for manual verification)

The production container publishes **no host port**. For manual verification,
expose one temporarily:

```bash
# edit docker-compose.yml: uncomment the `ports:` block (127.0.0.1:8000:8000)
# and (for a no-proxy run) the network note, then:
docker compose build
docker compose up -d
curl -s http://127.0.0.1:8000/api/health      # -> {"status":"ok","version":"..."}
```

Reusable submit-and-poll helper (bash) and an in-container pikepdf checker:

```bash
BASE=http://127.0.0.1:8000

submit() {  # submit <op> <file> [optionsJSON] -> prints job JSON, sets $JOB
  local op=$1 f=$2 opts=${3:-'{}'}
  local loc; loc=$(curl -s -D - -o /tmp/j.json \
    -F "file=@$f" -F "options=$opts" "$BASE/api/jobs/$op" | tr -d '\r')
  JOB=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' /tmp/j.json)
  until curl -s "$BASE/api/jobs/$JOB" | grep -Eq '"state":"(succeeded|failed|expired|canceled)"'; do sleep 1; done
  curl -s "$BASE/api/jobs/$JOB"; echo
}
dl() { curl -s "$BASE/api/jobs/$JOB/result${1:+/$1}" -o "${2:-out.pdf}"; }

# check a downloaded PDF with pikepdf inside the container (no qpdf CLI in the image)
pcheck() { docker compose exec -T pdfforge python -c "$1"; }
```

---

## Acceptance checklist (SCOPE §4)

> Linearization is checked via pikepdf `Pdf.open(x).is_linearized` (the image
> ships libqpdf bindings, not the qpdf CLI). Copy the output into the container
> or run the check where the file is.

### #1 Reorder / rotate / delete  — *client + `finalize`*
- **UI:** open a PDF, drag pages into a new order, rotate one page 90°, delete one
  page, click **Export**.
- **Check:** the download's page order, `/Rotate` on the rotated page, and page
  count match the edits; `pikepdf.open(out).is_linearized is True`.
- **Auto:** `tests/test_finalize_structure.py::test_finalize_strips_active_content_preserves_attachments`
  (finalize write path); client edits produced by pdf-lib.

### #2 Small merge / split (in-browser)  — *client + `finalize`*
- **UI:** merge two < 150 MB PDFs → exported page count == sum of inputs; split
  one by ranges → parts have the exact ranged counts. Both open linearized.
- **Auto:** covered server-side by #3; client path is pdf-lib `copyPages` → finalize.

### #3 Server merge / split (large or encrypted)
```bash
submit merge enc.pdf '{"passwords":["secret"]}'   # first input encrypted; add more -F file=@...
dl; pcheck "import pikepdf;print(len(pikepdf.open('/app/...').pages))"   # == sum of inputs
submit split doc25.pdf '{"mode":"ranges","ranges":["1-10","11-20","21-end"]}'
# result state succeeded; artifacts[] has 3 entries; /result is a zip; /result/0..2 fetch each
```
- **Verify:** merged page count == sum; encrypted input opens with NO password
  afterward; split → 3 artifacts, zip at `/result`, parts at `/result/0..2`.
- **Auto:** `test_finalize_structure.py::test_merge_page_counts`,
  `::test_merge_decrypts_encrypted_input_first`, `::test_split_by_ranges_three_artifacts`.

### #4 Compress (`/ebook`, 150 dpi)
```bash
submit compress scan.pdf '{"preset":"ebook","color_dpi":150}'
```
- **Verify:** state `succeeded`; `meta.output_bytes < input_bytes` **or**
  `meta.kept == "input"`; output linearized.
- **Auto:** `test_engine_ops.py::test_compress_happy` (container),
  `::test_compress_missing_engine_fails_cleanly` (bare host).

### #5 OCR (searchable PDF)
```bash
submit ocr scanned.pdf '{"sidecar":true}'
dl 0 ocr.pdf ; dl 1 text.txt          # zip members: PDF at /result/0, .txt at /result/1
docker compose exec -T pdfforge pdftotext /app/... -   # yields the recognized text
```
- **Verify:** `pdftotext` on the result yields the page's text; with `sidecar:true`
  the result is a zip with PDF at `/result/0` and `.txt` at `/result/1`.
- **Auto:** `test_engine_ops.py::test_ocr_happy` (container).

### #6 Encrypt / decrypt (AES-256, R=6)
```bash
submit encrypt doc.pdf '{"user_password":"pw1","owner_password":"own1"}'
dl; pcheck "import pikepdf;\
 exec('try:\n pikepdf.open(\'/app/...\');print(\'OPENED WITHOUT PW - FAIL\')\nexcept pikepdf.PasswordError:print(\'ok: needs password\')')"
submit decrypt enc.pdf '{"password":"secret"}'      # wrong pw -> failed job code wrong_password
```
- **Verify:** encrypted output fails to open without the password, opens with it;
  decrypt with correct password → password-free linearized PDF; wrong/absent
  password → `422 wrong_password` or a sanitized failed job (`error.code:
  wrong_password`).
- **Auto:** `test_crypto.py::test_encrypt_requires_password_to_open`,
  `::test_decrypt_roundtrip`, `::test_decrypt_wrong_password_fails`.

### #7 Permissions (advisory)
```bash
submit permissions doc.pdf '{"print":"low","modify":false,"extract":false,"owner_password":"own"}'
dl; pcheck "import pikepdf;a=pikepdf.open('/app/...',password='own').allow;print(a.extract,a.modify_other,a.print_highres)"
```
- **Verify:** pikepdf shows `extract=False`, `modify_other=False`,
  `print_highres=False`; the UI renders the **advisory** disclaimer (and warns
  owner-only PDFs still open for anyone).
- **Auto:** `test_crypto.py::test_permissions_bits_applied`.

### #8 Rasterize
```bash
submit rasterize doc.pdf '{"pages":"1","format":"png","dpi":150}'   # -> image/png single artifact
submit rasterize doc.pdf '{"pages":"1-3","format":"png"}'           # -> application/zip
submit rasterize doc.pdf '{"pages":"1","format":"pdf"}'             # -> linearized image-only PDF
```
- **Verify:** single page → `image/png`; multi-page → `application/zip`;
  `format:"pdf"` → linearized image-only PDF.
- **Auto:** `test_engine_ops.py::test_rasterize_happy` (container).

### #9 Image → PDF
```bash
submit image-to-pdf a.png '{"page_size":"a4"}'   # add more -F file=@b.png -F file=@c.png for 3 pages
dl; pcheck "import pikepdf;print(len(pikepdf.open('/app/...').pages))"   # == number of images
```
- **Verify:** N images → single PDF with N pages; `lossless:true` on
  non-CMYK/non-alpha inputs uses the img2pdf path; output linearized.
- **Auto:** `test_engine_ops.py::test_image_to_pdf`,
  `::test_image_to_pdf_rejects_non_image` (415).

### #10 Extract text (batch, no finalize)
```bash
submit extract-text doc.pdf                # response content-type text/plain, NOT application/pdf
```
- **Verify:** `text/plain` matching the document's text; no PDF produced.
  Client pdf.js shows the same text with **zero** network calls (check DevTools
  Network tab is empty during in-app extract).
- **Auto:** `test_engine_ops.py::test_extract_text_happy` (container).

### #11 Sanitize
```bash
submit sanitize doc_with_meta_and_attachment.pdf
dl; pcheck "import pikepdf;p=pikepdf.open('/app/...');print(len(p.attachments), '/Metadata' in p.Root)"
```
- **Verify:** output has no Info/XMP metadata, no `/EmbeddedFiles`, no active
  content, still opens. (Expect `0 False`.)
- **Auto:** `test_engine_ops.py::test_sanitize_strips_metadata_and_attachments`.

### #12 Linearize
```bash
submit linearize nonlinear.pdf
dl; pcheck "import pikepdf;print(pikepdf.open('/app/...').is_linearized)"   # True
```
- **Auto:** `test_engine_ops.py::test_linearize`.

### #13 Repair
```bash
submit repair broken_xref.pdf                      # openable-but-damaged -> valid linearized output
submit finalize truly_garbage.pdf                  # too broken -> 400 bad_pdf_structure at submit
```
- **Verify:** damaged-but-openable → valid linearized output; a file that fails
  the stage-3 structural open is rejected at submit with `400 bad_pdf_structure`.
- **Auto:** `test_engine_ops.py::test_repair_recovers`,
  `test_jobs_harness.py::test_truncated_pdf_400`.

### #14 Preview / thumbnails (client only)
- **UI:** open a PDF → thumbnails + page view render with **zero** network
  requests (DevTools Network tab stays empty).
- **Verify no endpoint:** `curl -i $BASE/api/preview` and `.../thumbnail` →
  not part of the 19-endpoint contract (SPA fallback / 404, never a preview API).

### #15 Finalize (canonical write path)
```bash
submit finalize doc_with_openaction_js_and_attachment.pdf
dl; pcheck "import pikepdf;p=pikepdf.open('/app/...');\
print('/OpenAction' in p.Root, ('/Names' in p.Root and '/JavaScript' in p.Root.Names), 'note.txt' in p.attachments, p.is_linearized)"
```
- **Verify:** active content stripped, attachments preserved, linearized.
  (Expect `False False True True`.)
- **Auto:** `test_finalize_structure.py::test_finalize_strips_active_content_preserves_attachments`.

### Harness (cross-cutting — gates everything)
| Check | Expected | Test |
|-------|----------|------|
| Oversized upload | `413 file_too_large` | `test_jobs_harness.py::test_oversized_upload_413` |
| `.txt` renamed `.pdf` | `415 not_a_pdf` | `::test_txt_renamed_pdf_415` |
| Truncated PDF | `400 bad_pdf_structure` | `::test_truncated_pdf_400` |
| Saturate pool+queue | `429 queue_full` + `Retry-After` | `::test_queue_full_429` |
| `DELETE` running job | `canceled`, job dir removed | `::test_delete_running_job_cancels` |
| Expired result | `404 result_gone` | `::test_ttl_expiry_result_gone` |
| Disk precheck | `507 disk_full` | `::test_disk_precheck_507` |
| Unknown op | `404 unknown_op` | `::test_unknown_op_404` |
| Bad options JSON | `422 invalid_options` | `::test_invalid_options_json_422` |

---

## Invariant conformance (root CLAUDE.md / SCOPE §5)

- **Privacy:** grep the running container logs for any document filename/content —
  none present; the worker has no network egress; client preview/edits upload
  nothing (DevTools Network empty during flows A/B/F).
- **Temp-file lifecycle:** after any job, `docker compose exec pdfforge ls
  /app/jobs` shows the per-job dir gone (deleted on result download / failure /
  cancel; hourly janitor as backstop).
- **Resource bounds:** over-capacity → `429`; per-job wall-clock kill at 300 s;
  container `--cpus 2 --memory 2g --pids-limit 512`.
- **Canonical artifact:** every durable output is linearized with active content
  stripped (rows #1–#9, #11–#13, #15 above).
- **Locked stack / posture:** non-root UID 10001, read-only rootfs, `cap_drop
  ALL`, `no-new-privileges`, no published port (verify with `docker inspect`).

## Full automated run

```bash
cd backend && pytest -q      # 35 pass + 4 skipped (gs/poppler/tesseract happy paths) on a bare host
                             # all pass inside the container image
```
