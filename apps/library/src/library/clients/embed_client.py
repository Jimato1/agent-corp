"""library.clients.embed_client — the agent-runtime embed() facade (D-13).

Contract (agent-runtime-library-inference.md, FROZEN in shape):
    embed(texts[], input_type: query|document) → {vectors, model_id, dim}
  * OpenAI-compatible /v1/* facade; model selected by ROLE (`library-embedder`),
    never a raw model name.
  * L2-normalized vectors, cosine; ≤256 texts/call (server may sub-batch).
  * prefix/instruction convention pinned identically at ingest AND query.
  * `model_id` returned on every call → Library compares and triggers a full re-embed
    on any swap (never mixes vector spaces).
  * explicit 429/retry-after backpressure; per-item failures reported, never dropped.

D-13: agent-runtime is a HARD dependency of INDEXING (not query). So the INDEX path
raises DependencyDown when the facade is down; the QUERY path catches and serves
FTS-only (retrieval.py).

Pinned prefix convention (Qwen3-Embedding instruct): queries carry a task instruction
prefix; documents carry none. The SAME rule is applied at ingest and query — that is
what "pinned identically" means (the asymmetry is the Qwen convention, applied
consistently both times).
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Callable, Optional

from ..errors import DependencyDown

QUERY_INSTRUCTION = (
    "Instruct: Given a technical question, retrieve reference documentation passages "
    "that answer it\nQuery: "
)

# transport(url, payload_bytes, headers) -> (status, body_bytes)
Transport = Callable[[str, bytes, dict], tuple[int, bytes]]


def _urllib_transport(url: str, payload: bytes, headers: dict, timeout: float) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


class EmbedClient:
    def __init__(self, url: str, role: str, dim: int, *, batch_max: int = 256,
                 timeout_s: float = 20.0, transport: Optional[Transport] = None,
                 auth_token: str = ""):
        self.url = url
        self.role = role
        self.dim = dim
        self.batch_max = batch_max
        self.timeout_s = timeout_s
        self._transport = transport
        self.auth_token = auth_token

    def _apply_prefix(self, texts: list[str], input_type: str) -> list[str]:
        if input_type == "query":
            return [QUERY_INSTRUCTION + t for t in texts]
        return texts  # documents: no instruction (Qwen convention)

    def embed(self, texts: list[str], input_type: str) -> tuple[list[list[float]], str, int]:
        if input_type not in ("query", "document"):
            raise ValueError("input_type must be query|document")
        prepared = self._apply_prefix(texts, input_type)
        vectors: list[list[float]] = []
        model_id = ""
        dim = self.dim
        for i in range(0, len(prepared), self.batch_max):
            batch = prepared[i : i + self.batch_max]
            vs, model_id, dim = self._call(batch, input_type)
            vectors.extend(vs)
        return vectors, model_id, dim

    def _call(self, batch: list[str], input_type: str, _retries: int = 3):
        payload = json.dumps({
            "model": self.role,           # role, not a raw model name
            "input": batch,
            "input_type": input_type,
        }).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        for attempt in range(_retries):
            if self._transport is not None:
                status, body = self._transport(self.url, payload, headers)
            else:
                status, body = _urllib_transport(self.url, payload, headers, self.timeout_s)
            if status == 429:  # honor retry-after backpressure (bulk yields to live load)
                time.sleep(min(2 ** attempt, 5))
                continue
            if status != 200:
                raise DependencyDown(f"embed facade {status}", code="embed_unavailable")
            return self._parse(body)
        raise DependencyDown("embed facade backpressure exhausted", code="embed_busy")

    def _parse(self, body: bytes) -> tuple[list[list[float]], str, int]:
        obj = json.loads(body)
        # facade shape {vectors, model_id, dim}
        if "vectors" in obj:
            vecs = obj["vectors"]
            return vecs, obj.get("model_id", ""), int(obj.get("dim", len(vecs[0]) if vecs else self.dim))
        # OpenAI-compatible {data:[{embedding}], model}
        if "data" in obj:
            vecs = [d["embedding"] for d in obj["data"]]
            return vecs, obj.get("model", ""), (len(vecs[0]) if vecs else self.dim)
        raise DependencyDown("embed facade returned unrecognized shape", code="embed_shape")
