import { paintBall, stillBall, tintOf, type BallEnv, type SkinId } from '../game/skins.ts'
import { UI_THEME } from '../game/themes.ts'
import {
  createTrailFx,
  drawTrailFront,
  drawTrailFx,
  drawTrailPath,
  emitTrailFx,
  trailHead,
  type TrailEnv,
  type TrailId,
} from '../game/trails.ts'
import type { Look } from '../game/unlocks.ts'
import type { TrailPoint } from '../game/world.ts'

// The tile is too short to show a rainbow at the slope's rate, so it runs the spectrum faster.
const TILE_HUE_PER_PX = 8
const TRAIL_BALL_PER_PX = 5 / 44
const BALL_PER_PX = 13 / 36

export const sizedCanvas = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] => {
  const dpr = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  ctx?.scale(dpr, dpr)
  return [canvas, ctx]
}

export const trailEnvFor = (ball: SkinId, r: number, hueRate: number, ballEnv: BallEnv, ang: number): TrailEnv => ({
  r,
  theme: UI_THEME,
  tint: tintOf(ball, UI_THEME),
  t: ballEnv.t,
  ang,
  heading: ballEnv.heading,
  hueRate,
  heat: ballEnv.heat,
  fright: ballEnv.fright,
  paintBall: (ctx, x, y, radius) => paintBall(ctx, ball, x, y, radius, ballEnv),
})

// An S down the tile, so a trail shows how it bends as well as its colour.
const sCurve = (size: number): TrailPoint[] => {
  const points: TrailPoint[] = []
  for (let y = size * 0.11; y <= size * 0.8; y += 3) {
    points.push(trailHead(points, size / 2 + Math.sin((y / size) * Math.PI * 2) * size * 0.22, y))
  }
  return points
}

const drawTrailTile = (ctx: CanvasRenderingContext2D, id: TrailId, ball: SkinId, size: number): void => {
  const points = sCurve(size)
  const head = points.pop()
  const before = points[points.length - 1]
  if (!head || !before) return
  const r = size * TRAIL_BALL_PER_PX
  const still = stillBall(UI_THEME)
  // A tile is one still frame, so the trails that react to the run show them mid-combo, just after a near miss.
  const env = { ...trailEnvFor(ball, r, TILE_HUE_PER_PX, still, Math.atan2(head.y - before.y, head.x - before.x)), heat: 0.7, fright: 1 }
  drawTrailPath(ctx, id, points, head, 0, env)
  const fx = createTrailFx()
  let previous = points[0]
  for (const point of points) {
    if (previous) emitTrailFx(fx, id, point.x, point.y, point.d - previous.d, env)
    previous = point
  }
  drawTrailFx(ctx, fx, 0, size, env)
  paintBall(ctx, ball, head.x, head.y, r, still)
  drawTrailFront(ctx, id, points, head, 0, env)
}

// A trail tile ends in `ball`, so both picks are seen together.
export const drawLookTile = (ctx: CanvasRenderingContext2D, look: Look, ball: SkinId, size: number): void => {
  ctx.clearRect(0, 0, size, size)
  if (look.kind === 'ball') paintBall(ctx, look.id, size / 2, size / 2, size * BALL_PER_PX, stillBall(UI_THEME))
  else drawTrailTile(ctx, look.id, ball, size)
}
