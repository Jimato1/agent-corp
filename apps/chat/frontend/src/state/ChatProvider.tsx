// state/ChatProvider.tsx — the single live-state owner for the doorbell.
// Owns: initial history load (GET /api/notifications + /broadcasts), the live
// SSE connection (GET /api/feed) merged over that history, and the write actions
// (ack, ack-all, post/revoke broadcast). If the backend is unreachable it falls
// back to the ch-data fixtures so the shell stays viewable offline (clearly
// marked) — but the live API is always the primary path.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ApiError,
  ackNotification,
  feedUrl,
  listBroadcasts,
  listNotifications,
  postBroadcast,
  revokeBroadcast,
} from '../lib/api';
import type { PostBroadcastInput } from '../lib/api';
import type { AckEvent, Broadcast, Envelope } from '../lib/types';
import { FIXTURE_BROADCASTS, FIXTURE_FEED } from '../lib/fixtures';

// PostBroadcastInput is owned by api.ts; re-export it so screens import from here.
export type { PostBroadcastInput } from '../lib/api';

type Status = 'loading' | 'ready';

export interface ChatState {
  status: Status;
  /** True when the live API was unreachable and we fell back to fixtures. */
  offline: boolean;
  /** The dependency/network error that forced offline (drives Pattern-D). */
  loadError: ApiError | null;
  /** SSE liveness — false when the stream is down / reconnecting. */
  connected: boolean;
  notifications: Envelope[];
  broadcasts: Broadcast[];
  getById: (id: string) => Envelope | undefined;
  reload: () => void;
  ackOne: (id: string) => Promise<void>;
  ackAllSeen: () => Promise<void>;
  createBroadcast: (input: PostBroadcastInput) => Promise<Broadcast>;
  revoke: (id: string) => Promise<Broadcast>;
}

const ChatContext = createContext<ChatState | null>(null);

