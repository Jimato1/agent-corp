"""library.corpus.frontmatter — deterministic frontmatter (a strict YAML subset).

The service is the SINGLE writer of every corpus file (PLAN §1.1), so it fully
controls the frontmatter dialect. We emit each top-level key on one line as
`key: <compact-json-value>`. This is:

  * valid YAML 1.2 (flow-style JSON is a YAML subset), so external YAML tooling and
    a human reading the file both parse it identically;
  * round-trippable with pure stdlib (json), so the whole corpus layer — including
    the rebuildable-index proof — runs with NO third-party dependency;
  * deterministic (json.dumps with sort_keys=False, fixed separators), which the
    canonical-file invariant relies on.

A corpus file is:

    ---\n
    <frontmatter lines>\n
    ---\n
    <body bytes ...>

`content_sha256` is ALWAYS computed over the BODY bytes only (never the
frontmatter), so evidence attestation binds to content independent of metadata
churn (PLAN §1.2 / §2.2).
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

_DELIM = "---"


def dump_frontmatter(meta: dict[str, Any]) -> str:
    lines = [_DELIM]
    for key, value in meta.items():
        # compact deterministic JSON; ensure_ascii=False keeps URLs/titles readable.
        val = json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
        lines.append(f"{key}: {val}")
    lines.append(_DELIM)
    return "\n".join(lines) + "\n"


def compose(meta: dict[str, Any], body: str) -> str:
    """Full canonical file text = frontmatter + body. Body is stored verbatim."""
    return dump_frontmatter(meta) + body


def parse(text: str) -> tuple[dict[str, Any], str]:
    """Split a canonical file into (meta, body). Body preserves exact bytes after
    the closing delimiter's newline."""
    if not text.startswith(_DELIM):
        raise ValueError("missing opening frontmatter delimiter")
    # find the closing delimiter on its own line
    idx = text.find("\n" + _DELIM, len(_DELIM))
    if idx == -1:
        raise ValueError("missing closing frontmatter delimiter")
    fm_block = text[len(_DELIM) : idx].strip("\n")
    # body starts after "\n---\n"
    after = text[idx + 1 + len(_DELIM) :]
    body = after[1:] if after.startswith("\n") else after
    meta: dict[str, Any] = {}
    for raw in fm_block.split("\n"):
        line = raw.rstrip("\r")
        if not line.strip():
            continue
        sep = line.find(": ")
        if sep == -1:
            if line.endswith(":"):
                meta[line[:-1].strip()] = None
                continue
            raise ValueError(f"malformed frontmatter line: {line!r}")
        key = line[:sep].strip()
        val = line[sep + 2 :]
        meta[key] = json.loads(val)
    return meta, body


def body_sha256(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()
