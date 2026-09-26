import { pickChunk, TREE_MARGIN, type ChunkTree } from './chunks.ts'
import { DEFAULT_PRESET, PRESETS } from './config.ts'
import { placeFeatures } from './features.ts'
import { createRng, hashSeed, rngInt, rngRange, type Rng } from './rng.ts'
import {
  METRES_PER_POINT,
  PIXELS_PER_METRE,
  type Hazard,
  type Pickup,
  type Rock,
  type Tree,
} from './world.ts'
import { themeForWorld, type Theme } from './themes.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

export const LEVELS_PER_WORLD = 50
export const WORLD_COUNT = 10
export const LEVEL_COUNT = LEVELS_PER_WORLD * WORLD_COUNT
export type Level = {
  index: number
  world: number
  indexInWorld: number
  theme: Theme
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

  return {
    index,
    world,
    indexInWorld,
    theme: themeForWorld(world),
    endless,
    seed: hashSeed(index, SEED_SALT),
    difficulty,
    distanceM: Math.round(lerp(400, 900, difficulty) / 10) * 10,
    minGapPx: lerp(115, 58, difficulty),
    baseSpeed: lerp(205, 320, difficulty),
    maxSpeed: lerp(470, 880, difficulty),
    speedRampPer1000: lerp(6, 14, difficulty),
  }
}

export type Course = {
  trees: Tree[]
  rocks: Rock[]
  hazards: Hazard[]
  pickups: Pickup[]
  lengthPx: number
  // What a run that grazed everything and skied the whole level would score — the ratings are
  // cut from it. Zero on the endless level, which nobody finishes.
  perfectScore: number
}

// Courses are small enough (a few hundred trees) to build whole, which beats streaming: the rating
// cuts need to know what the whole level contains before the run starts.
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
const tryStray = (
  rng: Rng,
  trees: Tree[],
  y: number,
  gap: number,
  allowed: (x: number) => boolean = () => true,
): void => {
  for (let tries = 0; tries < STRAY_X_TRIES; tries += 1) {
    const x = rngRange(rng, TREE_MARGIN, LOGICAL_WIDTH - TREE_MARGIN)
    if (!allowed(x) || widestLanePx(trees, y, x) < gap) continue
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

// The run-in is loose trees too, bar a short stretch under the ball, so the first seconds score.
const RUN_IN_CLEAR_PX = 150
const RUN_IN_SPACING_PX: readonly [number, number] = [50, 90]
// The ball sets off down and to the right; a player who hasn't tapped yet must not meet a trunk there.
const START_PATH_SLOPE = Math.tan((PRESETS[DEFAULT_PRESET].turnAngleDeg * Math.PI) / 180)
const START_PATH_CLEAR_PX = 60

const offStartPath = (y: number) => (x: number): boolean =>
  Math.abs(x - (LOGICAL_WIDTH / 2 + y * START_PATH_SLOPE)) > START_PATH_CLEAR_PX

const fillRunIn = (rng: Rng, trees: Tree[], gap: number): void => {
  for (let y = RUN_IN_CLEAR_PX; y < RUN_IN_PX; y += rngRange(rng, ...RUN_IN_SPACING_PX)) {
    const count = rngInt(rng, 1, 2)
    for (let i = 0; i < count; i += 1) {
      const treeY = y + rngRange(rng, -15, 15)
      tryStray(rng, trees, treeY, gap, offStartPath(treeY))
    }
  }
  trees.sort((a, b) => a.y - b.y)
}

// Rocks arrive once the slope is busy enough to be read at a glance, and only on tree levels.
export const ROCKS_FROM_DIFFICULTY = 0.22
const ROCK_SPACING = 1_400

const fillRocks = (rng: Rng, level: Level, from: number, end: number): Rock[] => {
  if (level.difficulty < ROCKS_FROM_DIFFICULTY) return []

  const reach = clamp01((level.difficulty - ROCKS_FROM_DIFFICULTY) / (1 - ROCKS_FROM_DIFFICULTY))
  const spacing = lerp(ROCK_SPACING, ROCK_SPACING * 0.45, reach)
  const rocks: Rock[] = []

  // Kept a jitter short of `end`, so no stone starts past it.
  for (let y = from + spacing; y < end - spacing * 0.3; y += spacing) {
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
      near: false,
      grazed: false,
    })
  }

  return rocks
}

