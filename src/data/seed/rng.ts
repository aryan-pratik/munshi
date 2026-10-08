// Tiny deterministic PRNG (mulberry32) plus the draws the generator needs. No dependency.

export type Rng = {
  next(): number; // [0, 1)
  int(min: number, max: number): number; // inclusive
  pick<T>(xs: readonly T[]): T;
  gauss(): number; // standard normal
  noise(sigma: number): number; // 1 + sigma * gauss, floored at 0.5
  weighted<T>(xs: readonly T[], weights: readonly number[]): T;
  shuffle<T>(xs: readonly T[]): T[];
};

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const u = 1 - next();
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return {
    next,
    gauss,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    noise: (sigma) => Math.max(0.5, 1 + sigma * gauss()),
    weighted: (xs, weights) => {
      const total = weights.reduce((s, w) => s + w, 0);
      let r = next() * total;
      for (let i = 0; i < xs.length; i++) {
        r -= weights[i];
        if (r <= 0) return xs[i];
      }
      return xs[xs.length - 1];
    },
    shuffle: (xs) => {
      const a = [...xs];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/** Error-diffusion rounding: integer counts whose sum tracks the real-valued series. */
export function diffuser() {
  let carry = 0;
  return (x: number): number => {
    const v = x + carry;
    const n = Math.max(0, Math.round(v));
    carry = v - n;
    return n;
  };
}
