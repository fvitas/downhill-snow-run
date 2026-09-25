import type { GameState } from './state.ts'

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

// Distance from a point to this frame's travel segment, with y stretched by `depth` so the
// circle test is really an ellipse: wide across the slope, shallow front-to-back.
export const distanceToStepSq = (state: GameState, x: number, y: number, depth: number): number => {
  const ay = state.prevY / depth
  const by = state.y / depth
  const py = y / depth
  const dx = state.x - state.prevX
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : clamp01(((x - state.prevX) * dx + (py - ay) * dy) / lengthSq)
  const offX = state.prevX + t * dx - x
  const offY = ay + t * dy - py
  return offX * offX + offY * offY
}

// Where the ball was across the slope at the moment it drew level with `y`.
export const ballXAt = (state: GameState, y: number): number => {
  const span = state.y - state.prevY
  if (span <= 0) return state.x
  const t = clamp01((y - state.prevY) / span)
  return state.prevX + (state.x - state.prevX) * t
}

export type Closest = { distance: number; x: number; y: number }

// Closest approach between this frame's step and the segment a–b, y divided by `squash` first so
// a flat ellipse can be tested as a circle. Ericson, Real-Time Collision Detection §5.1.9.
export const closestToStep = (
  state: GameState,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  squash = 1,
): Closest => {
  const px = state.prevX
  const py = state.prevY / squash
  const d1x = state.x - px
  const d1y = state.y / squash - py
  const cx = ax
  const cy = ay / squash
  const d2x = bx - ax
  const d2y = by / squash - cy
  const rx = px - cx
  const ry = py - cy
  const a = d1x * d1x + d1y * d1y
  const e = d2x * d2x + d2y * d2y
  const f = d2x * rx + d2y * ry
  let s = 0
  let t = 0
  if (a > 1e-9 && e > 1e-9) {
    const b = d1x * d2x + d1y * d2y
    const c = d1x * rx + d1y * ry
    const denom = a * e - b * b
    s = denom > 1e-9 ? clamp01((b * f - c * e) / denom) : 0
    t = (b * s + f) / e
    if (t < 0) {
      t = 0
      s = clamp01(-c / a)
    } else if (t > 1) {
      t = 1
      s = clamp01((b - c) / a)
    }
  } else if (a > 1e-9) {
    s = clamp01(-(d1x * rx + d1y * ry) / a)
  } else if (e > 1e-9) {
    t = clamp01(f / e)
  }
  const onX = cx + d2x * t
  const onY = cy + d2y * t
  const offX = px + d1x * s - onX
  const offY = py + d1y * s - onY
  return { distance: Math.hypot(offX, offY), x: onX, y: onY * squash }
}
