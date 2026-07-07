"""The fail-closed weakening classifier (§6.2). The load-bearing case: a NEW catalog entry
born rollback_declared:true that silently flips a cell auto-eligible is caught (cluster C)."""
from __future__ import annotations

from app.policy.classifier import classify
from app.policy.models import CatalogEntry, Host, Snapshot, Tier, Window


def _snap(hosts=None, tiers=None, catalog=None, task_types=None, sandbox_enabled=True):
    return Snapshot(git_commit="c", hosts=hosts or {}, tiers=tiers or {}, task_types=task_types or {},
                    catalog=catalog or {}, sandbox_enabled=sandbox_enabled)


TIER2 = Tier(name="tier2", defaults={"package_update": "auto"})


def test_new_catalog_entry_flips_cell_auto_eligible_is_weakening():
    # A host+tier already says package_update=auto, but with NO catalog rollback the gate
    # DEMOTES it to ask. Adding a catalog entry born rollback_declared:true flips the cell
    # auto-eligible — the derived-effect diff MUST catch it (the critical cluster-C finding).
    host = Host(host_id="web-04", host_class="managed", tier="tier2")
    old = _snap(hosts={"web-04": host}, tiers={"tier2": TIER2}, catalog={})
    new = _snap(hosts={"web-04": host}, tiers={"tier2": TIER2},
                catalog={"pkg": CatalogEntry("pkg", "package_update", "", ("tier2",), True)})
    c = classify(old, new)
    assert c.weakening is True
    assert any(cell["action_class"] == "package_update" and cell["after"] == "auto"
               for cell in c.blast.cells_made_auto)


def test_new_allow_window_is_weakening():
    old_h = Host(host_id="web-04", host_class="managed", tier="tier2")
    new_h = Host(host_id="web-04", host_class="managed", tier="tier2",
                 windows=(Window(id="w", kind="allow", tzid="Etc/UTC", rrule="FREQ=DAILY",
                                 start_local="00:00", end_local="23:59"),))
    old = _snap(hosts={"web-04": old_h}, tiers={"tier2": TIER2})
    new = _snap(hosts={"web-04": new_h}, tiers={"tier2": TIER2})
    c = classify(old, new)
    assert c.weakening is True
    assert any(r.startswith("new_allow_window") for r in c.reasons)
    assert c.blast.hosts_gain_coverage >= 1


def test_snapshot_capability_off_none_is_weakening():
    old_h = Host(host_id="nas-01", host_class="managed", tier="tier0", snapshot_capability="none")
    new_h = Host(host_id="nas-01", host_class="managed", tier="tier0", snapshot_capability="btrfs")
    c = classify(_snap(hosts={"nas-01": old_h}), _snap(hosts={"nas-01": new_h}))
    assert c.weakening is True and any("snapshot_capability_enabled" in r for r in c.reasons)


def test_tier_downgrade_is_weakening():
    old_h = Host(host_id="h", host_class="managed", tier="tier0")
    new_h = Host(host_id="h", host_class="managed", tier="tier3")
    c = classify(_snap(hosts={"h": old_h}), _snap(hosts={"h": new_h}))
    assert c.weakening is True and any("tier_downgrade" in r for r in c.reasons)


def test_host_gains_policy_is_weakening():
    old_h = Host(host_id="h", host_class="managed", tier=None)  # unpolicied sentinel
    new_h = Host(host_id="h", host_class="managed", tier="tier2")
    c = classify(_snap(hosts={"h": old_h}), _snap(hosts={"h": new_h}))
    assert c.weakening is True and any("host_gains_policy" in r for r in c.reasons)


def test_wazuh_bind_is_weakening():
    old_h = Host(host_id="h", host_class="managed", tier="tier2")
    new_h = Host(host_id="h", host_class="managed", tier="tier2", wazuh_agent_id="007")
    c = classify(_snap(hosts={"h": old_h}), _snap(hosts={"h": new_h}))
    assert c.weakening is True and any("wazuh_bind" in r for r in c.reasons)


def test_sandbox_re_enable_is_weakening():
    c = classify(_snap(sandbox_enabled=False), _snap(sandbox_enabled=True))
    assert c.weakening is True and "sandbox_pool_re_enabled" in c.reasons


def test_disposable_slot_creation_is_weakening():
    new_h = Host(host_id="sbx-01", host_class="disposable", tier=None)
    c = classify(_snap(), _snap(hosts={"sbx-01": new_h}))
    assert c.weakening is True and any("disposable_slot_created" in r for r in c.reasons)


def test_tightening_add_freeze_is_not_weakening():
    old_h = Host(host_id="h", host_class="managed", tier="tier2")
    new_h = Host(host_id="h", host_class="managed", tier="tier2",
                 windows=(Window(id="f", kind="freeze", tzid="Etc/UTC", rrule="FREQ=DAILY",
                                 start_local="00:00", end_local="23:59"),))
    c = classify(_snap(hosts={"h": old_h}), _snap(hosts={"h": new_h}))
    assert c.weakening is False and c.reasons == []


def test_no_change_is_not_weakening():
    h = Host(host_id="h", host_class="managed", tier="tier2")
    s = _snap(hosts={"h": h}, tiers={"tier2": TIER2})
    assert classify(s, s).weakening is False
