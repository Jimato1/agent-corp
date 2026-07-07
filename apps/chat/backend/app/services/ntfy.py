"""ntfy push SINK client (D-14; PLAN §8) — the sink, and ONLY the sink.

Chat is ntfy's sole publisher. This client holds Chat's single ntfy **write token**
(device-subscription plumbing, NOT a principal — nobody's identity is asserted by it
and nothing suite-side consumes it; suite identity stays entirely in auth). **There
is zero authorization/identity logic here** — this module only formats a push and
POSTs it; it never validates a caller, never resolves a scope, never mints or reads
a suite token.

Push payload policy (PLAN §8): ``title`` + kind tag + priority + ``X-Click`` = the
derived deep link. **The markdown ``body`` is NEVER sent to ntfy** — detail lives
behind the auth-gated Chat/MC UI. Nothing is published to a public topic directly.
"""
from __future__ import annotations

import urllib.error
import urllib.request

# kind → ntfy priority (PLAN §3.2 mapping): urgent(5) / high(4) / low(2).
_NTFY_PRIORITY = {"escalation": "5", "needs_review": "4", "done": "2"}


class NtfyPublishError(RuntimeError):
    pass


def publish(base_url: str, topic: str, token: str, *, title: str, kind: str,
            priority: int, click_url: str | None, timeout: float = 3.0) -> None:
    """POST one notification reference to the self-hosted sink. Blocking; call from a
    thread. Raises :class:`NtfyPublishError` on any non-2xx / transport failure so the
    outbox retries (at-least-once, SSE/UI as the durable fallback)."""
    url = f"{base_url.rstrip('/')}/{topic}"
    # Body carries ONLY the short plaintext title (hygiene-checked, <=120, no secret).
    # The markdown detail body is deliberately absent (PLAN §8).
    data = title.encode("utf-8")
    headers = {
        "Title": f"{kind.replace('_', ' ')} · P{priority}",
        "Priority": _NTFY_PRIORITY.get(kind, "3"),
        "Tags": kind,
        "Content-Type": "text/plain; charset=utf-8",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if click_url:
        headers["Click"] = click_url  # ntfy "X-Click": tapping the push opens the deep link
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (internal sidecar)
            if resp.status >= 300:
                raise NtfyPublishError(f"ntfy returned {resp.status}")
    except urllib.error.URLError as exc:
        raise NtfyPublishError(str(exc)) from exc
