// DeliberationThreadView.jsx — the seven-phase ceremony RECORD (UI_SPEC §4/S3). Notes renders the
// thread the Board's ceremony produces; it is NEVER the state machine (the Board's ceremony_events
// log is the sole phase authority). This is a specialized READ render over the same markdown file.
//
// It parses the live note body into the seven FIXED spec phases (triage → recon → planning →
// adversarial_review → backlog → execute → retro). There is deliberately NO converge/escalate control
// here — phase transitions happen on the Board (printed as a constitutional fact by S3's chrome).
import { H, mono, eyebrow, renderProse } from './common.jsx';

const { useState } = window.React;

// Spec vocabulary, 1:1. The invented set is dead (CORR-3).
export const PHASES = ['triage', 'recon', 'planning', 'adversarial_review', 'backlog', 'execute', 'retro'];

// Parse markdown body → { preamble, phases: [{ key, present, blocks }] }.
// A `## <phase>` heading opens a phase; `### ...` inside a phase starts a turn block; other lines are
// prose. Tolerant: unknown `##` sections are ignored for phase mapping (kept in preamble bucketing).
function parse(body) {
  const lines = String(body || '').split(/\r?\n/);
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, '_');
  const phaseMap = {};
  PHASES.forEach((p) => { phaseMap[p] = { key: p, present: false, lines: [] }; });
  const preamble = [];
  let cur = null;
  for (const raw of lines) {
    const h2 = raw.match(/^##\s+(.+?)\s*$/);
    if (h2 && !raw.startsWith('###')) {
      const key = norm(h2[1]);
      if (phaseMap[key]) { cur = key; phaseMap[key].present = true; continue; }
      cur = null; // a non-phase ## — drop into preamble stream
      preamble.push(raw);
      continue;
    }
    if (cur) phaseMap[cur].lines.push(raw);
    else preamble.push(raw);
  }
  // Split each phase's lines into blocks by `### ` turn headers.
  const blocksOf = (ls) => {
    const blocks = [];
    let b = null;
    for (const l of ls) {
      const h3 = l.match(/^###\s+(.+?)\s*$/);
      if (h3) { b = { header: h3[1], body: [] }; blocks.push(b); continue; }
      if (b) b.body.push(l);
      else { if (!blocks._pre) blocks._pre = []; blocks._pre.push(l); }
    }
    return blocks;
  };
  return {
    preamble: preamble.join('\n').trim(),
    phases: PHASES.map((p) => ({ ...phaseMap[p], blocks: blocksOf(phaseMap[p].lines) })),
  };
}

// Pull a machine sub marker out of a turn header, e.g. "SRE — @sre-01 · ⬡ sub=agent:sre-01".
function subOf(header) {
  const m = header.match(/sub=([A-Za-z0-9:_\-.]+)/);
  return m ? m[1] : null;
}
// The visible role/label = the header with the machine marker trimmed off.
function roleOf(header) {
  return header.replace(/⬡?\s*sub=[A-Za-z0-9:_\-.]+/g, '').replace(/·\s*$/, '').trim();
}
// Ticket ids referenced in a line → TicketRef chips (backlog children, execute run refs).
const TICKET_RE = /\b(T-\d{4,})\b/g;

function Prose({ text }) {
  const { TicketRef } = H;
  // Render ticket refs first, then wikilinks within each non-ticket fragment.
  const out = [];
  let last = 0; let m; let i = 0;
  TICKET_RE.lastIndex = 0;
  while ((m = TICKET_RE.exec(text))) {
    if (m.index > last) out.push(<span key={`t${i++}`}>{renderProse(text.slice(last, m.index))}</span>);
    out.push(<TicketRef key={`tk${i++}`} id={m[1]} href={`/mc/review/${m[1]}`} />);
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push(<span key={`t${i++}`}>{renderProse(text.slice(last))}</span>);
  return <>{out}</>;
}

export function DeliberationThreadView({ note }) {
  const { PrincipalRef } = H;
  const parsed = parse(note.body);
  const participants = (note.frontmatter && note.frontmatter.participants) || [];
  const [open, setOpen] = useState(() => {
    const s = {};
    parsed.phases.forEach((p) => { s[p.key] = p.key === 'planning' || p.key === 'adversarial_review'; });
    return s;
  });

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--paper-page)' }}>
      <article style={{ maxWidth: 780, margin: '0 auto', padding: '32px 40px 96px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--paper-ink-muted)', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>participants:</span>
          {participants.length
            ? participants.map((s) => <PrincipalRef key={s} kind="agent" id={s} href={`/mc/agents/${encodeURIComponent(s)}`} />)
            : <span style={{ color: 'var(--paper-ink-muted)' }}>— none recorded —</span>}
        </div>

        {parsed.preamble ? (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: '25px', color: 'var(--paper-ink)', marginBottom: 20 }}>
            <Prose text={parsed.preamble} />
          </p>
        ) : null}

        {parsed.phases.map((ph) => {
          const isOpen = open[ph.key];
          const required = ph.key === 'adversarial_review';
          const hasTurns = ph.blocks.length > 0;
          return (
            <div key={ph.key} style={{ borderTop: '1px solid var(--paper-hairline)', padding: '10px 0' }}>
              <button onClick={() => setOpen((o) => ({ ...o, [ph.key]: !o[ph.key] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                <span style={{ color: 'var(--paper-ink-muted)' }}>{isOpen ? '▾' : '▸'}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--paper-ink)' }}>{ph.key}</span>
                {required ? <span style={{ ...mono, fontSize: 10, color: '#8a5a00', background: '#F0E4C8', border: '1px solid #D8C89A', borderRadius: 999, padding: '0 6px' }}>⚑ REQUIRED</span> : null}
                {!ph.present ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--paper-ink-muted)' }}>(not yet recorded)</span> : null}
              </button>
              {isOpen ? (
                <div style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ph.blocks._pre && ph.blocks._pre.join('').trim()
                    ? <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: '24px', color: 'var(--paper-ink)', margin: 0 }}><Prose text={ph.blocks._pre.join('\n').trim()} /></p>
                    : null}
                  {ph.blocks.map((b, i) => {
                    const sub = subOf(b.header);
                    return (
                      <div key={i} style={{ background: 'var(--paper-inset)', border: '1px solid var(--paper-hairline)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, color: 'var(--paper-ink)' }}>{roleOf(b.header)}</span>
                          {sub ? <PrincipalRef kind="agent" id={sub} href={`/mc/agents/${encodeURIComponent(sub)}`} /> : null}
                          {/isolated/i.test(b.header) ? <span style={{ ...mono, fontSize: 10, color: 'var(--paper-ink-muted)', border: '1px solid var(--paper-hairline)', borderRadius: 999, padding: '0 5px' }}>isolated</span> : null}
                        </div>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: '25px', color: 'var(--paper-ink)', margin: 0 }}>
                          <Prose text={b.body.join('\n').trim()} />
                        </p>
                      </div>
                    );
                  })}
                  {ph.present && required && !hasTurns
                    ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#8a5a00' }}>no dissent recorded — huddle may be invalid (the Board watchdog enforces this; Notes only shows it)</div>
                    : null}
                </div>
              ) : null}
            </div>
          );
        })}

        <div style={{ ...eyebrow, marginTop: 20, color: 'var(--paper-ink-muted)' }}>
          the seven phases are the spec vocabulary, 1:1 — the record, never the state machine
        </div>
      </article>
    </div>
  );
}
