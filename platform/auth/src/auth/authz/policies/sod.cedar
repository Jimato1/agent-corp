// sod.cedar — the IMMUTABLE Static-Separation-of-Duty guardrail (PLAN §3.5).
//
// This is the DECLARATIVE PRODUCTION guardrail: the same five holder
// ConflictPairs that auth.core.scopes compiles in, expressed as Cedar `forbid`
// policies. In Cedar, `forbid` OVERRIDES `permit` — so even a hypothetically
// mis-issued dual-scoped token (IdP drift, an uninterposed grant path) is DENIED
// at every PDP use. This file is the tertiary guardrail (§3.5 guarantee 3); the
// primary control is the grant-time SSD check that makes the pair impossible at
// rest (auth.store.sqlite_store), and pdp.py mirrors THIS file in pure Python.
//
// PARITY IS TESTED: auth/tests/test_authz.py parses the five `forbid` blocks
// below and asserts the set of {scope-a, scope-b} pairs EQUALS
// auth.core.scopes.conflict_pairs() exactly. If the compiled-in pairs and this
// file ever diverge, that test fails — they are one invariant in two encodings.
//
// The four holder scopes:
//     board:approve, cmdb:write-policy   (authorization / "approve" side A)
//     gateway:execute, vault:read-credential  (action / "execute" side X)
// The single ALLOWED governance pair {board:approve, cmdb:write-policy} (the ○)
// is deliberately ABSENT here — both are human governance the operator must hold.
//
// IMMUTABILITY: like the compiled-in ConflictSet, these `forbid` policies are NOT
// editable by any online admin/API/config path (settled decision #5 / finding
// 4a). Changing them is a code change + redeploy, gated behind offline break-glass
// + two-person control. No `permit` may ever re-enable a pairing denied here.
//
// ENGINE EMBEDDING = BUILD ITEM: this sandbox has no Cedar engine (Rust/WASM, no
// network pip). pdp.py is the runnable pure-Python mirror that RUNS GREEN here;
// embedding the real Cedar evaluator to enforce THIS exact file at each PDP is a
// CANNOT-VERIFY-HERE build item — operator command in test_authz.py.

// (1) approve x execute  — decision #4: approval authority may never execute.
forbid(principal, action, resource)
when {
    principal.effective_scopes.contains("board:approve") &&
    principal.effective_scopes.contains("gateway:execute")
};

// (2) approve x redeem-credential — approver may never hold the credential key.
forbid(principal, action, resource)
when {
    principal.effective_scopes.contains("board:approve") &&
    principal.effective_scopes.contains("vault:read-credential")
};

// (3) write-policy x execute — policy authority may never execute.
forbid(principal, action, resource)
when {
    principal.effective_scopes.contains("cmdb:write-policy") &&
    principal.effective_scopes.contains("gateway:execute")
};

// (4) write-policy x redeem-credential — policy authority may never hold the key.
forbid(principal, action, resource)
when {
    principal.effective_scopes.contains("cmdb:write-policy") &&
    principal.effective_scopes.contains("vault:read-credential")
};

// (5) execute x redeem-credential — both are real-world power; a single principal
//     may hold neither combination (the action-side internal pair).
forbid(principal, action, resource)
when {
    principal.effective_scopes.contains("gateway:execute") &&
    principal.effective_scopes.contains("vault:read-credential")
};
