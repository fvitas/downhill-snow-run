import { award, kill, nearMiss, penalty, phasing, pop, trySave, untouchable } from './scoring.ts'
import type { GameState } from './state.ts'
import { ballXAt, closestToStep, type Closest } from './sweep.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './viewport.ts'
import type { Hazard, HazardKind, PowerKind } from './world.ts'

// Everything here was tuned in mockups/obstacles.html with the ball at 300 px/s. Hazards run on that
// clock scaled by the ball's own speed, so a fast level plays the same shapes, only quicker.
export const REFERENCE_SPEED = 300
const W = LOGICAL_WIDTH

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
const clamp01 = (value: number): number => clamp(value, 0, 1)
export const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

const COSTS: Partial<Record<HazardKind, number>> = { snowman: 25, bush: 10 }
const HARMLESS: readonly HazardKind[] = ['gate', 'jump', 'wolf', 'fox']
export const isKiller = (kind: HazardKind): boolean => !HARMLESS.includes(kind) && !COSTS[kind]

// A scrape this deep still counts as a pass, same idea as the trunk's forgiveness.
const HIT_FORGIVE_PX = 3
// Clearance under which passing a killer counts as a near miss; it pays as the ball pulls away.
const NEAR_PX = 35
// Things on the move are harder to judge, so they pay from further off.
const MOVING_NEAR_PX = 60
// Only hazards this close in y are tested; every shape reaches well short of it.
const SCAN_PX = 420

export const POWER_SECONDS = 5
export const GATE_HALF = 34
export const GATE_POINTS = 50
export const JUMP = { w: 110, ramp: 110, air: 190, lip: 0.45, lift: 56, grow: 0.9, points: 50 }
// Tilt in radians; every log lies on a slant between these, so one end is always the way round.
export const LOG = { len: 190, h: 26, tiltMin: 0.35, tiltMax: 0.6 }
export const NET_HEIGHT = 34
export const HOLE_R = 46
export const TOPPLE_R = 19

type CrosserSpec = { speed: number; fall: number; warn: number; edge: number }
// `fall` is downhill speed as a share of the ball's; `warn` is how long the chevron blinks first.
export const CROSSERS: Partial<Record<HazardKind, CrosserSpec>> = {
  skier: { speed: 130, fall: 0.55, warn: 0, edge: 24 },
  snowmobile: { speed: 260, fall: 0, warn: 0.6, edge: 60 },
  deer: { speed: 143, fall: 0.3, warn: 0, edge: 40 },
  bear: { speed: 140, fall: 0.2, warn: 0, edge: 44 },
}

type ChaserSpec = { speed: number; turn: number; chase: number; life: number; behind: number }
// The wolf turns slowly, so every flip makes it overshoot; the fox sticks closer but quits sooner.
const CHASERS: Partial<Record<HazardKind, ChaserSpec>> = {
  wolf: { speed: 380, turn: 1.4, chase: 3.4, life: 5, behind: 140 },
  fox: { speed: 390, turn: 2.1, chase: 2.4, life: 4.2, behind: 120 },
}
// How far below its home y a thing is still with the ball: a snowball has to catch up, a chaser
// runs on your heels.
export const tailPx = (kind: HazardKind): number => {
  if (kind === 'snowball') return (SNOWBALL.behind / SNOWBALL.gain) * REFERENCE_SPEED + SNOWBALL.max
  const chaser = CHASERS[kind]
  return chaser ? chaser.life * REFERENCE_SPEED : 0
}

// Centre to snout is about 35 px, so at this gap a chaser is on your heels but never level with you.
const HEEL_PX = 52
const PRINTS_PER_SECOND = 12
const PRINTS_KEPT = 28

export const KID = {
  wake: 570,
  flight: 1,
  // How long a landed lump stays hard enough to crash on.
  lethal: 1.2,
  size: 1.4,
  // The first lands on the line just before the ball gets there, the second beside it as it passes.
  throws: [
    { at: 0.9, lead: 0.35, off: 0 },
    { at: 1.6, lead: 0, off: 55 },
  ],
}

export const SNOWBALL = { behind: 520, gain: 210, r0: 12, grow: 7, max: 40 }
// Distances from the ball, not seconds: the icicle wakes, drops, sticks and splashes by these gaps.
export const ICICLE = { wake: 490, drop: 370, land: 265, settle: 160 }
const TOPPLE_GAPS = { shake: 595, start: 460, fall: 270 }

