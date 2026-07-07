import type { ReactNode } from 'react';
import { ErrorState } from '../components/ds';
import { mono } from '../components/KindBadge';
import type { ApiError } from '../lib/api';

/* The shared screen header, ported verbatim from ch-screens.jsx `Head`. */
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

/* When the live API is unreachable the shell falls back to the ch-data fixtures.
   We surface that honestly: a dependency outage is Pattern D (gold safe-stop),
   NOT a red error — and we say plainly that what's shown below is demo data. */
export function DependencyBanner({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const dependency = error.isDependency;
  return (
    <ErrorState
      pattern={dependency ? 'D' : 'R'}
      title={dependency ? 'Chat backend unreachable — showing offline demo data' : "Couldn't load the live feed"}
      detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 600,
              color: dependency ? 'var(--halt-gold-ink)' : 'var(--danger-text)',
              background: 'transparent',
              border: `1px solid ${dependency ? 'var(--halt-gold-edge)' : '#5A2420'}`,
              borderRadius: 'var(--radius-control)',
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Retry live connection →
          </button>
        ) : undefined
      }
    >
      {dependency
        ? 'The doorbell service or the proxy is down, so the live stream failed closed. The rows below are the built-in demo fixtures (not live) so the interface stays inspectable — reconnect to see real notifications.'
        : 'The request failed. The rows below are demo fixtures; retry to load the live feed.'}
    </ErrorState>
  );
}
