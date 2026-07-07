"""library.index.chunker — DETERMINISTIC, per-format, structure-aware chunking.

The rebuildable-index invariant (ARCHITECTURE §10) depends on chunking being a PURE
function of (canonical markdown bytes, chunker_config_id). No randomness, no neural /
semantic splitter (RESEARCH §3 rejects them: drift breaks rebuildability).

Profiles (RESEARCH §3):
  * man-page / cli-reference — split by section; keep a section whole if ≤ target;
    split a large OPTIONS section PER FLAG, never separating a flag from its
    description; NO overlap.
  * prose-guide / cli-guide / advisory — recursive heading split, then pack
    paragraphs to ~target tokens with ~overlap tokens, NEVER crossing an H1/H2.

Deterministic contextual header (embedded, not stored in body) — RESEARCH §3:
  "<title> (<version scope>) > <heading path>"  e.g.
  "tar (GNU tar 1.35, Ubuntu 24.04) > OPTIONS > --exclude"

Token counting: the exact production tokenizer is a PENDING-SIZING pin (gap-1.2). We
use a deterministic word-count proxy here, recorded verbatim in `chunker_config_id`,
so boundaries are reproducible today and the config id changes if the tokenizer ever
does (which correctly forces a full re-embed).
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Optional

# ── pinned chunker config (every component is part of the identity) ───────────
CHUNKER = {
    "lib": "library.index.chunker",
    "version": "1",
    "tokenizer": "wordcount-v1",  # PENDING-SIZING: swap for the pinned Qwen tokenizer
    "target_tokens": 512,
    "overlap_tokens": 64,
    "manpage_sections": ["NAME", "SYNOPSIS", "DESCRIPTION", "OPTIONS", "EXAMPLES", "SEE ALSO", "FILES", "ENVIRONMENT"],
    "rules": "heading-structure-aware; manpage-per-flag-no-overlap; prose-512-64-no-H1H2-cross",
}


def chunker_config_id() -> str:
    blob = repr(sorted(CHUNKER.items())).encode("utf-8")
    return "cc-" + hashlib.sha256(blob).hexdigest()[:12]


def count_tokens(text: str) -> int:
    return len(text.split())


@dataclass
class Chunk:
    n: int
    heading_path: str
    anchor: str
    text: str                 # clean body text (no contextual header)
    embed_text: str           # contextual-header-prepended text used for embedding
    char_start: int
    char_end: int
    line_start: int
    line_end: int
    content_hash: str = ""

    def __post_init__(self):
        if not self.content_hash:
            self.content_hash = hashlib.sha256(self.text.encode("utf-8")).hexdigest()


_H_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def _anchor(heading: str) -> str:
    s = heading.strip().lower()
    s = re.sub(r"[^a-z0-9\s\-_.]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s or "section"


@dataclass
class _Section:
    level: int
    heading: str
    path: list[str]
    start_line: int
    lines: list[str] = field(default_factory=list)


def _split_sections(body: str) -> list[_Section]:
    """Split markdown into heading-scoped sections, tracking the heading path."""
    sections: list[_Section] = []
    stack: list[tuple[int, str]] = []  # (level, heading)
    cur: Optional[_Section] = None
    for i, line in enumerate(body.splitlines()):
        m = _H_RE.match(line)
        if m:
            level = len(m.group(1))
            heading = m.group(2).strip()
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, heading))
            cur = _Section(level=level, heading=heading, path=[h for _l, h in stack], start_line=i)
            sections.append(cur)
        else:
            if cur is None:
                cur = _Section(level=0, heading="", path=[], start_line=i)
                sections.append(cur)
            cur.lines.append(line)
    return sections


def _contextual_header(title: str, version_scope: str, heading_path: list[str]) -> str:
    hp = " > ".join(heading_path) if heading_path else ""
    base = f"{title} ({version_scope})" if version_scope else title
    return f"{base} > {hp}" if hp else base


def _pack_paragraphs(paras: list[str], target: int, overlap: int) -> list[str]:
    """Pack paragraphs to ~target tokens with ~overlap tokens carried forward.
    Deterministic greedy packing."""
    chunks: list[str] = []
    cur: list[str] = []
    cur_tok = 0
    for p in paras:
        ptok = count_tokens(p)
        if cur and cur_tok + ptok > target:
            chunks.append("\n\n".join(cur))
            # carry overlap: keep trailing paragraphs summing ~overlap tokens
            carry: list[str] = []
            ctok = 0
            for q in reversed(cur):
                qt = count_tokens(q)
                if ctok + qt > overlap and carry:
                    break
                carry.insert(0, q)
                ctok += qt
            cur = list(carry)
            cur_tok = ctok
        cur.append(p)
        cur_tok += ptok
    if cur:
        chunks.append("\n\n".join(cur))
    return chunks


def _flag_split(section_text: str) -> list[tuple[str, str]]:
    """Split an OPTIONS section per flag. Returns [(flag_label, text)]. A flag line
    starts with '-' (e.g. '--exclude', '-x'); its description runs until the next
    flag. Never separates a flag from its description (RESEARCH §3)."""
    out: list[tuple[str, str]] = []
    cur_label = ""
    cur_lines: list[str] = []
    for line in section_text.splitlines():
        if re.match(r"^\s*(-{1,2}[A-Za-z0-9][\w\-]*)", line):
            if cur_lines:
                out.append((cur_label, "\n".join(cur_lines).strip()))
            cur_label = re.match(r"^\s*(-{1,2}[A-Za-z0-9][\w\-]*)", line).group(1)
            cur_lines = [line]
        else:
            cur_lines.append(line)
    if cur_lines:
        out.append((cur_label, "\n".join(cur_lines).strip()))
    return [(lbl, txt) for lbl, txt in out if txt]


def chunk_document(*, title: str, version_scope: str, kind: str, body: str) -> list[Chunk]:
    """Return the deterministic chunk list for one doc body."""
    target = CHUNKER["target_tokens"]
    overlap = CHUNKER["overlap_tokens"]
    is_manpage = kind in ("man-page", "cli-reference")
    sections = _split_sections(body)

    # precompute char offsets per line for citation anchors
    line_offsets: list[int] = []
    off = 0
    for line in body.splitlines(keepends=True):
        line_offsets.append(off)
        off += len(line)
    total = len(body)

    def span(start_line: int, end_line: int) -> tuple[int, int]:
        cs = line_offsets[start_line] if start_line < len(line_offsets) else total
        ce = (line_offsets[end_line + 1] if end_line + 1 < len(line_offsets) else total)
        return cs, ce

    chunks: list[Chunk] = []
    n = 0
    for sec in sections:
        sec_text = "\n".join(sec.lines).strip()
        if not sec_text and not sec.heading:
            continue
        heading_path = sec.path
        anchor = _anchor(sec.path[-1]) if sec.path else "body"
        header = _contextual_header(title, version_scope, heading_path)
        sec_start = sec.start_line
        sec_end = sec_start + len(sec.lines)

        if is_manpage:
            head_upper = (sec.heading or "").upper()
            if head_upper == "OPTIONS" and count_tokens(sec_text) > target:
                for lbl, txt in _flag_split(sec_text):
                    hp = heading_path + [lbl] if lbl else heading_path
                    header_f = _contextual_header(title, version_scope, hp)
                    cs, ce = span(sec_start, sec_end)
                    chunks.append(Chunk(
                        n=n, heading_path=" > ".join(hp), anchor=_anchor(lbl or anchor),
                        text=txt, embed_text=f"{header_f}\n{txt}",
                        char_start=cs, char_end=ce, line_start=sec_start, line_end=sec_end,
                    ))
                    n += 1
                continue
            # keep the section whole (man pages: no overlap)
            cs, ce = span(sec_start, sec_end)
            chunks.append(Chunk(
                n=n, heading_path=" > ".join(heading_path), anchor=anchor,
                text=sec_text, embed_text=f"{header}\n{sec_text}",
                char_start=cs, char_end=ce, line_start=sec_start, line_end=sec_end,
            ))
            n += 1
            continue

        # prose: pack paragraphs, never crossing this section's heading
        paras = [p.strip() for p in re.split(r"\n\s*\n", sec_text) if p.strip()]
        packed = _pack_paragraphs(paras, target, overlap) if paras else []
        if not packed and sec.heading:
            packed = [""]  # heading-only section still anchors
        for piece in packed:
            cs, ce = span(sec_start, sec_end)
            chunks.append(Chunk(
                n=n, heading_path=" > ".join(heading_path), anchor=anchor,
                text=piece, embed_text=f"{header}\n{piece}".strip(),
                char_start=cs, char_end=ce, line_start=sec_start, line_end=sec_end,
            ))
            n += 1
    return chunks