const startX = (spec: CrosserSpec, dir: 1 | -1): number => (dir > 0 ? -spec.edge : W + spec.edge)
const crosserLead = (spec: CrosserSpec, hazard: Hazard): number =>
  Math.abs(hazard.homeX - startX(spec, hazard.dir)) / spec.speed + spec.warn

// Timed so it stands at home the moment the ball reaches home's y. Features clears trees off it.
export const crosserPath = (hazard: Hazard): { x0: number; y0: number; x1: number; y1: number } | null => {
  const spec = CROSSERS[hazard.kind]
  if (!spec) return null
  const x0 = startX(spec, hazard.dir)
  const x1 = hazard.dir > 0 ? W + spec.edge : -spec.edge
  const drop = spec.fall * REFERENCE_SPEED
  return {
    x0,
    y0: hazard.homeY - (drop * Math.abs(hazard.homeX - x0)) / spec.speed,
    x1,
    y1: hazard.homeY + (drop * Math.abs(x1 - hazard.homeX)) / spec.speed,
  }
}

export const resetHazard = (hazard: Hazard): void => {
  hazard.x = hazard.homeX
  hazard.y = hazard.homeY
  hazard.vx = 0
  hazard.vy = 0
  hazard.heading = 0
  hazard.age = -1
  hazard.near = false
  hazard.grazed = false
  hazard.spent = false
  hazard.hitAge = -1
  hazard.shots.length = 0
  hazard.prints.length = 0
}

export const makeHazard = (
  kind: HazardKind,
  homeX: number,
  homeY: number,
  dir: 1 | -1 = 1,
  size = 0,
): Hazard => {
  const hazard: Hazard = {
    kind,
    homeX,
    homeY,
    dir,
    size,
    x: homeX,
    y: homeY,
    vx: 0,
    vy: 0,
    heading: 0,
    age: -1,
    near: false,
    grazed: false,
    spent: false,
    hitAge: -1,
    shots: [],
    prints: [],
  }
  return hazard
}

// How far above home the ball is when the thing wakes; the static kinds never need to.
const wakeGap = (hazard: Hazard): number => {
  const crosser = CROSSERS[hazard.kind]
  if (crosser) return REFERENCE_SPEED * crosserLead(crosser, hazard)
  if (hazard.kind === 'kid') return KID.wake
  if (hazard.kind === 'icicle') return ICICLE.wake
  if (hazard.kind === 'snowball' || CHASERS[hazard.kind]) return 0
  return -Infinity
}

const wake = (state: GameState, hazard: Hazard): void => {
  hazard.age = 0
  const crosser = CROSSERS[hazard.kind]
  if (crosser) {
    hazard.x = startX(crosser, hazard.dir)
    hazard.y = hazard.homeY - crosser.fall * REFERENCE_SPEED * (crosserLead(crosser, hazard) - crosser.warn)
    return
  }
  const chaser = CHASERS[hazard.kind]
  if (chaser) {
    hazard.x = hazard.dir > 0 ? -20 : W + 20
    hazard.y = state.y - chaser.behind
    hazard.heading = hazard.dir * 1.2
    return
  }
  if (hazard.kind === 'snowball') {
    hazard.x = clamp(state.x, 60, W - 60)
    hazard.y = state.y - SNOWBALL.behind
    return
  }
  // Drops beside the line the ball is on right now, on the side away from the wall.
  if (hazard.kind === 'icicle') {
    hazard.x = clamp(state.x + (state.x < W / 2 ? 1 : -1) * hazard.size, 50, W - 50)
  }
}

const stepCrosser = (hazard: Hazard, spec: CrosserSpec, tick: number): void => {
  const before = Math.max(0, hazard.age - spec.warn)
  hazard.age += tick
  const moved = Math.max(0, hazard.age - spec.warn) - before
  hazard.x += hazard.dir * spec.speed * moved
  hazard.y += spec.fall * REFERENCE_SPEED * moved
}

