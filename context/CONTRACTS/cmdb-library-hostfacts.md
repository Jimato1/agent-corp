# CONTRACT — CMDB → Library: host inventory facts for version-scoped retrieval

> **Status: FROZEN in shape** (MERGE-RESEARCH-1, 2026-07-02). Producer: **CMDB**. Consumer: **Library**. A NEW seam surfaced by Library Stage-1 (not previously in the CONTRACTS index); CMDB Stage-2 implements it. Deliberately **strictly narrower** than `cmdb-gateway-policy.md`.

## 1. The query

`resolve_host_facts(host_id) → {os_family, distro, distro_version, arch, [package_manager, eol_date]} | not_found`

- `host_id` is CMDB-minted, passed opaquely, never parsed (IDENTIFIERS.md).
- **Inventory facts ONLY — never tier, window, credential, or policy fields.** The Library is Standard-class and cannot act; this seam must not widen into the policy surface.
- Read-only, side-effect-free, short-TTL-cacheable. Fits CMDB's existing `get_host` tool family (scope `cmdb:read`, audience `cmdb`).

## 2. Failure behavior (part of the contract, not an implementation choice)

**Fail loud + open-but-flagged:** if a `host_id` is supplied but CMDB is unreachable or the host unknown, the Library returns results with the hard version filter DISABLED and every chunk flagged `version_scope=unverified` — never silently applying a possibly-wrong filter, never implying correctness. The Library's query API also accepts explicit `target_os/target_distro/target_version/arch` so it never hard-depends on CMDB at query time.

## 3. Use

Facts drive the Library's mandatory HARD retrieval filter (os_family + distro + major_version + arch mismatch = excluded entirely); minor-version proximity is a soft, flagged fallback (`version_scope=approximate`).
