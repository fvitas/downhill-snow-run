import type { GameState } from './state.ts'
import { LOGICAL_WIDTH } from './viewport.ts'

const DEG_TO_RAD = Math.PI / 180

const approach = (current: number, target: number, maxDelta: number): number => {
  const delta = target - current
  if (Math.abs(delta) <= maxDelta) return target
  return current + Math.sign(delta) * maxDelta
}

export const flip = (state: GameState): void => {
  state.direction = state.direction === 1 ? -1 : 1
}

export const stepPhysics = (state: GameState, dt: number): void => {
  const { tuning } = state

  // Turn rate is the only carve knob now that hold is gone: radius ≈ speed / turn rate.
  const targetAngle = state.direction * tuning.turnAngleDeg * DEG_TO_RAD
  state.angle = approach(state.angle, targetAngle, tuning.turnRateDegPerSec * DEG_TO_RAD * dt)

  const ramped = tuning.baseSpeed + (state.y / 1_000) * tuning.speedRampPer1000
  state.speed = Math.min(ramped, tuning.maxSpeed)

  // Kept so collision can sweep the step — the trunk is thin enough to tunnel through otherwise.
  state.prevX = state.x
  state.prevY = state.y

  // Downhill speed is constant. Decomposing by cos would surge the scroll ~22% as the flip passes
  // through vertical, which reads as the world jolting downward on every tap.
  state.x += Math.tan(state.angle) * state.speed * dt
  state.y += state.speed * dt

  // Clamped, not bounced — collision.ts turns edge contact into a crash (Q17).
  const r = tuning.ballRadius
  state.x = Math.min(Math.max(state.x, r), LOGICAL_WIDTH - r)
}
