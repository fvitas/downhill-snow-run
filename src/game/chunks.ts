import { rngInt, rngPick, rngRange, type Rng } from './rng.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

export type ChunkTree = { x: number; y: number; radius: number }

export type ChunkContext = {
  rng: Rng
  // Narrowest lane this level is allowed to ask for, trunk centre to trunk centre.
  gap: number
  difficulty: number
}

export type ChunkResult = { trees: ChunkTree[]; length: number }

export type Chunk = {
  name: string
  minDifficulty: number
  // Relative odds of being picked. Empty stretches need a low one or the slope reads as abandoned.
  weight: number
  build: (ctx: ChunkContext) => ChunkResult
}

export const TREE_MARGIN = 26
const MARGIN = TREE_MARGIN
const RADIUS_MIN = 10
const RADIUS_MAX = 19
const ROW_SPACING = 52

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clampLane = (x: number, gap: number): number =>
  Math.min(Math.max(x, MARGIN + gap / 2), LOGICAL_WIDTH - MARGIN - gap / 2)

const treeAt = (rng: Rng, x: number, y: number): ChunkTree => ({
  x,
  y,
  radius: rngRange(rng, RADIUS_MIN, RADIUS_MAX),
})

// Every placement is nudged: a pattern drawn on exact coordinates reads as furniture, not forest.
const treeNear = (rng: Rng, x: number, y: number, jx: number, jy = jx): ChunkTree =>
  treeAt(rng, x + rngRange(rng, -jx, jx), y + rngRange(rng, -jy, jy))

// A second trunk leaning away from the middle: clumps look grown, and never narrow the racing line.
const maybeClump = (out: ChunkTree[], rng: Rng, tree: ChunkTree, chance: number): void => {
  if (rng() > chance) return
  const outward = tree.x < LOGICAL_WIDTH / 2 ? -1 : 1
  const distance = tree.radius + rngRange(rng, 8, 20)
  const x = tree.x + outward * distance
  if (x < MARGIN || x > LOGICAL_WIDTH - MARGIN) return
  out.push(treeAt(rng, x, tree.y + rngRange(rng, -16, 16)))
}

// A row spanning the slope with one lane left open — the only way through is the hole.
const wallRow = (out: ChunkTree[], rng: Rng, y: number, laneX: number, gap: number): void => {
  for (let x = MARGIN; x <= LOGICAL_WIDTH - MARGIN; x += ROW_SPACING) {
    if (Math.abs(x - laneX) < gap / 2) continue
    out.push(treeAt(rng, x + rngRange(rng, -7, 7), y + rngRange(rng, -12, 12)))
  }
}

const gatePair = (out: ChunkTree[], rng: Rng, y: number, laneX: number, gap: number): void => {
  const lane = clampLane(laneX, gap)
  // Jitter goes outward only, so a nudged post never eats into the gap you have to thread.
  const left = treeAt(rng, lane - gap / 2 - rngRange(rng, 0, 10), y + rngRange(rng, -10, 10))
  const right = treeAt(rng, lane + gap / 2 + rngRange(rng, 0, 10), y + rngRange(rng, -10, 10))
  out.push(left, right)
  maybeClump(out, rng, left, 0.3)
  maybeClump(out, rng, right, 0.3)
}

// Loose trees with no pattern — the breather between the shaped chunks.
const scatter: Chunk = {
  name: 'scatter',
  weight: 3,
  minDifficulty: 0,
  build: ({ rng, gap, difficulty }) => {
    const length = rngRange(rng, 360, 540)
    const count = Math.round(lerp(7, 15, difficulty))
    const trees: ChunkTree[] = []
    for (let i = 0; i < count; i += 1) {
      const y = rngRange(rng, 0, length)
      const x = rngRange(rng, MARGIN, LOGICAL_WIDTH - MARGIN)
      // Keep a corridor of `gap` around every earlier tree at a similar height.
      const blocked = trees.some((tree) => Math.abs(tree.y - y) < 70 && Math.abs(tree.x - x) < gap)
      if (blocked) continue
      const tree = treeAt(rng, x, y)
      trees.push(tree)
      maybeClump(trees, rng, tree, 0.35)
    }
    return { trees, length }
  },
}

