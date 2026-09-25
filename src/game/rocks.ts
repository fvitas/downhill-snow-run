import type { GameState } from './state.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, viewHeight } from './viewport.ts'
import type { Rock } from './world.ts'

// A rock starts rolling a screen and a half before the ball reaches it, so it is already moving
// by the time it is on camera — a rock that starts on the spot reads as a spawn, not a hazard.
// Measured against the design height, not the device: a tall phone must not get more warning.
const WAKE_AHEAD_PX = LOGICAL_HEIGHT * 1.5

export const resetRock = (rock: Rock): void => {
  rock.x = rock.spawnX
  rock.y = rock.spawnY
  rock.vx = 0
  rock.angle = 0
  rock.rolling = false
  rock.near = false
  rock.grazed = false
}

export const stepRocks = (state: GameState, dt: number): void => {
  for (const rock of state.course.rocks) {
    if (!rock.rolling) {
      if (rock.spawnY - state.y > WAKE_AHEAD_PX) continue
      rock.rolling = true
      rock.vx = rock.spawnVx
    }

    // No walls for a rock: it rolls straight out through the far side and is gone.
    if (rock.x < -rock.radius || rock.x > LOGICAL_WIDTH + rock.radius) continue
    rock.x += rock.vx * dt
    rock.y += rock.vy * dt
    rock.angle += (Math.hypot(rock.vx, rock.vy) / rock.radius) * dt
  }
}

export const visibleRocks = (state: GameState, camY: number): Rock[] =>
  state.course.rocks.filter(
    (rock) => rock.rolling && rock.y - camY > -80 && rock.y - camY < viewHeight() + 80,
  )
