/**
 * Fake network physics.
 *
 * Real backends have latency, jitter and uneven pipeline cadence. Everything
 * here exists to reproduce that feel. All tuning constants live in
 * `NETWORK_TIMINGS` so the whole "backend" can be re-tempoed in one place
 * (the hidden dev menu's latency sliders can scale these too).
 *
 * Cancel-safety: `sleep` is deliberately fire-and-forget — if a consumer
 * abandons an async generator mid-delay, the timer still fires, the promise
 * resolves, and nothing else happens. No global timers, nothing to clean up.
 */

export const NETWORK_TIMINGS = {
  /** Generic request latency: jittered, weighted toward ~400ms. */
  latency: { min: 280, max: 900, mode: 400 },

  /**
   * Per-event delays for the analyze pipeline (ms).
   * Sums to ~2.5s on average (~2.1–3.1s with jitter) — the spec's
   * 2.5–3.5s analyze window, with crossref visibly the longest beat.
   */
  pipeline: {
    /** Barcode → product resolution feels snappy. */
    identified: { base: 380, spread: 90 },
    /** "Reading N ingredients". */
    parsing: { base: 540, spread: 130 },
    /** "Querying three databases" — visibly the longest stage. */
    crossref: { min: 950, max: 1450 },
    /** Final verdict assembly. */
    verdict: { base: 320, spread: 80 },
  },

  /** 5% of (non-demo) analyses get an extended crossref — real servers do too. */
  slowAnalysisChance: 0.05,
  slowAnalysisExtraMs: 1200,

  /** Demo mode multiplies every delay by this (pins latency low). */
  demoModeScale: 0.3,
} as const;

/**
 * Plain abandonable sleep. Safe to leave dangling from a cancelled
 * async generator — resolving into the void does no work.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Math.round(ms)));
  });
}

/**
 * Sample from a triangular distribution — cheap way to get latency that
 * clusters around `mode` but occasionally strays toward `max`.
 */
export function triangular(min: number, max: number, mode: number): number {
  const m = Math.min(Math.max(mode, min), max);
  const u = Math.random();
  const c = (m - min) / (max - min || 1);
  if (u < c) {
    return min + Math.sqrt(u * (max - min) * (m - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - m));
}

/**
 * Simulate one round-trip. Defaults 280–900ms, weighted toward ~400ms.
 */
export function simulateLatency(
  min: number = NETWORK_TIMINGS.latency.min,
  max: number = NETWORK_TIMINGS.latency.max,
): Promise<void> {
  return sleep(triangular(min, max, NETWORK_TIMINGS.latency.mode));
}

/** Deterministic 32-bit hash of a string — seed source for per-scan jitter. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Tiny seeded PRNG (mulberry32) wrapped as a jitter helper.
 * Seeding with the barcode makes each product's pipeline cadence organic
 * but *stable across rescans* — great for demo rehearsal.
 *
 * Returned function: `jitter(base, spread)` → value in [base − spread, base + spread].
 */
export function createJitter(seed: number): (base: number, spread: number) => number {
  let a = seed >>> 0;
  const rand = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (base: number, spread: number): number => base + (rand() * 2 - 1) * spread;
}