// Single trees alternating sides: one flip each, on rhythm.
const slalom: Chunk = {
  name: 'slalom',
  weight: 2,
  minDifficulty: 0.08,
  build: ({ rng, difficulty }) => {
    const gates = rngInt(rng, 4, 7)
    const step = lerp(190, 120, difficulty)
    const offset = rngRange(rng, 62, 118)
    const side = rng() < 0.5 ? -1 : 1
    const trees: ChunkTree[] = []
    let y = 0
    for (let i = 0; i < gates; i += 1) {
      // The rhythm breathes: each post sits its own distance out and its own distance down.
      const swing = offset * rngRange(rng, 0.78, 1.25)
      const x = LOGICAL_WIDTH / 2 + (i % 2 === 0 ? side : -side) * swing
      const tree = treeNear(rng, clampLane(x, 0), y, 12, 10)
      trees.push(tree)
      maybeClump(trees, rng, tree, 0.4)
      y += step * rngRange(rng, 0.8, 1.25)
    }
    return { trees, length: y }
  },
}

// Pairs you thread, the lane drifting across the slope so each gate needs a new line.
const gates: Chunk = {
  name: 'gates',
  weight: 2,
  minDifficulty: 0.12,
  build: ({ rng, gap, difficulty }) => {
    const count = rngInt(rng, 3, 5)
    const step = lerp(210, 150, difficulty)
    const drift = rngRange(rng, -110, 110)
    const start = rngRange(rng, MARGIN + gap, LOGICAL_WIDTH - MARGIN - gap)
    const trees: ChunkTree[] = []
    let y = 0
    for (let i = 0; i < count; i += 1) {
      const lane = start + (drift * i) / count + rngRange(rng, -26, 26)
      gatePair(trees, rng, y, lane, gap * rngRange(rng, 1.05, 1.35))
      y += step * rngRange(rng, 0.85, 1.2)
    }
    return { trees, length: y }
  },
}

// Two converging walls: wide open at the top, one gap at the bottom.
const funnel: Chunk = {
  name: 'funnel',
  weight: 1.5,
  minDifficulty: 0.2,
  build: ({ rng, gap }) => {
    const rows = rngInt(rng, 5, 7)
    const step = 96
    const lane = rngRange(rng, LOGICAL_WIDTH * 0.3, LOGICAL_WIDTH * 0.7)
    const trees: ChunkTree[] = []
    for (let i = 0; i < rows; i += 1) {
      const half = lerp(LOGICAL_WIDTH * 0.46, gap / 2, i / (rows - 1))
      const centre = clampLane(lane, half * 2)
      const y = i * step * rngRange(rng, 0.9, 1.1)
      trees.push(treeNear(rng, centre - half - rngRange(rng, 0, 9), y, 0, 12))
      trees.push(treeNear(rng, centre + half + rngRange(rng, 0, 9), y, 0, 12))
    }
    return { trees, length: rows * step + 120 }
  },
}

// A lane between two tree walls that snakes — you hold a line instead of reacting.
const corridor: Chunk = {
  name: 'corridor',
  weight: 1.5,
  minDifficulty: 0.3,
  build: ({ rng, gap, difficulty }) => {
    const length = rngRange(rng, 520, 780)
    const step = 58
    const amplitude = rngRange(rng, 60, 130) * lerp(0.6, 1, difficulty)
    const phase = rngRange(rng, 0, Math.PI * 2)
    const period = rngRange(rng, 300, 460)
    const width = gap * 1.1
    const trees: ChunkTree[] = []
    for (let y = 0; y < length; y += step) {
      const lane = clampLane(LOGICAL_WIDTH / 2 + Math.sin(phase + y / period) * amplitude, width)
      const left = treeNear(rng, lane - width / 2 - rngRange(rng, 0, 12), y, 0, 14)
      const right = treeNear(rng, lane + width / 2 + rngRange(rng, 0, 12), y + step / 2, 0, 14)
      trees.push(left, right)
      maybeClump(trees, rng, left, 0.25)
      maybeClump(trees, rng, right, 0.25)
    }
    return { trees, length }
  },
}

// Two gates back to back on opposite sides: flip, flip, immediately.
const doublePinch: Chunk = {
  name: 'double pinch',
  weight: 1.5,
  minDifficulty: 0.38,
  build: ({ rng, gap, difficulty }) => {
    const step = lerp(240, 170, difficulty)
    const side = rng() < 0.5 ? -1 : 1
    const offset = rngRange(rng, 90, 140)
    const trees: ChunkTree[] = []
    gatePair(trees, rng, 0, LOGICAL_WIDTH / 2 + side * offset, gap)
    gatePair(trees, rng, step, LOGICAL_WIDTH / 2 - side * offset, gap)
    return { trees, length: step * 2 }
  },
}

