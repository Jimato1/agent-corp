/*
 * taint.js — provenance taint: monotonic (raise-only) + transitive over the link graph.
 *
 * PLAN §2.2c / §11.3 / ARCH §12 (the retro→recon loop is a named prompt-injection surface):
 *   - own_taint is a raise-only monotonic lattice value (clean < host_originated).
 *     Sources that RAISE it: structural ticket-lineage floor (Board-read), caller declaration
 *     (raise-only), monotonicity enforcement on every write path. Nothing an agent supplies can
 *     produce a *cleaner* value than the structural floor.
 *   - effective_taint(note) = own ∨ ⋁ effective(linked notes)  — cycle-safe closure.
 *     The Board's lane-eligibility computation consumes EFFECTIVE, never own (auto-approve lane
 *     is unavailable to any plan whose inputs include host-originated content).
 *   - A downgrade attempt is a TAINT_DOWNGRADE business error; the reconciler re-raises a
 *     git-level downgrade (never adopts it). Index rebuilds recompute from frontmatter + links,
 *     so monotonicity survives `rm notes.db`.
 */
import { TAINT_RANK, PROVENANCE_TAINT_FLOOR } from '../constants.js';

export function rank(t) {
  return TAINT_RANK[t] ?? 0;
}
export function maxTaint(a, b) {
  return rank(a) >= rank(b) ? a : b;
}
/** True iff `next` would LOWER `current` (illegal — raise-only). */
export function isDowngrade(current, next) {
  return rank(next) < rank(current);
}

/** Structural floor implied by a provenance origin (PLAN §2.2 lattice). */
export function floorForProvenance(provenance) {
  return PROVENANCE_TAINT_FLOOR[provenance] ?? 'clean';
}

/**
 * Resolve own_taint for a create/append, enforcing raise-only against:
 *   structuralFloor (from ticket lineage / provenance origin), a caller declaration (raise-only),
 *   and the existing own_taint (monotonic on updates).
 * Returns the highest of them. NEVER returns something cleaner than structuralFloor.
 */
export function resolveOwnTaint({ existing = 'clean', structuralFloor = 'clean', declared } = {}) {
  let t = maxTaint(existing, structuralFloor);
  if (declared) t = maxTaint(t, declared); // declaration can only raise
  return t;
}

/**
 * Transitive effective taint over the wikilink graph. Cycle-safe DFS.
 *   ownOf(id) → own taint of a note; linksOf(id) → array of resolved target note ids.
 * `isolatedEdge(fromId, toId)` optionally excludes §7.3 isolated-turn links while still in
 * `planning` — but taint propagation deliberately IGNORES isolation (an isolated turn's grounding
 * still taints the note); isolation only gates agent *visibility*, not taint. So we do not pass it.
 * Returns { effective, tainted_via: [ids...] } where tainted_via are direct/indirect raisers.
 */
export function effectiveTaint(rootId, ownOf, linksOf) {
  const seen = new Set();
  const via = [];
  let eff = ownOf(rootId) || 'clean';

  const stack = [...(linksOf(rootId) || [])];
  while (stack.length) {
    const id = stack.pop();
    if (id == null || seen.has(id) || id === rootId) continue;
    seen.add(id);
    const own = ownOf(id) || 'clean';
    if (rank(own) > 0) {
      eff = maxTaint(eff, own);
      via.push(id);
    }
    for (const next of linksOf(id) || []) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return { effective: eff, tainted_via: via };
}
