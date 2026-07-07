"""Brokered execution — EMBEDDED ansible-runner, PLAYBOOK-ONLY (D-14). PLAN §4.2.

**The wrapper IS the security boundary.** ``run_playbook`` takes ONLY a catalog-resolved
playbook path + a schema-validated ``extravars`` dict. It **structurally cannot** forward
``module`` / ``module_args`` / ``cmdline`` — they are not parameters of any function here, and
a unit test asserts the kwargs the wrapper hands ansible-runner never contain them (RESEARCH
residual risk #1). The agent gets **no shell, no free-form command, no host list it can
widen** — it named a plan; the Gateway decides what that means and runs vetted, parameterized
steps.

``process_isolation=True`` (D-14, never disabled on the agent path); ansible-core ≥ 2.19
(inverted templating trust); every extravar tagged ``!unsafe``; a hard wall-clock cap =
catalog estimate × ``run_duration_cap_multiple`` (a hung task cannot outlast the kill switch);
a ``cancel_callback`` the kill path drives to cancel at the next safe task boundary.

The real embedded ansible-runner is import-guarded so unit tests run without ansible-core;
the ``FakeDispatcher`` (isolated build) records exactly what would have been dispatched so
tests can assert the no-forward invariant and the kwargs shape.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

# Kwargs the wrapper is STRUCTURALLY forbidden from ever passing to ansible-runner. The
# no-forward unit test asserts none of these ever appears in a dispatched kwargs dict.
FORBIDDEN_RUNNER_KWARGS = frozenset({"module", "module_args", "cmdline", "cmd", "shell", "command"})


@dataclass
class DispatchSpec:
    """The ONLY things the wrapper hands the engine: a playbook path + bounded extravars."""
    run_id: str
    playbook: str                       # catalog path for the playbook_key (never agent-named)
    extravars: dict = field(default_factory=dict)  # schema-validated; every value tagged !unsafe
    wall_clock_cap_s: int = 600
    process_isolation: bool = True
    dpkg_lock_timeout_s: int = 300


@dataclass
class DispatchResult:
    rc: int
    status: str                         # successful | failed | canceled | timeout
    events: list = field(default_factory=list)  # per-task (name, rc, stdout/stderr slices)


class Dispatcher:
    """Interface. ``run_playbook`` builds the kwargs and MUST pass through ``_forbid_forward``."""

    def run_playbook(self, spec: DispatchSpec, *, event_handler: Callable | None = None,
                     cancel_callback: Callable[[], bool] | None = None) -> DispatchResult:
        raise NotImplementedError


def _forbid_forward(kwargs: dict) -> dict:
    """The structural guard: refuse to dispatch if any forbidden kwarg is present. Belt over
    the fact that the wrapper never puts them there in the first place."""
    bad = FORBIDDEN_RUNNER_KWARGS & set(kwargs)
    if bad:
        raise RuntimeError(f"refusing to dispatch: forbidden runner kwargs present {sorted(bad)} (D-14)")
    return kwargs


def build_runner_kwargs(spec: DispatchSpec, private_data_dir: str) -> dict:
    """Assemble the EXACT kwargs handed to ansible-runner — playbook + extravars only.

    Isolated so a unit test can assert the invariant without importing ansible-runner. Note
    there is no code path that adds ``module``/``module_args``/``cmdline``; ``_forbid_forward``
    is the belt.
    """
    kwargs = {
        "private_data_dir": private_data_dir,
        "playbook": spec.playbook,
        "extravars": {k: _wrap_unsafe(v) for k, v in (spec.extravars or {}).items()},
        "process_isolation": spec.process_isolation,
        "timeout": spec.wall_clock_cap_s,
    }
    return _forbid_forward(kwargs)


def _wrap_unsafe(value):
    """Tag a value ``!unsafe`` semantics (ansible-core ≥2.19 inverted templating trust). In the
    fake path this is a no-op marker dict; the real path uses ansible's AnsibleUnsafeText."""
    return {"__unsafe__": True, "value": value}


class FakeDispatcher(Dispatcher):
    """Isolated-build dispatcher: records the dispatched kwargs (for the no-forward test) and
    returns a scripted result. NEVER touches a host."""

    def __init__(self, script: Callable[[DispatchSpec], DispatchResult] | None = None) -> None:
        self.dispatched: list[dict] = []
        self._script = script

    def run_playbook(self, spec, *, event_handler=None, cancel_callback=None) -> DispatchResult:
        kwargs = build_runner_kwargs(spec, private_data_dir="<fake>")
        self.dispatched.append(kwargs)
        # Emit a couple of task events through the handler so audit capture is exercised.
        events = [
            {"task": f"{spec.playbook} : gather", "rc": 0, "stdout": "ok"},
            {"task": f"{spec.playbook} : apply", "rc": 0, "stdout": "changed"},
        ]
        if event_handler:
            for e in events:
                event_handler(e)
        if self._script:
            return self._script(spec)
        return DispatchResult(rc=0, status="successful", events=events)


class AnsibleRunnerDispatcher(Dispatcher):
    """Production: embedded ansible-runner (D-14). Import-guarded; only used in the image."""

    def __init__(self, private_data_dir: str) -> None:
        self.private_data_dir = private_data_dir

    def run_playbook(self, spec, *, event_handler=None, cancel_callback=None) -> DispatchResult:
        import ansible_runner  # noqa: PLC0415 — import-guarded; heavy (ansible-core ≥2.19)

        kwargs = build_runner_kwargs(spec, private_data_dir=self.private_data_dir)
        # ansible-runner takes real params; unwrap the !unsafe markers into AnsibleUnsafeText.
        real_extravars = _to_ansible_unsafe(kwargs["extravars"])
        events: list = []

        def _handler(evt):
            ev = {"task": (evt.get("event_data") or {}).get("task"),
                  "rc": (evt.get("event_data") or {}).get("res", {}).get("rc"),
                  "event": evt.get("event")}
            events.append(ev)
            if event_handler:
                event_handler(ev)
            return True

        r = ansible_runner.run(
            private_data_dir=kwargs["private_data_dir"],
            playbook=kwargs["playbook"],
            extravars=real_extravars,
            process_isolation=kwargs["process_isolation"],
            timeout=kwargs["timeout"],
            event_handler=_handler,
            cancel_callback=cancel_callback,
        )
        return DispatchResult(rc=(r.rc or 0), status=str(r.status), events=events)


def _to_ansible_unsafe(wrapped: dict) -> dict:
    from ansible.utils.unsafe_proxy import AnsibleUnsafeText  # noqa: PLC0415

    out = {}
    for k, v in wrapped.items():
        raw = v["value"] if isinstance(v, dict) and v.get("__unsafe__") else v
        out[k] = AnsibleUnsafeText(raw) if isinstance(raw, str) else raw
    return out
