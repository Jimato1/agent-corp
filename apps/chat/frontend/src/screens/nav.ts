import type { Envelope } from '../lib/types';

export type Route = 'feed' | 'note' | 'broadcast' | 'health';

/** The tiny router context the shell threads into each screen (matches app.jsx). */
export interface Nav {
  goto: (r: Route) => void;
  openNote: (n: Envelope) => void;
}