// Full-width walls with a single hole each, the holes deliberately far apart.
const thicket: Chunk = {
  name: 'thicket',
  weight: 1.5,
  minDifficulty: 0.45,
  build: ({ rng, gap, difficulty }) => {
    const rows = rngInt(rng, 2, 4)
    const step = lerp(250, 180, difficulty)
    const trees: ChunkTree[] = []
    let lane = rngRange(rng, MARGIN + gap, LOGICAL_WIDTH - MARGIN - gap)
    for (let i = 0; i < rows; i += 1) {
      wallRow(trees, rng, i * step, lane, gap * 1.25)
      lane = clampLane(LOGICAL_WIDTH - lane + rngRange(rng, -60, 60), gap * 1.25)
    }
    return { trees, length: rows * step + 140 }
  },
}

// Two diagonal lines crossing: the only way through is the moment they cross.
const crossing: Chunk = {
  name: 'crossing',
  weight: 1,
  minDifficulty: 0.55,
  build: ({ rng, gap }) => {
    const length = rngRange(rng, 480, 620)
    const step = 62
    const trees: ChunkTree[] = []
    for (let y = 0; y < length; y += step) {
      const t = y / length
      const left = lerp(MARGIN, LOGICAL_WIDTH - MARGIN, t)
      const right = lerp(LOGICAL_WIDTH - MARGIN, MARGIN, t)
      // The strands are skipped where they meet, which is the gap you aim for.
      if (Math.abs(left - right) > gap) {
        trees.push(treeNear(rng, left, y, 9, 14))
        trees.push(treeNear(rng, right, y, 9, 14))
      }
    }
    return { trees, length }
  },
}

// A wide avenue that swings across the slope. Straight edge-lined ones let you hold the middle
// and never touch the screen, so the lane always has to travel.
const avenue: Chunk = {
  name: 'avenue',
  weight: 1.5,
  minDifficulty: 0,
  build: ({ rng, gap, difficulty }) => {
    const length = rngRange(rng, 420, 600)
    const step = 74
    const width = gap * lerp(2.2, 1.7, difficulty)
    const amplitude = rngRange(rng, 0.18, 0.3) * LOGICAL_WIDTH
    const phase = rngRange(rng, 0, Math.PI * 2)
    const period = rngRange(rng, 280, 400)
    const trees: ChunkTree[] = []
    for (let y = 0; y < length; y += step) {
      const lane = clampLane(LOGICAL_WIDTH / 2 + Math.sin(phase + y / period) * amplitude, width)
      const left = treeNear(rng, lane - width / 2, y, 10, 16)
      const right = treeNear(rng, lane + width / 2, y + step / 2, 10, 16)
      trees.push(left, right)
      maybeClump(trees, rng, left, 0.45)
      maybeClump(trees, rng, right, 0.45)
    }
    return { trees, length }
  },
}

// Nothing at all: the exhale after a hard chunk, and the run-in to the finish.
const clearing: Chunk = {
  name: 'clearing',
  weight: 0.6,
  minDifficulty: 0,
  build: ({ rng }) => ({ trees: [], length: rngRange(rng, 200, 320) }),
}

export const CHUNKS: readonly Chunk[] = [
  scatter,
  slalom,
  gates,
  funnel,
  corridor,
  doublePinch,
  thicket,
  crossing,
  avenue,
  clearing,
]

// Harder chunks unlock with difficulty; the easy ones never drop out, so the rhythm keeps varying.
export const pickChunk = (rng: Rng, difficulty: number, previous: string | null): Chunk => {
  const available = CHUNKS.filter(
    (chunk) => chunk.minDifficulty <= difficulty && chunk.name !== previous,
  )
  const pool = available.length > 0 ? available : CHUNKS
  const total = pool.reduce((sum, chunk) => sum + chunk.weight, 0)

  let roll = rng() * total
  for (const chunk of pool) {
    roll -= chunk.weight
    if (roll <= 0) return chunk
  }
  return pool[pool.length - 1] ?? rngPick(rng, CHUNKS)
}
