"""Chat's own per-sub post rate limit (PLAN §11.3).

Layered over auth's per-``sub`` budget middleware (inherited): a default 60/h general
ceiling, with escalations additionally allowed up to 10/h even when the general
ceiling is hit (a runaway agent must still be able to cry for help). Beyond the
ceiling: reject 429-with-retry-after AND post ONE system-authored meta-notification
per agent per window — escalation-is-default-failure-mode applied to Chat itself.
The meta-notification is capped at priority 3 and never counted against any agent
(PLAN §15.8), so it cannot itself loop.
"""
from __future__ import annotations

from datetime import timedelta

from ..clock import now_dt, to_iso
from ..config import Settings
from ..core.errors import RateLimited
from .repo import Repository


def enforce_post_limit(repo: Repository, settings: Settings, agent_id: str, kind: str) -> None:
    now = now_dt()
    window_start = to_iso(now - timedelta(hours=1))
    general = repo.count_posts_since(agent_id, window_start)

    if general < settings.rate_post_per_hour:
        return  # under the general ceiling — allow

    if kind == "escalation":
        esc = repo.count_posts_since(agent_id, window_start, kind="escalation")
        if esc < settings.rate_escalation_per_hour:
            return  # escalations get their own headroom above the general ceiling

    # Rejected. Emit one meta-notification per agent per hour bucket, then 429.
    bucket = now.strftime("%Y%m%d%H")
    try:
        repo.post_system_notification({
            "kind": "needs_review",
            "title": f"Agent {agent_id} is rate-limited",
            "body": (f"`{agent_id}` exceeded the Chat post ceiling "
                     f"({settings.rate_post_per_hour}/h) and is being throttled. "
                     "Distinct-but-runaway spam is bounded; the operator is informed "
                     "instead of the drops being silent."),
            "priority": 3,
            "dedup_key": f"ratelimited:{agent_id}:{bucket}",
            "tags": ["rate-limit"],
        })
    except Exception:
        # A meta-notification must never itself break the reject path.
        pass
    repo.audit(agent_id, "rate_limited", None, f"kind={kind}")
    raise RateLimited(
        f"post ceiling {settings.rate_post_per_hour}/h exceeded for {agent_id}",
        retry_after=60,
    )
