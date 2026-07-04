/* Live-data layer for the Drive UI. Maps the PLAN §4 HTTP API → the exact shapes the Helm Drive
   kit components consume (GROUPS / DETAIL / HEALTH / ABSENT / GC / AUDIT). Two views, one state:
   this is the SAME API the MCP tools serve. Browser rides the proxy forward-auth session
   (credentials: 'include') + the verified X-Auth-Identity — never a capability URL. */
(function () {
  const api = {};

  async function req(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: 'include', headers: { accept: 'application/json' } }, opts || {}));
    if (res.status === 401) { const e = new Error('unauthenticated'); e.kind = 'auth'; throw e; }
    if (res.status === 503 || res.status === 502) { const e = new Error('dependency down'); e.kind = 'degraded'; throw e; }
    if (!res.ok) {
      let body = null; try { body = await res.json(); } catch (_) {}
      const e = new Error((body && body.error && body.error.message) || ('http ' + res.status));
      e.kind = res.status >= 500 ? 'degraded' : 'error';
      e.status = res.status; e.body = body;
      throw e;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function humanBytes(n) {
    if (n == null) return '—';
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return (i === 0 ? v : v.toFixed(1)) + ' ' + u[i];
  }
  function ago(iso) {
    if (!iso) return '—';
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return Math.round(s) + 's';
    if (s < 3600) return Math.round(s / 60) + 'm';
    if (s < 86400) return Math.round(s / 3600) + 'h';
    return Math.round(s / 86400) + 'd';
  }
  function kindOf(sub) {
    if (!sub) return 'service';
    if (sub.indexOf('agent:') === 0) return 'agent';
    if (sub.indexOf('svc:') === 0) return 'service';
    if (sub.indexOf('op:') === 0) return 'operator';
    return 'service';
  }
  function tierOf(row) {
    if (row.derived) return 'derived';
    if (row.ticket_state === 'verified') return 'verified';
    return 'single-source';
  }
  api.humanBytes = humanBytes;
  api.ago = ago;

  // Ticket Browser — recent view: distinct-ticket index (§7 delta) + per-ticket artifact rows.
  api.loadGroups = async function () {
    const idx = await req('/api/tickets');
    const groups = [];
    for (const t of (idx.tickets || [])) {
      const list = await req('/api/artifacts?ticket_id=' + encodeURIComponent(t.ticket_id));
      const artifacts = (list.artifacts || []).map(function (a) {
        return {
          name: a.logical_name, seq: 'v' + a.seq, mime: a.mime, size: humanBytes(a.size_bytes),
          createdBy: a.created_by, kind: kindOf(a.created_by), tier: tierOf(a), when: ago(a.created_at),
          fence: null,
        };
      });
      groups.push({
        ticket: t.ticket_id, verify: t.ticket_state, count: t.artifact_count,
        size: humanBytes(t.total_bytes), lastWrite: ago(t.last_write),
        source: 'board',
        note: t.ticket_state === 'unverified_pending' ? 'Board unreachable at write; recheck queued'
          : (t.ticket_state === 'verified_absent' ? 'ticket_not_found_on_board' : null),
        artifacts: artifacts,
      });
    }
    return groups;
  };

  // Ticket Browser — deep-linked to one ticket.
  api.loadTicket = async function (ticketId) {
    const list = await req('/api/artifacts?ticket_id=' + encodeURIComponent(ticketId) + '&include_deleted=false');
    return (list.artifacts || []).map(function (a) {
      return { artifact_id: a.artifact_id, name: a.logical_name, seq: 'v' + a.seq, mime: a.mime,
        size: humanBytes(a.size_bytes), createdBy: a.created_by, kind: kindOf(a.created_by),
        tier: tierOf(a), when: ago(a.created_at) };
    });
  };

  api.loadDetail = async function (artifactId) {
    const d = await req('/api/artifacts/' + encodeURIComponent(artifactId));
    const meta = d.metadata; const versions = d.versions || [];
    const maxFence = versions.reduce(function (m, v) { return v.fencing_token != null ? Math.max(m, v.fencing_token) : m; }, -1);
    return {
      artifact_id: meta.artifact_id, ticket: meta.ticket_id, name: meta.logical_name,
      mime: (meta.current && meta.current.mime) || 'application/octet-stream',
      sha: (meta.current && meta.current.sha256 ? meta.current.sha256.slice(0, 8) + '…' + meta.current.sha256.slice(-2) : '—'),
      tier: meta.ticket_state === 'verified' ? 'verified' : 'single-source',
      createdBy: meta.created_by, ticket_state: meta.ticket_state,
      current_version_id: meta.current_version_id, deleted: meta.deleted,
      versions: versions.map(function (v) {
        var state = v.current ? 'held' : (v.fencing_token != null && v.fencing_token < maxFence ? 'superseded' : 'aging');
        var fence = v.fencing_token != null ? { gen: v.fencing_token, state: state, supBy: state === 'superseded' ? maxFence : undefined } : null;
        return { version_id: v.version_id, seq: 'v' + v.seq, when: ago(v.created_at), who: v.created_by,
          kind: kindOf(v.created_by), hash: v.sha256 ? v.sha256.slice(0, 8) + '…' : '—', fence: fence,
          current: !!v.current, is_delete_marker: !!v.is_delete_marker };
      }),
    };
  };

  api.loadHealth = async function () {
    const h = await req('/api/healthz');
    return {
      watermark: [h.disk.used_pct, h.disk.watermark_pct],
      backup: h.backup.last_at ? ago(h.backup.last_at) + ' ago' : 'never',
      backupStale: !h.backup.last_at,
      verify: h.verify.last_at ? ago(h.verify.last_at) + ' ago' : 'never',
      journals: 'closed', boardCheck: h.board_check,
    };
  };

  // verified_absent queue derived from the distinct-index worst-state rollup (Drive-local gate).
  api.loadAbsent = async function () {
    const idx = await req('/api/tickets');
    return (idx.tickets || []).filter(function (t) { return t.ticket_state === 'verified_absent'; })
      .map(function (t) { return { ticket: t.ticket_id, name: t.artifact_count + ' artifact(s)', by: 'agent:—', reason: 'ticket_not_found_on_board' }; });
  };

  api.loadGc = async function () {
    const g = await req('/api/admin/gc');
    return { phase1: 'auto-swept', chains: g.delete_marked_chains, refcount0: g.refcount0_blobs, reclaim: humanBytes(g.reclaimable_bytes) };
  };

  api.loadAudit = async function () {
    const a = await req('/api/admin/audit?limit=50');
    return (a.entries || []).map(function (r) {
      return { at: ago(r.ts), who: r.principal, kind: kindOf(r.principal), verb: r.action,
        target: r.ticket_id || r.artifact_id || '—',
        outcome: r.outcome === 'rejected' && r.action === 'stale_fence_rejected' ? 'STALE_FENCING' : r.outcome };
    });
  };

  // Upload: same two-step intent → bytes API agents use (no UI-private path).
  api.upload = async function (ticketId, logicalName, file, onProgress) {
    const opId = 'ui-' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const intent = await req('/api/artifacts', {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, logical_name: logicalName, op_id: opId }),
    });
    // Bytes ride the operator's own browser session (forward-auth), streamed to Drive's own endpoint.
    const res = await fetch('/api/uploads/' + intent.upload_id, {
      method: 'PUT', credentials: 'include',
      headers: { 'content-type': file.type || 'application/octet-stream', 'x-original-name': file.name },
      body: file,
    });
    if (!res.ok) { let b = null; try { b = await res.json(); } catch (_) {} const e = new Error((b && b.error && b.error.message) || ('upload http ' + res.status)); e.body = b; e.status = res.status; throw e; }
    if (onProgress) onProgress(100);
    return res.json();
  };

  window.DR_API = api;
})();
