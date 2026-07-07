"""library.corpus.store — the single-writer CANONICAL corpus (PLAN §1.1).

Layout (PLAN §1.1):

    corpus/
      <os_family>/<distro>/<major_version>/<doc_id>.md   # admitted (primary target)
      any/<doc_id>.md                                     # version-agnostic
      _quarantine/<doc_id>.md                             # every proposal lands here
      _audit/admissions-YYYY-MM.jsonl                     # append-only decision log

Invariants enforced HERE (not just documented):
  * ADMITTED BODIES ARE IMMUTABLE. A body change to an admitted doc is refused; the
    caller must mint a new lineage doc (PLAN §1.1/§2.2 finding F1). Quarantined bodies
    may be edited (and that invalidates stale evidence — enforced in admission.py).
  * `_quarantine → partition` happens exactly once, at admission, in the SAME commit
    as the frontmatter admission stamp.
  * Audit-grade records append to the git-backed `_audit/` stream (never a DB) so no
    admission decision sits behind a backup window (PLAN §1.4 finding F8).
  * The service is the single writer; all state serializes through this object.
"""
from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Iterator, Optional

from . import frontmatter as fm
from .gitrepo import GitRepo, PushState

Clock = Callable[[], float]


@dataclass
class DocRecord:
    doc_id: str
    meta: dict[str, Any]
    body: str
    path: str  # relative to corpus root


