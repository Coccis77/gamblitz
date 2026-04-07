/**
 * Simple seeded PRNG (mulberry32).
 * Call createRng(seed) to get a function that returns a random float in [0, 1).
 */
export type RngFn = () => number;

export function createRng(seed: number): RngFn {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random element from an array using the given rng. */
export function pick<T>(arr: readonly T[], rng: RngFn): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}
