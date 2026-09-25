// Primitives shared by the course generator and the running game. Kept free of imports so
// levels.ts and state.ts can both depend on it without a cycle.

export type Tree = {
  x: number
  y: number
  radius: number
  rotation: number
  shade: number
  // Set the moment the ball passes it, so one tree can only ever pay out once.
  grazed: boolean
}

export const COIN_POINTS = 5
export const DIAMOND_POINTS = 50

export type Collectible = {
  x: number
  y: number
  kind: 'coin' | 'diamond'
  taken: boolean
}

// Crosses the slope and tumbles downhill slower than the ball, so you close on it from behind.
// The spawn fields are the seeded ones; x/y/vx/angle are live and reset with the run.
export type Rock = {
  spawnX: number
  spawnY: number
  spawnVx: number
  vy: number
  radius: number
  x: number
  y: number
  vx: number
  angle: number
  rolling: boolean
  // Near-miss bookkeeping: inside reach last frame, and whether this one has already paid.
  near: boolean
  grazed: boolean
}

export const HAZARD_KINDS = [
  'boulder',
  'log',
  'net',
  'hole',
  'skier',
  'snowmobile',
  'deer',
  'bear',
  'kid',
  'snowball',
  'topple',
  'icicle',
  'snowman',
  'bush',
  'gate',
  'jump',
  'wolf',
  'fox',
] as const

export type HazardKind = (typeof HAZARD_KINDS)[number]

export type PowerKind = 'helmet' | 'ghost' | 'double'

// A snowball the kid has thrown: `age` runs from the throw, on the hazards' reference clock.
export type Shot = { fromX: number; fromY: number; x: number; y: number; age: number; grazed: boolean }

// The trail a wolf or fox leaves in the snow.
export type Print = { x: number; y: number; heading: number; left: boolean }

// Everything on the slope that is not a pine, a coin or a rolling rock. The home fields are
// seeded; the rest are live and reset with the run.
export type Hazard = {
  kind: HazardKind
  homeX: number
  homeY: number
  dir: 1 | -1
  // Radius for a boulder, half-length for a run of net, tilt for a log; unused by the rest.
  size: number
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  // Seconds since it woke; negative while it is still waiting for the ball.
  age: number
  near: boolean
  grazed: boolean
  // Broken, taken, given up or saved against: it can neither hurt nor pay any more.
  spent: boolean
  // Seconds since the ball ploughed through it, for the snowman and the bush.
  hitAge: number
  shots: Shot[]
  prints: Print[]
}

export type Pickup = { x: number; y: number; kind: PowerKind; taken: boolean }


export type TrailPoint = { x: number; y: number }

// Spray is the dust off the skis; clods are the packed snow a crash throws. Clods fly harder,
// last longer and draw over the trees, so a wreck behind a trunk still reads.
export type ParticleKind = 'spray' | 'clod'

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  kind: ParticleKind
}

// Trunk half-width as a fraction of the canopy radius. The renderer and the hitbox share it so
// the pole you see is the pole you hit — branches are decoration.
export const TRUNK_HALF_SCALE = 0.165

export const PIXELS_PER_METRE = 10
// Ground covered pays a point every this many metres, so a clean line that finds no tree to graze
// is still worth something.
export const METRES_PER_POINT = 10
