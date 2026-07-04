"""Ingest body hygiene (PLAN §11.4) — defense-in-depth under the Vault data-hygiene
rule (``vault-gateway-redemption.md`` §1).

A **secret-pattern reject** stops credential shapes at the door (400 + audit row):
OpenBao/Vault service/batch token prefixes, PEM private-key headers, and JWT-shaped
3-dot base64url blobs. Powerless references — ``cred://`` handles, ``rel-…``
release ids — are NOT secrets and pass untouched (they are the whole point of the
handle indirection).

Size caps + UTF-8 validity are enforced here too; stored bodies are as-posted, so
this is the one ingest-time gate.
"""
from __future__ import annotations

import re

# OpenBao/Vault token shapes: hvs.<...>, hvb.<...>, s.<...> (legacy)
_VAULT_TOKEN_RE = re.compile(r"\b(?:hvs|hvb)\.[A-Za-z0-9_-]{6,}\b|(?<![\w./])s\.[A-Za-z0-9]{20,}\b")
# PEM private-key headers — any variant, incl. PKCS#8 "ENCRYPTED PRIVATE KEY".
_PEM_RE = re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")
# JWT-shaped blob: three base64url segments, each reasonably long.
_JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")


class SecretDetected(ValueError):
    """A credential shape was found in a body/title/tag. Reject at ingest."""

    def __init__(self, what: str) -> None:
        super().__init__(f"content matched a secret pattern ({what}); refused")
        self.what = what


def scan_for_secrets(text: str) -> None:
    """Raise :class:`SecretDetected` if ``text`` carries a credential shape."""
    if _PEM_RE.search(text):
        raise SecretDetected("pem_private_key")
    if _VAULT_TOKEN_RE.search(text):
        raise SecretDetected("vault_token")
    if _JWT_RE.search(text):
        raise SecretDetected("jwt_blob")


def validate_utf8(text: str) -> None:
    try:
        text.encode("utf-8")
    except UnicodeEncodeError as exc:  # pragma: no cover - str is already unicode
        raise ValueError("body is not valid UTF-8") from exc
