import type { GameState, Particle } from './state.ts'

const MAX_PARTICLES = 240
const BASE_RATE = 130
const REFERENCE_SPEED = 400

const pool: Particle[] = []

const take = (): Particle =>
  pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 }

const release = (particle: Particle): void => {
  if (pool.length < MAX_PARTICLES) pool.push(particle)
}

const spawn = (state: GameState, carve: number): void => {
  const dirX = Math.sin(state.angle)
  const dirY = Math.cos(state.angle)
  const side = state.angle >= 0 ? -1 : 1
  const kick = state.speed * (0.1 + 0.22 * carve)

  const particle = take()
  particle.x = state.x - dirX * state.tuning.ballRadius * 0.6
  particle.y = state.y - dirY * state.tuning.ballRadius * 0.6
  particle.vx = -dirX * state.speed * 0.08 + dirY * side * kick + (Math.random() - 0.5) * 60
  particle.vy = -dirY * state.speed * 0.08 - dirX * side * kick + (Math.random() - 0.5) * 60
  particle.maxLife = 0.32 + Math.random() * 0.35
  particle.life = particle.maxLife
  particle.size = 1.1 + Math.random() * 2.3
  state.particles.push(particle)
}

export const emitSpray = (state: GameState, dt: number): void => {
  const carve = Math.abs(Math.sin(state.angle))
  const rate = BASE_RATE * (0.35 + 0.65 * carve) * (state.speed / REFERENCE_SPEED)

  state.sprayAccumulator = Math.min(state.sprayAccumulator + rate * dt, 6)
  while (state.sprayAccumulator >= 1 && state.particles.length < MAX_PARTICLES) {
    state.sprayAccumulator -= 1
    spawn(state, carve)
  }
}

export const burst = (state: GameState, x: number, y: number, count: number): void => {
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = 60 + Math.random() * 220

    const particle = take()
    particle.x = x
    particle.y = y
    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed
    particle.maxLife = 0.3 + Math.random() * 0.4
    particle.life = particle.maxLife
    particle.size = 2 + Math.random() * 3
    state.particles.push(particle)
  }
}

export const stepParticles = (state: GameState, dt: number): void => {
  const drag = Math.exp(-3.2 * dt)

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i]
    if (!particle) continue

    particle.life -= dt
    if (particle.life <= 0) {
      const last = state.particles.pop()
      if (last && i < state.particles.length) state.particles[i] = last
      release(particle)
      continue
    }

    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
    particle.vx *= drag
    particle.vy *= drag
  }
}
