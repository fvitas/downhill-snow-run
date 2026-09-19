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

export type TrailPoint = { x: number; y: number }

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

// Trunk half-width as a fraction of the canopy radius. The renderer and the hitbox share it so
// the pole you see is the pole you hit — branches are decoration.
export const TRUNK_HALF_SCALE = 0.165

export const PIXELS_PER_METRE = 10
