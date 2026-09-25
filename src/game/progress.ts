import { LEVEL_COUNT } from './levels.ts'

const PROGRESS_KEY = 'ski:progress:v2'
// The star-era save. Wiped on first load rather than migrated: it never shipped.
const LEGACY_PROGRESS_KEY = 'ski:progress:v1'

// `score` is the best finished run. `reach` is the furthest a *failed* attempt got, 0–1; clearing
// the level wipes it for good.
export type LevelRecord = { score: number; reach: number }

export type Progress = {
  levels: Record<number, LevelRecord>
  // Highest level the player may enter. Levels unlock one at a time, in order.
  unlocked: number
}

const empty = (): Progress => ({ levels: {}, unlocked: 1 })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const loadProgress = (): Progress => {
  try {
    localStorage.removeItem(LEGACY_PROGRESS_KEY)
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null')
    if (!isRecord(parsed)) return empty()

    const levels: Record<number, LevelRecord> = {}
    if (isRecord(parsed.levels)) {
      for (const [key, value] of Object.entries(parsed.levels)) {
        const index = Number(key)
        if (!Number.isInteger(index) || !isRecord(value)) continue
        levels[index] = {
          score: Math.max(0, Math.round(numberOr(value.score, 0))),
          reach: Math.min(1, Math.max(0, numberOr(value.reach, 0))),
        }
      }
    }

    return {
      levels,
      unlocked: Math.min(LEVEL_COUNT, Math.max(1, Math.round(numberOr(parsed.unlocked, 1)))),
    }
  } catch {
    return empty()
  }
}

export const saveProgress = (progress: Progress): void => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* private mode or quota — progress just won't survive reload */
  }
}

export const recordOf = (progress: Progress, index: number): LevelRecord =>
  progress.levels[index] ?? { score: 0, reach: 0 }

// A level counts as cleared once the one after it is open: finishing is the only way to unlock.
export const clearedBefore = (progress: Progress, index: number): boolean =>
  progress.unlocked > index

// Where the run that just ended died, kept for the next attempt's ghost. Two rules: a cleared
// level never carries a mark, and a worse run never lowers one. Returns `progress` untouched when
// neither applies, so the caller can skip the write.
export const recordReach = (progress: Progress, index: number, reach: number): Progress => {
  if (clearedBefore(progress, index)) return progress
  const previous = recordOf(progress, index)
  if (reach <= previous.reach) return progress
  return { ...progress, levels: { ...progress.levels, [index]: { ...previous, reach } } }
}

// Only ever improves a level's row, so replaying a cleared level can't cost you points.
export const recordRun = (progress: Progress, index: number, score: number): Progress => {
  const previous = recordOf(progress, index)
  return {
    ...progress,
    levels: {
      ...progress.levels,
      // Reaching the tape clears the ghost: there is nothing left to beat on this level.
      [index]: { score: Math.max(previous.score, score), reach: 0 },
    },
    unlocked: Math.min(LEVEL_COUNT, Math.max(progress.unlocked, index + 1)),
  }
}

export const totalScore = (progress: Progress): number =>
  Object.values(progress.levels).reduce((sum, record) => sum + record.score, 0)
