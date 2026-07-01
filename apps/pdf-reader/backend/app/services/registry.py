"""Op-name → service dispatch. Services are registered as milestones land."""
from __future__ import annotations

from collections.abc import Callable

from .base import OpContext, OpResult

_REGISTRY: dict[str, Callable[[OpContext], OpResult]] = {}


def register(op: str, fn: Callable[[OpContext], OpResult]) -> None:
    _REGISTRY[op] = fn


def get(op: str) -> Callable[[OpContext], OpResult] | None:
    return _REGISTRY.get(op)


def has(op: str) -> bool:
    return op in _REGISTRY


def registered_ops() -> list[str]:
    return sorted(_REGISTRY)


def _load() -> None:
    """Import service modules so they self-register. Import errors (missing engine
    libs during local dev) are swallowed per-op so the app still boots."""
    import importlib

    # (module, op, attr) — each module calls register() at import, but we also
    # register here to keep wiring explicit and tolerant of missing engine deps.
    from . import noop
    register("noop", noop.run)

    for mod_name, op in [
        ("finalize", "finalize"),
        ("structure", "merge"),   # structure exposes merge + split
        ("compress", "compress"),
        ("ocr", "ocr"),
        ("crypto", "encrypt"),    # crypto exposes encrypt + decrypt
        ("permissions", "permissions"),
        ("rasterize", "rasterize"),
        ("images", "image-to-pdf"),
        ("text", "extract-text"),
        ("sanitize", "sanitize"),
        ("repair", "repair"),
    ]:
        try:
            importlib.import_module(f"app.services.{mod_name}").register_ops(register)
        except Exception:  # noqa: BLE001 — a missing engine lib shouldn't break boot
            pass


_load()
