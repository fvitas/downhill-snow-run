import type { TuningConfig } from './config.ts'
import { BALL_SCREEN_Y, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './viewport.ts'

export type Tree = {
  x: number
  y: number
  radius: number
  rotation: number
  shade: number
}

// Trunk half-width as a fraction of the canopy radius. The renderer and the hitbox share it so
// the pole you see is the pole you hit — branches are decoration.
export const TRUNK_HALF_SCALE = 0.165

export const PIXELS_PER_METRE = 10

export type TrailPoint = { x: number; y: number }

export type RenderStyle = 'faux3d' | 'flat'

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

// Everything needed to re-judge a crash after the fact, and to draw it magnified.
export type HitRecord = {
  kind: 'tree' | 'wall'
  score: number
  speed: number
  angleDeg: number
  ball: { x: number; y: number; radius: number }
  step: { fromX: number; fromY: number; toX: number; toY: number }
  tree: { x: number; y: number; radius: number; rx: number; ry: number } | null
}

export type InspectState = { on: boolean; zoom: number; panX: number; panY: number }

export type GameState = {
  tuning: TuningConfig
  style: RenderStyle
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
  elapsed: number
  bestTime: number
  score: number
  best: number
  lastHit: HitRecord | null
  inspect: InspectState
  trees: Tree[]
  trail: TrailPoint[]
  particles: Particle[]
  sprayAccumulator: number
  wallFlash: number
  wallFlashSide: 1 | -1
  nextSpawnY: number
}

export const cameraY = (state: GameState): number => state.y - LOGICAL_HEIGHT * BALL_SCREEN_Y

export const finishY = (state: GameState): number =>
  state.tuning.finishDistanceM * PIXELS_PER_METRE

// Crashed or finished — either way the run is over and taps only restart it.
export const runOver = (state: GameState): boolean => state.dead || state.finished

export const createState = (tuning: TuningConfig): GameState => ({
  tuning,
  style: 'flat',
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
  elapsed: 0,
  bestTime: 0,
  score: 0,
  best: 0,
  lastHit: null,
  inspect: { on: false, zoom: 8, panX: 0, panY: 0 },
  trees: [],
  trail: [],
  particles: [],
  sprayAccumulator: 0,
  wallFlash: 0,
  wallFlashSide: 1,
  nextSpawnY: 0,
})

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
  state.elapsed = 0
  state.score = 0
  state.lastHit = null
  state.inspect.on = false
  state.inspect.panX = 0
  state.inspect.panY = 0
  state.trees.length = 0
  state.trail.length = 0
  state.particles.length = 0
  state.sprayAccumulator = 0
  state.wallFlash = 0
  state.nextSpawnY = LOGICAL_HEIGHT * 0.6
}
