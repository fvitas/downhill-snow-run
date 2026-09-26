import { drawHazardOver, drawHazardStanding, drawHazardUnder, hazardReach } from './hazard-art.ts'
import { airPose, type AirPose } from './hazards.ts'
import { drawPine, drawShadow } from './pine.ts'
import { drawChips, drawGhostTrail, drawHelmetOn, drawPickup, drawShards, ghostAlpha } from './power-art.ts'
import { treeHitExtents } from './scoring.ts'
import { finishY, type GameState, type Hazard, type ParticleKind, type Tree } from './state.ts'
import { visibleRocks } from './rocks.ts'
import { setting } from './settings.ts'
import { axisAngle, drawStone, ROCK_PALETTE, stoneFor } from './stone.ts'
import { LOGICAL_WIDTH, viewHeight } from './viewport.ts'

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

// Rolls about the axis across its travel, one radian per radius covered, like the mockup's stone.
const drawRocks = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  for (const rock of visibleRocks(state, camY)) {
    const speed = Math.hypot(rock.vx, rock.vy) || 1
    const pose = axisAngle([-rock.vy / speed, rock.vx / speed, 0], rock.angle)
    const stone = stoneFor(Math.floor(rock.spawnY) ^ 0x3d)
    drawStone(ctx, stone, pose, rock.x, rock.y - camY, rock.radius, ROCK_PALETTE, state.theme.shadow)
  }
}

const FINISH_CHECK = '#1d232b'
const FINISH_TAPE = '#ffffff'
const FINISH_SQUARE = 12
const FINISH_ROWS = 2

// Checkered tape laid flat on the snow, so the trail runs over it rather than under.
const drawFinish = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const band = FINISH_SQUARE * FINISH_ROWS
  const top = finishY(state) - camY - band / 2
  if (top > viewHeight() || top + band < 0) return

  ctx.fillStyle = FINISH_TAPE
  ctx.fillRect(0, top, LOGICAL_WIDTH, band)

  ctx.fillStyle = FINISH_CHECK
  for (let row = 0; row < FINISH_ROWS; row += 1) {
    for (let col = row % 2; col * FINISH_SQUARE < LOGICAL_WIDTH; col += 2) {
      ctx.fillRect(col * FINISH_SQUARE, top + row * FINISH_SQUARE, FINISH_SQUARE, FINISH_SQUARE)
    }
  }
}

