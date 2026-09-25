import { burst } from './particles.ts'
import type { GameState, HitRecord, PopTone } from './state.ts'
import { TRUNK_HALF_SCALE, type Tree } from './world.ts'

const COMBO_BASE = 2
const COMBO_STEP = 2
// How long the wreck is left on screen — shake, thrown snow and all — before the card covers it.
const FREEZE_SECONDS = 1.1
// Shake strength at the moment of impact; stepEffects bleeds it off over a quarter second.
const SHAKE_KICK = 1
// The helmet takes the hit, and the ball is untouchable for this long so it can clear the trunk.
const SAVE_GRACE_SECONDS = 0.45
const SAVE_SHAKE = 0.4

// Each near miss in a chain is worth two more than the last, not double, with no ceiling.
const comboPoints = (combo: number): number => COMBO_BASE + COMBO_STEP * Math.max(0, combo - 1)

export const pop = (state: GameState, x: number, y: number, text: string, tone?: PopTone): void => {
  state.pops.push({ x, y, text, life: 1, ...(tone ? { tone } : {}) })
}

// ×2 doubles what is paid, and the pop says so, so a doubled number never reads as a misprint.
export const award = (state: GameState, points: number, x: number, y: number): void => {
  const doubled = state.double > 0
  const gain = doubled ? points * 2 : points
  state.score += gain
  pop(state, x, y, doubled ? `+${gain} ×2` : `+${gain}`)
}

export const nearMiss = (state: GameState, x: number, y: number): void => {
  state.combo += 1
  award(state, comboPoints(state.combo), x, y)
}

// Soft things cost points and the chain, never the run.
export const penalty = (state: GameState, points: number, x: number, y: number): void => {
  state.score = Math.max(0, state.score - points)
  state.combo = 0
  pop(state, x, y, `−${points}`, 'ink')
  burst(state, x, y, 10)
}

// Ghosting through, or the beat after a helmet save: nothing lethal can land.
export const untouchable = (state: GameState): boolean => state.ghost > 0 || state.shield > 0

// Ghosting clean through a thing is as close as a pass gets, so each one pays like a near miss.
export const phasing = (state: GameState): boolean => state.ghost > 0

// True when the helmet took it; the caller then treats the obstacle as passed.
export const trySave = (state: GameState, x: number, y: number): boolean => {
  if (!state.helmet) return false
  state.helmet = false
  state.shield = SAVE_GRACE_SECONDS
  state.shake = SAVE_SHAKE
  state.helmetBreak = { x: state.x, y: state.y, age: 0 }
  pop(state, x, y - 40, 'Saved', 'ink')
  burst(state, state.x, state.y, 12)
  return true
}

export const kill = (state: GameState, kind: HitRecord['kind'], tree: Tree | null): void => {
  state.dead = true
  state.pressed = false
  state.combo = 0
  state.freeze = FREEZE_SECONDS
  state.shake = SHAKE_KICK
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
  burst(state, state.x, state.y, 30, 'clod')
}

// Trunk only — the canopy triangles are decoration — minus a few pixels so a scrape down the side
// of the pole isn't a crash. Shallow in y: brushing past in front of a trunk should read as a pass.
export const treeHitExtents = (state: GameState, tree: Tree): { rx: number; ry: number } => {
  const { ballRadius, treeHitScale, hitForgivePx, hitDepthScale } = state.tuning
  const rx = Math.max(1, tree.radius * TRUNK_HALF_SCALE * treeHitScale + ballRadius - hitForgivePx)
  return { rx, ry: rx * hitDepthScale }
}
