import { treeHitExtents } from './collision.ts'
import { finishY, TRUNK_HALF_SCALE, type GameState, type Tree } from './state.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './viewport.ts'

const SNOW = '#faf7f0'
const TRACK = '#f0e5bd'
const TREE_DARK = '#2f4f43'
const TREE_LIGHT = '#4c6a5c'
const TRUNK_DARK = '#63452c'
const TRUNK_LIGHT = '#7a5638'
const CAST = 'rgba(18, 40, 34, 0.3)'
const SHADOW = 'rgba(126, 124, 118, 0.22)'
const BALL = '#f5a623'
const BALL_EDGE = '#d98a10'
const SPRAY = 'rgba(214, 212, 205, '

// Shadows are a flattened copy of the pine sheared down-left, away from the sun on the right.
const TREE_SHADOW = 'rgba(122, 120, 114, 0.16)'
const SHADOW_SHEAR = 0.85
const SHADOW_FLATTEN = -0.4
// Blurring per tree per frame costs far too much, so the shape is blurred once at this radius and
// blitted scaled — which also makes a bigger tree's shadow proportionally softer.
const SHADOW_REF = 56
const SHADOW_BLUR = 18
const SHADOW_PAD = SHADOW_BLUR * 3

const drawTrail = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  if (state.trail.length < 2) return

  ctx.strokeStyle = TRACK
  ctx.lineWidth = state.tuning.ballRadius * 1.05
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  const first = state.trail[0]
  if (!first) return
  ctx.moveTo(first.x, first.y - camY)
  for (let i = 1; i < state.trail.length; i += 1) {
    const point = state.trail[i]
    if (point) ctx.lineTo(point.x, point.y - camY)
  }
  ctx.lineTo(state.x, state.y - camY)
  ctx.stroke()
}

// Sorted so a nearer pine overlaps the one behind it; the jittered spawn y isn't ordered.
const visibleTrees = (state: GameState, camY: number): Tree[] =>
  state.trees
    .filter((tree) => {
      const screenY = tree.y - camY
      return screenY > -160 && screenY < LOGICAL_HEIGHT + 60
    })
    .sort((a, b) => a.y - b.y)

// Tree shape, tuned in mockups/tree5.html. Every number is a multiple of the tree's radius.
type Tier = { base: number; height: number; spread: number }
const TIERS_2: Tier[] = [
  { base: 0.5, height: 1.34, spread: 0.82 },
  { base: 1.32, height: 1.35, spread: 0.7 },
]
const TIERS_3: Tier[] = [
  { base: 0.5, height: 1.02, spread: 0.82 },
  { base: 0.99, height: 1, spread: 0.71 },
  { base: 1.5, height: 0.98, spread: 0.56 },
]
// Big trees get the extra tier; small ones can't spare the pixels for it (radii run 10–19).
const THREE_TIER_RADIUS = 14.5
const tiersFor = (radius: number): Tier[] => (radius >= THREE_TIER_RADIUS ? TIERS_3 : TIERS_2)

const TRUNK_VISIBLE = 0.6
const TRUNK_OVERLAP = 0.3
// How much of each cone's round base the camera sees. The curve bulges down to `base`, so raising
// it never sinks a tier onto the trunk.
const CONE_DEPTH = 0.26
const CAST_X = -0.22
const CAST_Y = 0.1

const tierPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
  tier: Tier,
): void => {
  const rx = tier.spread * r
  const ry = rx * CONE_DEPTH
  const cy = groundY - tier.base * r - ry
  ctx.beginPath()
  ctx.moveTo(x, groundY - (tier.base + tier.height) * r)
  ctx.lineTo(x + rx, cy)
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI)
  ctx.closePath()
}

// Sun is off to the right, so the lit face is the cone's right half.
const tierLitPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
  tier: Tier,
): void => {
  const rx = tier.spread * r
  const ry = rx * CONE_DEPTH
  const cy = groundY - tier.base * r - ry
  ctx.beginPath()
  ctx.moveTo(x, groundY - (tier.base + tier.height) * r)
  ctx.lineTo(x + rx, cy)
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI / 2)
  ctx.closePath()
}

const trunkRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
): void => {
  const half = r * TRUNK_HALF_SCALE
  const top = groundY - (TRUNK_VISIBLE + TRUNK_OVERLAP) * r
  ctx.beginPath()
  ctx.rect(x - half, top, half * 2, groundY - top)
}

// The tier above dropped onto this tier's branches, thrown the same way as the snow shadow.
const drawCast = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
  tier: Tier,
  above: Tier,
): void => {
  const rx = above.spread * r
  const ry = rx * CONE_DEPTH
  ctx.save()
  tierPath(ctx, x, groundY, r, tier)
  ctx.clip()
  ctx.fillStyle = CAST
  ctx.beginPath()
  ctx.ellipse(x + CAST_X * rx, groundY - above.base * r - ry + CAST_Y * r, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

type ShadowSprite = { canvas: HTMLCanvasElement; originX: number; originY: number }

const createShadowSprite = (tiers: Tier[]): ShadowSprite => {
  const top = tiers[tiers.length - 1]
  const bottom = tiers[0]
  if (!top || !bottom) throw new Error('a tree needs at least one tier')

  const tip = (top.base + top.height) * SHADOW_REF
  const halfWidth = bottom.spread * SHADOW_REF
  const minX = -halfWidth - SHADOW_SHEAR * tip
  const maxY = -SHADOW_FLATTEN * tip

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(halfWidth - minX + SHADOW_PAD * 2)
  canvas.height = Math.ceil(maxY + SHADOW_PAD * 2)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const originX = -minX + SHADOW_PAD
  const originY = SHADOW_PAD
  ctx.filter = `blur(${SHADOW_BLUR}px)`
  ctx.translate(originX, originY)
  ctx.transform(1, 0, SHADOW_SHEAR, SHADOW_FLATTEN, 0, 0)
  ctx.fillStyle = TREE_SHADOW
  trunkRect(ctx, 0, 0, SHADOW_REF)
  ctx.fill()
  for (const tier of tiers) {
    tierPath(ctx, 0, 0, SHADOW_REF, tier)
    ctx.fill()
  }

  return { canvas, originX, originY }
}

const shadowSprites = new Map<Tier[], ShadowSprite>([
  [TIERS_2, createShadowSprite(TIERS_2)],
  [TIERS_3, createShadowSprite(TIERS_3)],
])

const drawShadow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  radius: number,
): void => {
  const sprite = shadowSprites.get(tiersFor(radius))
  if (!sprite) return
  const scale = radius / SHADOW_REF
  const { canvas, originX, originY } = sprite
  ctx.drawImage(
    canvas,
    x - originX * scale,
    groundY - originY * scale,
    canvas.width * scale,
    canvas.height * scale,
  )
}

const drawPine = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  radius: number,
): void => {
  const trunkHalf = radius * TRUNK_HALF_SCALE
  const trunkTop = groundY - (TRUNK_VISIBLE + TRUNK_OVERLAP) * radius
  ctx.fillStyle = TRUNK_DARK
  ctx.fillRect(x - trunkHalf, trunkTop, trunkHalf * 2, groundY - trunkTop)
  ctx.fillStyle = TRUNK_LIGHT
  ctx.fillRect(x, trunkTop, trunkHalf, groundY - trunkTop)

  const tiers = tiersFor(radius)
  tiers.forEach((tier, index) => {
    ctx.fillStyle = TREE_DARK
    tierPath(ctx, x, groundY, radius, tier)
    ctx.fill()
    ctx.fillStyle = TREE_LIGHT
    tierLitPath(ctx, x, groundY, radius, tier)
    ctx.fill()

    const above = tiers[index + 1]
    if (above) drawCast(ctx, x, groundY, radius, tier, above)
  })
}

const FINISH_CHECK = '#3f4a5a'
const FINISH_TAPE = '#efe9db'
const FINISH_SQUARE = 12
const FINISH_ROWS = 2

