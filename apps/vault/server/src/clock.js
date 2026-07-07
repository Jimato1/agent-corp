/*
 * clock.js — injectable time. Release TTLs, the redemption window W (§4.1 step 9), the D=1s drift
 * bound (§4.1 step 12), and freshness stamps all read time; a fake clock lets tests advance
 * deterministically. now() is epoch milliseconds. (Ported from the Board reference kit.)
 */
export function systemClock() {
  return { now: () => Date.now(), iso: () => new Date().toISOString() };
}

export function fakeClock(startMs = 1_700_000_000_000) {
  let t = startMs;
  return {
    now: () => t,
    iso: () => new Date(t).toISOString(),
    advance: (ms) => {
      t += ms;
      return t;
    },
    set: (ms) => {
      t = ms;
      return t;
    },
  };
}
