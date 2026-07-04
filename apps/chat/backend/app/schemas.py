"""Wire schemas (PLAN §3/§4). Input models are validated by pydantic; envelope/
broadcast OUTPUT is assembled as plain dicts in :mod:`app.services.repo` so the
exact JSON shape the UI + MCP consume is defined in one place.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

Kind = Literal["escalation", "needs_review", "done"]
SourceSystem = Literal["board", "mc", "notes"]
SourceKind = Literal["ticket", "review", "note"]

# Priority bands, server-clamped by kind (PLAN §3.2) — kills priority inflation.
_BANDS: dict[str, tuple[int, int, int]] = {
    # kind: (default, lo, hi)
    "escalation": (5, 5, 5),
    "needs_review": (4, 3, 4),
    "done": (2, 1, 2),
}


def clamp_priority(kind: str, priority: int | None) -> int:
    default, lo, hi = _BANDS[kind]
    if priority is None:
        return default
    return max(lo, min(hi, int(priority)))


class PostNotificationIn(BaseModel):
    kind: Kind
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=4000)
    op_id: str = Field(min_length=1, max_length=128)
    priority: int | None = Field(default=None, ge=1, le=5)
    ticket_id: str | None = Field(default=None, max_length=128)
    fencing_token: str | None = Field(default=None, max_length=128)
    source_system: SourceSystem | None = None
    source_kind: SourceKind | None = None
    source_id: str | None = Field(default=None, max_length=256)
    tags: list[str] = Field(default_factory=list, max_length=8)
    dedup_key: str | None = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def _check_source_ref(self) -> "PostNotificationIn":
        present = [self.source_system, self.source_kind, self.source_id]
        if any(x is not None for x in present) and not all(x is not None for x in present):
            raise ValueError("source_system, source_kind and source_id are all-or-none")
        for t in self.tags:
            if len(t) > 40:
                raise ValueError("each tag must be <= 40 chars")
        return self


class BroadcastIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    priority: int = Field(default=3, ge=1, le=5)
    expires_at: str | None = None  # RFC3339; default computed server-side


class BatchAckIn(BaseModel):
    up_to_seq: int = Field(ge=0)
    kind: Kind | None = None
