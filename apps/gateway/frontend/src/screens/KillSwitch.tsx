import type { CSSProperties } from 'react';
import { FreshnessStamp, HaltBand, HonestState, PrintedAbsence, TicketRef } from '../components/ds';
import { Section, eyebrow, mono, panel } from '../components/gwparts';
import { Head, Screen } from './common';
import { useGateway } from '../state/GatewayProvider';

/* S4 — Kill-switch status (UI_SPEC §7). The Gateway IS the L2 physical stop and
   its own confirmation is the SOLE legitimate L2-CONFIRMED source, read directly
   by auth. This screen renders that truth READ-ONLY. The trigger button is NOT
   here (§5.3/§7.3) — it lives in MC/auth; this screen deep-links to it. */
export function KillSwitch() {
  const { posture } = useGateway();
  const level = posture.kill_level;
  const engaged = level !== 'G0';
  const authStale = posture.auth_epoch_stale;
  const ownStale = posture.own_stale; // can't confirm own halt liveness → safe-stop

  return (
    <Screen>
      <Head
        crumb="kill-switch · L2 physical stop"
        title="Kill-switch status"
        sub="The Gateway is the L2 physical stop; its signed halt-status is the sole L2-CONFIRMED source auth reads directly. Read-only here — the trigger lives in Mission Control / auth."
      />

      {/* Own-liveness lost → the Gateway can't confirm its own halt state → it
          fails closed to SAFE-STOPPED (Pattern D). */}
      {ownStale ? (
        <HaltBand
          mode="safe-stop"
          readOnly
          showTriad={false}
          reviewHref="#/mc/agents"
          reviewLabel="Halt console (MC)"
          message="Cannot confirm this Gateway's own halt-state freshness — treating as safe-stopped. This is the safety system working; the L2 figure below is the last-known signed truth."
        />
      ) : engaged ? (
        <HaltBand
          mode="kill"
          level={level === 'G2' ? 'G2' : 'G1'}
          readOnly
          confirmed={posture.confirmed}
          pending={posture.pending}
          draining={posture.draining}
          drainingDetail={posture.draining_detail}
          reviewHref="#/mc/agents"
          reviewLabel="Halt console (MC)"
          message={level === 'G2'
            ? 'Full quiesce — the Gateway refuses ALL dispatch + redemptions; in-flight runs cancel at the next safe task boundary.'
            : 'Gateway refuses all new dispatch + new Vault redemptions. In-flight runs cancel at the next safe task boundary (never mid-dpkg).'}
        />
      ) : null}

      {/* L2 CONFIRMATION — this Gateway's OWN truth, not a mirror. Stays
          authoritative even when the auth mirror is stale. */}
      <Section title={<>L2 confirmation (this Gateway — the source auth reads directly)</>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, ...mono, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span><span style={{ ...eyebrow }}>epoch_seen</span> {posture.epoch_seen}</span>
          <span><span style={{ ...eyebrow }}>level</span> {level}</span>
          <span><span style={{ ...eyebrow }}>in_flight_runs</span> {posture.in_flight_runs}</span>
          <span><span style={{ ...eyebrow }}>last refuse</span> {posture.last_refuse ?? '—'}</span>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          signed halt-status ✔ · <span style={{ color: ownStale ? 'var(--halt-gold-ink)' : 'var(--text-secondary)' }}>⟳ own truth, not a mirror{ownStale ? ' (freshness UNCONFIRMED → safe-stopped)' : ''}</span>
        </div>
      </Section>

      {/* AUTH L1 EPOCH — a mirror; stale → gold, never a fabricated "in sync". */}
      <div style={{ ...panel, padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ ...eyebrow }}>auth L1 epoch (mirror)</span>
        <span style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)' }}>epoch {posture.auth_epoch}</span>
        {authStale
          ? <FreshnessStamp state="stale" reading="▲ STALE → treating as safe-stopped" />
          : <FreshnessStamp age={posture.auth_epoch_age ?? '0.3s'} />}
        {!authStale ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>· in sync</span> : null}
      </div>

      {/* HALTED-RUN AFTERMATH — all three slots ALWAYS shown, even at zero
          (copy-discipline: never "all stopped" while pending/draining > 0). At G0
          the ✔ 0 · ◐ 0 · ⇉ 0 reads as a POSITIVE statement of confirmed silence. */}
      <Section title="Halted-run aftermath (HonestState §4.8)">
        <HonestState
          confirmed={posture.confirmed}
          pending={posture.pending}
          draining={posture.draining}
          drainingDetail={posture.draining_detail}
          summary
        />
        {posture.draining > 0 && posture.draining_detail ? (
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>draining → {posture.draining_detail}</div>
        ) : null}
      </Section>

      {/* Two deep-link footers. DangerAction is ABSENT by construction here — the
          Gateway hosts no lift/trigger; that is a printed fact, not a greyed control. */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="#/mc/agents" style={footerLink}>Halt console (MC) →</a>
        <a href="#/auth/safe-stopped" style={footerLink}>auth safe_stopped console →</a>
      </div>

      <PrintedAbsence glyph="🔒" tag="by construction" why="The kill actuator lives in Mission Control / auth (§7.3); this app can only SEE posture and deep-link out.">
        <strong>No kill trigger lives here.</strong> This screen renders the L2-CONFIRMED truth read-only — there is no engage
        button in the Gateway by construction.
      </PrintedAbsence>
      {engaged ? (
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
          run in drain: {posture.draining_detail ? <TicketRef id={posture.draining_detail.split(' ')[0]} truncate /> : '—'}
        </div>
      ) : null}
    </Screen>
  );
}

const footerLink: CSSProperties = {
  fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--signal-cyan)',
  textDecoration: 'none', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 12px',
};
