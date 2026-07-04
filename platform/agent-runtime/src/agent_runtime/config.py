"""Versioned, git-tracked, operator-owned config (PLAN §7; RESEARCH §8.C).

Three artifacts, all under ``config/`` and version-controlled (a change is a
reviewed commit, never a runtime mutation):

  * ``config/runtime.yaml``   — the PENDING-SIZING / PENDING-SPIKE tunables with
                                documented defaults (pool size, cadences, grace
                                budget, max steps, inference base url, ...).
  * ``config/models.yaml``    — role -> pinned commit digest + quant + sig ref
                                (read by the fail-closed provenance gate).
  * ``config/personas/*.yaml``— role prompt(s), model binding, and the auth scope
                                set the persona may hold (validated in SHAPE here;
                                the live cross-check against auth's scope registry
                                is seam C13 — an integration item).

Role prompts are LOAD-BEARING behavioral contracts (the AR's forced dissent, the
PO's scope guard). This loader validates shape and surfaces the PENDING tags; it
never invents a measured value.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

try:
    import yaml
except ImportError:  # pragma: no cover - yaml is a hard dep; guard for tooling
    yaml = None  # type: ignore

from .provenance import ModelPin


# Scopes the runtime persona layer knows are auth-owned (C13). This is a SHAPE
# allow-list for local validation only; auth's registry is authoritative and the
# live check is an integration item. A persona referencing an unknown scope is a
# config error surfaced at boot, not a silent pass.
KNOWN_SCOPE_PREFIXES = ("board:", "notes:", "drive:", "chat:", "library:", "auth:", "pdf:", "cmdb:", "gateway:")


@dataclass
class RuntimeTunables:
    """PENDING-SIZING / PENDING-SPIKE placeholders with documented defaults.

    NONE of these is a measured value. The gap-1.2 sizing session and gap-1.3
    spike replace the defaults; until then the code runs on these and the status
    UI marks the concurrency 'knee C' as an estimate."""
    worker_slots: int = 4                 # PENDING-SIZING (knee C)
    hb_process_sec: float = 10.0          # PENDING-SIZING (heartbeat cadence)
    drain_grace_sec: float = 45.0         # PENDING-SIZING (p95/p99 of one step)
    max_steps: int = 24                   # PENDING-SIZING (per-role step cap)
    progress_budget_sec: float = 300.0    # PENDING-SIZING (no-progress detector)
    knee_c_estimate: int = 14             # PENDING-SIZING (display only, marked estimate)
    inference_base_url: str = "http://localhost:8000/v1"  # OpenAI-compatible seam
    board_mcp_url: str = "http://board:8080/mcp"
    notes_mcp_url: str = "http://notes:8080/mcp"
    mc_url: str = "http://mc:8080"
    auth_url: str = "http://auth:8089"
    runtime_instance_id: str = "rt-local"
    # token re-mint degraded-mode tuning (§4.4) — also PENDING operator risk call
    remint_backoff_base_sec: float = 1.0
    remint_backoff_cap_sec: float = 60.0
    breaker_fail_threshold: int = 5


@dataclass
class Persona:
    role: str
    model_role: str            # which models.yaml pin this persona binds
    prompts: dict              # role prompt(s) — the behavioral contract
    scopes: list[str]          # auth scope set the persona may hold (C13)
    is_executor: bool = False  # holds a gateway:execute-adjacent scope?
    must_dissent: bool = False # the Adversarial Reviewer's structural obligation
    persona_version: str = "0"

    def validate(self) -> list[str]:
        errs: list[str] = []
        if not self.role:
            errs.append("persona missing 'role'")
        if not self.prompts:
            errs.append(f"persona '{self.role}' has empty prompts (load-bearing contract)")
        for s in self.scopes:
            if not s.startswith(KNOWN_SCOPE_PREFIXES):
                errs.append(f"persona '{self.role}' references unknown scope '{s}' (C13 shape check)")
        # executor personas require a hardware-attested node (auth #6) — flagged,
        # enforced at enrollment in custody.py, not here.
        return errs


@dataclass
class Config:
    tunables: RuntimeTunables
    model_pins: dict[str, ModelPin]     # role -> pin
    personas: dict[str, Persona]        # role -> persona
    root: Path = field(default_factory=Path)

    def validate(self) -> list[str]:
        errs: list[str] = []
        for p in self.personas.values():
            errs.extend(p.validate())
            if p.model_role not in self.model_pins:
                errs.append(f"persona '{p.role}' binds model_role '{p.model_role}' with no models.yaml pin")
        return errs


def _load_yaml(path: Path) -> dict[str, Any]:
    if yaml is None:
        raise RuntimeError("PyYAML is required (pip install pyyaml)")
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def load_config(root: Optional[Path] = None) -> Config:
    """Load and validate config from ``root`` (default: $AR_CONFIG_DIR or ./config).

    Raises ValueError with all problems if validation fails — fail at boot, never
    run on a broken persona/model binding."""
    root = root or Path(os.environ.get("AR_CONFIG_DIR", "config"))

    raw_rt = _load_yaml(root / "runtime.yaml")
    tunables = RuntimeTunables(**{k: v for k, v in raw_rt.items() if k in RuntimeTunables.__dataclass_fields__})
    # env overrides for deployment-supplied endpoints/ids
    tunables.inference_base_url = os.environ.get("AR_INFERENCE_BASE_URL", tunables.inference_base_url)
    tunables.board_mcp_url = os.environ.get("AR_BOARD_MCP_URL", tunables.board_mcp_url)
    tunables.auth_url = os.environ.get("AR_AUTH_URL", tunables.auth_url)
    tunables.mc_url = os.environ.get("AR_MC_URL", tunables.mc_url)
    tunables.runtime_instance_id = os.environ.get("AR_RUNTIME_INSTANCE_ID", tunables.runtime_instance_id)

    raw_models = _load_yaml(root / "models.yaml")
    pins: dict[str, ModelPin] = {}
    for role, m in (raw_models.get("models") or {}).items():
        pins[role] = ModelPin(
            role=role,
            model_id=m["model_id"], repo=m.get("repo", m["model_id"]),
            commit_digest=m["commit_digest"], quant=m.get("quant", "unknown"),
            sha256=m["sha256"], sig_ref=m.get("sig_ref", ""),
            fmt=m.get("format", "safetensors"),
        )

    personas: dict[str, Persona] = {}
    pdir = root / "personas"
    if pdir.exists():
        for pf in sorted(pdir.glob("*.yaml")):
            d = _load_yaml(pf)
            personas[d["role"]] = Persona(
                role=d["role"], model_role=d.get("model_role", d["role"]),
                prompts=d.get("prompts", {}), scopes=d.get("scopes", []),
                is_executor=bool(d.get("is_executor", False)),
                must_dissent=bool(d.get("must_dissent", False)),
                persona_version=str(d.get("persona_version", "0")),
            )

    cfg = Config(tunables=tunables, model_pins=pins, personas=personas, root=root)
    errs = cfg.validate()
    if errs:
        raise ValueError("config validation failed:\n  - " + "\n  - ".join(errs))
    return cfg
