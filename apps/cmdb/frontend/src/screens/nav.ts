// The 13 rail destinations (UI_SPEC §5). Host detail is a sub-route of Fleet.
export type Route =
  | 'fleet'
  | 'host'
  | 'tiers'
  | 'tasks'
  | 'catalog'
  | 'sandbox'
  | 'discovery'
  | 'dryrun'
  | 'history'
  | 'decisions'
  | 'escalations'
  | 'breakglass';

/** The tiny router context the shell threads into each screen (matches app.jsx). */
export interface Nav {
  goto: (r: Route) => void;
  openHost: (hostId: string) => void;
}
