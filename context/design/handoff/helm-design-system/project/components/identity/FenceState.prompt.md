**FenceState** — an agent's lease/fencing state; a held lock is neutral, a lost lock is a ⚠ SUPERSEDED zombie.

```jsx
<FenceState gen={47} lease="04:12" heartbeat="0.8s" />              {/* held, fresh */}
<FenceState gen={47} lease="00:19" heartbeat="6.4s" state="aging" />
<FenceState gen={46} supersededBy={47} state="superseded" />       {/* zombie */}
<FenceState gen={47} lease="04:12" heartbeat="0.8s" advisory />
```

- A held 🔒 is **neutral**, never green — green means external-verifier confirmation.
- `superseded` is the zombie case: the agent thinks it holds a lock it has lost.
- `advisory` greys it and tags "advisory" for apps that don't enforce on fencing.
