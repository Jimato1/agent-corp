"""M0 — health + single-container serve model (mount order, SPA fallback)."""
from __future__ import annotations


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert r.headers["X-API-Version"] == "1"
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert "Content-Security-Policy" in r.headers


def test_spa_root_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "pdf-forge" in r.text


def test_deep_link_falls_back_to_index(client):
    r = client.get("/organize")
    assert r.status_code == 200
    assert "id=root" in r.text or "pdf-forge" in r.text


def test_real_asset_served(client):
    r = client.get("/assets/app.js")
    assert r.status_code == 200
    assert "built asset" in r.text


def test_bogus_asset_404s_not_spa(client):
    # A missing file under /assets must 404 (StaticFiles), not fall back to HTML.
    r = client.get("/assets/does-not-exist.js")
    assert r.status_code == 404


def test_unknown_api_route_is_json_404(client):
    r = client.get("/api/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] in {"not_found", "http_error"}