const stepChaser = (state: GameState, hazard: Hazard, spec: ChaserSpec, tick: number): void => {
  if (hazard.age > spec.life + 2) return
  const want =
    hazard.age < spec.chase
      ? Math.atan2(state.x - hazard.x, state.y - hazard.y)
      : hazard.x < W / 2
        ? -1.3
        : 1.3
  const turn = Math.atan2(Math.sin(want - hazard.heading), Math.cos(want - hazard.heading))
  hazard.heading += clamp(turn, -spec.turn * tick, spec.turn * tick)
  hazard.x += Math.sin(hazard.heading) * spec.speed * tick
  hazard.y = Math.min(hazard.y + Math.cos(hazard.heading) * spec.speed * tick, state.y - HEEL_PX)

  const before = Math.floor(hazard.age * PRINTS_PER_SECOND)
  hazard.age += tick
  if (Math.floor(hazard.age * PRINTS_PER_SECOND) === before) return
  hazard.prints.push({ x: hazard.x, y: hazard.y, heading: hazard.heading, left: before % 2 === 0 })
  if (hazard.prints.length > PRINTS_KEPT) hazard.prints.shift()
}

const stepKid = (state: GameState, hazard: Hazard, tick: number): void => {
  const before = hazard.age
  hazard.age += tick
  for (const shot of hazard.shots) shot.age += tick
  for (const { at, lead, off } of KID.throws) {
    if (before >= at || hazard.age < at) continue
    hazard.shots.push({
      fromX: hazard.x + hazard.dir * 10,
      fromY: hazard.y - 20,
      x: clamp(state.x - hazard.dir * off, 40, W - 40),
      y: state.y + REFERENCE_SPEED * (KID.flight + lead),
      age: 0,
      grazed: false,
    })
  }
}

// The snowball grows as it rolls, so its turn is the integral of speed over a growing radius.
const snowballSpin = (age: number): number => {
  const speed = REFERENCE_SPEED + SNOWBALL.gain
  const full = (SNOWBALL.max - SNOWBALL.r0) / SNOWBALL.grow
  const early = Math.min(age, full)
  return (
    (speed / SNOWBALL.grow) * Math.log((SNOWBALL.r0 + SNOWBALL.grow * early) / SNOWBALL.r0) +
    (speed * Math.max(0, age - full)) / SNOWBALL.max
  )
}

// Rolls on for good once it is harmless, so it and its groove leave by the bottom of the screen.
const stepSnowball = (state: GameState, hazard: Hazard, tick: number): void => {
  hazard.age += tick
  hazard.y += (REFERENCE_SPEED + SNOWBALL.gain) * tick
  hazard.size = Math.min(SNOWBALL.max, SNOWBALL.r0 + SNOWBALL.grow * hazard.age)
  hazard.heading = snowballSpin(hazard.age)
  if (hazard.y > state.y + LOGICAL_HEIGHT * 1.2) hazard.spent = true
}

export const stepHazards = (state: GameState, dt: number): void => {
  const tick = (dt * state.speed) / REFERENCE_SPEED
  for (const hazard of state.course.hazards) {
    if (hazard.hitAge >= 0) hazard.hitAge += dt
    if (hazard.age < 0) {
      if (hazard.homeY - state.y > wakeGap(hazard)) continue
      wake(state, hazard)
    }
    // Long gone behind the ball: nothing left to move or draw.
    if (hazard.y < state.y - LOGICAL_HEIGHT * 1.5) continue

    const crosser = CROSSERS[hazard.kind]
    const chaser = CHASERS[hazard.kind]
    if (crosser) stepCrosser(hazard, crosser, tick)
    else if (chaser) stepChaser(state, hazard, chaser, tick)
    else if (hazard.kind === 'kid') stepKid(state, hazard, tick)
    else if (hazard.kind === 'snowball') stepSnowball(state, hazard, tick)
  }
}

// 0 standing, 1 flat on the snow. Driven by how far the ball is above it, so it always falls
// across the lane as you arrive.
export const toppleFall = (hazard: Hazard, ballY: number): number => {
  const gap = hazard.homeY - ballY
  return ease(clamp01((TOPPLE_GAPS.start - gap) / TOPPLE_GAPS.fall))
}

export const toppleShake = (hazard: Hazard, ballY: number): number => {
  const gap = hazard.homeY - ballY
  return gap < TOPPLE_GAPS.shake && gap > TOPPLE_GAPS.start ? Math.sin(gap * 0.6) * 0.06 : 0
}

// 0 hanging, 1 stuck in the snow.
export const icicleDrop = (hazard: Hazard, ballY: number): number =>
  hazard.age < 0 ? 0 : clamp01((ICICLE.drop - (hazard.homeY - ballY)) / (ICICLE.drop - ICICLE.land))

type Capsule = { ax: number; ay: number; bx: number; by: number; r: number; squash?: number }

