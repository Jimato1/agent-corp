import type { ReactNode, SVGProps } from 'react';

/**
 * Icon — the lightweight, geometric line-icon set (Lucide-style 24px stroke
 * geometry, ~2px stroke, round caps/joins). Monochrome ink via currentColor.
 * Merged from the design handoff workbench + flow icon sets.
 */
const PATHS: Record<string, ReactNode> = {
  // workbench ops
  pages: (<><rect x="4" y="3" width="13" height="18" rx="2" /><path d="M8 3v18" /></>),
  merge: (<><path d="M7 3v6a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v6" /><path d="m14 9 3-3-3-3" /></>),
  split: (<><path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M21 3 3 21" /></>),
  rotate: (<><path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" /></>),
  compress: (<><path d="M4 9V5a1 1 0 0 1 1-1h4" /><path d="M20 15v4a1 1 0 0 1-1 1h-4" /><path d="M15 4h4a1 1 0 0 1 1 1v4" /><path d="M9 20H5a1 1 0 0 1-1-1v-4" /><path d="m9 9 6 6" /></>),
  export: (<><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14a0 0 0 0 1 0 0v-4" /><path d="M5 17v4" /></>),
  trash: (<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
  play: (<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  minus: (<path d="M5 12h14" />),
  check: (<path d="M20 6 9 17l-5-5" />),
  chevron: (<path d="m9 6 6 6-6 6" />),
  chevronDown: (<path d="m6 9 6 6 6-6" />),
  panelLeft: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  file: (<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></>),
  x: (<path d="M18 6 6 18M6 6l12 12" />),
  lock: (<><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  // flow kit
  layers: (<><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>),
  rotateCW: (<><path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" /></>),
  rotateCCW: (<><path d="M3 12a9 9 0 1 0 2.64-6.36" /><polyline points="3 3 3 9 9 9" /></>),
  combine: (<><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /><path d="M11 7h4a2 2 0 0 1 2 2v4" /></>),
  download: (<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>),
  external: (<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>),
  undo: (<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></>),
  redo: (<><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h1" /></>),
  alert: (<><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>),
  menu: (<path d="M3 6h18M3 12h18M3 18h18" />),
  sliders: (<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>),
  scissors: (<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></>),
  text: (<><path d="M5 6h14M5 12h14M5 18h9" /></>),
  copy: (<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>),
  image: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.8" /><path d="m21 15-5-5L5 21" /></>),
  scan: (<><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M6 12h12" /></>),
  zip: (<><path d="m7.5 4.3 9 5.2M21 8l-9-5-9 5v8l9 5 9-5V8Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>),
  fileText: (<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6M9 17h4" /></>),
  stop: (<rect x="6" y="6" width="12" height="12" rx="2" />),
  unlock: (<><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.9-.9" /></>),
  shield: (<><path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" /><path d="M9.5 12l1.8 1.8 3.5-3.6" /></>),
  wrench: (<><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" /></>),
  eraser: (<><path d="m7 21 10-10-4-4L3 17l4 4Z" /><path d="M11 21h9" /></>),
  align: (<><path d="M4 6h16M4 12h10M4 18h16" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.3 3.3M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 3.4-.5M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
};

export type IconName = keyof typeof PATHS | string;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, strokeWidth = 2, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}

export default Icon;
