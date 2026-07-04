import { useState } from 'react';
import {
  Button,
  DangerAction,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  PrincipalRef,
  PrintedAbsence,
  Skeleton,
  StatusPill,
  TicketRef,
} from '../components/ds';
import type { DataColumn } from '../components/ds';
import { eyebrow, mono, panel } from '../components/KindBadge';
import { Head, DependencyBanner } from './common';
import { useChat } from '../state/ChatProvider';
import { ApiError } from '../lib/api';
import { relativeAge, relativeUntil } from '../lib/format';
import type { Broadcast as BroadcastT } from '../lib/types';

/* 3 · Broadcast — the operator→fleet composer + active banner + history
   (ch-screens.jsx `Broadcast`). Signal/attention family, DELIBERATELY not gold,
   not a HaltBand. The non-authority statement is a printed 🔒 absence. Post and
   Revoke are light confirms (Revoke = DangerAction light, direction="less") —
   no typed-intent, no step-up anywhere. */

/** Parse "24h" / "90m" / "in 2d" style durations into a future ISO expiry. */
function toExpiryIso(input: string): string | undefined {
  const s = input.trim().toLowerCase();
  if (!s) return undefined;
  const m = /^(\d+)\s*([hmd])$/.exec(s);
  if (!m) return undefined;
  const value = Number(m[1]);
  const unit = m[2];
  const ms = unit === 'h' ? value * 3600_000 : unit === 'm' ? value * 60_000 : value * 86_400_000;
  return new Date(Date.now() + ms).toISOString();
}

export function Broadcast() {
  const ctx = useChat();
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('3');
  const [expires, setExpires] = useState('24h');
  const [posting, setPosting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [postError, setPostError] = useState<ApiError | null>(null);

  const active = ctx.broadcasts.find((b) => b.state === 'active');

  const post = async () => {
    setPostError(null);
    if (!body.trim()) {
      setFieldError('A broadcast body is required (markdown, ≤2000 chars).');
      return;
    }
    if (body.length > 2000) {
      setFieldError('Too long — keep the advisory under 2000 characters.');
      return;
    }
    setFieldError(null);
    const prio = Number(priority);
    if (!Number.isInteger(prio) || prio < 1 || prio > 5) {
      setFieldError('Priority must be an integer P1–P5.');
      return;
    }
    setPosting(true);
    try {
      await ctx.createBroadcast({ body: body.trim(), priority: prio, expires_at: toExpiryIso(expires) });
      setBody('');
    } catch (e) {
      setPostError(e instanceof ApiError ? e : new ApiError('Post failed', 0));
    } finally {
      setPosting(false);
    }
  };

  const cols: DataColumn<BroadcastT>[] = [
    { key: 'broadcast_id', header: 'ID', render: (r) => <TicketRef id={r.broadcast_id} /> },
    { key: 'body', header: 'Body', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>{r.body}</span> },
    { key: 'created_by', header: 'By', render: (r) => <PrincipalRef kind="operator" id={r.created_by} /> },
    { key: 'created_at', header: 'Posted', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{relativeAge(r.created_at)} ago</span> },
    {
      key: 'state',
      header: 'State',
      render: (r) =>
        r.state === 'active' ? (
          <StatusPill tone="verified" glyph="●" size="sm">active</StatusPill>
        ) : r.state === 'expired' ? (
          <StatusPill tone="neutral" glyph="◼" size="sm">expired</StatusPill>
        ) : (
          <StatusPill tone="danger" glyph="⛒" size="sm">revoked</StatusPill>
        ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
      <Head title="Broadcast" sub="A soft operator→fleet advisory. It does not stop, gate, or command any agent." />

      {ctx.offline && ctx.loadError ? <DependencyBanner error={ctx.loadError} onRetry={ctx.reload} /> : null}

      {/* Active banner — signal/attention family, deliberately NOT gold. */}
      {active ? (
        <div
          style={{
            background: 'var(--signal-cyan-wash)',
            border: '1px solid #14424F',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 18 }}>📣</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--signal-cyan-ink)' }}>P{active.priority} · "{active.body}"</div>
            <div style={{ ...mono, fontSize: 11, color: 'var(--signal-cyan-ink)', opacity: 0.8 }}>
              by <PrincipalRef kind="operator" id={active.created_by} /> · posted {relativeAge(active.created_at)} ago · expires {relativeUntil(active.expires_at)}
            </div>
          </div>
          <DangerAction
            label="Revoke"
            glyph="⚠"
            variant="outline"
            size="compact"
            intensity="light"
            direction="less"
            title="Revoke broadcast"
            consequence="Withdraws the active broadcast — toward LESS. Writes an audit row. This does not stop, gate, or command any agent."
            confirmLabel="Revoke"
            onConfirm={() => void ctx.revoke(active.broadcast_id)}
          />
        </div>
      ) : null}

      {/* The non-authority statement — a printed 🔒 absence, never a disabled control. */}
      <PrintedAbsence glyph="🔒" tag="not a stop">
        <strong>A broadcast is an advisory the fleet MAY read.</strong> It does not stop, gate, or command any agent. To halt the fleet, use MC/auth.
      </PrintedAbsence>

      {/* Compose */}
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={eyebrow}>Compose</div>
        <Input
          label="Body"
          placeholder="markdown, ≤2000…"
          value={body}
          invalid={!!fieldError}
          hint={fieldError ?? undefined}
          onChange={(e) => {
            setBody(e.target.value);
            if (fieldError) setFieldError(null);
          }}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Input label="Priority" mono value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 90 }} />
          <Input label="Expires" value={expires} onChange={(e) => setExpires(e.target.value)} style={{ width: 110 }} />
          <span style={{ flex: 1 }} />
          <Button tone="primary" disabled={posting} onClick={() => void post()}>
            {posting ? 'Posting…' : 'Post broadcast'}
          </Button>
        </div>
        {postError ? (
          postError.isDependency ? (
            <ErrorState pattern="D" title="Couldn't post — backend safe-stopped" detail={`${postError.code}`}>
              The doorbell service is down, so the post failed closed. Nothing was broadcast. Retry once it reconnects.
            </ErrorState>
          ) : (
            <ErrorState pattern="R" title="Post rejected" detail={`${postError.code} · HTTP ${postError.status}`}>
              {postError.message}. Fix the input and retry — nothing was broadcast.
            </ErrorState>
          )
        ) : null}
      </div>

      {/* History */}
      <div style={{ ...panel, padding: 14 }}>
        <div style={{ ...eyebrow, marginBottom: 8 }}>History</div>
        {ctx.status === 'loading' ? (
          <Skeleton variant="table" rows={3} />
        ) : ctx.broadcasts.length === 0 ? (
          <EmptyState glyph="📣" title="No broadcasts yet">
            When you post an advisory to the fleet it lands here with its state (active / expired / revoked). Compose one above.
          </EmptyState>
        ) : (
          <DataTable columns={cols} rows={ctx.broadcasts} rowKey="broadcast_id" reflow={false} />
        )}
      </div>
    </div>
  );
}

export default Broadcast;
