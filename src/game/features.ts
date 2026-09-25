import { crosserPath, GATE_POINTS, isKiller, JUMP, LOG, makeHazard, tailPx } from './hazards.ts'
import { rngInt, rngPick, rngRange, type Rng } from './rng.ts'
import { LOGICAL_WIDTH } from './viewport.ts'
import type { Hazard, HazardKind, Pickup, PowerKind, Tree } from './world.ts'

const W = LOGICAL_WIDTH
const CX = W / 2

// The level each thing first turns up on. Keyed by index, not difficulty: difficulty drops back at
// the start of every world, and a bear should never un-appear.
const KIND_FROM: readonly (readonly [HazardKind, number])[] = [
  ['gate', 1],
  ['snowman', 3],
  ['boulder', 5],
  ['jump', 8],
  ['bush', 11],
  ['wolf', 14],
  ['log', 20],
  ['skier', 24],
  ['fox', 28],
  ['net', 32],
  ['deer', 36],
  ['hole', 41],
  ['kid', 46],
  ['snowmobile', 62],
  ['bear', 70],
  ['topple', 80],
  ['snowball', 90],
  ['icicle', 100],
]

const POWER_FROM: readonly (readonly [PowerKind, number])[] = [
  ['helmet', 4],
  ['double', 9],
  ['ghost', 18],
]

const BUSY_BY_LEVEL = 100

// What a killer passed close is worth on a decent chain, for the rating cuts.
const POINTS_PER_KILLER = 8

export type Features = {
  hazards: Hazard[]
  pickups: Pickup[]
  // What a clean run through all of this adds to the perfect score.
  points: number
}

type Clearing = { x: number; y: number; rx: number; ry: number }
type Lane = { ax: number; ay: number; bx: number; by: number; r: number }

type Plan = Features & { clearings: Clearing[]; lanes: Lane[] }

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const unlocked = <T>(table: readonly (readonly [T, number])[], index: number): T[] =>
  table.filter(([, from]) => index >= from).map(([kind]) => kind)

const introducedAt = (index: number): HazardKind | null =>
  KIND_FROM.find(([, from]) => from === index)?.[0] ?? null

const add = (plan: Plan, hazard: Hazard, rx: number, ry = rx): void => {
  plan.hazards.push(hazard)
  plan.clearings.push({ x: hazard.homeX, y: hazard.homeY, rx, ry })
  if (isKiller(hazard.kind)) plan.points += POINTS_PER_KILLER
}

const side = (rng: Rng): 1 | -1 => (rng() < 0.5 ? 1 : -1)

// Kinds that turn up this much less often than the rest once unlocked.
const RARITY: Partial<Record<HazardKind, number>> = { snowmobile: 0.25 }

const pickKind = (rng: Rng, kinds: readonly HazardKind[]): HazardKind => {
  const weightOf = (kind: HazardKind): number => RARITY[kind] ?? 1
  let roll = rng() * kinds.reduce((sum, kind) => sum + weightOf(kind), 0)
  for (const kind of kinds) {
    roll -= weightOf(kind)
    if (roll < 0) return kind
  }
  return rngPick(rng, kinds)
}

const GATE_STEP = 260
const GATES_MAX = 3

// The most a slot of this kind can run past its own y, so one near the end never spills over it.
const extentOf = (kind: HazardKind): number =>
  (kind === 'gate' ? (GATES_MAX - 1) * GATE_STEP : kind === 'jump' ? JUMP.air : 0) + tailPx(kind)

