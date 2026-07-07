import React from 'react';

/* Helm — TicketRef
   Any work item (ticket, run, release, review item). A mono chip like
   [ T-000123 ] on a slightly-inset surface: copy-on-click, middle-truncated,
   never wrapped. When it names a queue item it's a DEEP-LINK into Mission
   Control's review queue. The ID is OPAQUE — never styled to imply meaning;
   provenance rides beside it (a TierBadge), never by recoloring the chip. */

const CSS = `
.helm-ticket {
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 100%; height: 20px; padding: 0 7px;
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font-family: var(--font-mono); font-size: 12px; line-height: 1;
  font-feature-settings: var(--figures-tabular);
  color: var(--text-primary); white-space: nowrap; cursor: pointer;
  text-decoration: none; user-select: none;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard);
}
.helm-ticket:hover { background: #232B36; border-color: var(--border-strong); text-decoration: none; }
.helm-ticket:focus-visible { outline: none; box-shadow: var(--ring-focus-tight); }
.helm-ticket__bracket { color: var(--text-disabled); }
.helm-ticket__id { overflow: hidden; text-overflow: ellipsis; }
.helm-ticket__link { color: var(--signal-cyan); font-size: 11px; margin-left: 1px; }
.helm-ticket__copied { color: var(--state-green); font-size: 11px; font-family: var(--font-ui); font-weight: 600; }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-ticketref-css')) {
  const s = document.createElement('style');
  s.id = 'helm-ticketref-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function middleTruncate(str, head = 10, tail = 6) {
  if (!str || str.length <= head + tail + 1) return str;
  return str.slice(0, head) + '…' + str.slice(-tail);
}

export function TicketRef({
  id,
  href,
  deepLink = false,
  truncate = false,
  onCopy,
  className = '',
  ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const shown = truncate ? middleTruncate(id) : id;

  const copy = (e) => {
    if (href) return; // links navigate; copy is for the non-link chip
    e.preventDefault();
    e.stopPropagation(); // don't also trigger a clickable row this chip sits in
    try {
      navigator.clipboard && navigator.clipboard.writeText(id);
    } catch (_) { /* clipboard blocked — no-op */ }
    setCopied(true);
    onCopy && onCopy(id);
    setTimeout(() => setCopied(false), 1100);
  };

  const inner = (
    <React.Fragment>
      <span className="helm-ticket__bracket">[</span>
      <span className="helm-ticket__id" title={id}>{shown}</span>
      <span className="helm-ticket__bracket">]</span>
      {copied
        ? <span className="helm-ticket__copied" aria-live="polite">copied ✔</span>
        : (href || deepLink) ? <span className="helm-ticket__link" aria-hidden="true">↗</span> : null}
    </React.Fragment>
  );

  const cls = ['helm-ticket', className].filter(Boolean).join(' ');

  if (href) {
    return <a className={cls} href={href} {...rest}>{inner}</a>;
  }
  return (
    <button type="button" className={cls} onClick={copy} title={`Copy ${id}`} {...rest}>
      {inner}
    </button>
  );
}