function byCreatedDesc(a: Envelope, b: Envelope): number {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

// Cast an SSE Event to its MessageEvent payload and parse the JSON data.
function readSse<T>(ev: Event): { data: T; id: string } | null {
  const me = ev as MessageEvent;
  try {
    return { data: JSON.parse(me.data) as T, id: me.lastEventId };
  } catch {
    return null;
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Envelope[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const offlineRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  const upsertNotification = useCallback((n: Envelope) => {
    setNotifications((prev) => {
      const next = prev.filter((x) => x.notification_id !== n.notification_id);
      next.push(n);
      next.sort(byCreatedDesc);
      return next;
    });
  }, []);

  const upsertBroadcast = useCallback((b: Broadcast) => {
    setBroadcasts((prev) => {
      const next = prev.filter((x) => x.broadcast_id !== b.broadcast_id);
      next.unshift(b);
      return next;
    });
  }, []);

  const applyAck = useCallback((ack: AckEvent) => {
    setNotifications((prev) =>
      prev.map((x) =>
        x.notification_id === ack.notification_id
          ? { ...x, acked_at: ack.acked_at, acked_by: ack.acked_by }
          : x,
      ),
    );
  }, []);

  // -- Initial history load + SSE wiring ------------------------------------
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    async function boot() {
      try {
        const [page, casts] = await Promise.all([
          listNotifications({ limit: 100 }),
          listBroadcasts(false),
        ]);
        if (cancelled) return;
        setNotifications([...page.notifications].sort(byCreatedDesc));
        setBroadcasts(casts);
        setOffline(false);
        offlineRef.current = false;
        setLoadError(null);
        setStatus('ready');
        openStream();
      } catch (e) {
        if (cancelled) return;
        // Live API unreachable — fall back to fixtures (clearly marked), and keep
        // the honest Pattern-D error for the screens to surface.
        const err = e instanceof ApiError ? e : new ApiError('Load failed', 0);
        setNotifications([...FIXTURE_FEED].sort(byCreatedDesc));
        setBroadcasts(FIXTURE_BROADCASTS);
        setOffline(true);
        offlineRef.current = true;
        setLoadError(err);
        setConnected(false);
        setStatus('ready');
      }
    }

    function openStream() {
      try {
        const es = new EventSource(feedUrl(), { withCredentials: true });
        esRef.current = es;
        es.onopen = () => !cancelled && setConnected(true);
        es.onerror = () => !cancelled && setConnected(false);
        es.addEventListener('notification', (ev: Event) => {
          const r = readSse<Envelope>(ev);
          if (r && !cancelled) upsertNotification(r.data);
        });
        es.addEventListener('broadcast', (ev: Event) => {
          const r = readSse<Broadcast>(ev);
          if (r && !cancelled) upsertBroadcast(r.data);
        });
        es.addEventListener('ack', (ev: Event) => {
          const r = readSse<AckEvent>(ev);
          if (r && !cancelled) applyAck(r.data);
        });
        es.addEventListener('reset', () => {
          // The cursor was too old — re-sync history, then keep streaming live.
          if (cancelled) return;
          listNotifications({ limit: 100 })
            .then((page) => {
              if (!cancelled) setNotifications([...page.notifications].sort(byCreatedDesc));
            })
            .catch(() => {
              /* transient — the stream stays open and will backfill */
            });
        });
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [reloadKey, upsertNotification, upsertBroadcast, applyAck]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const getById = useCallback(
    (id: string) => notifications.find((n) => n.notification_id === id),
    [notifications],
  );

  const ackOne = useCallback(
    async (id: string) => {
      if (offlineRef.current) {
        applyAck({ notification_id: id, acked_at: new Date().toISOString(), acked_by: 'operator:you' });
        return;
      }
      const res = await ackNotification(id);
      applyAck(res);
    },
    [applyAck],
  );

  const ackAllSeen = useCallback(async () => {
    // The pinned Envelope carries no server sequence, so we ack the loaded
    // unacked set item-by-item rather than by up_to_seq (see BUILD_NOTES).
    const targets = notifications.filter((n) => !n.acked_at).map((n) => n.notification_id);
    if (offlineRef.current) {
      const at = new Date().toISOString();
      targets.forEach((id) => applyAck({ notification_id: id, acked_at: at, acked_by: 'operator:you' }));
      return;
    }
    const results = await Promise.allSettled(targets.map((id) => ackNotification(id)));
    results.forEach((r) => {
      if (r.status === 'fulfilled') applyAck(r.value);
    });
  }, [notifications, applyAck]);

  const createBroadcast = useCallback(
    async (input: PostBroadcastInput) => {
      if (offlineRef.current) {
        const b: Broadcast = {
          broadcast_id: `B-${Math.floor(Math.random() * 9000 + 1000)}`,
          created_at: new Date().toISOString(),
          created_by: 'operator:you',
          body: input.body,
          body_html: `<p>${input.body.replace(/</g, '&lt;')}</p>`,
          priority: input.priority,
          expires_at: input.expires_at ?? new Date(Date.now() + 24 * 3600_000).toISOString(),
          revoked_at: null,
          revoked_by: null,
          state: 'active',
        };
        upsertBroadcast(b);
        return b;
      }
      const b = await postBroadcast(input);
      upsertBroadcast(b);
      return b;
    },
    [upsertBroadcast],
  );

  const revoke = useCallback(
    async (id: string) => {
      if (offlineRef.current) {
        let updated: Broadcast | undefined;
        setBroadcasts((prev) =>
          prev.map((b) => {
            if (b.broadcast_id !== id) return b;
            updated = { ...b, state: 'revoked', revoked_at: new Date().toISOString(), revoked_by: 'operator:you' };
            return updated;
          }),
        );
        return updated as Broadcast;
      }
      const b = await revokeBroadcast(id);
      upsertBroadcast(b);
      return b;
    },
    [upsertBroadcast],
  );

  const value: ChatState = {
    status,
    offline,
    loadError,
    connected,
    notifications,
    broadcasts,
    getById,
    reload,
    ackOne,
    ackAllSeen,
    createBroadcast,
    revoke,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatState {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within <ChatProvider>');
  return ctx;
}
