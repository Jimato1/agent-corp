"""Regression tests for the adversarial-verification findings (Stage-4 verify pass)."""
from __future__ import annotations

import pytest

from app.authn.jwks import KeyRing
from app.config import Settings
from app.db import Database
from app.security.hygiene import SecretDetected, scan_for_secrets
from app.services.feed import FeedBroker
from app.services.outbox import OutboxWorker
from app.services.repo import Repository


def test_refresh_drops_a_retired_jwks_kid(monkeypatch):
    """A kid auth REMOVES from its served JWKS must stop validating after refresh — the
    Redis-independent kill lever (finding: refresh() merged and never dropped kids)."""
    import app.authn.jwks as jwks_mod

    ring = KeyRing(jwks_url="http://auth/jwks")
    ring.add_hs256("test-static", "s")  # static/injected key — must survive refresh

    docs = iter([
        {"keys": [{"kty": "oct", "kid": "k1", "k": "YWJjZGVm"},
                  {"kty": "oct", "kid": "k2", "k": "YWJjZGVm"}]},
        {"keys": [{"kty": "oct", "kid": "k1", "k": "YWJjZGVm"}]},  # k2 retired
    ])

    def fake_refresh(self):
        try:
            doc = next(docs)
        except StopIteration:
            return False
        built = {jwk["kid"]: jwks_mod._verifier_from_jwk(jwk) for jwk in doc["keys"]}
        with self._lock:
            self._by_kid = {**self._static, **{k: v for k, v in built.items() if v}}
        return True

    monkeypatch.setattr(KeyRing, "refresh", fake_refresh)

    ring.refresh()
    assert ring.verifier_for("k1") and ring.verifier_for("k2") and ring.verifier_for("test-static")

    ring.refresh()  # second doc retires k2
    assert ring.verifier_for("k1") is not None
    assert ring.verifier_for("k2") is None                 # retired kid no longer validates
    assert ring.verifier_for("test-static") is not None    # static key survives


def test_pkcs8_encrypted_private_key_is_rejected():
    with pytest.raises(SecretDetected):
        scan_for_secrets("-----BEGIN ENCRYPTED PRIVATE KEY-----")
    with pytest.raises(SecretDetected):
        scan_for_secrets("-----BEGIN PRIVATE KEY-----")     # plain PKCS#8


def test_escalation_repush_nag_survives_many_deliveries(tmp_path):
    """An un-acked escalation must keep re-pushing on cadence until acked; a successful
    delivery resets attempts so the failure cap never silences the nag (PLAN §11.2)."""
    settings = Settings(db_path=tmp_path / "c.sqlite3", backup_dir=tmp_path / "b",
                        ntfy_enabled=True, suite_domain="suite.local")
    db = Database(settings.db_path)
    db.connect()
    repo = Repository(db, settings, FeedBroker())
    worker = OutboxWorker(db, settings, repo)

    def force_old_push(nid: str) -> None:
        with db.write_lock, db.writer as c:
            c.execute("UPDATE notifications SET last_pushed_at='2000-01-01T00:00:00.000Z' WHERE notification_id=?", (nid,))

    def status(nid: str) -> str:
        return db.reader().execute("SELECT status FROM push_outbox WHERE notification_id=?", (nid,)).fetchone()["status"]

    try:
        nid = repo.post_notification("agent:x", {
            "kind": "escalation", "title": "NAS hung", "body": "b", "op_id": "e1"}).notification_id

        # Many delivery cycles: attempts must stay 0 (never climb toward the cap).
        for _ in range(settings.ntfy_max_attempts + 5):
            worker._mark_delivered(nid)
        row = db.reader().execute("SELECT attempts, status FROM push_outbox WHERE notification_id=?", (nid,)).fetchone()
        assert row["attempts"] == 0 and row["status"] == "delivered"

        # Un-acked + stale last push → re-arm re-queues it (still nagging after N deliveries).
        force_old_push(nid)
        worker._rearm_escalations()
        assert status(nid) == "pending"
        assert nid in [r[0] for r in worker._claim_due()]

        # Ack → the next re-arm no longer re-queues it (silence requires ack).
        worker._mark_delivered(nid)          # the re-pushed nag delivers
        repo.ack(nid, "op:ada")
        force_old_push(nid)
        worker._rearm_escalations()
        assert status(nid) == "delivered"    # NOT re-queued once acked
    finally:
        db.close()
