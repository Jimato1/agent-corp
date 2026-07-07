import { Button, FreshnessStamp, PrintedAbsence, TicketRef, TierBadge } from '../components/ds';
import { CriticalityTier, WindowScheduleEditor, eyebrow, mono, panel } from '../components/cmparts';
import { WeakeningCeremony } from '../components/PolicyCeremony';
import { Screen, TableSkeleton } from './common';
import { getHost, getHostFacts } from '../lib/api';
import { FIXTURE_FACTS, FIXTURE_HOSTS, FIXTURE_PROPOSE } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { HostRecord } from '../lib/types';
import type { Nav } from './nav';

/* Build the FULL host-policy frontmatter object the ceremony sends as
   {target_kind:'host', action:'upsert', frontmatter}. `propose` needs the whole
   new policy file, not a partial patch — `patch` overlays the changed field(s). */
function hostFrontmatter(h: HostRecord, patch: Record<string, unknown>): Record<string, unknown> {
  return {
    host_id: h.host_id,
    class: h.class,
    tier: h.policy.criticality ?? h.criticality,
    overrides: h.policy.overrides ?? [],
    snapshot_capability: h.policy.snapshot_capability ?? null,
    on_window_close: h.policy.on_window_close ?? null,
    windows: h.policy.windows ?? [],
    wazuh: { agent_id: h.wazuh_agent_id ?? null },
    ...patch,
  };
}

/* 5.2 Host detail / policy editor — the ONLY policy writer in the suite.
   Left: identity + live-evaluated posture (same evaluate() as Gateway/MCP).
   Right: the editable policy. ALL writes route through the §5.3 ceremony. */
