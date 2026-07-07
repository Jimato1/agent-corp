import { useEffect, useState } from 'react';
import { FenceState, PrincipalRef, TicketRef } from '../components/ds';
import { KindBadge, eyebrow, mono, panel } from '../components/KindBadge';
import { getNotification, ApiError } from '../lib/api';
import { relativeAge } from '../lib/format';
import type { Envelope } from '../lib/types';
import type { Nav } from './nav';

/* 2 · Notification detail — the deep-link landing (ch-screens.jsx `NoteDetail`).
   A target-wins snapshot caption, the body rendered on the Workshop paper
   surface, and the sanitization made visible. The body is server-sanitized HTML
   (allowlist markdown; raw HTML + remote images stripped to dead text; body
   links neutralized) rendered from `body_html` ONLY — never raw `body`. The one
   live link on the whole screen is the template-derived MC deep-link. */
export function NoteDetail({ note, nav }: { note: Envelope; nav: Nav }) {
  // The feed already carries the envelope; re-fetch the authoritative copy from
  // GET /api/notifications/{id} in the background (the landing endpoint). A
  // dependency failure is Pattern D and non-fatal — we keep the snapshot.
  const [n, setN] = useState<Envelope>(note);
  const [staleFetch, setStaleFetch] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    setN(note);
    setStaleFetch(null);
    getNotification(note.notification_id)
      .then((fresh) => {
        if (!cancelled) setN(fresh);
      })
      .catch((e) => {
        if (!cancelled) setStaleFetch(e instanceof ApiError ? e : new ApiError('refresh failed', 0));
      });
    return () => {
      cancelled = true;
    };
  }, [note]);

  const reason = n.tags[0];
  const link = n.deep_link;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
      <button
        onClick={() => nav.goto('feed')}
        style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}
      >
        ← Feed
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <KindBadge kind={n.kind} prio={n.priority} />
        <PrincipalRef kind={n.agent_kind} id={n.agent_id} />
        {reason ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{reason}</span> : null}
      </div>

      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span>{n.notification_id} ⧉</span>
        <span>posted {relativeAge(n.created_at)} · ×{n.repeat_count}</span>
        {n.ticket_id ? <TicketRef id={n.ticket_id} /> : null}
        {n.acked_at ? <span style={{ color: 'var(--state-green-ink)' }}>acked ✔ {n.acked_by ?? ''}</span> : null}
      </div>

      {/* Snapshot caption — the live target is authoritative (target wins). The
          deep-link is the ONLY live link on this screen. */}
      <div
        style={{
          background: 'var(--signal-cyan-wash)',
          border: '1px solid #14424F',
          borderRadius: 'var(--radius-panel)',
          padding: '10px 14px',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          lineHeight: '18px',
          color: 'var(--signal-cyan-ink)',
        }}
      >
        ⓘ This is a snapshot from when it was posted. The live target is authoritative — open it:{' '}
        {link ? (
          <>
            <a href={link.url} style={{ color: 'var(--signal-cyan)' }}>◈ {link.label}</a>{' '}
            <b>[ Open in MC → ]</b>{' '}
            <span style={{ ...mono, fontSize: 10, color: 'var(--signal-cyan-ink)', opacity: 0.8 }}>{link.caption || '(target wins)'}</span>
            {link.pending ? (
              <span style={{ ...mono, fontSize: 10, color: 'var(--state-amber-ink)', marginLeft: 6 }}>▲ resolve-seam pending → documented fallback</span>
            ) : null}
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>no linked target</span>
        )}
      </div>

      {staleFetch ? (
        <div style={{ ...mono, fontSize: 11, color: staleFetch.isDependency ? 'var(--halt-gold-ink)' : 'var(--text-muted)' }}>
          {staleFetch.isDependency
            ? '⛊ live refresh unavailable (dependency down) — showing the posted snapshot; the target above still wins.'
            : '· showing the posted snapshot'}
        </div>
      ) : null}

      {/* The body: Workshop paper surface, Source Serif 4, server-sanitized HTML. */}
      <div style={{ ...panel, overflow: 'hidden' }}>
        <div className="workshop-surface" style={{ background: 'var(--paper-page)', padding: '28px 32px' }}>
          {n.title ? (
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--paper-ink)', margin: '0 0 12px' }}>{n.title}</h2>
          ) : null}
          {/* Render ONLY the server-sanitized body_html (never raw `body`). */}
          <div className="ch-body" dangerouslySetInnerHTML={{ __html: n.body_html }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: '25px', color: '#6A6A62', margin: '16px 0 0' }}>
            Body is allowlist-markdown only. Raw HTML and remote images are stripped to dead text;{' '}
            <span style={{ textDecoration: 'underline dotted' }}>links render as dead text</span> — the only live link is the MC deep-link above (anti-phishing).
          </p>
        </div>
      </div>

      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={eyebrow}>envelope</span>
        kind {n.kind} · P{n.priority}
        {n.source_system ? <span>· source {n.source_system}/{n.source_kind ?? '—'}</span> : null}
        {n.fencing_token ? (
          <span style={{ opacity: 0.6 }}>
            <FenceState gen={n.fencing_token} advisory state="held" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default NoteDetail;
