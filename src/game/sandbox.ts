import { makeHazard } from './hazards.ts'
import { createRng, hashSeed, rngRange } from './rng.ts'
import { LOGICAL_WIDTH } from './viewport.ts'
import type { Hazard, Pickup, Rock, Sign, Tree } from './world.ts'

// Level 0: one of everything, each on its own stretch of open snow with its name painted above it,
// so every obstacle and power-up can be tried without the forest getting in the way.

const W = LOGICAL_WIDTH
const CX = W / 2
export const SANDBOX_START_PX = 1_100
const STATION_PX = 1_300
const SIGN_ABOVE_PX = 450

export type SandboxBlock = { trees: Tree[]; hazards: Hazard[]; pickups: Pickup[]; rocks: Rock[]; signs: Sign[] }

type Station = { name: string; build: (block: SandboxBlock, y: number) => void }

const tree = (x: number, y: number, radius = 15): Tree => ({
  x,
  y,
  radius,
  rotation: (x * 7 + y) % (Math.PI * 2),
  shade: 0.5,
  grazed: false,
})

const hazard = (block: SandboxBlock, ...args: Parameters<typeof makeHazard>): void => {
  block.hazards.push(makeHazard(...args))
}

const pickup = (block: SandboxBlock, kind: Pickup['kind'], y: number): void => {
  block.pickups.push({ x: CX, y, kind, taken: false })
}

const rock = (y: number): Rock => ({
  spawnX: 24,
  spawnY: y,
  spawnVx: 150,
  vy: 110,
  radius: 24,
  x: 24,
  y,
  vx: 0,
  angle: 0,
  rolling: false,
  near: false,
  grazed: false,
})

const STATIONS: readonly Station[] = [
  {
    name: 'Boulders',
    build: (b, y) => {
      hazard(b, 'boulder', 200, y, 1, 26)
      hazard(b, 'boulder', 350, y + 320, 1, 22)
    },
  },
  // Rocks wake a screen and a half out and drift down, so this one is seeded well above the sign.
  { name: 'Rolling stone', build: (b, y) => b.rocks.push(rock(y - 700)) },
  { name: 'Fallen log', build: (b, y) => hazard(b, 'log', CX, y, 1) },
  {
    name: 'Safety net',
    build: (b, y) => {
      hazard(b, 'net', 110, y, 1, 110)
      hazard(b, 'net', 460, y, 1, 80)
    },
  },
  { name: 'Ice hole', build: (b, y) => hazard(b, 'hole', CX, y) },
  { name: 'Other skier', build: (b, y) => hazard(b, 'skier', CX, y, 1) },
  { name: 'Snowmobile', build: (b, y) => hazard(b, 'snowmobile', CX, y, -1) },
  { name: 'Deer', build: (b, y) => hazard(b, 'deer', CX, y, 1) },
  { name: 'Bear', build: (b, y) => hazard(b, 'bear', CX, y, -1) },
  { name: 'Stone kid', build: (b, y) => hazard(b, 'kid', 34, y, 1) },
  { name: 'Runaway snowball', build: (b, y) => hazard(b, 'snowball', CX, y) },
  { name: 'Toppling tree', build: (b, y) => hazard(b, 'topple', 200, y, 1) },
  { name: 'Icicle drop', build: (b, y) => hazard(b, 'icicle', CX, y, 1, 80) },
  { name: 'Snowman', build: (b, y) => hazard(b, 'snowman', CX, y) },
  { name: 'Bush', build: (b, y) => hazard(b, 'bush', CX, y) },
  {
    name: 'Slalom gate',
    build: (b, y) => {
      hazard(b, 'gate', 200, y)
      hazard(b, 'gate', 340, y + 260)
      hazard(b, 'gate', 200, y + 520)
    },
  },
  { name: 'Jump', build: (b, y) => hazard(b, 'jump', CX, y) },
  {
    name: 'Near miss',
    build: (b, y) => {
      b.trees.push(tree(230, y), tree(320, y + 220), tree(230, y + 440))
    },
  },
  { name: 'Wolf', build: (b, y) => hazard(b, 'wolf', CX, y, 1) },
  { name: 'Fox', build: (b, y) => hazard(b, 'fox', CX, y, -1) },
  {
    name: 'Helmet',
    build: (b, y) => {
      pickup(b, 'helmet', y)
      b.trees.push(tree(CX, y + 320, 17))
    },
  },
  {
    name: 'Ghost',
    build: (b, y) => {
      pickup(b, 'ghost', y)
      b.trees.push(tree(CX, y + 260, 17), tree(CX, y + 680, 17))
      hazard(b, 'boulder', CX, y + 470, 1, 24)
    },
  },
  {
    name: '×2',
    build: (b, y) => {
      pickup(b, 'double', y)
      for (let i = 0; i < 4; i += 1) b.trees.push(tree(CX + (i % 2 === 0 ? -70 : 70), y + 240 + i * 200, 13))
    },
  },
]

// Loose trees along both walls, so the practice slope still reads as a slope.
const edgeTrees = (block: SandboxBlock, from: number, end: number): void => {
  const rng = createRng(hashSeed(0x5a4d, from))
  for (let y = from; y < end; y += rngRange(rng, 90, 160)) {
    const x = rng() < 0.5 ? rngRange(rng, 16, 64) : rngRange(rng, W - 64, W - 16)
    block.trees.push({ ...tree(x, y, rngRange(rng, 10, 16)), rotation: rng() * Math.PI * 2, shade: rng() })
  }
}

// Stations are laid out on a fixed pitch from the top and loop forever, so any block of the
// endless slope can be built on its own.
export const buildSandbox = (from: number, end: number): SandboxBlock => {
  const block: SandboxBlock = { trees: [], hazards: [], pickups: [], rocks: [], signs: [] }
  edgeTrees(block, from, end)
  const first = Math.max(0, Math.ceil((from - SANDBOX_START_PX) / STATION_PX))
  for (let i = first; ; i += 1) {
    const y = SANDBOX_START_PX + i * STATION_PX
    if (y >= end) break
    const station = STATIONS[i % STATIONS.length]
    if (!station) continue
    block.signs.push({ y: y - SIGN_ABOVE_PX, text: station.name })
    station.build(block, y)
  }
  block.trees.sort((a, b) => a.y - b.y)
  block.hazards.sort((a, b) => a.homeY - b.homeY)
  return block
}