export function Host({ hostId, nav }: { hostId: string; nav: Nav }) {
  const fallbackHost = FIXTURE_HOSTS[hostId] ?? FIXTURE_HOSTS['nas-01'];
  const rec = useResource(() => getHost(hostId), fallbackHost, [hostId]);
  const facts = useResource(() => getHostFacts(hostId), FIXTURE_FACTS[hostId] ?? FIXTURE_FACTS['nas-01'], [hostId]);

  const h = rec.data;

  if (rec.status === 'loading' || !h) {
    return (
      <Screen width={1000}>
        <BackLink nav={nav} />
        <TableSkeleton rows={3} />
      </Screen>
    );
  }

  const p = h.posture;

  return (
    <Screen width={1000}>
      <BackLink nav={nav} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <TicketRef id={h.host_id} />
        <CriticalityTier tier={h.criticality} />
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{h.class} · ● {h.lifecycle}</span>
        <span style={{ flex: 1 }} />
        <Button tone="secondary" size="compact" onClick={() => nav.goto('dryrun')}>Dry-run this host →</Button>
      </div>

      {/* ── Evaluated now (live, same code path as Gateway & MCP) ─────────── */}
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 8 }}>
          Evaluated now · same code path as Gateway &amp; MCP <FreshnessStamp age="as-of 0.2s" />
        </div>
        {p.unavailable ? (
          <div style={{ ...mono, fontSize: 12, color: 'var(--halt-gold-ink)', background: 'var(--halt-gold-wash)', border: '1px solid var(--halt-gold-edge)', borderRadius: 6, padding: '8px 10px' }}>
            ⚠ CANNOT CONFIRM — policy snapshot unavailable; treated as <b>deny</b>. This is fail-closed, not an error.
          </div>
        ) : (
          <>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              window: <span style={{ color: 'var(--text-muted)' }}>{p.window_detail ?? p.window_state}</span>
              {p.next_open ? <span style={{ color: 'var(--text-muted)' }}> · next opens {p.next_open}</span> : null}
            </div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              mode by action_class: {p.modes.map((m, i) => (
                <span key={i}>{i > 0 ? ' · ' : ''}{m.action_class} {m.mode}{m.floor ? '(floor)' : ''}</span>
              ))}
            </div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              reason if queried now: [ {p.reason ?? '—'} ] · policy_version {p.policy_version}{' '}
              {p.is_head ? <span style={{ color: 'var(--state-green)' }}>(= HEAD ✔)</span> : <span style={{ color: 'var(--halt-gold-ink)' }}>▲ policy_version behind HEAD</span>}
            </div>
          </>
        )}
      </div>

      {/* ── FACTS (rebuildable mirror — NOT policy) ──────────────────────── */}
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={eyebrow}>Facts · rebuildable mirror, NOT policy · taint is display-of-truth (no control clears it)</div>
        {(facts.data ?? []).map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)', width: 160 }}>{f.key}</span>
            <span style={{ color: 'var(--text-secondary)', width: 120 }}>{f.value}</span>
            {f.provenance === 'host_originated' ? (
              <TierBadge tier="untrusted" label="host-originated · UNTRUSTED" />
            ) : f.provenance === 'operator' ? (
              <TierBadge tier="verified" label="operator" />
            ) : (
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>POLICY — see below</span>
            )}
          </div>
        ))}
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
          bound_by ◐ {h.bound_by ?? '—'} · bound_at {h.bound_at ?? '—'} · wazuh.agent_id {h.wazuh_agent_id ?? '—'}
        </div>
      </div>

      {/* ── POLICY (canonical YAML — editing any cell opens the ceremony) ── */}
      <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={eyebrow}>Policy · canonical markdown/YAML — editing any cell opens the change-control ceremony</div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>criticality tier: <b style={{ color: 'var(--text-primary)' }}>{h.policy.criticality}</b> · overrides (per action_class auto|ask): [ edit matrix → ceremony ]</div>
          <div>
            snapshot_capability: <b style={{ color: 'var(--text-primary)' }}>{h.policy.snapshot_capability ?? 'none'}</b>{' '}
            <span style={{ color: 'var(--state-amber-ink)' }}>⚠ moving away from 'none' is a GATE-WEAKENING edit</span>
          </div>
          <div>on_window_close: <b style={{ color: 'var(--text-primary)' }}>{h.policy.on_window_close ?? 'abort_and_rollback'}</b></div>
        </div>
        <WindowScheduleEditor windows={h.policy.windows ?? []} onEdit={() => { /* opens ceremony via Propose below */ }} />

        {/* Constitutional absence — §4.7 printed fact, never a greyed toggle. */}
        <PrintedAbsence glyph="🔒" tag="policy veto, not trigger">
          <strong>This surface holds no lease, mutex, or approval record.</strong> CMDB is the policy VETO, not the trigger —
          it cannot approve, claim, or execute. Agents cannot write policy by construction (zero mutation verbs on the MCP server).
        </PrintedAbsence>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* The centerpiece trigger — a gate-weakening edit → FULL ceremony.
              A host snapshot-cap edit is a host upsert carrying the full new
              frontmatter (snapshot_capability overlaid to btrfs). */}
          <WeakeningCeremony
            triggerLabel="Propose policy change…"
            title={`WEAKEN POLICY · ${h.host_id} · snapshot_capability: none → btrfs`}
            proposeInput={{
              target_kind: 'host',
              key: h.host_id,
              action: 'upsert',
              frontmatter: hostFrontmatter(h, { snapshot_capability: 'btrfs' }),
            }}
            consequence="'btrfs' gives this host an in-band rollback route, so snapshot-gated classes stop routing to ask-tier/manual. Irreversible in effect until re-tightened."
            fixturePropose={{
              ...FIXTURE_PROPOSE,
              expected_intent: `WEAKEN ${h.host_id}`,
              typed_diff: { target_kind: 'host', key: h.host_id, action: 'upsert', before: { snapshot_capability: h.policy.snapshot_capability ?? 'none' }, after: { snapshot_capability: 'btrfs' }, reasons: ['snapshot_capability moved off none'] },
            }}
          />
          {/* Rebind Wazuh agent — also gate-weakening (UI_SPEC §5.2/§5.3). A host
              upsert that re-asserts the wazuh.agent_id mapping. */}
          <WeakeningCeremony
            triggerLabel="Rebind Wazuh agent…"
            triggerTone="danger-outline"
            title={`REBIND · ${h.host_id} · wazuh.agent_id`}
            proposeInput={{
              target_kind: 'host',
              key: h.host_id,
              action: 'upsert',
              frontmatter: hostFrontmatter(h, { wazuh: { agent_id: h.wazuh_agent_id ?? null } }),
            }}
            consequence="Rebinding attaches a new attacker-influenceable Wazuh identity to this host record — a change-logged, gate-weakening edit."
            fixturePropose={{
              ...FIXTURE_PROPOSE,
              expected_intent: `REBIND ${h.host_id}`,
              typed_diff: { target_kind: 'host', key: h.host_id, action: 'upsert', before: { wazuh: { agent_id: h.wazuh_agent_id ?? null } }, after: { wazuh: { agent_id: '(new)' } }, reasons: ['wazuh.agent_id rebind'] },
              blast_radius: { cells_made_auto: [], hosts_gain_coverage: 0, full_shadow_warnings: ['fact provenance resets to host-originated on rebind'] },
            }}
            confirmLabel="Rebind agent"
          />
        </div>
      </div>
    </Screen>
  );
}

function BackLink({ nav }: { nav: Nav }) {
  return (
    <button onClick={() => nav.goto('fleet')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--signal-cyan)' }}>
      ← Fleet
    </button>
  );
}