// How much endless slope is drawn at a time, and how far ahead of the ball the next block lands.
const ENDLESS_BLOCK_PX = 20_000
const ENDLESS_LOOKAHEAD_PX = 6_000
// Nothing but trees for the first stretch, and the last tenth is left clear for the run to the tape.
const FEATURES_FROM_PX = RUN_IN_PX + 600
const FEATURES_END_FRACTION = 0.9

type Stretch = Omit<Course, 'lengthPx' | 'perfectScore'> & { points: number }

// Forest plus whatever this level has unlocked, for one stretch of slope.
const buildStretch = (level: Level, seed: number, from: number, end: number): Stretch => {
  const rng = createRng(seed)
  const trees = fillTrees(rng, level, from, end)
  // Its own rng, so everything past the run-in keeps the layout each level always had.
  if (from === RUN_IN_PX) fillRunIn(createRng(seed ^ 0x5a17), trees, level.minGapPx)
  const featureEnd = level.endless ? end : level.distanceM * PIXELS_PER_METRE * FEATURES_END_FRACTION
  const rocks = fillRocks(createRng(seed ^ 0x1c3b), level, from, featureEnd)
  const features = placeFeatures(
    createRng(seed ^ 0x3fa7),
    level.index,
    level.difficulty,
    trees,
    Math.max(from, FEATURES_FROM_PX),
    featureEnd,
  )
  return { trees, rocks, ...features }
}

export const buildCourse = (level: Level): Course => {
  const lengthPx = level.endless ? ENDLESS_BLOCK_PX : level.distanceM * PIXELS_PER_METRE
  if (level.endless) {
    const { points: _points, ...stretch } = buildStretch(level, level.seed, RUN_IN_PX, lengthPx)
    return { ...stretch, lengthPx, perfectScore: 0 }
  }
  const { points, ...stretch } = buildStretch(level, level.seed, RUN_IN_PX, slopeEndPx(lengthPx))
  return {
    ...stretch,
    lengthPx,
    perfectScore:
      Math.max(1, stretch.trees.length) * POINTS_PER_TREE +
      points +
      Math.round(level.distanceM / METRES_PER_POINT),
  }
}

// Draws the next stretch of the endless level once the ball is close to the end of the drawn one.
// `lengthPx` here means "how far the slope has been built", not where it stops — it never stops.
export const extendCourse = (level: Level, course: Course, y: number): void => {
  if (!level.endless || y + ENDLESS_LOOKAHEAD_PX < course.lengthPx) return
  const from = course.lengthPx
  const end = from + ENDLESS_BLOCK_PX
  const stretch = buildStretch(level, hashSeed(level.seed, from), from, end)
  // A chunk can start a few pixels above the stretch it was built for; terrain.ts walks the array
  // forward only, so the join has to stay sorted.
  for (const tree of stretch.trees) {
    tree.y = Math.max(from, tree.y)
    course.trees.push(tree)
  }
  course.rocks.push(...stretch.rocks)
  course.hazards.push(...stretch.hazards)
  course.pickups.push(...stretch.pickups)
  course.lengthPx = end
}

export const RATINGS = ['Made it!', 'Good run!', 'Great run!', 'Epic run!', 'Insane run!', 'Legendary run!'] as const
export type Rating = (typeof RATINGS)[number]

// Fractions of the perfect score for each rating above the first.
const RUN_CUTS = [0.12, 0.27, 0.45, 0.62, 0.8]
// At full difficulty every cut sits this much lower: just finishing there is worth shouting about.
const HARD_EASING = 0.4

export const rateRun = (level: Level, score: number, perfectScore: number): Rating | null => {
  if (perfectScore <= 0) return null
  const ease = 1 - HARD_EASING * level.difficulty
  const tier = RUN_CUTS.filter((cut) => score >= perfectScore * cut * ease).length
  return RATINGS[tier] ?? null
}
