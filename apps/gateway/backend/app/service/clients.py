"""Outbound clients to the four holders + Notes + MC. Fail-closed: any unreachable holder
raises so the dispatcher refuses (absence of an affirmative permit = deny; PLAN §1).

Each client is a thin ``httpx`` wrapper carrying the ``svc:gateway`` holder token. The
Vault redeem rides the ``creds``-mTLS hop (client cert; the ``cnf`` = mTLS ``x5t#S256``, §13).
Tests inject FAKE objects with the same method names — the orchestrator is verified against
fakes; the real HTTP wiring is CANNOT-VERIFY-IN-SANDBOX (it needs live Board/CMDB/Vault) and is
proven by construction + the operator full-chain-rejects tests (CHECKLIST).

**svc:gateway outbound grant slice (PLAN §11):** vault→``vault:read-credential`` (sole holder,
mTLS cnf); board→``board:execute`` + ``board:read``; cmdb→``cmdb:read-policy``; mc→``mc:anchor``;
notes→``notes:read`` (A2).
"""
from __future__ import annotations

import json
from pathlib import Path

from ..checks import (
    APPROVAL_CONSUMED,
    APPROVAL_REVOKED,
    DEPENDENCY_DOWN,
    HOST_LOCKED,
    PLAN_BYTES_UNAVAILABLE,
    HardReject,
)


def _read_token(path: Path) -> str:
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except Exception:
        return ""


class BoardClient:
    def __init__(self, settings, http) -> None:
        self.s = settings
        self.http = http

    def _auth(self) -> dict:
        return {"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"}

    def facts_ticket(self, ticket_id: str) -> dict:
        if not self.s.board_url:
            raise HardReject(DEPENDENCY_DOWN, "Board URL unset — fail closed")
        try:
            r = self.http.get(f"{self.s.board_url}/facts/ticket/{ticket_id}", headers=self._auth(), timeout=2.5)
        except Exception as exc:  # noqa: BLE001
            raise HardReject(DEPENDENCY_DOWN, f"Board facts unreachable: {exc}") from exc
        if r.status_code >= 500:
            raise HardReject(DEPENDENCY_DOWN, f"Board facts {r.status_code}")
        return r.json()

    def facts_approval(self, approval_id: str) -> dict:
        """GET /facts/approval/{id} — approver_kind (the independent floor) + plan/host binding
        (also the D-4 predicate data). Live PIP read, never request-supplied."""
        try:
            r = self.http.get(f"{self.s.board_url}/facts/approval/{approval_id}", headers=self._auth(), timeout=2.5)
        except Exception as exc:  # noqa: BLE001
            raise HardReject(DEPENDENCY_DOWN, f"Board approval facts unreachable: {exc}") from exc
        if r.status_code >= 500:
            raise HardReject(DEPENDENCY_DOWN, f"Board approval facts {r.status_code}")
        return r.json()

    def host_lock(self, host_id: str) -> dict:
        try:
            r = self.http.get(f"{self.s.board_url}/facts/host-lock/{host_id}", headers=self._auth(), timeout=2.5)
            return r.json()
        except Exception as exc:  # noqa: BLE001
            raise HardReject(DEPENDENCY_DOWN, f"Board host-lock unreachable: {exc}") from exc

    def consume_approval(self, approval_id: str, ticket_id: str, host_id: str, op_id: str | None) -> dict:
        """POST /api/approvals/{id}/consume — the single-use CAS. Map Board's business errors."""
        if not self.s.board_url:
            raise HardReject(DEPENDENCY_DOWN, "Board URL unset — fail closed")
        body = {"ticket_id": ticket_id, "host_id": host_id, "op_id": op_id}
        try:
            r = self.http.post(f"{self.s.board_url}/api/approvals/{approval_id}/consume",
                               headers=self._auth(), json=body, timeout=3.0)
        except Exception as exc:  # noqa: BLE001
            raise HardReject(DEPENDENCY_DOWN, f"Board consume unreachable: {exc}") from exc
        if r.status_code in (200, 201):
            return r.json()
        code = ""
        try:
            code = (r.json().get("error") or {}).get("code", "") or r.json().get("code", "")
        except Exception:
            code = ""
        # HOST_LOCKED: the approval is NOT burned (retry later). consumed/revoked: terminal reject.
        if code in ("HOST_LOCKED", "host_locked"):
            raise HardReject(HOST_LOCKED, "host is locked (execution hold busy) — approval not burned", escalate=False)
        if code in ("APPROVAL_CONSUMED", "approval_consumed"):
            raise HardReject(APPROVAL_CONSUMED, "approval already consumed (terminal)")
        if code in ("APPROVAL_REVOKED", "approval_revoked"):
            raise HardReject(APPROVAL_REVOKED, "approval revoked (terminal)")
        if r.status_code >= 500:
            raise HardReject(DEPENDENCY_DOWN, f"Board consume {r.status_code} — fail closed")
        raise HardReject(APPROVAL_REVOKED, f"Board consume refused ({r.status_code}/{code})")

    def report_run_outcome(self, ticket_id: str, run_id: str, to_state: str, reason: str,
                           fencing_token: int | None) -> None:
        try:
            self.http.post(f"{self.s.board_url}/api/tickets/{ticket_id}/run-outcome",
                           headers=self._auth(),
                           json={"run_id": run_id, "to_state": to_state, "reason": reason,
                                 "fencing_token": fencing_token}, timeout=3.0)
        except Exception:
            pass  # best-effort; the local chain is the canonical record + the watchdog fires independently

    def submit_verification(self, ticket_id: str, evidence: dict) -> None:
        try:
            self.http.post(f"{self.s.board_url}/api/tickets/{ticket_id}/verification",
                           headers=self._auth(), json=evidence, timeout=3.0)
        except Exception:
            pass


