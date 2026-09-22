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
}

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
