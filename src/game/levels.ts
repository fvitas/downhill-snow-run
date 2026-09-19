import { pickChunk, type ChunkTree } from './chunks.ts'
import { createRng, hashSeed, rngRange, type Rng } from './rng.ts'
import { PIXELS_PER_METRE, type Collectible, type Rock, type Tree } from './world.ts'
import { themeForWorld, type Theme } from './themes.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

export const LEVELS_PER_WORLD = 50
export const WORLD_COUNT = 20
export const LEVEL_COUNT = LEVELS_PER_WORLD * WORLD_COUNT
// Every tenth level is the coin run: no trees, no death, pure reward.
export const BONUS_EVERY = 10
// Halfway between two coin runs the wall comes down the mountain after you.
export const AVALANCHE_EVERY = 5
export const AVALANCHE_FROM_LEVEL = 15

export type Level = {
  index: number
  world: number
  indexInWorld: number
  theme: Theme
  bonus: boolean
  avalanche: boolean
  seed: number
  difficulty: number
  distanceM: number
  minGapPx: number
  baseSpeed: number
  maxSpeed: number
  speedRampPer1000: number
}

// Bump this and every course in the game is redrawn from scratch.
const SEED_SALT = 0x5c1

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export const clampLevelIndex = (index: number): number =>
  Math.min(LEVEL_COUNT, Math.max(1, Math.round(index)))

export const worldOf = (index: number): number =>
  Math.floor((clampLevelIndex(index) - 1) / LEVELS_PER_WORLD) + 1

// Difficulty saws: each world starts easier than the last one ended, then climbs higher than it did.
const difficultyOf = (world: number, indexInWorld: number): number => {
  const acrossGame = (world - 1) / (WORLD_COUNT - 1)
  const acrossWorld = (indexInWorld - 1) / (LEVELS_PER_WORLD - 1)
  return clamp01(acrossGame * 0.78 + acrossWorld * 0.28)
}

export const levelAt = (rawIndex: number): Level => {
  const index = clampLevelIndex(rawIndex)
  const world = worldOf(index)
  const indexInWorld = index - (world - 1) * LEVELS_PER_WORLD
  const difficulty = difficultyOf(world, indexInWorld)
  const bonus = index % BONUS_EVERY === 0

  return {
    index,
    world,
    indexInWorld,
    theme: themeForWorld(world),
    bonus,
    avalanche: !bonus && index >= AVALANCHE_FROM_LEVEL && index % AVALANCHE_EVERY === 0,
    seed: hashSeed(index, SEED_SALT),
    difficulty,
    distanceM: bonus ? 500 : Math.round(lerp(400, 900, difficulty) / 10) * 10,
    minGapPx: lerp(115, 58, difficulty),
    baseSpeed: bonus ? 330 : lerp(205, 320, difficulty),
    maxSpeed: bonus ? 520 : lerp(470, 880, difficulty),
    speedRampPer1000: bonus ? 4 : lerp(6, 14, difficulty),
  }
}

export type Course = {
  trees: Tree[]
  collectibles: Collectible[]
  rocks: Rock[]
  lengthPx: number
  // What a run that grazed everything would score — the 2★/3★ bars are cut from it.
  perfectScore: number
}

// Courses are small enough (a few hundred trees) to build whole, which beats streaming: the star
// thresholds need to know what the whole level contains before the run starts.
const RUN_IN_PX = 520
const RUN_OUT_PX = 260
// What one tree is worth on a strong run: chains break, so the ×32 cap is not a useful yardstick.
const POINTS_PER_TREE = 8

const toTree = (rng: Rng, chunkTree: ChunkTree, offsetY: number): Tree => ({
  x: chunkTree.x,
  y: chunkTree.y + offsetY,
  radius: chunkTree.radius,
  rotation: rng() * Math.PI * 2,
  shade: rng(),
  grazed: false,
})

const buildTreeCourse = (level: Level, lengthPx: number): Tree[] => {
  const rng = createRng(level.seed)
  const trees: Tree[] = []
  let cursor = RUN_IN_PX
  let previous: string | null = null

  while (cursor < lengthPx - RUN_OUT_PX) {
    const chunk = pickChunk(rng, level.difficulty, previous)
    const { trees: chunkTrees, length } = chunk.build({
      rng,
      gap: level.minGapPx,
      difficulty: level.difficulty,
    })
    for (const chunkTree of chunkTrees) {
      if (chunkTree.y + cursor > lengthPx - RUN_OUT_PX) continue
      trees.push(toTree(rng, chunkTree, cursor))
    }
    // A short gap between chunks so two patterns never read as one mess.
    cursor += length + rngRange(rng, 40, 100)
    previous = chunk.name
  }

  return trees.sort((a, b) => a.y - b.y)
}

