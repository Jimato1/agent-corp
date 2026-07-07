import { useState } from 'react';
import { Input, PrintedAbsence } from '../components/ds';
import { WeakeningCeremony } from '../components/PolicyCeremony';
import { mono, panel } from '../components/cmparts';
import { Screen } from './common';
import { breakGlass } from '../lib/api';
import { FIXTURE_PROPOSE } from '../lib/fixtures';

/* 5.10 Break-glass console — distinct, LOUD. Operator-only emergency window
   minting: the §5.3 ceremony with a distinct, LOUDER confirmation (a freeze-
   specific re-type) and its own danger-tinted context. Mints ONLY a one-shot
   bounded window (hard cap ≤ 4h, auto-expiring) or a time-boxed tier exception.
   NEVER touches the destructive-never-auto floor. On arm: auto-files a
   break_glass_posthoc review → Board (CMDB files, never clears). */
export function BreakGlass() {
  const [host, setHost] = useState('db-02');
  const [minutes, setMinutes] = useState('90');

  return (
    <Screen width={900}>
      <div style={{ background: 'var(--danger-bg)', border: '1px solid #5A2420', borderRadius: 'var(--radius-panel)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, color: 'var(--danger-red)' }}>⚠</span>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--danger-text)' }}>Break-glass — emergency maintenance window</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--danger-text)', opacity: 0.85 }}>
            Mints ONLY a one-shot bounded window (hard cap ≤ 4h, auto-expiring) or a time-boxed tier exception (same cap).
            NEVER touches the destructive-never-auto floor.
          </div>
        </div>
      </div>

      <PrintedAbsence glyph="🔒" tag="never touched">
        <strong>The destructive-never-auto floor is never touched by break-glass.</strong> Break-glass can override an active
        freeze (allow &lt; freeze &lt; break-glass lattice) but cannot make a destructive class auto.
      </PrintedAbsence>

      <div style={{ ...panel, padding: 16, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <Input label="host_id" mono value={host} onChange={(e) => setHost(e.target.value)} style={{ width: 160 }} />
        <Input label="window (minutes, ≤240)" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 180 }} />
        <span style={{ flex: 1 }} />
        <WeakeningCeremony
          triggerLabel="Break glass"
          triggerGlyph="⚠"
          eyebrow="Break-glass · override freeze"
          title={`BREAK-GLASS · ${host} · emergency allow window ${minutes}m`}
          // Break-glass hits its own endpoint; it returns the propose-result shape.
          // The required typed-intent is the server-returned expected_intent
          // (e.g. "OVERRIDE FREEZE <host>" / "BREAK GLASS <host>").
          proposeCall={() => breakGlass({ host_id: host, minutes: Number(minutes), overrides_freeze: true, tzid: 'Etc/UTC' })}
          consequence={`This OVERRIDES an active freeze (allow < freeze < break-glass lattice). ${host} becomes cleanly-in-window for ${minutes}m; its classes clear to their mode. The window is hard-capped ≤ 4h and auto-expires.`}
          fixturePropose={{
            ...FIXTURE_PROPOSE,
            expected_intent: `OVERRIDE FREEZE ${host}`,
            edit_kind: 'break_glass',
            typed_diff: { target_kind: 'host', key: host, action: 'upsert', before: { break_glass: null }, after: { break_glass: `${minutes}m` }, reasons: ['break_glass window minted'] },
            blast_radius: { cells_made_auto: [], hosts_gain_coverage: 1, full_shadow_warnings: ['overrides active freeze for the window duration only'] },
          }}
          confirmLabel="Break glass"
          auditNote="On arm: auto-files break_glass_posthoc review → Board (ReviewChip); distinct edit_kind:break_glass chain row. A persistent BREAK-GLASS banner rides the console until the window expires."
        />
      </div>
      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
        A distinct, louder re-type ("OVERRIDE FREEZE {host}") is required when the lattice needs a freeze override. If the
        change-control path cannot fail-closed-verify, break-glass refuses in halt-gold ("cannot arm safely"), never a partial arm.
      </div>
    </Screen>
  );
}
