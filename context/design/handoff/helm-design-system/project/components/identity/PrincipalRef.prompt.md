**PrincipalRef** — a "who did this" chip resolved to a real identity, with a kind glyph (⬡ agent · ◐ operator · ⚙ service).

```jsx
<PrincipalRef kind="agent" id="agent:patcher-07" href="/agents/patcher-07" />
<PrincipalRef kind="operator" id="operator:ada" />
<PrincipalRef kind="service" id="svc:tier-approver" status="revoked" />
```

- **kind** sets the glyph; **href** links to the drill-in.
- **status** `revoked` / `disabled` adds the ⛒ / ◼ pill and strikes the id.
- Never render a bare display name — always the resolved identity.