// Checkered tape laid flat on the snow, so the trail runs over it rather than under.
const drawFinish = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const band = FINISH_SQUARE * FINISH_ROWS
  const top = finishY(state) - camY - band / 2
  if (top > LOGICAL_HEIGHT || top + band < 0) return

  ctx.fillStyle = FINISH_TAPE
  ctx.fillRect(0, top, LOGICAL_WIDTH, band)

  ctx.fillStyle = FINISH_CHECK
  for (let row = 0; row < FINISH_ROWS; row += 1) {
    for (let col = row % 2; col * FINISH_SQUARE < LOGICAL_WIDTH; col += 2) {
      ctx.fillRect(col * FINISH_SQUARE, top + row * FINISH_SQUARE, FINISH_SQUARE, FINISH_SQUARE)
    }
  }
}

const drawParticles = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  for (const particle of state.particles) {
    const screenY = particle.y - camY
    if (screenY < -20 || screenY > LOGICAL_HEIGHT + 20) continue
    ctx.fillStyle = `${SPRAY}${(particle.life / particle.maxLife) * 0.9})`
    ctx.beginPath()
    ctx.arc(particle.x, screenY, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

const drawWallFlash = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  if (state.wallFlash <= 0) return
  const width = 16
  ctx.fillStyle = `rgba(239, 68, 68, ${state.wallFlash * 0.55})`
  ctx.fillRect(state.wallFlashSide === -1 ? 0 : LOGICAL_WIDTH - width, 0, width, LOGICAL_HEIGHT)
}

const drawBall = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const screenY = state.y - camY
  const r = state.tuning.ballRadius

  ctx.fillStyle = SHADOW
  ctx.beginPath()
  ctx.ellipse(state.x - r * 0.7, screenY + r * 0.45, r * 1.1, r * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = BALL
  ctx.strokeStyle = BALL_EDGE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(state.x, screenY, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

const HITBOX = 'rgba(239, 68, 68, 0.75)'
const STEP_LINE = 'rgba(37, 99, 235, 0.9)'

// Inspect overlay: the lethal ellipse around every trunk plus the exact step that killed the run.
const drawHitboxes = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.lineWidth = 0.5
  ctx.strokeStyle = HITBOX

  for (const tree of visibleTrees(state, camY)) {
    const { rx, ry } = treeHitExtents(state, tree)
    ctx.beginPath()
    ctx.ellipse(tree.x, tree.y - camY, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  const hit = state.lastHit
  if (!hit) return

  ctx.strokeStyle = STEP_LINE
  ctx.beginPath()
  ctx.moveTo(hit.step.fromX, hit.step.fromY - camY)
  ctx.lineTo(hit.step.toX, hit.step.toY - camY)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(hit.ball.x, hit.ball.y - camY, hit.ball.radius, 0, Math.PI * 2)
  ctx.stroke()
}

const applyInspect = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const { zoom, panX, panY } = state.inspect
  const focusX = state.lastHit?.ball.x ?? state.x
  const focusY = (state.lastHit?.ball.y ?? state.y) - camY
  ctx.translate(LOGICAL_WIDTH / 2 + panX, LOGICAL_HEIGHT / 2 + panY)
  ctx.scale(zoom, zoom)
  ctx.translate(-focusX, -focusY)
}

export const render = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.fillStyle = SNOW
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.save()
  if (state.inspect.on) applyInspect(ctx, state, camY)

  drawFinish(ctx, state, camY)
  drawTrail(ctx, state, camY)
  drawParticles(ctx, state, camY)

  const visible = visibleTrees(state, camY)
  for (const tree of visible) drawShadow(ctx, tree.x, tree.y - camY, tree.radius)

  // Pines the ball has passed go under it; pines still ahead draw over it, so clipping a canopy
  // reads as ducking under the branches rather than crashing.
  for (const tree of visible) {
    if (tree.y <= state.y) drawPine(ctx, tree.x, tree.y - camY, tree.radius)
  }
  drawBall(ctx, state, camY)
  for (const tree of visible) {
    if (tree.y > state.y) drawPine(ctx, tree.x, tree.y - camY, tree.radius)
  }

  if (state.inspect.on) drawHitboxes(ctx, state, camY)
  ctx.restore()

  drawWallFlash(ctx, state)
}
