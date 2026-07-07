// state/CmdbProvider.tsx — the shell-level state owner for the policy console.
// CMDB has NO real-time surface (PLAN §1): policy is a request/response store and
// the gate reads a synchronous in-process snapshot. So this provider owns only the
// suite POSTURE (header mirror + HaltBand + step-up cue + honest-state echo),
// pulled on a documented interval — never an event stream. Per-screen data is
// fetched by the generic `useResource` hook below, each with a fixtures fallback
// so the console renders fully offline (clearly marked as demo data).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, getPosture } from '../lib/api';
import type { SuitePosture } from '../lib/types';
import { FIXTURE_POSTURE } from '../lib/fixtures';

const POSTURE_POLL_MS = 15_000;

export interface CmdbState {
  posture: SuitePosture;
  /** True when the live posture call was unreachable and we fell back to fixtures. */
  offline: boolean;
  loadError: ApiError | null;
  reload: () => void;
}

const CmdbContext = createContext<CmdbState | null>(null);

export function CmdbProvider({ children }: { children: ReactNode }) {
  const [posture, setPosture] = useState<SuitePosture>(FIXTURE_POSTURE);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const p = await getPosture();
        if (cancelled) return;
        setPosture(p);
        setOffline(false);
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        // Live posture unreachable — fall back to fixtures (clearly marked) and
        // keep the honest Pattern-D error for the shell to surface.
        setPosture(FIXTURE_POSTURE);
        setOffline(true);
        setLoadError(e instanceof ApiError ? e : new ApiError('Posture load failed', 0));
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

  return <CmdbContext.Provider value={{ posture, offline, loadError, reload }}>{children}</CmdbContext.Provider>;
}

export function useCmdb(): CmdbState {
  const ctx = useContext(CmdbContext);
  if (!ctx) throw new Error('useCmdb must be used within <CmdbProvider>');
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
