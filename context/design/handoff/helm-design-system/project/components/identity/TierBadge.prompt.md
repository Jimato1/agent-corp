**TierBadge** — the single provenance / trust badge; glyph shows how independent the label is.

```jsx
<TierBadge tier="verified" />                        {/* ✔ green  — external verifier */}
<TierBadge tier="corroborated" />                    {/* ⧉ cyan   — cross-referenced */}
<TierBadge tier="single" heuristic />                {/* ◑ amber  — agent-asserted, ~ heuristic */}
<TierBadge tier="untrusted" label="Untrusted · host-originated" /> {/* ⚠ striped */}
```

- **untrusted** = adversarial input to the models; it blocks the auto-approve lane. Surface it, never bury it.
- **heuristic** appends `~ heuristic` — never dress a heuristic as verified.
- Trust tiers never use halt-gold (gold is stops only). Taint is display-only.
