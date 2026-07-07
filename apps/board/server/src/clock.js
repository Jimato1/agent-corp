/*
 * clock.js — injectable time. Lease TTLs, timebox countdowns, and the fencing restore floor all read
 * time; a fake clock lets tests advance deterministically (PLAN §4/§16). Production uses the system
 * clock. now() is epoch milliseconds (also the source of the restore-floor time seed, §16).
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
