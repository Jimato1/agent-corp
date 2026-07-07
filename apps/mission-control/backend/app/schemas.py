"""Request/response models. MCP tool inputs are flat, low-arity, enum-biased scalars
(D-17 schema-complexity ceiling): no nested objects, all scalar params."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---- MCP tool inputs (flat scalars only) ------------------------------------------
class ReportStatusIn(BaseModel):
    model_config = {"extra": "forbid"}
    op_id: str = Field(max_length=128)
    ticket_id: str | None = Field(default=None)
    status_note: str = Field(max_length=500)


class RequestEscalationIn(BaseModel):
    model_config = {"extra": "forbid"}
    op_id: str = Field(max_length=128)
    ticket_id: str | None = Field(default=None)
    severity: Literal["attention", "urgent"] = "attention"
    reason: str = Field(max_length=500)


# ---- Operator relays / MC-local writes --------------------------------------------
class KillswitchRaiseIn(BaseModel):
    model_config = {"extra": "forbid"}
    level: Literal["G1", "G2"]
    reason: str = Field(min_length=1, max_length=500)


class BudgetClampIn(BaseModel):
    model_config = {"extra": "forbid"}
    sub: str
    dimension: Literal["rate", "concurrency", "cooldown", "lifetime"]
    value: float
    direction: Literal["tighten", "widen"] = "tighten"


class WipChangeIn(BaseModel):
    model_config = {"extra": "forbid"}
    global_cap: int = Field(ge=0)
    direction: Literal["tighten", "widen"] = "tighten"


class ParamSaveIn(BaseModel):
    model_config = {"extra": "forbid"}
    key: str
    value: str
    diff_hash: str | None = Field(default=None, description="Diff-hash bound confirm (policy-plane change control).")


class SilenceIn(BaseModel):
    model_config = {"extra": "forbid"}
    scope_key: str
    ttl_seconds: float | None = None


class FilterIn(BaseModel):
    model_config = {"extra": "forbid"}
    name: str
    spec: dict = {}


# ---- Inbound producer: Gateway audit-chain HEAD anchor (seam #25) ------------------
class AnchorPushIn(BaseModel):
    model_config = {"extra": "forbid"}
    chain_id: str
    seq: int = Field(ge=0)
    head_hash: str
    signed_at: str | None = None
    sig: str | None = None
    prev_seq: int | None = None
