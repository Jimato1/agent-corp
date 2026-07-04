/* Drive shell + router. NavRail + AppHeader (with the read-only KillMirror — Drive is NOT in the
   kill chain) + a local-state router over the four screens. Fetches live data via DR_API and
   threads a ctx into every screen. Two views, one state: this rides the exact PLAN §4 API the MCP
   tools serve. */
(function () {
  const DS = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, FreshnessStamp } = DS;
  const { Browser, Detail, Upload, Admin } = window.DRScreens;
  const API = window.DR_API;
  const h = React.createElement;

  function errStatus(e) {
    // Dependency / auth outages → gold Pattern-D; recoverable request problems → red Pattern-R.
    if (e && (e.kind === 'degraded' || e.kind === 'auth')) return { status: 'degraded', statusOpts: e.kind === 'auth' ? { title: 'Sign-in required', message: 'This session is not authenticated at the edge. Reads resume once the proxy forward-auth session is present.' } : {} };
    return { status: 'error', statusOpts: { message: (e && e.message) || 'Request failed.' } };
  }

  function App() {
    const [route, setRoute] = React.useState('browser');
    const [collapsed, setCollapsed] = React.useState(false);
    const [uploadOpen, setUploadOpen] = React.useState(false);
    const [detailId, setDetailId] = React.useState(null);
    const [degraded, setDegraded] = React.useState(false);

    const [browser, setBrowser] = React.useState({ status: 'loading', groups: [] });
    const [detail, setDetail] = React.useState({ status: 'loading', detail: null });
    const [admin, setAdmin] = React.useState({ status: 'loading' });

    const contentUrl = function (vid) { return vid ? '/api/versions/' + encodeURIComponent(vid) + '/content' : null; };

    async function loadBrowser() {
      setBrowser({ status: 'loading', groups: [] });
      try { setBrowser({ status: 'ok', groups: await API.loadGroups() }); }
      catch (e) { setBrowser(Object.assign({ groups: [] }, errStatus(e))); }
    }
    async function loadDetail(id) {
      setDetail({ status: 'loading', detail: null });
      try { setDetail({ status: 'ok', detail: await API.loadDetail(id) }); }
      catch (e) { setDetail(Object.assign({ detail: null }, errStatus(e))); }
    }
    async function loadAdmin() {
      setAdmin({ status: 'loading' });
      try {
        const [health, absent, gc, audit] = await Promise.all([API.loadHealth(), API.loadAbsent(), API.loadGc(), API.loadAudit()]);
        setAdmin({ status: 'ok', health: health, absent: absent, gc: gc, audit: audit });
      } catch (e) { setAdmin(errStatus(e)); }
    }

    React.useEffect(function () {
      if (route === 'browser') loadBrowser();
      if (route === 'admin') loadAdmin();
      if (route === 'detail' && detailId) loadDetail(detailId);
    }, [route, detailId]);

    const ctx = {
      goto: function (r) { setRoute(r); },
      openDetail: function (id) { setDetailId(id); setRoute('detail'); },
      openUpload: function () { setUploadOpen(true); },
      closeUpload: function () { setUploadOpen(false); },
      reload: function () { setUploadOpen(false); if (route === 'browser') loadBrowser(); if (route === 'admin') loadAdmin(); },
      contentUrl: contentUrl,
      download: function (vid) { if (vid) window.location.href = contentUrl(vid); },
      deleteMark: async function (id) { try { await fetch('/api/artifacts/' + id, { method: 'DELETE', credentials: 'include' }); loadDetail(id); } catch (_) {} },
      restore: async function (id, vid) { try { await fetch('/api/artifacts/' + id + '/restore', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version_id: vid }) }); loadDetail(id); } catch (_) {} },
      gcPurge: async function () { try { await fetch('/api/admin/gc', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: 'PURGE' }) }); loadAdmin(); } catch (_) {} },
    };

    const navItems = [
      { group: 'Store' },
      { key: 'browser', label: 'Ticket browser', icon: '▤', active: route === 'browser', onClick: function () { setRoute('browser'); } },
      { key: 'detail', label: 'Artifact detail', icon: '▦', active: route === 'detail', onClick: function () { if (detailId) setRoute('detail'); } },
      { group: 'Admin' },
      { key: 'admin', label: 'Admin console', icon: '⚙', active: route === 'admin', onClick: function () { setRoute('admin'); } },
    ];

    const framed = route === 'detail';
    let screen;
    if (route === 'browser') screen = h(Browser, Object.assign({ ctx: ctx }, browser));
    else if (route === 'detail') screen = h(Detail, Object.assign({ ctx: ctx, degraded: degraded, onToggleDegraded: function () { setDegraded(!degraded); } }, detail));
    else if (route === 'admin') screen = h(Admin, Object.assign({ ctx: ctx }, admin));

    return h('div', { style: { display: 'flex', height: '100vh' } },
      h(NavRail, { current: 'drive', posture: 'nominal', collapsed: collapsed, onToggle: setCollapsed, postureHref: '#', items: navItems }),
      h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 } },
        h(AppHeader, { appName: 'Drive', identity: 'artifact store', systemState: h(FreshnessStamp, { age: 'polled' }) },
          h(KillMirror, { engaged: false, href: '#' })),
        h('main', { style: framed ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 16 } : { flex: 1, overflow: 'auto', padding: 24 } }, screen)),
      uploadOpen ? h(Upload, { ctx: ctx, defaultTicket: detail.detail ? detail.detail.ticket : '' }) : null);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
