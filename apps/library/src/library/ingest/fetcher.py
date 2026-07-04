"""library.ingest.fetcher — the SSRF-guarded source fetcher + markdown conversion.

The service (trusted code) — never the agent — fetches and hashes source URLs, so
provenance hashes are minted by trusted code, not by the most injection-exposed
principal (PLAN §4). Threat axis §12.7 (SSRF via source fetching).

Guards (PLAN §4):
  * https-only
  * PUBLIC-IP-ONLY with RESOLVE-THEN-CONNECT PINNING (defeats DNS-rebinding: we
    resolve the host, verify every resolved address is public, then connect to the
    PINNED address with the original Host header — the name is never re-resolved)
  * no private redirects (each hop re-validated; capped)
  * size cap (default 2 MB), timeout, MIME allowlist

Conversion is a PURE, deterministic function of the fetched bytes (no JS execution) —
the rebuildable-index invariant depends on the stored markdown being stable.
"""
from __future__ import annotations

import html as _html
import http.client
import ipaddress
import re
import socket
import ssl
from dataclasses import dataclass
from typing import Callable, Optional
from urllib.parse import urlparse

from ..errors import BadRequest

MIME_ALLOWLIST = {
    "text/html", "text/plain", "text/markdown", "application/xhtml+xml",
    "text/troff", "application/x-troff-man",
}


@dataclass
class Fetched:
    url: str
    final_url: str
    content_type: str
    body: bytes
    sha256: str


def is_public_ip(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return not (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
        or ip.is_reserved or ip.is_unspecified
        or (ip.version == 6 and ip.ipv4_mapped and not ipaddress.ip_address(ip.ipv4_mapped).is_global)
    )


def _resolve_public(host: str) -> str:
    """Resolve host; require EVERY resolved address to be public; return one pinned
    address to connect to."""
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise BadRequest(f"cannot resolve {host}: {e}", code="fetch_dns")
    addrs = [i[4][0] for i in infos]
    if not addrs:
        raise BadRequest(f"no addresses for {host}", code="fetch_dns")
    for a in addrs:
        if not is_public_ip(a):
            raise BadRequest(f"refusing to fetch: {host} resolves to non-public {a}",
                             code="ssrf_blocked")
    return addrs[0]


class Fetcher:
    def __init__(self, *, max_bytes: int = 2 * 1024 * 1024, timeout_s: float = 10.0,
                 allow_private: bool = False, max_redirects: int = 4,
                 opener: Optional[Callable[[str], Fetched]] = None):
        self.max_bytes = max_bytes
        self.timeout_s = timeout_s
        self.allow_private = allow_private
        self.max_redirects = max_redirects
        self._opener = opener  # injectable for tests (bypasses network)

    def fetch(self, url: str) -> Fetched:
        if self._opener is not None:
            return self._opener(url)
        return self._fetch_guarded(url, self.max_redirects)

    def _fetch_guarded(self, url: str, redirects_left: int) -> Fetched:
        u = urlparse(url)
        if u.scheme != "https":
            raise BadRequest("https-only source URLs", code="fetch_scheme")
        host = u.hostname or ""
        if not host:
            raise BadRequest("missing host", code="fetch_host")
        pinned = "127.0.0.1" if self.allow_private else _resolve_public(host)
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(pinned, 443, timeout=self.timeout_s, context=ctx)
        # connect to the PINNED ip but present the real Host + SNI (server_hostname)
        conn.sock = None
        try:
            conn._context.check_hostname = True  # SNI validated against the real host
            conn.host = host  # Host header + SNI = the real name; socket target = pinned ip
            conn._create_connection = lambda addr, *a, **k: socket.create_connection(
                (pinned, 443), timeout=self.timeout_s)
            path = u.path or "/"
            if u.query:
                path += "?" + u.query
            conn.request("GET", path, headers={"Host": host, "User-Agent": "library-fetcher/1"})
            resp = conn.getresponse()
            if resp.status in (301, 302, 303, 307, 308):
                loc = resp.getheader("Location", "")
                if redirects_left <= 0 or not loc:
                    raise BadRequest("too many redirects", code="fetch_redirect")
                nxt = loc if loc.startswith("http") else f"https://{host}{loc}"
                return self._fetch_guarded(nxt, redirects_left - 1)  # each hop re-validated
            if resp.status != 200:
                raise BadRequest(f"fetch status {resp.status}", code="fetch_status")
            ctype = (resp.getheader("Content-Type", "") or "").split(";")[0].strip().lower()
            if ctype and ctype not in MIME_ALLOWLIST:
                raise BadRequest(f"disallowed content-type {ctype}", code="fetch_mime")
            body = resp.read(self.max_bytes + 1)
            if len(body) > self.max_bytes:
                raise BadRequest("source exceeds size cap", code="fetch_too_large")
            import hashlib
            return Fetched(url=url, final_url=url, content_type=ctype or "text/plain",
                           body=body, sha256=hashlib.sha256(body).hexdigest())
        finally:
            conn.close()


# ── deterministic conversion to markdown (pure function; no JS) ───────────────
_TAG = re.compile(r"<[^>]+>")


def html_to_markdown(text: str) -> str:
    """Minimal deterministic HTML→markdown. Headings, paragraphs, list items, code,
    and pre are preserved; scripts/styles dropped; entities decoded. Not a full
    renderer — a stable, reproducible reduction."""
    text = re.sub(r"(?is)<script.*?</script>", "", text)
    text = re.sub(r"(?is)<style.*?</style>", "", text)
    # headings
    for i in range(1, 7):
        text = re.sub(rf"(?is)<h{i}[^>]*>(.*?)</h{i}>", lambda m, _i=i: f"\n{'#'*_i} {_TAG.sub('', m.group(1)).strip()}\n", text)
    text = re.sub(r"(?is)<li[^>]*>(.*?)</li>", lambda m: f"- {_TAG.sub('', m.group(1)).strip()}\n", text)
    text = re.sub(r"(?is)<pre[^>]*>(.*?)</pre>", lambda m: f"\n```\n{_TAG.sub('', m.group(1))}\n```\n", text)
    text = re.sub(r"(?is)<code[^>]*>(.*?)</code>", lambda m: f"`{_TAG.sub('', m.group(1)).strip()}`", text)
    text = re.sub(r"(?is)<(p|br|div)[^>]*>", "\n", text)
    text = _TAG.sub("", text)
    text = _html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def to_markdown(content_type: str, body: bytes) -> str:
    text = body.decode("utf-8", errors="replace")
    if content_type in ("text/html", "application/xhtml+xml"):
        return html_to_markdown(text)
    # text/plain, text/markdown, man/troff text: store verbatim (deterministic)
    return text if text.endswith("\n") else text + "\n"