const circle = (x: number, y: number, r: number): Capsule => ({ ax: x, ay: y, bx: x, by: y, r })
const bar = (x0: number, x1: number, y: number, r: number): Capsule => ({ ax: x0, ay: y, bx: x1, by: y, r })

// The ground footprint of each thing — what the ball actually runs into. Standing art above it
// (poles, antlers, the net's mesh) is decoration, like a pine's branches.
const shapesOf = (hazard: Hazard, ballY: number): Capsule[] => {
  const { x, y, dir } = hazard
  switch (hazard.kind) {
    case 'boulder':
      return [circle(x, y, hazard.size * 0.9)]
    case 'log': {
      const half = LOG.len / 2
      const tilt = hazard.size * dir
      const dx = Math.cos(tilt) * half
      const dy = Math.sin(tilt) * half
      return [{ ax: x - dx, ay: y - dy, bx: x + dx, by: y + dy, r: LOG.h / 2 }]
    }
    case 'net':
      return [bar(x - hazard.size, x + hazard.size, y - 4, 6)]
    case 'hole':
      return [{ ...circle(x, y, HOLE_R - 4), squash: 0.6 }]
    case 'skier':
      return [circle(x, y + 4, 11)]
    case 'snowmobile':
      return [bar(x - 28 * dir, x + 24 * dir, y, 12)]
    case 'deer':
      return [bar(x - 18, x + 18, y - 6, 9)]
    case 'bear':
      return [bar(x - 24, x + 24, y - 12, 15)]
    case 'kid':
      return [circle(x, y - 8, 12)]
    case 'snowball':
      return hazard.age < 0 || hazard.spent ? [] : [circle(x, y, hazard.size - 3)]
    case 'topple': {
      const fall = toppleFall(hazard, ballY)
      // Standing or on its way down, only the trunk is in reach; the canopy is still in the air.
      if (fall < 0.8) return [circle(x, y, 4)]
      const angle = dir * fall * (Math.PI / 2)
      const length = TOPPLE_R * 2.48
      return [
        {
          ax: x + Math.sin(angle) * length * 0.2,
          ay: y - Math.cos(angle) * length * 0.2,
          bx: x + Math.sin(angle) * length,
          by: y - Math.cos(angle) * length,
          r: 10,
        },
      ]
    }
    case 'icicle':
      return icicleDrop(hazard, ballY) >= 1 ? [circle(x, y, 7)] : []
    case 'snowman':
      return [circle(x, y - 6, 17)]
    case 'bush':
      return [circle(x, y, 24)]
    default:
      return []
  }
}

// How far the ball's edge came from the thing this frame, and where on the thing that was.
const clearanceOf = (state: GameState, hazard: Hazard): Closest | null => {
  let best: Closest | null = null
  for (const shape of shapesOf(hazard, state.y)) {
    const near = closestToStep(state, shape.ax, shape.ay, shape.bx, shape.by, shape.squash)
    const clearance = near.distance - shape.r - state.tuning.ballRadius
    if (!best || clearance < best.distance) best = { distance: clearance, x: near.x, y: near.y }
  }
  return best
}

const hit = (state: GameState, hazard: Hazard): void => {
  const cost = COSTS[hazard.kind]
  if (cost) {
    hazard.spent = true
    if (state.ghost > 0) return
    hazard.hitAge = 0
    penalty(state, cost, hazard.x, hazard.y - 40)
    return
  }
  if (phasing(state)) {
    if (!hazard.grazed) nearMiss(state, hazard.x, hazard.y - 24)
    hazard.grazed = true
    hazard.near = false
    return
  }
  if (untouchable(state)) {
    hazard.grazed = true
    hazard.near = false
    return
  }
  if (trySave(state, hazard.x, hazard.y)) {
    hazard.spent = true
    return
  }
  kill(state, hazard.kind, null)
}

const checkShots = (state: GameState, hazard: Hazard): void => {
  const reach = 10 + state.tuning.ballRadius - HIT_FORGIVE_PX
  for (const shot of hazard.shots) {
    if (shot.age < KID.flight || shot.age > KID.flight + KID.lethal) continue
    if (closestToStep(state, shot.x, shot.y, shot.x, shot.y).distance > reach) continue
    if (phasing(state)) {
      if (!shot.grazed) nearMiss(state, shot.x, shot.y - 24)
      shot.grazed = true
      continue
    }
    if (untouchable(state)) continue
    // Broken under the helmet, so the same lump can't take a second one.
    if (trySave(state, shot.x, shot.y)) {
      shot.age = KID.flight + KID.lethal
      continue
    }
    kill(state, 'kid', null)
    return
  }
}