// Spray goes down with the slope, under the ball that threw it; crash clods go over the top of
// the wreck, so the snow is still readable with the ball buried behind a trunk.
const drawParticles = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camY: number,
  kind: ParticleKind,
): void => {
  for (const particle of state.particles) {
    if (particle.kind !== kind) continue
    const screenY = particle.y - camY
    if (screenY < -20 || screenY > viewHeight() + 20) continue
    ctx.globalAlpha = (particle.life / particle.maxLife) * 0.9
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(particle.x, screenY, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

const POP_RISE = 46

const drawPops = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.textAlign = 'center'
  ctx.font = '700 26px system-ui, sans-serif'
  for (const pop of state.pops) {
    const screenY = pop.y - camY - (1 - pop.life) * POP_RISE
    if (screenY < -40 || screenY > viewHeight() + 40) continue
    ctx.globalAlpha = Math.max(0, Math.min(1, pop.life * 1.4))
    ctx.fillStyle = pop.tone === 'ink' ? state.theme.ink : state.theme.ball
    ctx.fillText(pop.text, pop.x, screenY)
  }
  ctx.globalAlpha = 1
}

// Over a jump the ball swells as it climbs the ramp, then lifts off its shadow for the flight.
const drawBall = (ctx: CanvasRenderingContext2D, state: GameState, camY: number, air: AirPose | null): void => {
  const screenY = state.y - camY
  const base = state.tuning.ballRadius
  const lift = air?.lift ?? 0
  const r = base * (air?.scale ?? 1)
  const shrink = 1 - lift / 170

  ctx.fillStyle = state.theme.shadow
  ctx.beginPath()
  ctx.ellipse(state.x - base * 0.7 - lift * 0.3, screenY + base * 0.45, base * 1.1 * shrink, base * 0.55 * shrink, 0, 0, Math.PI * 2)
  ctx.fill()

  // Blinks after a save, so the shield's half second reads without another chip.
  if (state.shield > 0 && Math.sin(state.elapsed * 40) > 0) return

  const y = screenY - lift
  if (state.ghost > 0) drawGhostTrail(ctx, state, state.x, y)
  ctx.save()
  ctx.globalAlpha = ghostAlpha(state)
  ctx.fillStyle = state.theme.ball
  ctx.strokeStyle = state.theme.ballEdge
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(state.x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
  if (state.helmet) drawHelmetOn(ctx, state, state.x, y, r)
}

// How wide the drift is and how far its flat base sits below the ball, both in ball radii. The
// base is buried, so only the dome's crown ever shows.
const DRIFT_RADIUS = 1.7
const DRIFT_SINK = 1.6

// The wreck goes into a drift at the trunk's root or against the wall: a dome of plain slope snow
// over the ball, so only its crown is left showing. Drawn in the background colour, so it reads as
// the ball sinking in rather than as a shape laid on top of it.
const drawDrift = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const tree = state.hitTree
  if (!tree && state.lastHit?.kind !== 'wall') return
  // The shake decays from 1 over a quarter second, which is exactly the drift's rise.
  const rise = 1 - state.shake
  if (rise <= 0) return

  const r = state.tuning.ballRadius
  const baseY = state.y - camY + r * DRIFT_SINK
  const radius = r * DRIFT_RADIUS * rise

  ctx.fillStyle = state.theme.snow
  ctx.beginPath()
  ctx.arc(state.x, baseY, radius, Math.PI, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  if (!tree) return

  // Opaque snow resets the patch it covers, erasing that patch's share of the trunk's shadow.
  // Clipping the shadow back inside the dome restores it without doubling it up anywhere else,
  // which would darken the trunk's base into murk and leave the pine looking cut short.
  ctx.save()
  ctx.clip()
  drawShadow(ctx, state.theme, tree.x, tree.y - camY, tree.radius)
  ctx.restore()
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

// At reveal 0 the focus is the screen centre and the transform is the identity, so the view starts
// exactly on the frozen slope the end card was covering.
const applyInspect = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const { zoom, reveal, panX, panY } = state.inspect
  const ballX = state.lastHit?.ball.x ?? state.x
  const ballY = (state.lastHit?.ball.y ?? state.y) - camY
  const focusX = LOGICAL_WIDTH / 2 + (ballX - LOGICAL_WIDTH / 2) * reveal
  const focusY = viewHeight() / 2 + (ballY - viewHeight() / 2) * reveal
  ctx.translate(LOGICAL_WIDTH / 2 + panX, viewHeight() / 2 + panY)
  ctx.scale(zoom, zoom)
  ctx.translate(-focusX, -focusY)
}

const onScreen = (y: number, reach: number): boolean => y > -reach && y < viewHeight() + reach

const visibleHazards = (state: GameState, camY: number): Hazard[] =>
  state.course.hazards.filter((hazard) => onScreen(hazard.y - camY, hazardReach(hazard)))

type Standing = { y: number; tree: Tree | null; draw: () => void }

// Pines, obstacles and pickups share one back-to-front order, so a bear walks behind a pine and
// in front of the next one down.
const standingItems = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  trees: Tree[],
  hazards: Hazard[],
  camY: number,
): Standing[] => {
  const items: Standing[] = trees.map((tree) => ({ y: tree.y, tree, draw: () => drawTreeAt(ctx, state, tree, camY) }))
  for (const hazard of hazards) {
    items.push({ y: hazard.y, tree: null, draw: () => drawHazardStanding(ctx, state, hazard, camY) })
  }
  for (const pickup of state.course.pickups) {
    if (pickup.taken || !onScreen(pickup.y - camY, 60)) continue
    items.push({ y: pickup.y, tree: null, draw: () => drawPickup(ctx, state, pickup, camY) })
  }
  return items.sort((a, b) => a.y - b.y)
}

// Peak throw of the crash shake at full strength, split either side of centre: mockups/shake.html.
const SHAKE_PX = 14

export const render = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  ctx.fillStyle = state.theme.snow
  ctx.fillRect(0, 0, LOGICAL_WIDTH, viewHeight())

  ctx.save()
  if (state.shake > 0 && !state.inspect.on && setting('shake')) {
    const kick = state.shake * SHAKE_PX
    ctx.translate((Math.random() - 0.5) * kick, (Math.random() - 0.5) * kick)
  }
  if (state.inspect.on) applyInspect(ctx, state, camY)

  const hazards = visibleHazards(state, camY)
  for (const hazard of hazards) drawHazardUnder(ctx, state, hazard, camY)
  drawFinish(ctx, state, camY)
  drawTrail(ctx, state, camY)
  drawParticles(ctx, state, camY, 'spray')

  const visible = visibleTrees(state)
  for (const tree of visible) drawShadow(ctx, state.theme, tree.x, tree.y - camY, tree.radius)

  // Pines the ball has passed go under it; pines still ahead draw over it, so clipping a canopy
  // reads as ducking under the branches rather than crashing. The trunk you crashed into is the
  // exception: it always draws over the ball, so the crash reads as hitting it, not landing on it.
  const items = standingItems(ctx, state, visible, hazards, camY)
  for (const item of items) {
    if (item.y <= state.y && (!item.tree || item.tree !== state.hitTree)) item.draw()
  }
  // In the air it clears everything on the slope, so it is drawn on top of all of it.
  const air = airPose(state)
  if (!air?.flying) drawBall(ctx, state, camY, air)
  // Under the trunk it crashed into: the root sits on the drift, not behind it.
  drawDrift(ctx, state, camY)
  for (const item of items) {
    if (item.y > state.y || (item.tree && item.tree === state.hitTree)) item.draw()
  }
  drawParticles(ctx, state, camY, 'clod')
  drawRocks(ctx, state, camY)
  for (const hazard of hazards) drawHazardOver(ctx, state, hazard, camY)
  if (air?.flying) drawBall(ctx, state, camY, air)
  drawShards(ctx, state, camY)

  drawPops(ctx, state, camY)
  // The hitboxes are a playtest tool, so players see the slope alone.
  if (state.inspect.on && import.meta.env.DEV) drawHitboxes(ctx, state, camY)
  ctx.restore()
  if (!state.inspect.on) drawChips(ctx, state)
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
}
