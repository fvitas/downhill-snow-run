import { pickChunk, TREE_MARGIN, type ChunkTree } from './chunks.ts'
import { createRng, hashSeed, rngInt, rngPick, rngRange, type Rng } from './rng.ts'
import { PIXELS_PER_METRE, type Collectible, type Rock, type Tree } from './world.ts'
import { themeForWorld, type Theme } from './themes.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

export const LEVELS_PER_WORLD = 50
export const WORLD_COUNT = 10
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
  // The last level has no tape and no bar: the same downhill run as the other 499, it just never
  // ends. The slope is built a block at a time as you reach it.
  endless: boolean
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
  const endless = index === LEVEL_COUNT
  const bonus = !endless && index % BONUS_EVERY === 0

  return {
    index,
    world,
    indexInWorld,
    theme: themeForWorld(world),
    bonus,
    avalanche: !bonus && !endless && index >= AVALANCHE_FROM_LEVEL && index % AVALANCHE_EVERY === 0,
    endless,
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
// The slope runs to 95 % and then empties, so the trees thin out only on the very last approach.
const SLOPE_END_FRACTION = 0.95
const slopeEndPx = (lengthPx: number): number => lengthPx * SLOPE_END_FRACTION
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

const STRAY_BAND_PX = 74
const STRAY_SPACING_PX = 250
const STRAY_X_TRIES = 6

// The widest way through the band around `y`, counting the screen edges as walls.
const widestLanePx = (trees: Tree[], y: number, candidateX: number): number => {
  const xs = [candidateX]
  for (const tree of trees) {
    if (Math.abs(tree.y - y) < STRAY_BAND_PX) xs.push(tree.x)
  }
  xs.sort((a, b) => a - b)

  let widest = 0
  let previous = 0
  for (const x of xs) {
    widest = Math.max(widest, x - previous)
    previous = x
  }
  return Math.max(widest, LOGICAL_WIDTH - previous)
}

// One loose tree at `y`, or nothing at all if every x tried would close the lane. A crowded spot
// gets a few shots at a different x before it is given up on.
const tryStray = (rng: Rng, trees: Tree[], y: number, gap: number): void => {
  for (let tries = 0; tries < STRAY_X_TRIES; tries += 1) {
    const x = rngRange(rng, TREE_MARGIN, LOGICAL_WIDTH - TREE_MARGIN)
    if (widestLanePx(trees, y, x) < gap) continue
    trees.push({
      x,
      y,
      radius: rngRange(rng, 9, 17),
      rotation: rng() * Math.PI * 2,
      shade: rng(),
      grazed: false,
    })
    return
  }
}

// Loose trees dropped into the space the chunks leave empty, so the slope reads as forest rather
// than as a sequence of drawn shapes.
const addStrays = (rng: Rng, trees: Tree[], from: number, end: number, gap: number): void => {
  for (let y = from; y < end; y += STRAY_SPACING_PX) {
    const attempts = rngInt(rng, 1, 3)
    for (let i = 0; i < attempts; i += 1) {
      tryStray(rng, trees, Math.min(end, y + rngRange(rng, 0, STRAY_SPACING_PX)), gap)
    }
  }
}

// Whatever the last chunk left bare, walked out at slope density up to the cutoff — otherwise the
// forest ends wherever the chunk loop happened to stop, which on some seeds is 5 % early.
const TAIL_SPACING_PX: readonly [number, number] = [70, 140]

const fillTail = (rng: Rng, trees: Tree[], from: number, end: number, gap: number): void => {
  let y = trees.reduce((lowest, tree) => Math.max(lowest, tree.y), from)
  while (y < end) {
    y = Math.min(end, y + rngRange(rng, ...TAIL_SPACING_PX))
    tryStray(rng, trees, y, gap)
  }
}

// One stretch of forest, `from` to `end`. Built into its own array so the lane checks only ever
// see the stretch being drawn — an endless run would otherwise rescan every tree it has passed.
const fillTrees = (rng: Rng, level: Level, from: number, end: number): Tree[] => {
  const trees: Tree[] = []
  let cursor = from
  let previous: string | null = null

  while (cursor < end) {
    const chunk = pickChunk(rng, level.difficulty, previous)
    const { trees: chunkTrees, length } = chunk.build({
      rng,
      gap: level.minGapPx,
      difficulty: level.difficulty,
    })
    for (const chunkTree of chunkTrees) {
      if (chunkTree.y + cursor > end) continue
      trees.push(toTree(rng, chunkTree, cursor))
    }
    // A short gap between chunks so two patterns never read as one mess.
    cursor += length + rngRange(rng, 40, 100)
    previous = chunk.name
  }

  addStrays(rng, trees, from, end, level.minGapPx)
  fillTail(rng, trees, from, end, level.minGapPx)
  return trees.sort((a, b) => a.y - b.y)
}

const COIN_EDGE = 46
const CENTRE_X = LOGICAL_WIDTH / 2

const clampCoinX = (x: number): number =>
  Math.min(LOGICAL_WIDTH - COIN_EDGE, Math.max(COIN_EDGE, x))

const putCoin = (out: Collectible[], x: number, y: number): void => {
  out.push({ x: clampCoinX(x), y, kind: 'coin', taken: false })
}

const putDiamond = (out: Collectible[], x: number, y: number): void => {
  out.push({ x: clampCoinX(x), y, kind: 'diamond', taken: false })
}

type CoinSegment = (rng: Rng, out: Collectible[], top: number, length: number) => void

// A sweeping line you ride, with the odd diamond parked across the slope from its peak.
const coinWave: CoinSegment = (rng, out, top, length) => {
  const amplitude = rngRange(rng, 80, 200)
  const period = rngRange(rng, 300, 640)
  const phase = rngRange(rng, 0, Math.PI * 2)
  const spacing = rngRange(rng, 46, 70)
  for (let y = top; y < top + length; y += spacing) {
    const wave = Math.sin(phase + y / period)
    putCoin(out, CENTRE_X + wave * amplitude, y)
    if (Math.abs(wave) > 0.95 && rng() < 0.6) {
      putDiamond(out, CENTRE_X - Math.sign(wave) * (CENTRE_X - COIN_EDGE), y)
    }
  }
}

// Straight legs across the slope: you commit to a line, then flip at the corner.
const coinZigzag: CoinSegment = (rng, out, top, length) => {
  const spacing = rngRange(rng, 44, 62)
  const legLength = rngRange(rng, 200, 340)
  const inset = rngRange(rng, COIN_EDGE, 150)
  let side = rng() < 0.5 ? -1 : 1
  let y = top
  while (y < top + length) {
    const from = CENTRE_X - side * (CENTRE_X - inset)
    const to = CENTRE_X + side * (CENTRE_X - inset)
    const legEnd = Math.min(y + legLength, top + length)
    for (let cursor = y; cursor < legEnd; cursor += spacing) {
      putCoin(out, from + (to - from) * ((cursor - y) / legLength), cursor)
    }
    // The corner overshoots into a diamond: worth one extra flick if you are greedy.
    if (rng() < 0.45) putDiamond(out, to + side * 40, legEnd)
    side *= -1
    y = legEnd
  }
}

// A pocket: rings of coins around a diamond, far enough off the line to be a choice.
const coinCluster: CoinSegment = (rng, out, top, length) => {
  const pockets = rngInt(rng, 1, 3)
  for (let i = 0; i < pockets; i += 1) {
    const centreX = rngRange(rng, COIN_EDGE + 40, LOGICAL_WIDTH - COIN_EDGE - 40)
    const centreY = top + (length * (i + 0.5)) / pockets + rngRange(rng, -60, 60)
    const radius = rngRange(rng, 52, 84)
    const count = rngInt(rng, 7, 11)
    const spin = rngRange(rng, 0, Math.PI * 2)
    for (let k = 0; k < count; k += 1) {
      const angle = spin + (k / count) * Math.PI * 2
      putCoin(out, centreX + Math.cos(angle) * radius, centreY + Math.sin(angle) * radius * 1.3)
    }
    putDiamond(out, centreX, centreY)
  }
}

// A rest: coins hugging one wall, diamonds strung along the other one.
const coinLane: CoinSegment = (rng, out, top, length) => {
  const side = rng() < 0.5 ? -1 : 1
  const lane = CENTRE_X + side * rngRange(rng, 90, CENTRE_X - COIN_EDGE)
  const spacing = rngRange(rng, 44, 58)
  const drift = rngRange(rng, -50, 50)
  for (let y = top; y < top + length; y += spacing) {
    putCoin(out, lane + (drift * (y - top)) / length, y)
  }
  const diamonds = rngInt(rng, 1, 3)
  for (let i = 0; i < diamonds; i += 1) {
    putDiamond(out, CENTRE_X - side * (CENTRE_X - COIN_EDGE), top + (length * (i + 0.5)) / diamonds)
  }
}

const COIN_SEGMENTS: readonly CoinSegment[] = [
  coinWave,
  coinWave,
  coinZigzag,
  coinZigzag,
  coinCluster,
  coinLane,
]

// Bonus runs are stitched from segments, so no two coin levels read as the same wave.
const buildCoinCourse = (level: Level, lengthPx: number): Collectible[] => {
  const rng = createRng(level.seed ^ 0x9e37)
  const collectibles: Collectible[] = []
  const end = slopeEndPx(lengthPx)
  let cursor = RUN_IN_PX

  while (cursor < end) {
    const segment = rngPick(rng, COIN_SEGMENTS)
    const length = Math.min(rngRange(rng, 420, 820), end - cursor)
    segment(rng, collectibles, cursor, length)
    cursor += length + rngRange(rng, 70, 170)
  }

  return collectibles.sort((a, b) => a.y - b.y)
}

// Rocks arrive once the slope is busy enough to be read at a glance, and only on tree levels.
export const ROCKS_FROM_DIFFICULTY = 0.22
const ROCK_SPACING = 1_400

const fillRocks = (rng: Rng, level: Level, from: number, end: number): Rock[] => {
  if (level.difficulty < ROCKS_FROM_DIFFICULTY) return []

  const reach = clamp01((level.difficulty - ROCKS_FROM_DIFFICULTY) / (1 - ROCKS_FROM_DIFFICULTY))
  const spacing = lerp(ROCK_SPACING, ROCK_SPACING * 0.45, reach)
  const rocks: Rock[] = []

  for (let y = from + spacing; y < end; y += spacing) {
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

// How much endless slope is drawn at a time, and how far ahead of the ball the next block lands.
const ENDLESS_BLOCK_PX = 20_000
const ENDLESS_LOOKAHEAD_PX = 6_000

export const buildCourse = (level: Level): Course => {
  const lengthPx = level.endless ? ENDLESS_BLOCK_PX : level.distanceM * PIXELS_PER_METRE
  if (level.bonus) {
    const collectibles = buildCoinCourse(level, lengthPx)
    return { trees: [], collectibles, rocks: [], lengthPx, perfectScore: 0 }
  }
  if (level.endless) {
    const rng = createRng(level.seed)
    return {
      trees: fillTrees(rng, level, RUN_IN_PX, lengthPx),
      collectibles: [],
      rocks: fillRocks(createRng(level.seed ^ 0x1c3b), level, RUN_IN_PX, lengthPx),
      lengthPx,
      perfectScore: 0,
    }
  }
  const trees = fillTrees(createRng(level.seed), level, RUN_IN_PX, slopeEndPx(lengthPx))
  return {
    trees,
    collectibles: [],
    rocks: fillRocks(createRng(level.seed ^ 0x1c3b), level, RUN_IN_PX, slopeEndPx(lengthPx)),
    lengthPx,
    perfectScore: Math.max(1, trees.length) * POINTS_PER_TREE,
  }
}

// Draws the next stretch of the endless level once the ball is close to the end of the drawn one.
// `lengthPx` here means "how far the slope has been built", not where it stops — it never stops.
export const extendCourse = (level: Level, course: Course, y: number): void => {
  if (!level.endless || y + ENDLESS_LOOKAHEAD_PX < course.lengthPx) return
  const from = course.lengthPx
  const end = from + ENDLESS_BLOCK_PX
  const rng = createRng(hashSeed(level.seed, from))
  // A chunk can start a few pixels above the stretch it was built for; terrain.ts walks the array
  // forward only, so the join has to stay sorted.
  for (const tree of fillTrees(rng, level, from, end)) {
    tree.y = Math.max(from, tree.y)
    course.trees.push(tree)
  }
  for (const rock of fillRocks(rng, level, from, end)) course.rocks.push(rock)
  course.lengthPx = end
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
