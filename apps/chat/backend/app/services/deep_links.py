"""``source_ref`` → deep-link derivation (PLAN §6; seam #23).

**The MC scheme is consumed VERBATIM from the FROZEN contract
``context/CONTRACTS/mc-chat-review-resolve.md`` §2 — it is NOT invented here.** Per
that contract (FROZEN at MC Stage-2): the review-item identity IS the Board-minted
``ticket_id`` (no new id is minted), carried as ``source_ref.source_id``.

The link is derived server-side **at read time** from templates Chat owns, so a
late-frozen scheme upgrades all historical rows for free and an agent can never
supply a URL (``javascript:`` / free-form is structurally impossible — the host+path
are template-fixed and only ``source_id`` is substituted, URL-encoded).

Templates (contract §2 for ``mc``; PLAN §6 for board/notes):

| system | kind   | template                                             |
|--------|--------|------------------------------------------------------|
| mc     | review | ``https://mc.<domain>/review/<id>``                  |
| mc     | ticket | ``https://mc.<domain>/ticket/<id>`` (302 → /review)  |
| board  | ticket | ``https://board.<domain>/ticket/<id>``               |
| notes  | note   | ``https://notes.<domain>/note/<id>``                 |
"""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

# (system, kind) -> (host-label, path-prefix, human label). Host is always
# ``<label>.<SUITE_DOMAIN>`` — template-fixed; never derived from caller input.
_TEMPLATES: dict[tuple[str, str], tuple[str, str, str]] = {
    ("mc", "review"): ("mc", "/review/", "review queue"),
    ("mc", "ticket"): ("mc", "/ticket/", "review queue"),
    ("board", "ticket"): ("board", "/ticket/", "ticket"),
    ("notes", "note"): ("notes", "/note/", "note"),
}

# The caption printed on every deep link (UI_SPEC §1 governing principle): the
# notification is a deliberately-stale snapshot; if it and the live target disagree,
# the target wins.
TARGET_WINS_CAPTION = "target wins"


@dataclass(frozen=True)
class DeepLink:
    url: str
    label: str
    caption: str
    pending: bool

    def as_dict(self) -> dict:
        return {"url": self.url, "label": self.label, "caption": self.caption, "pending": self.pending}


def derive(
    source_system: str | None,
    source_kind: str | None,
    source_id: str | None,
    *,
    suite_domain: str,
) -> DeepLink | None:
    """Derive the deep link from the ``source_ref`` triple, or ``None`` if absent.

    The triple is all-or-none (validated at post time). ``source_id`` is opaque and
    URL-encoded on render; the host+path are template-fixed.
    """
    if not (source_system and source_kind and source_id):
        return None
    template = _TEMPLATES.get((source_system, source_kind))
    if template is None:
        return None
    host_label, path_prefix, label = template
    url = f"https://{host_label}.{suite_domain}{path_prefix}{quote(source_id, safe='')}"
    # The MC scheme is FROZEN (contract §2), so pending is False; board/notes are
    # low-risk provisionals confirmed at their Stage-2 but also render live.
    return DeepLink(url=url, label=label, caption=TARGET_WINS_CAPTION, pending=False)
