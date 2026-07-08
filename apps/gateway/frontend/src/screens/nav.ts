// The 6 rail destinations (UI_SPEC §3). Run detail (S2) is NOT a rail item — it
// is reached by opening a run ref from any screen.
export type Route =
  | 'monitor'
  | 'run'
  | 'audit'
  | 'killswitch'
  | 'catalog'
  | 'sandbox'
  | 'orphans';

/** The tiny router context the shell threads into each screen. */
export interface Nav {
  goto: (r: Route) => void;
  /** Open the S2 run-detail view for a given run ref. */
  openRun: (runId: string) => void;
}
