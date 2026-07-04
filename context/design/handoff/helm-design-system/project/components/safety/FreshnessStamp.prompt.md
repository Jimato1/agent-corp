**FreshnessStamp** — the age stamp every live figure carries; STALE is amber and spells out the safe reading, never a frozen green.

```jsx
<FreshnessStamp age="0.4s ago" />                                  {/* live */}
<FreshnessStamp state="stale" age="41s ago" reading="may be behind" />
<FreshnessStamp state="halt" reading="safety signal degraded" />   {/* gold */}
```

- Never fake a green "OK" on stale data.
- A stalled **safety** signal degrades to gold (`state="halt"`), not amber.
