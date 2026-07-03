"""Internal Job record + descriptor projection (API §4.1)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.schemas.jobs import (
    ArtifactInfo,
    InputInfo,
    JobDescriptor,
    JobErrorInfo,
    JobState,
    ResultInfo,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None


@dataclass
class InternalArtifact:
    index: int
    path: Path
    media_type: str
    filename: str
    bytes: int


@dataclass
class Job:
    id: str
    op: str
    job_dir: Path
    input_filename: str
    input_bytes: int
    state: JobState = JobState.queued
    stage: str | None = None
    engine: str | None = None
    submitted_by: str | None = None
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
    expires_at: datetime | None = None
    # populated on success
    artifacts: list[InternalArtifact] = field(default_factory=list)
    # For multi-artifact ops, the aggregate zip streamed by GET …/result.
    bundle: InternalArtifact | None = None
    meta: dict[str, Any] = field(default_factory=dict)
    # populated on failure
    error_code: str | None = None
    error_message: str | None = None

    def touch(self) -> None:
        self.updated_at = _now()

    @property
    def is_terminal(self) -> bool:
        return self.state in {JobState.succeeded, JobState.failed, JobState.expired, JobState.canceled}

    @property
    def is_multi(self) -> bool:
        return len(self.artifacts) > 1

    @property
    def primary_artifact(self) -> InternalArtifact | None:
        """The bytes GET …/result streams: a zip for multi, else the sole file."""
        if self.bundle is not None:
            return self.bundle
        return self.artifacts[0] if self.artifacts else None

    def descriptor(self) -> JobDescriptor:
        result: ResultInfo | None = None
        if self.state == JobState.succeeded and self.artifacts:
            primary = self.primary_artifact
            assert primary is not None
            result = ResultInfo(
                href=f"/api/jobs/{self.id}/result",
                media_type=primary.media_type,
                filename=primary.filename,
                bytes=primary.bytes,
                artifacts=[
                    ArtifactInfo(
                        index=a.index,
                        href=f"/api/jobs/{self.id}/result/{a.index}",
                        media_type=a.media_type,
                        filename=a.filename,
                        bytes=a.bytes,
                    )
                    for a in self.artifacts
                ],
                meta=self.meta or None,
            )
        error = JobErrorInfo(code=self.error_code, message=self.error_message) if self.error_code else None
        return JobDescriptor(
            id=self.id,
            op=self.op,
            state=self.state,
            progress=None,
            stage=self.stage,
            created_at=_iso(self.created_at),
            updated_at=_iso(self.updated_at),
            expires_at=_iso(self.expires_at),
            engine=self.engine,
            input=InputInfo(filename=self.input_filename, bytes=self.input_bytes),
            submitted_by=self.submitted_by,
            result=result,
            error=error,
        )
