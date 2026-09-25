import { avalancheCaught } from './avalanche.ts'
import { checkHazards } from './hazards.ts'
import { burst } from './particles.ts'
import { award, kill, nearMiss, phasing, treeHitExtents, trySave, untouchable } from './scoring.ts'
import type { GameState, Rock, Tree } from './state.ts'
import { ballXAt, distanceToStepSq } from './sweep.ts'
import { LOGICAL_WIDTH } from './viewport.ts'
import { COIN_POINTS, DIAMOND_POINTS } from './world.ts'

const SCAN_WINDOW = 120
const COIN_RADIUS = 30
// A rock this close to the ball's edge counts as a near miss once the ball pulls clear of it.
const ROCK_NEAR_PX = 60

const rockClearance = (state: GameState, rock: Rock): number =>
  Math.sqrt(distanceToStepSq(state, rock.x, rock.y, 1)) - rock.radius - state.tuning.ballRadius

const graze = (state: GameState, tree: Tree, ballX: number): void => {
  tree.grazed = true
  nearMiss(state, tree.x, tree.y - 24)
  state.wobbles.push({ tree, age: 0, side: tree.x < ballX ? -1 : 1 })
  burst(state, tree.x, tree.y - tree.radius * 0.4, 6)
}

const collect = (state: GameState): void => {
  for (const item of state.course.collectibles) {
    if (item.taken) continue
    if (item.y <= state.prevY || item.y > state.y) continue
    if (Math.abs(item.x - ballXAt(state, item.y)) > COIN_RADIUS) continue

    item.taken = true
    const diamond = item.kind === 'diamond'
    if (diamond) state.runDiamonds += 1
    else state.runCoins += 1
    award(state, diamond ? DIAMOND_POINTS : COIN_POINTS, item.x, item.y - 20)
  }
}

const checkRocks = (state: GameState): void => {
  for (const rock of state.course.rocks) {
    if (!rock.rolling || rock.grazed) continue
    if (Math.abs(rock.y - state.y) > SCAN_WINDOW) continue
    const clearance = rockClearance(state, rock)
    if (clearance <= -4) {
      if (phasing(state)) {
        rock.grazed = true
        nearMiss(state, rock.x, rock.y - rock.radius - 16)
        continue
      }
      if (untouchable(state) || trySave(state, rock.x, rock.y)) {
        rock.grazed = true
        continue
      }
      kill(state, 'rock', null)
      return
    }
    if (clearance <= ROCK_NEAR_PX) {
      rock.near = true
    } else if (rock.near) {
      rock.near = false
      rock.grazed = true
      nearMiss(state, rock.x, rock.y - rock.radius - 16)
    }
  }
}

const checkTrees = (state: GameState): void => {
  const { trees } = state
  for (let i = state.treeFrom; i < state.treeTo; i += 1) {
    const tree = trees[i]
    if (!tree) continue

    const dy = tree.y - state.y
    if (dy < -SCAN_WINDOW || dy > SCAN_WINDOW) continue

    const { rx, ry } = treeHitExtents(state, tree)
    if (distanceToStepSq(state, tree.x, tree.y, ry / rx) <= rx * rx) {
      if (phasing(state)) {
        if (!tree.grazed) graze(state, tree, state.x)
        continue
      }
      if (untouchable(state)) {
        tree.grazed = true
        continue
      }
      if (trySave(state, tree.x, tree.y)) {
        tree.grazed = true
        state.wobbles.push({ tree, age: 0, side: tree.x < state.x ? -1 : 1 })
        continue
      }
      kill(state, 'tree', tree)
      return
    }

    // Scored on the frame the ball draws level with the trunk, so it reads as "that was close".
    if (!tree.grazed && tree.y > state.prevY && tree.y <= state.y) {
      const ballX = ballXAt(state, tree.y)
      if (Math.abs(tree.x - ballX) <= state.tuning.grazePx) graze(state, tree, ballX)
    }
  }
}

export const checkCollisions = (state: GameState): void => {
  if (state.dead) return

  collect(state)

  // Neither the helmet nor a ghost does anything for the wall or the avalanche.
  if (avalancheCaught(state)) {
    kill(state, 'avalanche', null)
    return
  }

  const r = state.tuning.ballRadius
  if (state.x <= r || state.x >= LOGICAL_WIDTH - r) {
    kill(state, 'wall', null)
    return
  }

  checkHazards(state)
  if (state.dead || state.air) return

  checkRocks(state)
  if (state.dead) return
  checkTrees(state)
}
