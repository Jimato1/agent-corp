import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, Skeleton } from '../components/ds';
import { mono, panel } from '../components/KindBadge';
import { Head } from './common';
import { ApiError, getHealthSignals } from '../lib/api';
import { FIXTURE_HEALTH } from '../lib/fixtures';
import type { HealthSignal } from '../lib/types';

/* 4 · Health — the doorbell's own liveness under the FALSE-GREEN PROHIBITION
   (ch-screens.jsx `Health`). A stalled SSE / gave_up push / stale backup /
   pre-grant MC resolve-seam renders honest amber ▲ with the safe reading spelled
   out — NEVER a fabricated green, NEVER a red error. The MC resolve-seam row
   shows "▲ awaiting mc:read grant → deep-links on documented fallback". */
export function Health() {
  const [signals, setSignals] = useState<HealthSignal[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [offline, setOffline] = useState(false);

  const load = () => {
    setSignals(null);
    setError(null);
    setOffline(false);
    getHealthSignals()
      .then((s) => setSignals(s))
      .catch((e) => {
        const err = e instanceof ApiError ? e : new ApiError('Health load failed', 0);
        // Dependency down → fall back to fixtures (clearly marked) + Pattern D.
        setError(err);
        setSignals(FIXTURE_HEALTH);
        setOffline(true);
      });
  };

  useEffect(load, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
      <Head
        title="Health"
        sub="The doorbell's own liveness. The false-green prohibition binds hardest here — a doorbell that lies about whether it can ring is the worst failure."
      />

      {offline && error ? (
        <ErrorState
          pattern={error.isDependency ? 'D' : 'R'}
          title={error.isDependency ? 'Health endpoint unreachable — showing offline demo signals' : "Couldn't load health"}
          detail={`${error.code}${error.status ? ` · HTTP ${error.status}` : ''}`}
          action={
            <button
              type="button"
              onClick={load}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 600,
                color: error.isDependency ? 'var(--halt-gold-ink)' : 'var(--danger-text)',
                background: 'transparent',
                border: `1px solid ${error.isDependency ? 'var(--halt-gold-edge)' : '#5A2420'}`,
                borderRadius: 'var(--radius-control)',
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              Retry →
            </button>
          }
        >
          {error.isDependency
            ? 'The signals below are demo fixtures — reconnect to read the doorbell’s real liveness. (This is the safety system reporting honestly, not a fabricated green.)'
            : 'Retry to load the live liveness rows.'}
        </ErrorState>
      ) : null}

      {signals === null ? (
        <div style={{ ...panel, padding: 16 }}>
          <Skeleton variant="table" rows={5} />
        </div>
      ) : signals.length === 0 ? (
        <EmptyState glyph="⟳" title="No health signals reported">
          The doorbell exposes no liveness rows right now. If this persists, the health endpoint itself may be degraded.
        </EmptyState>
      ) : (
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column' }}>
          {signals.map((r, i) => {
            // False-green prohibition: pending OR not-ok both render honest amber ▲,
            // never a fabricated green ● and never a red error.
            const honestAmber = r.pending || !r.ok;
            return (
              <div
                key={r.key ?? i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < signals.length - 1 ? '1px solid var(--border-default)' : 0,
                }}
              >
                <span style={{ width: 24, textAlign: 'center', fontVariantEmoji: 'text' }}>{r.icon}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', width: 110 }}>{r.label}</span>
                {honestAmber ? (
                  <span style={{ color: 'var(--state-amber-ink)' }}>▲</span>
                ) : (
                  <span style={{ color: 'var(--state-green)' }}>●</span>
                )}
                <span style={{ ...mono, fontSize: 12, color: honestAmber ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{r.detail}</span>
                <span style={{ flex: 1 }} />
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>source: {r.source}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
        ── MC resolve seam ── the mc:read grant is pre-freeze; the resolve row stays honest-PENDING and deep-links fall back to MC home.
      </div>
    </div>
  );
}

export default Health;
