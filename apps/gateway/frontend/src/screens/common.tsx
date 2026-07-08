import type { ReactNode } from 'react';
import { ErrorState, FreshnessStamp, Skeleton } from '../components/ds';
import { mono, panel } from '../components/gwparts';
import type { ApiError } from '../lib/api';

/* Shared screen scaffolding for the Gateway console (ported from the CMDB kit's
   common.tsx, wording adapted to the Gateway's fail-closed grammar). */

/* The shared screen header. */
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

/* The screen frame: a gap column that every screen reuses. */
export function Screen({ children, width = 1180 }: { children: ReactNode; width?: number }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: width }}>{children}</div>;
}

/* ── The SAFE-STOPPED band (Pattern D, halt-gold — the system WORKING) ───────
   The Gateway's governing rule (§4.9 false-green prohibition): a dependency down
   / audit-store unreachable / gate that can't be served honestly is NEVER a red
   error. When a canonical read cannot be served we show this gold band in place
   of a fabricated green — this is the app whose whole job is to never lie about
   whether it acted or stopped. */
export function SafeStoppedBand({ reason, message }: { reason?: ReactNode; message?: ReactNode }) {
  return (
    <ErrorState pattern="D" title="System safe-stopped — dependency failed closed" detail={reason ? String(reason) : undefined}>
      {message ?? (
        <>
          This is the safety system working, not an outage of the console. STILL TRUE: no new dispatch, existing runs finish at
          task boundary, all four gates fail closed. Figures below that can't be confirmed read <code style={{ ...mono }}>⚠ CANNOT CONFIRM</code>, never a green idle.
        </>
      )}
    </ErrorState>
  );
}

/* A Pattern-R (red) local, recoverable error — the operator's fixable problem.
   NEVER used for a dependency outage (that is Pattern D). */
export function LocalError({ error, hint, title }: { error: ApiError; hint?: ReactNode; title?: ReactNode }) {
  return (
    <ErrorState pattern="R" title={title ?? "Your request didn't apply"} detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}>
      {hint ?? 'The request failed locally. Fix the input and retry.'}
    </ErrorState>
  );
}

/* The offline-demo banner: a live read failed. If it was a DEPENDENCY outage we
   render SAFE-STOPPED semantics (Pattern D) but keep the fixture below so the
   console stays inspectable; a non-dependency (4xx) failure is Pattern R. */
export function OfflineBanner({ error, noun = 'run state' }: { error: ApiError; noun?: string }) {
  if (error.isDependency) {
    return (
      <ErrorState
        pattern="D"
        title="Gateway backend unreachable — showing offline demo data"
        detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}
      >
        A dependency (the audit store, the proxy, or a chain holder) is down, so the live read failed closed — this is the safety
        system working. The rows below are built-in demo fixtures (not live) so the interface stays inspectable; reconnect to see
        real {noun}.
      </ErrorState>
    );
  }
  return (
    <ErrorState pattern="R" title={`Couldn't load live ${noun} — retry`} detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}>
      The request failed locally. The rows below are demo fixtures; retry to load live state.
    </ErrorState>
  );
}

/* A table-shaped loading skeleton (static, never a spinner — §5.4). */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ ...panel, overflow: 'hidden' }}>
      <Skeleton variant="table" rows={rows} />
    </div>
  );
}

/* A compact as-of freshness stamp used in screen headers (§4.9). */
export function AsOf({ age, stale }: { age?: string | null; stale?: boolean }) {
  if (stale) return <FreshnessStamp state="stale" reading="STALE" age={age ?? undefined} />;
  return <FreshnessStamp age={age ? `⟳ ${age}` : 'live'} />;
}
