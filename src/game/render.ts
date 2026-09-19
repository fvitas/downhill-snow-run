import { treeHitExtents } from './collision.ts'
import { finishY, TRUNK_HALF_SCALE, type GameState, type Theme, type Tree } from './state.ts'
import { visibleRocks } from './rocks.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './viewport.ts'

const drawTrail = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  if (state.trail.length < 2) return

  ctx.strokeStyle = state.theme.trail
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

// Already sorted by y in the course, so the window is drawn back to front as it stands.
const visibleTrees = (state: GameState): Tree[] => state.trees.slice(state.treeFrom, state.treeTo)

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

// Shadows are a flattened copy of the pine sheared down-left, away from the sun on the right.
const SHADOW_SHEAR = 0.85
const SHADOW_FLATTEN = -0.4
// Blurring per tree per frame costs far too much, so the shape is blurred once at this radius and
// blitted scaled — which also makes a bigger tree's shadow proportionally softer.
const SHADOW_REF = 56
const SHADOW_BLUR = 18
const SHADOW_PAD = SHADOW_BLUR * 3

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
  theme: Theme,
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
  ctx.fillStyle = theme.cast
  ctx.beginPath()
  ctx.ellipse(x + CAST_X * rx, groundY - above.base * r - ry + CAST_Y * r, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

type ShadowSprite = { canvas: HTMLCanvasElement; originX: number; originY: number }

const createShadowSprite = (tiers: Tier[], colour: string): ShadowSprite => {
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
  ctx.fillStyle = colour
  trunkRect(ctx, 0, 0, SHADOW_REF)
  ctx.fill()
  for (const tier of tiers) {
    tierPath(ctx, 0, 0, SHADOW_REF, tier)
    ctx.fill()
  }

  return { canvas, originX, originY }
}

// One blurred sprite per tier-set per theme colour, built the first time that theme is played.
const shadowSprites = new Map<string, ShadowSprite>()

const shadowSprite = (tiers: Tier[], colour: string): ShadowSprite => {
  const key = `${tiers === TIERS_3 ? 3 : 2}:${colour}`
  const existing = shadowSprites.get(key)
  if (existing) return existing
  const sprite = createShadowSprite(tiers, colour)
  shadowSprites.set(key, sprite)
  return sprite
}

const drawShadow = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  groundY: number,
  radius: number,
): void => {
  const sprite = shadowSprite(tiersFor(radius), theme.shadow)
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
  theme: Theme,
  x: number,
  groundY: number,
  radius: number,
): void => {
  const trunkHalf = radius * TRUNK_HALF_SCALE
  const trunkTop = groundY - (TRUNK_VISIBLE + TRUNK_OVERLAP) * radius
  ctx.fillStyle = theme.trunkDark
  ctx.fillRect(x - trunkHalf, trunkTop, trunkHalf * 2, groundY - trunkTop)
  ctx.fillStyle = theme.trunkLight
  ctx.fillRect(x, trunkTop, trunkHalf, groundY - trunkTop)

  const tiers = tiersFor(radius)
  tiers.forEach((tier, index) => {
    ctx.fillStyle = theme.treeDark
    tierPath(ctx, x, groundY, radius, tier)
    ctx.fill()
    ctx.fillStyle = theme.treeLight
    tierLitPath(ctx, x, groundY, radius, tier)
    ctx.fill()

    const above = tiers[index + 1]
    if (above) drawCast(ctx, theme, x, groundY, radius, tier, above)
  })
}

const WOBBLE_SECONDS = 1
const WOBBLE_RADIANS = 0.13
const WOBBLE_HZ = 26
const WOBBLE_DECAY = 5

// Sways about the trunk base, so the tip travels and the roots don't.
const drawTreeAt = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  tree: Tree,
  camY: number,
): void => {
  const groundY = tree.y - camY
  const wobble = state.wobbles.find((entry) => entry.tree === tree)
  if (!wobble) {
    drawPine(ctx, state.theme, tree.x, groundY, tree.radius)
    return
  }

  const lean =
    Math.sin(wobble.age * WOBBLE_HZ) * WOBBLE_RADIANS * Math.exp(-wobble.age * WOBBLE_DECAY)
  ctx.save()
  ctx.translate(tree.x, groundY)
  ctx.rotate(lean * -wobble.side)
  drawPine(ctx, state.theme, 0, 0, tree.radius)
  ctx.restore()
}

