"""Deep-link derivation is consumed from the FROZEN contract
``context/CONTRACTS/mc-chat-review-resolve.md`` §2 — not invented. These assertions
pin the exact frozen URLs so a drift from the contract fails the build."""
from __future__ import annotations

from app.services.deep_links import TARGET_WINS_CAPTION, derive

DOMAIN = "suite.local"


def test_mc_review_matches_frozen_scheme():
    dl = derive("mc", "review", "T-000123", suite_domain=DOMAIN)
    assert dl is not None
    # contract §2: https://mc.<SUITE_DOMAIN>/review/<ticket_id>
    assert dl.url == "https://mc.suite.local/review/T-000123"
    assert dl.label == "review queue"
    assert dl.caption == TARGET_WINS_CAPTION
    assert dl.pending is False  # the MC seam is FROZEN, not a fallback


def test_mc_ticket_alias():
    dl = derive("mc", "ticket", "T-9", suite_domain=DOMAIN)
    assert dl.url == "https://mc.suite.local/ticket/T-9"  # contract §2: 302 → /review


def test_board_and_notes_templates():
    assert derive("board", "ticket", "T-5", suite_domain=DOMAIN).url == "https://board.suite.local/ticket/T-5"
    assert derive("notes", "note", "N-abc", suite_domain=DOMAIN).url == "https://notes.suite.local/note/N-abc"


def test_source_ref_all_or_none():
    assert derive(None, None, None, suite_domain=DOMAIN) is None
    assert derive("mc", "review", None, suite_domain=DOMAIN) is None


def test_source_id_is_url_encoded_never_a_free_form_url():
    # An agent can never inject a URL: only source_id is substituted, URL-encoded, and
    # the host+path are template-fixed (javascript:/free-form is structurally impossible).
    dl = derive("mc", "review", "T 000/../evil", suite_domain=DOMAIN)
    assert dl.url == "https://mc.suite.local/review/T%20000%2F..%2Fevil"


def test_unknown_system_kind_yields_no_link():
    assert derive("gateway", "run", "R-1", suite_domain=DOMAIN) is None
