import type { GameState } from './state.ts'
import { LOGICAL_HEIGHT } from './viewport.ts'

const ABOVE = 220
const BELOW = 140

// The course is built whole and sorted by y, so "terrain" is now just a sliding window over it.
// Both cursors only ever move forward, which is safe because the camera only ever moves downhill.
export const updateTerrain = (state: GameState, camY: number): void => {
  const top = camY - ABOVE
  const bottom = camY + LOGICAL_HEIGHT + BELOW
  const { trees } = state

  while (state.treeFrom < trees.length && (trees[state.treeFrom]?.y ?? 0) < top) {
    state.treeFrom += 1
  }
  if (state.treeTo < state.treeFrom) state.treeTo = state.treeFrom
  while (state.treeTo < trees.length && (trees[state.treeTo]?.y ?? 0) <= bottom) {
    state.treeTo += 1
  }
}
