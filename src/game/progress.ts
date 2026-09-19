import { LEVEL_COUNT } from './levels.ts'

const PROGRESS_KEY = 'ski:progress:v1'

export type LevelRecord = { stars: number; score: number }

export type Progress = {
  levels: Record<number, LevelRecord>
  coins: number
  diamonds: number
  // Highest level the player may enter. Levels unlock one at a time, in order.
  unlocked: number
}

const empty = (): Progress => ({ levels: {}, coins: 0, diamonds: 0, unlocked: 1 })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const loadProgress = (): Progress => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null')
    if (!isRecord(parsed)) return empty()

    const levels: Record<number, LevelRecord> = {}
    if (isRecord(parsed.levels)) {
      for (const [key, value] of Object.entries(parsed.levels)) {
        const index = Number(key)
        if (!Number.isInteger(index) || !isRecord(value)) continue
        levels[index] = {
          stars: Math.min(3, Math.max(0, Math.round(numberOr(value.stars, 0)))),
          score: Math.max(0, Math.round(numberOr(value.score, 0))),
        }
      }
    }

    return {
      levels,
      coins: Math.max(0, Math.round(numberOr(parsed.coins, 0))),
      diamonds: Math.max(0, Math.round(numberOr(parsed.diamonds, 0))),
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
  progress.levels[index] ?? { stars: 0, score: 0 }

// Only ever improves a level's row, so replaying a cleared level can't cost you stars.
export const recordRun = (
  progress: Progress,
  index: number,
  stars: number,
  score: number,
): Progress => {
  const previous = recordOf(progress, index)
  return {
    ...progress,
    levels: {
      ...progress.levels,
      [index]: { stars: Math.max(previous.stars, stars), score: Math.max(previous.score, score) },
    },
    unlocked: Math.min(LEVEL_COUNT, Math.max(progress.unlocked, index + 1)),
  }
}

export const totalStars = (progress: Progress): number =>
  Object.values(progress.levels).reduce((sum, record) => sum + record.stars, 0)
