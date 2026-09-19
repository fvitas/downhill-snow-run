import { burst } from './particles.ts'
import { TRUNK_HALF_SCALE, type GameState, type HitRecord, type Tree } from './state.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

const SCAN_WINDOW = 120

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

const kill = (state: GameState, kind: HitRecord['kind'], tree: Tree | null): void => {
  state.dead = true
  state.pressed = false
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
  if (state.score > state.best) state.best = state.score
}

export const checkCollisions = (state: GameState): void => {
  if (state.dead) return

  const r = state.tuning.ballRadius
  if (state.x <= r || state.x >= LOGICAL_WIDTH - r) {
    state.wallFlash = 1
    state.wallFlashSide = state.x <= r ? -1 : 1
    kill(state, 'wall', null)
    return
  }

  // Trees are only roughly ordered by y (spawn jitter), so scan a window instead of breaking early.
  for (const tree of state.trees) {
    const dy = tree.y - state.y
    if (dy < -SCAN_WINDOW || dy > SCAN_WINDOW) continue

    const { rx, ry } = treeHitExtents(state, tree)
    if (distanceToStepSq(state, tree.x, tree.y, ry / rx) <= rx * rx) {
      kill(state, 'tree', tree)
      return
    }
  }
}
