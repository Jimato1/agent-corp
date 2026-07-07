// components/RunConsole.tsx — UI_SPEC §8.2 (app-specific, domain-unique). The
// streaming ansible task-event stdout/stderr tail: mono, task-indexed, cursored
// on Last-Event-ID. A live machine-output terminal is not a DataTable and not
// prose, so it cannot be a shared component. Its TRANSPORT is the shared
// LiveStream §5.5 contract (freshness-tagged; degrades to STALE, never a frozen
// green; terminates on token exp / auth:revocation) — only the terminal render
// is new.
//
// The SSE source is the AUDIT STORE (`/api/runs/{id}/events`), separate from the
// agent's MCP task channel. Offline (no backend) the hook replays fixture events
// on a timer so the pane still renders — clearly marked as a degraded read.

import { useEffect, useRef, useState } from 'react';
import { FreshnessStamp } from './ds';
import { eyebrow, mono } from './gwparts';
import { runEventsUrl } from '../lib/api';
import type { ConsoleEvent } from '../lib/types';

type StreamStatus = 'connecting' | 'live' | 'stale' | 'ended' | 'reset';

interface StreamState {
  events: ConsoleEvent[];
  status: StreamStatus;
  lastId: string | null;
  /** true when we are replaying fixtures because live SSE was unreachable. */
  degraded: boolean;
}

const STALE_AFTER_MS = 6_000;

/* The LiveStream-style hook. Attempts an EventSource on the audit-store tail;
   on error (or offline) it degrades to a fixture replay and marks STALE — it
   NEVER shows a frozen-but-green console. `sessionEnded` (token exp / revocation)
   terminates the stream with an honest end line. */
function useRunConsole(runId: string, fixture: ConsoleEvent[], opts: { offline?: boolean; sessionEnded?: boolean }): StreamState {
  const [state, setState] = useState<StreamState>({ events: [], status: 'connecting', lastId: null, degraded: false });
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let replay: ReturnType<typeof setInterval> | null = null;

    const bumpStale = () => {
      if (staleTimer.current) clearTimeout(staleTimer.current);
      staleTimer.current = setTimeout(() => {
        if (cancelled) return;
        setState((s) => (s.status === 'ended' ? s : { ...s, status: 'stale' }));
      }, STALE_AFTER_MS);
    };

    // Degraded path: replay the fixtures one line at a time so the pane renders
    // offline. Marked STALE — an offline console is never a live green.
    const startReplay = () => {
      let i = 0;
      setState({ events: [], status: 'stale', lastId: null, degraded: true });
      replay = setInterval(() => {
        if (cancelled) return;
        if (i >= fixture.length) {
          if (replay) clearInterval(replay);
          return;
        }
        const ev = fixture[i++];
        setState((s) => ({ events: [...s.events, ev], status: 'stale', lastId: ev.id, degraded: true }));
      }, 420);
    };

    if (opts.offline) {
      startReplay();
    } else {
      try {
        es = new EventSource(runEventsUrl(runId), { withCredentials: true });
        es.onopen = () => { if (!cancelled) { setState((s) => ({ ...s, status: 'live' })); bumpStale(); } };
        es.onmessage = (m: MessageEvent) => {
          if (cancelled) return;
          try {
            const ev = JSON.parse(m.data) as ConsoleEvent;
            setState((s) => ({ events: [...s.events, ev], status: ev.kind === 'end' ? 'ended' : 'live', lastId: m.lastEventId || ev.id, degraded: false }));
          } catch {
            /* malformed frame — ignore, keep the cursor honest */
          }
          bumpStale();
        };
        // A too-old Last-Event-ID → the backend emits `event: reset`; the caller
        // re-syncs from GET /api/runs/{id} then resumes at tip.
        es.addEventListener('reset', () => { if (!cancelled) setState((s) => ({ ...s, status: 'reset' })); });
        es.onerror = () => {
          // Connection dropped/unreachable → degrade to a fixture replay + STALE.
          if (cancelled) return;
          es?.close();
          startReplay();
        };
      } catch {
        startReplay();
      }
    }

    return () => {
      cancelled = true;
      if (es) es.close();
      if (replay) clearInterval(replay);
      if (staleTimer.current) clearTimeout(staleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, opts.offline]);

  // Session end (token exp / auth:revocation) is authoritative — terminate.
  if (opts.sessionEnded && state.status !== 'ended') {
    return { ...state, status: 'ended' };
  }
  return state;
}

function EventLine({ ev }: { ev: ConsoleEvent }) {
  if (ev.kind === 'task') {
    const rc = ev.result === 'changed' ? 'var(--state-amber-ink)' : ev.result === 'failed' ? 'var(--danger-text)' : 'var(--state-green-ink)';
    return (
      <div style={{ color: 'var(--text-secondary)' }}>
        {ev.text} {ev.result ? <span style={{ color: rc }}>{ev.result}</span> : null}
      </div>
    );
  }
  if (ev.kind === 'cursor') {
    return <div style={{ color: 'var(--text-muted)' }}>▏{ev.text}</div>;
  }
  if (ev.kind === 'end') {
    return <div style={{ color: 'var(--halt-gold-ink)' }}>▮▮ {ev.text}</div>;
  }
  return <div style={{ color: 'var(--text-muted)' }}>{ev.text}</div>;
}

/* The console pane. `halt` renders the honest DRAINING → boundary progression;
   `sessionEnded` ends the stream with "session ended — re-authenticate". */
export function RunConsole({
  runId,
  fixture,
  offline = false,
  taskIndex,
  halt = false,
  sessionEnded = false,
}: {
  runId: string;
  fixture: ConsoleEvent[];
  offline?: boolean;
  taskIndex?: string;
  halt?: boolean;
  sessionEnded?: boolean;
}) {
  const stream = useRunConsole(runId, fixture, { offline, sessionEnded });
  const status = stream.status;

  const freshness =
    sessionEnded ? <FreshnessStamp state="halt" reading="SESSION ENDED" />
      : status === 'live' ? <FreshnessStamp age="⟳ live 0.4s" />
        : status === 'ended' ? <FreshnessStamp state="halt" reading="ENDED" />
          : <FreshnessStamp state="stale" reading={stream.degraded ? '⚠ CANNOT CONFIRM live output — safe-stopped' : 'STALE'} />;

  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ ...eyebrow }}>Console · RunConsole — audit-store SSE tail{taskIndex ? ` · task ${taskIndex}` : ''}</span>
        {freshness}
      </div>
      <div style={{ ...mono, fontSize: 12, lineHeight: '19px', padding: 12, maxHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {stream.events.length === 0 ? (
          <div style={{ color: 'var(--text-disabled)' }}>▏connecting to audit-store tail…</div>
        ) : (
          stream.events.map((ev, i) => <EventLine key={`${ev.id}-${i}`} ev={ev} />)
        )}
        {halt ? (
          <div style={{ color: 'var(--state-violet-ink)', marginTop: 4 }}>⇉ DRAINING — will cancel at the next safe task boundary → <span style={{ color: 'var(--halt-gold-ink)' }}>▮▮ cancelled at boundary → failed(halted)</span></div>
        ) : null}
        {sessionEnded ? <div style={{ color: 'var(--halt-gold-ink)', marginTop: 4 }}>▮▮ session ended — re-authenticate</div> : null}
        {status === 'reset' ? <div style={{ color: 'var(--state-amber-ink)', marginTop: 4 }}>event: reset — re-syncing from GET /api/runs/{runId}, resuming at tip…</div> : null}
      </div>
    </div>
  );
}

export default RunConsole;