const COIN_SPACING = 58
const DIAMOND_INSET = 52

// Bonus runs: long sweeping lines of coins, with the diamonds parked out near the walls.
const buildCoinCourse = (level: Level, lengthPx: number): Collectible[] => {
  const rng = createRng(level.seed ^ 0x9e37)
  const collectibles: Collectible[] = []
  const amplitude = rngRange(rng, 120, 190)
  const period = rngRange(rng, 420, 620)
  const phase = rngRange(rng, 0, Math.PI * 2)

  for (let y = RUN_IN_PX; y < lengthPx - RUN_OUT_PX; y += COIN_SPACING) {
    const x = LOGICAL_WIDTH / 2 + Math.sin(phase + y / period) * amplitude
    collectibles.push({ x, y, kind: 'coin', taken: false })
    // Diamonds sit on the far side of the wave, so taking one costs you the next few coins.
    if (Math.abs(Math.sin(phase + y / period)) > 0.96) {
      const side = x > LOGICAL_WIDTH / 2 ? -1 : 1
      collectibles.push({
        x: LOGICAL_WIDTH / 2 - (side * LOGICAL_WIDTH) / 2 + side * DIAMOND_INSET,
        y,
        kind: 'diamond',
        taken: false,
      })
    }
  }

  return collectibles
}

// Rocks arrive once the slope is busy enough to be read at a glance, and only on tree levels.
export const ROCKS_FROM_DIFFICULTY = 0.22
const ROCK_SPACING = 1_400

const buildRocks = (level: Level, lengthPx: number): Rock[] => {
  if (level.difficulty < ROCKS_FROM_DIFFICULTY) return []

  const rng = createRng(level.seed ^ 0x1c3b)
  const reach = clamp01((level.difficulty - ROCKS_FROM_DIFFICULTY) / (1 - ROCKS_FROM_DIFFICULTY))
  const spacing = lerp(ROCK_SPACING, ROCK_SPACING * 0.45, reach)
  const rocks: Rock[] = []

  for (let y = RUN_IN_PX + spacing; y < lengthPx - RUN_OUT_PX; y += spacing) {
    const fromLeft = rng() < 0.5
    const radius = rngRange(rng, 20, 30)
    const spawnX = fromLeft ? radius : LOGICAL_WIDTH - radius
    rocks.push({
      spawnX,
      spawnY: y + rngRange(rng, -spacing * 0.3, spacing * 0.3),
      spawnVx: (fromLeft ? 1 : -1) * rngRange(rng, 110, 190) * lerp(0.8, 1.35, reach),
      // Slower downhill than the ball, so it drifts into view rather than ambushing from behind.
      vy: level.baseSpeed * rngRange(rng, 0.3, 0.55),
      radius,
      x: spawnX,
      y,
      vx: 0,
      angle: 0,
      rolling: false,
    })
  }

  return rocks
}

export const buildCourse = (level: Level): Course => {
  const lengthPx = level.distanceM * PIXELS_PER_METRE
  if (level.bonus) {
    const collectibles = buildCoinCourse(level, lengthPx)
    return { trees: [], collectibles, rocks: [], lengthPx, perfectScore: 0 }
  }
  const trees = buildTreeCourse(level, lengthPx)
  return {
    trees,
    collectibles: [],
    rocks: buildRocks(level, lengthPx),
    lengthPx,
    perfectScore: Math.max(1, trees.length) * POINTS_PER_TREE,
  }
}

// 1★ for finishing at all, the other two for grazing your way down rather than hiding from the trees.
const TWO_STARS = 0.25
const THREE_STARS = 0.55

export const starsFor = (score: number, perfectScore: number): number => {
  if (perfectScore <= 0) return 3
  if (score >= perfectScore * THREE_STARS) return 3
  if (score >= perfectScore * TWO_STARS) return 2
  return 1
}

export const nextStarTarget = (score: number, perfectScore: number): number | null => {
  if (perfectScore <= 0) return null
  if (score < perfectScore * TWO_STARS) return Math.round(perfectScore * TWO_STARS)
  if (score < perfectScore * THREE_STARS) return Math.round(perfectScore * THREE_STARS)
  return null
}
