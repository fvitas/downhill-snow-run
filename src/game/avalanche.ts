import type { GameState } from './state.ts'
import { LOGICAL_HEIGHT } from './viewport.ts'

// How far up the slope the wall starts, and the closest it is allowed to be pushed back to.
export const AVALANCHE_LEAD_PX = LOGICAL_HEIGHT * 1.05
const MAX_LEAD_PX = LOGICAL_HEIGHT * 1.35
// Closing is measured against distance skied, not seconds: a long level is not an easier one.
// Ski a clean line and the wall reaches you here; near-misses are the only way to push it back.
const CATCH_AT = 0.6
const PUSH_BASE_PX = 90
const PUSH_PER_COMBO_PX = 26
const PUSH_CAP_PX = 260

export const avalancheGap = (state: GameState): number => state.y - state.avalancheY

export const stepAvalanche = (state: GameState, dt: number): void => {
  if (!state.level.avalanche) return
  const closeRate = AVALANCHE_LEAD_PX / Math.max(1, CATCH_AT * state.course.lengthPx)
  state.avalancheY += state.speed * (1 + closeRate) * dt
  state.avalancheY = Math.max(state.avalancheY, state.y - MAX_LEAD_PX)
}

export const pushAvalanche = (state: GameState, combo: number): void => {
  if (!state.level.avalanche) return
  const push = Math.min(PUSH_CAP_PX, PUSH_BASE_PX + PUSH_PER_COMBO_PX * Math.max(0, combo - 1))
  state.avalancheY -= push
}

export const avalancheCaught = (state: GameState): boolean =>
  state.level.avalanche && avalancheGap(state) <= state.tuning.ballRadius
