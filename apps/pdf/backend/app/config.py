"""Application settings — the single reader of the environment.

Every knob is namespaced ``PDFFORGE_`` (pydantic-settings). Nothing else in the
app should read ``os.environ`` directly (STRUCTURE §6, PLAN task 2).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PDFFORGE_", env_file=".env", extra="ignore")

    # ---- Serve model (D4/D6) ----
    static_dir: Path = Field(default=Path("static"), description="Built SPA directory (image: /app/static).")
    api_version: str = Field(default="1", description="Advertised on X-API-Version.")

    # ---- Storage / temp (D2) ----
    jobs_dir: Path = Field(default=Path("jobs"), description="Per-job scratch root (image: /app/jobs, a named volume, NOT tmpfs).")

    # ---- Upload validation (SCOPE §5c) ----
    max_upload_mb: int = Field(default=200, description="Hard streaming per-file upload cap → 413.")
    max_total_upload_mb: int = Field(default=400, description="Aggregate per-request upload cap → 413.")
    max_input_files: int = Field(default=50, description="Max files in one multipart submit → 422.")
    max_page_count: int = Field(default=5000, description="Reject absurd page counts at validation AND in the worker.")
    allowed_pdf_ext: tuple[str, ...] = Field(default=(".pdf",))
    allowed_image_ext: tuple[str, ...] = Field(default=(".png", ".jpg", ".jpeg", ".tif", ".tiff"))

    # ---- Resource bounds (D3) ----
    worker_count: int = Field(default=1, description="Max concurrent job subprocesses (semaphore-gated, 1–2).")
    queue_maxsize: int = Field(default=8, description="Bounded queue depth; over-capacity → 429.")
    job_timeout_seconds: int = Field(default=300, description="Per-job wall-clock timeout.")
    ocr_timeout_seconds: int = Field(default=120, description="Per-page Tesseract timeout.")
    job_ttl_seconds: int = Field(default=3600, description="Orphan sweep TTL → expired.")
    janitor_interval_seconds: int = Field(default=120, description="How often the TTL/orphan sweep runs.")
    disk_reserve_factor: int = Field(default=4, description="Require free >= factor × max upload → else 507.")
    rlimit_cpu_seconds: int = Field(default=300, description="setrlimit RLIMIT_CPU per worker job (POSIX).")
    rlimit_fsize_mb: int = Field(default=1024, description="setrlimit RLIMIT_FSIZE per worker job (POSIX).")
    max_output_mb: int = Field(default=1024, description="Cumulative output-artifact budget per job → fail fan-out bombs.")
    max_output_artifacts: int = Field(default=2000, description="Max artifacts a single job may emit.")
    retry_after_seconds: int = Field(default=30, description="Retry-After header on 429.")

    # ---- OCR ----
    ocr_languages: tuple[str, ...] = Field(default=("eng", "deu"), description="Installed Tesseract language packs.")

    # ---- Exposure hardening ----
    expose_docs: bool = Field(default=False, description="Serve /api/docs + openapi.json (dev only).")
    trusted_proxy_ips: tuple[str, ...] = Field(
        default=(), description="If set, only honor Remote-User/Remote-Email from these client IPs.")

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def max_total_upload_bytes(self) -> int:
        return self.max_total_upload_mb * 1024 * 1024

    @property
    def max_output_bytes(self) -> int:
        return self.max_output_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
