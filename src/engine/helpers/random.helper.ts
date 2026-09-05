/**
 * The seeded sequence a `withSeed()` scope has installed, or `null` outside
 * one. `Math.random` is looked up at each draw rather than captured here, so
 * a spec stubbing it still reaches every unseeded draw.
 */
let seededSource: (() => number) | null = null;


export function randomBetween(min: number, max: number): number {
  const draw = seededSource ?? Math.random;

  return draw() * (max - min) + min;
}


/** A seed for `withSeed()`: a 32-bit integer, drawn from `Math.random`. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}


/**
 * Runs `fn` with every `randomBetween()` inside it drawing from a sequence
 * that `seed` determines, so the same seed and the same inputs give the same
 * result twice.
 *
 * This is what lets a palette follow a slider drag: the generators jitter each
 * member, and a fresh draw per frame would have four swatches flicker through
 * random variations while the fifth moves. Under one seed the jitter is the
 * same on every frame and only the base color moves. The seed is drawn once,
 * when a palette is rolled, and kept with it.
 *
 * The scope is synchronous and restores the previous source before it
 * returns, whichever way `fn` leaves. Code that reads `Math.random` directly
 * is not covered - inside a generator, draw through `randomBetween()`.
 */
export function withSeed<T>(seed: number, fn: () => T): T {
  const previous = seededSource;

  seededSource = mulberry32(seed);

  try {
    return fn();
  } finally {
    seededSource = previous;
  }
}


/**
 * A small, fast generator with a full 32-bit period, uniform enough for jitter
 * - it decides how far a hue wobbles, not anything that needs a statistical
 * guarantee.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6D2B79F5) >>> 0;

    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
