import type { ReactNode } from 'react';
import { ErrorState, FreshnessStamp, Skeleton } from '../components/ds';
import { mono, panel } from '../components/cmparts';
import type { ApiError } from '../lib/api';

/* The shared screen header, ported from cm-screens.jsx `Head`. */
export function Head({ crumb, title, sub, right }: { crumb?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        {crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

/* The screen frame: a Head + gap column that every screen reuses. */
export function Screen({ children, width = 1180 }: { children: ReactNode; width?: number }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: width }}>{children}</div>;
}

/* ── The SAFE-STOPPED band (Pattern D, halt-gold — the system WORKING) ───────
   CMDB's governing rule: a dependency down / snapshot-unavailable / git-unreach
   is NEVER a red error. When a canonical read cannot be served honestly we show
   this gold band in place of a fabricated green table (UI_SPEC §3, §4). */
export function SafeStoppedBand({ reason }: { reason?: ReactNode }) {
  return (
    <ErrorState
      pattern="D"
      title="System safe-stopped — policy snapshot unverified"
      detail={reason ? String(reason) : undefined}
    >
      Every verdict is <code style={{ ...mono }}>deny(policy_unavailable)</code> by design. STILL TRUE: no host can be actioned;
      existing kill epochs enforced. This is the safety system working, not an outage — read history out-of-band; re-arm
      requires a step-up ack.
    </ErrorState>
  );
}

/* A Pattern-R (red) local, recoverable error — the operator's fixable problem. */
export function LocalError({ error, hint }: { error: ApiError; hint?: ReactNode }) {
  return (
    <ErrorState pattern="R" title="Your request didn't apply" detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}>
      {hint ?? 'The request failed locally. Fix the input and retry.'}
    </ErrorState>
  );
}

/* The offline-demo banner: when a live read failed to a DEPENDENCY outage we
   render SAFE-STOPPED semantics but keep the fixture below so the console stays
   inspectable. A non-dependency (4xx) failure is Pattern R. */
export function OfflineBanner({ error }: { error: ApiError }) {
  if (error.isDependency) {
    return (
      <ErrorState
        pattern="D"
        title="CMDB backend unreachable — showing offline demo data"
        detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}
      >
        The policy service or the proxy is down, so the live read failed closed (this is the safety system working). The rows
        below are built-in demo fixtures (not live) so the interface stays inspectable — reconnect to see real policy state.
      </ErrorState>
    );
  }
  return (
    <ErrorState pattern="R" title="Couldn't load live policy state" detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}>
      The request failed. The rows below are demo fixtures; retry to load live state.
    </ErrorState>
  );
}

/* A table-shaped loading skeleton (static, never a spinner — UI_SPEC §4). */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ ...panel, overflow: 'hidden' }}>
      <Skeleton variant="table" rows={rows} />
    </div>
  );
}

/* A compact as-of freshness stamp used in screen headers. */
export function AsOf({ age, stale }: { age?: string | null; stale?: boolean }) {
  if (stale) return <FreshnessStamp state="stale" reading="STALE" age={age ?? undefined} />;
  return <FreshnessStamp age={age ? `as-of ${age}` : 'live'} />;
}