const COIN_RADIUS = 11
const COIN_FILL = '#f7c948'
const COIN_EDGE = '#c9971f'
const DIAMOND_FILL = '#6fd3e8'
const DIAMOND_EDGE = '#2f93ad'

const drawCollectibles = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camY: number,
): void => {
  for (const item of state.course.collectibles) {
    if (item.taken) continue
    const screenY = item.y - camY
    if (screenY < -30 || screenY > LOGICAL_HEIGHT + 30) continue

    if (item.kind === 'coin') {
      ctx.fillStyle = COIN_FILL
      ctx.strokeStyle = COIN_EDGE
      ctx.lineWidth = 2
      ctx.beginPath()
      // Squashed across, so a row of them reads as spinning discs lying on the snow.
      ctx.ellipse(item.x, screenY, COIN_RADIUS * 0.72, COIN_RADIUS, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      continue
    }

    ctx.fillStyle = DIAMOND_FILL
    ctx.strokeStyle = DIAMOND_EDGE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(item.x, screenY - COIN_RADIUS * 1.2)
    ctx.lineTo(item.x + COIN_RADIUS, screenY)
    ctx.lineTo(item.x, screenY + COIN_RADIUS * 1.2)
    ctx.lineTo(item.x - COIN_RADIUS, screenY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

const AVALANCHE_BODY = '#e8eef4'
const AVALANCHE_EDGE = '#c3d0dd'
const AVALANCHE_DUST = 'rgba(255, 255, 255, 0.75)'
const AVALANCHE_LUMPS = 9

// A wall of snow filling everything above its leading edge, with a lumpy front that churns as
// it moves. Drawn over the trees: whatever it has reached is buried.
const drawAvalanche = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  if (!state.level.avalanche) return
  const edge = state.avalancheY - camY
  if (edge < -240) return

  ctx.fillStyle = AVALANCHE_BODY
  ctx.fillRect(0, -240, LOGICAL_WIDTH, edge + 240)

  const step = LOGICAL_WIDTH / AVALANCHE_LUMPS
  const churn = state.y * 0.02
  ctx.fillStyle = AVALANCHE_BODY
  ctx.beginPath()
  for (let i = 0; i <= AVALANCHE_LUMPS; i += 1) {
    const bulge = 22 + Math.sin(churn + i * 1.7) * 14
    ctx.arc(i * step, edge, bulge, 0, Math.PI * 2)
  }
  ctx.fill()

  ctx.strokeStyle = AVALANCHE_EDGE
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let i = 0; i <= AVALANCHE_LUMPS; i += 1) {
    const bulge = 22 + Math.sin(churn + i * 1.7) * 14
    ctx.moveTo(i * step + bulge, edge)
    ctx.arc(i * step, edge, bulge, 0, Math.PI)
  }
  ctx.stroke()

  // Puffs thrown out ahead of the front, so it reads as moving rather than as a curtain.
  ctx.fillStyle = AVALANCHE_DUST
  for (let i = 0; i < AVALANCHE_LUMPS; i += 1) {
    const phase = churn * 1.6 + i * 2.3
    const radius = 9 + Math.sin(phase) * 5
    ctx.beginPath()
    ctx.arc(i * step + step / 2, edge + 26 + Math.sin(phase * 1.3) * 16, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

const ROCK_FILL = '#6b6660'
const ROCK_DARK = '#4e4a45'
const ROCK_EDGE = '#3a3733'
const ROCK_FACETS = 7

// A lumpy polygon rather than a circle: the facets are what make the spin readable.
const drawRocks = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  for (const rock of visibleRocks(state, camY)) {
    const screenY = rock.y - camY

    ctx.fillStyle = state.theme.shadow
    ctx.beginPath()
    ctx.ellipse(rock.x + 3, screenY + rock.radius * 0.55, rock.radius, rock.radius * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(rock.x, screenY)
    ctx.rotate(rock.angle)

    ctx.beginPath()
    for (let i = 0; i < ROCK_FACETS; i += 1) {
      const a = (i / ROCK_FACETS) * Math.PI * 2
      const r = rock.radius * (i % 2 === 0 ? 1 : 0.86)
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fillStyle = ROCK_FILL
    ctx.fill()
    ctx.strokeStyle = ROCK_EDGE
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(rock.radius * 0.22, rock.radius * 0.24, rock.radius * 0.45, 0, Math.PI * 2)
    ctx.fillStyle = ROCK_DARK
    ctx.fill()
    ctx.restore()
  }
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
    ctx.fillStyle = `rgba(255, 255, 255, ${(particle.life / particle.maxLife) * 0.9})`
    ctx.beginPath()
    ctx.arc(particle.x, screenY, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

const POP_RISE = 46

const drawPops = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.textAlign = 'center'
  ctx.font = '700 26px system-ui, sans-serif'
  for (const pop of state.pops) {
    const screenY = pop.y - camY - (1 - pop.life) * POP_RISE
    if (screenY < -40 || screenY > LOGICAL_HEIGHT + 40) continue
    ctx.globalAlpha = Math.max(0, Math.min(1, pop.life * 1.4))
    ctx.fillStyle = state.theme.ball
    ctx.fillText(pop.text, pop.x, screenY)
  }
  ctx.globalAlpha = 1
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

  ctx.fillStyle = state.theme.shadow
  ctx.beginPath()
  ctx.ellipse(state.x - r * 0.7, screenY + r * 0.45, r * 1.1, r * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = state.theme.ball
  ctx.strokeStyle = state.theme.ballEdge
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(state.x, screenY, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

const HITBOX = 'rgba(239, 68, 68, 0.75)'
const STEP_LINE = 'rgba(37, 99, 235, 0.9)'

// Crash-site overlay: the lethal ellipse around every trunk plus the exact step that killed the run.
const drawHitboxes = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.lineWidth = 0.5
  ctx.strokeStyle = HITBOX

  for (const tree of visibleTrees(state)) {
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

const SHAKE_PX = 7

export const render = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.fillStyle = state.theme.snow
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.save()
  if (state.shake > 0 && !state.inspect.on) {
    const kick = state.shake * SHAKE_PX
    ctx.translate((Math.random() - 0.5) * kick, (Math.random() - 0.5) * kick)
  }
  if (state.inspect.on) applyInspect(ctx, state, camY)

  drawFinish(ctx, state, camY)
  drawTrail(ctx, state, camY)
  drawCollectibles(ctx, state, camY)
  drawParticles(ctx, state, camY)

  const visible = visibleTrees(state)
  for (const tree of visible) drawShadow(ctx, state.theme, tree.x, tree.y - camY, tree.radius)

  // Pines the ball has passed go under it; pines still ahead draw over it, so clipping a canopy
  // reads as ducking under the branches rather than crashing. The trunk you crashed into is the
  // exception: it always draws over the ball, so the crash reads as hitting it, not landing on it.
  for (const tree of visible) {
    if (tree.y <= state.y && tree !== state.hitTree) drawTreeAt(ctx, state, tree, camY)
  }
  drawBall(ctx, state, camY)
  for (const tree of visible) {
    if (tree.y > state.y || tree === state.hitTree) drawTreeAt(ctx, state, tree, camY)
  }
  drawRocks(ctx, state, camY)
  drawAvalanche(ctx, state, camY)

  drawPops(ctx, state, camY)
  if (state.inspect.on) drawHitboxes(ctx, state, camY)
  ctx.restore()

  drawWallFlash(ctx, state)
}

export const stepEffects = (state: GameState, dt: number): void => {
  for (const wobble of state.wobbles) wobble.age += dt
  while (state.wobbles.length > 0 && (state.wobbles[0]?.age ?? 0) > WOBBLE_SECONDS) {
    state.wobbles.shift()
  }

  for (const pop of state.pops) pop.life -= dt * 0.9
  while (state.pops.length > 0 && (state.pops[0]?.life ?? 0) <= 0) state.pops.shift()

  state.shake = Math.max(0, state.shake - dt * 4)
  state.freeze = Math.max(0, state.freeze - dt)
  state.wallFlash = Math.max(0, state.wallFlash - dt * 2.5)
}
