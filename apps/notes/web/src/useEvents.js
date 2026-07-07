// useEvents.js — the LiveStream client contract (UI_SPEC §3 / §5.5; PLAN §9.1). One SSE connection to
// GET /api/events carrying `note`, `audit`, and `session` events, each with an `id:` for replay.
//
// Honesty rules baked in:
//  - The browser EventSource resends `Last-Event-ID` automatically on reconnect (we track the last id
//    for display + a manual reconnect); the server replays from it.
//  - TERMINATE ON SESSION: a `session` event (token exp / auth:revocations) ends the stream — we do
//    NOT silently auto-reconnect past it; the app shows the honest "Session ended" state.
//  - A dropped connection degrades the freshness stamp to STALE (amber ▲), never a frozen-but-green
//    figure. EventSource's own retry handles transient drops.
const { useState, useEffect, useRef, useCallback } = window.React;

export function useEvents({ onNote, onAudit, onSession, enabled = true } = {}) {
  const [status, setStatus] = useState('connecting'); // connecting | live | stale
  const [sessionEnded, setSessionEnded] = useState(false);
  const [lastEventId, setLastEventId] = useState(null);
  const [nonce, setNonce] = useState(0); // bump to force a fresh EventSource
  const cbs = useRef({ onNote, onAudit, onSession });
  cbs.current = { onNote, onAudit, onSession };

  const reconnect = useCallback(() => {
    setSessionEnded(false);
    setStatus('connecting');
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || sessionEnded) return undefined;
    if (typeof EventSource === 'undefined') {
      setStatus('stale');
      return undefined;
    }
    const es = new EventSource('/api/events');

    es.onopen = () => setStatus('live');
    es.onerror = () => {
      // EventSource auto-retries open connections; reflect the gap honestly as STALE meanwhile.
      if (es.readyState !== EventSource.CLOSED) setStatus('stale');
    };
    const track = (e) => {
      if (e.lastEventId) setLastEventId(e.lastEventId);
    };
    es.addEventListener('note', (e) => {
      track(e);
      setStatus('live');
      let d = null;
      try { d = JSON.parse(e.data); } catch { /* ignore malformed frame */ }
      cbs.current.onNote && cbs.current.onNote(d, e);
    });
    es.addEventListener('audit', (e) => {
      track(e);
      setStatus('live');
      let d = null;
      try { d = JSON.parse(e.data); } catch { /* ignore */ }
      cbs.current.onAudit && cbs.current.onAudit(d, e);
    });
    es.addEventListener('session', (e) => {
      track(e);
      let d = null;
      try { d = JSON.parse(e.data); } catch { /* ignore */ }
      // Terminate on session — the token expired / was revoked. Do not reconnect automatically.
      es.close();
      setStatus('stale');
      setSessionEnded(true);
      cbs.current.onSession && cbs.current.onSession(d, e);
    });

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionEnded, nonce]);

  return { status, sessionEnded, lastEventId, reconnect };
}
