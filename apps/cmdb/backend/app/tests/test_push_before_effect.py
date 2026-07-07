"""Push-before-effect for gate-weakening edits (§6.3, AR cluster E): a weakening edit is
not live until its tamper-evidence anchor reaches the remote; a push failure rolls the
commit back and REFUSES the edit."""
from __future__ import annotations

import subprocess

from app.tests.conftest import holder_headers, read_headers, seed

WEAKEN_FM = {
    "host_id": "web-04", "class": "managed", "tier": "tier2",
    "windows": [{"id": "w-new", "kind": "allow", "tzid": "Etc/UTC", "rrule": "FREQ=DAILY",
                 "start_local": "00:00", "end_local": "23:59"}],
}


def _bare_remote(tmp_path):
    remote = tmp_path / "remote.git"
    subprocess.run(["git", "init", "--bare", "-q", str(remote)], check=True)
    return remote


def test_weakening_pushes_then_swaps(make_app, tmp_path, operator):
    remote = _bare_remote(tmp_path)
    app, client = make_app()  # boots require_remote=False
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    # Wire + push HEAD to the remote, then flip on the remote requirement and re-boot.
    app.state.store.repo.set_remote("origin", str(remote))
    app.state.store.repo.push("origin")
    app.state.settings.require_remote = True
    app.state.store.boot()
    _, integ = app.state.store.current()
    assert integ.ok and integ.remote_ok  # HEAD present on remote

    p = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_FM},
                    headers=holder_headers(operator, "POST", "/v1/policy/propose")).json()
    c = client.post("/v1/policy/confirm",
                    json={"confirm_token": p["confirm_token"], "typed_intent": "WEAKEN web-04",
                          "diff_hash": p["diff_hash"]},
                    headers=holder_headers(operator, "POST", "/v1/policy/confirm"))
    assert c.status_code == 200, c.text
    assert c.json()["pushed"] is True
    # The commit is present on the remote (the out-of-band anchor exists before it took effect).
    ls = subprocess.run(["git", "ls-remote", str(remote)], capture_output=True, text=True, check=True)
    assert c.json()["committed"] in ls.stdout


def test_weakening_push_failure_refuses_and_rolls_back(make_app, tmp_path, operator):
    remote = _bare_remote(tmp_path)
    app, client = make_app()
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    app.state.store.repo.set_remote("origin", str(remote))
    app.state.store.repo.push("origin")
    app.state.settings.require_remote = True
    app.state.store.boot()
    head_before = app.state.store.repo.head()

    # Break the remote so push will fail.
    app.state.store.repo._run("remote", "set-url", "origin", str(tmp_path / "does-not-exist.git"))

    p = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": WEAKEN_FM},
                    headers=holder_headers(operator, "POST", "/v1/policy/propose")).json()
    c = client.post("/v1/policy/confirm",
                    json={"confirm_token": p["confirm_token"], "typed_intent": "WEAKEN web-04",
                          "diff_hash": p["diff_hash"]},
                    headers=holder_headers(operator, "POST", "/v1/policy/confirm"))
    assert c.status_code == 409 and "push" in c.json()["error"]["message"].lower()
    # Rolled back: HEAD is unchanged, the window never went live.
    assert app.state.store.repo.head() == head_before
    v = client.post("/v1/decision", json={"host_id": "web-04", "action_class": "config_change"},
                    headers=read_headers()).json()["verdict"]
    assert v["in_window"] is False
