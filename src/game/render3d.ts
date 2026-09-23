import type { GameState } from './state.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, viewHeight } from './viewport.ts'

const HORIZON_Y = LOGICAL_HEIGHT * 0.28
const GROUND_Y = LOGICAL_HEIGHT * 0.86
const FOCAL = 620
const MAX_DISTANCE = 3_000
const BAND_SPACING = 240

const SKY = '#bcdcf5'
const SNOW = '#eef4fa'
const TRACK = '#d3e1ef'
const TREE_DARK = '#1f5138'
const TREE_LIGHT = '#357951'
const TRUNK = '#6b4a34'

type Projected = { x: number; y: number; p: number }

const project = (distance: number, worldX: number): Projected => {
  const p = FOCAL / (FOCAL + distance)
  return {
    p,
    x: LOGICAL_WIDTH / 2 + (worldX - LOGICAL_WIDTH / 2) * p,
    y: HORIZON_Y + (GROUND_Y - HORIZON_Y) * p,
  }
}

const drawBands = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const first = Math.ceil(state.y / BAND_SPACING) * BAND_SPACING
  for (let worldY = first; worldY - state.y < MAX_DISTANCE; worldY += BAND_SPACING) {
    const { y, p } = project(worldY - state.y, LOGICAL_WIDTH / 2)
    ctx.fillStyle = `rgba(190, 212, 232, ${0.35 * p})`
    ctx.fillRect(0, y, LOGICAL_WIDTH, Math.max(1, 6 * p))
  }
}

const drawTrail = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  if (state.trail.length < 2) return
  ctx.strokeStyle = TRACK
  ctx.lineCap = 'round'

  for (let i = 1; i < state.trail.length; i += 1) {
    const from = state.trail[i - 1]
    const to = state.trail[i]
    if (!from || !to) continue
    const a = project(from.y - state.y, from.x)
    const b = project(to.y - state.y, to.x)
    ctx.lineWidth = Math.max(1, state.tuning.ballRadius * 1.05 * b.p)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

const drawTrees = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const visible = state.trees
    .map((tree) => ({ tree, distance: tree.y - state.y }))
    .filter((item) => item.distance > -40 && item.distance < MAX_DISTANCE)
    .sort((a, b) => b.distance - a.distance)

  for (const { tree, distance } of visible) {
    const { x, y, p } = project(distance, tree.x)
    const height = tree.radius * 7 * p
    const halfWidth = tree.radius * 1.9 * p

    ctx.fillStyle = TRUNK
    ctx.fillRect(x - halfWidth * 0.14, y - height * 0.18, halfWidth * 0.28, height * 0.18)

    ctx.fillStyle = TREE_DARK
    ctx.beginPath()
    ctx.moveTo(x, y - height)
    ctx.lineTo(x + halfWidth, y - height * 0.16)
    ctx.lineTo(x - halfWidth, y - height * 0.16)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = TREE_LIGHT
    ctx.beginPath()
    ctx.moveTo(x, y - height * 0.92)
    ctx.lineTo(x + halfWidth * 0.72, y - height * 0.45)
    ctx.lineTo(x - halfWidth * 0.72, y - height * 0.45)
    ctx.closePath()
    ctx.fill()
  }
}

const drawParticles = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  for (const particle of state.particles) {
    const distance = particle.y - state.y
    if (distance < -400 || distance > MAX_DISTANCE) continue
    const { x, y, p } = project(distance, particle.x)
    ctx.fillStyle = `rgba(196, 216, 233, ${(particle.life / particle.maxLife) * 0.9})`
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0.5, particle.size * p), 0, Math.PI * 2)
    ctx.fill()
  }
}

const drawWallFlash = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  if (state.wallFlash <= 0) return
  const width = 16
  ctx.fillStyle = `rgba(239, 68, 68, ${state.wallFlash * 0.55})`
  ctx.fillRect(state.wallFlashSide === -1 ? 0 : LOGICAL_WIDTH - width, 0, width, viewHeight())
}

const drawBall = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const r = state.tuning.ballRadius
  const { x, y } = project(0, state.x)

  ctx.fillStyle = 'rgba(80, 110, 140, 0.2)'
  ctx.beginPath()
  ctx.ellipse(x, y + 4, r * 1.2, r * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#9fb3c8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

export const render3d = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  ctx.fillStyle = SKY
  ctx.fillRect(0, 0, LOGICAL_WIDTH, HORIZON_Y)
  ctx.fillStyle = SNOW
  ctx.fillRect(0, HORIZON_Y, LOGICAL_WIDTH, viewHeight() - HORIZON_Y)

  drawBands(ctx, state)
  drawTrail(ctx, state)
  drawParticles(ctx, state)
  drawTrees(ctx, state)
  drawBall(ctx, state)
  drawWallFlash(ctx, state)
}
