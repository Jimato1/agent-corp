"""The supervisor — the single per-instance aggregation point (PLAN §1.1).

Owns everything that must exist once per host: key custody, the model stack +
fail-closed provenance gate, the inference facade, the drain/kill epoch machine
(seeded from the persisted max epoch, §9 restore rule), the heartbeat registry,
and the auth key-provisioning/re-mint client. It is the state the status API and
the SSE producer read, and the actor that applies drain/kill commands.

Fail-closed boot (M3): the drain machine's pre-claim gate stays SHUT until
``boot_reconcile()`` successfully polls auth's current kill epoch. No worker can
win a claim before that.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from .auth_client import AuthClient
from .config import Config, load_config
from .custody import KeyCustody
from .db import RuntimeDB
from .drain import DrainMachine, DrainState, KillCommand, Level
from .facade import InferenceFacade
from .heartbeat import HeartbeatRegistry
from .provenance import ProvenanceGate


class Supervisor:
    def __init__(
        self,
        config: Optional[Config] = None,
        *,
        db: Optional[RuntimeDB] = None,
        custody: Optional[KeyCustody] = None,
        provenance_gate: Optional[ProvenanceGate] = None,
        auth: Optional[AuthClient] = None,
        now=time.time,
    ):
        self.cfg = config or load_config()
        self.now = now
        self.db = db or RuntimeDB(_db_path())
        self.custody = custody or KeyCustody()

        # drain machine: persist to the append-only kill_epoch_log, seed from max.
        self.drain = DrainMachine(
            default_grace_sec=self.cfg.tunables.drain_grace_sec,
            now=now,
            on_epoch_event=self.db.append_kill_epoch,
        )
        self.drain.seed_from_persisted(self.db.max_kill_epoch())

        # provenance gate → ledger; facade admits every configured role (fail-closed).
        self.gate = provenance_gate or ProvenanceGate(
            on_ledger=self.db.append_provenance,
            allow_unverified_in_sandbox=False,  # fail-closed by default
        )
        self.facade = InferenceFacade(self.cfg, self.gate, self.drain)
        self.admit_results = self.facade.admit_all()

        self.heartbeats = HeartbeatRegistry(self.cfg.tunables.runtime_instance_id, now=now)
        self.auth = auth or AuthClient(self.custody, self.drain)
        self._last_drained_report: Optional[float] = None

    # ---- fail-closed boot (M3) --------------------------------------------

    def boot_reconcile(self) -> bool:
        """Poll auth's kill epoch and open the pre-claim gate only on success.

        Until this returns True the runtime cannot claim (a restored-to-RUN runtime
        must never win a claim while auth is actually at KILL). Safe to retry."""
        return self.auth.reconcile_kill_epoch()

    # ---- drain/kill command intake ----------------------------------------

    def apply_kill_command(self, wire: dict) -> dict:
        """Apply an inbound {mode,epoch,grace_deadline,issued_by,idempotency}."""
        cmd = KillCommand.from_wire(wire)
        changed = self.drain.apply_command(cmd)
        self.heartbeats.set_runtime_drain_state(self.drain.drain_state().value)
        if self.drain.level is not Level.RUN and self.drain.grace_expired():
            self._last_drained_report = self.now()
        return {"applied": changed, "epoch": self.drain.epoch,
                "drain_state": self.drain.drain_state(
                    drained=(self._last_drained_report is not None)).value}

    # ---- status snapshots (read-mostly; UI §8) ----------------------------

    def status(self) -> dict:
        drained = self._last_drained_report is not None
        return {
            "runtime_instance_id": self.cfg.tunables.runtime_instance_id,
            "supervisor_ts": self.now(),
            "roster": self.heartbeats.roster(),
            "runtime_drain_state": self.drain.drain_state(drained=drained).value,
            "kill_epoch": self.drain.epoch,
            "reconciled": self.drain.reconciled,
            "holds_host_credentials": False,   # printed constitutional fact (never true)
            "can_approve_or_execute": False,   # printed constitutional fact (never true)
        }

    def models(self) -> list[dict]:
        rows = []
        for role, pin in self.cfg.model_pins.items():
            # provenance_verified is True ONLY when the gate fully verified (M1 +
            # soft-posture fix) — admission succeeding under a soft posture is NOT
            # a green.
            verified = self.facade.is_provenance_verified(role)
            rows.append({
                "role": role,
                "model_id": pin.model_id,
                "digest": pin.commit_digest,
                "sha256": pin.sha256,
                "quant": pin.quant,
                "sig_ref": pin.sig_ref,
                # runtime-computed provenance (M1) — never a backend claim.
                "provenance_verified": verified,
                "online": verified,   # only admitted models are served
            })
        return rows

    def headroom(self) -> dict:
        # PENDING-SIZING: no measured GPU source in-sandbox. Obey the false-green
        # rule — mark the read as an estimate/unknown, never a fabricated healthy #.
        return {
            "vram_used_gb": None, "vram_total_gb": None,
            "decode_streams": None,
            "knee_c_estimate": self.cfg.tunables.knee_c_estimate,
            "tpm_sign_queue_depth": None,
            "as_of": self.now(),
            "source": "supervisor",
            "measured": False,   # PENDING-SIZING → UI renders 'estimate/cannot confirm'
        }

    def keys_custody(self) -> dict:
        st = self.custody.status()
        return st.as_dict(self.db.custody_counts())

    def drain_status(self) -> dict:
        drained = self._last_drained_report is not None
        d = self.drain.commanded_posture()
        d.update({
            "drain_state": self.drain.drain_state(drained=drained).value,
            "last_drained_report": self._last_drained_report,
            "sigstore_gate_armed": self.gate.fully_armed,
        })
        return d

    def provenance_ledger(self) -> list[dict]:
        return self.db.provenance_ledger()

    def sigstore_gate_armed(self) -> bool:
        return self.gate.fully_armed


def _db_path() -> str:
    import os
    return os.environ.get("AR_DB_PATH", ":memory:")
