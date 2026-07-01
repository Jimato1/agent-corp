# pdf-forge — Security & Homelab Operational Concerns

Research track: **security-homelab**. Scope: making the FastAPI single-container app safe to run in a homelab, LAN-only, behind a reverse proxy. pdf-forge ingests arbitrary user-supplied PDFs and feeds them to native parsers (pikepdf/qpdf, pypdf, ocrmypdf+Tesseract, Ghostscript, poppler). **Every uploaded PDF must be treated as hostile.** A PDF is a feature-rich container that can carry JavaScript, launch/open actions, embedded files, malformed objects engineered to crash or exploit a C/C++ parser, and PostScript that has *repeatedly* broken out of Ghostscript's `-dSAFER` sandbox — including a bug actively exploited in the wild in 2024.

The threat model is **not** "a hacker on the internet" (you're LAN-only). It is **a malicious or malformed document detonating inside your container** and using your homelab box as a foothold, an egress beacon, or a denial-of-service target. The headline posture: **defense in depth around the *engines*, not the network. LAN is not a security boundary, and `-dSAFER` is not a trust boundary.**

> This file is a second-pass merge that supersedes the session-1 draft. The bones of session 1 held up well; the main updates are (a) a substantially expanded and current CVE picture for Ghostscript through 2025, (b) two newly-relevant **Starlette** multipart DoS CVEs that change the upload-handling advice, (c) naming the pdf.js RCE (CVE-2024-4367), and (d) corrected version/default details. See "Changes vs. session 1" near the end.

---

## 1. Safe upload handling

### Never trust the client
- **Never trust the `Content-Type` header or the filename extension.** Both are attacker-controlled. The browser will happily send `Content-Type: application/pdf` for a ZIP bomb, an EPS payload, or a polyglot. (The actively-exploited Ghostscript CVE-2024-29510 was delivered as **EPS files disguised as JPGs** — extension/MIME tells you nothing.)
- Validate **magic bytes** server-side. A real PDF contains `%PDF-` (`25 50 44 46 2D`) near the start. The spec/Adobe readers tolerate leading junk before the header, and qpdf will scan for it, so scan the first ~1 KB rather than insisting on offset 0. `libmagic` via `python-magic` reads a buffer and returns a MIME guess.

```python
import magic  # python-magic
head = await upload.read(2048)
await upload.seek(0)
if magic.from_buffer(head, mime=True) != "application/pdf":
    raise HTTPException(415, "Not a PDF")
```

- Treat `libmagic` as a **first-pass filter, not a guarantee** — it is heuristic and polyglots can satisfy a `%PDF` check while also being valid in another format. The authoritative validation is "does pikepdf/qpdf open it without error" (see §6). Layer it: extension allow-list → magic bytes → structural open with pikepdf.

### Filename sanitization
- The client filename is **display metadata only**. Never use it to build a path on disk. Path-traversal payloads (`../../etc/...`), NUL bytes, Windows reserved names (`CON`/`AUX`), and overlong UTF-8 all arrive in `upload.filename`. (Note: overlong-UTF-8 directory traversal was itself a Ghostscript bug class — CVE-2024-46954 / CVE-2024-46952 — so don't pass raw client names to *any* downstream tool.)
- **Generate your own filename**: `f"{uuid4().hex}.pdf"`. If you must echo the original name to the user (e.g. the download name), sanitize with `werkzeug.utils.secure_filename` or `pathvalidate`, and keep the original only as a **string in your job record**, never as a filesystem path component.

### Streaming to disk vs. memory (UploadFile / SpooledTemporaryFile)
- FastAPI's `UploadFile` wraps `tempfile.SpooledTemporaryFile`: content stays in RAM until it exceeds a rollover threshold, then spills to a temp file on disk. **Starlette's `MultiPartParser.spool_max_size` default is `1024*1024` (1 MB)** — confirmed in source. PDFs for OCR are routinely 10–500 MB, so they *will* spill to disk, which is what you want; you don't want hundreds of MB pinned in process RAM.
- **`UploadFile` itself imposes no max size.** A client can stream gigabytes; SpooledTemporaryFile just keeps rolling to `/tmp` until the disk is full. You must enforce a cap yourself.
- **FastAPI issue #5777:** passing your own `spool_max_size` to `UploadFile` is awkward because the framework constructs the spool for you. Simplest robust pattern: stream the body to your own staging file with a running byte counter and abort on overflow.

```python
MAX_BYTES = 500 * 1024 * 1024
async def save_capped(upload: UploadFile, dst: Path):
    written = 0
    async with aiofiles.open(dst, "wb") as f:
        while chunk := await upload.read(1024 * 1024):   # 1 MiB chunks
            written += len(chunk)
            if written > MAX_BYTES:
                await f.close(); dst.unlink(missing_ok=True)
                raise HTTPException(413, "File too large")
            await f.write(chunk)
```

### Two Starlette multipart DoS CVEs you must patch past (NEW)
The multipart parser that powers `UploadFile` has had **two** denial-of-service CVEs that bear directly on this app:

| CVE | Mechanism | Fixed in | What it means for you |
|---|---|---|---|
| **CVE-2024-47874** | Form parts **without a filename** are treated as text fields and buffered into byte strings with **no size limit** → unbounded RAM/OOM. | Starlette **0.40.0** | Pin `starlette >= 0.40.0`. 0.40.0 added a `max_part_size` (default **1 MB**) for non-file parts; you can also pass `max_files` / `max_fields` to `request.form()`. |
| **CVE-2025-54121** | When a file crosses the spool threshold, the **rollover write to disk happened on the event-loop thread**, blocking the whole server during I/O → DoS. | Starlette **0.47.2** | Pin `starlette >= 0.47.2`. The fix predicts the rollover and routes it to the threadpool. |

**Action:** require a current Starlette (>= 0.47.2 transitively via FastAPI) and, regardless, do your own streaming cap as above — the framework limits are a backstop, not the whole story.

### Two layers of size caps (defense in depth)
1. **Reverse-proxy cap** (see §4) — cheapest; rejects before bytes hit Python.
2. **App-level cap** — because the proxy can be misconfigured or bypassed on the LAN, and because you want a clean `413` JSON error, not a proxy HTML page. Starlette ships no body-size-limit middleware; count bytes as you stream. `Content-Length` early-reject is a nice optimization but is spoofable/absent on chunked transfers, so the streaming counter is the real guard.

| Layer | Mechanism | Catches |
|---|---|---|
| Reverse proxy | `client_max_body_size` etc. | Most oversized uploads, cheaply, before app |
| App ingest | streaming byte counter → 413 + patched Starlette | Chunked/spoofed length, proxy misconfig, multipart-field OOM |
| Disk | per-job temp dir on a size-bounded volume / quota | Slow-drip exhaustion, many concurrent jobs |

---

## 2. Temp-file lifecycle

### Staging layout
- **One unique directory per job**, e.g. `/work/jobs/<uuid>/` holding `input.pdf`, `output.pdf`, engine scratch. `tempfile.mkdtemp(dir="/work/jobs")` gives a `0700` dir with a collision-free name. Per-job isolation makes cleanup a single `shutil.rmtree` and stops one job reading another's files.
- Put `/work` on a **dedicated volume/tmpfs with a known size cap**, separate from the OS root, so PDF processing can never fill the system disk.
- Point engine scratch at the same controlled location: set `TMPDIR` for the worker process. Ghostscript, Tesseract, and qpdf all honor `TMPDIR`, so their scratch lands on the bounded volume and gets swept. Keep all outputs (`-sOutputFile`) inside the job dir.

### Guaranteed cleanup
- **Synchronous job:** wrap in `tempfile.TemporaryDirectory()` or `try/finally`. The `finally` must run even on engine crash/timeout.

```python
job_dir = Path(tempfile.mkdtemp(dir="/work/jobs"))
try:
    ...  # write input, run engine, stream output back
finally:
    shutil.rmtree(job_dir, ignore_errors=True)
```

- **If you return the output file in the response**, you can't delete it before it's sent. Use FastAPI's `BackgroundTask` attached to the response (it runs *after* the body is flushed), or a `StreamingResponse` whose generator deletes in its own `finally`:

```python
from starlette.background import BackgroundTask
return FileResponse(out, media_type="application/pdf",
                    background=BackgroundTask(shutil.rmtree, job_dir, ignore_errors=True))
```

- **Async/queued jobs:** the worker that owns the job owns cleanup in `finally`. Don't rely on the request handler — it returned long ago.

### TTL sweeper for orphans
`finally` blocks miss the hard cases: container OOM-killed mid-job, SIGKILL, power loss. Add a **janitor** that periodically `rmtree`s any `/work/jobs/<uuid>` whose mtime is older than a TTL (e.g. 1 h). Run it as an APScheduler/`asyncio` task inside the app or a tiny cron in the container. This is your backstop against slow leakage.

### Disk-exhaustion protection
- A single huge upload, a decompression / "PDF bomb" that explodes during OCR rasterization, or many concurrent jobs can each blow the disk.
- Mitigations: (1) **bounded `/work` volume** so the blast radius is contained and OS root stays healthy; (2) `shutil.disk_usage("/work")` precheck before accepting a job — reject with `507 Insufficient Storage` if free space < N×max-upload; (3) **concurrency cap** (§3) bounds simultaneous scratch usage; (4) **`RLIMIT_FSIZE`** on engine subprocesses caps any single output file; (5) **TTL sweeper** reclaims orphans.

---

## 3. Resource limits (CPU / memory / time / concurrency)

Heavy engines (`ocrmypdf`, `gs`) are CPU-, RAM-, and time-hungry, and a hostile PDF is designed to maximize all three. Bound every dimension.

### Per-subprocess timeout (and actually kill the tree)
`subprocess.run(..., timeout=...)` raises `TimeoutExpired` but **kills only the direct child**. `ocrmypdf` spawns `gs`, `tesseract`, `pngquant`, etc.; those grandchildren survive and keep burning CPU. **Start the child in its own session/process group and kill the group.**

```python
import os, signal, subprocess
p = subprocess.Popen(cmd, start_new_session=True)        # setsid → new process group
try:
    p.communicate(timeout=600)
except subprocess.TimeoutExpired:
    os.killpg(os.getpgid(p.pid), signal.SIGKILL)         # nuke the whole tree
    p.wait()
```

(pdf-forge runs in a Linux container, so process groups are the right tool. `preexec_fn`/`start_new_session` are POSIX-only — fine here.)

### Per-subprocess memory / CPU caps
Use `preexec_fn` to apply `resource.setrlimit` in the child before exec: `RLIMIT_AS` (address space), `RLIMIT_CPU` (CPU seconds), `RLIMIT_FSIZE` (output size — caps PDF bombs), optionally `RLIMIT_NPROC`.

```python
import resource
def limits():
    resource.setrlimit(resource.RLIMIT_AS,   (2*1024**3, 2*1024**3))
    resource.setrlimit(resource.RLIMIT_CPU,  (600, 600))
    resource.setrlimit(resource.RLIMIT_FSIZE,(1*1024**3, 1*1024**3))
subprocess.Popen(cmd, preexec_fn=limits, start_new_session=True)
```

- **Caveat:** `RLIMIT_AS` limits *virtual* address space; modern allocators (and anything using `mmap`/threads) over-reserve, so a too-tight `RLIMIT_AS` can spuriously kill a legitimate job. Treat it as a coarse guard and let the **container cgroup memory limit** be the real ceiling.
- **Caveat:** `preexec_fn` is async-signal-unsafe in theory. In practice it's the standard approach; keep the function tiny (only `setrlimit` calls).

### ocrmypdf / Ghostscript built-in knobs
- **`ocrmypdf -j/--jobs N`** controls internal parallelism (Tesseract/Ghostscript worker processes). The default uses available CPU cores; **pin it small (1–2)** per job so one document can't fan out across all cores. Bound total worker concurrency separately (below).
- **`--tesseract-timeout`** defaults to **180 s per page**; lower it (e.g. 60–120 s) so a pathological page can't hang. `--skip-big N` skips pages above N megapixels — a cheap rasterization-bomb guard.
- **Ghostscript:** invoke with explicit `-dSAFER -dNOPAUSE -dBATCH`, and cap rasterization resolution (`-r150` or similar) so a page with an absurd MediaBox can't allocate gigantic buffers. (`-dSAFER` is **default-on** in Ghostscript ≥ 9.50, but pass it explicitly anyway, and do not assume it holds — see §6.)

### Bounding concurrency / queue depth (the OOM guard)
The single biggest homelab failure mode: two or three simultaneous OCR jobs each grab 2–4 GB and the box OOM-kills the container (or the host). **Serialize heavy jobs.**
- Run a small in-process job queue with a worker pool of **1–2** (size to `min(cores-1, RAM / per-job-RAM)`), fronted by an `asyncio.Semaphore` / bounded queue that returns **`429 Too Many Requests`** (or `503`) when full rather than accepting unbounded work.
- Fast client-side ops (reorder/rotate/delete/preview) **never hit this** — they run in the browser per the hybrid architecture. Only OCR/compress/linearize/encrypt are queued, so backend heavy-job concurrency can be tiny. This is a genuine architectural advantage.
- Set container `--memory`, `--cpus`, `--pids-limit` as the hard backstop so even a runaway can't take the host down.

| Limit | Where | Purpose |
|---|---|---|
| Wall-clock timeout + `killpg` | per subprocess | hung/looping engine + grandchildren |
| `RLIMIT_AS`, `RLIMIT_CPU`, `RLIMIT_FSIZE` | `preexec_fn` | runaway RAM/CPU/output bomb |
| `--jobs 1–2`, `--tesseract-timeout`, `--skip-big` | ocrmypdf | per-job fan-out + per-page hang + raster bomb |
| Worker pool 1–2 + bounded queue → 429 | app | cross-job OOM, queue overflow |
| `--memory`, `--cpus`, `--pids-limit` | container | host-level backstop / real mem ceiling |

---

## 4. Reverse-proxy upload-size & timeout pitfalls

Two failure modes dominate: **413** (proxy body cap too low) and **504** (proxy gives up before a long OCR job finishes).

### nginx
Default **`client_max_body_size` is 1 MB** → instant `413` on any real PDF. Default `proxy_read_timeout` is **60 s** → `504` on long OCR.

```nginx
server {
    client_max_body_size 500m;        # match your app MAX_BYTES
    client_body_timeout  300s;        # slow uploads over wifi

    location /api/ {
        proxy_pass http://pdf-forge:8000;
        proxy_read_timeout    900s;    # long OCR jobs
        proxy_send_timeout    900s;
        proxy_request_buffering off;   # stream upload to app, don't buffer whole body to disk first
        proxy_http_version 1.1;
    }
}
```

- `proxy_request_buffering off` matters for large uploads: by default nginx **buffers the entire request body to a temp file before forwarding**, doubling disk I/O and latency and adding its own `client_body_temp` footprint. Turning it off streams to the app. (Trade-off: the app then sees a slow client directly — acceptable on a LAN.)
- **Better:** don't hold the HTTP connection open for the whole OCR. Use the **async-job pattern** — `POST` returns `202 + job id`, client polls `GET /jobs/{id}`. Then proxy read-timeouts stop mattering. Strongly recommended for OCR/compress.

### Caddy
**No default body limit** (accepts anything → disk risk), so you must set one. Caddy is the easiest homelab proxy (automatic local TLS).

```caddy
pdf-forge.lan {
    request_body { max_size 500MB }
    reverse_proxy pdf-forge:8000 {
        transport http { read_timeout 900s }
    }
}
```

### Traefik
Body size is **not limited by default**; add a `buffering` middleware. Note Traefik's `buffering` writes the body to memory/disk, which conflicts with streaming large uploads — another reason to prefer the async-job pattern.

```yaml
# docker labels
- "traefik.http.middlewares.pdfbody.buffering.maxRequestBodyBytes=524288000"  # 500MB
- "traefik.http.routers.pdf-forge.middlewares=pdfbody"
# long jobs: raise transport/forwarding + server read timeouts on the entrypoint
```

**Rule of thumb:** proxy body cap ≥ app `MAX_BYTES`; proxy read timeout ≥ worst-case engine timeout — *or* sidestep entirely with async jobs.

---

## 5. Auth options for LAN

**LAN-only is not a security boundary.** A compromised IoT device, a guest on wifi, or a phone with a malicious app is already "on the LAN." Put auth in front of pdf-forge.

| Option | Effort | Strength | Verdict for homelab |
|---|---|---|---|
| **forward-auth (Authelia/Authentik) at proxy** | medium | strong: SSO, 2FA, per-host policy, session mgmt | **Recommended** if you run a proxy + a couple of services |
| HTTP Basic auth at proxy (over TLS) | trivial | weak-ish: shared cred, no 2FA, no logout | Fine single-user stopgap |
| App-level auth in FastAPI | you build it | only as good as you build it | Avoid — don't reinvent auth in a PDF tool |

### Recommendation: forward-auth (Authelia or equivalent) at the proxy
- The proxy issues an `auth_request` subrequest to Authelia (`/api/authz/auth-request` / `/api/verify`); unauthenticated users are redirected to the Authelia portal; on success Authelia returns `Remote-User`/`Remote-Email`/`Remote-Groups` headers injected upstream. pdf-forge can read those headers — but **only trust them because the app is unreachable except via the proxy.** If the app port is published, anyone on the LAN can forge those headers.
- nginx needs the `http_auth_request` module (standard in most builds). Authelia ships ready-made `proxy.conf` / `authelia-location.conf` / `authelia-authrequest.conf` snippets.
- You get 2FA, single login across all homelab apps, and centralized session/logout, with pdf-forge owning no credential logic.

### Pragmatic fallback
- Single user (just you)? **Basic auth at the proxy over TLS** (Caddy `basicauth`, nginx `auth_basic`) is one line and keeps casual LAN access out. Upgrade to Authelia when you add services.
- Either way: **bind pdf-forge to the proxy's internal network only** — don't publish `8000` on the host — so the only path in is the authenticated proxy.

---

## 6. RCE / malicious-PDF risk — hardening checklist

### Why this is the real threat
- PDFs can embed JavaScript, launch/open actions, embedded files, and malformed objects crafted to exploit C/C++ parsers. pdf-forge's engines are all native code: **qpdf** (pikepdf), **Ghostscript**, **Tesseract**, **poppler**. Any can have a memory-corruption CVE.
- **Ghostscript is the crown jewel of risk**, and the CVE stream is *ongoing*, not historical. Its `-dSAFER` sandbox has a long bypass history, and a 2024 bug was exploited in the wild:

| CVE | Year | Nature | Fixed in |
|---|---|---|---|
| CVE-2018-16509 / CVE-2019-6116 | 2018–19 | `-dSAFER` bypass (Ormandy) → RCE | < 9.50 era |
| CVE-2019-10216 / -14811/-14812/-14813 | 2019 | Overwrite security flags to escape SAFER | 9.50 (locks critical dicts) |
| CVE-2020-15900 | 2020 | Buffer-length flaw → heap manip / SAFER disable | 9.52 |
| CVE-2021-3781 | 2021 | `%pipe%` device → command execution | 9.55 |
| CVE-2023-28879 | 2023 | Buffer overflow → SAFER disable → RCE via pipe | 10.01.1 |
| **CVE-2024-29510** | **2024** | **Format string in `uniprint`; modifies device args after SAFER set → SAFER bypass / RCE. ACTIVELY EXPLOITED (EPS disguised as JPG).** | **10.03.1** |
| CVE-2024-29506/07/09/11 + 33869/70/71 | 2024 | Buffer overflows, arbitrary file read/write, pointer leak | 10.03.1 |
| CVE-2024-46951…46956 | 2024 | Buffer overflows + **overlong-UTF-8 `../` directory traversal** | 10.04.0 |
| CVE-2024-46954 (incomplete-fix follow-up) | 2024/25 | Arbitrary file access via truncated/invalid-UTF-8 path | 10.05.0 |
| CVE-2025-27830…27837 | 2025 | 8 vulns incl. buffer overflows | 10.05.0 |
| CVE-2025-59798…59801 (incl. `pdf_write_cmap` stack overflow) | 2025 | Memory corruption | 10.06.0 |

**Pattern: assume `-dSAFER` will be bypassed eventually. The mitigation is to keep Ghostscript patched (pin to the latest 10.0x line — track [ghostscript.com/releases/cve](https://ghostscript.com/releases/cve/index.html)) AND contain it as if it had no sandbox at all.**

- **poppler** (pdftoppm/pdftocairo used for previews/raster) and **Tesseract/leptonica** also have their own image-decoder CVE history — patch them on the same cadence.
- ocrmypdf's own docs are blunt: *"OCRmyPDF should only be used on PDFs you trust. It is not designed to protect you against malware... Consider using a Docker container or virtual machine to isolate an untrusted PDF from your system."* Providing that isolation **is pdf-forge's job**, since by definition its inputs are untrusted.

### Hardening checklist (concrete)

**Strip / neutralize before heavy processing**
- [ ] Run every upload through **pikepdf/qpdf first as a normalize pass**: open it (qpdf repairs/validates structure — a malformed file that won't open is rejected here), then `save()` a clean copy. This gives a known-good object structure before Ghostscript/Tesseract see it.
- [ ] Strip active content where feasible: remove `/JavaScript`, `/JS`, `/OpenAction`, `/AA`, `/Launch`, and embedded files (`/EmbeddedFiles`, `/Names`) via pikepdf object editing for ops that don't need them. **Don't market this as "sanitization"** (ocrmypdf docs explicitly warn the tool isn't a sanitizer) — but reducing attack surface is worth it.
- [ ] **Keep all engines patched** and rebuild the image regularly: Ghostscript (latest 10.0x), qpdf/pikepdf, ocrmypdf, Tesseract/leptonica, poppler. Most engine CVEs are fixed-version stories; an old base image is the real risk.

**Run engines as least-privilege**
- [ ] **Non-root user.** `USER 10001` in the Dockerfile; engines exec as UID ≠ 0. A SAFER bypass then lands as an unprivileged user.
- [ ] **Drop all Linux capabilities** (`cap_drop: [ALL]`) — PDF processing needs none.
- [ ] **`no-new-privileges`** so a setuid binary can't escalate.
- [ ] **Read-only root filesystem** (`read_only: true`) plus small writable **tmpfs** only for `/work` and `/tmp`. Read-only rootfs + no-new-privileges cripples most exploit chains — an attacker can't drop a second-stage payload on disk.
- [ ] **No network egress for the worker.** A malicious PDF's whole point may be to phone home / pull a second stage (PDFs can declare URI/`/Launch`/network actions; Ghostscript historically had `%pipe%`). Put the processing path on an `internal` Docker network with no route out, or apply an egress-deny policy. ocrmypdf/gs/poppler never need outbound network.
- [ ] **Seccomp:** keep Docker's default seccomp profile on (never `--security-opt seccomp=unconfined`); ideally tighten to a custom profile.
- [ ] **Container resource caps:** `--memory`, `--cpus`, `--pids-limit` — also your OOM backstop from §3.
- [ ] Consider the **gVisor (`runsc`) runtime** for the worker if you want real kernel-isolation around Ghostscript — the strongest practical homelab sandbox short of a microVM.

**Example `docker-compose.yml` hardening block**
```yaml
services:
  pdf-forge:
    user: "10001:10001"
    read_only: true
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
      # - seccomp:./pdf-forge-seccomp.json   # optional tightened profile
    tmpfs:
      - /tmp
    volumes:
      - work:/work            # bounded named volume or size-limited tmpfs
    mem_limit: 3g
    cpus: 2.0
    pids_limit: 256
    networks: [edge]          # reachable only from the reverse proxy
networks:
  edge:
    internal: true            # no egress for the worker
```

**Frontend (pdf.js) hardening**
- [ ] **Name the risk:** **CVE-2024-4367** — pdf.js < **4.2.67** allowed **arbitrary JavaScript execution in the hosting origin** when opening a malicious PDF (a font-handling path, reachable even without `enableScripting`). Pin pdf.js ≥ 4.2.67 and keep it current.
- [ ] Render untrusted PDFs with **`isEvalSupported: false`** (default is **`true`**) and **`enableScripting: false`** so embedded PDF JavaScript never executes in the browser.
- [ ] Serve the app with a strict **Content-Security-Policy** (no inline/`unsafe-eval`, `worker-src 'self'` for the pdf.js worker). A good CSP is also a backstop against the CVE-2024-4367 class.

---

## Recommendations (decision-ready)

1. **Contain Ghostscript as if `-dSAFER` is already broken — because it has been, repeatedly, including a 2024 in-the-wild RCE (CVE-2024-29510).** The hardening that matters most is the container sandbox, not input validation: non-root + `cap_drop ALL` + `no-new-privileges` + read-only rootfs + tmpfs-only writes + **no network egress** for the worker. This single posture neutralizes the entire Ghostscript SAFER-bypass lineage.
2. **Patch the framework, not just the engines.** Pin `starlette >= 0.47.2` (fixes CVE-2024-47874 multipart-field OOM *and* CVE-2025-54121 event-loop-blocking rollover), Ghostscript to the latest 10.0x, and pdf.js ≥ 4.2.67 (CVE-2024-4367). Rebuild the image on a schedule.
3. **Validate in three stages:** extension allow-list → magic bytes (`python-magic`, first ~2 KB, must be `application/pdf`) → structural open with pikepdf/qpdf (reject what won't open). Never trust client `Content-Type` or filename.
4. **Generate server-side filenames** (`uuid4().hex + ".pdf"`), one **temp dir per job** on a **size-bounded `/work` volume**, cleaned in `finally` / via response `BackgroundTask`, with a **TTL janitor** sweeping orphans hourly, and a `disk_usage` precheck → 507.
5. **Bound every resource dimension on engine subprocesses:** wall-clock timeout with `os.killpg` of the whole process group, `setrlimit` (AS/CPU/FSIZE), `ocrmypdf --jobs 1–2 --tesseract-timeout`, and a **global worker pool of 1–2** with a bounded queue returning 429 — plus container `--memory`/`--cpus`/`--pids-limit` as the hard backstop and real memory ceiling.
6. **Use the async-job pattern** (`202` + poll) for OCR/compress/linearize so reverse-proxy read timeouts and request buffering stop mattering. If you keep synchronous requests: proxy body cap ≥ app cap, `proxy_read_timeout` ≥ worst-case job time, disable request buffering.
7. **Put auth at the proxy, not in the app:** Authelia forward-auth (SSO + 2FA) for multi-service homelabs, or proxy Basic-auth-over-TLS as a single-user stopgap. **Publish only the proxy; bind pdf-forge to an internal network** so the app — and any forge-able forward-auth headers — are unreachable except through the proxy.
8. **Pre-normalize with pikepdf/qpdf** and strip `/JavaScript`, `/OpenAction`, `/Launch`, embedded files before Ghostscript/Tesseract. Reduce attack surface; don't promise it's malware cleaning.
9. **In the browser:** pdf.js with `isEvalSupported:false`, `enableScripting:false`, a strict CSP, and a current version (≥ 4.2.67).

## Gotchas / pitfalls

- **`UploadFile` has no size limit.** SpooledTemporaryFile rolls over to disk at **1 MB** (`spool_max_size` default) but keeps writing to `/tmp` until the disk is full. Add your own streaming byte-count cap. (FastAPI #5777: `spool_max_size` is awkward to override.)
- **Two Starlette multipart DoS CVEs** bite this exact use case: CVE-2024-47874 (no-filename fields buffered unbounded → OOM, fixed 0.40.0) and CVE-2025-54121 (rollover blocks the event loop, fixed 0.47.2). Pin past both.
- **`subprocess timeout=` only kills the direct child.** `ocrmypdf`→`gs`/`tesseract` grandchildren survive and keep burning CPU. Must `start_new_session=True` + `os.killpg`.
- **nginx defaults bite twice:** `client_max_body_size 1m` → instant 413; `proxy_read_timeout 60s` → 504 on long OCR. Caddy has *no* body limit by default (disk-exhaustion risk) — you must set one.
- **`-dSAFER` is not a trust boundary.** It is default-on since 9.50 but has been bypassed again and again, most recently CVE-2024-29510 (actively exploited). Patch + container isolation are the real defense.
- **Don't pass client filenames downstream.** Overlong-UTF-8 `../` traversal was a *Ghostscript* bug (CVE-2024-46952/46954), not just a path-join problem in your code.
- **`Content-Length` is spoofable / absent on chunked transfers** — early-reject is an optimization; the streaming counter is the guard.
- **Returning the output file then deleting it:** you can't `rmtree` before the response is sent. Use `BackgroundTask` / `StreamingResponse` `finally`, or you leak every output.
- **`RLIMIT_AS` over-counts** (virtual address space / allocator over-reservation) and can spuriously kill a legit job; pair it with the container cgroup memory limit rather than relying on it.
- **Reverse proxies buffer request bodies by default** (nginx, Traefik), doubling disk usage/latency for big uploads. Disable buffering or use async jobs.
- **libmagic is heuristic;** polyglots pass a `%PDF` check. It's a filter, not proof — the qpdf open is the authority.
- **ocrmypdf is explicitly not a malware sanitizer** — don't tell users it cleans malicious PDFs.
- **pdf.js `isEvalSupported` defaults to `true`** and CVE-2024-4367 fired even without scripting enabled — pin ≥ 4.2.67 *and* set the flags *and* ship a CSP.

## Open questions

- **Acceptable max upload size?** Drives proxy caps, `/work` sizing, and per-job RAM budget. OCR rasterization RAM scales with page count × resolution.
- **Runtime hardening ceiling:** is stock Docker default seccomp enough, or is gVisor/`runsc` (or a microVM) worth the complexity specifically for the Ghostscript path?
- **Sync vs async jobs as default UX** — async (`202`+poll) is far more robust operationally but adds frontend complexity; acceptable for target users?
- **How aggressively to strip active content** (JS/OpenAction/embedded files) by default vs. preserving fidelity (could break legitimate forms/attachments). Opt-in "sanitize" toggle vs. always-on?
- **Multi-user model:** if pdf-forge becomes multi-user via Authelia, do jobs/outputs need per-user isolation/ACLs beyond the per-job temp dir, or is single-tenant assumed?
- **Patch-cadence automation:** is unattended base-image rebuild (e.g. Renovate/Watchtower + CI) in scope, given the relentless Ghostscript CVE stream?

## Changes vs. session 1

- **Corrected/expanded the Ghostscript CVE picture (major).** Session 1 stopped at CVE-2023-28879. Added the **2024–2025** lineage: **CVE-2024-29510** (format string, SAFER bypass, **actively exploited in the wild**, fixed 10.03.1), the CVE-2024-29506/09/11 + 33869–71 batch, **CVE-2024-46951–46956** (incl. overlong-UTF-8 `../` traversal, fixed 10.04.0), the CVE-2024-46954 incomplete-fix follow-up (10.05.0), **CVE-2025-27830–27837** (10.05.0), and **CVE-2025-59798–59801** (10.06.0). Reframed the takeaway around *ongoing* patching, not a historical list.
- **Added two Starlette multipart DoS CVEs (new, directly relevant):** **CVE-2024-47874** (unbounded buffering of no-filename form fields → OOM, fixed 0.40.0) and **CVE-2025-54121** (spool rollover blocked the event loop → DoS, fixed 0.47.2). Session 1 missed both. Concrete pin: `starlette >= 0.47.2`.
- **Named the pdf.js RCE:** session 1 alluded to "a notable eval-path CVE"; it is **CVE-2024-4367** (arbitrary JS execution in hosting origin, fixed **4.2.67**), and it fires even without `enableScripting`. Confirmed `isEvalSupported` defaults to `true`.
- **Confirmed** the core session-1 claims that held up: nginx 1 MB / 60 s defaults; Starlette spool default 1 MB; `UploadFile` has no size cap; FastAPI #5777; the `killpg`/process-group requirement; `RLIMIT_AS` over-counting; ocrmypdf "not a sanitizer / use a container" guidance (verified verbatim against current docs); the non-root + cap_drop + read-only + no-egress container posture; Caddy having no default body limit; Traefik buffering caveat.
- **Refined resource details:** verified `ocrmypdf --tesseract-timeout` default is **180 s/page**, added `--skip-big` as a raster-bomb guard, and noted `-j/--jobs` defaults to all cores (so it must be pinned). Recommended `--jobs 1–2` rather than strictly 1.
- **Renamed product to pdf-forge** throughout (session 1 used "PDFsmith"); treated as the same project.

## Sources

- FastAPI — UploadFile reference: https://fastapi.tiangolo.com/reference/uploadfile/
- FastAPI issue #5777 (`spool_max_size` ignored): https://github.com/fastapi/fastapi/issues/5777
- Starlette CVE-2025-54121 advisory (GHSA-2c2j-9gv5-cj73): https://github.com/advisories/GHSA-2c2j-9gv5-cj73
- Starlette commit fixing rollover blocking (PR #2962): https://github.com/encode/starlette/commit/9f7ec2eb512fcc3fe90b43cb9dd9e1d08696bec1
- Starlette CVE-2024-47874 advisory (GHSA-f96h-pmfr-66vw): https://github.com/advisories/GHSA-f96h-pmfr-66vw
- CVE-2024-47874 (NVD): https://nvd.nist.gov/vuln/detail/CVE-2024-47874
- python-magic (PyPI): https://pypi.org/project/python-magic/
- pikepdf docs: https://pikepdf.readthedocs.io/en/latest/
- ocrmypdf — PDF security / malware guidance: https://ocrmypdf.readthedocs.io/en/latest/pdfsecurity.html
- ocrmypdf — advanced (tesseract-timeout, skip-big): https://ocrmypdf.readthedocs.io/en/latest/advanced.html
- Ghostscript CVE index (authoritative, fixed-version mapping): https://ghostscript.com/releases/cve/index.html
- CVE-2024-29510 deep-dive (Codean Labs): https://codeanlabs.com/blog/research/cve-2024-29510-ghostscript-format-string-exploitation/
- CVE-2024-29510 active exploitation (The Register): https://www.theregister.com/2024/07/05/ghostscript_vulnerability_severity/
- Ghostscript CVE-2025-59798 (Rapid7): https://www.rapid7.com/db/vulnerabilities/ghostscript-cve-2025-59798/
- Ghostscript 10.04.0 six-CVE patch incl. traversal (SecurityOnline): https://securityonline.info/ghostscript-update-patches-six-critical-vulnerabilities-code-execution-buffer-overflow-and-path-traversal-risks/
- Ghostscript SAFER breakout (CVE-2020-15900), CyberCX: https://cybercx.co.nz/blog/ghostscript-safer-sandbox-breakout/
- Ghostscript CVE-2023-28879 writeup (Almond): https://offsec.almond.consulting/ghostscript-cve-2023-28879.html
- Red Hat — CVE-2021-3781 (%pipe% escape): https://bugzilla.redhat.com/show_bug.cgi?id=CVE-2021-3781
- pdf.js CVE-2024-4367 advisory (react-pdf GHSA-87hq-q4gp-9wr4): https://github.com/wojtekmaj/react-pdf/security/advisories/GHSA-87hq-q4gp-9wr4
- pdf.js — disable JavaScript (discussion #18428): https://github.com/mozilla/pdf.js/discussions/18428
- pdf.js getDocument API (isEvalSupported/enableScripting): https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- Kill subprocess + children on timeout (process groups), A. Zaharia: https://alexandra-zaharia.github.io/posts/kill-subprocess-and-its-children-on-timeout-python/
- nginx client_max_body_size / 413, getpagespeed: https://www.getpagespeed.com/server-setup/nginx/nginx-client-max-body-size
- Caddy request body size limit: https://www.softcolon.com/blogs/limiting-request-body-file-upload-size-in-caddy/
- Traefik buffering middleware docs: https://doc.traefik.io/traefik/middlewares/http/buffering/
- Authelia — nginx integration: https://www.authelia.com/integration/proxies/nginx/
- Authelia — proxies introduction: https://www.authelia.com/integration/proxies/introduction/
- Docker — seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- OWASP — Docker Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
