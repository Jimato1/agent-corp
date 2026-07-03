"""Job lifecycle response models (API §4)."""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel


class JobState(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    expired = "expired"
    canceled = "canceled"


TERMINAL_STATES = {JobState.succeeded, JobState.failed, JobState.expired, JobState.canceled}


class InputInfo(BaseModel):
    filename: str
    bytes: int


class JobErrorInfo(BaseModel):
    code: str
    message: str


class ArtifactInfo(BaseModel):
    index: int
    href: str
    media_type: str
    filename: str
    bytes: int


class ResultInfo(BaseModel):
    href: str
    media_type: str
    filename: str
    bytes: int
    artifacts: list[ArtifactInfo]
    meta: dict[str, Any] | None = None


class JobDescriptor(BaseModel):
    """The shared response shape (API §4.1)."""
    id: str
    op: str
    state: JobState
    progress: float | None = None
    stage: str | None = None
    created_at: str
    updated_at: str | None = None
    expires_at: str | None = None
    engine: str | None = None
    input: InputInfo | None = None
    submitted_by: str | None = None
    result: ResultInfo | None = None
    error: JobErrorInfo | None = None
