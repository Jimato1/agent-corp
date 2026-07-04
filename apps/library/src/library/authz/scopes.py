"""library.authz.scopes — the countersigned library scope slice (auth §7, 2026-07-02).

| Scope             | Tools / ops                                           | Grantable      | Class          |
| library:read      | library_search, library_get_doc                       | all + operator | read           |
| library:propose   | library_propose                                       | all + operator | propose        |
| library:curate    | attach_sources, attach_sandbox_evidence, request_adm. | curation team  | write-benign   |
| library:admin     | admission decision, reject, retire, supersede,        | operator ONLY  | write-benign   |
|                   | collections, reindex                                  | (human-kind)   | (operator-only)|

None is a HOLDER scope. `library:admin` is human-principal-kind-gated — never minted
to any agent (PLAN §5.5 F11). Action class is derived by suffix (auth's
`action_class_for_scope`): *read→read, *propose→propose, else write-benign. The
Library has NO sod-critical / destructive-exec operation.
"""
from __future__ import annotations

READ = "library:read"
PROPOSE = "library:propose"
CURATE = "library:curate"
ADMIN = "library:admin"

ALL_SCOPES = (READ, PROPOSE, CURATE, ADMIN)

# tool / operation → required scope
TOOL_SCOPE: dict[str, str] = {
    "library_search": READ,
    "library_get_doc": READ,
    "library_propose": PROPOSE,
    "library_attach_sources": CURATE,
    "library_attach_sandbox_evidence": CURATE,
    "library_request_admission": CURATE,
    # admin operations (no MCP path exists for these — UI/API only)
    "review_decision": ADMIN,
    "retire": ADMIN,
    "supersede": ADMIN,
    "collections_write": ADMIN,
    "reindex": ADMIN,
}

# operations that require a HUMAN principal kind (library:admin, F11)
HUMAN_KIND_REQUIRED = {ADMIN}


def action_class_for_scope(scope: str) -> str:
    if scope.endswith(":read"):
        return "read"
    if scope.endswith(":propose"):
        return "propose"
    return "write-benign"   # curate / admin — Library has no sod-critical/destructive class


def scope_for_tool(tool: str) -> str | None:
    return TOOL_SCOPE.get(tool)
