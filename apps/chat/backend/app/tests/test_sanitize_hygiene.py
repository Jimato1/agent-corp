"""Render-time sanitizer (XSS-safe by construction) + ingest secret-pattern reject."""
from __future__ import annotations

import pytest

from app.security.hygiene import SecretDetected, scan_for_secrets
from app.security.sanitize import render_markdown
from .conftest import agent_headers


def test_raw_html_is_escaped_never_emitted():
    out = render_markdown("<script>alert(1)</script> <img src=http://evil/x.png>")
    assert "<script>" not in out
    assert "&lt;script&gt;" in out
    assert "<img" not in out


def test_links_render_as_dead_text_no_href():
    out = render_markdown("see [click me](http://evil.example/phish)")
    assert "click me" in out
    assert "href" not in out
    assert "evil.example" not in out  # the URL is dropped entirely


def test_remote_images_stripped_to_dead_text():
    out = render_markdown("![tracking pixel](http://evil/p.gif)")
    assert "<img" not in out
    assert "[image: tracking pixel]" in out


def test_bare_url_is_dead_text():
    out = render_markdown("visit https://evil.example now")
    assert "href" not in out
    assert "dead-link" in out


def test_markdown_subset_renders():
    out = render_markdown("**bold** and *italic* and `code`")
    assert "<strong>bold</strong>" in out
    assert "<em>italic</em>" in out
    assert "<code>code</code>" in out


def test_secret_patterns_rejected():
    for bad in ("token hvs.CAESIJ1abcdefgh", "-----BEGIN RSA PRIVATE KEY-----",
                "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZ2VudCJ9.c2lnbmF0dXJlYmxvYg"):
        with pytest.raises(SecretDetected):
            scan_for_secrets(bad)


def test_powerless_references_pass():
    # cred:// handles and rel- release ids are powerless — never redeemable — and pass.
    scan_for_secrets("cred://hosts/nas-01/root and rel-01J8QZ are fine")


def test_secret_in_posted_body_is_rejected_at_ingest(client):
    r = client.post("/api/notifications", json={
        "kind": "done", "title": "leak", "body": "here is hvs.CAESIJsecrettokenmaterial",
        "op_id": "leak-1"}, headers=agent_headers())
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "secret_pattern"
