"""Shared fixtures + the frozen-contract text loader (contract-conformance).

The conformance tests assert the code's frozen field tuples both (a) equal an
expected literal and (b) appear verbatim in the actual frozen contract .md file —
so a drift in EITHER the code or the doc fails the build.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
CONTRACTS = ROOT.parent.parent / "context" / "CONTRACTS"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


@pytest.fixture
def contract_text():
    def _load(name: str) -> str:
        return (CONTRACTS / name).read_text(encoding="utf-8")
    return _load


@pytest.fixture
def config():
    from agent_runtime.config import load_config
    return load_config(ROOT / "config")


@pytest.fixture
def frozen_clock():
    class Clock:
        def __init__(self):
            self.t = 1000.0
        def __call__(self):
            return self.t
        def advance(self, dt):
            self.t += dt
    return Clock()
