import { finishY, type GameState, type Tree } from './state.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './viewport.ts'

const SPAWN_AHEAD = 400
const RECYCLE_BEHIND = 200
const TREE_MIN_RADIUS = 10
const TREE_MAX_RADIUS = 19
// Clear run-out before the line, so the last gap is a gap and not a tree parked on the tape.
const FINISH_CLEAR_PX = 140

const pool: Tree[] = []

const take = (): Tree => pool.pop() ?? { x: 0, y: 0, radius: 0, rotation: 0, shade: 0 }

const release = (tree: Tree): void => {
  if (pool.length < 256) pool.push(tree)
}

const widestGap = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b)
  let widest = (sorted[0] ?? LOGICAL_WIDTH) - 0
  for (let i = 1; i < sorted.length; i += 1) {
    widest = Math.max(widest, (sorted[i] ?? 0) - (sorted[i - 1] ?? 0))
  }
  widest = Math.max(widest, LOGICAL_WIDTH - (sorted[sorted.length - 1] ?? 0))
  return widest
}

const spawnRow = (state: GameState, y: number): number => {
  const count = 1 + Math.floor(Math.random() * 4)
  const xs: number[] = []

  for (let i = 0; i < count; i += 1) {
    xs.push(TREE_MAX_RADIUS + Math.random() * (LOGICAL_WIDTH - TREE_MAX_RADIUS * 2))
  }

  // Thin the row until a passable lane exists, so density never walls the slope off.
  while (xs.length > 1 && widestGap(xs) < state.tuning.minGapPx) {
    xs.splice(Math.floor(Math.random() * xs.length), 1)
  }

  for (const x of xs) {
    const tree = take()
    tree.x = x
    tree.y = y + (Math.random() - 0.5) * 60
    tree.radius = TREE_MIN_RADIUS + Math.random() * (TREE_MAX_RADIUS - TREE_MIN_RADIUS)
    tree.rotation = Math.random() * Math.PI * 2
    tree.shade = Math.random()
    state.trees.push(tree)
  }

  return xs.length
}

export const updateTerrain = (state: GameState, camY: number): void => {
  const horizon = Math.min(camY + LOGICAL_HEIGHT + SPAWN_AHEAD, finishY(state) - FINISH_CLEAR_PX)

  while (state.nextSpawnY < horizon) {
    const placed = spawnRow(state, state.nextSpawnY)
    state.nextSpawnY += (Math.max(placed, 1) / state.tuning.treesPer1000) * 1_000
  }

  let cut = 0
  while (cut < state.trees.length && (state.trees[cut]?.y ?? 0) < camY - RECYCLE_BEHIND) cut += 1
  if (cut > 0) {
    for (const tree of state.trees.splice(0, cut)) release(tree)
  }
}
