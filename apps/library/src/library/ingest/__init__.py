"""library.ingest — the ingestion path (propose → admit) and the admission GATE.

This is the primary Stage-5 attack surface (corpus poisoning via ingestion,
ARCHITECTURE §12). `admission.py` is the constitutional logic: a content-bound hard
gate that no agreement count and no agent judgment can satisfy. It is pure and
dependency-free so it can be adversarially unit-tested in isolation.
"""
