// state/GatewayProvider.tsx — the shell-level state owner for the execution
// monitor (a faithful port of the CMDB kit's CmdbProvider, adapted to the
// Gateway's halt-status shape). It owns only the POSTURE (header mirror +
// read-only HaltBand + step-up cue + honest-state echo), polled on a documented
// interval. Per-screen data uses the generic `useResource` hook below, each with
// a fixtures fallback so the console renders fully offline (marked as demo data).
//
// Unlike CMDB, the Gateway HAS a live surface (the RunConsole SSE tail) — but
// that lives in the RunConsole hook (§8.2), NOT here. This provider stays a
// simple posture poller; the L2-CONFIRMED truth is /api/halt-status (§7).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, getHaltStatus } from '../lib/api';
import type { GatewayPosture, HaltStatus } from '../lib/types';
import { FIXTURE_POSTURE } from '../lib/fixtures';

const POSTURE_POLL_MS = 10_000;

/** Map the raw /api/halt-status tuple into the shell posture the header + rail +
 *  HaltBand consume. Keeps the shell decoupled from the wire shape. */
function toPosture(h: HaltStatus): GatewayPosture {
  return {
    kill_level: h.level,
    epoch_seen: h.epoch_seen,
    in_flight_runs: h.in_flight_runs,
    auth_epoch: h.auth_epoch,
    auth_epoch_age: h.auth_epoch_age,
    auth_epoch_stale: h.auth_epoch_stale,
    confirmed: h.confirmed,
    pending: h.pending,
    draining: h.draining,
    draining_detail: h.draining_detail,
    last_refuse: h.last_dispatch_refused_at,
    operator: h.operator ?? 'operator:ada',
    step_up_fresh: h.step_up_fresh ?? true,
    own_stale: h.own_stale,
  };
}

export interface GatewayState {
  posture: GatewayPosture;
  /** True when the live halt-status call was unreachable and we fell back to
   *  fixtures. In the Gateway this is itself a SAFE-STOPPED signal — the console
   *  cannot confirm its own halt liveness, so it fails closed. */
  offline: boolean;
  loadError: ApiError | null;
  reload: () => void;
}

const GatewayContext = createContext<GatewayState | null>(null);

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [posture, setPosture] = useState<GatewayPosture>(FIXTURE_POSTURE);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const h = await getHaltStatus();
        if (cancelled) return;
        setPosture(toPosture(h));
        setOffline(false);
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        // Live halt-status unreachable — fall back to fixtures (clearly marked)
        // and keep the honest Pattern-D error for the shell to surface. The
        // Gateway cannot confirm its own halt liveness → treat as safe-stopped.
        setPosture({ ...FIXTURE_POSTURE, own_stale: true });
        setOffline(true);
        setLoadError(e instanceof ApiError ? e : new ApiError('Halt-status load failed', 0));
      }
    }

    poll();
    timer.current = setInterval(poll, POSTURE_POLL_MS);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return <GatewayContext.Provider value={{ posture, offline, loadError, reload }}>{children}</GatewayContext.Provider>;
}

export function useGateway(): GatewayState {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error('useGateway must be used within <GatewayProvider>');
  return ctx;
}

// -- useResource -------------------------------------------------------------
// The one data-loading primitive every list/detail screen uses. Runs the live
// fetcher; on failure falls back to the supplied fixture and records whether the
// failure was a dependency outage (Pattern D) or a local error (Pattern R).

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface Resource<T> {
  data: T | null;
  status: LoadStatus;
  /** True when we're showing the fixture because the live call failed. */
  offline: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function useResource<T>(
  fetcher: () => Promise<T>,
  fixture: T,
  deps: unknown[] = [],
): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetcherRef
      .current()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setOffline(false);
        setError(null);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        const err = e instanceof ApiError ? e : new ApiError('Load failed', 0);
        setData(fixture);
        setOffline(true);
        setError(err);
        setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...deps]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { data, status, offline, error, reload };
}
