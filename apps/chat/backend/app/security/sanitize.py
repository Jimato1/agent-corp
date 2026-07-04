"""Render-time markdown sanitizer (PLAN §12 injection row; UI_SPEC §4.2).

Bodies are stored **as posted** for audit fidelity; sanitation is a render-time
duty. This renders a restricted markdown subset to HTML that is XSS-safe **by
construction**:

1. **Escape ALL HTML first.** No raw HTML from a body can ever reach the DOM — the
   only tags in the output are the fixed safe set emitted here, none with a
   ``href``/``src``/event attribute.
2. **Links render as dead text** (anti-phishing, ARCH §12): ``[text](url)`` emits the
   visible text only, non-clickable. The ONLY live link on a notification is the
   template-derived MC deep-link, which is built elsewhere from ``source_ref`` and is
   never part of the body.
3. **Remote images are stripped to dead text**: ``![alt](url)`` emits ``[image: alt]``
   — no ``<img>``, no remote fetch, no tracking pixel.

The output is safe to inject via ``dangerouslySetInnerHTML`` because there is no code
path by which attacker-controlled text becomes markup or an attribute value.
"""
from __future__ import annotations

import html
import re

_FENCE_RE = re.compile(r"```(.*?)```", re.DOTALL)
_IMG_RE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_BARE_URL_RE = re.compile(r"(?<![\">])\b(?:https?|ftp)://[^\s<]+", re.IGNORECASE)
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_ITALIC_RE = re.compile(r"(?<!\*)\*([^*\n]+)\*(?!\*)")
_INLINE_CODE_RE = re.compile(r"`([^`\n]+)`")


def _inline(text: str) -> str:
    """Inline transforms on already-HTML-escaped text."""
    # images first (strip the URL, keep alt as dead text)
    text = _IMG_RE.sub(lambda m: f'<span class="dead-ref">[image: {m.group(1)}]</span>', text)
    # links -> visible text only, non-clickable
    text = _LINK_RE.sub(lambda m: f'<span class="dead-link" title="link removed (anti-phishing)">{m.group(1)}</span>', text)
    # bare URLs -> dead text
    text = _BARE_URL_RE.sub(lambda m: f'<span class="dead-link" title="link removed (anti-phishing)">{m.group(0)}</span>', text)
    text = _INLINE_CODE_RE.sub(lambda m: f"<code>{m.group(1)}</code>", text)
    text = _BOLD_RE.sub(lambda m: f"<strong>{m.group(1)}</strong>", text)
    text = _ITALIC_RE.sub(lambda m: f"<em>{m.group(1)}</em>", text)
    return text


def render_markdown(body: str) -> str:
    """Render a body to sanitized HTML (see module docstring for the guarantees)."""
    if not body:
        return ""
    escaped = html.escape(body, quote=True)

    # Protect fenced code blocks: emit as <pre><code> with NO inline processing.
    fences: list[str] = []

    def _stash(m: re.Match) -> str:
        fences.append(m.group(1))
        return f"\x00FENCE{len(fences) - 1}\x00"

    staged = _FENCE_RE.sub(_stash, escaped)

    blocks_out: list[str] = []
    for raw_block in re.split(r"\n\s*\n", staged):
        block = raw_block.strip("\n")
        if not block.strip():
            continue
        # fenced code placeholder as its own block
        fence_match = re.fullmatch(r"\x00FENCE(\d+)\x00", block.strip())
        if fence_match:
            code = fences[int(fence_match.group(1))].strip("\n")
            blocks_out.append(f"<pre><code>{code}</code></pre>")
            continue
        lines = block.split("\n")
        if all(re.match(r"\s*[-*+]\s+", ln) for ln in lines):
            items = "".join(f"<li>{_inline(re.sub(r'^\s*[-*+]\s+', '', ln))}</li>" for ln in lines)
            blocks_out.append(f"<ul>{items}</ul>")
            continue
        heading = re.match(r"^(#{1,6})\s+(.*)$", lines[0])
        if heading and len(lines) == 1:
            level = min(len(heading.group(1)) + 2, 6)  # h1->h3 (paper pane already large)
            blocks_out.append(f"<h{level}>{_inline(heading.group(2))}</h{level}>")
            continue
        paragraph = "<br>".join(_inline(ln) for ln in lines)
        blocks_out.append(f"<p>{paragraph}</p>")

    return "".join(blocks_out)
