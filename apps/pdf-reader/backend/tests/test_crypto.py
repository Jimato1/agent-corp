"""M5 — encrypt / decrypt / permissions (pikepdf crypto)."""
from __future__ import annotations

import io

import pikepdf
import pytest
from conftest import make_encrypted_pdf, make_pdf, submit_and_wait


def _download(client, job_id: str) -> bytes:
    r = client.get(f"/api/jobs/{job_id}/result")
    assert r.status_code == 200, r.text
    return r.content


def test_encrypt_requires_password_to_open(client):
    src = make_pdf(2)
    r, final = submit_and_wait(client, "encrypt", src, options='{"user_password":"pw1","owner_password":"own1"}')
    assert final["state"] == "succeeded", final
    out = _download(client, r.json()["id"])

    with pytest.raises(pikepdf.PasswordError):
        pikepdf.open(io.BytesIO(out))  # no password → fails
    with pikepdf.open(io.BytesIO(out), password="pw1") as pdf:  # opens with password
        assert len(pdf.pages) == 2


def test_decrypt_roundtrip(client):
    enc = make_encrypted_pdf("secret", pages=3)
    r, final = submit_and_wait(client, "decrypt", enc, options='{"password":"secret"}')
    assert final["state"] == "succeeded", final
    out = _download(client, r.json()["id"])
    with pikepdf.open(io.BytesIO(out)) as pdf:  # opens with NO password
        assert len(pdf.pages) == 3
        assert pdf.is_linearized


def test_decrypt_wrong_password_fails(client):
    enc = make_encrypted_pdf("secret")
    r, final = submit_and_wait(client, "decrypt", enc, options='{"password":"nope"}')
    assert final["state"] == "failed"
    assert final["error"]["code"] == "wrong_password"


def test_permissions_bits_applied(client):
    src = make_pdf(2)
    r, final = submit_and_wait(
        client, "permissions", src,
        options='{"print":"none","modify":false,"extract":false,"annotate":false,"owner_password":"own"}',
    )
    assert final["state"] == "succeeded", final
    out = _download(client, r.json()["id"])
    with pikepdf.open(io.BytesIO(out), password="own") as pdf:
        allow = pdf.allow
        assert allow.extract is False
        assert allow.print_highres is False
        assert allow.modify_other is False
