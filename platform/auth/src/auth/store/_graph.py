"""auth.store._graph — the pure role-hierarchy graph helpers, shared VERBATIM by
the SQLite and Postgres backends so the effective-role CLOSURE (and thus the
downward AFFECTED set fed into the SSD check) is computed by identical code on
both. No I/O, no state — adjacency in, sets/bools out."""
from __future__ import annotations

from typing import Dict, List, Set


def reachable(adj: Dict[str, List[str]], start: str) -> Set[str]:
    """Every node reachable from `start` following adjacency edges, incl. `start`.
    Used for a role's inherited-role closure (role -> inherits edges)."""
    seen: Set[str] = set()
    stack = [start]
    while stack:
        r = stack.pop()
        if r in seen:
            continue
        seen.add(r)
        stack.extend(adj.get(r, []))
    return seen


def has_cycle(adj: Dict[str, List[str]]) -> bool:
    """True if the directed graph has any cycle (DFS three-colouring)."""
    WHITE, GREY, BLACK = 0, 1, 2
    nodes: Set[str] = set(adj)
    for outs in adj.values():
        nodes.update(outs)
    color = {n: WHITE for n in nodes}

    def visit(n: str) -> bool:
        color[n] = GREY
        for m in adj.get(n, []):
            if color[m] == GREY:
                return True
            if color[m] == WHITE and visit(m):
                return True
        color[n] = BLACK
        return False

    return any(color[n] == WHITE and visit(n) for n in nodes)
