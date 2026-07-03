// Shared icon set (Lucide-style 24px stroke geometry). Exposes <Icon name size/>.
(function () {
  const P = {
    pages:    <><rect x="4" y="3" width="13" height="18" rx="2"/><path d="M8 3v18"/></>,
    merge:    <><path d="M7 3v6a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v6"/><path d="m14 9 3-3-3-3"/></>,
    split:    <><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 3 3 21"/></>,
    rotate:   <><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></>,
    compress: <><path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/><path d="M15 4h4a1 1 0 0 1 1 1v4"/><path d="M9 20H5a1 1 0 0 1-1-1v-4"/><path d="m9 9 6 6"/></>,
    export:   <><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14a0 0 0 0 1 0 0v-4"/><path d="M5 17v4"/></>,
    trash:    <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    play:     <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>,
    plus:     <path d="M12 5v14M5 12h14"/>,
    minus:    <path d="M5 12h14"/>,
    check:    <path d="M20 6 9 17l-5-5"/>,
    chevron:  <path d="m9 6 6 6-6 6"/>,
    panelLeft:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
    search:   <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    file:     <><path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></>,
    x:        <path d="M18 6 6 18M6 6l12 12"/>,
    lock:     <><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  };
  function Icon({ name, size = 16, strokeWidth = 2, ...rest }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
        {P[name] || null}
      </svg>
    );
  }
  window.PFIcon = Icon;
})();
