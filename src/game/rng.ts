export type Rng = () => number

// mulberry32: same seed, same course, on every device and forever.
export const createRng = (seed: number): Rng => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export const rngRange = (rng: Rng, min: number, max: number): number => min + rng() * (max - min)

export const rngInt = (rng: Rng, min: number, max: number): number =>
  Math.min(max, Math.floor(rngRange(rng, min, max + 1)))

export const rngPick = <T>(rng: Rng, items: readonly T[]): T => {
  const item = items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
  if (item === undefined) throw new Error('cannot pick from an empty list')
  return item
}

// Mixes an index into a seed so neighbouring levels don't produce neighbouring courses.
export const hashSeed = (a: number, b: number): number => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x165667b1, 0xc2b2ae35)
  h ^= h >>> 13
  return Math.imul(h, 0x27d4eb2f) >>> 0
}
