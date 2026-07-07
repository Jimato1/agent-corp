// parts.jsx — the THREE justified Vault-domain-unique components (UI_SPEC §9.2–9.4). None is a
// re-draw of a shared entity: every ID chip, identity, tier, lifecycle pill, halt band, freshness
// stamp and danger affordance INSIDE them is the shared Helm component. ESM port of the reference
// vault ui-kit (vt-parts.jsx), made interactive against the frozen /manage/* surface.
import { H, eyebrow, mono, panel, fmtAge, freshnessState } from './ui.jsx';
const { Input, Button, PrintedAbsence, FreshnessStamp, StatusPill } = H;

// ── §9.4 SecretWriteForm ─────────────────────────────────────────────────────────────────────
// The write-only KV create/import surface: the ONLY place a value is typed (masked, never echoed
// after submit). It deliberately has NO read-back sibling — the printed no-read-back constitutional
// absence (§4.7 destructive-absence rule) sits where a reveal would, as a fact, not a disabled control.
export function SecretWriteForm({ onClose, onSubmit, submitting, error }) {
  const [f, setF] = React.useState({ host_id: '', name: '', value: '', rotation: '90d', recovery: 'provider-console' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  // Pattern R (red) — the operator's own fixable error (duplicate name, invalid host_id, engine
  // write rejected). Field-level hint states what to fix.
  const fieldErr = (field) => (error && error.field === field ? (error.message || error.code) : undefined);
  const submit = () => onSubmit && onSubmit({ host_id: f.host_id.trim(), name: f.name.trim(), value: f.value, rotation: f.rotation.trim(), recovery: f.recovery.trim() });
  const canSubmit = f.host_id.trim() && f.name.trim() && f.value && !submitting;
  return (
    <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={eyebrow}>New KV secret · write-only</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Input label="host_id" mono placeholder="nas-01" value={f.host_id} onChange={set('host_id')} invalid={!!fieldErr('host_id')} hint={fieldErr('host_id')} style={{ width: 160 }} />
        <Input label="name" placeholder="admin-login" value={f.name} onChange={set('name')} invalid={!!fieldErr('name')} hint={fieldErr('name')} style={{ flex: 1, minWidth: 160 }} />
      </div>
      <Input label="Value (masked · never echoed after submit)" type="password" placeholder="••••••••••••" value={f.value} onChange={set('value')} invalid={!!fieldErr('value')} hint={fieldErr('value')} autoComplete="new-password" style={{ width: '100%' }} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Input label="Rotation" value={f.rotation} onChange={set('rotation')} style={{ width: 120 }} />
        <Input label="recovery" value={f.recovery} onChange={set('recovery')} hint="ssh-ca-resettable · provider-console · console-only" style={{ width: 220 }} />
      </div>
      <PrintedAbsence glyph="🔒" tag="no read-back">
        <strong>This surface can write a secret; it can never read one back.</strong> There is no reveal,
        export, or show-plaintext path. Break-glass read is an offline 3-of-5 quorum ceremony, never a web action.
      </PrintedAbsence>
      {error && !error.field
        ? <div style={{ ...mono, fontSize: 12, color: 'var(--danger-text)' }}>✕ {error.message || error.code}</div>
        : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button tone="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button tone="primary" onClick={submit} disabled={!canSubmit}>{submitting ? 'Writing…' : 'Write secret'}</Button>
      </div>
    </div>
  );
}

// ── §9.2 SignRoleStager ──────────────────────────────────────────────────────────────────────
// Stages a *proposed* per-host SSH sign-role (allowed_users / valid_principals pinned, no wildcards)
// that an operator step-up APPLIES via the change-control path. The wrapper never writes ssh/roles
// directly — staging is powerless. A wildcard / root / allow_empty role is PREVENTED from staging by
// a continuous invariant check, surfaced here as a red validation block (Pattern R).
const INVARIANT = (allowed) => {
  const v = (allowed || '').trim();
  if (!v) return 'valid_principals is empty — allow_empty=false is enforced; a role must pin at least one principal.';
  if (/[*?]/.test(v)) return 'wildcard principal detected — no wildcards are permitted in a sign-role.';
  if (/\broot\b/.test(v)) return "principal 'root' is refused — the Gateway signs a scoped service principal, never root.";
  return null;
};
export function SignRoleStager({ host, staged, diffHash, onStage, staging, applyNode }) {
  const [allowed, setAllowed] = React.useState(staged?.allowed_users || 'svc-deploy');
  const violation = INVARIANT(allowed);
  return (
    <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={eyebrow}>Stage sign-role · {host || '—'}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Input label="allowed_users / valid_principals (templated)" mono value={allowed} onChange={(e) => setAllowed(e.target.value)} invalid={!!violation} style={{ flex: 1, minWidth: 220 }} />
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', paddingBottom: 8 }}>default_user: (empty — pinned) · no wildcards · allow_empty=false</div>
      </div>
      {violation
        ? <div style={{ ...panel, borderColor: 'var(--danger-red)', background: 'var(--danger-bg)', padding: '8px 12px', ...mono, fontSize: 12, color: 'var(--danger-text)' }}>✕ Invariant violated — staging blocked: {violation}</div>
        : (
          <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', ...mono, fontSize: 12 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Proposed role diff (hash {diffHash || 'sha256:… (stage to compute)'})</div>
            <div style={{ color: 'var(--state-green-ink)' }}>+ ssh/roles/gateway-{host || '<host>'}  allowed_users={allowed}  valid_principals=…</div>
          </div>
        )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button tone="secondary" size="compact" disabled={!!violation || staging || !host} onClick={() => onStage && onStage({ allowed_users: allowed })}>{staging ? 'Staging…' : 'Stage proposal'}</Button>
        {applyNode}
        {staged ? <StatusPill tone="attention" glyph="◐" size="sm">staged</StatusPill> : null}
      </div>
    </div>
  );
}

// ── §9.3 SealChainPanel ──────────────────────────────────────────────────────────────────────
// The crown-jewels register: seal / unsealer / recovery-quorum / audit-sinks / kill / backups. EVERY
// figure renders via FreshnessStamp and obeys the false-green prohibition: a seal state the console
// cannot confirm is halt-gold "CANNOT CONFIRM," never a fabricated green. Audit-sink health is green
// ONLY if BOTH sinks are current (one down → gold + safe-stopped).
function Tile({ title, children }) {
  return <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}><div style={eyebrow}>{title}</div>{children}</div>;
}
export function SealChainPanel({ status = {}, ageMs = 0 }) {
  const s = status;
  // seal-unknown: explicit engine-unreachable / unconfirmed seal, OR a stale poll of a safety signal.
  const stale = freshnessState(ageMs) === 'stale';
  const sealUnknown = s.seal_confirmed === false || s.seal === 'unknown' || s.engine_reachable === false || s.engine_sealed || stale;
  const bothSinks = s.sinks_ok === true || (Array.isArray(s.sinks_status) ? s.sinks_status.every(Boolean) : undefined);
  const sinkGold = bothSinks === false || s.audit_sink_down === true;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
      <Tile title="Engine seal">
        {sealUnknown
          ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>⚠ CANNOT CONFIRM SEAL — engine unreachable (as-of {fmtAge(ageMs)}); treat as UNVERIFIED</div>
          : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>● {s.seal || 'UNSEALED'}</div>}
        <FreshnessStamp age={`engine · ${s.seal_as_of || fmtAge(ageMs)}`} state={sealUnknown ? 'halt' : 'live'} reading={sealUnknown ? 'seal unknown — do not assume sealed OK' : undefined} />
      </Tile>
      <Tile title="Unsealer">
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-primary)' }}>● {s.unsealer || 'healthy'}</div>
        <span style={{ ...mono, fontSize: 11, color: s.seal_token_ttl_attn ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>seal-token TTL {s.seal_token_ttl || '—'} {s.seal_token_ttl_attn ? '▲' : '✔'}</span>
      </Tile>
      <Tile title="Recovery quorum">
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{s.quorum || '3-of-5 shares · escrowed offline'}</span>
        <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>last quorum-test {s.quorum_test || '—'}</span>
      </Tile>
      <Tile title="Audit sinks">
        {sinkGold
          ? <><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>⚠ one sink down — safe-stopped</span><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>redemption halting fail-closed (D-16a)</span></>
          : <><span style={{ ...mono, fontSize: 12, color: 'var(--state-green)' }}>✔✔ {s.sinks || 'local + WORM current'}</span><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>engine-stream xcorr live</span></>}
      </Tile>
      <Tile title="Kill level (from auth)">
        <StatusPill tone={(s.kill && s.kill !== 'G0') ? 'halt' : 'neutral'} glyph={(s.kill && s.kill !== 'G0') ? '▮▮' : '●'} size="sm">{s.kill || 'G0'}</StatusPill>
        <FreshnessStamp age={fmtAge(ageMs)} state={stale ? 'stale' : 'live'} />
      </Tile>
      <Tile title="Backups">
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{s.backup || 'raft snapshot age —'}</span>
        <span style={{ ...mono, fontSize: 11, color: s.snapshot_reachable === false ? 'var(--halt-gold-ink)' : 'var(--state-green)' }}>VAULT_SNAPSHOT_DEST {s.snapshot_reachable === false ? '⚠ unreachable' : 'reachable ✔'}</span>
      </Tile>
    </div>
  );
}
