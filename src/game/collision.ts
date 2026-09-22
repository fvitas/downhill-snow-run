import { avalancheCaught, pushAvalanche } from './avalanche.ts'
import { burst } from './particles.ts'
import { TRUNK_HALF_SCALE, type GameState, type HitRecord, type Rock, type Tree } from './state.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

const SCAN_WINDOW = 120
const COMBO_SECONDS = 1.6
const COMBO_BASE = 2
const COMBO_STEP = 2
const COMBO_CAP = 32
const COIN_RADIUS = 30
const COIN_POINTS = 5
const DIAMOND_POINTS = 50
const FREEZE_SECONDS = 0.4
const SHAKE_SECONDS = 0.22

// Trunk only — the canopy triangles are decoration — minus a few pixels so a scrape down the side
// of the pole isn't a crash. Shallow in y: brushing past in front of a trunk should read as a pass.
export const treeHitExtents = (state: GameState, tree: Tree): { rx: number; ry: number } => {
  const { ballRadius, treeHitScale, hitForgivePx, hitDepthScale } = state.tuning
  const rx = Math.max(1, tree.radius * TRUNK_HALF_SCALE * treeHitScale + ballRadius - hitForgivePx)
  return { rx, ry: rx * hitDepthScale }
}

// Distance from a point to this frame's travel segment, with y stretched by `depth` so the
// circle test below is really an ellipse: wide across the slope, shallow front-to-back.
const distanceToStepSq = (state: GameState, x: number, y: number, depth: number): number => {
  const ay = state.prevY / depth
  const by = state.y / depth
  const py = y / depth
  const dx = state.x - state.prevX
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - state.prevX) * dx + (py - ay) * dy) / lengthSq))
  const offX = state.prevX + t * dx - x
  const offY = ay + t * dy - py
  return offX * offX + offY * offY
}

// Where the ball was across the slope at the moment it drew level with `y`.
const ballXAt = (state: GameState, y: number): number => {
  const span = state.y - state.prevY
  if (span <= 0) return state.x
  const t = Math.min(1, Math.max(0, (y - state.prevY) / span))
  return state.prevX + (state.x - state.prevX) * t
}

// Each near miss in a chain is worth two more than the last, not double.
const comboPoints = (combo: number): number =>
  Math.min(COMBO_CAP, COMBO_BASE + COMBO_STEP * Math.max(0, combo - 1))

// Rocks move, so the ellipse trick used for trunks does not apply: plain circle against the step.
const hitRock = (state: GameState, rock: Rock): boolean => {
  const reach = rock.radius + state.tuning.ballRadius - 4
  return distanceToStepSq(state, rock.x, rock.y, 1) <= reach * reach
}

const kill = (state: GameState, kind: HitRecord['kind'], tree: Tree | null): void => {
  state.dead = true
  state.pressed = false
  state.combo = 0
  state.freeze = FREEZE_SECONDS
  state.shake = SHAKE_SECONDS
  state.hitTree = tree
  state.lastHit = {
    kind,
    score: state.score,
    speed: state.speed,
    angleDeg: (state.angle * 180) / Math.PI,
    ball: { x: state.x, y: state.y, radius: state.tuning.ballRadius },
    step: { fromX: state.prevX, fromY: state.prevY, toX: state.x, toY: state.y },
    tree: tree ? { x: tree.x, y: tree.y, radius: tree.radius, ...treeHitExtents(state, tree) } : null,
  }
  burst(state, state.x, state.y, 26)
}

const graze = (state: GameState, tree: Tree, ballX: number): void => {
  tree.grazed = true
  state.combo += 1
  state.comboTimer = COMBO_SECONDS
  const gain = comboPoints(state.combo)
  state.score += gain
  state.pops.push({ x: tree.x, y: tree.y - 24, text: `+${gain}`, life: 1 })
  state.wobbles.push({ tree, age: 0, side: tree.x < ballX ? -1 : 1 })
  pushAvalanche(state, state.combo)
  burst(state, tree.x, tree.y - tree.radius * 0.4, 6)
}

const collect = (state: GameState): void => {
  for (const item of state.course.collectibles) {
    if (item.taken) continue
    if (item.y <= state.prevY || item.y > state.y) continue
    if (Math.abs(item.x - ballXAt(state, item.y)) > COIN_RADIUS) continue

    item.taken = true
    const diamond = item.kind === 'diamond'
    if (diamond) state.runDiamonds += 1
    else state.runCoins += 1
    state.score += diamond ? DIAMOND_POINTS : COIN_POINTS
    state.pops.push({
      x: item.x,
      y: item.y - 20,
      text: diamond ? '+50' : `+${COIN_POINTS}`,
      life: 1,
    })
  }
}

export const checkCollisions = (state: GameState): void => {
  if (state.dead) return

  collect(state)

  if (avalancheCaught(state)) {
    kill(state, 'avalanche', null)
    return
  }

  const r = state.tuning.ballRadius
  // Bonus runs cannot be lost: the walls just hold you in.
  if (!state.level.bonus && (state.x <= r || state.x >= LOGICAL_WIDTH - r)) {
    state.wallFlash = 1
    state.wallFlashSide = state.x <= r ? -1 : 1
    kill(state, 'wall', null)
    return
  }

  for (const rock of state.course.rocks) {
    if (!rock.rolling) continue
    if (Math.abs(rock.y - state.y) > SCAN_WINDOW) continue
    if (hitRock(state, rock)) {
      kill(state, 'rock', null)
      return
    }
  }

  const { trees } = state
  for (let i = state.treeFrom; i < state.treeTo; i += 1) {
    const tree = trees[i]
    if (!tree) continue

    const dy = tree.y - state.y
    if (dy < -SCAN_WINDOW || dy > SCAN_WINDOW) continue

    const { rx, ry } = treeHitExtents(state, tree)
    if (distanceToStepSq(state, tree.x, tree.y, ry / rx) <= rx * rx) {
      kill(state, 'tree', tree)
      return
    }

    // Scored on the frame the ball draws level with the trunk, so it reads as "that was close".
    if (!tree.grazed && tree.y > state.prevY && tree.y <= state.y) {
      const ballX = ballXAt(state, tree.y)
      if (Math.abs(tree.x - ballX) <= state.tuning.grazePx) graze(state, tree, ballX)
    }
  }
}

export const stepCombo = (state: GameState, dt: number): void => {
  if (state.comboTimer <= 0) return
  state.comboTimer -= dt
  if (state.comboTimer <= 0) state.combo = 0
}
