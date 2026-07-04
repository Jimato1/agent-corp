"""library.authz — the Resource-Server (RS) duties (auth-apps-tokens-scopes.md §1-2).

Library is a Standard-class RS with NO sod-critical / destructive path (PLAN §5.5
manifest). It validates tokens locally against auth's JWKS, enforces `aud == library`,
coarse scope, DPoP/cnf where bound, the human-kind gate on `library:admin`, and the
budget middleware — deriving the principal ONLY from a validated token or a verified
X-Auth-Identity signature (never an advisory header).
"""
