import type { TuningConfig } from './config.ts'
import { buildCourse, levelAt, type Course, type Level } from './levels.ts'
import { AVALANCHE_LEAD_PX } from './avalanche.ts'
import { resetRock } from './rocks.ts'
import type { Theme } from './themes.ts'
import { cameraYFor, LOGICAL_WIDTH } from './viewport.ts'
import { PIXELS_PER_METRE, type Particle, type TrailPoint, type Tree } from './world.ts'

export type { Collectible, Particle, Rock, TrailPoint, Tree } from './world.ts'
export type { Theme } from './themes.ts'
export type { Course, Level } from './levels.ts'
export { PIXELS_PER_METRE, TRUNK_HALF_SCALE } from './world.ts'

export type RenderStyle = 'faux3d' | 'flat'

// A floating "+8" beside the ball. Lives in world space so it scrolls with the slope.
export type Pop = { x: number; y: number; text: string; life: number }

// Set on the frame a tree is grazed; the renderer reads it to sway the tree.
export type Wobble = { tree: Tree; age: number; side: 1 | -1 }

// Everything needed to re-judge a crash after the fact, and to draw it magnified.
export type HitRecord = {
  kind: 'tree' | 'wall' | 'rock' | 'avalanche'
  score: number
  speed: number
  angleDeg: number
  ball: { x: number; y: number; radius: number }
  step: { fromX: number; fromY: number; toX: number; toY: number }
  tree: { x: number; y: number; radius: number; rx: number; ry: number } | null
}

export type InspectState = { on: boolean; zoom: number; panX: number; panY: number }

export type Screen = 'map' | 'run'

export type GameState = {
  tuning: TuningConfig
  style: RenderStyle
  screen: Screen
  level: Level
  course: Course
  theme: Theme
  x: number
  y: number
  prevX: number
  prevY: number
  angle: number
  direction: 1 | -1
  speed: number
  pressed: boolean
  paused: boolean
  dead: boolean
  finished: boolean
  started: boolean
  countdown: number
  elapsed: number
  // Counts down once the tape is crossed: the ball skis on for a beat before the card judges it.
  coast: number
  score: number
  bestScore: number
  // The furthest a failed attempt on this level got, 0–1. Zero means there is no ghost to draw.
  bestReach: number
  combo: number
  comboTimer: number
  runCoins: number
  runDiamonds: number
  // Leading edge of the wall, in world y. Only advanced on avalanche levels.
  avalancheY: number
  // Impact hold and the small kick that follows it, both counting down to zero.
  freeze: number
  shake: number
  lastHit: HitRecord | null
  // The trunk that killed you, kept so the crash can be drawn with the ball buried behind it.
  hitTree: Tree | null
  inspect: InspectState
  trees: Tree[]
  treeFrom: number
  treeTo: number
  pops: Pop[]
  wobbles: Wobble[]
  trail: TrailPoint[]
  particles: Particle[]
  sprayAccumulator: number
  wallFlash: number
  wallFlashSide: 1 | -1
}

export const cameraY = (state: GameState): number => cameraYFor(state.y, finishY(state))

export const finishY = (state: GameState): number => state.course.lengthPx

export const distanceLeftM = (state: GameState): number =>
  Math.max(0, Math.round((finishY(state) - state.y) / PIXELS_PER_METRE))

export const levelProgress = (state: GameState): number =>
  Math.min(1, Math.max(0, state.y / Math.max(1, finishY(state))))

// Crashed or finished — either way the run is over and taps only restart it.
export const runOver = (state: GameState): boolean => state.dead || state.finished

// Counting in, crashed, finished or paused: all the states where physics must not advance.
export const runActive = (state: GameState): boolean =>
  state.started && !state.paused && !runOver(state)

export const createState = (tuning: TuningConfig, levelIndex: number): GameState => {
  const level = levelAt(levelIndex)
  const course = buildCourse(level)

  return {
    tuning,
    style: 'flat',
    screen: 'map',
    level,
    course,
    theme: level.theme,
    x: LOGICAL_WIDTH / 2,
    y: 0,
    prevX: LOGICAL_WIDTH / 2,
    prevY: 0,
    angle: 0,
    direction: 1,
    speed: tuning.baseSpeed,
    pressed: false,
    paused: false,
    dead: false,
    finished: false,
    started: false,
    countdown: 0,
    elapsed: 0,
    coast: 0,
    score: 0,
    bestScore: 0,
    bestReach: 0,
    combo: 0,
    comboTimer: 0,
    runCoins: 0,
    runDiamonds: 0,
    avalancheY: -AVALANCHE_LEAD_PX,
    freeze: 0,
    shake: 0,
    lastHit: null,
    hitTree: null,
    inspect: { on: false, zoom: 8, panX: 0, panY: 0 },
    trees: course.trees,
    treeFrom: 0,
    treeTo: 0,
    pops: [],
    wobbles: [],
    trail: [],
    particles: [],
    sprayAccumulator: 0,
    wallFlash: 0,
    wallFlashSide: 1,
  }
}

// Three ticks, but shorter than a second each: the count-in is a beat, not a wait.
export const COUNTDOWN_TICK_SECONDS = 0.55
export const COUNTDOWN_SECONDS = COUNTDOWN_TICK_SECONDS * 3

// Rebuilds the course from the level seed, so a retry is the exact same slope.
export const startLevel = (state: GameState, levelIndex: number): void => {
  state.level = levelAt(levelIndex)
  state.course = buildCourse(state.level)
  state.theme = state.level.theme
  state.trees = state.course.trees

  const { level, tuning } = state
  tuning.baseSpeed = level.baseSpeed
  tuning.maxSpeed = level.maxSpeed
  tuning.speedRampPer1000 = level.speedRampPer1000
  tuning.minGapPx = level.minGapPx
  tuning.finishDistanceM = level.distanceM

  resetRun(state)
}

export const resetRun = (state: GameState): void => {
  state.x = LOGICAL_WIDTH / 2
  state.y = 0
  state.prevX = state.x
  state.prevY = state.y
  state.angle = 0
  state.direction = 1
  state.speed = state.tuning.baseSpeed
  state.pressed = false
  state.dead = false
  state.finished = false
  state.started = false
  state.countdown = COUNTDOWN_SECONDS
  state.elapsed = 0
  state.coast = 0
  state.score = 0
  state.combo = 0
  state.comboTimer = 0
  state.runCoins = 0
  state.runDiamonds = 0
  state.avalancheY = -AVALANCHE_LEAD_PX
  state.freeze = 0
  state.shake = 0
  state.lastHit = null
  state.hitTree = null
  state.inspect.on = false
  state.inspect.panX = 0
  state.inspect.panY = 0
  state.treeFrom = 0
  state.treeTo = 0
  state.pops.length = 0
  state.wobbles.length = 0
  state.trail.length = 0
  state.particles.length = 0
  state.sprayAccumulator = 0
  state.wallFlash = 0

  for (const tree of state.course.trees) tree.grazed = false
  for (const collectible of state.course.collectibles) collectible.taken = false
  for (const rock of state.course.rocks) resetRock(rock)
}
