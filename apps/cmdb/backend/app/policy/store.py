"""The policy store — git-backed markdown + write-through snapshot + boot-integrity (§1).

The gate NEVER reads the repo asynchronously. The decision path reads a write-through,
in-process snapshot: every accepted write is one transaction — validate → write markdown →
git commit → (push, for weakening) → parse → **atomic snapshot swap**. ``policy_version``
in every verdict is the commit hash the live snapshot was built from.

Boot/restore integrity detector (§1, AR cluster D): on boot, before serving, verify
(a) repo HEAD == the ``git_commit`` at the tip of the hash-chained ``policy_change_log``,
and (b) local HEAD is present on the configured remote. Any mismatch / parse failure /
inability to complete the checks ⇒ the evaluator serves ``deny(policy_unavailable)`` until
a step-up-confirmed re-arm. A restore is therefore DETECTED, not assumed announced.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass
from pathlib import Path

import yaml

from .. import chainlog
from ..clock import now_iso
from .constants import FLOOR_NON_AUTO, TIERS
from .gitrepo import GitRepo
from .models import Host, Snapshot
from .schema import (
    SchemaError,
    build_catalog_entry,
    build_host,
    build_task_type,
    build_tier,
    parse_frontmatter,
)


@dataclass(frozen=True)
class IntegrityState:
    ok: bool
    reason: str
    head: str | None = None
    chain_tip_commit: str | None = None
    remote_ok: bool = False


def _default_tier_yaml(name: str) -> str:
    # tier0 = every cell ask (root-of-trust); tiers loosen package/config/service only,
    # never the floor. These seeds are floor-valid by construction.
    if name == "tier0":
        defaults = {"package_update": "ask", "config_change": "ask", "service_restart": "ask"}
    elif name == "tier1":
        defaults = {"package_update": "ask", "config_change": "ask", "service_restart": "ask"}
    elif name == "tier2":
        defaults = {"package_update": "auto", "config_change": "ask", "service_restart": "auto"}
    else:  # tier3 — stateless/canary-eligible
        defaults = {"package_update": "auto", "config_change": "auto", "service_restart": "auto"}
    doc = {
        "tier": name, "defaults": defaults,
        "health_check_timeout_s": 60, "ssh_wait_timeout_s": 120,
    }
    return "---\n" + yaml.safe_dump(doc, sort_keys=False) + "---\n"


class PolicyStore:
    def __init__(self, settings, db) -> None:
        self.settings = settings
        self.db = db
        self.repo = GitRepo(Path(settings.policy_repo_path))
        self._lock = threading.Lock()
        self._snapshot: Snapshot | None = None
        self._integrity: IntegrityState = IntegrityState(False, "not_booted")

    # -- directories ---------------------------------------------------------------
    @property
    def _root(self) -> Path:
        return Path(self.settings.policy_repo_path)

    def _dirs(self) -> None:
        for d in ("hosts", "tiers", "task-types", "catalog", "sandbox"):
            (self._root / d).mkdir(parents=True, exist_ok=True)

    # -- bootstrap -----------------------------------------------------------------
    def bootstrap(self) -> None:
        """Create the repo + seed the four tiers + genesis commit + genesis chain row."""
        fresh = not self.repo.exists()
        if fresh:
            self.repo.init()
        self._dirs()
        if fresh:
            for t in TIERS:
                (self._root / "tiers" / f"{t}.md").write_text(_default_tier_yaml(t), encoding="utf-8")
            pool = "---\n" + yaml.safe_dump({"enabled": True, "slots": []}, sort_keys=False) + "---\n"
            (self._root / "sandbox" / "pool.md").write_text(pool, encoding="utf-8")
            (self._root / "README.md").write_text(
                "# cmdb_policy — CANONICAL policy store\n\nOperator-authored markdown; the "
                "SQLite index is rebuildable. Verify history OUT-OF-BAND on the remote.\n",
                encoding="utf-8",
            )
        commit = self.repo.head()
        if commit is None:
            commit = self.repo.commit_genesis("genesis: cmdb policy store")
        if self.settings.policy_repo_remote and self.settings.require_remote is False:
            pass  # tests skip remote wiring
        # Seed the genesis chain row iff the chain is empty (so boot-integrity never sees an
        # empty chain against a non-empty repo).
        if chainlog.chain_tip(self.db) is None:
            chainlog.append_chain(
                self.db, sub="op:bootstrap", jti=None, session=None, edit_kind="genesis",
                weakening=False, diff_hash=None, git_commit=commit, confirm_token_id=None,
            )

    # -- snapshot ------------------------------------------------------------------
    def build_snapshot(self) -> Snapshot:
        commit = self.repo.head() or ""
        hosts: dict[str, Host] = {}
        tiers = {}
        task_types = {}
        catalog = {}

        for p in sorted((self._root / "hosts").glob("*.md")):
            d = parse_frontmatter(p.read_text(encoding="utf-8"))
            h = build_host(d)
            if h.host_class != "managed":
                raise SchemaError(f"hosts/{p.name}: only managed hosts live here; disposable slots go in sandbox/pool.md")
            hosts[h.host_id] = h
        for p in sorted((self._root / "tiers").glob("*.md")):
            d = parse_frontmatter(p.read_text(encoding="utf-8"))
            t = build_tier(p.stem, d)
            tiers[t.name] = t
        for p in sorted((self._root / "task-types").glob("*.md")):
            d = parse_frontmatter(p.read_text(encoding="utf-8"))
            tt = build_task_type(d)
            task_types[tt.type_key] = tt
        for p in sorted((self._root / "catalog").glob("*.md")):
            d = parse_frontmatter(p.read_text(encoding="utf-8"))
            ce = build_catalog_entry(d)
            catalog[ce.playbook_key] = ce

        sandbox_enabled = True
        pool_path = self._root / "sandbox" / "pool.md"
        if pool_path.is_file():
            pool = parse_frontmatter(pool_path.read_text(encoding="utf-8"))
            sandbox_enabled = bool(pool.get("enabled", True))
            for slot in pool.get("slots", []) or []:
                sd = dict(slot)
                sd["class"] = "disposable"
                h = build_host(sd)  # validates: disposable carries no tier/windows/overrides/wazuh
                hosts[h.host_id] = h

        # Floor re-assertion at parse time: no seeded/authored tier/host may carry a floor 'auto'.
        for t in tiers.values():
            for ac, mode in t.defaults.items():
                if mode == "auto" and ac in FLOOR_NON_AUTO:
                    raise SchemaError(f"tier {t.name}: floor class {ac} is 'auto' on disk (invariant break)")

        return Snapshot(
            git_commit=commit, hosts=hosts, tiers=tiers, task_types=task_types,
            catalog=catalog, sandbox_enabled=sandbox_enabled,
        )

    # -- integrity -----------------------------------------------------------------
    def check_integrity(self, snapshot: Snapshot | None) -> IntegrityState:
        head = self.repo.head()
        if head is None:
            return IntegrityState(False, "no_head")
        if snapshot is None:
            return IntegrityState(False, "snapshot_parse_failed", head=head)
        tip = chainlog.chain_tip(self.db)
        tip_commit = tip["git_commit"] if tip else None
        if tip_commit is None:
            return IntegrityState(False, "chain_empty", head=head)
        if tip_commit != head:
            # Either the repo or the chain was rolled back independently (AR cluster D).
            return IntegrityState(False, "head_chain_mismatch", head=head, chain_tip_commit=tip_commit)
        remote_ok = True
        if self.settings.require_remote:
            if not self.repo.has_remote(self.settings.policy_repo_remote):
                return IntegrityState(False, "remote_not_configured", head=head, chain_tip_commit=tip_commit)
            remote_ok = self.repo.remote_has_head(self.settings.policy_repo_remote)
            if not remote_ok:
                return IntegrityState(False, "head_not_on_remote", head=head, chain_tip_commit=tip_commit)
        return IntegrityState(True, "ok", head=head, chain_tip_commit=tip_commit, remote_ok=remote_ok)

    # -- boot + accessors ----------------------------------------------------------
    def boot(self) -> None:
        try:
            snap = self.build_snapshot()
        except SchemaError:
            snap = None
        integ = self.check_integrity(snap)
        with self._lock:
            self._snapshot = snap if integ.ok else snap  # keep the parsed snap for display; gate uses integrity
            self._integrity = integ

    def reload_snapshot(self) -> None:
        """Rebuild + swap the snapshot atomically after an accepted write."""
        snap = self.build_snapshot()
        integ = self.check_integrity(snap)
        with self._lock:
            self._snapshot = snap
            self._integrity = integ

    def current(self) -> tuple[Snapshot | None, IntegrityState]:
        with self._lock:
            return self._snapshot, self._integrity

    def re_arm(self) -> IntegrityState:
        """Operator step-up re-arm after a detected restore (§1). Re-checks integrity."""
        self.boot()
        _, integ = self.current()
        return integ

    # -- write-through primitives (used by change control) -------------------------
    def write_files(self, files: dict[str, str], deletes: tuple[str, ...] = ()) -> None:
        for rel, content in files.items():
            path = self._root / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        for rel in deletes:
            path = self._root / rel
            if path.is_file():
                path.unlink()

    def commit(self, message: str, *, sub: str, session: str | None) -> str:
        return self.repo.commit_all(message, trailers={"operator": sub, "session": session or "-"})

    def push(self) -> None:
        self.repo.push(self.settings.policy_repo_remote)

    def rollback(self) -> None:
        self.repo.rollback_last()
