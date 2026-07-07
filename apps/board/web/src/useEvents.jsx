// useEvents.js — one SSE feed (GET /api/events) driving live refresh (UI_SPEC §3 LiveStream). On
// `reset`/error the caller re-syncs from REST. Terminates at the token exp -> re-auth prompt.

export function useEvents(onEvent) {
  React.useEffect(() => {
    let es;
    try {
      es = new EventSource('/api/events', { withCredentials: true });
    } catch {
      return; // no stream (e.g. dev without cookie) — screens still poll
    }
    const relay = (type) => (e) => { try { onEvent(type, JSON.parse(e.data)); } catch { /* keepalive */ } };
    es.addEventListener('ticket', relay('ticket'));
    es.addEventListener('ceremony', relay('ceremony'));
    es.addEventListener('escalation', relay('escalation'));
    es.addEventListener('session', () => { onEvent('session', { reason: 'token_exp' }); es.close(); });
    es.onerror = () => { onEvent('stale', {}); };
    return () => es && es.close();
  }, []);
}
