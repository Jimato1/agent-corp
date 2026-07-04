**StopActuator** — the press-and-hold kill-switch; fill a gold ring over a short dwell to engage, release to abort.

```jsx
<StopActuator level="G1" onEngage={() => engageStop()} />
<StopActuator level="G2" onEngage={() => fullQuiesce()} />   {/* focus to arm, ~1.0s */}
<StopActuator engaged />                                       {/* read-only engaged state */}
```

- **level** `G1` (~600ms) · `G2` (~1000ms, must be focused/armed first, doubled ▮▮▮▮ glyph).
- No typing — holding is the only way to engage. Release early aborts.
- Gold, never red. `engaged` shows the calm read-only safe-stopped state.
- Only Mission Control and auth host a real kill trigger; elsewhere show `HaltBand` read-only.
