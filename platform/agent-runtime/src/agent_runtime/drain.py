"""The RUN -> DRAIN -> KILL epoch machine + the unconditional pre-claim gate.

This is the CLIENT HALF of the global kill switch (killswitch-chain.md §1/§2/§3,
PLAN §4). Every rule here is enforced IN CODE and is fail-closed. The loop obeys
the machine regardless of what the driven model "wants": the model never sees or
influences this state; the worker's claim path calls ``pre_claim_gate()`` and a
False answer means no claim happens, full stop.

Frozen wire facts this module owns:
  * inbound command schema (killswitch-chain.md §2, verbatim):
        {mode: drain|kill, epoch, grace_deadline, issued_by, idempotency}
    ``epoch`` IS auth's suite-wide monotonic kill epoch (IDENTIFIERS.md).
  * the ``drain_state`` vocabulary (agent-runtime-mc-heartbeat.md §2, verbatim):
        {active, draining, drained, quiescing, quiesced}

Two independent inputs on SEPARATE WIRES, never conflated (§4.4):
  * a commanded drain/kill  -> apply_command()  (present, authenticated, epoch'd)
  * an inferred auth outage  -> enter_outage()   (absence of a working IdP; NO epoch)
A stale/replayed lower epoch can NEVER un-drain a higher one. An IdP hiccup is
never treated as a kill, and a real kill is never mistaken for "just an outage".
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


# ---- frozen vocabularies ---------------------------------------------------

class DrainState(str, Enum):
    """The frozen drain_state vocabulary (heartbeat contract §2). Do not extend
    without amending the contract — the conformance test pins this set."""
    ACTIVE = "active"
    DRAINING = "draining"
    DRAINED = "drained"
    QUIESCING = "quiescing"
    QUIESCED = "quiesced"


FROZEN_DRAIN_STATES: frozenset[str] = frozenset(s.value for s in DrainState)


class CommandMode(str, Enum):
    """The frozen inbound command modes (killswitch-chain.md §2)."""
    DRAIN = "drain"
    KILL = "kill"


class Level(int, Enum):
    """Internal ordered posture. Higher = more stopped. Lifting requires a
    strictly higher epoch (operator authority), so a stale command never lifts."""
    RUN = 0
    DRAIN = 1
    KILL = 2


class WorkClass(str, Enum):
    """Checkpoint-vs-abandon is decided by work class (§4.3)."""
    BENIGN = "benign"          # research / deliberation -> checkpoint to Notes
    SOD_ADJACENT = "sod"       # in flight toward the Gateway / any SoD boundary -> ABANDON


@dataclass
class KillCommand:
    """A parsed inbound command. ``grace_deadline`` is an absolute epoch-seconds
    timestamp; None means 'use the configured default grace budget'."""
    mode: CommandMode
    epoch: int
    grace_deadline: Optional[float]
    issued_by: str
    idempotency: str

    # The frozen field set — the conformance test asserts these five, exactly.
    FROZEN_FIELDS = ("mode", "epoch", "grace_deadline", "issued_by", "idempotency")

    @classmethod
    def from_wire(cls, d: dict) -> "KillCommand":
        missing = [f for f in cls.FROZEN_FIELDS if f not in d]
        if missing:
            raise ValueError(f"kill command missing frozen fields: {missing}")
        return cls(
            mode=CommandMode(d["mode"]),
            epoch=int(d["epoch"]),
            grace_deadline=(None if d["grace_deadline"] is None else float(d["grace_deadline"])),
            issued_by=str(d["issued_by"]),
            idempotency=str(d["idempotency"]),
        )


@dataclass
class DrainMachine:
    """Single authority for commanded posture + outage posture on one instance.

    Persistence: ``on_epoch_event`` (if set) is called with an append-only record
    for every applied command so ``kill_epoch_log`` survives restart; on boot the
    machine is seeded with the persisted max epoch so a restart never lowers it.
    """

    default_grace_sec: float = 45.0
    now: Callable[[], float] = time.time
    on_epoch_event: Optional[Callable[[dict], None]] = None

    # commanded posture
    _epoch: int = 0
    _level: Level = Level.RUN
    _grace_deadline: Optional[float] = None
    _issued_by: str = "boot"
    _idem_seen: set = field(default_factory=set)

    # outage posture (independent wire; carries NO epoch)
    _outage: bool = False

    # M3 (fail-closed boot): the pre-claim gate stays SHUT until the current auth
    # kill epoch has been polled and reconciled at least once. A runtime restored
    # to RUN must never win a claim in the window before its first epoch poll while
    # auth is actually at KILL. Reconciliation is also re-required after an outage
    # (M2): on recovery the runtime must adopt max(epoch) before resuming/claiming.
    _reconciled: bool = False

    # ---- boot / persistence ------------------------------------------------

    def seed_from_persisted(self, max_epoch: int, level: Level = Level.RUN) -> None:
        """On boot, never let a restart lower the persisted max kill epoch.

        Seeding the internal max is NOT reconciliation — the gate stays shut until
        ``mark_reconciled()`` after a live auth epoch poll (M3)."""
        if max_epoch > self._epoch:
            self._epoch = int(max_epoch)
            self._level = level

    def mark_reconciled(self) -> None:
        """Called once the current auth kill epoch has been polled and adopted.

        Opens the pre-claim gate (subject to posture). Called at boot after the
        first successful epoch read, and again on outage-recovery re-entry."""
        self._reconciled = True

    def require_reconcile(self) -> None:
        """Force the gate shut again until the next successful epoch reconcile.

        Invoked when entering an auth outage (M2): the poll target (auth) is down,
        so a KILL raised during the blackout cannot be seen; the runtime must
        re-reconcile max(epoch) on recovery before resuming any held work."""
        self._reconciled = False

    @property
    def reconciled(self) -> bool:
        return self._reconciled

    # ---- commanded drain/kill (present, authenticated, epoch-versioned) -----

    def apply_command(self, cmd: KillCommand) -> bool:
        """Apply a commanded drain/kill. Returns True if it changed posture.

        FAIL-CLOSED monotonicity: an epoch < current is ignored (stale/replayed
        cannot un-drain). An epoch == current is idempotent (same idempotency key
        collapses). A strictly higher epoch is authoritative and may raise OR lift
        (operator lift arrives as a higher epoch — the only lift path).
        """
        if cmd.epoch < self._epoch:
            return False  # stale — can never un-drain a higher epoch
        if cmd.epoch == self._epoch:
            # idempotent replay guard at the same epoch
            if cmd.idempotency in self._idem_seen:
                return False
            self._idem_seen.add(cmd.idempotency)
            # same epoch, new idempotency: only allowed to (re)assert same-or-higher level
            new_level = Level.KILL if cmd.mode is CommandMode.KILL else Level.DRAIN
            if new_level <= self._level:
                return False
        else:
            self._idem_seen = {cmd.idempotency}

        self._epoch = cmd.epoch
        self._issued_by = cmd.issued_by
        self._level = Level.KILL if cmd.mode is CommandMode.KILL else Level.DRAIN

        if cmd.mode is CommandMode.KILL:
            # KILL = DRAIN with zero grace budget — one mechanism (§4.2). A kill
            # forces zero regardless of any grace_deadline the command carries (m7).
            self._grace_deadline = self.now()
        else:
            # m7: honor the issuer's grace_deadline but CLAMP it to the local max
            # (one supervised step). An inflated deadline — compromised wire or
            # operator error — can never keep agents running far past one step.
            local_max = self.now() + self.default_grace_sec
            if cmd.grace_deadline is None:
                self._grace_deadline = local_max
            else:
                self._grace_deadline = min(cmd.grace_deadline, local_max)

        if self.on_epoch_event is not None:
            self.on_epoch_event(
                {
                    "epoch": self._epoch,
                    "mode": cmd.mode.value,
                    "grace_deadline": self._grace_deadline,
                    "issued_by": self._issued_by,
                    "received_ts": self.now(),
                }
            )
        return True

    def poll_level(self, epoch: int, level: Level) -> bool:
        """Reconcile against a polled auth epoch+level (push+poll transport, §4.1).

        Same monotonic rule: only a >= epoch takes effect; a higher epoch may lift
        to RUN (operator lift). Keeps a missed push convergent."""
        if epoch < self._epoch:
            return False
        if epoch == self._epoch and level <= self._level:
            return False
        self._epoch = epoch
        self._level = level
        if level is Level.RUN:
            self._grace_deadline = None
        elif level is Level.KILL:
            self._grace_deadline = self.now()
        elif self._grace_deadline is None:
            self._grace_deadline = self.now() + self.default_grace_sec
        return True

    # ---- inferred auth outage (absence of a working IdP; NO epoch) ----------

    def enter_outage(self) -> None:
        """QUIESCED_BY_OUTAGE — a LOCAL, credential-independent posture (§4.4).

        Explicitly NOT a kill: it carries no epoch and must never abandon/checkpoint
        as if commanded. It only stops new claims and holds in-flight safely. It also
        forces a re-reconcile (M2): auth (the epoch poll target) is down, so a KILL
        raised during the blackout is unseeable — the gate must stay shut on recovery
        until max(epoch) is re-adopted."""
        self._outage = True
        self.require_reconcile()

    def exit_outage(self) -> None:
        self._outage = False

    @property
    def in_outage(self) -> bool:
        return self._outage

    # ---- the load-bearing gate ---------------------------------------------

    def pre_claim_gate(self) -> bool:
        """Called before EVERY atomic claim. True only when it is safe to claim.

        Returns False while draining/killing (commanded) OR quiesced (outage) OR
        not yet reconciled with auth's kill epoch (M3 boot / M2 outage-recovery), so
        a draining/quiesced/unreconciled runtime can NEVER win a new claim — this
        makes the Gateway's "nothing new arrives" true by construction on the client
        side. Fail-closed: any non-RUN posture, any outage, or an unreconciled epoch
        denies the claim."""
        if not self._reconciled:
            return False  # M3: no claim before the kill epoch is polled + adopted
        if self._outage:
            return False
        return self._level is Level.RUN

    def grace_expired(self) -> bool:
        """True once the shared grace budget has elapsed (KILL => immediately)."""
        if self._grace_deadline is None:
            return False
        return self.now() >= self._grace_deadline

    def checkpoint_allowed(self, work_class: WorkClass) -> bool:
        """Abandon anything near a SoD boundary; checkpoint only benign work (§4.3).

        A drain must NEVER leave a half-approved or mid-execution action
        recoverable, so SoD-adjacent work is always abandoned, never checkpointed."""
        return work_class is WorkClass.BENIGN

    # ---- reporting ---------------------------------------------------------

    @property
    def epoch(self) -> int:
        return self._epoch

    @property
    def level(self) -> Level:
        return self._level

    @property
    def grace_deadline(self) -> Optional[float]:
        return self._grace_deadline

    def drain_state(self, *, drained: bool = False) -> DrainState:
        """The reportable drain_state (heartbeat/status). ``drained`` is set by the
        worker once it has actually reported completion of its drain."""
        if self._outage:
            return DrainState.QUIESCED if drained else DrainState.QUIESCING
        if self._level is Level.RUN:
            return DrainState.ACTIVE
        if drained:
            return DrainState.DRAINED
        return DrainState.DRAINING

    def commanded_posture(self) -> dict:
        """Shape consumed by GET /api/runtime/drain (UI §8)."""
        return {
            "mode": (None if self._level is Level.RUN else ("kill" if self._level is Level.KILL else "drain")),
            "epoch": self._epoch,
            "grace_deadline": self._grace_deadline,
            "quiesced_by_outage": self._outage,
        }
