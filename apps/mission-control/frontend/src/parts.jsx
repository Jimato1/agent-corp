// MC app-specific components — each COMPOSES shared Helm design-system chips and never redraws a
// shared entity (DESIGN_SYSTEM §4/§8.3). Ported from the Helm mission-control ui_kit (mc-parts.jsx)
// to ESM and wired for live data.
import H from '/src/helm.js';

const { StatusPill, FreshnessStamp, PrincipalRef, TicketRef, FenceState, Button } = H;

export const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
export const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
export const panelStyle = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

// ⟳ age · source: X — honest freshness stamp. When stale, degrades to gold (never a false green).
export function SourceStamp({ source, age, stale, staleLabel }) {
  if (stale) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <FreshnessStamp state="halt" reading={staleLabel || 'STALE-UNKNOWN'} age={age} />
      <span style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)', opacity: 0.6 }}>source: {source}</span>
    </span>;
  }
  return <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--state-green)', boxShadow: '0 0 0 2px rgba(70,185,138,0.18)' }} /> {age}</span>
    <span style={{ opacity: 0.8 }}>· source: {source}</span>
  </span>;
}

// Kill-level pill: ● G0 NORMAL (neutral, NO gold) / ▮▮ G1 / ▮▮▮▮ G2 (gold).
export function KillLevelPill({ level = 'G0', size }) {
  if (level === 'G1') return <StatusPill tone="halt" glyph="▮▮" size={size}>G1 Freeze-destructive</StatusPill>;
  if (level === 'G2') return <StatusPill tone="halt" glyph="▮▮▮▮" size={size}>G2 Quiesce-all</StatusPill>;
  if (level === 'UNKNOWN') return <StatusPill tone="halt" glyph="⚠" size={size}>STALE-UNKNOWN</StatusPill>;
  return <StatusPill tone="neutral" glyph="●" size={size}>G0 Normal</StatusPill>;
}

