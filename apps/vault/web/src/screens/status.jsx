// screens/status.jsx — Status / DR (UI_SPEC §8). The crown-jewels readout: seal state, unsealer + seal-
// token TTL, recovery-quorum, audit-sink health + engine-stream xcorr liveness, kill level (from auth),
// backup age + VAULT_SNAPSHOT_DEST reachability, per-host break-glass last-verified, CA fingerprint.
// The SIGNATURE commitment of this screen is the false-green discipline (§8.2): a seal state the console
// cannot confirm renders halt-gold "CANNOT CONFIRM SEAL," NEVER a fabricated green; audit-sink health is
// green only if BOTH sinks are current. There is NO editable control here — DR *actions* are routed
// through Change Control (§9) or the offline quorum runbook. Pattern D (gold) is the dominant non-healthy
// state: engine sealed/unreachable, a sink down, unsealer unreachable, or seal-token expired are all THIS.
import { H, panel, mono, eyebrow, Head, PollStamp, usePoll, classifyError } from '../ui.jsx';
import { vault } from '../api.js';
import { SealChainPanel } from '../parts.jsx';
const { PrintedAbsence, Skeleton } = H;

export function Status({ shell }) {
  const { data, error, loading, ageMs } = usePoll(vault.status);
  const depDown = error && classifyError(error) === 'D';

  // False-green discipline: when the status/engine read fails, we do NOT show a fabricated green — we
  // carry the last-known figures but force seal-unknown so the Engine-seal tile renders gold CANNOT
  // CONFIRM. If we have nothing at all, the panel still renders every tile in its unknown/gold reading.
  const st = depDown ? { ...(data || {}), engine_reachable: false } : (data || {});
  // Reflect the shell's mirrored kill level onto the tile if status didn't carry one.
  if (!st.kill && shell.killed) st.kill = shell.killLevel;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head title="Status / DR — Vault crown jewels"
        sub="The false-green discipline is the point of this screen: seal-unknown → halt-gold CANNOT CONFIRM, never a fabricated green. Audit-sink health is green only if BOTH sinks are current."
        right={<PollStamp ageMs={ageMs} />} />

      {loading && !data
        ? <div style={{ ...panel, padding: 16 }}><Skeleton variant="block" height={220} /></div>
        : <SealChainPanel status={st} ageMs={ageMs} />}

      <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={eyebrow}>CA &amp; break-glass</div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>Suite-internal CA fingerprint {st.ca_fingerprint || st.caFingerprint || '—'} · rotation runbook ▸</div>
        {/* §4.7 destructive-absence: the CA signing key can never leave the barrier — a printed fact. */}
        <PrintedAbsence glyph="⛊" tag="non-exportable"><strong>SSH CA signing key: inside the barrier, non-exportable.</strong> There is no export path — rotation is a Change-Control ceremony, not a read.</PrintedAbsence>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>Per-host break-glass last-verified: {st.break_glass || st.breakGlass || '—'}</div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>DR actions (rotate CA, run a snapshot, seal migration) are gate-weakening / critical ops — routed through <a href="#/change" style={{ color: 'var(--signal-cyan)' }}>Change Control ▸</a> or the offline quorum runbook, never a button here.</div>
      </div>

      {depDown ? <div style={{ ...panel, borderColor: 'var(--halt-gold)', background: 'var(--halt-gold-wash)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ ...eyebrow, color: 'var(--halt-gold-ink)' }}>⛊ SYSTEM SAFE-STOPPED — status/engine unreachable (as-of {ageMs ? Math.round(ageMs / 1000) : '—'}s)</div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-secondary)' }}>STILL TRUE: no plaintext exposed · existing certs valid to TTL · local audit chain intact</div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>DO: this is fail-closed (D-16a), not an outage to panic over — follow the boot / unseal runbook. Seal state is UNVERIFIED, never assumed OK.</div>
      </div> : null}
    </div>
  );
}
