/**
 * A validated principal, derived ONLY from a validated auth token or the verified
 * X-Auth-Identity signature (never an advisory/forwarded header) — auth §1/§13, §8.6 R3.
 * `kind` is derived from the `sub` prefix (IDENTIFIERS: `agent:*` / `svc:*` / `op:*`) — it is
 * NOT a token claim (auth §8 "no kind claim"); it is used for display + the fencing rule
 * (agent-kind must echo a fencing token; human/service are exempt — PLAN §3.6).
 */
export type PrincipalKind = 'agent' | 'service' | 'human' | 'anonymous';

export interface Principal {
  sub: string;
  kind: PrincipalKind;
  scopes: Set<string>;
  /** true when derived from the proxy-verified X-Auth-Identity signature (browser session). */
  viaIdentityHeader: boolean;
  /** auth_time from the verified identity/step-up evidence, if present (for GC Tier-2). */
  authTime?: number;
}

export function kindOfSub(sub: string): PrincipalKind {
  if (sub.startsWith('agent:')) return 'agent';
  if (sub.startsWith('svc:')) return 'service';
  if (sub.startsWith('op:')) return 'human';
  return 'anonymous';
}

export function isAgent(p: Principal): boolean {
  return p.kind === 'agent';
}

/** Operator (human) principal — the only kind that may reach delete-marker/restore/GC routes. */
export function isHuman(p: Principal): boolean {
  return p.kind === 'human';
}

export function hasScope(p: Principal, scope: string): boolean {
  return p.scopes.has(scope);
}