export function Panel({ title, stamp, children, deepLabel, onDeep, pad = 16, style }) {
  return (
    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', ...style }}>
      {(title || stamp) ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <span style={eyebrow}>{title}</span>
          {stamp}
        </div>
      ) : null}
      <div style={{ padding: pad, flex: 1 }}>{children}</div>
      {deepLabel ? (
        <div style={{ borderTop: '1px solid var(--border-default)', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button tone="ghost" size="compact" onClick={onDeep}>{deepLabel} →</Button>
        </div>
      ) : null}
    </div>
  );
}

// Liveness — NEVER a bare green dot: phi + ♥ age (Freshness) + a StatePill.
const LIVE_MAP = {
  live: { tone: 'verified', glyph: '●', label: 'LIVE' },
  suspect: { tone: 'attention', glyph: '▲', label: 'SUSPECT' },
  wedged: { tone: 'attention', glyph: '▲', label: 'WEDGED' },
  draining: { tone: 'draining', glyph: '⇉', label: 'DRAINING' },
  drained: { tone: 'neutral', glyph: '◼', label: 'DRAINED' },
  quiesced: { tone: 'halt', glyph: '⛊', label: 'QUIESCED-BY-OUTAGE' },
};
export function Liveness({ agent, stale }) {
  const m = LIVE_MAP[agent.liveness] || LIVE_MAP.live;
  if (stale) return <FreshnessStamp state="halt" reading="STALE-UNKNOWN" />;
  const hb = agent.hb_age != null ? `${agent.hb_age}s` : null;
  const suspectHue = agent.liveness === 'suspect' || agent.liveness === 'wedged';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <StatusPill tone={m.tone} glyph={m.glyph} size="sm">{m.label}</StatusPill>
      {agent.phi != null ? <span style={{ ...mono, fontSize: 12, color: suspectHue ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>φ{agent.phi}</span> : null}
      {hb ? <span style={{ ...mono, fontSize: 12, color: suspectHue ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>♥{hb}</span>
        : (agent.liveness === 'drained' ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>(reported)</span> : null)}
    </span>
  );
}

// AttentionBand — server-flagged agents pinned above the roster, worst-first.
export function AttentionBand({ agents, onOpen }) {
  const flagged = agents.filter((a) => a.flags && a.flags.length);
  if (!flagged.length) return null;
  return (
    <div style={{ background: 'var(--state-amber-wash)', border: '1px solid #5A4A1E', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #5A4A1E', ...eyebrow, color: 'var(--state-amber-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true">⚑</span> Attention · server-flagged · pinned
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {flagged.map((a) => {
          const f = a.flags[0];
          return (
            <div key={a.sub} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', flexWrap: 'wrap' }}>
              <StatusPill tone="attention" glyph="⚠" size="sm">{f.type}</StatusPill>
              <PrincipalRef kind="agent" id={a.sub} href="#" onClick={onOpen ? (e) => { e.preventDefault(); onOpen(a); } : undefined} />
              {a.step_seq != null ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>step {a.step_seq}</span> : null}
              {a.claimed_ticket_id ? <TicketRef id={a.claimed_ticket_id} href="#" /> : null}
              {f.fence && f.fence.state === 'superseded'
                ? <FenceState gen={f.fence.gen} supersededBy={f.fence.supBy} state="superseded" />
                : <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)' }}>{f.detail}</span>}
              {f.presizing ? <span style={{ ...mono, fontSize: 10, color: 'var(--state-amber-ink)', opacity: 0.75, border: '1px solid #5A4A1E', borderRadius: 999, padding: '0 6px' }}>PRE-SIZING · not wedged-classified</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// FleetAnomalyBanner — correlated-loss gold banner; hides the flood, not the fact.
export function FleetAnomalyBanner({ suppressed = 0 }) {
  return (
    <div style={{ background: 'var(--halt-gold-wash)', border: '1px solid var(--halt-gold)', borderRadius: 'var(--radius-panel)', padding: '14px 18px', boxShadow: 'var(--shadow-halt)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20, color: 'var(--halt-gold)' }} aria-hidden="true">⛊</span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>FLEET LIVENESS ANOMALY — correlated loss in progress</span>
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '19px', color: 'var(--halt-gold-ink)', opacity: 0.9, margin: '6px 0 0 30px' }}>
        Per-agent death display is suppressed for <b>{suppressed}</b> agents to hide the flood — <b>not</b> the fact. Confirm against three independent cross-checks before concluding a mass death:
      </div>
      <ul style={{ margin: '6px 0 0 30px', padding: 0, listStyle: 'none', display: 'flex', gap: 18, flexWrap: 'wrap', ...mono, fontSize: 11, color: 'var(--halt-gold-ink)', opacity: 0.85 }}>
        <li>· dead-man frame</li><li>· auth health</li><li>· edge health</li>
      </ul>
    </div>
  );
}

// SpawnTree — Board ticket lineage (never heartbeats).
export function SpawnTree({ nodes, depth, cap }) {
  if (!nodes || !nodes.length) return <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No lineage from Board.</span>;
  return (
    <div style={{ ...mono, fontSize: 12, lineHeight: '22px', color: 'var(--text-secondary)' }}>
      {nodes.map((n, i) => (
        <div key={i} style={{ paddingLeft: (n.indent || 0) * 16, color: n.here ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {(n.indent || 0) > 0 ? <span style={{ color: 'var(--text-disabled)' }}>└ </span> : null}
          <TicketRef id={n.id} href="#" /> <span style={{ color: 'var(--text-muted)' }}>{n.label}</span>
          {n.here ? <span style={{ color: 'var(--signal-cyan)' }}> ← here</span> : null}
        </div>
      ))}
      {depth != null ? <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>depth {depth} / cap {cap}</div> : null}
    </div>
  );
}

// BudgetMeter — one of the four dimensions (rate/concurrency/cooldown/lifetime). NEVER dollars.
export function BudgetMeter({ label, pct, value, trip, width = 96 }) {
  const col = trip ? 'var(--state-amber)' : 'var(--signal-cyan)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: width }}>
      {label ? <span style={{ ...eyebrow, fontSize: 10 }}>{label}</span> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--surface-inset)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: Math.max(0, Math.min(100, pct)) + '%', height: '100%', background: col }} />
        </div>
        <span style={{ ...mono, fontSize: 11, color: trip ? 'var(--state-amber-ink)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{value}{trip ? ' ▲' : ''}</span>
      </div>
    </div>
  );
}

// EdgeTile — one PromQL-result tile with a source/as-of stamp (false-green rule is the point).
export function EdgeTile({ name, tile }) {
  const stale = tile.stale;
  return (
    <div style={{ ...panelStyle, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
        <SourceStamp source={tile.source} age={`${tile.as_of_seconds}s`} stale={stale} staleLabel="CANNOT CONFIRM" />
      </div>
      {stale ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--halt-gold-ink)' }}>Cannot confirm edge health — {tile.error || 'sidecar unreachable'}.</div>
      ) : (
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
          {(tile.result && tile.result.length) ? `${tile.result.length} series` : 'no series yet'}
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)', marginTop: 4, wordBreak: 'break-all' }}>{tile.promql}</div>
        </div>
      )}
    </div>
  );
}

// HaltNotConfirmed — full-viewport fail-loud takeover (gold, NOT red).
export function HaltNotConfirmed({ onDismiss, url }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'var(--halt-gold-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 620, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <span style={{ fontSize: 48, color: 'var(--halt-gold)' }} aria-hidden="true">⛊</span>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 34, lineHeight: '40px', fontWeight: 700, letterSpacing: '0.01em', color: 'var(--halt-gold-ink)' }}>HALT NOT CONFIRMED</div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '24px', color: 'var(--halt-gold-ink)', margin: 0, opacity: 0.92 }}>
          The kill-switch call to auth did not return a confirmation. The canonical outage-surviving control is <b>auth's console</b>; Mission Control's button is trustworthy only while auth is healthy.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={url || '#'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px', borderRadius: 'var(--radius-control)', background: 'var(--halt-gold)', color: '#2E1D0B', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Open auth's safe-stopped console →</a>
          <button onClick={onDismiss} style={{ height: 40, padding: '0 16px', borderRadius: 'var(--radius-control)', background: 'transparent', border: '1px solid var(--halt-gold-edge)', color: 'var(--halt-gold-ink)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