class CorpusStore:
    def __init__(self, root: str, *, remote: str = "", clock: Optional[Clock] = None):
        self.root = os.path.abspath(root)
        self.corpus = os.path.join(self.root, "corpus")
        self.git = GitRepo(self.corpus, remote)
        self._clock = clock or time.time
        self._lock = threading.RLock()  # single-writer serialization

    # ── lifecycle ─────────────────────────────────────────────────────────────
    def init(self) -> None:
        with self._lock:
            for sub in ("_quarantine", "_audit", "any"):
                os.makedirs(os.path.join(self.corpus, sub), exist_ok=True)
            self.git.init()
            # seed an initial commit so HEAD exists (rebuild/restore checks rely on it)
            keep = os.path.join(self.corpus, ".gitkeep")
            if not os.path.exists(keep):
                with open(keep, "w", encoding="utf-8") as f:
                    f.write("corpus root — canonical store\n")
            self.git.commit("corpus: init", sub="library-service", push=False)

    # ── path helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def primary_partition(meta: dict[str, Any]) -> str:
        """Primary-target routing dir (an optimization; doc_targets is the hard
        filter). Derived from the FIRST applies_to entry, or `any/`."""
        applies = meta.get("applies_to") or []
        if not applies:
            return "any"
        a = applies[0]
        of, distro, ver = a.get("os_family"), a.get("distro"), a.get("version")
        if of and distro and ver:
            return f"{of}/{distro}/{ver}"
        return "any"

    def _quarantine_path(self, doc_id: str) -> str:
        return os.path.join("_quarantine", f"{doc_id}.md")

    def _abs(self, rel: str) -> str:
        return os.path.join(self.corpus, rel)

    def locate(self, doc_id: str) -> Optional[str]:
        """Return the doc's path relative to corpus root, or None. Walks the tree
        (canonical layer is index-independent)."""
        for dirpath, _dirs, files in os.walk(self.corpus):
            if f"{doc_id}.md" in files:
                full = os.path.join(dirpath, f"{doc_id}.md")
                return os.path.relpath(full, self.corpus)
        return None

    # ── reads ─────────────────────────────────────────────────────────────────
    def get(self, doc_id: str) -> Optional[DocRecord]:
        rel = self.locate(doc_id)
        if rel is None:
            return None
        with open(self._abs(rel), "r", encoding="utf-8") as f:
            meta, body = fm.parse(f.read())
        return DocRecord(doc_id=doc_id, meta=meta, body=body, path=rel)

    def iter_docs(self) -> Iterator[DocRecord]:
        for dirpath, _dirs, files in os.walk(self.corpus):
            for name in files:
                if not name.endswith(".md") or name == ".gitkeep":
                    continue
                doc_id = name[:-3]
                full = os.path.join(dirpath, name)
                try:
                    with open(full, "r", encoding="utf-8") as f:
                        meta, body = fm.parse(f.read())
                except ValueError:
                    continue
                yield DocRecord(
                    doc_id=doc_id, meta=meta, body=body,
                    path=os.path.relpath(full, self.corpus),
                )

    # ── writes (all serialized) ────────────────────────────────────────────────
    def write_proposal(self, doc_id: str, meta: dict[str, Any], body: str, *, sub: str) -> DocRecord:
        """Write a NEW proposal into _quarantine and commit. Bodies land here first;
        nothing leaves without passing the §2 gate."""
        with self._lock:
            rel = self._quarantine_path(doc_id)
            self._write_file(rel, meta, body)
            self.git.commit(f"propose {doc_id}", sub=sub, push=False)
            return DocRecord(doc_id=doc_id, meta=meta, body=body, path=rel)

    def rewrite_frontmatter(self, doc_id: str, meta: dict[str, Any], *, sub: str,
                            push: bool = False, message: str = "") -> DocRecord:
        """Update a doc's frontmatter IN PLACE (body untouched). Used for evidence
        attach, status/admission stamps that do not move the file."""
        with self._lock:
            rec = self.get(doc_id)
            if rec is None:
                raise KeyError(doc_id)
            self._write_file(rec.path, meta, rec.body)
            self.git.commit(message or f"update {doc_id}", sub=sub, push=push)
            return DocRecord(doc_id=doc_id, meta=meta, body=rec.body, path=rec.path)

    def rewrite_quarantined_body(self, doc_id: str, body: str, *, sub: str) -> DocRecord:
        """Edit the body of a NOT-YET-ADMITTED doc. Refused for admitted docs
        (admitted bodies are immutable, PLAN §1.1)."""
        with self._lock:
            rec = self.get(doc_id)
            if rec is None:
                raise KeyError(doc_id)
            if rec.meta.get("admission") == "admitted":
                raise ValueError("admitted bodies are immutable — mint a new lineage doc")
            # ALWAYS recompute content_sha256 from the new body: a body change must never
            # leave a stale hash that content-bound evidence could still match (defense in
            # depth for the admission gate — PLAN §1.1/§2.2). Any prior evidence entry whose
            # attested_content_sha256 no longer equals this is thereby invalidated.
            meta = dict(rec.meta)
            meta["content_sha256"] = fm.body_sha256(body)
            self._write_file(rec.path, meta, body)
            self.git.commit(f"edit quarantined body {doc_id}", sub=sub, push=False)
            return DocRecord(doc_id=doc_id, meta=meta, body=body, path=rec.path)

    def admit_move(self, doc_id: str, meta: dict[str, Any], *, sub: str) -> DocRecord:
        """Move _quarantine → primary partition AND stamp admission frontmatter in
        ONE commit (pushed — admission is an audit-lane event). Body byte-identical."""
        with self._lock:
            rec = self.get(doc_id)
            if rec is None:
                raise KeyError(doc_id)
            new_rel = os.path.join(self.primary_partition(meta), f"{doc_id}.md")
            if new_rel != rec.path:
                os.makedirs(os.path.dirname(self._abs(new_rel)), exist_ok=True)
                # write new location with the admitted body (verbatim), remove old
                self._write_file(new_rel, meta, rec.body)
                os.remove(self._abs(rec.path))
            else:
                self._write_file(new_rel, meta, rec.body)
            self.git.commit(f"admit {doc_id}", sub=sub, push=True)
            return DocRecord(doc_id=doc_id, meta=meta, body=rec.body, path=new_rel)

    # ── audit stream (git-backed, pushed) ──────────────────────────────────────
    def append_audit(self, record: dict[str, Any], *, sub: str) -> None:
        """Append one JSONL line to `_audit/admissions-YYYY-MM.jsonl` and commit+push.
        Admission decisions, denials, and spot-audit draws live HERE, never in ops.db
        (PLAN §1.4 finding F8)."""
        with self._lock:
            t = time.gmtime(self._clock())
            fname = f"admissions-{t.tm_year:04d}-{t.tm_mon:02d}.jsonl"
            rel = os.path.join("_audit", fname)
            record = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", t), **record}
            with open(self._abs(rel), "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
            self.git.commit(f"audit {record.get('event','event')} {record.get('doc_id','')}",
                            sub=sub, push=True)

    def read_audit(self, limit: int = 200) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        adir = self._abs("_audit")
        if not os.path.isdir(adir):
            return out
        for name in sorted(os.listdir(adir), reverse=True):
            if not name.endswith(".jsonl"):
                continue
            with open(os.path.join(adir, name), "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        out.append(json.loads(line))
        return out[-limit:]

    # ── internals ──────────────────────────────────────────────────────────────
    def _write_file(self, rel: str, meta: dict[str, Any], body: str) -> None:
        full = self._abs(rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        tmp = full + ".tmp"
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(fm.compose(meta, body))
        os.replace(tmp, full)

    # ── durability introspection ───────────────────────────────────────────────
    def head(self) -> str:
        return self.git.head()

    def push_state(self) -> PushState:
        return self.git.push_state()