// Returns how far down the slope this slot reaches, so the next one starts clear of it.
const place = (rng: Rng, plan: Plan, kind: HazardKind, y: number, difficulty: number): number => {
  switch (kind) {
    case 'gate': {
      const count = rngInt(rng, 1, GATES_MAX)
      let x = rngRange(rng, 150, 390)
      for (let i = 0; i < count; i += 1) {
        add(plan, makeHazard('gate', x, y + i * GATE_STEP), 80)
        plan.points += GATE_POINTS
        x = x < CX ? rngRange(rng, 320, 400) : rngRange(rng, 140, 220)
      }
      return (count - 1) * GATE_STEP
    }
    case 'jump': {
      const jump = makeHazard('jump', rngRange(rng, 120, 420), y)
      plan.hazards.push(jump)
      // The ramp, the flight and the landing all need to be open snow.
      plan.clearings.push({ x: jump.homeX, y: y + 40, rx: 100, ry: 240 })
      plan.points += JUMP.points
      return JUMP.air
    }
    case 'snowman':
    case 'bush':
      add(plan, makeHazard(kind, rngRange(rng, 90, 450), y), 64)
      return 0
    case 'boulder': {
      const size = rngRange(rng, 18, 30)
      add(plan, makeHazard('boulder', rngRange(rng, 100, 440), y, 1, size), size + 52)
      return 0
    }
    case 'log': {
      const log = makeHazard('log', rngRange(rng, 150, 390), y, side(rng), rngRange(rng, LOG.tiltMin, LOG.tiltMax))
      plan.hazards.push(log)
      plan.points += POINTS_PER_KILLER
      // Reaching past an end takes about 150 px of slope at full lean, so the clearing starts well above.
      plan.clearings.push({ x: log.homeX, y: y - 50, rx: 200, ry: 200 })
      return 0
    }
    case 'net': {
      // One way through, narrower the further in the game you are.
      const gap = lerp(170, 110, difficulty)
      const gapX = rngRange(rng, 60, W - 60 - gap)
      if (gapX > 20) add(plan, makeHazard('net', gapX / 2, y, 1, gapX / 2), 0)
      const right = gapX + gap
      if (right < W - 20) add(plan, makeHazard('net', (right + W) / 2, y, 1, (W - right) / 2), 0)
      plan.clearings.push({ x: CX, y, rx: W, ry: 70 })
      return 0
    }
    case 'hole':
      add(plan, makeHazard('hole', rngRange(rng, 110, 430), y), 92)
      return 0
    case 'skier':
    case 'snowmobile':
    case 'deer':
    case 'bear': {
      const homeX = rngRange(rng, 150, 390)
      const dir = side(rng)
      // From the far side the sled is on screen long before it cuts the line, low enough to react to.
      const from = kind === 'snowmobile' ? (homeX < CX ? -1 : 1) : dir
      const hazard = makeHazard(kind, homeX, y, from)
      add(plan, hazard, 50)
      const path = crosserPath(hazard)
      if (path) plan.lanes.push({ ax: path.x0, ay: path.y0, bx: path.x1, by: path.y1, r: 44 })
      return 0
    }
    case 'kid': {
      const dir = side(rng)
      // Far enough off the wall that the stone pile behind the kid stays on screen.
      add(plan, makeHazard('kid', dir > 0 ? 44 : W - 44, y, dir), 64)
      return 300
    }
    case 'topple':
      add(plan, makeHazard('topple', rngRange(rng, 150, 390), y, side(rng)), 80)
      return 0
    case 'icicle':
      plan.hazards.push(makeHazard('icicle', CX, y, 1, lerp(80, 36, difficulty)))
      plan.points += POINTS_PER_KILLER
      return 0
    case 'snowball':
      plan.hazards.push(makeHazard('snowball', CX, y))
      plan.points += POINTS_PER_KILLER
      return 700
    case 'wolf':
    case 'fox':
      plan.hazards.push(makeHazard(kind, CX, y, side(rng)))
      return 400
  }
}

const distanceToLane = (lane: Lane, x: number, y: number): number => {
  const dx = lane.bx - lane.ax
  const dy = lane.by - lane.ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((x - lane.ax) * dx + (y - lane.ay) * dy) / lengthSq))
  return Math.hypot(lane.ax + t * dx - x, lane.ay + t * dy - y)
}

const blocked = (plan: Plan, tree: Tree): boolean =>
  plan.clearings.some(
    ({ x, y, rx, ry }) => ((tree.x - x) / rx) ** 2 + ((tree.y - y) / ry) ** 2 < 1,
  ) || plan.lanes.some((lane) => distanceToLane(lane, tree.x, tree.y) < lane.r)

// Obstacles and power-ups for the stretch `from`–`end` of a tree level, and the trees
// cleared out of their way so each one is something you can see and read, not a coin flip.
export const placeFeatures = (
  rng: Rng,
  levelIndex: number,
  difficulty: number,
  trees: Tree[],
  from: number,
  end: number,
): Features => {
  const plan: Plan = { hazards: [], pickups: [], points: 0, clearings: [], lanes: [] }
  const kinds = unlocked(KIND_FROM, levelIndex)
  const powers = unlocked(POWER_FROM, levelIndex)
  if (kinds.length === 0) return plan

  // Difficulty saws back down each world, so how busy the slope is also climbs with the index.
  const busy = Math.min(1, difficulty * 0.5 + Math.min(1, levelIndex / BUSY_BY_LEVEL) * 0.6)
  const spacing = lerp(1_300, 560, busy)
  const fresh = introducedAt(levelIndex)
  const slots: number[] = []
  let y = from
  while (y < end) {
    const fits = kinds.filter((kind) => y + extentOf(kind) < end)
    if (fits.length === 0) break
    const kind = slots.length === 0 && fresh && fits.includes(fresh) ? fresh : pickKind(rng, fits)
    slots.push(y)
    const reach = place(rng, plan, kind, y, difficulty)
    y += reach + spacing * rngRange(rng, 0.8, 1.2)
  }

  // A few power-ups, more as it gets harder, parked in the calm between two slots.
  const count = powers.length === 0 ? 0 : 1 + (rng() < busy ? 1 : 0) + (busy > 0.5 ? 1 : 0)
  for (let i = 0; i < count && slots.length > 1; i += 1) {
    const at = rngInt(rng, 0, slots.length - 2)
    const top = slots[at] ?? from
    const bottom = slots[at + 1] ?? end
    const py = top + (bottom - top) * rngRange(rng, 0.5, 0.65)
    const px = rngRange(rng, 100, 440)
    plan.pickups.push({ x: px, y: py, kind: rngPick(rng, powers), taken: false })
    plan.clearings.push({ x: px, y: py, rx: 60, ry: 60 })
  }

  for (let i = trees.length - 1; i >= 0; i -= 1) {
    const tree = trees[i]
    if (tree && blocked(plan, tree)) trees.splice(i, 1)
  }

  plan.hazards.sort((a, b) => a.homeY - b.homeY)
  plan.pickups.sort((a, b) => a.y - b.y)
  return { hazards: plan.hazards, pickups: plan.pickups, points: plan.points }
}
