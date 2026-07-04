/* Helm — Notes · data model
   The Confluence-style external memory: a markdown corpus with own/effective
   taint, wikilink graph, deliberation records, git-trailer audit, and a
   read-only mirror of MC review gates. Exposed as window.NT_DATA. */
(function () {
  const NOTES = [
    { id: 'N-01J1QZ', title: 'Canary batch findings', type: 'research', taintOwn: 'single', taintEffective: 'untrusted', via: [{ title: 'Wazuh dump', taint: 'untrusted' }], ticket: 'T-000123', ticketStatus: 'needs_review', updated: '2m', authors: [{ kind: 'agent', sub: 'agent:recon-03' }, { kind: 'operator', sub: 'operator:ada' }], fence: { gen: 47, lease: '04:12', hb: '0.8s', state: 'held' }, snippet: '…canary must share the package set…',
      body: [ ['Objective', 'Establish a safe canary order for the fleet patch so a bad package set fails on one host, not all six.'], ['What I did', 'Pulled posture from Wazuh; clustered hosts by installed package set. See [[canary package overlap]] and [[fleet posture]].'], ['Findings', 'web-03 shares the exact package set with web-01/02, so it is a valid canary. The alert fields came from an untrusted host feed ([[Wazuh dump]]).'], ['Open questions', 'Is the 02:00–04:00 window still correct for db-adjacent hosts?'], ['Next step', 'Hand the ordering to the plan slice for T-000123.'] ] },
    { id: 'N-01J2AA', title: 'Fleet patch plan slice 3', type: 'plan', taintOwn: 'untrusted', taintEffective: 'untrusted', via: [], ticket: 'T-000450', ticketStatus: 'needs_review', updated: '14m', authors: [{ kind: 'agent', sub: 'agent:sre-01' }], fence: { gen: 52, lease: '01:03', hb: '0.7s', state: 'held' }, snippet: '…rolling patch, canary web-03 first…',
      body: [ ['Objective', 'Apply CVE-2026-1234 patch to the web fleet, rolling, canary first.'], ['Plan', 'Patch web-03 (canary), verify Wazuh clears, then web-01/02. Rollback: snapshot restore.'], ['Blast radius', '3 hosts, tier-2, in-window 02:00–04:00.'] ] },
    { id: 'N-01J2BB', title: 'NAS reboot huddle', type: 'deliberation', taintOwn: 'verified', taintEffective: 'untrusted', via: [{ title: 'Wazuh dump', taint: 'untrusted' }], ticket: 'T-000450', ticketStatus: 'planning', updated: '1h', authors: [{ kind: 'agent', sub: 'agent:recon-03' }, { kind: 'agent', sub: 'agent:sre-01' }, { kind: 'agent', sub: 'agent:redteam-02' }], snippet: '…NAS must drain before reboot…',
      thread: {
        participants: ['agent:recon-03', 'agent:sre-01', 'agent:redteam-02'],
        phases: [
          { key: 'triage', label: 'triage', note: 'Scrum-Master turn', open: false, turns: [] },
          { key: 'recon', label: 'recon', open: false, grounded: [{ title: 'fleet posture', taint: 'single' }, { title: 'Wazuh dump', taint: 'untrusted' }], turns: [] },
          { key: 'planning', label: 'planning', open: true, independent: true, turns: [
            { role: 'SRE', at: '14:03Z', sub: 'agent:sre-01', body: 'Drain NAS clients, reboot in the maintenance window, verify mounts on return.' },
            { role: 'Security', at: '14:05Z', sub: 'agent:sec-04', body: 'Confirm no in-flight secret rotation depends on the NAS before reboot.' },
          ] },
          { key: 'adversarial_review', label: 'adversarial_review', open: true, required: true, turns: [
            { role: 'Adversarial', at: '14:09Z', sub: 'agent:redteam-02', body: 'Premise attack: the drain assumes all clients honor the unmount signal — cite [[fleet posture]]; two hosts run a legacy agent that ignores it.', isolated: false },
          ] },
          { key: 'backlog', label: 'backlog', open: false, children: ['T-000451', 'T-000452'], turns: [] },
          { key: 'execute', label: 'execute', open: false, turns: [] },
          { key: 'retro', label: 'retro', open: false, turns: [] },
        ],
      } },
    { id: 'N-01J2CC', title: 'canary package overlap', type: 'research', taintOwn: 'single', taintEffective: 'single', via: [], ticket: null, updated: '3h', authors: [{ kind: 'agent', sub: 'agent:recon-03' }], snippet: '…web-01/02/03 share nginx+openssl…', body: [ ['Overlap', 'web-01/02/03 share nginx + openssl at identical versions.'] ] },
    { id: 'N-01J2DD', title: 'Wazuh dump', type: 'research', taintOwn: 'untrusted', taintEffective: 'untrusted', via: [], ticket: null, updated: '4h', authors: [{ kind: 'service', sub: 'svc:webhook-in' }], snippet: '…host-originated alert fields…', body: [ ['Raw', 'Host-originated Wazuh alert fields. Adversarial input — do not let this drive an auto-approval.'] ] },
    { id: 'N-01J2EE', title: 'fleet posture', type: 'research', taintOwn: 'single', taintEffective: 'single', via: [], ticket: null, updated: '5h', authors: [{ kind: 'agent', sub: 'agent:recon-03' }], snippet: '…20 hosts, 3 flagged…', body: [ ['Posture', '20 hosts; two run a legacy agent that ignores unmount signals.'] ] },
  ];
  const byId = {}; NOTES.forEach((n) => { byId[n.id] = n; });

  const REVIEW = [
    { note: 'Fleet patch plan slice 3', id: 'N-01J2AA', ticket: 'T-000450', state: 'needs_review', reason: 'needs_review', author: 'agent:sre-01' },
    { note: 'Canary batch findings', id: 'N-01J1QZ', ticket: 'T-000123', state: 'escalated', reason: 'board_escalation', author: 'agent:recon-03' },
    { note: 'NAS reboot huddle', id: 'N-01J2BB', ticket: 'T-000451', state: 'awaiting_approval', reason: 'awaiting_approval', author: 'agent:sre-01' },
  ];

  const AUDIT = [
    { ts: '2026-07-02T14:03Z', who: 'agent:recon-03', kind: 'agent', action: 'append_note', target: '§Findings', outcome: 'ok', sha: '3af9c1' },
    { ts: '2026-07-02T14:00Z', who: 'operator:ada', kind: 'operator', action: 'update_note', target: 'whole note', outcome: 'ok', sha: 'b1c79f' },
    { ts: '2026-07-02T13:41Z', who: 'agent:recon-03', kind: 'agent', action: 'create_note', target: 'genesis', outcome: 'ok', sha: '77de20' },
  ];

  const GRAPH = {
    focus: 'N-01J1QZ',
    nodes: [
      { id: 'N-01J2EE', title: 'fleet posture', taint: 'single', x: 46, y: 12 },
      { id: 'N-01J1QZ', title: 'Canary batch findings', taint: 'untrusted', x: 40, y: 46, focus: true },
      { id: 'N-01J2CC', title: 'canary overlap', taint: 'single', x: 14, y: 80 },
      { id: 'N-01J2DD', title: 'Wazuh dump', taint: 'untrusted', x: 70, y: 80 },
    ],
    edges: [['N-01J2EE', 'N-01J1QZ'], ['N-01J1QZ', 'N-01J2CC'], ['N-01J1QZ', 'N-01J2DD']],
    backlinks: [
      { note: 'NAS reboot huddle', id: 'N-01J2BB', type: 'deliberation', taint: 'untrusted' },
      { note: 'Fleet patch plan slice 3', id: 'N-01J2AA', type: 'plan', taint: 'single' },
    ],
  };

  window.NT_DATA = { NOTES, byId, REVIEW, AUDIT, GRAPH };
})();