const passGate = (state: GameState, hazard: Hazard): void => {
  if (hazard.grazed || hazard.y <= state.prevY || hazard.y > state.y) return
  if (Math.abs(ballXAt(state, hazard.y) - hazard.x) >= GATE_HALF) return
  hazard.grazed = true
  award(state, GATE_POINTS, hazard.x, hazard.y - 60)
}

const takeJump = (state: GameState, hazard: Hazard): void => {
  if (hazard.spent || state.air) return
  if (state.y < hazard.y - JUMP.ramp || state.y >= hazard.y) return
  if (Math.abs(state.x - hazard.x) > JUMP.w / 2 - 4) return
  hazard.spent = true
  state.air = { lip: hazard.y }
}

export const checkHazards = (state: GameState): void => {
  // In the air nothing on the ground can touch you — and nothing on it can pay, either.
  const airborne = state.air !== null
  for (const hazard of state.course.hazards) {
    if (Math.abs(hazard.y - state.y) > SCAN_PX) continue
    if (hazard.kind === 'gate') {
      passGate(state, hazard)
      continue
    }
    if (hazard.kind === 'jump') {
      takeJump(state, hazard)
      continue
    }
    if (airborne) continue
    if (hazard.kind === 'kid') {
      checkShots(state, hazard)
      if (state.dead) return
    }
    if (hazard.spent) continue

    const near = clearanceOf(state, hazard)
    if (!near) continue
    if (near.distance <= -HIT_FORGIVE_PX) {
      hit(state, hazard)
      if (state.dead) return
      continue
    }
    if (!isKiller(hazard.kind) || hazard.grazed) continue
    const nearPx = CROSSERS[hazard.kind] || hazard.kind === 'snowball' ? MOVING_NEAR_PX : NEAR_PX
    if (near.distance <= nearPx) {
      hazard.near = true
    } else if (hazard.near) {
      hazard.near = false
      hazard.grazed = true
      nearMiss(state, near.x, near.y - 24)
    }
  }
}

// Height and size of the ball over a jump: it climbs to the lip, then a short arc lands it.
export type AirPose = { flying: boolean; lift: number; scale: number }

export const airPose = (state: GameState): AirPose | null => {
  if (!state.air) return null
  const d = state.y - state.air.lip
  const flying = d > 0
  const u = clamp01(d / JUMP.air)
  const height = flying ? JUMP.lip * (1 - u) + 3 * u * (1 - u) : JUMP.lip * (1 + d / JUMP.ramp)
  return {
    flying,
    lift: flying ? 4 * u * (1 - u) * JUMP.lift : 0,
    scale: 1 + Math.max(0, height) * JUMP.grow,
  }
}

const PICKUP_REACH = 30
const HELMET_BREAK_SECONDS = 0.6
export const POWER_LABELS: Record<PowerKind, string> = { helmet: 'Helmet', ghost: 'Ghost', double: '×2' }

const collectPickups = (state: GameState): void => {
  for (const pickup of state.course.pickups) {
    if (pickup.taken || pickup.y <= state.prevY || pickup.y > state.y) continue
    if (Math.abs(pickup.x - ballXAt(state, pickup.y)) > PICKUP_REACH) continue
    pickup.taken = true
    if (pickup.kind === 'helmet') state.helmet = true
    else if (pickup.kind === 'ghost') state.ghost = POWER_SECONDS
    else state.double = POWER_SECONDS
    pop(state, pickup.x, pickup.y - 34, POWER_LABELS[pickup.kind], 'ink')
  }
}

// Timers run on real seconds, so the 5 s on the chip is 5 s on the clock at any speed.
export const stepPowers = (state: GameState, dt: number): void => {
  state.ghost = Math.max(0, state.ghost - dt)
  state.double = Math.max(0, state.double - dt)
  state.shield = Math.max(0, state.shield - dt)
  if (state.helmetBreak) {
    state.helmetBreak.age += dt
    if (state.helmetBreak.age > HELMET_BREAK_SECONDS) state.helmetBreak = null
  }
  collectPickups(state)
  if (state.air && state.y >= state.air.lip + JUMP.air) {
    state.air = null
    award(state, JUMP.points, state.x, state.y - 40)
  }
}

export const helmetBreakProgress = (state: GameState): number =>
  state.helmetBreak ? state.helmetBreak.age / HELMET_BREAK_SECONDS : 1
