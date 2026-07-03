# PDFsmith — Security & Homelab Operational Concerns

Research track: **security-homelab**. Scope: making the FastAPI single-container app safe to run in a homelab, LAN-only, behind a reverse proxy. PDFsmith ingests arbitrary user-supplied PDFs and feeds them to native parsers (pikepdf/qpdf, pypdf, ocrmypdf+Tesseract, Ghostscript, poppler). **Every uploaded PDF must be treated as hostile.** A PDF is a Turing-complete-ish container that can carry JavaScript, embedded files, malformed objects engineered to crash or exploit a parser, and PostScript that has historically broken out of Ghostscript's `-dSAFER` sandbox. The threat model is not "a hacker on the internet" (you're LAN-only) — it's **a malicious or malformed document detonating inside your container and using your homelab box as a foothold or a DoS target.**

The headline posture: defense in depth around the *engines*, not the network. LAN is not a security boundary.

---

## 1. Safe upload handling

### Never trust the client
- **Never trust the `Content-Type` header or the filename extension.** Both are attacker-controlled. The browser will happily send `Content-Type: application/pdf` for a 4 GB ZIP bomb or a polyglot.
- Validate **magic bytes** server-side. A real PDF starts with `%PDF-` (`25 50 44 46 2D`) within the first bytes (the spec technically allows up to ~1024 bytes of leading junk before the header, so scan the first ~1 KB, don't insist on offset 0). Use `libmagic` via `python-magic`, reading the first 2048 bytes is the documented recommendation for reliable identification.

```python
import magic  # python-magic
head = await upload.read(2048)
await upload.seek(0)
mime = magic.from_buffer(head, mime=True)
if mime != "application/pdf":
    raise HTTPException(415, "Not a PDF")
```

- Treat `libmagic` as a **first-pass filter, not a guarantee** — it is heuristic. The authoritative validation is "does pikepdf/qpdf open it without error" (see §6). Combine: extension allow-list → magic bytes → structural open.

### Filename sanitization
- The client filename is **display metadata only**. Never use it to build a path on disk. Path-traversal payloads (`../../etc/...`, NUL bytes, Windows reserved names `CON`/`AUX`, overlong UTF-8) all arrive in `upload.filename`.
- **Generate your own filename**: `f"{uuid4().hex}.pdf"`. If you must echo the original name back to the user (e.g. for the download), sanitize with `werkzeug.utils.secure_filename` or `pathvalidate`, and store the original name as a string in your job record — never as a filesystem path component.

### Streaming to disk vs. memory (UploadFile / SpooledTemporaryFile)
- FastAPI's `UploadFile` wraps `tempfile.SpooledTemporaryFile`: content stays in RAM until it exceeds a `max_size` rollover threshold, then spills to a temp file on disk. **Starlette's default rollover is 1 MB** (it sets `spool_max_size`/`max_size=1024*1024` internally). PDFs for OCR are routinely 10–500 MB, so they *will* spill to disk — which is what you want; you do not want hundreds of MB pinned in the event loop's process RAM.
- **Caveat:** the rollover does not mean the *whole request* is bounded. `UploadFile` itself imposes **no max size**. A client can stream gigabytes; SpooledTemporaryFile just keeps rolling to `/tmp` and you fill the disk. You must enforce a cap yourself.
- **Caveat (known FastAPI issue #5777):** passing your own `spool_max_size` is awkward; the framework constructs the SpooledTemporaryFile for you. Simplest robust pattern: ignore the spool tuning and **stream the body to your own staging file with a running byte counter**, aborting when you cross the cap.

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

### Two layers of size caps (defense in depth)
1. **Global/per-request cap at the reverse proxy** (see §4) — cheapest, rejects before bytes hit Python.
2. **App-level cap** — because the proxy can be misconfigured or bypassed on the LAN, and because you want a clean `413` JSON error rather than a proxy HTML page. Starlette does not ship a body-size limit middleware out of the box; either count bytes as you stream (above) or check `Content-Length` early (but note `Content-Length` is spoofable / absent for chunked encoding, so the streaming counter is the real guard).

| Layer | Mechanism | Catches |
|---|---|---|
| Reverse proxy | `client_max_body_size` etc. | Most oversized uploads, cheaply, before app |
| App ingest | streaming byte counter → 413 | Chunked/spoofed length, proxy misconfig |
| Disk | per-job temp dir on a size-bounded volume / quota | Slow-drip exhaustion, many concurrent jobs |

---

## 2. Temp-file lifecycle

### Staging layout
- Use **one unique directory per job**, e.g. `/work/jobs/<uuid>/` containing `input.pdf`, `output.pdf`, and any engine scratch. `tempfile.mkdtemp(dir="/work")` gives a 0700 dir with a collision-free name. Per-job isolation means cleanup is a single `shutil.rmtree`, and one job can't read another's files.
- Put `/work` on a **dedicated volume/tmpfs with a known size cap**, separate from the OS root, so PDF processing can never fill the system disk (see disk-exhaustion below).
- Point engine temp at the same controlled location: set `TMPDIR` for the worker process (Ghostscript, Tesseract, qpdf all honor it) so their scratch files also land on the bounded volume and get swept.

### Guaranteed cleanup
- **Synchronous job:** wrap in `tempfile.TemporaryDirectory()` or a `try/finally`. The `finally` must run even on engine crash/timeout.

```python
job_dir = Path(tempfile.mkdtemp(dir="/work/jobs"))
try:
    ... # write input, run engine, stream output back
finally:
    shutil.rmtree(job_dir, ignore_errors=True)
```

- **If you return the output file in the response**, you cannot delete it before it's been sent. Use FastAPI's `BackgroundTask` attached to the response, or `StreamingResponse` whose generator deletes in its own `finally`:

```python
return FileResponse(out, media_type="application/pdf",
                    background=BackgroundTask(shutil.rmtree, job_dir, ignore_errors=True))
```

- **Async/queued jobs:** the worker that owns the job owns cleanup in `finally`. Don't rely on the request handler — it has already returned.

### TTL sweeper for orphans
- `finally` blocks miss the hard cases: container OOM-killed mid-job, SIGKILL, power loss. So add a **janitor** that periodically `rmtree`s any `/work/jobs/<uuid>` whose mtime is older than a TTL (e.g. 1 h). Run it as an APScheduler/asyncio background task inside the app or a tiny cron in the container. This is your backstop against slow leakage.

### Disk-exhaustion protection
- A single 4 GB upload, a decompression/"PDF bomb" that explodes during OCR rasterization, or 50 concurrent jobs can each blow the disk.
- Mitigations: (1) bounded `/work` volume so the blast radius is contained and the OS root stays healthy; (2) `shutil.disk_usage("/work")` precheck before accepting a job — reject with `507 Insufficient Storage` if free space < N×max-upload; (3) concurrency cap (§3) bounds simultaneous scratch usage; (4) TTL sweeper reclaims orphans.

---

## 3. Resource limits (CPU / memory / time / concurrency)

Heavy engines (`ocrmypdf`, `gs`) are CPU-, RAM- and time-hungry, and a hostile PDF is specifically designed to maximize all three. Bound every dimension.

### Per-subprocess timeout (and actually kill the tree)
- `subprocess.run(..., timeout=...)` raises `TimeoutExpired` but a gotcha: it kills only the **direct child**. `ocrmypdf` spawns `gs`, `tesseract`, `pngquant`, etc.; those grandchildren survive and keep burning CPU. **Start the child in its own process group and kill the group.**

```python
import os, signal, subprocess
p = subprocess.Popen(cmd, start_new_session=True)        # setsid → new process group
try:
    p.communicate(timeout=600)
except subprocess.TimeoutExpired:
    os.killpg(os.getpgid(p.pid), signal.SIGKILL)         # nuke the whole tree
    p.wait()
```

(On Windows you'd use a Job Object / `CREATE_NEW_PROCESS_GROUP`, but PDFsmith runs in a Linux container, so process groups are the right tool.)

### Per-subprocess memory / CPU caps
- Use `preexec_fn` to apply `resource.setrlimit` in the child before exec: `RLIMIT_AS` (address space), `RLIMIT_CPU` (CPU seconds), `RLIMIT_NPROC`, `RLIMIT_FSIZE` (output file size — caps PDF bombs). Example: cap a single OCR child at ~2 GB and 600 CPU-seconds.

```python
import resource
def limits():
    resource.setrlimit(resource.RLIMIT_AS,  (2*1024**3, 2*1024**3))
    resource.setrlimit(resource.RLIMIT_CPU, (600, 600))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1*1024**3, 1*1024**3))
subprocess.Popen(cmd, preexec_fn=limits, start_new_session=True)
```

- `RLIMIT_AS` is blunter than cgroups (it limits virtual address space, which some allocators over-reserve) — pair it with a container memory limit as the real ceiling.

### ocrmypdf / Ghostscript built-in knobs
- `ocrmypdf --jobs N` controls internal parallelism; **keep N small** (1–2) per job so one document can't fan out across all cores. Pin the total worker concurrency separately.
- ocrmypdf accepts a `tesseract_timeout` and overall timeouts; pass them so a pathological page can't hang forever.
- Ghostscript: invoke with explicit `-dSAFER -dNOPAUSE -dBATCH` and a page/resolution cap (`-r` for rasterization) so a page declaring an absurd MediaBox can't allocate gigantic buffers.

### Bounding concurrency / queue depth (the OOM guard)
- The single biggest homelab failure mode: two or three simultaneous OCR jobs each grab 2–4 GB and the box OOM-kills the container (or worse, the host). **Serialize heavy jobs.** Recommended: a small in-process job queue with a worker pool of size 1–2 (sized to `min(cores-1, RAM/perJobRAM)`), and an `asyncio.Semaphore` / bounded queue that returns `429 Too Many Requests` or `503` when the queue is full rather than accepting unbounded work.
- Fast client-side ops (reorder/rotate/delete/preview) never hit this — they run in the browser per the hybrid architecture. Only OCR/compress/linearize/encrypt are queued. This is a real advantage: the backend's heavy-job concurrency can be tiny.
- Set the **container** `--memory` and `--cpus` limits as the hard backstop so even a runaway can't take down the host (see §6).

| Limit | Where | Purpose |
|---|---|---|
| Wall-clock timeout + killpg | per subprocess | hung/looping engine |
| `RLIMIT_AS`, `RLIMIT_CPU`, `RLIMIT_FSIZE` | `preexec_fn` | runaway RAM/CPU/output bomb |
| `--jobs 1` | ocrmypdf | per-job core fan-out |
| Worker pool size 1–2 + bounded queue | app | cross-job OOM, queue overflow → 429 |
| `--memory`, `--cpus`, `--pids-limit` | container | host-level backstop |

---

## 4. Reverse-proxy upload-size & timeout pitfalls

Two failure modes dominate: **413 (proxy body cap too low)** and **504 (proxy gives up before a long OCR job finishes)**.

### nginx
Default `client_max_body_size` is **1 MB** → instant `413` on any real PDF. OCR can run minutes → default `proxy_read_timeout` of 60 s gives a `504`.

```nginx
server {
    client_max_body_size 500m;        # match your app MAX_BYTES
    client_body_timeout  300s;        # slow uploads over wifi

    location /api/ {
        proxy_pass http://pdfsmith:8000;
        proxy_read_timeout    900s;   # long OCR jobs
        proxy_send_timeout    900s;
        proxy_request_buffering off;  # stream upload to app, don't buffer whole body to disk first
        proxy_http_version 1.1;
    }
}
```

- `proxy_request_buffering off` is important for large uploads: by default nginx **buffers the entire request body to a temp file before forwarding**, doubling disk I/O and latency and adding its own `client_body_temp` disk usage. Turning it off streams to the app. (Trade-off: the app then sees a slow client directly; acceptable on a LAN.)
- Better still for long jobs: don't hold the HTTP connection open for the whole OCR. Use an **async job pattern** — `POST` returns `202 + job id` immediately, client polls `GET /jobs/{id}`. Then proxy timeouts stop mattering. Strongly recommended for OCR/compress.

### Caddy
No default body limit (accepts anything → disk risk), so you must set one. Caddy is the easiest homelab proxy (automatic local TLS).

```caddy
pdfsmith.lan {
    request_body { max_size 500MB }
    reverse_proxy pdfsmith:8000 {
        transport http { read_timeout 900s }
    }
}
```

### Traefik
Body size is **not on by default**; you add a `buffering` middleware. Note Traefik buffering writes the body to memory/disk, which conflicts with streaming large uploads — another reason to prefer the async-job pattern.

```yaml
# docker labels
- "traefik.http.middlewares.pdfbody.buffering.maxRequestBodyBytes=524288000"  # 500MB
- "traefik.http.routers.pdfsmith.middlewares=pdfbody"
# long jobs: raise the entrypoint/transport responseForwarding & server read timeouts
```

**Rule of thumb:** proxy body cap ≥ app `MAX_BYTES`; proxy read timeout ≥ worst-case engine timeout (or sidestep entirely with async jobs).

---

## 5. Auth options for LAN

**LAN-only is not a security boundary.** A compromised IoT device, a guest on wifi, or a phone with a malicious app is already "on the LAN." Put auth in front of PDFsmith.

| Option | Effort | Strength | Verdict for homelab |
|---|---|---|---|
| **forward-auth (Authelia) at proxy** | medium | strong: SSO, 2FA, per-host policy, session mgmt | **Recommended** if you already run a proxy + a couple of services |
| HTTP Basic auth at proxy | trivial | weak-ish: single shared cred, no 2FA, no logout | Fine as a stopgap / single-user |
| App-level auth in FastAPI | you build it | only as good as you build it | Avoid — don't reinvent auth in a PDF tool |

### Recommendation: forward-auth with Authelia (or equivalent) at the proxy
- The proxy issues an `auth_request` subrequest to Authelia (`/internal/authelia/authz`); unauthenticated users are redirected to the Authelia portal; on success Authelia returns `Remote-User`/`Remote-Email`/`Remote-Groups` headers injected into the upstream request. PDFsmith can read those headers (trusting them **only** because they come from the proxy on an internal network — make sure the app isn't reachable except via the proxy).
- nginx needs the `http_auth_request` and `http_realip` modules (standard in most builds). Authelia ships ready-made `proxy.conf` / `authelia-location.conf` / `authelia-authrequest.conf` snippets.
- This gives you 2FA, a single login across all homelab apps, and centralized session/logout — without PDFsmith owning any credential logic.

### Pragmatic fallback
- Single user, just you? **Basic auth at the proxy over TLS** (Caddy `basic_auth` / nginx `auth_basic`) is one line and good enough to keep casual LAN access out. Upgrade to Authelia when you add more services.
- Either way: **bind PDFsmith to the proxy's internal network only** (don't publish `8000` on the host), so the only path in is through the authenticated proxy.

---

## 6. RCE / malicious-PDF risk — hardening checklist

### Why this is the real threat
- PDFs can embed JavaScript, launch actions, embedded files, and malformed objects crafted to exploit C/C++ parsers. PDFsmith's engines are all native code: **qpdf** (pikepdf), **Ghostscript**, **Tesseract**, **poppler**. Any of these can have a memory-corruption CVE.
- **Ghostscript is the crown jewel of risk.** Its `-dSAFER` sandbox has a long history of bypasses leading to arbitrary command execution / file read-write:
  - **CVE-2018-16509 / CVE-2019-6116** (Tavis Ormandy) — multiple `-dSAFER` bypasses via PostScript save/restore tricks.
  - **CVE-2019-10216 / -14811/-14812/-14813** — overwrite security flags to escape SAFER (fixed ≥ 9.50, which locks critical dictionaries).
  - **CVE-2020-15900** — buffer-length flaw enabling heap manipulation / sandbox disable.
  - **CVE-2021-3781** — sandbox escape via the `%pipe%` device → command execution.
  - **CVE-2023-28879** — buffer overflow writing null bytes to disable the sandbox → RCE via pipe device.
  - Pattern: **assume `-dSAFER` will be bypassed eventually. Keep Ghostscript patched and contain it as if it had no sandbox at all.**
- ocrmypdf's own docs are blunt: *"OCRmyPDF is not designed to protect you against malware... should only be used on PDFs you trust... consider a Docker container or VM to isolate an untrusted PDF."* That isolation is exactly PDFsmith's job to provide, since by definition its inputs are untrusted.

### Hardening checklist (concrete)

**Strip / neutralize before heavy processing**
- [ ] Run every upload through **pikepdf/qpdf first as a normalize+sanitize pass**: open it (qpdf repairs/validates structure — a malformed file that won't open is rejected here), then `save()` a clean linearized copy. This drops a lot of garbage and gives you a known-good object structure before Ghostscript/Tesseract ever see it.
- [ ] Strip active content where feasible: remove `/JavaScript`, `/JS`, `/OpenAction`, `/AA`, `/Launch`, and embedded files (`/EmbeddedFiles`) via pikepdf object editing for ops that don't need them. (Don't claim to be a sanitizer to users — ocrmypdf docs explicitly warn it isn't one — but reducing attack surface is still worth it.)
- [ ] Keep all engines **patched**: pin to current pikepdf/qpdf, Ghostscript ≥ latest, ocrmypdf, poppler in the image; rebuild regularly. Most engine CVEs are fixed-version stories.

**Run engines as least-privilege**
- [ ] **Non-root user.** `USER pdfsmith` in the Dockerfile; engines exec as UID ≠ 0. A SAFER bypass then lands as an unprivileged user, not root.
- [ ] **Drop all Linux capabilities**, add back none (PDF processing needs zero): `cap_drop: [ALL]`.
- [ ] **`no-new-privileges`** so a setuid binary can't escalate.
- [ ] **Read-only root filesystem** (`read_only: true`), with a small writable **tmpfs** only for `/work` (job scratch) and `/tmp`. A read-only rootfs + no-new-privileges "cripples most exploit chains" — an attacker can't drop a payload on disk.
- [ ] **No network egress for the worker.** A malicious PDF's whole point may be to phone home / pull a second stage. Put the processing path on an internal Docker network with no route out, or apply an egress-deny firewall/`network_mode` restriction. (ocrmypdf/gs never need outbound network.)
- [ ] **Seccomp**: keep Docker's default seccomp profile on (do **not** run `--security-opt seccomp=unconfined`); ideally tighten to a custom profile limiting syscalls to what Python+engines use.
- [ ] **Container resource caps**: `--memory`, `--cpus`, `--pids-limit` so an RCE/runaway can't take the host down (also your OOM backstop from §3).
- [ ] Consider **gVisor (`runsc`) runtime** for the worker if you want a real kernel-isolation boundary around Ghostscript — strongest practical homelab sandbox short of a VM.

**Example `docker-compose.yml` hardening block**
```yaml
services:
  pdfsmith:
    user: "10001:10001"
    read_only: true
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
      # - seccomp:./pdfsmith-seccomp.json   # optional tightened profile
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
- [ ] Render untrusted PDFs in pdf.js with **`isEvalSupported: false`** and **`enableScripting: false`** so embedded PDF JavaScript never executes in the browser. Keep pdf.js current (it has had its own RCE-class CVEs; the eval path was a notable one).
- [ ] Serve the app with a strict **Content-Security-Policy** (no inline eval, `worker-src 'self'` for the pdf.js worker) and render previews in a sandboxed context.

---

## Recommendations (decision-ready)

1. **Treat every upload as hostile and contain Ghostscript as if `-dSAFER` is already broken.** The hardening that matters most is the container sandbox, not input validation: non-root + `cap_drop ALL` + `no-new-privileges` + read-only rootfs + tmpfs-only writes + **no network egress** for the worker. This single posture neutralizes the entire Ghostscript SAFER-bypass CVE lineage.
2. **Validate in three stages**: extension allow-list → magic bytes (`python-magic`, first 2 KB, must be `application/pdf`) → structural open with pikepdf/qpdf (reject what won't open). Never trust client `Content-Type` or filename.
3. **Generate server-side filenames** (`uuid4().hex + ".pdf"`), one **temp dir per job** on a **size-bounded `/work` volume**, cleaned in `finally` / via response `BackgroundTask`, with a **TTL janitor** sweeping orphans hourly.
4. **Bound every resource dimension on engine subprocesses**: wall-clock timeout with `os.killpg` of the whole process group, `setrlimit` (AS/CPU/FSIZE), `ocrmypdf --jobs 1`, and a **global worker pool of 1–2** with a bounded queue returning 429 — plus container `--memory`/`--cpus` as the hard backstop. This is the OOM guard for a single-box homelab.
5. **Use the async-job pattern** (`202` + poll) for OCR/compress/linearize so reverse-proxy read timeouts and request buffering stop being a problem. If you keep synchronous requests, set proxy body cap ≥ app cap and `proxy_read_timeout`/equivalent ≥ worst-case job time, and disable request buffering.
6. **Put auth at the proxy, not in the app**: Authelia forward-auth for multi-service homelabs (SSO + 2FA), or proxy Basic-auth-over-TLS as a single-user stopgap. **Publish only the proxy; bind PDFsmith to an internal network** so the app is unreachable except through authenticated, internal hops.
7. **Pre-sanitize with pikepdf/qpdf**: normalize+linearize and strip `/JavaScript`, `/OpenAction`, `/Launch`, embedded files before handing the doc to Ghostscript/Tesseract. Don't market it as sanitization, but do reduce attack surface.
8. **Disable PDF JS in the browser** (`isEvalSupported:false`, `enableScripting:false`) and ship a strict CSP; keep pdf.js and all native engines patched on a regular image rebuild.

## Gotchas / pitfalls

- **`UploadFile` has no size limit.** SpooledTemporaryFile rolls over to disk (~1 MB default) but will keep writing to `/tmp` until the disk is full. You must add your own streaming byte-count cap. (FastAPI #5777: `spool_max_size` is awkward to override.)
- **`subprocess timeout=` only kills the direct child.** `ocrmypdf`→`gs`/`tesseract` grandchildren survive and keep burning CPU. Must `start_new_session=True` + `os.killpg`.
- **nginx defaults bite twice**: `client_max_body_size 1m` → instant 413; `proxy_read_timeout 60s` → 504 on long OCR. Caddy has *no* body limit by default (disk-exhaustion risk) — you must set one.
- **`-dSAFER` is not a trust boundary.** It has been bypassed repeatedly (CVE-2019-6116, -2020-15900, -2021-3781, -2023-28879, ...). Patch + container isolation are the real defense.
- **`Content-Length` is spoofable / absent on chunked transfers.** Early-reject on it as an optimization, but the streaming counter is the real guard.
- **Returning the output file then deleting it**: you can't `rmtree` before the response is sent. Use `BackgroundTask`/`StreamingResponse` `finally`, or you leak every output.
- **`RLIMIT_AS` over-counts** (virtual address space, allocator over-reservation) and can spuriously kill a legit job; pair it with cgroup/container memory limits rather than relying on it alone.
- **Reverse proxies buffer request bodies by default** (nginx, Traefik), doubling disk usage and latency for big uploads and adding their own temp-file footprint. Disable buffering or use async jobs.
- **libmagic is heuristic**, polyglot files can satisfy a `%PDF` check and still be something else. It's a filter, not proof; the qpdf open is the authority.
- **ocrmypdf explicitly is not a malware sanitizer** — don't promise users it cleans malicious PDFs.

## Open questions

- **Acceptable max upload size?** This drives proxy caps, `/work` volume sizing, and per-job RAM budget. OCR rasterization RAM scales with page count × resolution.
- **Runtime hardening ceiling:** is a stock Docker container's default seccomp enough, or is gVisor/`runsc` (or a microVM) worth the homelab complexity for the Ghostscript path specifically?
- **Sync vs async jobs as the default UX** — async (`202`+poll) is far more robust operationally but adds frontend complexity; is a progress-polling UI acceptable for the target users?
- **How aggressively to strip active content** (JS/OpenAction/embedded files) by default vs. preserving fidelity — could break legitimate forms/attachments. Opt-in "sanitize" toggle vs. always-on?
- **Multi-user model**: if PDFsmith becomes multi-user via Authelia, do jobs/outputs need per-user isolation and access control beyond the per-job temp dir, or is single-tenant assumed?

## Sources

- FastAPI — UploadFile reference: https://fastapi.tiangolo.com/reference/uploadfile/
- FastAPI issue #5777 (`spool_max_size` ignored): https://github.com/fastapi/fastapi/issues/5777
- FastAPI discussion #14374 (UploadFile memory): https://github.com/fastapi/fastapi/discussions/14374
- python-magic (PyPI): https://pypi.org/project/python-magic/
- Transloadit — secure uploads with magic numbers: https://transloadit.com/devtips/secure-api-file-uploads-with-magic-numbers/
- pikepdf (GitHub): https://github.com/pikepdf/pikepdf
- pikepdf docs: https://pikepdf.readthedocs.io/en/latest/
- ocrmypdf — PDF security issues: https://ocrmypdf.readthedocs.io/en/latest/pdfsecurity.html
- Ghostscript SAFER sandbox breakout (CVE-2020-15900), CyberCX: https://cybercx.co.nz/blog/ghostscript-safer-sandbox-breakout/
- Ghostscript CVE-2023-28879 writeup, Almond Offensive Security: https://offsec.almond.consulting/ghostscript-cve-2023-28879.html
- Red Hat Bugzilla — CVE-2021-3781 (%pipe% sandbox escape): https://bugzilla.redhat.com/show_bug.cgi?id=CVE-2021-3781
- vulhub — CVE-2019-6116: https://github.com/vulhub/vulhub/blob/master/ghostscript/CVE-2019-6116/README.md
- GhostRule (SAFER bypass PoCs): https://github.com/hhc0null/GhostRule
- Kill subprocess + children on timeout (process groups), A. Zaharia: https://alexandra-zaharia.github.io/posts/kill-subprocess-and-its-children-on-timeout-python/
- nginx client_max_body_size / 413 fix, getpagespeed: https://www.getpagespeed.com/server-setup/nginx/nginx-client-max-body-size
- nginx 413 troubleshooting, nixCraft: https://www.cyberciti.biz/faq/linux-unix-bsd-nginx-413-request-entity-too-large/
- Caddy request body size limit, Softcolon: https://www.softcolon.com/blogs/limiting-request-body-file-upload-size-in-caddy/
- Traefik buffering middleware docs: https://doc.traefik.io/traefik/middlewares/http/buffering/
- Authelia — nginx integration: https://www.authelia.com/integration/proxies/nginx/
- Authelia — proxies introduction: https://www.authelia.com/integration/proxies/introduction/
- Docker — seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- OWASP — Docker Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- Docker capabilities & no-new-privileges, raesene: https://raesene.github.io/blog/2019/06/01/docker-capabilities-and-no-new-privs/
- pdf.js — forcefully disable JavaScript (discussion #18428): https://github.com/mozilla/pdf.js/discussions/18428
