export type Rng = () => number;

/** Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma cena. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng: Rng, min: number, max: number) {
  return min + (max - min) * rng();
}

export function pickWeighted<T>(rng: Rng, options: ReadonlyArray<readonly [T, number]>): T | null {
  const total = options.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return null;

  let threshold = rng() * total;
  for (const [value, weight] of options) {
    threshold -= Math.max(0, weight);
    if (threshold < 0) return value;
  }

  return options[options.length - 1][0];
}
