**NavRail** — the left side rail shared by every app; wordmark, suite switcher, nav items, and the suite-wide posture shown once.

```jsx
<NavRail
  current="mission-control"
  posture="kill"                 /* gold ring on the halt glyph */
  items={[
    { group: 'Cockpit' },
    { key: 'overview', label: 'Overview', icon: '▤', active: true },
    { key: 'review', label: 'Review queue', icon: '◈', badge: 7, href: '/review' },
    { key: 'agents', label: 'Agents', icon: '⬡', href: '/agents' },
  ]}
  onSelectApp={(k) => navigate(k)}
  onToggle={setCollapsed}
/>
```

- **posture** `nominal | kill | safe-stop` — the one place suite safety shows in every app.
- **items** take `icon`, `label`, `badge`, `active`, `href`/`onClick`, or `group` for a section label.
- **collapsed** switches to the 56px glyph rail (labels hidden, posture ring kept).
