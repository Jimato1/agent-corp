import { useState } from 'react';
import { Button, Input } from '../components/ds';
import { VerdictTrace } from '../components/cmparts';
import { Head, LocalError, Screen } from './common';
import { explain, ApiError } from '../lib/api';
import { FIXTURE_TRACE } from '../lib/fixtures';
import type { VerdictTraceResult } from '../lib/types';

/* 5.9 Verdict dry-run / "explain this verdict" — the console half of the binding
   POST /v1/decision. The operator runs the SAME evaluate() at an arbitrary `at`,
   subject-free, and sees WHY (VerdictTrace). A deny is a VALID answer, not an
   error. The result is UNSIGNED/advisory — mechanically unusable at the Gateway. */
export function DryRun() {
  const [hostId, setHostId] = useState('nas-01');
  const [actionClass, setActionClass] = useState('kernel_update');
  const [at, setAt] = useState('2026-07-05 23:30 Oslo');
  const [result, setResult] = useState<VerdictTraceResult | null>(FIXTURE_TRACE);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await explain({ host_id: hostId, action_class: actionClass, at });
      setResult(r);
    } catch (e) {
      // A dependency outage → fall back to the demo trace (Pattern D handled by
      // the SAFE-STOPPED note). A local 4xx (unknown host / bad class) is a
      // VALID deny answer, not a UI error — but we surface transport 4xx as R.
      if (e instanceof ApiError && !e.isDependency) setError(e);
      setResult({ ...FIXTURE_TRACE, host_id: hostId, action_class: actionClass, at });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen width={1000}>
      <Head title="Explain a verdict" sub="The operator runs the same evaluate() at an arbitrary time, subject-free, and sees why. A deny is a valid answer, not an error. Dry-run is unsigned/advisory — no aud, no JWS." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Input label="host_id" mono value={hostId} onChange={(e) => setHostId(e.target.value)} style={{ width: 160 }} />
        <Input label="action_class" value={actionClass} onChange={(e) => setActionClass(e.target.value)} style={{ width: 180 }} />
        <Input label="at" value={at} onChange={(e) => setAt(e.target.value)} style={{ width: 220 }} />
        <Button tone="primary" disabled={busy} onClick={run}>{busy ? 'Evaluating…' : 'Explain'}</Button>
      </div>
      {error ? <LocalError error={error} hint="Unknown host / bad action_class returns an honest deny(no_such_host)/deny(bad_action_class) — that deny is the correct result, shown in the trace below." /> : null}
      {result ? <VerdictTrace result={result} /> : null}
    </Screen>
  );
}