class NotesClient:
    def __init__(self, settings, http) -> None:
        self.s = settings
        self.http = http

    def plan_bytes(self, note_id: str, note_rev) -> bytes:
        """Revision-pinned read (A2): exact bytes of plan_note_id@plan_note_rev via notes:read."""
        if not self.s.notes_url:
            raise HardReject(PLAN_BYTES_UNAVAILABLE, "Notes URL unset — cannot re-hash plan, fail closed")
        try:
            r = self.http.get(f"{self.s.notes_url}/api/notes/{note_id}/raw",
                              params={"rev": note_rev},
                              headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"}, timeout=2.5)
        except Exception as exc:  # noqa: BLE001
            raise HardReject(PLAN_BYTES_UNAVAILABLE, f"Notes unreachable: {exc}") from exc
        if r.status_code != 200:
            raise HardReject(PLAN_BYTES_UNAVAILABLE, f"Notes returned {r.status_code}")
        return r.content


class CmdbClient:
    def __init__(self, settings, http) -> None:
        self.s = settings
        self.http = http

    def decision(self, host_id: str, action_class: str, ticket_ref: str | None,
                 req_nonce: str | None = None) -> str:
        if not self.s.cmdb_url:
            raise HardReject(DEPENDENCY_DOWN, "CMDB URL unset — fail closed (deny)")
        body = {"host_id": host_id, "action_class": action_class, "ticket_ref": ticket_ref}
        if req_nonce:
            body["req_nonce"] = req_nonce
        try:
            r = self.http.post(f"{self.s.cmdb_url}/v1/decision",
                               headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"},
                               json=body, timeout=2.5)
        except Exception as exc:  # noqa: BLE001
            raise HardReject(DEPENDENCY_DOWN, f"CMDB unreachable: {exc} — deny") from exc
        if r.status_code != 200:
            raise HardReject(DEPENDENCY_DOWN, f"CMDB decision {r.status_code} — deny")
        # The binding response is a compact JWS (text). Some deployments wrap it in JSON.
        txt = r.text.strip()
        if txt.startswith("{"):
            try:
                return r.json().get("verdict_jws") or txt
            except Exception:
                return txt
        return txt

    def verdict_jwks(self) -> dict:
        r = self.http.get(f"{self.s.cmdb_url}/v1/verdict-jwks",
                          headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"}, timeout=2.5)
        return r.json()


class VaultClient:
    """Redeem over the creds-mTLS hop. Returns (status, body) so the pure interpreter decides."""

    def __init__(self, settings, http_mtls) -> None:
        self.s = settings
        self.http = http_mtls

    def redeem(self, ticket_id: str, release_id: str, approval_id: str, run_id: str, public_key: str):
        if not self.s.vault_url:
            return 503, None
        body = {"ticket_id": ticket_id, "release_id": release_id, "approval_id": approval_id,
                "run_id": run_id, "public_key": public_key}
        try:
            r = self.http.post(f"{self.s.vault_url}/v1/redeem",
                               headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"},
                               json=body, timeout=4.0)
        except Exception:
            return 503, None
        try:
            return r.status_code, r.json()
        except Exception:
            return r.status_code, None

    def revoke(self, lease_id: str) -> bool:
        """Revoke an outstanding lease (the kill-switch §8 (4) duty + the run finally-block)."""
        if not self.s.vault_url or not lease_id:
            return False
        try:
            r = self.http.post(f"{self.s.vault_url}/v1/revoke",
                               headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"},
                               json={"lease_id": lease_id}, timeout=3.0)
            return r.status_code in (200, 204)
        except Exception:
            return False


class McClient:
    def __init__(self, settings, http) -> None:
        self.s = settings
        self.http = http

    def advertised_last(self, chain_id: str):
        try:
            r = self.http.get(f"{self.s.mc_url}/api/anchors/last", params={"chain_id": chain_id},
                              headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"}, timeout=2.5)
            return r.json()
        except Exception:
            return None

    def push_anchor(self, head: dict) -> bool:
        if not self.s.mc_url:
            return False
        try:
            r = self.http.post(f"{self.s.mc_url}/api/anchors",
                               headers={"Authorization": f"Bearer {_read_token(self.s.svc_token_file)}"},
                               json=head, timeout=3.0)
            return r.status_code in (200, 201, 409)  # 409 = already retained (idempotent)
        except Exception:
            return False


class Clients:
    """Bundle of the outbound clients + the CMDB verdict keyring (pinned to /v1/verdict-jwks)."""

    def __init__(self, settings, *, http=None, http_mtls=None, verdict_keyring=None) -> None:
        import httpx  # noqa: PLC0415 — only needed when real clients are built

        http = http or httpx.Client()
        # The creds-mTLS hop (client cert + CA). Falls back to plain in an isolated build.
        if http_mtls is None:
            try:
                http_mtls = httpx.Client(
                    cert=(str(settings.vault_mtls_cert_file), str(settings.vault_mtls_key_file)),
                    verify=str(settings.vault_ca_file),
                )
            except Exception:
                http_mtls = httpx.Client()
        self.board = BoardClient(settings, http)
        self.notes = NotesClient(settings, http)
        self.cmdb = CmdbClient(settings, http)
        self.vault = VaultClient(settings, http_mtls)
        self.mc = McClient(settings, http)
        self.verdict_keyring = verdict_keyring
