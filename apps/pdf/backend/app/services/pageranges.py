"""Page-range parsing shared by split / rasterize / extract-text.

Accepts 1-based inclusive tokens: ``N``, ``N-M``, ``N-end``, ``end``. Raises an
AppError with a stable code on malformed or out-of-range input.
"""
from __future__ import annotations

from app.core.errors import AppError


def _bad(msg: str) -> AppError:
    return AppError("invalid_options", msg, 422)


def _oob(page: int, total: int) -> AppError:
    return AppError("out_of_range", f"Page {page} is past the end — this document has {total} pages.", 422)


def parse_token(token: str, total: int) -> list[int]:
    """A single token → ordered 0-based indices."""
    token = token.strip().lower()
    if not token:
        raise _bad("Couldn't read that range. Use forms like 1-10, 12, 20-end.")
    if "-" in token:
        a, b = token.split("-", 1)
        start = 1 if a in ("", "start") else _int(a)
        end = total if b in ("", "end") else _int(b)
    else:
        start = end = total if token == "end" else _int(token)
    if start < 1 or end < 1:
        raise _bad("Page numbers start at 1.")
    if start > total or end > total:
        raise _oob(max(start, end), total)
    if start > end:
        start, end = end, start
    return list(range(start - 1, end))


def parse_pages(expr: str, total: int) -> list[int]:
    """A comma-separated expression → flat ordered 0-based indices (deduped)."""
    seen: dict[int, None] = {}
    for tok in expr.split(","):
        if tok.strip():
            for i in parse_token(tok, total):
                seen[i] = None
    if not seen:
        raise _bad("No pages selected.")
    return list(seen)


def parse_range_groups(tokens: list[str], total: int) -> list[list[int]]:
    """A list of range strings → one 0-based index group per range (for split)."""
    groups = [parse_token(t, total) for t in tokens if t.strip()]
    if not groups:
        raise _bad("No ranges given.")
    return groups


def _int(s: str) -> int:
    try:
        return int(s.strip())
    except ValueError as exc:
        raise _bad(f"'{s}' isn't a page number.") from exc
